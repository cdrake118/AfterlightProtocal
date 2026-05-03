import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const characterRoot = join(root, "assets", "characters");
const distRoot = join(root, "dist", "assets");
const jsonPath = join(distRoot, "art-asset-audit.json");
const markdownPath = join(distRoot, "art-asset-audit.md");
const runtimeManifest = await readOptionalJson(join(characterRoot, "runtime-character-manifest.json"));
const characterBriefs = await readOptionalJson(join(characterRoot, "character-art-briefs.json"));
const runtimeAtlasImages = await getRuntimeAtlasImages(runtimeManifest);
const sourceOnlyImages = new Set((runtimeManifest?.sourceOnlyAssets ?? []).map((asset) => normalizePath(asset.image)));
const briefTargets = new Map((characterBriefs?.briefs ?? []).map((brief) => [normalizePath(brief.targetImage), brief]));

const files = (await readdir(characterRoot))
  .filter((file) => extname(file).toLowerCase() === ".png")
  .sort();

const assets = [];
for (const file of files) {
  const path = join(characterRoot, file);
  const buffer = await readFile(path);
  const header = parsePngHeader(buffer);
  const relativePath = normalizePath(relative(root, path));
  const runtimeApproved = runtimeAtlasImages.has(relativePath);
  const sourceOnly = sourceOnlyImages.has(relativePath)
    || file.includes("source")
    || file.includes("direction")
    || file.includes("preview");
  const plannedTarget = briefTargets.get(relativePath);
  const productionReady = header.hasAlpha && runtimeApproved;
  const notes = [];
  if (!header.hasAlpha) {
    notes.push("Re-export with transparent background; RGB/white sheets should not be used at runtime.");
  }
  if (sourceOnly) {
    notes.push("Reference/source asset, not a runtime atlas.");
  }
  if (plannedTarget && runtimeApproved) {
    notes.push(`Matches approved runtime target for ${plannedTarget.id}.`);
  } else if (plannedTarget) {
    notes.push(`Matches planned target for ${plannedTarget.id}; add atlas JSON and runtime manifest only after validation.`);
  }
  if (header.hasAlpha && !runtimeApproved && !sourceOnly && !plannedTarget) {
    notes.push("Transparent source/candidate PNG; not runtime-approved until it has atlas JSON and is listed in the runtime manifest.");
  }
  if (!runtimeApproved && !sourceOnly && !plannedTarget && !header.hasAlpha) {
    notes.push("Untracked generated/source PNG; keep out of runtime until cleaned, framed, and documented.");
  }
  if (productionReady) {
    notes.push("Runtime-approved transparent PNG listed by a validated atlas manifest.");
  }
  assets.push({
    file: relativePath,
    width: header.width,
    height: header.height,
    colorType: header.colorType,
    hasAlpha: header.hasAlpha,
    runtimeApproved,
    sourceOnly,
    plannedTarget: plannedTarget?.id ?? null,
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
    runtimeApproved: assets.filter((asset) => asset.runtimeApproved).length,
    sourceOnly: assets.filter((asset) => asset.sourceOnly).length,
    candidate: assets.filter((asset) => asset.hasAlpha && !asset.runtimeApproved && !asset.sourceOnly).length,
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
    const status = asset.productionReady
      ? "Runtime Ready"
      : asset.sourceOnly
        ? "Source Only"
        : asset.hasAlpha
          ? "Candidate"
          : "Needs Transparency";
    return `| \`${asset.file}\` | ${asset.width}x${asset.height} | ${asset.hasAlpha ? "yes" : "no"} | ${asset.runtimeApproved ? "yes" : "no"} | ${status} | ${asset.notes.join(" ")} |`;
  }).join("\n");
  return `# Art Asset Audit

- Generated: ${data.generatedAt}
- Total PNGs: ${data.summary.totalPngs}
- Transparent PNGs: ${data.summary.transparent}
- RGB/white-background PNGs: ${data.summary.rgb}
- Runtime-approved PNGs: ${data.summary.runtimeApproved}
- Source-only PNGs: ${data.summary.sourceOnly}
- Transparent candidate PNGs: ${data.summary.candidate}
- Production-ready runtime PNGs: ${data.summary.productionReady}

| File | Size | Alpha | Runtime Manifest | Status | Notes |
|---|---:|:---:|:---:|---|---|
${rows}
`;
}

async function getRuntimeAtlasImages(manifest) {
  const images = new Set();
  for (const atlasPath of manifest?.runtimeAtlases ?? []) {
    try {
      const atlas = JSON.parse(await readFile(resolve(root, atlasPath), "utf8"));
      if (atlas.image) images.add(normalizePath(atlas.image));
    } catch {
      // The atlas validator reports missing or malformed runtime atlas files.
    }
  }
  return images;
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

function normalizePath(path) {
  return relative(root, resolve(root, path)).replaceAll("\\", "/");
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
