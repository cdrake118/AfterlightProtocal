import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const manifestPath = process.argv[2];

if (!manifestPath) {
  throw new Error("Usage: node scripts/validate-character-atlas.mjs <atlas-manifest.json>");
}

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestFile = resolve(process.cwd(), manifestPath);
const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
const errors = [];

requireString("id");
requireString("image");
requirePositive("frame.width");
requirePositive("frame.height");
requirePositive("grid.columns");
requirePositive("grid.rows");
requirePositive("anchor.x");
requirePositive("anchor.y");

const imagePath = resolve(root, manifest.image ?? "");
try {
  await stat(imagePath);
} catch {
  errors.push(`image not found: ${manifest.image}`);
}

let png = null;
try {
  png = parsePngHeader(await readFile(imagePath));
} catch (error) {
  errors.push(error.message);
}

if (png) {
  const expectedWidth = manifest.frame.width * manifest.grid.columns;
  const expectedHeight = manifest.frame.height * manifest.grid.rows;
  if (png.width !== expectedWidth || png.height !== expectedHeight) {
    errors.push(`image size ${png.width}x${png.height} does not match frame/grid ${expectedWidth}x${expectedHeight}`);
  }
  if (png.colorType !== 4 && png.colorType !== 6) {
    errors.push("image must be exported with alpha transparency, not a baked RGB/white background");
  }
}

if (!manifest.animations || typeof manifest.animations !== "object") {
  errors.push("animations object is required");
}

for (const [name, animation] of Object.entries(manifest.animations ?? {})) {
  if (!Array.isArray(animation.frames) || !animation.frames.length) {
    errors.push(`animation ${name} needs at least one frame index`);
  }
  for (const frame of animation.frames ?? []) {
    if (!Number.isInteger(frame) || frame < 0 || frame >= manifest.grid.columns) {
      errors.push(`animation ${name} frame ${frame} is outside 0-${manifest.grid.columns - 1}`);
    }
  }
  for (const row of animation.rows ?? []) {
    if (!Number.isInteger(row) || row < 0 || row >= manifest.grid.rows) {
      errors.push(`animation ${name} row ${row} is outside 0-${manifest.grid.rows - 1}`);
    }
  }
}

if (errors.length) {
  console.error(`Atlas validation failed for ${manifestPath}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`atlas ok: ${manifest.id} (${manifest.image})`);

function requireString(path) {
  if (typeof get(path) !== "string" || !get(path).trim()) {
    errors.push(`${path} must be a non-empty string`);
  }
}

function requirePositive(path) {
  if (!Number.isFinite(get(path)) || get(path) <= 0) {
    errors.push(`${path} must be a positive number`);
  }
}

function get(path) {
  return path.split(".").reduce((value, key) => value?.[key], manifest);
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
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer.readUInt8(24),
    colorType: buffer.readUInt8(25)
  };
}
