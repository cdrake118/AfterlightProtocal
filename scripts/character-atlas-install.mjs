import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const briefPath = resolve(root, "assets", "characters", "character-art-briefs.json");
const runtimeManifestPath = resolve(root, "assets", "characters", "runtime-character-manifest.json");
const distRoot = resolve(root, "dist", "assets", "atlas-install");
const args = parseArgs(process.argv.slice(2));

if (args.help || !args.png || !args.atlas) {
  printUsage();
  process.exit(args.help ? 0 : 1);
}

const sourcePngPath = resolve(process.cwd(), args.png);
const sourceAtlasPath = resolve(process.cwd(), args.atlas);
const sourcePngRel = normalize(relative(root, sourcePngPath));
const sourceAtlasRel = normalize(relative(root, sourceAtlasPath));
const briefs = JSON.parse(await readFile(briefPath, "utf8"));
const runtimeManifest = JSON.parse(await readFile(runtimeManifestPath, "utf8"));
const sourceAtlas = JSON.parse(await readFile(sourceAtlasPath, "utf8"));
const png = parsePngHeader(await readFile(sourcePngPath));
const brief = selectBrief(briefs.briefs ?? [], args, sourceAtlas);
const targetImage = args.targetImage ?? brief?.targetImage ?? `assets/characters/${sourceAtlas.id}-atlas.png`;
const targetAtlas = args.targetAtlas ?? brief?.targetAtlas ?? `assets/characters/${sourceAtlas.id}.atlas.json`;
const normalizedAtlas = normalizeAtlas(sourceAtlas, { targetImage, brief });
const errors = validateInstall({ png, atlas: normalizedAtlas, targetImage, targetAtlas });
const plannedChanges = makePlannedChanges({ sourcePngRel, sourceAtlasRel, targetImage, targetAtlas });
const report = await writeReport({
  dryRun: args.dryRun,
  sourcePngRel,
  sourceAtlasRel,
  targetImage,
  targetAtlas,
  png,
  atlas: normalizedAtlas,
  plannedChanges,
  errors
});

if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (!args.dryRun) {
  const targetImagePath = resolve(root, targetImage);
  const targetAtlasPath = resolve(root, targetAtlas);
  await mkdir(dirname(targetImagePath), { recursive: true });
  if (normalize(sourcePngPath) !== normalize(targetImagePath)) {
    await copyFile(sourcePngPath, targetImagePath);
  }
  await writeFile(targetAtlasPath, `${JSON.stringify(normalizedAtlas, null, 2)}\n`);
  await writeFile(runtimeManifestPath, `${JSON.stringify(updateRuntimeManifest(runtimeManifest, targetAtlas, targetImage), null, 2)}\n`);
}

console.log(`character atlas install ${args.dryRun ? "dry-run" : "ok"}: ${normalizedAtlas.id}`);
console.log(`wrote ${relative(root, report.jsonPath)} and ${relative(root, report.markdownPath)}`);

function selectBrief(briefs, options, atlas) {
  if (options.brief) return briefs.find((entry) => entry.id === options.brief);
  if (options.role) return briefs.find((entry) => entry.role === options.role);
  return briefs.find((entry) => entry.id === atlas.id)
    ?? briefs.find((entry) => entry.role === atlas.role)
    ?? null;
}

function normalizeAtlas(atlas, { targetImage, brief }) {
  return {
    ...atlas,
    id: atlas.id ?? brief?.id ?? "character-atlas",
    role: atlas.role ?? brief?.role ?? "investigator",
    image: targetImage,
    frame: atlas.frame ?? brief?.frame,
    grid: atlas.grid ?? brief?.grid,
    anchor: atlas.anchor ?? brief?.anchor,
    safePadding: atlas.safePadding ?? 8,
    directions: atlas.directions ?? brief?.directions ?? [],
    animations: atlas.animations ?? makeAnimations(brief)
  };
}

function makeAnimations(brief) {
  const animations = {};
  const directions = brief?.directions ?? [];
  const columns = brief?.grid?.columns ?? 0;
  const rows = brief?.grid?.rows ?? directions.length;
  for (const name of brief?.animations ?? ["idle"]) {
    animations[name] = {
      rows: directions.map((_, index) => index).filter((index) => index < rows),
      frames: Array.from({ length: columns }, (_, index) => index),
      fps: name === "idle" ? 8 : 10
    };
  }
  return animations;
}

function validateInstall({ png, atlas, targetImage, targetAtlas }) {
  const errors = [];
  if (!targetImage.startsWith("assets/characters/")) errors.push("target image must live under assets/characters/");
  if (!targetAtlas.startsWith("assets/characters/")) errors.push("target atlas must live under assets/characters/");
  if (!targetImage.endsWith(".png")) errors.push("target image must be a PNG");
  if (!targetAtlas.endsWith(".json")) errors.push("target atlas must be JSON");
  if (!png.hasAlpha) errors.push("source PNG must have alpha transparency");
  const expectedWidth = (atlas.frame?.width ?? 0) * (atlas.grid?.columns ?? 0);
  const expectedHeight = (atlas.frame?.height ?? 0) * (atlas.grid?.rows ?? 0);
  if (!expectedWidth || !expectedHeight) errors.push("atlas frame and grid must produce a non-zero canvas");
  if (png.width !== expectedWidth || png.height !== expectedHeight) {
    errors.push(`source PNG size ${png.width}x${png.height} does not match atlas frame/grid ${expectedWidth}x${expectedHeight}`);
  }
  if (!atlas.anchor || atlas.anchor.x <= 0 || atlas.anchor.y <= 0) errors.push("atlas anchor must be positive");
  if (atlas.anchor?.x > atlas.frame?.width || atlas.anchor?.y > atlas.frame?.height) errors.push("atlas anchor must sit inside the source frame");
  if (!atlas.animations || !Object.keys(atlas.animations).length) errors.push("atlas animations are required");
  for (const [name, animation] of Object.entries(atlas.animations ?? {})) {
    for (const frame of animation.frames ?? []) {
      if (!Number.isInteger(frame) || frame < 0 || frame >= atlas.grid.columns) errors.push(`animation ${name} frame ${frame} is outside the grid`);
    }
    for (const row of animation.rows ?? []) {
      if (!Number.isInteger(row) || row < 0 || row >= atlas.grid.rows) errors.push(`animation ${name} row ${row} is outside the grid`);
    }
  }
  return errors;
}

function makePlannedChanges({ sourcePngRel, sourceAtlasRel, targetImage, targetAtlas }) {
  return [
    `Copy ${sourcePngRel} to ${targetImage}.`,
    `Normalize ${sourceAtlasRel} image path to ${targetImage}.`,
    `Write atlas JSON to ${targetAtlas}.`,
    `Add ${targetAtlas} to runtime-character-manifest.json if it is not already listed.`,
    "Remove matching source-only reference entries from runtime-character-manifest.json once the runtime atlas is approved."
  ];
}

function updateRuntimeManifest(manifest, targetAtlas, targetImage) {
  const runtimeAtlases = [...new Set([...(manifest.runtimeAtlases ?? []), targetAtlas])];
  const sourceOnlyAssets = (manifest.sourceOnlyAssets ?? []).filter((asset) => asset.image !== targetImage);
  return {
    ...manifest,
    runtimeAtlases,
    sourceOnlyAssets
  };
}

async function writeReport(data) {
  await mkdir(distRoot, { recursive: true });
  const slug = slugify(data.atlas.id);
  const jsonPath = join(distRoot, `${slug}.install.json`);
  const markdownPath = join(distRoot, `${slug}.md`);
  const report = {
    app: "Afterlight Protocol",
    generatedAt: new Date().toISOString(),
    ...data,
    nextCommands: [
      `node scripts/validate-character-atlas.mjs ${data.targetAtlas}`,
      `node scripts/character-atlas-preview.mjs ${data.targetAtlas}`,
      "npm run assets:review",
      "npm run party:readiness"
    ]
  };
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownPath, makeMarkdown(report));
  return { jsonPath, markdownPath };
}

function makeMarkdown(report) {
  return `# Character Atlas Install Report

- Generated: ${report.generatedAt}
- Mode: ${report.dryRun ? "dry run" : "write"}
- ID: \`${report.atlas.id}\`
- Role: ${report.atlas.role}
- Source PNG: \`${report.sourcePngRel}\`
- Source atlas: \`${report.sourceAtlasRel}\`
- Target image: \`${report.targetImage}\`
- Target atlas: \`${report.targetAtlas}\`
- Source size: ${report.png.width}x${report.png.height}
- Alpha: ${report.png.hasAlpha ? "yes" : "no"}

## Planned Changes

${report.plannedChanges.map((change) => `- ${change}`).join("\n")}

## Validation

${report.errors.length ? report.errors.map((error) => `- ${error}`).join("\n") : "- No install errors detected."}

## Next Commands

${report.nextCommands.map((command) => `- \`${command}\``).join("\n")}
`;
}

function parseArgs(rawArgs) {
  const parsed = { png: null, atlas: null, dryRun: false };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--atlas") parsed.atlas = rawArgs[++index];
    else if (arg === "--brief") parsed.brief = rawArgs[++index];
    else if (arg === "--role") parsed.role = rawArgs[++index];
    else if (arg === "--target-image") parsed.targetImage = rawArgs[++index];
    else if (arg === "--target-atlas") parsed.targetAtlas = rawArgs[++index];
    else if (!parsed.png) parsed.png = arg;
  }
  return parsed;
}

function printUsage() {
  console.log(`Usage:
  node scripts/character-atlas-install.mjs <png> --atlas <atlas.json> [--brief investigator-production-atlas] [--dry-run]

Examples:
  npm run assets:atlas-install -- incoming/characters/investigator-clean.png --atlas dist/assets/atlas-candidates/investigator-production-atlas.atlas.json --brief investigator-production-atlas --dry-run
  npm run assets:atlas-install -- incoming/characters/investigator-clean.png --atlas dist/assets/atlas-candidates/investigator-production-atlas.atlas.json --brief investigator-production-atlas
`);
}

function parsePngHeader(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) throw new Error("image is not a PNG");
  const ihdr = buffer.subarray(12, 16).toString("ascii");
  if (ihdr !== "IHDR") throw new Error("PNG IHDR header missing");
  const colorType = buffer.readUInt8(25);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer.readUInt8(24),
    colorType,
    hasAlpha: colorType === 4 || colorType === 6
  };
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "atlas";
}

function normalize(path) {
  return path.replaceAll("\\", "/");
}
