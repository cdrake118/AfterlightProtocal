import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = resolve(root, "assets/maps/map-art-manifest.json");
const distRoot = resolve(root, "dist/maps/map-art-candidates");
const args = parseArgs(process.argv.slice(2));

if (args.help || !args.source) {
  printUsage();
  process.exit(args.help ? 0 : 1);
}

const sourcePath = resolve(process.cwd(), args.source);
const sourceRel = normalize(relative(root, sourcePath));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const target = selectTarget(manifest.maps ?? [], args);
const png = parsePngHeader(await readFile(sourcePath));
const expectedSize = {
  width: numberArg(args.expectedWidth, target?.expectedSize?.width ?? png.width),
  height: numberArg(args.expectedHeight, target?.expectedSize?.height ?? png.height)
};
const id = args.id ?? target?.id ?? basename(sourcePath, ".png");
const candidate = makeCandidate({ id, sourceRel, target, expectedSize });
const warnings = validateCandidate({ png, expectedSize, sourceRel });

await mkdir(distRoot, { recursive: true });
const slug = slugify(id);
const jsonPath = join(distRoot, `${slug}.map-art-candidate.json`);
const markdownPath = join(distRoot, `${slug}.md`);
const report = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  source: sourceRel,
  selectedTarget: target?.id ?? null,
  sourcePng: png,
  candidate,
  warnings,
  nextSteps: makeNextSteps(warnings)
};

await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(report, jsonPath));

const status = warnings.length ? "needs review" : "candidate ready";
console.log(`map art candidate ${status}: ${sourceRel} -> ${relative(root, jsonPath)}`);
console.log(`wrote ${relative(root, markdownPath)}`);
for (const warning of warnings) console.warn(`- ${warning}`);

function makeCandidate({ id, sourceRel, target, expectedSize }) {
  return {
    id,
    status: "ready",
    map: target?.map ?? "assets/maps/manor-party.tiled.json",
    expectedSize,
    image: sourceRel,
    usage: target?.usage ?? "Tiled image layer background",
    direction: target?.direction ?? ""
  };
}

function validateCandidate({ png, expectedSize, sourceRel }) {
  const warnings = [];
  if (!sourceRel.startsWith("incoming/maps/") && !sourceRel.startsWith("assets/maps/")) {
    warnings.push("Map art candidates should usually start in incoming/maps/ or assets/maps/.");
  }
  if (png.width !== expectedSize.width || png.height !== expectedSize.height) {
    warnings.push(`PNG size ${png.width}x${png.height} does not match expected ${expectedSize.width}x${expectedSize.height}.`);
  }
  if (png.colorType !== 2 && png.colorType !== 6) {
    warnings.push("Use RGB or RGBA PNG export for broad browser/tool compatibility.");
  }
  return warnings;
}

function selectTarget(entries, options) {
  if (options.mapId) return entries.find((entry) => entry.id === options.mapId);
  if (options.map) return entries.find((entry) => entry.map === options.map);
  return entries[0] ?? null;
}

function makeNextSteps(warnings) {
  if (warnings.length) {
    return [
      "Fix the rendered plate dimensions/export settings or choose the correct target map, then rerun this command.",
      "Keep the rendered plate aligned to the Tiled map pixel bounds before adding it to the map art manifest."
    ];
  }
  return [
    "Move the approved PNG from incoming/maps/ to assets/maps/.",
    "Copy the candidate entry into assets/maps/map-art-manifest.json with status ready and the final assets/maps/ image path.",
    "Add the PNG as a local image layer in the Tiled map.",
    "Run npm run maps:review and confirm the preview shows art under collision/spawn overlays."
  ];
}

function makeMarkdown(report, jsonPath) {
  return `# Map Art Candidate

- Generated: ${report.generatedAt}
- Source PNG: \`${report.source}\`
- Selected target: ${report.selectedTarget ? `\`${report.selectedTarget}\`` : "none"}
- Candidate report: \`${normalize(relative(root, jsonPath))}\`
- Source size: ${report.sourcePng.width}x${report.sourcePng.height}

## Candidate Manifest Entry

\`\`\`json
${JSON.stringify(report.candidate, null, 2)}
\`\`\`

## Review

${report.warnings.length ? report.warnings.map((warning) => `- ${warning}`).join("\n") : "- No candidate warnings detected."}

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
    else if (arg === "--map-id") parsed.mapId = rawArgs[++index];
    else if (arg === "--map") parsed.map = rawArgs[++index];
    else if (arg === "--expected-width") parsed.expectedWidth = rawArgs[++index];
    else if (arg === "--expected-height") parsed.expectedHeight = rawArgs[++index];
    else if (!parsed.source) parsed.source = arg;
  }
  return parsed;
}

function printUsage() {
  console.log(`Usage:
  node scripts/map-art-candidate.mjs <png> [--map-id manor-party-render]

Examples:
  npm run maps:art-candidate -- incoming/maps/manor-party-render.png --map-id manor-party-render
  node scripts/map-art-candidate.mjs incoming/maps/manor-party-render.png --expected-width 1280 --expected-height 736
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
