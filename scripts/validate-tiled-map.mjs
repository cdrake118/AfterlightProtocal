import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const distRoot = join(root, "dist", "maps");
const sourceArgs = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const sources = sourceArgs.length ? sourceArgs : await discoverMaps();
const reports = [];
let failed = false;

for (const source of sources) {
  const report = await validateMap(source);
  reports.push(report);
  if (report.errors.length) {
    failed = true;
  }
}

await mkdir(distRoot, { recursive: true });
const jsonPath = join(distRoot, "tiled-map-validation.json");
const markdownPath = join(distRoot, "tiled-map-validation.md");
const output = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  summary: {
    totalMaps: reports.length,
    validMaps: reports.filter((report) => report.errors.length === 0).length,
    errors: reports.reduce((total, report) => total + report.errors.length, 0),
    warnings: reports.reduce((total, report) => total + report.warnings.length, 0)
  },
  reports
};
await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(output));

for (const report of reports) {
  const label = report.errors.length ? "failed" : "ok";
  console.log(`map validation ${label}: ${report.source} (${report.errors.length} errors, ${report.warnings.length} warnings)`);
  for (const error of report.errors) console.error(`- ${error}`);
  for (const warning of report.warnings) console.warn(`- ${warning}`);
}
console.log(`wrote ${relative(root, jsonPath)} and ${relative(root, markdownPath)}`);

if (failed) {
  process.exit(1);
}

async function discoverMaps() {
  const mapRoot = join(root, "assets", "maps");
  const files = await readdir(mapRoot);
  return files
    .filter((file) => file.endsWith(".tiled.json"))
    .sort()
    .map((file) => join("assets", "maps", file));
}

async function validateMap(source) {
  const absolutePath = resolve(process.cwd(), source);
  const map = JSON.parse(await readFile(absolutePath, "utf8"));
  const errors = [];
  const warnings = [];
  const relativeSource = relative(root, absolutePath);
  const layers = new Map((map.layers ?? []).map((layer) => [layer.name, layer]));
  const imageLayers = (map.layers ?? []).filter((layer) => layer.type === "imagelayer");
  const mapBounds = {
    x: 0,
    y: 0,
    w: Number(map.width ?? 0) * Number(map.tilewidth ?? 0),
    h: Number(map.height ?? 0) * Number(map.tileheight ?? 0)
  };

  if (map.type !== "map") {
    errors.push("root type must be `map`");
  }
  if (map.orientation !== "orthogonal") {
    errors.push("map orientation must be orthogonal for the current top-down importer");
  }
  if (map.infinite) {
    errors.push("infinite maps are not supported by the current importer");
  }
  if (!mapBounds.w || !mapBounds.h) {
    errors.push("map width/height and tile size must produce non-zero pixel bounds");
  }

  for (const name of ["collision", "props", "spawns", "batteries", "labels"]) {
    const layer = layers.get(name);
    if (!layer) {
      errors.push(`missing required object layer: ${name}`);
    } else if (layer.type !== "objectgroup") {
      errors.push(`layer ${name} must be an objectgroup`);
    }
  }

  const walls = objects(layers, "collision", "wall");
  const props = objects(layers, "props", "prop");
  const investigatorSpawns = objects(layers, "spawns", "investigatorSpawn");
  const anomalySpawns = objects(layers, "spawns", "anomalySpawn");
  const batteries = objects(layers, "batteries", "batterySpawn");
  const labels = objects(layers, "labels", "label");
  const mapDir = dirname(absolutePath);

  if (walls.length < 4) errors.push("collision layer needs at least four wall objects");
  if (investigatorSpawns.length < 2) errors.push("spawns layer needs at least two investigatorSpawn points");
  if (investigatorSpawns.length > 5) warnings.push("only the host plus four investigator spawns are used in the next-weekend build");
  if (anomalySpawns.length !== 1) errors.push("spawns layer needs exactly one anomalySpawn point");
  if (batteries.length < 3) errors.push("batteries layer needs at least three batterySpawn points for healthy map rotation");
  if (labels.length < 2) warnings.push("add room labels to improve map readability while playtesting");

  for (const layer of imageLayers) {
    if (!layer.image || typeof layer.image !== "string") {
      warnings.push(`image layer ${layer.name || "unnamed"} has no image path`);
      continue;
    }
    if (/^https?:\/\//i.test(layer.image)) {
      errors.push(`image layer ${layer.name || layer.image} must use a local project asset, not a remote URL`);
      continue;
    }
    if (/^data:image\//i.test(layer.image)) {
      warnings.push(`image layer ${layer.name || "embedded image"} uses embedded data; move it to assets/maps before production packaging`);
      continue;
    }
    try {
      await readFile(resolve(mapDir, layer.image));
    } catch {
      warnings.push(`image layer ${layer.name || layer.image} points to a missing local file: ${layer.image}`);
    }
  }

  for (const wall of walls) {
    validateWall(wall, mapBounds, errors);
  }
  for (const prop of props) {
    validateRect(prop, mapBounds, errors, "prop");
  }
  for (const spawn of [...investigatorSpawns, ...anomalySpawns]) {
    validatePoint(spawn, mapBounds, errors, "spawn");
    if (insideAnyObstacle(spawn, walls)) {
      errors.push(`${nameOf(spawn)} is inside a collision wall`);
    }
  }
  for (const battery of batteries) {
    validatePoint(battery, mapBounds, errors, "battery");
    if (insideAnyObstacle(battery, walls)) {
      errors.push(`${nameOf(battery)} is inside a collision wall`);
    }
  }

  if (anomalySpawns.length === 1 && investigatorSpawns.length) {
    const anomaly = anomalySpawns[0];
    const closeSpawn = investigatorSpawns.find((spawn) => distance(spawn, anomaly) < 180);
    if (closeSpawn) {
      warnings.push(`${nameOf(closeSpawn)} starts close to anomaly spawn; consider more opening uncertainty`);
    }
  }

  return {
    source: relativeSource || source,
    name: property(map, "name", map.name || "Untitled Map"),
    pixelSize: { width: mapBounds.w, height: mapBounds.h },
    counts: {
      walls: walls.length,
      props: props.length,
      investigatorSpawns: investigatorSpawns.length,
      anomalySpawns: anomalySpawns.length,
      batterySpawns: batteries.length,
      labels: labels.length,
      imageLayers: imageLayers.length
    },
    errors,
    warnings
  };
}

function objects(layers, layerName, type) {
  return (layers.get(layerName)?.objects ?? []).filter((object) => object.type === type);
}

function validateRect(object, bounds, errors, label) {
  if (!Number.isFinite(object.x) || !Number.isFinite(object.y)) {
    errors.push(`${nameOf(object)} ${label} needs numeric x/y`);
  }
  if (!Number.isFinite(object.width) || !Number.isFinite(object.height) || object.width <= 0 || object.height <= 0) {
    errors.push(`${nameOf(object)} ${label} needs positive width/height`);
  }
  if (!rectIntersectsBounds(object, bounds)) {
    errors.push(`${nameOf(object)} ${label} is outside map bounds`);
  }
}

function validateWall(object, bounds, errors) {
  if (object.polyline?.length >= 2) {
    validatePoint(object, bounds, errors, "wall start");
    const end = {
      x: object.x + object.polyline[1].x,
      y: object.y + object.polyline[1].y,
      name: `${object.name || object.id || "wall"} end`
    };
    validatePoint(end, bounds, errors, "wall end");
    if (distance(object, end) < 8) {
      errors.push(`${nameOf(object)} wall segment needs two distinct points`);
    }
    const invisible = String(property(object, "visible", "true")) === "false";
    const thickness = Number(property(object, "thickness", invisible ? 1 : 24));
    if (!Number.isFinite(thickness) || thickness <= 0) {
      errors.push(`${nameOf(object)} wall segment needs positive thickness`);
    }
    return;
  }
  validateRect(object, bounds, errors, "wall");
}

function validatePoint(object, bounds, errors, label) {
  if (!Number.isFinite(object.x) || !Number.isFinite(object.y)) {
    errors.push(`${nameOf(object)} ${label} needs numeric x/y`);
  }
  if (object.x < bounds.x || object.y < bounds.y || object.x > bounds.w || object.y > bounds.h) {
    errors.push(`${nameOf(object)} ${label} is outside map bounds`);
  }
}

function rectIntersectsBounds(rect, bounds) {
  return rect.x + rect.width >= bounds.x
    && rect.y + rect.height >= bounds.y
    && rect.x <= bounds.w
    && rect.y <= bounds.h;
}

function insideAnyRect(point, rects) {
  return rects.some((rect) => point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height);
}

function insideAnyObstacle(point, obstacles) {
  return obstacles.some((obstacle) => {
    if (obstacle.polyline?.length >= 2) {
      const end = {
        x: obstacle.x + obstacle.polyline[1].x,
        y: obstacle.y + obstacle.polyline[1].y
      };
      const invisible = String(property(obstacle, "visible", "true")) === "false";
      return distancePointToSegment(point.x, point.y, obstacle.x, obstacle.y, end.x, end.y) <= Number(property(obstacle, "thickness", invisible ? 1 : 24)) / 2;
    }
    return insideAnyRect(point, [obstacle]);
  });
}

function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (!lengthSq) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

function nameOf(object) {
  return object.name ? `\`${object.name}\`` : `object ${object.id ?? "unknown"}`;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function property(owner, name, fallback) {
  const found = owner?.properties?.find((item) => item.name === name);
  return found?.value ?? fallback;
}

function makeMarkdown(data) {
  const rows = data.reports.map((report) => {
    const status = report.errors.length ? "Blocked" : report.warnings.length ? "Warnings" : "Ready";
    return `| \`${report.source}\` | ${status} | ${report.pixelSize.width}x${report.pixelSize.height} | ${report.counts.walls} | ${report.counts.investigatorSpawns} | ${report.counts.batterySpawns} | ${report.counts.imageLayers} | ${[...report.errors, ...report.warnings].join(" ")} |`;
  }).join("\n");
  return `# Tiled Map Validation

- Generated: ${data.generatedAt}
- Total maps: ${data.summary.totalMaps}
- Valid maps: ${data.summary.validMaps}
- Errors: ${data.summary.errors}
- Warnings: ${data.summary.warnings}

| Map | Status | Size | Walls | Investigator Spawns | Battery Spawns | Image Layers | Notes |
|---|---|---:|---:|---:|---:|---:|---|
${rows}
`;
}
