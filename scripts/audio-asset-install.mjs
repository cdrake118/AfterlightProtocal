import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = resolve(root, "assets", "audio", "audio-manifest.json");
const briefPath = resolve(root, "assets", "audio", "audio-briefs.json");
const distRoot = resolve(root, "dist", "assets", "audio-install");
const args = parseArgs(process.argv.slice(2));

if (args.help || !args.source || !args.slot) {
  printUsage();
  process.exit(args.help ? 0 : 1);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const briefSource = JSON.parse(await readFile(briefPath, "utf8"));
const entries = [
  ...Object.entries(manifest.music ?? {}).map(([id, entry]) => ({ id, type: "music", ...entry })),
  ...Object.entries(manifest.sfx ?? {}).map(([id, entry]) => ({ id, type: "sfx", ...entry }))
];
const slot = entries.find((entry) => entry.id === args.slot);
if (!slot) throw new Error(`audio manifest slot not found: ${args.slot}`);

const sourcePath = resolve(process.cwd(), args.source);
const sourceRel = normalize(relative(root, sourcePath));
const sourceInfo = await stat(sourcePath);
const sourceBytes = await readFile(sourcePath);
const target = args.target ?? slot.src;
const targetPath = resolve(root, target);
const fileFormat = detectAudioFormat(sourceBytes);
const brief = briefSource.briefs?.[slot.id] ?? {};
const errors = validateInstall({
  sourceInfo,
  sourceRel,
  target,
  slot,
  fileFormat
});
const plannedChanges = makePlannedChanges({ sourceRel, target, slot });
const report = await writeReport({
  dryRun: args.dryRun,
  slot,
  sourceRel,
  target,
  sourceBytes: sourceInfo.size,
  fileFormat,
  brief,
  plannedChanges,
  errors
});

if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (!args.dryRun) {
  await mkdir(dirname(targetPath), { recursive: true });
  if (normalize(sourcePath) !== normalize(targetPath)) {
    await copyFile(sourcePath, targetPath);
  }
  if (target !== slot.src) {
    await writeFile(manifestPath, `${JSON.stringify(updateManifest(manifest, slot, target), null, 2)}\n`);
  }
}

console.log(`audio asset install ${args.dryRun ? "dry-run" : "ok"}: ${slot.id}`);
console.log(`wrote ${relative(root, report.jsonPath)} and ${relative(root, report.markdownPath)}`);

function validateInstall({ sourceInfo, sourceRel, target, slot, fileFormat }) {
  const errors = [];
  const sourceExt = extname(sourceRel).toLowerCase();
  const targetExt = extname(target).toLowerCase();
  if (!sourceInfo.isFile()) errors.push("source must be a file");
  if (!target.startsWith("assets/audio/")) errors.push("target audio must live under assets/audio/");
  if (slot.type === "music" && !target.startsWith("assets/audio/music/")) {
    errors.push("music targets must live under assets/audio/music/");
  }
  if (slot.type === "sfx" && !target.startsWith("assets/audio/sfx/")) {
    errors.push("SFX targets must live under assets/audio/sfx/");
  }
  if (![".ogg", ".mp3"].includes(sourceExt)) errors.push("source must be exported as .ogg or .mp3 for browser runtime");
  if (![".ogg", ".mp3"].includes(targetExt)) errors.push("target must be .ogg or .mp3 for browser runtime");
  if (sourceExt !== targetExt) errors.push(`source extension ${sourceExt} must match target extension ${targetExt}`);
  if (sourceInfo.size <= 0) errors.push("source file is empty");
  if (sourceInfo.size < 1_000) errors.push("source file is extremely small; confirm this is not a placeholder export");
  if (sourceExt === ".ogg" && fileFormat !== "ogg") errors.push("source extension is .ogg but file header is not OggS");
  if (sourceExt === ".mp3" && fileFormat !== "mp3") errors.push("source extension is .mp3 but file header is not a recognized MP3 header");
  if (slot.loop && sourceInfo.size < 16_000) errors.push("looping audio file is very small; confirm the export is not truncated");
  return errors;
}

function makePlannedChanges({ sourceRel, target, slot }) {
  const changes = [
    `Copy ${sourceRel} to ${target}.`,
    `Fill runtime audio slot ${slot.id} on the ${slot.bus ?? slot.type} bus.`,
    "Keep browser synth sounds as fallback if this file fails to load."
  ];
  if (target !== slot.src) {
    changes.push(`Update assets/audio/audio-manifest.json so ${slot.id} points to ${target}.`);
  }
  changes.push("Run audio review and party readiness after install.");
  return changes;
}

function updateManifest(manifest, slot, target) {
  const section = slot.type === "music" ? "music" : "sfx";
  return {
    ...manifest,
    [section]: {
      ...(manifest[section] ?? {}),
      [slot.id]: {
        ...(manifest[section]?.[slot.id] ?? {}),
        src: target
      }
    }
  };
}

async function writeReport(data) {
  await mkdir(distRoot, { recursive: true });
  const slug = slugify(data.slot.id);
  const jsonPath = join(distRoot, `${slug}.install.json`);
  const markdownPath = join(distRoot, `${slug}.md`);
  const report = {
    app: "Afterlight Protocol",
    generatedAt: new Date().toISOString(),
    ...data,
    nextCommands: [
      "npm run audio:review",
      "npm run party:readiness"
    ]
  };
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownPath, makeMarkdown(report));
  return { jsonPath, markdownPath };
}

function makeMarkdown(report) {
  return `# Audio Asset Install Report

- Generated: ${report.generatedAt}
- Mode: ${report.dryRun ? "dry run" : "write"}
- Slot: \`${report.slot.id}\`
- Type: ${report.slot.type}
- Bus: ${report.slot.bus ?? report.slot.type}
- Loop: ${report.slot.loop ? "yes" : "no"}
- Source: \`${report.sourceRel}\`
- Target: \`${report.target}\`
- Size: ${Math.round(report.sourceBytes / 1024)} KB
- Detected format: ${report.fileFormat ?? "unknown"}

## Intent

${report.brief.intent ?? "No brief text found for this slot."}

## Planned Changes

${report.plannedChanges.map((change) => `- ${change}`).join("\n")}

## Validation

${report.errors.length ? report.errors.map((error) => `- ${error}`).join("\n") : "- No install errors detected."}

## Next Commands

${report.nextCommands.map((command) => `- \`${command}\``).join("\n")}
`;
}

function detectAudioFormat(buffer) {
  if (buffer.subarray(0, 4).toString("ascii") === "OggS") return "ogg";
  if (buffer.subarray(0, 3).toString("ascii") === "ID3") return "mp3";
  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return "mp3";
  return null;
}

function parseArgs(rawArgs) {
  const parsed = { source: null, dryRun: false };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--slot") parsed.slot = rawArgs[++index];
    else if (arg === "--target") parsed.target = rawArgs[++index];
    else if (!parsed.source) parsed.source = arg;
  }
  return parsed;
}

function printUsage() {
  console.log(`Usage:
  node scripts/audio-asset-install.mjs <audio-file> --slot <audio-slot-id> [--dry-run]

Examples:
  npm run audio:install -- incoming/audio/flashlight-on.ogg --slot flashlight_on --dry-run
  npm run audio:install -- incoming/audio/flashlight-on.ogg --slot flashlight_on
  npm run audio:install -- incoming/audio/menu-loop.mp3 --slot menu --target assets/audio/music/menu-loop.mp3 --dry-run
`);
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "audio";
}

function normalize(path) {
  return path.replaceAll("\\", "/");
}
