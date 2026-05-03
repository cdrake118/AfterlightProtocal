import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const distRoot = join(root, "dist", "maps");
const sourceArgs = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const sources = sourceArgs.length ? sourceArgs : await discoverMaps();
const reports = [];

for (const source of sources) {
  reports.push(await auditMap(source));
}

const output = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  summary: {
    totalMaps: reports.length,
    mapsWithWarnings: reports.filter((report) => report.warnings.length > 0).length,
    totalWarnings: reports.reduce((total, report) => total + report.warnings.length, 0),
    averageScore: reports.length
      ? Math.round(reports.reduce((total, report) => total + report.score, 0) / reports.length)
      : 0
  },
  reports
};

await mkdir(distRoot, { recursive: true });
const jsonPath = join(distRoot, "map-layout-audit.json");
const markdownPath = join(distRoot, "map-layout-audit.md");
await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(output));

for (const report of reports) {
  console.log(`map layout audit ok: ${report.source} (${report.score}/100, ${report.warnings.length} warnings)`);
  for (const warning of report.warnings) console.warn(`- ${warning}`);
}
console.log(`wrote ${relative(root, jsonPath)} and ${relative(root, markdownPath)}`);

async function discoverMaps() {
  const mapRoot = join(root, "assets", "maps");
  const files = await readdir(mapRoot);
  return files
    .filter((file) => file.endsWith(".tiled.json"))
    .sort()
    .map((file) => join("assets", "maps", file));
}

async function auditMap(source) {
  const absolutePath = resolve(process.cwd(), source);
  const map = JSON.parse(await readFile(absolutePath, "utf8"));
  const layers = new Map((map.layers ?? []).map((layer) => [layer.name, layer]));
  const bounds = {
    width: Number(map.width ?? 0) * Number(map.tilewidth ?? 0),
    height: Number(map.height ?? 0) * Number(map.tileheight ?? 0)
  };
  const mapDiagonal = Math.hypot(bounds.width, bounds.height) || 1;
  const walls = objects(layers, "collision", "wall");
  const props = objects(layers, "props", "prop");
  const investigatorSpawns = objects(layers, "spawns", "investigatorSpawn");
  const anomalySpawns = objects(layers, "spawns", "anomalySpawn");
  const batteries = objects(layers, "batteries", "batterySpawn");
  const labels = objects(layers, "labels", "label");
  const anomaly = anomalySpawns[0] ?? null;
  const blockers = [...walls, ...props];
  const warnings = [];

  const collisionCoverage = bounds.width && bounds.height
    ? area(walls) / (bounds.width * bounds.height)
    : 0;
  const propCoverage = bounds.width && bounds.height
    ? area(props) / (bounds.width * bounds.height)
    : 0;
  const investigatorSpread = pairwiseDistances(investigatorSpawns);
  const nearestBatteryBySpawn = investigatorSpawns.map((spawn) => ({
    spawn: nameOf(spawn),
    distance: nearestDistance(spawn, batteries)
  }));
  const nearestBatteryAverage = average(nearestBatteryBySpawn.map((item) => item.distance).filter(Number.isFinite));
  const anomalyToInvestigator = anomaly
    ? investigatorSpawns.map((spawn) => ({
      spawn: nameOf(spawn),
      distance: distance(anomaly, spawn),
      blocked: blockers.some((blocker) => segmentIntersectsRect(anomaly, spawn, blocker))
    }))
    : [];
  const visibleOpeners = anomalyToInvestigator.filter((item) => !item.blocked);

  if (collisionCoverage < 0.08) {
    warnings.push("Collision coverage is low; consider more walls or dividers so flashlight line-of-sight has meaningful breaks.");
  }
  if (propCoverage < 0.01) {
    warnings.push("Prop coverage is low; add furniture or decor blockers to make rooms feel authored instead of empty.");
  }
  if (investigatorSpread.min < 180) {
    warnings.push("Two investigator spawns are very close together; spread them to support cleaner opening movement.");
  }
  if (investigatorSpread.max > mapDiagonal * 0.82) {
    warnings.push("Investigator spawns are extremely spread out; check that party players can regroup before early pressure.");
  }
  if (Number.isFinite(nearestBatteryAverage) && nearestBatteryAverage < 90) {
    warnings.push("Battery spawns average very close to investigator starts; move some pickups into more interesting risk zones.");
  }
  if (visibleOpeners.length > 0) {
    warnings.push(`${visibleOpeners.length} investigator spawn sightline(s) are open to the anomaly spawn; add a corner, wall, or prop for opening uncertainty.`);
  }
  if (labels.length < 3) {
    warnings.push("Add at least three room labels to make map review and playtest callouts easier.");
  }

  const score = Math.max(0, 100 - warnings.length * 12);

  return {
    source: relative(root, absolutePath) || source,
    name: property(map, "name", map.name || "Untitled Map"),
    pixelSize: bounds,
    score,
    metrics: {
      collisionCoverage: round(collisionCoverage),
      propCoverage: round(propCoverage),
      investigatorSpread: {
        min: round(investigatorSpread.min),
        average: round(investigatorSpread.average),
        max: round(investigatorSpread.max)
      },
      nearestBatteryAverage: round(nearestBatteryAverage),
      openingSightlinesFromAnomaly: visibleOpeners.length
    },
    nearestBatteryBySpawn: nearestBatteryBySpawn.map((item) => ({ ...item, distance: round(item.distance) })),
    anomalyToInvestigator: anomalyToInvestigator.map((item) => ({ ...item, distance: round(item.distance) })),
    warnings
  };
}

function objects(layers, layerName, type) {
  return (layers.get(layerName)?.objects ?? []).filter((object) => object.type === type);
}

function area(rects) {
  return rects.reduce((total, rect) => total + Math.max(0, rect.width ?? 0) * Math.max(0, rect.height ?? 0), 0);
}

function pairwiseDistances(points) {
  const values = [];
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      values.push(distance(points[i], points[j]));
    }
  }
  return {
    min: values.length ? Math.min(...values) : 0,
    average: average(values),
    max: values.length ? Math.max(...values) : 0
  };
}

function nearestDistance(point, points) {
  if (!points.length) return Infinity;
  return Math.min(...points.map((candidate) => distance(point, candidate)));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function distance(a, b) {
  return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0));
}

function segmentIntersectsRect(a, b, rect) {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  if (pointInRect(a, rect) || pointInRect(b, rect)) return true;
  return segmentIntersectsSegment(a, b, { x: left, y: top }, { x: right, y: top })
    || segmentIntersectsSegment(a, b, { x: right, y: top }, { x: right, y: bottom })
    || segmentIntersectsSegment(a, b, { x: right, y: bottom }, { x: left, y: bottom })
    || segmentIntersectsSegment(a, b, { x: left, y: bottom }, { x: left, y: top });
}

function pointInRect(point, rect) {
  return point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height;
}

function segmentIntersectsSegment(a, b, c, d) {
  const denominator = ((d.y - c.y) * (b.x - a.x)) - ((d.x - c.x) * (b.y - a.y));
  if (denominator === 0) return false;
  const ua = (((d.x - c.x) * (a.y - c.y)) - ((d.y - c.y) * (a.x - c.x))) / denominator;
  const ub = (((b.x - a.x) * (a.y - c.y)) - ((b.y - a.y) * (a.x - c.x))) / denominator;
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

function nameOf(object) {
  return object?.name ? object.name : `object ${object?.id ?? "unknown"}`;
}

function property(owner, name, fallback) {
  const found = owner?.properties?.find((item) => item.name === name);
  return found?.value ?? fallback;
}

function round(value) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function makeMarkdown(data) {
  const rows = data.reports.map((report) => `| \`${report.source}\` | ${report.score} | ${report.metrics.collisionCoverage} | ${report.metrics.propCoverage} | ${report.metrics.openingSightlinesFromAnomaly} | ${report.metrics.nearestBatteryAverage ?? "-"} | ${report.warnings.join(" ")} |`).join("\n");
  const details = data.reports.map((report) => `## ${report.name}

- Source: \`${report.source}\`
- Score: ${report.score}/100
- Investigator spread: ${report.metrics.investigatorSpread.min} min, ${report.metrics.investigatorSpread.average} avg, ${report.metrics.investigatorSpread.max} max
- Nearest battery average: ${report.metrics.nearestBatteryAverage ?? "-"}

### Spawn Battery Access

${report.nearestBatteryBySpawn.map((item) => `- ${item.spawn}: ${item.distance ?? "-"}px`).join("\n")}

### Opening Anomaly Sightlines

${report.anomalyToInvestigator.map((item) => `- ${item.spawn}: ${item.blocked ? "blocked" : "open"} at ${item.distance}px`).join("\n") || "- No anomaly spawn found."}

### Warnings

${report.warnings.length ? report.warnings.map((warning) => `- ${warning}`).join("\n") : "- None"}
`).join("\n");

  return `# Map Layout Audit

- Generated: ${data.generatedAt}
- Total maps: ${data.summary.totalMaps}
- Maps with warnings: ${data.summary.mapsWithWarnings}
- Total warnings: ${data.summary.totalWarnings}
- Average score: ${data.summary.averageScore}/100

This is a design-quality report, not a gameplay rule gate. Use it to review authored Tiled maps before party testing.

| Map | Score | Collision Coverage | Prop Coverage | Opening Sightlines | Avg Battery Distance | Warnings |
|---|---:|---:|---:|---:|---:|---|
${rows}

${details}
`;
}
