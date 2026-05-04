import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = resolve(root, "assets", "audio", "audio-manifest.json");
const briefPath = resolve(root, "assets", "audio", "audio-briefs.json");
const distRoot = resolve(root, "dist", "assets", "audio-production-pack");
const jsonPath = join(distRoot, "index.json");
const markdownPath = join(distRoot, "index.md");
const cueSheetPath = join(distRoot, "couch-party-cue-sheet.md");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const briefSource = JSON.parse(await readFile(briefPath, "utf8"));
const entries = [
  ...Object.entries(manifest.music ?? {}).map(([id, entry]) => ({ id, type: "music", ...entry })),
  ...Object.entries(manifest.sfx ?? {}).map(([id, entry]) => ({ id, type: "sfx", ...entry }))
];

const slots = entries.map((entry) => makeSlot(entry, briefSource.briefs?.[entry.id] ?? {}));
const output = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  manifest: relative(root, manifestPath),
  briefSource: relative(root, briefPath),
  summary: {
    totalSlots: slots.length,
    musicSlots: slots.filter((slot) => slot.type === "music").length,
    sfxSlots: slots.filter((slot) => slot.type === "sfx").length,
    loopSlots: slots.filter((slot) => slot.loop).length,
    oneShotSlots: slots.filter((slot) => !slot.loop).length
  },
  formatRequirements: briefSource.formatRequirements ?? {},
  mixTargets: makeMixTargets(briefSource),
  directoryPlan: makeDirectoryPlan(slots),
  auditionPlan: makeAuditionPlan(slots),
  slots
};

await mkdir(dirname(jsonPath), { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(output));
await writeFile(cueSheetPath, makeCueSheet(output));

console.log(`audio production pack ok: ${slots.length} slots`);
console.log(`wrote ${relative(root, jsonPath)}, ${relative(root, markdownPath)}, and ${relative(root, cueSheetPath)}`);

function makeSlot(entry, brief) {
  return {
    id: entry.id,
    type: entry.type,
    src: entry.src,
    bus: entry.bus ?? entry.type,
    loop: Boolean(entry.loop),
    intent: brief.intent ?? "Needs production direction.",
    durationSeconds: brief.durationSeconds ?? (entry.type === "music" ? "45-90" : "0.2-1.0"),
    prompt: brief.prompt ?? "",
    implementationNotes: brief.implementationNotes ?? "",
    acceptanceCriteria: makeAcceptanceCriteria(entry, brief),
    speakerChecks: [
      "Laptop speakers",
      "TV speakers over HDMI or AirPlay",
      "Phone speaker at normal controller distance"
    ]
  };
}

function makeAcceptanceCriteria(entry, brief) {
  const criteria = [
    `Final file exists at ${entry.src}.`,
    "Sound is original and legally clean: no recognizable franchise melody, character voice, sampled effect, or sound logo.",
    "Starts cleanly with no accidental silence, pop, or click.",
    "Remains readable when Master is 90%, Music is 72%, and SFX is 88%."
  ];
  if (entry.loop) {
    criteria.push("Loops seamlessly for at least three repeats without a click, timing gap, or obvious seam.");
  } else {
    criteria.push("Tail is trimmed so repeated gameplay triggers do not create clutter.");
  }
  if (entry.type === "music") {
    criteria.push("Leaves space for player voices, flashlight clicks, grab cues, and lightning without masking them.");
  } else {
    criteria.push("Reads clearly over round ambience and remains comfortable on TV speakers.");
  }
  if (brief.implementationNotes) {
    criteria.push(brief.implementationNotes);
  }
  return criteria;
}

function makeMixTargets(source) {
  const requirements = source.formatRequirements ?? {};
  return {
    preferredFormat: requirements.preferred ?? "ogg",
    fallbackFormat: requirements.fallback ?? "mp3",
    sampleRateHz: requirements.sampleRateHz ?? 48000,
    sourceBitDepth: requirements.bitDepth ?? 24,
    musicIntegratedLufs: requirements.loudness?.musicIntegratedLufs ?? "-18 to -16",
    sfxPeakDb: requirements.loudness?.sfxPeakDb ?? "-6 or lower",
    hierarchy: [
      "Player-critical SFX first: ghost_grab, ghost_shock, lightning, downed, revive.",
      "Frequent tool SFX second: flashlight_on, flashlight_off, pickup.",
      "Loops third: round, tension, ghost_damage, menu, lobby.",
      "Keep tension informative but imprecise; it should raise pressure without revealing exact ghost direction."
    ]
  };
}

function makeDirectoryPlan(slots) {
  return slots.map((slot) => ({
    id: slot.id,
    type: slot.type,
    target: slot.src,
    command: `npm run audio:candidate -- incoming/audio/${slot.id}.ogg --slot ${slot.id}`
  }));
}

function makeAuditionPlan(slots) {
  const priority = ["ghost_grab", "ghost_shock", "lightning", "downed", "revive", "flashlight_on", "flashlight_off", "pickup", "ghost_damage", "ghost_escape", "round", "tension", "lobby", "menu"];
  const byId = new Map(slots.map((slot) => [slot.id, slot]));
  return priority.filter((id) => byId.has(id)).map((id, index) => {
    const slot = byId.get(id);
    return {
      order: index + 1,
      id,
      type: slot.type,
      reason: auditionReason(id)
    };
  });
}

function auditionReason(id) {
  return {
    ghost_grab: "Most important round-state cue; confirms a catch to everyone.",
    ghost_shock: "Most important counterplay cue; confirms flashlight stun feedback.",
    lightning: "Global reveal cue; must feel dramatic without masking callouts.",
    downed: "Team awareness cue for rescue decisions.",
    revive: "Positive recovery cue; validates the revive loop.",
    flashlight_on: "Most frequent player tool cue.",
    flashlight_off: "Pairs with flashlight_on and supports battery conservation.",
    pickup: "Confirms battery economy without extra UI.",
    ghost_damage: "Loop must tolerate rapid fades while health drains.",
    ghost_escape: "Supports the smoke/runaway visual without adding new information.",
    round: "Base layer for the whole match.",
    tension: "Adaptive layer; must communicate danger, not direction.",
    lobby: "Sets the mood while phones join.",
    menu: "First impression for the host display."
  }[id] ?? "Required runtime slot.";
}

function makeMarkdown(data) {
  const targets = data.mixTargets;
  const directoryRows = data.directoryPlan.map((item) => `| \`${item.id}\` | ${item.type} | \`${item.target}\` | \`${item.command}\` |`).join("\n");
  const auditionRows = data.auditionPlan.map((item) => `| ${item.order} | \`${item.id}\` | ${item.type} | ${item.reason} |`).join("\n");
  const slotSections = data.slots.map((slot) => `## ${slot.id}

- Type: ${slot.type}
- Bus: ${slot.bus}
- Loop: ${slot.loop ? "yes" : "no"}
- Target: \`${slot.src}\`
- Target duration: ${slot.durationSeconds}

### Intent

${slot.intent}

### Acceptance Criteria

${slot.acceptanceCriteria.map((item) => `- ${item}`).join("\n")}

### Speaker Checks

${slot.speakerChecks.map((item) => `- ${item}`).join("\n")}
`).join("\n");

  return `# Audio Production Pack

- Generated: ${data.generatedAt}
- Manifest: \`${data.manifest}\`
- Brief source: \`${data.briefSource}\`
- Total slots: ${data.summary.totalSlots}
- Music slots: ${data.summary.musicSlots}
- SFX slots: ${data.summary.sfxSlots}

## Mix Targets

- Preferred runtime format: ${targets.preferredFormat}
- Fallback format: ${targets.fallbackFormat}
- Sample rate: ${targets.sampleRateHz} Hz
- Source bit depth: ${targets.sourceBitDepth}
- Music loudness: ${targets.musicIntegratedLufs} LUFS
- SFX peak: ${targets.sfxPeakDb} dB

${targets.hierarchy.map((item) => `- ${item}`).join("\n")}

## Directory Plan

| Slot | Type | Target | Candidate Command |
|---|---|---|---|
${directoryRows}

## Audition Order

| Order | Slot | Type | Why |
|---:|---|---|---|
${auditionRows}

${slotSections}
`;
}

function makeCueSheet(data) {
  const rows = data.auditionPlan.map((item) => {
    const slot = data.slots.find((candidate) => candidate.id === item.id);
    return `| ${item.order} | \`${item.id}\` | \`${slot.src}\` | ${slot.loop ? "loop" : "one-shot"} | ${item.reason} | | | | | | | |`;
  }).join("\n");
  return `# Couch Party Audio Cue Sheet

Use this sheet while testing on the actual party setup: laptop to TV over HDMI first, AirPlay as fallback, and one phone joined as a controller.

| Order | Slot | File | Mode | Listen For | Exists | Clean Start | Clean End/Loop | TV Readability | Phone Readability | Not Masking Voices | Notes |
|---:|---|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
${rows}
`;
}
