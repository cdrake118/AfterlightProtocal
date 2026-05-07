import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
if (!args.length) {
  throw new Error("Usage: node scripts/promote-browser-builder-map.mjs <source-map.json> [--id <map-id>] [--format tiled|game|both] [--dry-run]");
}

const source = resolve(process.cwd(), args[0]);
const id = flag("--id") ?? normalizeId(basename(source).replace(/\.json$/i, ""));
const format = flag("--format") ?? "both";
const dryRun = args.includes("--dry-run");
if (!["tiled", "game", "both"].includes(format)) {
  throw new Error("--format must be one of: tiled, game, both");
}

const map = JSON.parse(await readFile(source, "utf8"));
const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const mapsDir = join(root, "assets", "maps");
const audioDir = join(root, "assets", "audio", "maps");

const promoted = structuredClone(map);
const copied = [];

for (const layer of promoted.layers ?? []) {
  if (layer?.type !== "imagelayer" || typeof layer.image !== "string") continue;
  const image = layer.image.trim();
  if (image.startsWith("data:")) {
    const file = `${id}-${slug(layer.name || "image")}${extensionFromDataUrl(image, ".png")}`;
    const target = join(mapsDir, file);
    const bytes = decodeDataUrl(image);
    copied.push({ target, bytes });
    layer.image = file;
  }
}

rewriteAudioProperties(promoted, id, copied, audioDir, mapsDir);

const tiledTarget = join(mapsDir, `${id}.tiled.json`);
const gameTarget = join(mapsDir, `${id}.game-map.json`);

if (!dryRun) {
  await mkdir(mapsDir, { recursive: true });
  await mkdir(audioDir, { recursive: true });
  for (const item of copied) {
    await mkdir(dirname(item.target), { recursive: true });
    await writeFile(item.target, item.bytes);
  }
  if (format === "tiled" || format === "both") {
    await writeFile(tiledTarget, `${JSON.stringify(promoted, null, 2)}\n`);
  }
  if (format === "game" || format === "both") {
    const converted = importTiledLike(promoted);
    await writeFile(gameTarget, `${JSON.stringify(converted, null, 2)}\n`);
  }
}

console.log(`builder map promotion ${dryRun ? "preview" : "ok"}: ${relative(root, source)} -> ${id}`);
for (const item of copied) {
  console.log(`- media: ${relative(root, item.target)}`);
}
if (format === "tiled" || format === "both") {
  console.log(`- map: ${relative(root, tiledTarget)}`);
}
if (format === "game" || format === "both") {
  console.log(`- map: ${relative(root, gameTarget)}`);
}

function flag(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function normalizeId(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "builder-map";
}

function slug(value) {
  return normalizeId(value);
}

function decodeDataUrl(url) {
  const marker = ";base64,";
  const index = url.indexOf(marker);
  if (index < 0) throw new Error("Expected base64 data URL");
  return Buffer.from(url.slice(index + marker.length), "base64");
}

function extensionFromDataUrl(url, fallback) {
  const match = /^data:([^;,]+)/i.exec(url);
  if (!match) return fallback;
  const mime = match[1].toLowerCase();
  const direct = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav"
  }[mime];
  if (direct) return direct;
  const fromMime = mime.split("/")[1];
  return fromMime ? `.${fromMime.replace(/[^a-z0-9]+/g, "")}` : fallback;
}

function rewriteAudioProperties(owner, id, copied, audioDir, mapsDir) {
  const queue = [owner];
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (Array.isArray(current.properties)) {
      for (const prop of current.properties) {
        if (!prop || typeof prop.value !== "string") continue;
        if (!prop.value.startsWith("data:audio/")) continue;
        const file = `${id}-${slug(prop.name || "music")}${extensionFromDataUrl(prop.value, ".mp3")}`;
        const target = join(audioDir, file);
        copied.push({ target, bytes: decodeDataUrl(prop.value) });
        prop.value = relative(mapsDir, target).replaceAll("\\", "/");
      }
    }
    for (const value of Object.values(current)) queue.push(value);
  }
}

function importTiledLike(map) {
  const layers = new Map((map.layers ?? []).map((layer) => [layer.name, layer]));
  return {
    name: property(map, "name", "Manor Party"),
    floor: ["#17151a", "#2a1922", "#2a2f1d"],
    event: {
      name: "Storm Flash",
      color: "#dff7ff",
      status: "Storm flash exposed the manor corridors",
      detail: "A lightning burst cuts through the manor and briefly exposes hidden movement.",
      effect: "reveal"
    },
    player: point(firstObject(layers, "spawns", "investigatorSpawn"), [180, 186]),
    anomaly: point(firstObject(layers, "spawns", "anomalySpawn"), [640, 352]),
    investigators: objects(layers, "spawns", "investigatorSpawn").slice(1).map((object, index) => [
      Math.round(object.x),
      Math.round(object.y),
      property(object, "color", ["#e76f8a", "#c7a8ff", "#f4e15d"][index] ?? "#7ae4d6"),
      property(object, "name", object.name || `Player ${index + 2}`)
    ]),
    batteries: objects(layers, "batteries", "batterySpawn").map((object) => point(object)),
    relays: [],
    labels: objects(layers, "labels", "label").map((object) => [Math.round(object.x), Math.round(object.y), object.name || "ROOM"]),
    walls: objects(layers, "collision", "wall").map(collisionObject),
    props: objects(layers, "props", "prop").map((object) => ({ ...rect(object), color: property(object, "color", "#26323a") }))
  };
}

function objects(layers, layerName, type) {
  return (layers.get(layerName)?.objects ?? []).filter((object) => object.type === type);
}
function firstObject(layers, layerName, type) { return objects(layers, layerName, type)[0] ?? null; }
function point(object, fallback = [0, 0]) { return object ? [Math.round(object.x), Math.round(object.y)] : fallback; }
function rect(object) { return { x: Math.round(object.x), y: Math.round(object.y), w: Math.round(object.width ?? 0), h: Math.round(object.height ?? 0) }; }
function collisionObject(object) {
  if (object.polyline?.length >= 2) {
    return {
      shape: "segment",
      x: Math.round(object.x),
      y: Math.round(object.y),
      x2: Math.round(object.x + object.polyline[1].x),
      y2: Math.round(object.y + object.polyline[1].y),
      thickness: Number(property(object, "thickness", property(object, "visible", "true") === "false" ? 1 : 24)),
      ...(String(property(object, "visible", "true")) === "false" ? { visible: false } : {})
    };
  }
  return {
    ...rect(object),
    ...(String(property(object, "visible", "true")) === "false" ? { visible: false } : {})
  };
}
function property(owner, name, fallback) {
  const found = owner?.properties?.find((item) => item.name === name);
  return found?.value ?? fallback;
}
