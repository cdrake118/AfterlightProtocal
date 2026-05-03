import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const distRoot = resolve(root, "dist", "content");
const jsonPath = join(distRoot, "content-pipeline-report.json");
const markdownPath = join(distRoot, "content-pipeline-report.md");

const reports = {
  characterArt: await readOptional("dist/assets/art-asset-audit.json"),
  characterBriefs: await readOptional("dist/assets/character-art-brief.json"),
  mapValidation: await readOptional("dist/maps/tiled-map-validation.json"),
  mapArt: await readOptional("dist/maps/map-art-audit.json"),
  audioBriefs: await readOptional("dist/assets/audio-brief.json"),
  audio: await readOptional("dist/assets/audio-asset-audit.json")
};

const output = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  summary: {
    characterRuntimePngs: reports.characterArt?.summary?.productionReady ?? 0,
    characterPngsTotal: reports.characterArt?.summary?.totalPngs ?? 0,
    characterBriefs: reports.characterBriefs?.briefs?.length ?? 0,
    validMaps: reports.mapValidation?.summary?.validMaps ?? 0,
    totalMaps: reports.mapValidation?.summary?.totalMaps ?? 0,
    plannedMapArt: reports.mapArt?.summary?.planned ?? 0,
    readyMapArt: reports.mapArt?.summary?.ready ?? 0,
    audioBriefs: reports.audioBriefs?.summary?.totalSlots ?? 0,
    audioReady: reports.audio?.summary?.ready ?? 0,
    audioTotal: reports.audio?.summary?.totalSlots ?? 0
  },
  risks: makeRisks(reports),
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
  const art = data.characterArt?.summary;
  if (!art) risks.push("Run npm run assets:review to generate character art audit data.");
  else if (art.productionReady < art.totalPngs) risks.push(`${art.totalPngs - art.productionReady} character PNGs are source/reference only or need transparent re-export.`);

  const maps = data.mapValidation?.summary;
  if (!maps) risks.push("Run npm run maps:review to generate map validation data.");
  else if (maps.errors > 0) risks.push(`${maps.errors} map validation errors need fixing before party testing.`);

  const mapArt = data.mapArt?.summary;
  if (!mapArt) risks.push("Run npm run maps:art to generate map art audit data.");
  else if (mapArt.ready === 0 && mapArt.planned > 0) risks.push("Map background art is planned but no rendered map plate is ready yet.");

  const audio = data.audio?.summary;
  const audioBriefs = data.audioBriefs?.summary;
  if (!audioBriefs) risks.push("Run npm run audio:brief to generate audio production handoff data.");
  else if (audioBriefs.missingBriefs > 0) risks.push(`${audioBriefs.missingBriefs} audio slots are missing production briefs.`);

  if (!audio) risks.push("Run npm run audio:audit to generate audio audit data.");
  else if (audio.missing > 0) risks.push(`${audio.missing} audio slots are still missing files.`);

  return risks;
}

function makeMarkdown(data) {
  const risks = data.risks.length ? data.risks.map((risk) => `- ${risk}`).join("\n") : "- No open content-pipeline risks detected.";
  return `# Content Pipeline Report

- Generated: ${data.generatedAt}

## Readiness

| Area | Ready | Total |
|---|---:|---:|
| Character runtime PNGs | ${data.summary.characterRuntimePngs} | ${data.summary.characterPngsTotal} |
| Character art briefs | ${data.summary.characterBriefs} | ${data.summary.characterBriefs} |
| Valid Tiled maps | ${data.summary.validMaps} | ${data.summary.totalMaps} |
| Ready map art | ${data.summary.readyMapArt} | ${data.summary.readyMapArt + data.summary.plannedMapArt} |
| Audio production briefs | ${data.summary.audioBriefs} | ${data.summary.audioTotal || data.summary.audioBriefs} |
| Audio files | ${data.summary.audioReady} | ${data.summary.audioTotal} |

## Open Risks

${risks}

## Source Reports

| Report | Available |
|---|:---:|
${Object.entries(data.reports).map(([name, available]) => `| ${name} | ${available ? "yes" : "no"} |`).join("\n")}
`;
}
