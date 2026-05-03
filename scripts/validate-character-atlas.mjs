import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const manifestPaths = process.argv.slice(2);

if (!manifestPaths.length) {
  throw new Error("Usage: node scripts/validate-character-atlas.mjs <atlas-manifest.json> [...atlas-manifest.json]");
}

const root = fileURLToPath(new URL("..", import.meta.url));

let failed = false;

for (const manifestPath of manifestPaths) {
  const errors = await validateManifest(manifestPath);
  if (errors.length) {
    failed = true;
    console.error(`Atlas validation failed for ${manifestPath}`);
    for (const error of errors) console.error(`- ${error}`);
  }
}

if (failed) {
  process.exit(1);
}

async function validateManifest(manifestPath) {
  const manifestFile = resolve(process.cwd(), manifestPath);
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  const errors = [];

  requireString(manifest, errors, "id");
  requireString(manifest, errors, "image");
  requirePositive(manifest, errors, "frame.width");
  requirePositive(manifest, errors, "frame.height");
  requirePositive(manifest, errors, "grid.columns");
  requirePositive(manifest, errors, "grid.rows");
  requirePositive(manifest, errors, "anchor.x");
  requirePositive(manifest, errors, "anchor.y");
  requireNonNegative(manifest, errors, "safePadding");

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
    if (manifest.anchor.x > manifest.frame.width || manifest.anchor.y > manifest.frame.height) {
      errors.push("anchor must sit inside the source frame");
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

  if (!errors.length) {
    console.log(`atlas ok: ${manifest.id} (${manifest.image})`);
  }
  return errors;
}

function requireString(manifest, errors, path) {
  if (typeof get(manifest, path) !== "string" || !get(manifest, path).trim()) {
    errors.push(`${path} must be a non-empty string`);
  }
}

function requirePositive(manifest, errors, path) {
  if (!Number.isFinite(get(manifest, path)) || get(manifest, path) <= 0) {
    errors.push(`${path} must be a positive number`);
  }
}

function requireNonNegative(manifest, errors, path) {
  if (!Number.isFinite(get(manifest, path)) || get(manifest, path) < 0) {
    errors.push(`${path} must be a non-negative number`);
  }
}

function get(manifest, path) {
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
