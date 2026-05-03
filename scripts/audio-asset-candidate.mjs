import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = resolve(root, "assets/audio/audio-manifest.json");
const briefPath = resolve(root, "assets/audio/audio-briefs.json");
const distRoot = resolve(root, "dist/assets/audio-candidates");
const args = parseArgs(process.argv.slice(2));

if (args.help || !args.source) {
  printUsage();
  process.exit(args.help ? 0 : 1);
}

const sourcePath = resolve(process.cwd(), args.source);
const sourceRel = normalize(relative(root, sourcePath));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const briefSource = JSON.parse(await readFile(briefPath, "utf8"));
const entries = [
  ...Object.entries(manifest.music ?? {}).map(([id, entry]) => ({ id, type: "music", ...entry })),
  ...Object.entries(manifest.sfx ?? {}).map(([id, entry]) => ({ id, type: "sfx", ...entry }))
];
const slot = selectSlot(entries, args);
const sourceInfo = await stat(sourcePath);
const candidate = makeCandidate({ sourceRel, sourceInfo, slot, briefSource });
const warnings = validateCandidate(candidate);

await mkdir(distRoot, { recursive: true });
const slug = slugify(`${slot?.id ?? basename(sourcePath, extname(sourcePath))}-audio-candidate`);
const jsonPath = join(distRoot, `${slug}.json`);
const markdownPath = join(distRoot, `${slug}.md`);
const report = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  source: sourceRel,
  selectedSlot: slot?.id ?? null,
  candidate,
  warnings,
  nextSteps: makeNextSteps(candidate, warnings)
};

await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(report, jsonPath));

const status = warnings.length ? "needs review" : "candidate ready";
console.log(`audio asset candidate ${status}: ${sourceRel} -> ${relative(root, jsonPath)}`);
console.log(`wrote ${relative(root, markdownPath)}`);
for (const warning of warnings) console.warn(`- ${warning}`);

function makeCandidate({ sourceRel, sourceInfo, slot, briefSource }) {
  const ext = extname(sourceRel).toLowerCase();
  const brief = slot ? briefSource.briefs?.[slot.id] : null;
  return {
    source: sourceRel,
    bytes: sourceInfo.size,
    extension: ext,
    slot: slot?.id ?? null,
    type: slot?.type ?? null,
    bus: slot?.bus ?? slot?.type ?? null,
    loop: Boolean(slot?.loop),
    target: slot?.src ?? null,
    intent: brief?.intent ?? "",
    runtimeFormat: [".ogg", ".mp3"].includes(ext),
    sourceFormat: [".wav", ".flac", ".aiff", ".aif", ".m4a"].includes(ext)
  };
}

function validateCandidate(candidate) {
  const warnings = [];
  if (!candidate.slot) {
    warnings.push("No audio manifest slot selected; pass --slot <id>.");
  }
  if (!candidate.source.startsWith("incoming/audio/") && !candidate.source.startsWith("assets/audio/")) {
    warnings.push("Audio candidates should usually start in incoming/audio/ or assets/audio/.");
  }
  if (!candidate.runtimeFormat) {
    warnings.push("Runtime browser audio should be exported as OGG or MP3.");
  }
  if (candidate.target && extname(candidate.target).toLowerCase() !== candidate.extension && candidate.runtimeFormat) {
    warnings.push(`Source extension ${candidate.extension} differs from manifest target ${extname(candidate.target).toLowerCase()}.`);
  }
  if (candidate.loop && candidate.bytes < 16_000) {
    warnings.push("Looping music/SFX file is very small; confirm this is not a placeholder or truncated export.");
  }
  if (!candidate.loop && candidate.bytes < 1_000) {
    warnings.push("One-shot SFX file is extremely small; confirm this is a real export.");
  }
  return warnings;
}

function selectSlot(entries, options) {
  if (options.slot) return entries.find((entry) => entry.id === options.slot);
  const fileBase = basename(options.source, extname(options.source)).toLowerCase();
  return entries.find((entry) => basename(entry.src, extname(entry.src)).toLowerCase() === fileBase)
    ?? entries.find((entry) => entry.id.toLowerCase() === fileBase)
    ?? null;
}

function makeNextSteps(candidate, warnings) {
  if (warnings.some((warning) => warning.includes("No audio manifest slot") || warning.includes("OGG or MP3"))) {
    return [
      "Export the source as OGG or MP3 and match it to a slot in assets/audio/audio-manifest.json.",
      "Rerun this command with --slot <id> before moving the file into runtime."
    ];
  }
  return [
    `Move or copy the approved file to ${candidate.target}.`,
    "Run npm run audio:review.",
    "Playtest in browser after a menu click so Web Audio is unlocked, then check Master/Music/SFX volume behavior."
  ];
}

function makeMarkdown(report, jsonPath) {
  const candidate = report.candidate;
  return `# Audio Asset Candidate

- Generated: ${report.generatedAt}
- Source: \`${report.source}\`
- Selected slot: ${report.selectedSlot ? `\`${report.selectedSlot}\`` : "none"}
- Candidate report: \`${normalize(relative(root, jsonPath))}\`
- Size: ${candidate.bytes} bytes

## Manifest Match

| Field | Value |
|---|---|
| Slot | ${candidate.slot ? `\`${candidate.slot}\`` : "-"} |
| Type | ${candidate.type ?? "-"} |
| Bus | ${candidate.bus ?? "-"} |
| Loop | ${candidate.loop ? "yes" : "no"} |
| Target | ${candidate.target ? `\`${candidate.target}\`` : "-"} |
| Intent | ${candidate.intent || "-"} |

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
    else if (arg === "--slot") parsed.slot = rawArgs[++index];
    else if (!parsed.source) parsed.source = arg;
  }
  return parsed;
}

function printUsage() {
  console.log(`Usage:
  node scripts/audio-asset-candidate.mjs <audio-file> --slot <audio-slot-id>

Examples:
  npm run audio:candidate -- incoming/audio/flashlight-on.ogg --slot flashlight_on
  node scripts/audio-asset-candidate.mjs incoming/audio/menu-loop.ogg --slot menu
`);
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "audio-candidate";
}

function normalize(path) {
  return path.replaceAll("\\", "/");
}
