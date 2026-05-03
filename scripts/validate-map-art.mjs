import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = resolve(root, "assets", "maps", "map-art-manifest.json");
const distRoot = resolve(root, "dist", "maps");
const jsonPath = join(distRoot, "map-art-audit.json");
const markdownPath = join(distRoot, "map-art-audit.md");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const reports = [];
let failed = false;

if (manifest.version !== 1) {
  failed = true;
  reports.push(errorReport("manifest", "manifest version must be 1"));
}

if (!Array.isArray(manifest.maps)) {
  failed = true;
  reports.push(errorReport("manifest", "manifest maps must be an array"));
} else {
  for (const entry of manifest.maps) {
    const report = await validateEntry(entry);
    reports.push(report);
    if (report.errors.length) failed = true;
  }
}

const output = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  manifest: relative(root, manifestPath),
  summary: {
    total: reports.length,
    ready: reports.filter((report) => report.status === "ready" && report.errors.length === 0).length,
    planned: reports.filter((report) => report.status === "planned").length,
    errors: reports.reduce((total, report) => total + report.errors.length, 0),
    warnings: reports.reduce((total, report) => total + report.warnings.length, 0)
  },
  reports
};

await mkdir(distRoot, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(output));

for (const report of reports) {
  const label = report.errors.length ? "failed" : "ok";
  console.log(`map art ${label}: ${report.id} (${report.status})`);
  for (const error of report.errors) console.error(`- ${error}`);
  for (const warning of report.warnings) console.warn(`- ${warning}`);
}
console.log(`wrote ${relative(root, jsonPath)} and ${relative(root, markdownPath)}`);

if (failed) process.exit(1);

async function validateEntry(entry) {
  const errors = [];
  const warnings = [];
  const id = stringValue(entry.id, "missing-id");
  const status = stringValue(entry.status, "planned");
  const map = stringValue(entry.map, "");
  const image = stringValue(entry.image, "");
  const expectedWidth = entry.expectedSize?.width;
  const expectedHeight = entry.expectedSize?.height;

  if (!entry.id) errors.push("id is required");
  if (!["planned", "ready"].includes(status)) errors.push("status must be planned or ready");
  if (!map) errors.push("map path is required");
  if (!Number.isFinite(expectedWidth) || !Number.isFinite(expectedHeight) || expectedWidth <= 0 || expectedHeight <= 0) {
    errors.push("expectedSize.width and expectedSize.height must be positive numbers");
  }

  if (map) {
    try {
      await readFile(resolve(root, map));
    } catch {
      errors.push(`map file not found: ${map}`);
    }
  }

  let imageInfo = null;
  if (status === "ready") {
    if (!image) {
      errors.push("ready map art must include an image path");
    } else if (!image.startsWith("assets/maps/")) {
      errors.push("ready map art image must live under assets/maps/");
    } else if (![".png", ".jpg", ".jpeg", ".webp"].includes(extname(image).toLowerCase())) {
      errors.push("ready map art image must be PNG, JPG, JPEG, or WEBP");
    } else {
      imageInfo = await inspectImage(image, errors);
      if (imageInfo && expectedWidth && expectedHeight && (imageInfo.width !== expectedWidth || imageInfo.height !== expectedHeight)) {
        errors.push(`image size ${imageInfo.width}x${imageInfo.height} does not match expected ${expectedWidth}x${expectedHeight}`);
      }
    }
  } else if (image) {
    warnings.push("planned map art has an image path; mark it ready when it should be validated strictly");
  }

  if (!stringValue(entry.direction, "")) {
    warnings.push("add art direction so generated or commissioned backgrounds stay consistent");
  }

  return {
    id,
    status,
    map,
    image,
    expectedSize: { width: expectedWidth ?? 0, height: expectedHeight ?? 0 },
    actualSize: imageInfo ? { width: imageInfo.width, height: imageInfo.height } : null,
    usage: stringValue(entry.usage, ""),
    errors,
    warnings
  };
}

async function inspectImage(image, errors) {
  const path = resolve(root, image);
  let buffer;
  try {
    buffer = await readFile(path);
  } catch {
    errors.push(`image file not found: ${image}`);
    return null;
  }
  if (buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") {
    return {
      format: "png",
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }
  errors.push("only PNG dimensions can be verified automatically right now; use PNG for ready map art");
  return null;
}

function errorReport(id, error) {
  return {
    id,
    status: "blocked",
    map: "",
    image: "",
    expectedSize: { width: 0, height: 0 },
    actualSize: null,
    usage: "",
    errors: [error],
    warnings: []
  };
}

function makeMarkdown(data) {
  const rows = data.reports.map((report) => {
    const notes = [...report.errors, ...report.warnings].join(" ");
    const actual = report.actualSize ? `${report.actualSize.width}x${report.actualSize.height}` : "-";
    return `| \`${report.id}\` | ${report.status} | \`${report.map}\` | \`${report.image || "-"}\` | ${report.expectedSize.width}x${report.expectedSize.height} | ${actual} | ${notes} |`;
  }).join("\n");
  return `# Map Art Audit

- Generated: ${data.generatedAt}
- Manifest: \`${data.manifest}\`
- Total entries: ${data.summary.total}
- Ready: ${data.summary.ready}
- Planned: ${data.summary.planned}
- Errors: ${data.summary.errors}
- Warnings: ${data.summary.warnings}

| ID | Status | Map | Image | Expected | Actual | Notes |
|---|---|---|---|---:|---:|---|
${rows}
`;
}

function stringValue(value, fallback) {
  return typeof value === "string" ? value.trim() : fallback;
}
