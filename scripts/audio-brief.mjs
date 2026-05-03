import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = resolve(root, "assets/audio/audio-manifest.json");
const briefPath = resolve(root, "assets/audio/audio-briefs.json");
const distRoot = resolve(root, "dist/assets");
const jsonPath = resolve(distRoot, "audio-brief.json");
const markdownPath = resolve(distRoot, "audio-brief.md");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const source = JSON.parse(await readFile(briefPath, "utf8"));
const manifestEntries = [
  ...Object.entries(manifest.music ?? {}).map(([id, entry]) => ({ id, type: "music", ...entry })),
  ...Object.entries(manifest.sfx ?? {}).map(([id, entry]) => ({ id, type: "sfx", ...entry }))
];
const briefEntries = source.briefs ?? {};
const manifestIds = new Set(manifestEntries.map((entry) => entry.id));
const briefIds = new Set(Object.keys(briefEntries));
const missingBriefs = manifestEntries.filter((entry) => !briefIds.has(entry.id)).map((entry) => entry.id);
const unusedBriefs = [...briefIds].filter((id) => !manifestIds.has(id));
const briefs = manifestEntries.map((entry) => makeBrief(entry, briefEntries[entry.id] ?? {}, source));

const output = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  manifest: relative(root, manifestPath),
  source: relative(root, briefPath),
  summary: {
    totalSlots: briefs.length,
    musicSlots: briefs.filter((brief) => brief.type === "music").length,
    sfxSlots: briefs.filter((brief) => brief.type === "sfx").length,
    missingBriefs: missingBriefs.length,
    unusedBriefs: unusedBriefs.length
  },
  formatRequirements: source.formatRequirements ?? {},
  globalDirection: source.globalDirection ?? [],
  missingBriefs,
  unusedBriefs,
  briefs
};

await mkdir(dirname(jsonPath), { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(output));

console.log(`audio brief ok: ${briefs.length} slots, ${missingBriefs.length} missing briefs`);
console.log(`wrote ${relative(root, jsonPath)} and ${relative(root, markdownPath)}`);

if (missingBriefs.length > 0) {
  process.exitCode = 1;
}

function makeBrief(entry, brief, source) {
  const fileExt = entry.src?.split(".").pop() ?? source.formatRequirements?.preferred ?? "ogg";
  return {
    id: entry.id,
    type: entry.type,
    src: entry.src,
    bus: entry.bus ?? entry.type,
    loop: Boolean(entry.loop),
    preferredFormat: fileExt,
    intent: brief.intent ?? "Needs production direction.",
    durationSeconds: brief.durationSeconds ?? (entry.type === "music" ? "45-90" : "0.2-1.0"),
    prompt: brief.prompt ?? "",
    implementationNotes: brief.implementationNotes ?? "",
    deliveryChecklist: makeDeliveryChecklist(entry, source)
  };
}

function makeDeliveryChecklist(entry, source) {
  const requirements = source.formatRequirements ?? {};
  const format = entry.src?.split(".").pop() ?? requirements.preferred ?? "ogg";
  const loopRule = entry.loop ? "Verify the file loops cleanly with no click, pop, or timing gap." : "Trim the file start tightly and avoid unnecessary silence at the tail.";
  return [
    `Export final asset to ${entry.src}.`,
    `Deliver ${format.toUpperCase()} at ${requirements.sampleRateHz ?? 48000} Hz and ${requirements.bitDepth ?? 24}-bit source quality before encoding.`,
    loopRule,
    "Keep the sound original and legally clean: no sampled franchise audio, melodies, voices, or recognizable sound marks.",
    "Check on laptop speakers, TV speakers, and phone speakers before marking ready.",
    "Run npm run audio:review after placing the file."
  ];
}

function makeMarkdown(data) {
  const format = data.formatRequirements;
  const globalDirection = data.globalDirection.map((item) => `- ${item}`).join("\n");
  const missing = data.missingBriefs.length ? data.missingBriefs.map((id) => `- \`${id}\``).join("\n") : "- None";
  const unused = data.unusedBriefs.length ? data.unusedBriefs.map((id) => `- \`${id}\``).join("\n") : "- None";
  const sections = data.briefs.map((brief) => `## ${brief.id}

- Type: ${brief.type}
- Source: \`${brief.src}\`
- Bus: ${brief.bus}
- Loop: ${brief.loop ? "yes" : "no"}
- Target duration: ${brief.durationSeconds}

### Intent

${brief.intent}

### Production Prompt

${brief.prompt}

### Implementation Notes

${brief.implementationNotes}

### Delivery Checklist

${brief.deliveryChecklist.map((item) => `- ${item}`).join("\n")}
`).join("\n");

  return `# Audio Production Brief

- Generated: ${data.generatedAt}
- Manifest: \`${data.manifest}\`
- Source: \`${data.source}\`
- Total slots: ${data.summary.totalSlots}
- Music slots: ${data.summary.musicSlots}
- SFX slots: ${data.summary.sfxSlots}

## Format Requirements

- Preferred runtime format: ${format.preferred ?? "ogg"}
- Fallback format: ${format.fallback ?? "mp3"}
- Sample rate: ${format.sampleRateHz ?? 48000} Hz
- Source bit depth: ${format.bitDepth ?? 24}
- Music loudness: ${format.loudness?.musicIntegratedLufs ?? "TBD"} LUFS
- SFX peak: ${format.loudness?.sfxPeakDb ?? "TBD"} dB

## Global Direction

${globalDirection}

## Coverage

Missing manifest briefs:

${missing}

Unused briefs:

${unused}

${sections}
`;
}
