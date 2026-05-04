import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = resolve(root, "assets", "maps", "map-art-manifest.json");
const distRoot = resolve(root, "dist", "maps", "map-art-install");
const args = parseArgs(process.argv.slice(2));

if (args.help || !args.source) {
  printUsage();
  process.exit(args.help ? 0 : 1);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const entry = selectEntry(manifest.maps ?? [], args);
if (!entry) {
  throw new Error(`map art manifest entry not found${args.mapId ? `: ${args.mapId}` : ""}`);
}

const sourcePath = resolve(process.cwd(), args.source);
const sourceRel = normalize(relative(root, sourcePath));
const sourcePng = parsePngHeader(await readFile(sourcePath));
const expectedSize = entry.expectedSize ?? {};
const targetImage = args.target ?? (entry.image || `assets/maps/${entry.id}.png`);
const targetImagePath = resolve(root, targetImage);
const mapPath = resolve(root, entry.map);
const map = JSON.parse(await readFile(mapPath, "utf8"));
const errors = validateInstall({ entry, sourcePng, expectedSize, targetImage });
const plannedChanges = makePlannedChanges({ entry, sourceRel, targetImage, mapPath });

if (errors.length) {
  await writeReport({ entry, sourceRel, targetImage, sourcePng, plannedChanges, errors, dryRun: args.dryRun });
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const updatedManifest = updateManifest(manifest, entry.id, targetImage);
const updatedMap = updateTiledMap(map, { image: normalize(relative(dirname(mapPath), targetImagePath)), expectedSize });
const report = await writeReport({ entry, sourceRel, targetImage, sourcePng, plannedChanges, errors, dryRun: args.dryRun });

if (!args.dryRun) {
  await mkdir(dirname(targetImagePath), { recursive: true });
  if (normalize(sourcePath) !== normalize(targetImagePath)) {
    await copyFile(sourcePath, targetImagePath);
  }
  await writeFile(manifestPath, `${JSON.stringify(updatedManifest, null, 2)}\n`);
  await writeFile(mapPath, `${JSON.stringify(updatedMap, null, 2)}\n`);
}

console.log(`map art install ${args.dryRun ? "dry-run" : "ok"}: ${entry.id}`);
console.log(`wrote ${relative(root, report.jsonPath)} and ${relative(root, report.markdownPath)}`);

function selectEntry(entries, options) {
  if (options.mapId) return entries.find((candidate) => candidate.id === options.mapId);
  if (options.map) return entries.find((candidate) => candidate.map === options.map);
  return entries[0] ?? null;
}

function validateInstall({ entry, sourcePng, expectedSize, targetImage }) {
  const errors = [];
  if (!targetImage.startsWith("assets/maps/")) {
    errors.push("target image must live under assets/maps/");
  }
  if (!targetImage.endsWith(".png")) {
    errors.push("target image must be a PNG so dimensions can be validated automatically");
  }
  if (sourcePng.width !== expectedSize.width || sourcePng.height !== expectedSize.height) {
    errors.push(`source PNG size ${sourcePng.width}x${sourcePng.height} does not match expected ${expectedSize.width}x${expectedSize.height}`);
  }
  if (sourcePng.colorType !== 2 && sourcePng.colorType !== 6) {
    errors.push("source PNG should be RGB or RGBA for browser and Tiled compatibility");
  }
  if (!entry.map) {
    errors.push("manifest entry is missing map path");
  }
  return errors;
}

function makePlannedChanges({ entry, sourceRel, targetImage, mapPath }) {
  return [
    `Copy ${sourceRel} to ${targetImage}.`,
    `Mark ${entry.id} as ready in assets/maps/map-art-manifest.json.`,
    `Set ${entry.id} image path to ${targetImage}.`,
    `Add or replace art-background image layer in ${normalize(relative(root, mapPath))}.`,
    "Keep collision, props, spawns, batteries, and labels as object layers above the image layer."
  ];
}

function updateManifest(manifest, id, targetImage) {
  return {
    ...manifest,
    maps: (manifest.maps ?? []).map((candidate) => candidate.id === id
      ? { ...candidate, status: "ready", image: targetImage }
      : candidate)
  };
}

function updateTiledMap(map, { image, expectedSize }) {
  const existing = (map.layers ?? []).find((layer) => layer.name === "art-background" && layer.type === "imagelayer");
  const existingId = existing?.id;
  const nextId = Math.max(0, ...(map.layers ?? []).map((layer) => Number(layer.id ?? 0))) + 1;
  const artLayer = {
    id: existingId ?? nextId,
    name: "art-background",
    type: "imagelayer",
    image,
    imagewidth: expectedSize.width,
    imageheight: expectedSize.height,
    opacity: 1,
    visible: true,
    x: 0,
    y: 0
  };
  return {
    ...map,
    layers: [
      artLayer,
      ...(map.layers ?? []).filter((layer) => !(layer.name === "art-background" && layer.type === "imagelayer"))
    ]
  };
}

async function writeReport({ entry, sourceRel, targetImage, sourcePng, plannedChanges, errors, dryRun }) {
  await mkdir(distRoot, { recursive: true });
  const slug = slugify(entry.id);
  const jsonPath = join(distRoot, `${slug}.install.json`);
  const markdownPath = join(distRoot, `${slug}.md`);
  const report = {
    app: "Afterlight Protocol",
    generatedAt: new Date().toISOString(),
    dryRun,
    id: entry.id,
    source: sourceRel,
    targetImage,
    targetMap: entry.map,
    sourcePng,
    plannedChanges,
    errors,
    nextCommands: [
      "npm run maps:review",
      "npm run party:readiness"
    ]
  };
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownPath, makeMarkdown(report));
  return { jsonPath, markdownPath };
}

function makeMarkdown(report) {
  return `# Map Art Install Report

- Generated: ${report.generatedAt}
- Mode: ${report.dryRun ? "dry run" : "write"}
- ID: \`${report.id}\`
- Source: \`${report.source}\`
- Target image: \`${report.targetImage}\`
- Target map: \`${report.targetMap}\`
- Source size: ${report.sourcePng.width}x${report.sourcePng.height}

## Planned Changes

${report.plannedChanges.map((change) => `- ${change}`).join("\n")}

## Validation

${report.errors.length ? report.errors.map((error) => `- ${error}`).join("\n") : "- No install errors detected."}

## Next Commands

${report.nextCommands.map((command) => `- \`${command}\``).join("\n")}
`;
}

function parseArgs(rawArgs) {
  const parsed = { source: null, dryRun: false };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--map-id") parsed.mapId = rawArgs[++index];
    else if (arg === "--map") parsed.map = rawArgs[++index];
    else if (arg === "--target") parsed.target = rawArgs[++index];
    else if (!parsed.source) parsed.source = arg;
  }
  return parsed;
}

function printUsage() {
  console.log(`Usage:
  node scripts/map-art-install.mjs <png> --map-id manor-party-render [--dry-run]

Examples:
  npm run maps:art-install -- incoming/maps/manor-party-render.png --map-id manor-party-render --dry-run
  npm run maps:art-install -- incoming/maps/manor-party-render.png --map-id manor-party-render
`);
}

function parsePngHeader(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("image is not a PNG");
  }
  const ihdr = buffer.subarray(12, 16).toString("ascii");
  if (ihdr !== "IHDR") {
    throw new Error("PNG IHDR header missing");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer.readUInt8(24),
    colorType: buffer.readUInt8(25)
  };
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "map-art";
}

function normalize(path) {
  return path.replaceAll("\\", "/");
}
