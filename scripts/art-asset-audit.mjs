import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const characterRoot = join(root, "assets", "characters");
const distRoot = join(root, "dist", "assets");
const jsonPath = join(distRoot, "art-asset-audit.json");
const markdownPath = join(distRoot, "art-asset-audit.md");

const files = (await readdir(characterRoot))
  .filter((file) => extname(file).toLowerCase() === ".png")
  .sort();

const assets = [];
for (const file of files) {
  const path = join(characterRoot, file);
  const buffer = await readFile(path);
  const header = parsePngHeader(buffer);
  const productionReady = header.hasAlpha && !file.includes("source") && !file.includes("direction") && !file.includes("preview");
  const notes = [];
  if (!header.hasAlpha) {
    notes.push("Re-export with transparent background; RGB/white sheets should not be used at runtime.");
  }
  if (file.includes("source") || file.includes("direction") || file.includes("preview")) {
    notes.push("Reference/source asset, not a runtime atlas.");
  }
  if (productionReady) {
    notes.push("Transparent PNG suitable for manifest validation.");
  }
  assets.push({
    file: relative(root, path),
    width: header.width,
    height: header.height,
    colorType: header.colorType,
    hasAlpha: header.hasAlpha,
    productionReady,
    notes
  });
}

const report = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  summary: {
    totalPngs: assets.length,
    transparent: assets.filter((asset) => asset.hasAlpha).length,
    rgb: assets.filter((asset) => !asset.hasAlpha).length,
    productionReady: assets.filter((asset) => asset.productionReady).length
  },
  assets
};

await mkdir(distRoot, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(report));

console.log(`art asset audit ok: ${report.summary.productionReady}/${report.summary.totalPngs} PNGs production-ready`);
console.log(`wrote ${relative(root, jsonPath)} and ${relative(root, markdownPath)}`);

function makeMarkdown(data) {
  const rows = data.assets.map((asset) => {
    const status = asset.productionReady ? "Ready" : asset.hasAlpha ? "Reference" : "Needs Transparency";
    return `| \`${asset.file}\` | ${asset.width}x${asset.height} | ${asset.hasAlpha ? "yes" : "no"} | ${status} | ${asset.notes.join(" ")} |`;
  }).join("\n");
  return `# Art Asset Audit

- Generated: ${data.generatedAt}
- Total PNGs: ${data.summary.totalPngs}
- Transparent PNGs: ${data.summary.transparent}
- RGB/white-background PNGs: ${data.summary.rgb}
- Production-ready runtime PNGs: ${data.summary.productionReady}

| File | Size | Alpha | Status | Notes |
|---|---:|:---:|---|---|
${rows}
`;
}

function parsePngHeader(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("image is not a PNG");
  }
  const ihdr = buffer.subarray(12, 16).toString("ascii");
  if (ihdr !== "IHDR") {
    throw new Error("PNG IHDR header missing");
  }
  const colorType = buffer.readUInt8(25);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer.readUInt8(24),
    colorType,
    hasAlpha: colorType === 4 || colorType === 6
  };
}
