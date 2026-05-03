import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const objectTypesPath = join(root, "assets", "maps", "afterlight-object-types.json");
const projectPath = join(root, "assets", "maps", "afterlight.tiled-project");
const distRoot = join(root, "dist", "maps");
const jsonPath = join(distRoot, "map-editor-kit.json");
const markdownPath = join(distRoot, "map-editor-kit.md");

const objectTypes = JSON.parse(await readFile(objectTypesPath, "utf8"));
const project = JSON.parse(await readFile(projectPath, "utf8"));

const kit = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  editor: "Tiled",
  projectFile: relative(root, projectPath),
  objectTypesFile: relative(root, objectTypesPath),
  layers: [
    { name: "collision", required: true, contents: ["wall"] },
    { name: "props", required: true, contents: ["prop"] },
    { name: "spawns", required: true, contents: ["investigatorSpawn", "anomalySpawn"] },
    { name: "batteries", required: true, contents: ["batterySpawn"] },
    { name: "labels", required: true, contents: ["label"] }
  ],
  objectTypes: objectTypes.objectTypes,
  authoringChecklist: [
    "Open assets/maps/afterlight.tiled-project in Tiled before editing maps.",
    "Use rectangle wall objects only on the collision layer.",
    "Keep one anomalySpawn and two to five investigatorSpawn points on spawns.",
    "Place at least three batterySpawn points, outside collision rectangles.",
    "Prefer rooms, corners, and short corridors over open arenas.",
    "Run npm run maps:validate before exporting a party build."
  ],
  project
};

await mkdir(distRoot, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(kit, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(kit));

console.log(`map editor kit ok: ${kit.objectTypes.length} object types`);
console.log(`wrote ${relative(root, jsonPath)} and ${relative(root, markdownPath)}`);

function makeMarkdown(data) {
  const layers = data.layers
    .map((layer) => `| \`${layer.name}\` | ${layer.required ? "yes" : "no"} | ${layer.contents.map((item) => `\`${item}\``).join(", ")} |`)
    .join("\n");
  const objects = data.objectTypes
    .map((object) => `| \`${object.name}\` | \`${object.layer}\` | ${object.shape} | ${object.description} |`)
    .join("\n");
  const checklist = data.authoringChecklist.map((item) => `- ${item}`).join("\n");

  return `# Map Editor Kit

- Generated: ${data.generatedAt}
- Tiled project: \`${data.projectFile}\`
- Object types: \`${data.objectTypesFile}\`

## Layers

| Layer | Required | Objects |
|---|:---:|---|
${layers}

## Object Types

| Type | Layer | Shape | Use |
|---|---|---|---|
${objects}

## Checklist

${checklist}
`;
}
