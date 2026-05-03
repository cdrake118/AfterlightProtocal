import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const briefPath = resolve(root, "assets", "characters", "character-art-briefs.json");
const runtimeManifestPath = resolve(root, "assets", "characters", "runtime-character-manifest.json");
const distRoot = resolve(root, "dist", "assets");
const jsonPath = join(distRoot, "character-art-brief.json");
const markdownPath = join(distRoot, "character-art-brief.md");

const briefSource = JSON.parse(await readFile(briefPath, "utf8"));
const runtimeManifest = JSON.parse(await readFile(runtimeManifestPath, "utf8"));
const runtimeAtlases = new Set(runtimeManifest.runtimeAtlases ?? []);
const briefs = (briefSource.briefs ?? []).map((entry) => makeBrief(entry, runtimeAtlases));

const output = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  source: relative(root, briefPath),
  runtimeManifest: relative(root, runtimeManifestPath),
  briefs
};

await mkdir(distRoot, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(output));

console.log(`character art brief ok: ${briefs.length} briefs`);
console.log(`wrote ${relative(root, jsonPath)} and ${relative(root, markdownPath)}`);

function makeBrief(entry, runtimeAtlases) {
  const frame = entry.frame ?? {};
  const grid = entry.grid ?? {};
  const anchor = entry.anchor ?? {};
  const atlasIsRuntime = runtimeAtlases.has(entry.targetAtlas);
  return {
    id: entry.id,
    role: entry.role,
    status: entry.status,
    targetAtlas: entry.targetAtlas,
    targetImage: entry.targetImage,
    atlasIsRuntime,
    canvasSize: {
      width: (frame.width ?? 0) * (grid.columns ?? 0),
      height: (frame.height ?? 0) * (grid.rows ?? 0)
    },
    frame,
    grid,
    anchor,
    directions: entry.directions ?? [],
    animations: entry.animations ?? [],
    prompt: makePrompt(entry),
    negativePrompt: [
      "No copyrighted characters, franchise costumes, logos, proprietary props, or recognizable existing game silhouettes.",
      "No white, gray, checkerboard, or baked background; export transparent PNG only.",
      "No cropped feet, backpacks, hair, flashlight cones, or outer glow at frame edges.",
      "No inconsistent frame sizes, drifting anchors, or irregular grid spacing.",
      "No baked UI labels, nameplates, health bars, or button prompts."
    ],
    handoffChecklist: [
      `Export a transparent PNG at ${(frame.width ?? 0) * (grid.columns ?? 0)}x${(frame.height ?? 0) * (grid.rows ?? 0)}px.`,
      `Each frame must be exactly ${frame.width ?? 0}x${frame.height ?? 0}px.`,
      `Keep the foot/body anchor stable at ${anchor.x ?? 0},${anchor.y ?? 0} in every frame.`,
      "Leave at least 8px transparent safe padding around the visible sprite and glow.",
      "Export matching atlas JSON before adding it to runtime-character-manifest.json.",
      "Run npm run assets:validate and npm run assets:audit before runtime integration."
    ]
  };
}

function makePrompt(entry) {
  const frame = entry.frame ?? {};
  const grid = entry.grid ?? {};
  const canvasWidth = (frame.width ?? 0) * (grid.columns ?? 0);
  const canvasHeight = (frame.height ?? 0) * (grid.rows ?? 0);
  return [
    `Create an original ${entry.role} character sprite atlas for Afterlight Protocol.`,
    entry.direction,
    `Canvas size must be exactly ${canvasWidth}x${canvasHeight}px with a transparent background.`,
    `Use a ${grid.columns ?? 0} column by ${grid.rows ?? 0} row fixed grid, ${frame.width ?? 0}x${frame.height ?? 0}px per frame.`,
    `Directions: ${(entry.directions ?? []).join(", ")}.`,
    `Animations or pose groups: ${(entry.animations ?? []).join(", ")}.`,
    "The sprite must read clearly at small size on a TV, with strong outline, stable feet/body placement, and no baked UI."
  ].join(" ");
}

function makeMarkdown(data) {
  const sections = data.briefs.map((brief) => `## ${brief.id}

- Role: ${brief.role}
- Status: ${brief.status}
- Runtime atlas: ${brief.atlasIsRuntime ? "yes" : "no"}
- Target atlas: \`${brief.targetAtlas}\`
- Target image: \`${brief.targetImage}\`
- Canvas: ${brief.canvasSize.width}x${brief.canvasSize.height}
- Frame: ${brief.frame.width}x${brief.frame.height}
- Anchor: ${brief.anchor.x},${brief.anchor.y}

### Prompt

${brief.prompt}

### Negative Prompt

${brief.negativePrompt.map((item) => `- ${item}`).join("\n")}

### Handoff Checklist

${brief.handoffChecklist.map((item) => `- ${item}`).join("\n")}
`).join("\n");

  return `# Character Art Brief

- Generated: ${data.generatedAt}
- Source: \`${data.source}\`
- Runtime manifest: \`${data.runtimeManifest}\`

${sections}
`;
}
