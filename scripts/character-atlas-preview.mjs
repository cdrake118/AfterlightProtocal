import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = resolve(root, "assets/characters/runtime-character-manifest.json");
const distRoot = resolve(root, "dist/assets/atlas-previews");
const sourceArgs = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const runtimeManifest = JSON.parse(await readFile(manifestPath, "utf8"));
const sources = sourceArgs.length ? sourceArgs : runtimeManifest.runtimeAtlases ?? [];
const previews = [];

await mkdir(distRoot, { recursive: true });

for (const source of sources) {
  const atlasPath = resolve(process.cwd(), source);
  const atlas = JSON.parse(await readFile(atlasPath, "utf8"));
  const preview = makePreview(atlas, relative(root, atlasPath) || source);
  const outputPath = join(distRoot, `${slugify(atlas.id || basename(source, ".json"))}.svg`);
  await writeFile(outputPath, preview.svg);
  previews.push({
    id: atlas.id,
    source: preview.source,
    output: relative(root, outputPath),
    image: atlas.image,
    frame: atlas.frame,
    grid: atlas.grid,
    anchor: atlas.anchor,
    safePadding: atlas.safePadding,
    animations: Object.keys(atlas.animations ?? {})
  });
}

const indexPath = join(distRoot, "index.md");
const indexJsonPath = join(distRoot, "index.json");
const index = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  runtimeManifest: relative(root, manifestPath),
  summary: {
    totalPreviews: previews.length
  },
  previews
};
await writeFile(indexJsonPath, `${JSON.stringify(index, null, 2)}\n`);
await writeFile(indexPath, makeIndex(previews));

for (const preview of previews) {
  console.log(`character atlas preview ok: ${preview.source} -> ${preview.output}`);
}
console.log(`wrote ${relative(root, indexPath)}`);
console.log(`wrote ${relative(root, indexJsonPath)}`);

function makePreview(atlas, source) {
  const frameWidth = Number(atlas.frame?.width ?? 0);
  const frameHeight = Number(atlas.frame?.height ?? 0);
  const columns = Number(atlas.grid?.columns ?? 0);
  const rows = Number(atlas.grid?.rows ?? 0);
  const imageWidth = frameWidth * columns;
  const imageHeight = frameHeight * rows;
  const legendHeight = 116;
  const width = imageWidth;
  const height = imageHeight + legendHeight;
  const imageHref = relative(distRoot, resolve(root, atlas.image ?? "")).replaceAll("\\", "/");
  const rowLabels = makeRowLabels(atlas);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(atlas.id)} atlas preview">
  <rect width="${width}" height="${height}" fill="#10171c"/>
  <g id="atlas">
    <image href="${escapeXml(imageHref)}" x="0" y="0" width="${imageWidth}" height="${imageHeight}" preserveAspectRatio="none"/>
${safePaddingRects(atlas).join("\n")}
${gridLines(frameWidth, frameHeight, columns, rows).join("\n")}
${anchorMarkers(atlas).join("\n")}
${rowLabels.join("\n")}
  </g>
  <g id="legend" transform="translate(18 ${imageHeight + 24})" font-family="Arial, sans-serif">
    <text x="0" y="0" fill="#f3fbff" font-size="22" font-weight="800">${escapeXml(atlas.id)}</text>
    <text x="0" y="24" fill="#aebdc6" font-size="13">${escapeXml(source)}</text>
    <text x="0" y="48" fill="#dbe9ef" font-size="14">Frame ${frameWidth}x${frameHeight} | Grid ${columns}x${rows} | Anchor ${atlas.anchor?.x ?? "-"},${atlas.anchor?.y ?? "-"} | Safe padding ${atlas.safePadding ?? 0}px</text>
    <g transform="translate(0 72)">
      <rect x="0" y="-10" width="16" height="16" fill="rgba(122,228,214,0.12)" stroke="#7ae4d6" stroke-width="2"/>
      <text x="24" y="3" fill="#dbe9ef" font-size="13">safe frame area</text>
      <circle cx="178" cy="-2" r="5" fill="#f4e15d" stroke="#10171c" stroke-width="2"/>
      <text x="190" y="3" fill="#dbe9ef" font-size="13">anchor point</text>
      <rect x="306" y="-10" width="16" height="16" fill="rgba(231,111,138,0.18)" stroke="#e76f8a" stroke-width="2"/>
      <text x="330" y="3" fill="#dbe9ef" font-size="13">animation row label</text>
    </g>
  </g>
</svg>
`;

  return { source, svg };
}

function safePaddingRects(atlas) {
  const frameWidth = Number(atlas.frame?.width ?? 0);
  const frameHeight = Number(atlas.frame?.height ?? 0);
  const columns = Number(atlas.grid?.columns ?? 0);
  const rows = Number(atlas.grid?.rows ?? 0);
  const padding = Number(atlas.safePadding ?? 0);
  const rects = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      rects.push(`    <rect x="${column * frameWidth + padding}" y="${row * frameHeight + padding}" width="${Math.max(0, frameWidth - padding * 2)}" height="${Math.max(0, frameHeight - padding * 2)}" fill="rgba(122,228,214,0.05)" stroke="rgba(122,228,214,0.45)" stroke-width="1"/>`);
    }
  }
  return rects;
}

function gridLines(frameWidth, frameHeight, columns, rows) {
  const lines = [];
  for (let column = 0; column <= columns; column += 1) {
    const x = column * frameWidth;
    lines.push(`    <line x1="${x}" y1="0" x2="${x}" y2="${rows * frameHeight}" stroke="rgba(243,251,255,0.68)" stroke-width="${column === 0 || column === columns ? 3 : 1}"/>`);
  }
  for (let row = 0; row <= rows; row += 1) {
    const y = row * frameHeight;
    lines.push(`    <line x1="0" y1="${y}" x2="${columns * frameWidth}" y2="${y}" stroke="rgba(243,251,255,0.68)" stroke-width="${row === 0 || row === rows ? 3 : 1}"/>`);
  }
  return lines;
}

function anchorMarkers(atlas) {
  const frameWidth = Number(atlas.frame?.width ?? 0);
  const frameHeight = Number(atlas.frame?.height ?? 0);
  const columns = Number(atlas.grid?.columns ?? 0);
  const rows = Number(atlas.grid?.rows ?? 0);
  const anchorX = Number(atlas.anchor?.x ?? 0);
  const anchorY = Number(atlas.anchor?.y ?? 0);
  const markers = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = column * frameWidth + anchorX;
      const y = row * frameHeight + anchorY;
      markers.push(`    <g transform="translate(${x} ${y})">
      <line x1="-8" y1="0" x2="8" y2="0" stroke="#10171c" stroke-width="5"/>
      <line x1="0" y1="-8" x2="0" y2="8" stroke="#10171c" stroke-width="5"/>
      <circle r="6" fill="#f4e15d" stroke="#10171c" stroke-width="2"/>
    </g>`);
    }
  }
  return markers;
}

function makeRowLabels(atlas) {
  const frameHeight = Number(atlas.frame?.height ?? 0);
  const imageWidth = Number(atlas.frame?.width ?? 0) * Number(atlas.grid?.columns ?? 0);
  const labels = [];
  const rowNames = new Map();
  for (const [name, animation] of Object.entries(atlas.animations ?? {})) {
    for (const row of animation.rows ?? []) {
      const existing = rowNames.get(row);
      rowNames.set(row, existing ? `${existing}, ${name}` : name);
    }
  }
  for (const [row, name] of rowNames.entries()) {
    const y = row * frameHeight + 24;
    labels.push(`    <g transform="translate(${imageWidth - 12} ${y})">
      <rect x="-142" y="-18" width="142" height="28" rx="6" fill="rgba(8,16,20,0.82)" stroke="#e76f8a" stroke-width="2"/>
      <text x="-70" y="1" text-anchor="middle" fill="#ffd3de" font-size="13" font-family="Arial, sans-serif" font-weight="800">${escapeXml(name)}</text>
    </g>`);
  }
  return labels;
}

function makeIndex(previews) {
  const rows = previews.map((preview) => `| \`${preview.id}\` | \`${preview.source}\` | [${preview.output}](${basename(preview.output)}) | \`${preview.image}\` | ${preview.frame.width}x${preview.frame.height} | ${preview.grid.columns}x${preview.grid.rows} | ${preview.anchor.x},${preview.anchor.y} | ${preview.animations.join(", ")} |`).join("\n");
  return `# Character Atlas Previews

Generated SVG overlays for runtime atlas review. Use these to catch sprite cropping, drifting anchors, unsafe padding, and mislabeled animation rows before runtime integration.

| Atlas | Source | Preview | Image | Frame | Grid | Anchor | Animations |
|---|---|---|---|---:|---:|---:|---|
${rows}
`;
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "atlas";
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
