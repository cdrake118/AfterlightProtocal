import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = resolve(root, "assets", "maps", "map-art-manifest.json");
const distRoot = resolve(root, "dist", "maps");
const jsonPath = join(distRoot, "map-art-brief.json");
const markdownPath = join(distRoot, "map-art-brief.md");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const briefs = (manifest.maps ?? []).map((entry) => {
  const expected = entry.expectedSize ?? {};
  const direction = entry.direction || "Top-down game map background with clear rooms and original visual identity.";
  return {
    id: entry.id,
    status: entry.status,
    targetMap: entry.map,
    targetImage: entry.image || `assets/maps/${entry.id}.png`,
    expectedSize: {
      width: expected.width ?? 0,
      height: expected.height ?? 0
    },
    usage: entry.usage,
    prompt: makePrompt(entry, direction),
    negativePrompt: [
      "No copyrighted characters, franchise logos, trademarked objects, or recognizable proprietary layouts.",
      "No UI, text labels, arrows, health bars, or gameplay markers baked into the background art.",
      "No extreme darkness that hides collision-readable furniture or corridor boundaries.",
      "No perspective camera angle; keep it top-down enough for collision authoring.",
      "No cropped exterior margins; fill the exact requested canvas."
    ],
    handoffChecklist: [
      `Export exactly ${expected.width ?? 0}x${expected.height ?? 0}px as PNG.`,
      "Keep the map art as a flattened background plate; collision, spawns, batteries, and labels stay in Tiled object layers.",
      "Leave enough floor readability for flashlight cones, characters, and phone-party viewing on a TV.",
      "Import the PNG as a Tiled image layer underneath collision and gameplay object layers.",
      "Run npm run maps:art, npm run maps:preview, and npm run maps:validate after adding the image."
    ]
  };
});

const output = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  manifest: relative(root, manifestPath),
  briefs
};

await mkdir(distRoot, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(output));

console.log(`map art brief ok: ${briefs.length} briefs`);
console.log(`wrote ${relative(root, jsonPath)} and ${relative(root, markdownPath)}`);

function makePrompt(entry, direction) {
  const expected = entry.expectedSize ?? {};
  return [
    `Create an original top-down rendered background plate for Afterlight Protocol map ${entry.id}.`,
    direction,
    `Canvas size must be exactly ${expected.width ?? 0}x${expected.height ?? 0}px.`,
    "Design for a same-room party game shown on a TV: rooms, doorways, corridors, corners, and furniture silhouettes must be readable at a distance.",
    "Use a polished haunted-manor research-site mood with rich materials, practical lighting, and clear line-of-sight blockers.",
    "Leave collision decisions to Tiled object layers; the art should guide those layers without embedding gameplay UI.",
    "Keep the visual identity original and legally distinct from any existing Nintendo or Luigi's Mansion assets."
  ].join(" ");
}

function makeMarkdown(data) {
  const sections = data.briefs.map((brief) => `## ${brief.id}

- Status: ${brief.status}
- Target map: \`${brief.targetMap}\`
- Target image: \`${brief.targetImage}\`
- Expected size: ${brief.expectedSize.width}x${brief.expectedSize.height}
- Usage: ${brief.usage}

### Prompt

${brief.prompt}

### Negative Prompt

${brief.negativePrompt.map((item) => `- ${item}`).join("\n")}

### Handoff Checklist

${brief.handoffChecklist.map((item) => `- ${item}`).join("\n")}
`).join("\n");

  return `# Map Art Brief

- Generated: ${data.generatedAt}
- Manifest: \`${data.manifest}\`

${sections}
`;
}
