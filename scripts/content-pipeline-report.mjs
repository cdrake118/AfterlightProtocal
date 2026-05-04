import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const distRoot = resolve(root, "dist", "content");
const jsonPath = join(distRoot, "content-pipeline-report.json");
const markdownPath = join(distRoot, "content-pipeline-report.md");

const reports = {
  contentIntake: await readOptional("dist/content/content-intake-audit.json"),
  characterRuntimeManifest: await readOptional("assets/characters/runtime-character-manifest.json"),
  characterArt: await readOptional("dist/assets/art-asset-audit.json"),
  characterBriefs: await readOptional("dist/assets/character-art-brief.json"),
  characterAtlasHandoff: await readOptional("dist/assets/character-atlas-handoff/index.json"),
  characterAtlasPreviews: await readOptional("dist/assets/atlas-previews/index.json"),
  mapValidation: await readOptional("dist/maps/tiled-map-validation.json"),
  mapLayout: await readOptional("dist/maps/map-layout-audit.json"),
  mapArt: await readOptional("dist/maps/map-art-audit.json"),
  mapArtHandoff: await readOptional("dist/maps/map-art-handoff/index.json"),
  audioBriefs: await readOptional("dist/assets/audio-brief.json"),
  audio: await readOptional("dist/assets/audio-asset-audit.json")
};

const output = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  summary: {
    characterRuntimePngs: reports.characterArt?.summary?.productionReady ?? 0,
    characterPngsTotal: reports.characterArt?.summary?.totalPngs ?? 0,
    characterRuntimeAtlases: reports.characterRuntimeManifest?.runtimeAtlases?.length ?? 0,
    characterBriefs: reports.characterBriefs?.briefs?.length ?? 0,
    characterAtlasHandoffs: reports.characterAtlasHandoff?.summary?.total ?? 0,
    characterAtlasPreviews: reports.characterAtlasPreviews?.summary?.totalPreviews ?? 0,
    validMaps: reports.mapValidation?.summary?.validMaps ?? 0,
    totalMaps: reports.mapValidation?.summary?.totalMaps ?? 0,
    mapLayoutScore: reports.mapLayout?.summary?.averageScore ?? 0,
    mapLayoutWarnings: reports.mapLayout?.summary?.totalWarnings ?? 0,
    plannedMapArt: reports.mapArt?.summary?.planned ?? 0,
    readyMapArt: reports.mapArt?.summary?.ready ?? 0,
    mapArtHandoffs: reports.mapArtHandoff?.summary?.total ?? 0,
    audioBriefs: reports.audioBriefs?.summary?.totalSlots ?? 0,
    audioReady: reports.audio?.summary?.ready ?? 0,
    audioTotal: reports.audio?.summary?.totalSlots ?? 0,
    incomingCandidates: reports.contentIntake?.summary?.candidates ?? 0,
    incomingNeedsCleanup: reports.contentIntake?.summary?.needsCleanup ?? 0
  },
  risks: makeRisks(reports),
  nextActions: makeNextActions(reports),
  reports: Object.fromEntries(Object.entries(reports).map(([key, value]) => [key, Boolean(value)]))
};

await mkdir(distRoot, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(output));

console.log(`content pipeline report ok: ${output.risks.length} open risks`);
console.log(`wrote ${relative(root, jsonPath)} and ${relative(root, markdownPath)}`);

async function readOptional(path) {
  try {
    return JSON.parse(await readFile(resolve(root, path), "utf8"));
  } catch {
    return null;
  }
}

function makeRisks(data) {
  const risks = [];
  const intake = data.contentIntake?.summary;
  if (!intake) risks.push("Run npm run content:intake to classify newly dropped production files.");
  else if (intake.needsCleanup > 0) risks.push(`${intake.needsCleanup} incoming files need cleanup before they can enter production pipelines.`);

  const art = data.characterArt?.summary;
  if (!art) risks.push("Run npm run assets:review to generate character art audit data.");
  else if (art.productionReady < art.totalPngs) risks.push(`${art.totalPngs - art.productionReady} character PNGs are source/reference only or need transparent re-export.`);

  const atlasPreviews = data.characterAtlasPreviews?.summary;
  const atlasHandoff = data.characterAtlasHandoff?.summary;
  if (!atlasHandoff) risks.push("Run npm run assets:atlas-handoff to generate character atlas production guides.");

  if (!atlasPreviews) risks.push("Run npm run assets:atlas-preview to generate runtime atlas visual QA overlays.");
  else if (atlasPreviews.totalPreviews < (data.characterRuntimeManifest?.runtimeAtlases?.length ?? 0)) risks.push("Runtime atlas preview count is lower than the runtime manifest atlas count.");

  const maps = data.mapValidation?.summary;
  if (!maps) risks.push("Run npm run maps:review to generate map validation data.");
  else if (maps.errors > 0) risks.push(`${maps.errors} map validation errors need fixing before party testing.`);

  const mapLayout = data.mapLayout?.summary;
  if (!mapLayout) risks.push("Run npm run maps:layout to generate map design-quality data.");
  else if (mapLayout.totalWarnings > 0) risks.push(`${mapLayout.totalWarnings} map layout warnings need designer review before party testing.`);

  const mapArt = data.mapArt?.summary;
  const mapArtHandoff = data.mapArtHandoff?.summary;
  if (!mapArt) risks.push("Run npm run maps:art to generate map art audit data.");
  else if (mapArt.ready === 0 && mapArt.planned > 0) risks.push("Map background art is planned but no rendered map plate is ready yet.");

  if (!mapArtHandoff) risks.push("Run npm run maps:art-handoff to generate map paintover guides.");

  const audio = data.audio?.summary;
  const audioBriefs = data.audioBriefs?.summary;
  if (!audioBriefs) risks.push("Run npm run audio:brief to generate audio production handoff data.");
  else if (audioBriefs.missingBriefs > 0) risks.push(`${audioBriefs.missingBriefs} audio slots are missing production briefs.`);

  if (!audio) risks.push("Run npm run audio:audit to generate audio audit data.");
  else if (audio.missing > 0) risks.push(`${audio.missing} audio slots are still missing files.`);

  return risks;
}

function makeNextActions(data) {
  const actions = [];
  const art = data.characterArt?.summary;
  const intake = data.contentIntake?.summary;
  const runtimeAtlases = data.characterRuntimeManifest?.runtimeAtlases?.length ?? 0;
  const investigatorBrief = data.characterBriefs?.briefs?.find((brief) => brief.id === "investigator-production-atlas");
  const investigatorHandoff = data.characterAtlasHandoff?.handoffs?.find((handoff) => handoff.id === "investigator-production-atlas");
  const mapArt = data.mapArt?.summary;
  const mapArtHandoff = data.mapArtHandoff?.handoffs?.find((handoff) => handoff.id === "manor-party-render");
  const audio = data.audio?.summary;
  const maps = data.mapValidation?.summary;
  const mapLayout = data.mapLayout?.summary;

  if (intake && intake.candidates > 0) {
    actions.push({
      priority: "P0",
      area: "Content Intake",
      action: "Review incoming candidate files and intentionally promote or reject them before runtime use.",
      command: "npm run content:intake",
      doneWhen: "Every candidate has been moved into the correct pipeline or removed from incoming.",
      source: "dist/content/content-intake-audit.md"
    });
  }

  if (art && art.productionReady < 2) {
    actions.push({
      priority: "P0",
      area: "Character Art",
      action: "Produce one validated investigator runtime atlas so phone players no longer rely on source-only generated sheets.",
      command: "npm run assets:review",
      doneWhen: "The investigator PNG is transparent, has matching atlas JSON, appears in runtime-character-manifest.json, and atlas previews show clean feet/anchors.",
      source: investigatorHandoff?.markdown ?? investigatorBrief?.targetAtlas ?? "assets/characters/character-art-briefs.json"
    });
  } else if (runtimeAtlases < 2) {
    actions.push({
      priority: "P0",
      area: "Character Art",
      action: "Add the validated investigator atlas to the runtime manifest.",
      command: "npm run assets:review",
      doneWhen: "Runtime atlas count includes anomaly plus investigator.",
      source: "assets/characters/runtime-character-manifest.json"
    });
  }

  if (mapArt && mapArt.ready === 0 && mapArt.planned > 0) {
    actions.push({
      priority: "P0",
      area: "Map Art",
      action: "Render the Manor party-test background plate and wire it as a local Tiled image layer.",
      command: "npm run maps:review",
      doneWhen: "map-art audit reports one ready plate and the Tiled preview shows image art under collision/spawn overlays.",
      source: mapArtHandoff?.markdown ?? "assets/maps/map-art-manifest.json"
    });
  }

  if (audio && audio.missing > 0) {
    actions.push({
      priority: "P1",
      area: "Audio",
      action: "Fill the required music/SFX files from the audio production brief.",
      command: "npm run audio:review",
      doneWhen: "audio audit reports 14/14 runtime files ready.",
      source: "dist/assets/audio-brief.md"
    });
  }

  if (maps && maps.errors > 0) {
    actions.push({
      priority: "P0",
      area: "Map Editor",
      action: "Fix blocking Tiled map validation errors before party testing.",
      command: "npm run maps:validate",
      doneWhen: "map validation reports zero errors.",
      source: "dist/maps/tiled-map-validation.md"
    });
  }

  if (mapLayout && mapLayout.totalWarnings > 0) {
    actions.push({
      priority: "P1",
      area: "Map Design",
      action: "Review non-blocking map layout warnings for spawn spread, sightlines, battery access, and coverage.",
      command: "npm run maps:layout",
      doneWhen: "warnings are either fixed or accepted for playtest.",
      source: "dist/maps/map-layout-audit.md"
    });
  }

  if (!actions.length) {
    actions.push({
      priority: "P2",
      area: "Content QA",
      action: "Run one full party-build content review before packaging.",
      command: "npm run content:review",
      doneWhen: "content report has no P0 content blockers.",
      source: "dist/content/content-pipeline-report.md"
    });
  }

  return actions.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
}

function priorityRank(priority) {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[priority] ?? 99;
}

function makeMarkdown(data) {
  const risks = data.risks.length ? data.risks.map((risk) => `- ${risk}`).join("\n") : "- No open content-pipeline risks detected.";
  const actions = data.nextActions.map((action) => `| ${action.priority} | ${action.area} | ${action.action} | \`${action.command}\` | ${action.doneWhen} | \`${action.source}\` |`).join("\n");
  return `# Content Pipeline Report

- Generated: ${data.generatedAt}

## Readiness

| Area | Ready | Total |
|---|---:|---:|
| Character runtime PNGs | ${data.summary.characterRuntimePngs} | ${data.summary.characterPngsTotal} |
| Character art briefs | ${data.summary.characterBriefs} | ${data.summary.characterBriefs} |
| Character atlas handoffs | ${data.summary.characterAtlasHandoffs} | ${data.summary.characterBriefs} |
| Character atlas previews | ${data.summary.characterAtlasPreviews} | ${data.summary.characterRuntimeAtlases} |
| Valid Tiled maps | ${data.summary.validMaps} | ${data.summary.totalMaps} |
| Map layout score | ${data.summary.mapLayoutScore} | 100 |
| Ready map art | ${data.summary.readyMapArt} | ${data.summary.readyMapArt + data.summary.plannedMapArt} |
| Map art handoffs | ${data.summary.mapArtHandoffs} | ${data.summary.readyMapArt + data.summary.plannedMapArt} |
| Audio production briefs | ${data.summary.audioBriefs} | ${data.summary.audioTotal || data.summary.audioBriefs} |
| Audio files | ${data.summary.audioReady} | ${data.summary.audioTotal} |
| Incoming candidates | ${data.summary.incomingCandidates} | ${data.summary.incomingCandidates + data.summary.incomingNeedsCleanup} |

## Open Risks

${risks}

## Next Actions

| Priority | Area | Action | Command | Done When | Source |
|---|---|---|---|---|---|
${actions}

## Source Reports

| Report | Available |
|---|:---:|
${Object.entries(data.reports).map(([name, available]) => `| ${name} | ${available ? "yes" : "no"} |`).join("\n")}
`;
}
