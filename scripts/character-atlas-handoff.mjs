import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const briefsPath = resolve(root, "assets", "characters", "character-art-briefs.json");
const distRoot = resolve(root, "dist", "assets", "character-atlas-handoff");
const indexJsonPath = join(distRoot, "index.json");
const indexMarkdownPath = join(distRoot, "index.md");
const briefs = JSON.parse(await readFile(briefsPath, "utf8"));

const handoffs = [];
await mkdir(distRoot, { recursive: true });

for (const entry of briefs.briefs ?? []) {
  const handoff = makeHandoff(entry);
  const guideSvg = makeGuideSvg(entry, handoff);
  const markdown = makeHandoffMarkdown(entry, handoff);
  await writeFile(resolve(root, handoff.guideSvg), guideSvg);
  await writeFile(resolve(root, handoff.markdown), markdown);
  handoffs.push(handoff);
}

const output = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  source: relative(root, briefsPath),
  summary: {
    total: handoffs.length,
    planned: handoffs.filter((handoff) => handoff.status === "planned").length,
    ready: handoffs.filter((handoff) => handoff.status === "ready").length
  },
  handoffs
};

await writeFile(indexJsonPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(indexMarkdownPath, makeIndexMarkdown(output));

console.log(`character atlas handoff ok: ${handoffs.length} handoffs`);
console.log(`wrote ${relative(root, indexJsonPath)} and ${relative(root, indexMarkdownPath)}`);

function makeHandoff(entry) {
  const frame = entry.frame ?? {};
  const grid = entry.grid ?? {};
  const anchor = entry.anchor ?? {};
  const width = (frame.width ?? 0) * (grid.columns ?? 0);
  const height = (frame.height ?? 0) * (grid.rows ?? 0);
  const slug = slugify(entry.id);
  return {
    id: entry.id,
    role: entry.role,
    status: entry.status,
    targetAtlas: entry.targetAtlas,
    targetImage: entry.targetImage,
    guideSvg: relative(root, join(distRoot, `${slug}.guide.svg`)),
    markdown: relative(root, join(distRoot, `${slug}.md`)),
    canvas: { width, height },
    frame: {
      width: frame.width ?? 0,
      height: frame.height ?? 0
    },
    grid: {
      columns: grid.columns ?? 0,
      rows: grid.rows ?? 0
    },
    anchor: {
      x: anchor.x ?? 0,
      y: anchor.y ?? 0
    },
    safePadding: entry.safePadding ?? 8,
    directions: entry.directions ?? [],
    animations: entry.animations ?? [],
    productionRules: makeProductionRules(entry),
    qaChecklist: makeQaChecklist(entry)
  };
}

function makeProductionRules(entry) {
  const frame = entry.frame ?? {};
  const grid = entry.grid ?? {};
  const width = (frame.width ?? 0) * (grid.columns ?? 0);
  const height = (frame.height ?? 0) * (grid.rows ?? 0);
  return [
    `Export one transparent PNG at exactly ${width}x${height}px.`,
    `Use fixed ${frame.width ?? 0}x${frame.height ?? 0}px cells with ${grid.columns ?? 0} columns and ${grid.rows ?? 0} rows.`,
    "Keep every character fully inside its cell, including hair, backpack, flashlight, feet, shadow, and glow.",
    "Keep the foot/body anchor aligned on the yellow marker in every cell so labels, shadows, health bars, and collision do not drift.",
    "Leave the teal safe area visible around the sprite silhouette; do not let art touch cell edges.",
    "Export straight-alpha or premultiplied-alpha PNG from Aseprite/TexturePacker; never use white, gray, or checkerboard backgrounds.",
    "Keep the character design original and legally distinct from any existing game character or franchise uniform."
  ];
}

function makeQaChecklist(entry) {
  return [
    `Copy the finished PNG to ${entry.targetImage}.`,
    `Copy the matching atlas JSON to ${entry.targetAtlas}.`,
    "Run npm run assets:atlas-candidate before promotion if the sheet arrives through incoming/characters.",
    `Run node scripts/validate-character-atlas.mjs ${entry.targetAtlas}.`,
    `Run node scripts/character-atlas-preview.mjs ${entry.targetAtlas} and inspect the SVG overlay.`,
    "Only add the atlas to runtime-character-manifest.json after validation and preview both pass."
  ];
}

function makeGuideSvg(entry, handoff) {
  const { frame, grid, anchor, safePadding, canvas } = handoff;
  const labels = handoff.directions.length
    ? handoff.directions
    : Array.from({ length: grid.rows }, (_, index) => `row ${index + 1}`);
  const cells = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const x = column * frame.width;
      const y = row * frame.height;
      cells.push(`    <rect x="${x + safePadding}" y="${y + safePadding}" width="${Math.max(0, frame.width - safePadding * 2)}" height="${Math.max(0, frame.height - safePadding * 2)}" fill="rgba(122,228,214,0.08)" stroke="#7ae4d6" stroke-width="1"/>`);
      cells.push(`    <g transform="translate(${x + anchor.x} ${y + anchor.y})"><line x1="-10" y1="0" x2="10" y2="0" stroke="#11171c" stroke-width="5"/><line x1="0" y1="-10" x2="0" y2="10" stroke="#11171c" stroke-width="5"/><circle r="6" fill="#f4e15d" stroke="#11171c" stroke-width="2"/></g>`);
      cells.push(`    <line x1="${x + 18}" y1="${y + anchor.y}" x2="${x + frame.width - 18}" y2="${y + anchor.y}" stroke="#f4e15d" stroke-width="1" stroke-dasharray="5 5" opacity="0.65"/>`);
    }
  }

  const gridLines = [];
  for (let column = 0; column <= grid.columns; column += 1) {
    const x = column * frame.width;
    gridLines.push(`    <line x1="${x}" y1="0" x2="${x}" y2="${canvas.height}" stroke="#f3fbff" stroke-width="${column === 0 || column === grid.columns ? 3 : 1}" opacity="0.72"/>`);
  }
  for (let row = 0; row <= grid.rows; row += 1) {
    const y = row * frame.height;
    gridLines.push(`    <line x1="0" y1="${y}" x2="${canvas.width}" y2="${y}" stroke="#f3fbff" stroke-width="${row === 0 || row === grid.rows ? 3 : 1}" opacity="0.72"/>`);
  }

  const rowLabels = labels.map((label, row) => {
    const y = row * frame.height + 24;
    return `    <g transform="translate(${canvas.width - 12} ${y})"><rect x="-130" y="-18" width="130" height="28" rx="6" fill="rgba(8,16,20,0.86)" stroke="#e76f8a" stroke-width="2"/><text x="-65" y="1" text-anchor="middle" fill="#ffd3de" font-family="Arial, sans-serif" font-size="13" font-weight="800">${escapeXml(label)}</text></g>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height + 128}" viewBox="0 0 ${canvas.width} ${canvas.height + 128}" role="img" aria-label="${escapeXml(entry.id)} character atlas production guide">
  <rect width="${canvas.width}" height="${canvas.height + 128}" fill="#10171c"/>
  <g id="atlas-guide">
    <rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="#17242a"/>
${cells.join("\n")}
${gridLines.join("\n")}
${rowLabels.join("\n")}
  </g>
  <g id="legend" transform="translate(18 ${canvas.height + 26})" font-family="Arial, sans-serif">
    <text x="0" y="0" fill="#f3fbff" font-size="22" font-weight="800">${escapeXml(entry.id)}</text>
    <text x="0" y="24" fill="#aebdc6" font-size="13">${escapeXml(entry.targetImage)} | ${frame.width}x${frame.height} cells | ${grid.columns}x${grid.rows} grid</text>
    <rect x="0" y="44" width="16" height="16" fill="rgba(122,228,214,0.12)" stroke="#7ae4d6" stroke-width="2"/>
    <text x="24" y="57" fill="#dbe9ef" font-size="13">safe sprite area</text>
    <circle cx="176" cy="52" r="6" fill="#f4e15d" stroke="#11171c" stroke-width="2"/>
    <text x="190" y="57" fill="#dbe9ef" font-size="13">anchor and foot baseline</text>
    <rect x="0" y="76" width="16" height="16" fill="none" stroke="#f3fbff" stroke-width="2"/>
    <text x="24" y="89" fill="#dbe9ef" font-size="13">fixed frame boundary; nothing should crop outside this cell</text>
  </g>
</svg>
`;
}

function makeIndexMarkdown(data) {
  const rows = data.handoffs.map((handoff) => `| \`${handoff.id}\` | ${handoff.role} | ${handoff.status} | ${handoff.canvas.width}x${handoff.canvas.height} | ${handoff.frame.width}x${handoff.frame.height} | \`${handoff.guideSvg}\` | \`${handoff.markdown}\` |`).join("\n");
  return `# Character Atlas Handoff

- Generated: ${data.generatedAt}
- Source: \`${data.source}\`
- Handoffs: ${data.summary.total}

| ID | Role | Status | Canvas | Frame | Guide | Brief |
|---|---|---|---:|---:|---|---|
${rows}
`;
}

function makeHandoffMarkdown(entry, handoff) {
  return `# ${handoff.id} Character Atlas Handoff

- Role: ${handoff.role}
- Status: ${handoff.status}
- Target image: \`${handoff.targetImage}\`
- Target atlas: \`${handoff.targetAtlas}\`
- Guide SVG: \`${handoff.guideSvg}\`
- Canvas: ${handoff.canvas.width}x${handoff.canvas.height}
- Frame: ${handoff.frame.width}x${handoff.frame.height}
- Grid: ${handoff.grid.columns}x${handoff.grid.rows}
- Anchor: ${handoff.anchor.x},${handoff.anchor.y}
- Safe padding: ${handoff.safePadding}px

## Art Direction

${entry.direction}

## Rows

${handoff.directions.map((direction, index) => `- Row ${index}: ${direction}`).join("\n")}

## Animations

${handoff.animations.map((animation) => `- ${animation}`).join("\n")}

## Production Rules

${handoff.productionRules.map((rule) => `- ${rule}`).join("\n")}

## QA Checklist

${handoff.qaChecklist.map((item) => `- ${item}`).join("\n")}
`;
}

function slugify(value) {
  return basename(String(value)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "atlas";
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
