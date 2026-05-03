import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const distRoot = join(root, "dist", "maps", "previews");
const sourceArgs = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const sources = sourceArgs.length ? sourceArgs : await discoverMaps();
const previews = [];

await mkdir(distRoot, { recursive: true });

for (const source of sources) {
  const mapPath = resolve(process.cwd(), source);
  const map = JSON.parse(await readFile(mapPath, "utf8"));
  const preview = renderPreview(map, relative(root, mapPath) || source, mapPath);
  const slug = basename(source).replace(/\.tiled\.json$/, "");
  const outputPath = join(distRoot, `${slug}.svg`);
  await writeFile(outputPath, preview.svg);
  previews.push({
    source: preview.source,
    output: relative(root, outputPath),
    width: preview.width,
    height: preview.height,
    counts: preview.counts
  });
}

const indexPath = join(distRoot, "index.md");
await writeFile(indexPath, makeIndex(previews));

for (const preview of previews) {
  console.log(`map preview ok: ${preview.source} -> ${preview.output}`);
}
console.log(`wrote ${relative(root, indexPath)}`);

async function discoverMaps() {
  const mapRoot = join(root, "assets", "maps");
  const files = await readdir(mapRoot);
  return files
    .filter((file) => file.endsWith(".tiled.json"))
    .sort()
    .map((file) => join("assets", "maps", file));
}

function renderPreview(map, source, mapPath) {
  const width = Number(map.width ?? 0) * Number(map.tilewidth ?? 0);
  const height = Number(map.height ?? 0) * Number(map.tileheight ?? 0);
  const layers = new Map((map.layers ?? []).map((layer) => [layer.name, layer]));
  const imageLayers = (map.layers ?? []).filter((layer) => layer.type === "imagelayer");
  const walls = objects(layers, "collision", "wall");
  const props = objects(layers, "props", "prop");
  const investigatorSpawns = objects(layers, "spawns", "investigatorSpawn");
  const anomalySpawns = objects(layers, "spawns", "anomalySpawn");
  const batteries = objects(layers, "batteries", "batterySpawn");
  const labels = objects(layers, "labels", "label");
  const title = escapeXml(property(map, "name", map.name || "Untitled Map"));
  const mapDir = dirname(mapPath);

  const grid = makeGrid(width, height, Number(map.tilewidth ?? 32), Number(map.tileheight ?? 32));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title} map preview">
  <defs>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="#12181d"/>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#gridPattern)" opacity="0"/>
  <g id="image-layers">
${imageLayers.map((layer) => imageLayer(layer, mapDir)).join("\n")}
  </g>
${grid}
  <text x="24" y="38" fill="#dff7ff" font-size="24" font-family="Arial, sans-serif" font-weight="700">${title}</text>
  <text x="24" y="62" fill="#9fb2bd" font-size="13" font-family="Arial, sans-serif">${escapeXml(source)}</text>
  <g id="props" filter="url(#softShadow)">
${props.map((object) => rect(object, property(object, "color", "#26323a"), "rgba(223,247,255,0.18)")).join("\n")}
  </g>
  <g id="collision">
${walls.map((object) => rect(object, "#44515a", "rgba(223,247,255,0.36)")).join("\n")}
  </g>
  <g id="batteries">
${batteries.map((object) => marker(object, "#f4e15d", "B")).join("\n")}
  </g>
  <g id="spawns">
${investigatorSpawns.map((object, index) => marker(object, "#7ae4d6", String(index + 1))).join("\n")}
${anomalySpawns.map((object) => marker(object, "#e76f8a", "A")).join("\n")}
  </g>
  <g id="labels">
${labels.map(label).join("\n")}
  </g>
  <g id="legend" font-family="Arial, sans-serif" font-size="13">
    ${legendItem(24, height - 92, "#44515a", "Collision")}
    ${legendItem(24, height - 68, "#26323a", "Props")}
    ${legendItem(24, height - 44, "#7ae4d6", "Investigator Spawn")}
    ${legendItem(202, height - 44, "#e76f8a", "Anomaly Spawn")}
    ${legendItem(360, height - 44, "#f4e15d", "Battery")}
    ${legendItem(466, height - 44, "#88a5b5", "Image Layer")}
  </g>
</svg>
`;

  return {
    source,
    width,
    height,
    counts: {
      walls: walls.length,
      props: props.length,
      investigatorSpawns: investigatorSpawns.length,
      anomalySpawns: anomalySpawns.length,
      batteries: batteries.length,
      labels: labels.length,
      imageLayers: imageLayers.length
    },
    svg
  };
}

function objects(layers, layerName, type) {
  return (layers.get(layerName)?.objects ?? []).filter((object) => object.type === type);
}

function rect(object, fill, stroke) {
  return `    <rect x="${n(object.x)}" y="${n(object.y)}" width="${n(object.width)}" height="${n(object.height)}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
}

function imageLayer(layer, mapDir) {
  if (!layer.image || /^https?:\/\//i.test(layer.image)) {
    return `    <rect x="0" y="0" width="100%" height="100%" fill="rgba(136,165,181,0.08)" stroke="rgba(136,165,181,0.32)" stroke-width="2"/>`;
  }
  const imagePath = resolve(mapDir, layer.image);
  const href = relative(distRoot, imagePath).replaceAll("\\", "/");
  const x = n(layer.x ?? layer.offsetx ?? 0);
  const y = n(layer.y ?? layer.offsety ?? 0);
  const width = Number.isFinite(layer.imagewidth ?? layer.width) ? n(layer.imagewidth ?? layer.width) : "100%";
  const height = Number.isFinite(layer.imageheight ?? layer.height) ? n(layer.imageheight ?? layer.height) : "100%";
  const opacity = Number.isFinite(layer.opacity) ? layer.opacity : 0.72;
  return `    <image href="${escapeXml(href)}" x="${x}" y="${y}" width="${width}" height="${height}" opacity="${n(opacity)}" preserveAspectRatio="xMidYMid meet"/>`;
}

function marker(object, fill, text) {
  const x = n(object.x);
  const y = n(object.y);
  return `    <g transform="translate(${x} ${y})">
      <circle r="13" fill="${fill}" stroke="#f8fbfd" stroke-width="3"/>
      <text x="0" y="5" text-anchor="middle" fill="#081014" font-size="13" font-family="Arial, sans-serif" font-weight="800">${escapeXml(text)}</text>
    </g>`;
}

function label(object) {
  return `    <text x="${n(object.x)}" y="${n(object.y)}" text-anchor="middle" fill="#dff7ff" font-size="16" font-family="Arial, sans-serif" font-weight="800" opacity="0.88">${escapeXml(object.name || "ROOM")}</text>`;
}

function legendItem(x, y, color, text) {
  return `<rect x="${x}" y="${y - 11}" width="14" height="14" rx="3" fill="${color}" stroke="rgba(223,247,255,0.55)"/><text x="${x + 22}" y="${y}" fill="#d2e2eb">${escapeXml(text)}</text>`;
}

function makeGrid(width, height, tileWidth, tileHeight) {
  const lines = [];
  for (let x = 0; x <= width; x += tileWidth) {
    lines.push(`  <line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="rgba(223,247,255,0.05)"/>`);
  }
  for (let y = 0; y <= height; y += tileHeight) {
    lines.push(`  <line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(223,247,255,0.05)"/>`);
  }
  return `  <g id="tile-grid">\n${lines.join("\n")}\n  </g>`;
}

function makeIndex(previews) {
  const rows = previews.map((preview) => `| \`${preview.source}\` | [${preview.output}](${preview.output.replace(/^dist\/maps\/previews\//, "")}) | ${preview.width}x${preview.height} | ${preview.counts.walls} | ${preview.counts.investigatorSpawns} | ${preview.counts.batteries} | ${preview.counts.imageLayers} |`).join("\n");
  return `# Map Previews

Generated SVG previews for quick map-editor review.

| Source | Preview | Size | Walls | Investigator Spawns | Batteries | Image Layers |
|---|---|---:|---:|---:|---:|---:|
${rows}
`;
}

function property(owner, name, fallback) {
  const found = owner?.properties?.find((item) => item.name === name);
  return found?.value ?? fallback;
}

function n(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
