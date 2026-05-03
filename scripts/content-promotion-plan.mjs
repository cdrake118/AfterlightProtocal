import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const distRoot = resolve(root, "dist", "content");
const jsonPath = join(distRoot, "content-promotion-plan.json");
const markdownPath = join(distRoot, "content-promotion-plan.md");

const candidates = {
  characters: await readCandidateFiles("dist/assets/atlas-candidates", ".atlas.json"),
  mapArt: await readCandidateFiles("dist/maps/map-art-candidates", ".map-art-candidate.json"),
  audio: await readCandidateFiles("dist/assets/audio-candidates", ".json")
};

const plan = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  purpose: "Promotion checklist for approved incoming assets. This plan does not move files or edit manifests.",
  summary: {
    characterCandidates: candidates.characters.length,
    mapArtCandidates: candidates.mapArt.length,
    audioCandidates: candidates.audio.length
  },
  workflows: makeWorkflows(candidates)
};

await mkdir(distRoot, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(plan, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(plan));

console.log(`content promotion plan ok: ${totalCandidates(candidates)} candidates referenced`);
console.log(`wrote ${relative(root, jsonPath)} and ${relative(root, markdownPath)}`);

async function readCandidateFiles(dir, suffix) {
  const absoluteDir = resolve(root, dir);
  let files = [];
  try {
    files = await readdir(absoluteDir);
  } catch {
    return [];
  }
  const candidates = [];
  for (const file of files.filter((item) => item.endsWith(suffix) && !item.includes("smoke")).sort()) {
    const path = join(absoluteDir, file);
    try {
      const data = JSON.parse(await readFile(path, "utf8"));
      const candidate = {
        file: relative(root, path),
        id: data.candidate?.id ?? data.candidate?.slot ?? data.selectedSlot ?? basename(file, suffix),
        source: data.source ?? data.candidate?.source ?? data.candidate?.image ?? "",
        target: data.candidate?.target ?? data.candidate?.image ?? data.candidate?.map ?? "",
        warnings: data.warnings ?? data.errors ?? []
      };
      if (candidate.source.startsWith("incoming/")) {
        candidates.push(candidate);
      }
    } catch {
      candidates.push({
        file: relative(root, path),
        id: basename(file, suffix),
        source: "",
        target: "",
        warnings: ["Candidate JSON could not be parsed."]
      });
    }
  }
  return candidates;
}

function makeWorkflows(data) {
  return [
    {
      area: "Character Atlas",
      command: "npm run assets:atlas-candidate -- incoming/characters/investigator-clean.png --id investigator-production-atlas --role investigator",
      candidates: data.characters,
      checklist: [
        "Confirm the source PNG is transparent and uses fixed 128x128 frames.",
        "Run the generated candidate through `node scripts/validate-character-atlas.mjs <candidate-atlas>`.",
        "Run `node scripts/character-atlas-preview.mjs <candidate-atlas>` and inspect the SVG for clean feet, stable anchors, and safe padding.",
        "Move the approved PNG and atlas JSON into `assets/characters/`.",
        "Add the atlas JSON path to `assets/characters/runtime-character-manifest.json`.",
        "Run `npm run assets:review` and confirm the runtime audit counts the new atlas as ready."
      ]
    },
    {
      area: "Map Art",
      command: "npm run maps:art-candidate -- incoming/maps/manor-party-render.png --map-id manor-party-render",
      candidates: data.mapArt,
      checklist: [
        "Confirm the rendered PNG matches the Tiled map pixel bounds.",
        "Move the approved PNG into `assets/maps/`.",
        "Copy the candidate manifest entry into `assets/maps/map-art-manifest.json` with `status: \"ready\"` and the final image path.",
        "Add the PNG as a local image layer in the Tiled map.",
        "Run `npm run maps:review` and confirm the SVG preview shows the art under collision/spawn overlays."
      ]
    },
    {
      area: "Audio",
      command: "npm run audio:candidate -- incoming/audio/flashlight-on.ogg --slot flashlight_on",
      candidates: data.audio,
      checklist: [
        "Confirm the file is OGG or MP3 and matches the intended manifest slot.",
        "Move the approved file to the exact target path in `assets/audio/audio-manifest.json`.",
        "Run `npm run audio:review` and confirm the slot changes from missing to ready.",
        "Playtest in browser after a menu click so Web Audio is unlocked.",
        "Check Master/Music/SFX volume behavior for the new asset."
      ]
    }
  ];
}

function makeMarkdown(data) {
  const sections = data.workflows.map((workflow) => `## ${workflow.area}

Candidate command:

\`\`\`sh
${workflow.command}
\`\`\`

### Current Candidates

${candidateTable(workflow.candidates)}

### Promotion Checklist

${workflow.checklist.map((item) => `- ${item}`).join("\n")}
`).join("\n");

  return `# Content Promotion Plan

- Generated: ${data.generatedAt}
- Character candidates: ${data.summary.characterCandidates}
- Map art candidates: ${data.summary.mapArtCandidates}
- Audio candidates: ${data.summary.audioCandidates}

${data.purpose}

${sections}
`;
}

function candidateTable(candidates) {
  if (!candidates.length) {
    return "No candidate reports found yet. Generate one with the command above after placing a file in `incoming/`.";
  }
  const rows = candidates.map((candidate) => `| \`${candidate.id}\` | \`${candidate.file}\` | \`${candidate.source || "-"}\` | \`${candidate.target || "-"}\` | ${candidate.warnings.length ? candidate.warnings.join(" ") : "none"} |`).join("\n");
  return `| ID | Candidate Report | Source | Target | Warnings |
|---|---|---|---|---|
${rows}`;
}

function totalCandidates(data) {
  return data.characters.length + data.mapArt.length + data.audio.length;
}
