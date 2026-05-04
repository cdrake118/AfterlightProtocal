import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const distRoot = resolve(root, "dist", "maps", "new-tiled-map");
const args = parseArgs(process.argv.slice(2));

if (args.help || !args.id) {
  printUsage();
  process.exit(args.help ? 0 : 1);
}

const tileSize = Number(args.tileSize ?? 32);
if (!Number.isFinite(tileSize) || tileSize <= 0) {
  throw new Error("--tile-size must be a positive number");
}

const output = args.output ?? `assets/maps/${slugify(args.id)}.tiled.json`;
const outputPath = resolve(root, output);
const imageInfo = args.image ? await readPngInfo(args.image) : null;
const pixelWidth = Number(args.pixelWidth ?? imageInfo?.width ?? 1280);
const pixelHeight = Number(args.pixelHeight ?? imageInfo?.height ?? 736);
if (!Number.isFinite(pixelWidth) || !Number.isFinite(pixelHeight) || pixelWidth <= 0 || pixelHeight <= 0) {
  throw new Error("map pixel size must be positive; pass --image or --pixel-width and --pixel-height");
}

const map = makeMap({
  id: args.id,
  name: args.name ?? titleize(args.id),
  imageInfo,
  outputPath,
  tileSize,
  pixelWidth,
  pixelHeight
});
const warnings = validateScaffold({ output, args, imageInfo });
const report = await writeReport({ map, output, imageInfo, warnings, dryRun: args.dryRun });

if (!args.dryRun) {
  await assertWritable(outputPath, args.force);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(map, null, 2)}\n`);
}

console.log(`new tiled map ${args.dryRun ? "dry-run" : "ok"}: ${output}`);
console.log(`wrote ${relative(root, report.jsonPath)} and ${relative(root, report.markdownPath)}`);

function makeMap({ id, name, imageInfo, outputPath, tileSize, pixelWidth, pixelHeight }) {
  let layerId = 1;
  const layers = [];
  if (imageInfo) {
    layers.push({
      id: layerId++,
      name: "art-background",
      type: "imagelayer",
      image: normalize(relative(dirname(outputPath), imageInfo.path)),
      imagewidth: imageInfo.width,
      imageheight: imageInfo.height,
      opacity: 1,
      visible: true,
      x: 0,
      y: 0
    });
  }
  const starterObjects = makeStarterObjects(pixelWidth, pixelHeight);
  layers.push(objectLayer(layerId++, "collision", starterObjects.walls));
  layers.push(objectLayer(layerId++, "props", starterObjects.props));
  layers.push(objectLayer(layerId++, "spawns", starterObjects.spawns));
  layers.push(objectLayer(layerId++, "batteries", starterObjects.batteries));
  layers.push(objectLayer(layerId++, "labels", starterObjects.labels));

  return {
    type: "map",
    version: "1.10",
    tiledversion: "1.11.0",
    orientation: "orthogonal",
    renderorder: "right-down",
    width: Math.ceil(pixelWidth / tileSize),
    height: Math.ceil(pixelHeight / tileSize),
    tilewidth: tileSize,
    tileheight: tileSize,
    infinite: false,
    properties: [
      { name: "id", type: "string", value: slugify(id) },
      { name: "name", type: "string", value: name },
      { name: "status", type: "string", value: "draft" },
      { name: "scaffolded", type: "bool", value: true }
    ],
    layers
  };
}

function makeStarterObjects(width, height) {
  const inset = Math.round(Math.max(56, Math.min(width, height) * 0.08));
  const wall = Math.round(Math.max(18, Math.min(width, height) * 0.028));
  const left = inset;
  const right = width - inset;
  const top = inset;
  const bottom = height - inset;
  const midX = width / 2;
  const midY = height / 2;
  const roomPropW = Math.round(width * 0.1);
  const roomPropH = Math.round(height * 0.08);

  return {
    walls: [
      rect(1, "north-boundary", "wall", left, top, right - left, wall),
      rect(2, "south-boundary", "wall", left, bottom - wall, right - left, wall),
      rect(3, "west-boundary", "wall", left, top, wall, bottom - top),
      rect(4, "east-boundary", "wall", right - wall, top, wall, bottom - top),
      rect(5, "left-divider", "wall", Math.round(width * 0.35), top + wall, wall, Math.round(height * 0.27)),
      rect(6, "right-divider", "wall", Math.round(width * 0.65), top + wall, wall, Math.round(height * 0.27)),
      rect(7, "lower-left-divider", "wall", Math.round(width * 0.35), Math.round(height * 0.58), wall, bottom - Math.round(height * 0.58) - wall),
      rect(8, "lower-right-divider", "wall", Math.round(width * 0.65), Math.round(height * 0.58), wall, bottom - Math.round(height * 0.58) - wall)
    ],
    props: [
      rect(20, "left-room-prop", "prop", Math.round(width * 0.18), Math.round(height * 0.22), roomPropW, roomPropH, "#26323a"),
      rect(21, "center-room-prop", "prop", Math.round(midX - roomPropW / 2), Math.round(height * 0.22), roomPropW, roomPropH, "#33241d"),
      rect(22, "right-room-prop", "prop", Math.round(width * 0.72), Math.round(height * 0.68), roomPropW, roomPropH, "#3a3320")
    ],
    spawns: [
      point(30, "investigator-1", "investigatorSpawn", left + 88, top + 88, "#7ae4d6"),
      point(31, "investigator-2", "investigatorSpawn", right - 88, top + 88, "#e76f8a"),
      point(32, "investigator-3", "investigatorSpawn", left + 88, bottom - 88, "#c7a8ff"),
      point(33, "investigator-4", "investigatorSpawn", right - 88, bottom - 88, "#f4e15d"),
      point(34, "anomaly", "anomalySpawn", midX, midY)
    ],
    batteries: [
      point(40, "battery-left", "batterySpawn", Math.round(width * 0.25), Math.round(height * 0.5)),
      point(41, "battery-center", "batterySpawn", Math.round(width * 0.5), Math.round(height * 0.72)),
      point(42, "battery-right", "batterySpawn", Math.round(width * 0.75), Math.round(height * 0.5))
    ],
    labels: [
      point(50, "LEFT WING", "label", Math.round(width * 0.24), Math.round(height * 0.18)),
      point(51, "CENTER HALL", "label", Math.round(width * 0.5), Math.round(height * 0.18)),
      point(52, "RIGHT WING", "label", Math.round(width * 0.76), Math.round(height * 0.18))
    ]
  };
}

function objectLayer(id, name, objects) {
  return {
    id,
    name,
    type: "objectgroup",
    objects
  };
}

function rect(id, name, type, x, y, width, height, color = null) {
  const object = {
    id,
    name,
    type,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height)
  };
  if (color) object.properties = [{ name: "color", type: "string", value: color }];
  return object;
}

function point(id, name, type, x, y, color = null) {
  const object = {
    id,
    name,
    type,
    x: Math.round(x),
    y: Math.round(y)
  };
  if (color) {
    object.properties = [
      { name: "name", type: "string", value: titleize(name) },
      { name: "color", type: "string", value: color }
    ];
  }
  return object;
}

async function readPngInfo(source) {
  const path = resolve(process.cwd(), source);
  const buffer = await readFile(path);
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("--image must point to a PNG file");
  }
  if (buffer.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error("PNG IHDR header missing");
  }
  return {
    path,
    source: normalize(relative(root, path)),
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer.readUInt8(25)
  };
}

async function assertWritable(outputPath, force) {
  try {
    await stat(outputPath);
    if (!force) throw new Error(`output already exists: ${normalize(relative(root, outputPath))}; pass --force to overwrite`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function validateScaffold({ output, args, imageInfo }) {
  const warnings = [];
  if (!output.startsWith("assets/maps/")) warnings.push("output should usually live under assets/maps/ so Tiled project references stay portable");
  if (!output.endsWith(".tiled.json")) warnings.push("output should use the .tiled.json suffix");
  if (!args.image) warnings.push("no image plate was provided; scaffold uses blank dimensions and should receive art before party testing");
  if (imageInfo && imageInfo.colorType !== 2 && imageInfo.colorType !== 6) {
    warnings.push("image plate should be RGB or RGBA for predictable browser/Tiled rendering");
  }
  return warnings;
}

async function writeReport({ map, output, imageInfo, warnings, dryRun }) {
  await mkdir(distRoot, { recursive: true });
  const slug = slugify(map.properties.find((item) => item.name === "id")?.value ?? "map");
  const jsonPath = join(distRoot, `${slug}.report.json`);
  const markdownPath = join(distRoot, `${slug}.md`);
  const scaffoldPath = join(distRoot, `${slug}.tiled.json`);
  const report = {
    app: "Afterlight Protocol",
    generatedAt: new Date().toISOString(),
    dryRun,
    output,
    scaffoldPreview: normalize(relative(root, scaffoldPath)),
    name: map.properties.find((item) => item.name === "name")?.value ?? "Untitled Map",
    pixelSize: {
      width: map.width * map.tilewidth,
      height: map.height * map.tileheight
    },
    tileSize: map.tilewidth,
    image: imageInfo ? {
      source: imageInfo.source,
      width: imageInfo.width,
      height: imageInfo.height
    } : null,
    layers: map.layers.map((layer) => ({
      name: layer.name,
      type: layer.type,
      objects: layer.objects?.length ?? 0
    })),
    warnings,
    nextCommands: [
      `npm run maps:validate -- ${output}`,
      `node scripts/render-map-preview.mjs ${output}`,
      "npm run maps:layout"
    ]
  };
  await writeFile(scaffoldPath, `${JSON.stringify(map, null, 2)}\n`);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownPath, makeMarkdown(report));
  return { jsonPath, markdownPath, scaffoldPath };
}

function makeMarkdown(report) {
  const layerRows = report.layers.map((layer) => `| \`${layer.name}\` | ${layer.type} | ${layer.objects} |`).join("\n");
  return `# New Tiled Map Scaffold

- Generated: ${report.generatedAt}
- Mode: ${report.dryRun ? "dry run" : "write"}
- Name: ${report.name}
- Output: \`${report.output}\`
- Scaffold preview: \`${report.scaffoldPreview}\`
- Pixel size: ${report.pixelSize.width}x${report.pixelSize.height}
- Tile size: ${report.tileSize}
- Image plate: ${report.image ? `\`${report.image.source}\` (${report.image.width}x${report.image.height})` : "none"}

## Layers

| Layer | Type | Objects |
|---|---|---:|
${layerRows}

## Review Notes

${report.warnings.length ? report.warnings.map((warning) => `- ${warning}`).join("\n") : "- No scaffold warnings detected."}

## Next Commands

${report.nextCommands.map((command) => `- \`${command}\``).join("\n")}
`;
}

function parseArgs(rawArgs) {
  const parsed = { dryRun: false };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--force") parsed.force = true;
    else if (arg === "--id") parsed.id = rawArgs[++index];
    else if (arg === "--name") parsed.name = rawArgs[++index];
    else if (arg === "--image") parsed.image = rawArgs[++index];
    else if (arg === "--pixel-width") parsed.pixelWidth = rawArgs[++index];
    else if (arg === "--pixel-height") parsed.pixelHeight = rawArgs[++index];
    else if (arg === "--tile-size") parsed.tileSize = rawArgs[++index];
    else if (arg === "--output") parsed.output = rawArgs[++index];
  }
  return parsed;
}

function printUsage() {
  console.log(`Usage:
  node scripts/new-tiled-map.mjs --id <map-id> [--name <display-name>] [--image <png>] [--dry-run]

Examples:
  npm run maps:new -- --id manor-v2 --image incoming/maps/manor-v2.png --dry-run
  npm run maps:new -- --id manor-v2 --image incoming/maps/manor-v2.png
  npm run maps:new -- --id blank-playtest --pixel-width 1280 --pixel-height 736 --dry-run
`);
}

function titleize(value) {
  return String(value)
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "map";
}

function normalize(path) {
  return path.replaceAll("\\", "/");
}
