import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const briefPath = resolve(root, "assets/characters/character-art-briefs.json");
const distRoot = resolve(root, "dist/assets/atlas-candidates");
const args = parseArgs(process.argv.slice(2));

if (args.help || !args.source) {
  printUsage();
  process.exit(args.help ? 0 : 1);
}

const sourcePath = resolve(process.cwd(), args.source);
const sourceRel = normalize(relative(root, sourcePath));
const briefSource = JSON.parse(await readFile(briefPath, "utf8"));
const brief = selectBrief(briefSource.briefs ?? [], args);
const png = parsePngHeader(await readFile(sourcePath));
const frame = {
  width: numberArg(args.frameWidth, brief?.frame?.width ?? 128),
  height: numberArg(args.frameHeight, brief?.frame?.height ?? 128)
};
const grid = {
  columns: numberArg(args.columns, Math.floor(png.width / frame.width)),
  rows: numberArg(args.rows, Math.floor(png.height / frame.height))
};
const id = args.id ?? brief?.id ?? basename(sourcePath, ".png");
const candidate = makeCandidate({ id, sourceRel, brief, frame, grid });
const errors = validateCandidate({ png, frame, grid });

await mkdir(distRoot, { recursive: true });
const slug = slugify(id);
const jsonPath = join(distRoot, `${slug}.atlas.json`);
const markdownPath = join(distRoot, `${slug}.md`);
const report = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  source: sourceRel,
  sourcePng: png,
  selectedBrief: brief?.id ?? null,
  candidate,
  errors,
  nextSteps: makeNextSteps(errors, jsonPath)
};

await writeFile(jsonPath, `${JSON.stringify(candidate, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(report, jsonPath));

const status = errors.length ? "needs cleanup" : "candidate ready";
console.log(`character atlas candidate ${status}: ${sourceRel} -> ${relative(root, jsonPath)}`);
console.log(`wrote ${relative(root, markdownPath)}`);
for (const error of errors) console.error(`- ${error}`);

if (errors.length) {
  process.exitCode = 1;
}

function makeCandidate({ id, sourceRel, brief, frame, grid }) {
  const directions = brief?.directions ?? ["south", "east", "north", "west"];
  const animations = {};
  for (const name of brief?.animations ?? ["idle"]) {
    animations[name] = {
      rows: directions.map((_, index) => index).filter((index) => index < grid.rows),
      frames: Array.from({ length: grid.columns }, (_, index) => index),
      fps: name === "idle" ? 8 : 10
    };
  }
  return {
    id,
    role: args.role ?? brief?.role ?? "investigator",
    image: sourceRel,
    frame,
    grid,
    anchor: brief?.anchor ?? { x: Math.round(frame.width / 2), y: Math.round(frame.height * 0.75) },
    safePadding: numberArg(args.safePadding, 8),
    directions,
    animations
  };
}

function validateCandidate({ png, frame, grid }) {
  const errors = [];
  if (!png.hasAlpha) errors.push("PNG must have alpha transparency before it can become a runtime atlas.");
  if (png.width !== frame.width * grid.columns) {
    errors.push(`PNG width ${png.width}px does not match frame/grid width ${frame.width * grid.columns}px.`);
  }
  if (png.height !== frame.height * grid.rows) {
    errors.push(`PNG height ${png.height}px does not match frame/grid height ${frame.height * grid.rows}px.`);
  }
  if (grid.columns <= 0 || grid.rows <= 0) {
    errors.push("Grid must have positive columns and rows.");
  }
  if (png.width % frame.width !== 0 || png.height % frame.height !== 0) {
    errors.push(`PNG dimensions must divide cleanly into ${frame.width}x${frame.height}px frames.`);
  }
  return errors;
}

function selectBrief(briefs, options) {
  if (options.brief) return briefs.find((entry) => entry.id === options.brief);
  if (options.role) return briefs.find((entry) => entry.role === options.role);
  if (options.id) return briefs.find((entry) => entry.id === options.id);
  return briefs.find((entry) => entry.role === "investigator") ?? briefs[0] ?? null;
}

function makeNextSteps(errors, jsonPath) {
  if (errors.length) {
    return [
      "Fix the source PNG in Aseprite or the export tool, then rerun this command.",
      "Use transparent background, fixed frame dimensions, stable feet/body anchors, and no cropped outer glow."
    ];
  }
  const rel = normalize(relative(root, jsonPath));
  return [
    `Run node scripts/validate-character-atlas.mjs ${rel}`,
    `Run node scripts/character-atlas-preview.mjs ${rel}`,
    "If visual QA is clean, move the PNG and atlas JSON into assets/characters and then add the atlas JSON to runtime-character-manifest.json."
  ];
}

function makeMarkdown(report, jsonPath) {
  return `# Character Atlas Candidate

- Generated: ${report.generatedAt}
- Source PNG: \`${report.source}\`
- Selected brief: ${report.selectedBrief ? `\`${report.selectedBrief}\`` : "none"}
- Candidate atlas: \`${normalize(relative(root, jsonPath))}\`
- Source size: ${report.sourcePng.width}x${report.sourcePng.height}
- Alpha: ${report.sourcePng.hasAlpha ? "yes" : "no"}

## Candidate Manifest

| Field | Value |
|---|---|
| ID | \`${report.candidate.id}\` |
| Role | ${report.candidate.role} |
| Frame | ${report.candidate.frame.width}x${report.candidate.frame.height} |
| Grid | ${report.candidate.grid.columns}x${report.candidate.grid.rows} |
| Anchor | ${report.candidate.anchor.x},${report.candidate.anchor.y} |
| Safe padding | ${report.candidate.safePadding}px |

## Validation

${report.errors.length ? report.errors.map((error) => `- ${error}`).join("\n") : "- No scaffold errors detected."}

## Next Steps

${report.nextSteps.map((step) => `- ${step}`).join("\n")}
`;
}

function parseArgs(rawArgs) {
  const parsed = { source: null };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--id") parsed.id = rawArgs[++index];
    else if (arg === "--role") parsed.role = rawArgs[++index];
    else if (arg === "--brief") parsed.brief = rawArgs[++index];
    else if (arg === "--frame-width") parsed.frameWidth = rawArgs[++index];
    else if (arg === "--frame-height") parsed.frameHeight = rawArgs[++index];
    else if (arg === "--columns") parsed.columns = rawArgs[++index];
    else if (arg === "--rows") parsed.rows = rawArgs[++index];
    else if (arg === "--safe-padding") parsed.safePadding = rawArgs[++index];
    else if (!parsed.source) parsed.source = arg;
  }
  return parsed;
}

function printUsage() {
  console.log(`Usage:
  node scripts/character-atlas-candidate.mjs <png> [--id id] [--role investigator] [--brief investigator-production-atlas]

Examples:
  npm run assets:atlas-candidate -- incoming/characters/investigator-clean.png --id investigator-production-atlas --role investigator
  node scripts/character-atlas-candidate.mjs incoming/characters/investigator-clean.png --frame-width 128 --frame-height 128
`);
}

function numberArg(value, fallback) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
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
