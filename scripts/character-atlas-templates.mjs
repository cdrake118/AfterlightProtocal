import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourcePath = resolve(root, "assets", "characters", "character-art-briefs.json");
const distRoot = resolve(root, "dist", "assets", "atlas-templates");
const indexPath = join(distRoot, "index.md");
const briefSource = JSON.parse(await readFile(sourcePath, "utf8"));
const templates = [];

await mkdir(distRoot, { recursive: true });

for (const entry of briefSource.briefs ?? []) {
  const template = makeTemplate(entry);
  const filename = basename(entry.targetAtlas || `${entry.id}.atlas.json`);
  const outputPath = join(distRoot, filename);
  await writeFile(outputPath, `${JSON.stringify(template, null, 2)}\n`);
  templates.push({
    id: entry.id,
    status: entry.status,
    role: entry.role,
    target: relative(root, outputPath),
    sourceAtlas: entry.targetAtlas,
    image: entry.targetImage,
    canvas: `${template.frame.width * template.grid.columns}x${template.frame.height * template.grid.rows}`
  });
}

await writeFile(indexPath, makeIndex(templates));

for (const template of templates) {
  console.log(`atlas template ok: ${template.id} -> ${template.target}`);
}
console.log(`wrote ${relative(root, indexPath)}`);

function makeTemplate(entry) {
  const frame = entry.frame ?? {};
  const grid = entry.grid ?? {};
  const directions = entry.directions ?? [];
  const animations = {};
  for (const name of entry.animations ?? []) {
    animations[name] = {
      rows: directions.length ? directions.map((_, index) => index).filter((index) => index < (grid.rows ?? 0)) : [0],
      frames: Array.from({ length: grid.columns ?? 0 }, (_, index) => index),
      fps: name === "idle" ? 8 : 10
    };
  }
  return {
    id: entry.id,
    role: entry.role,
    image: entry.targetImage,
    frame: {
      width: frame.width ?? 0,
      height: frame.height ?? 0
    },
    grid: {
      columns: grid.columns ?? 0,
      rows: grid.rows ?? 0
    },
    anchor: entry.anchor ?? { x: 0, y: 0 },
    safePadding: 8,
    directions,
    animations
  };
}

function makeIndex(templates) {
  const rows = templates.map((template) => `| \`${template.id}\` | ${template.role} | ${template.status} | \`${template.target}\` | \`${template.sourceAtlas}\` | \`${template.image}\` | ${template.canvas} |`).join("\n");
  return `# Character Atlas Templates

Generated from \`assets/characters/character-art-briefs.json\`.

These files are handoff templates, not runtime assets. Copy a finished template into \`assets/characters/\`, update the animation rows/frames if needed, then run \`npm run assets:validate\` before adding it to \`runtime-character-manifest.json\`.

| ID | Role | Status | Template | Runtime Target | Image | Canvas |
|---|---|---|---|---|---|---:|
${rows}
`;
}
