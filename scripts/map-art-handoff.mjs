import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = resolve(root, "assets", "maps", "map-art-manifest.json");
const distRoot = resolve(root, "dist", "maps", "map-art-handoff");
const indexJsonPath = join(distRoot, "index.json");
const indexMarkdownPath = join(distRoot, "index.md");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const handoffs = [];

for (const entry of manifest.maps ?? []) {
  const handoff = await makeHandoff(entry);
  handoffs.push(handoff);
}

const output = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  manifest: relative(root, manifestPath),
  summary: {
    total: handoffs.length,
    planned: handoffs.filter((handoff) => handoff.status === "planned").length,
    ready: handoffs.filter((handoff) => handoff.status === "ready").length
  },
  handoffs
};

await mkdir(distRoot, { recursive: true });
await writeFile(indexJsonPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(indexMarkdownPath, makeIndexMarkdown(output));

console.log(`map art handoff ok: ${handoffs.length} handoffs`);
console.log(`wrote ${relative(root, indexJsonPath)} and ${relative(root, indexMarkdownPath)}`);

async function makeHandoff(entry) {
  const mapPath = resolve(root, entry.map);
  const map = JSON.parse(await readFile(mapPath, "utf8"));
  const expected = entry.expectedSize ?? {};
  const width = expected.width ?? map.width * map.tilewidth;
  const height = expected.height ?? map.height * map.tileheight;
  const id = entry.id;
  const layerSummary = summarizeLayers(map);
  const svgPath = join(distRoot, `${id}.guide.svg`);
  const markdownPath = join(distRoot, `${id}.md`);
  const svg = makeGuideSvg({ entry, map, width, height, layerSummary });
  const handoff = {
    id,
    status: entry.status,
    sourceMap: relative(root, mapPath),
    targetImage: entry.image || `assets/maps/${id}.png`,
    guideSvg: relative(root, svgPath),
    markdown: relative(root, markdownPath),
    expectedSize: { width, height },
    tileSize: { width: map.tilewidth, height: map.tileheight },
    layerSummary,
    productionRules: makeProductionRules(entry, width, height),
    tiledHandoff: makeTiledHandoff(entry, width, height)
  };

  await mkdir(dirname(svgPath), { recursive: true });
  await writeFile(svgPath, svg);
  await writeFile(markdownPath, makeHandoffMarkdown(handoff, entry));
  return handoff;
}

function summarizeLayers(map) {
  const layers = Object.fromEntries((map.layers ?? []).map((layer) => [layer.name, layer]));
  const objects = (name) => layers[name]?.objects ?? [];
  return {
    collisionObjects: objects("collision").length,
    propObjects: objects("props").length,
    investigatorSpawns: objects("spawns").filter((object) => object.type === "investigatorSpawn").length,
    anomalySpawns: objects("spawns").filter((object) => object.type === "anomalySpawn").length,
    batterySpawns: objects("batteries").filter((object) => object.type === "batterySpawn").length,
    labels: objects("labels").length
  };
}

function makeProductionRules(entry, width, height) {
  return [
    `Export one flattened PNG at exactly ${width}x${height}px.`,
    "Keep gameplay UI, room labels, arrows, flashlight cones, health bars, and pickup icons out of the artwork.",
    "Paint floor, walls, furniture, and atmospheric lighting so the room structure is readable from a TV distance.",
    "Keep walls and large furniture aligned with the guide overlay; small decor can vary as long as collision remains believable.",
    "Leave enough contrast for teal flashlight beams, character sprites, batteries, revive indicators, and ghost reveal effects.",
    "Use original haunted-manor research-site art direction; do not recreate proprietary rooms, characters, logos, or exact prop arrangements."
  ];
}

function makeTiledHandoff(entry, width, height) {
  const image = entry.image || `assets/maps/${entry.id}.png`;
  return [
    `Move the final PNG to ${image}.`,
    "Add it to the Tiled map as an image layer named art-background.",
    "Place the image layer below collision, props, spawns, batteries, and labels.",
    `Confirm the image layer starts at x=0, y=0 and fills ${width}x${height}px.`,
    "Run npm run maps:review and inspect dist/maps/previews/manor-party.svg for alignment."
  ];
}

function makeGuideSvg({ entry, map, width, height }) {
  const layers = Object.fromEntries((map.layers ?? []).map((layer) => [layer.name, layer]));
  const collision = (layers.collision?.objects ?? []).map((object) => rect(object, "#ff5570", 0.28, "#ff8fa1"));
  const props = (layers.props?.objects ?? []).map((object) => rect(object, "#66e0c5", 0.24, "#9cf5e4"));
  const spawns = (layers.spawns?.objects ?? []).map((object) => marker(object, object.type === "anomalySpawn" ? "#ffcc66" : "#8bd5ff", object.type === "anomalySpawn" ? "A" : "I"));
  const batteries = (layers.batteries?.objects ?? []).map((object) => marker(object, "#c8ff6a", "B"));
  const labels = (layers.labels?.objects ?? []).map((object) => label(object));
  const grid = makeGrid(width, height, map.tilewidth, map.tileheight);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(entry.id)} map art handoff guide">
  <rect width="${width}" height="${height}" fill="#071315"/>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#floor)"/>
  <defs>
    <pattern id="floor" width="${map.tilewidth}" height="${map.tileheight}" patternUnits="userSpaceOnUse">
      <rect width="${map.tilewidth}" height="${map.tileheight}" fill="#102123"/>
      <path d="M ${map.tilewidth} 0 L 0 0 0 ${map.tileheight}" fill="none" stroke="#294447" stroke-width="1" opacity="0.4"/>
    </pattern>
  </defs>
  <g id="grid" opacity="0.32">
${grid}
  </g>
  <g id="paint-safe-area">
    <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#d7fff7" stroke-width="3"/>
  </g>
  <g id="collision-walls">
${collision.join("\n")}
  </g>
  <g id="large-props">
${props.join("\n")}
  </g>
  <g id="spawn-and-pickup-context">
${[...spawns, ...batteries].join("\n")}
  </g>
  <g id="room-label-context">
${labels.join("\n")}
  </g>
  <g id="legend" font-family="Arial, sans-serif" font-size="16" font-weight="700">
    <rect x="18" y="18" width="414" height="112" rx="10" fill="#071315" opacity="0.88" stroke="#d7fff7" stroke-width="1"/>
    <text x="36" y="50" fill="#d7fff7">${escapeXml(entry.id)} art guide</text>
    <text x="36" y="78" fill="#ff8fa1">red = collision walls</text>
    <text x="36" y="104" fill="#9cf5e4">teal = large prop silhouettes</text>
    <text x="220" y="78" fill="#8bd5ff">I = investigator</text>
    <text x="220" y="104" fill="#ffcc66">A = anomaly, B = battery</text>
  </g>
</svg>
`;
}

function makeGrid(width, height, tileWidth, tileHeight) {
  const lines = [];
  for (let x = 0; x <= width; x += tileWidth) {
    lines.push(`    <line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#7ddbd0" stroke-width="1"/>`);
  }
  for (let y = 0; y <= height; y += tileHeight) {
    lines.push(`    <line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#7ddbd0" stroke-width="1"/>`);
  }
  return lines.join("\n");
}

function rect(object, fill, opacity, stroke) {
  return `    <rect x="${num(object.x)}" y="${num(object.y)}" width="${num(object.width)}" height="${num(object.height)}" rx="3" fill="${fill}" opacity="${opacity}" stroke="${stroke}" stroke-width="2"/>`;
}

function marker(object, color, text) {
  const x = num(object.x);
  const y = num(object.y);
  return `    <g transform="translate(${x} ${y})"><circle r="13" fill="#071315" stroke="${color}" stroke-width="3"/><text x="0" y="5" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="800" fill="${color}">${text}</text></g>`;
}

function label(object) {
  return `    <text x="${num(object.x)}" y="${num(object.y)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="800" fill="#f7e1aa" opacity="0.85">${escapeXml(object.name ?? "")}</text>`;
}

function makeIndexMarkdown(data) {
  const rows = data.handoffs.map((handoff) => `| \`${handoff.id}\` | ${handoff.status} | ${handoff.expectedSize.width}x${handoff.expectedSize.height} | \`${handoff.guideSvg}\` | \`${handoff.markdown}\` |`).join("\n");
  return `# Map Art Handoff

- Generated: ${data.generatedAt}
- Manifest: \`${data.manifest}\`
- Handoffs: ${data.summary.total}

| ID | Status | Size | Guide | Brief |
|---|---|---:|---|---|
${rows}
`;
}

function makeHandoffMarkdown(handoff, entry) {
  return `# ${handoff.id} Map Art Handoff

- Status: ${handoff.status}
- Source map: \`${handoff.sourceMap}\`
- Target image: \`${handoff.targetImage}\`
- Guide SVG: \`${handoff.guideSvg}\`
- Expected size: ${handoff.expectedSize.width}x${handoff.expectedSize.height}
- Tile size: ${handoff.tileSize.width}x${handoff.tileSize.height}

## Art Direction

${entry.direction}

## Layer Summary

| Layer | Count |
|---|---:|
| Collision objects | ${handoff.layerSummary.collisionObjects} |
| Large props | ${handoff.layerSummary.propObjects} |
| Investigator spawns | ${handoff.layerSummary.investigatorSpawns} |
| Anomaly spawns | ${handoff.layerSummary.anomalySpawns} |
| Battery spawns | ${handoff.layerSummary.batterySpawns} |
| Labels | ${handoff.layerSummary.labels} |

## Production Rules

${handoff.productionRules.map((rule) => `- ${rule}`).join("\n")}

## Tiled Handoff

${handoff.tiledHandoff.map((step) => `- ${step}`).join("\n")}
`;
}

function num(value) {
  return Number.parseFloat(Number(value ?? 0).toFixed(2));
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
