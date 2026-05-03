import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = resolve(root, "assets/audio/audio-manifest.json");
const distRoot = resolve(root, "dist/assets");
const jsonPath = resolve(distRoot, "audio-asset-audit.json");
const markdownPath = resolve(distRoot, "audio-asset-audit.md");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const entries = [
  ...Object.entries(manifest.music ?? {}).map(([id, entry]) => ({ id, type: "music", ...entry })),
  ...Object.entries(manifest.sfx ?? {}).map(([id, entry]) => ({ id, type: "sfx", ...entry }))
];

const assets = [];
for (const entry of entries) {
  const filePath = resolve(root, entry.src ?? "");
  let exists = false;
  let bytes = 0;
  try {
    const info = await stat(filePath);
    exists = info.isFile();
    bytes = exists ? info.size : 0;
  } catch {
    exists = false;
  }
  assets.push({
    id: entry.id,
    type: entry.type,
    src: entry.src,
    bus: entry.bus ?? entry.type,
    loop: Boolean(entry.loop),
    exists,
    bytes,
    status: exists ? "ready" : "missing"
  });
}

const report = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  summary: {
    totalSlots: assets.length,
    ready: assets.filter((asset) => asset.exists).length,
    missing: assets.filter((asset) => !asset.exists).length,
    musicSlots: assets.filter((asset) => asset.type === "music").length,
    sfxSlots: assets.filter((asset) => asset.type === "sfx").length
  },
  assets
};

await mkdir(dirname(jsonPath), { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(report));

console.log(`audio asset audit ok: ${report.summary.ready}/${report.summary.totalSlots} slots filled`);
console.log(`wrote ${relative(root, jsonPath)} and ${relative(root, markdownPath)}`);

function makeMarkdown(data) {
  const rows = data.assets.map((asset) => {
    const size = asset.exists ? `${Math.round(asset.bytes / 1024)} KB` : "-";
    return `| \`${asset.id}\` | ${asset.type} | \`${asset.src}\` | ${asset.bus} | ${asset.loop ? "yes" : "no"} | ${asset.status} | ${size} |`;
  }).join("\n");
  return `# Audio Asset Audit

- Generated: ${data.generatedAt}
- Total slots: ${data.summary.totalSlots}
- Ready files: ${data.summary.ready}
- Missing files: ${data.summary.missing}
- Music slots: ${data.summary.musicSlots}
- SFX slots: ${data.summary.sfxSlots}

| Id | Type | Source | Bus | Loop | Status | Size |
|---|---|---|---|:---:|---|---:|
${rows}
`;
}
