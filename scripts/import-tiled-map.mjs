import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

const source = process.argv[2];
if (!source) {
  throw new Error("Usage: node scripts/import-tiled-map.mjs <map.tiled.json> [--write <output.json>]");
}
if (extname(source) !== ".json" || !source.endsWith(".tiled.json")) {
  throw new Error("Tiled source maps must use the `.tiled.json` suffix");
}
const writeIndex = process.argv.indexOf("--write");
const output = writeIndex >= 0 ? process.argv[writeIndex + 1] : null;

const map = JSON.parse(await readFile(resolve(process.cwd(), source), "utf8"));
const layers = new Map((map.layers ?? []).map((layer) => [layer.name, layer]));

const converted = {
  name: property(map, "name", "Manor Party"),
  floor: ["#17151a", "#2a1922", "#2a2f1d"],
  event: {
    name: "Storm Flash",
    color: "#dff7ff",
    status: "Storm flash exposed the manor corridors",
    detail: "A lightning burst cuts through the manor and briefly exposes hidden movement.",
    effect: "reveal"
  },
  player: point(firstObject("spawns", "investigatorSpawn"), [180, 186]),
  anomaly: point(firstObject("spawns", "anomalySpawn"), [640, 352]),
  investigators: objects("spawns", "investigatorSpawn").slice(1).map((object, index) => [
    Math.round(object.x),
    Math.round(object.y),
    property(object, "color", ["#e76f8a", "#c7a8ff", "#f4e15d"][index] ?? "#7ae4d6"),
    property(object, "name", object.name || `Player ${index + 2}`)
  ]),
  batteries: objects("batteries", "batterySpawn").map((object) => point(object)),
  relays: [],
  labels: objects("labels", "label").map((object) => [Math.round(object.x), Math.round(object.y), object.name || "ROOM"]),
  walls: objects("collision", "wall").map(rect),
  props: objects("props", "prop").map((object) => ({
    ...rect(object),
    color: property(object, "color", "#26323a")
  }))
};

const json = `${JSON.stringify(converted, null, 2)}\n`;

if (output) {
  const outputPath = resolve(process.cwd(), output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, json);
  console.log(`map import ok: ${converted.name} -> ${output}`);
} else {
  console.log(json.trimEnd());
}

function objects(layerName, type) {
  return (layers.get(layerName)?.objects ?? []).filter((object) => object.type === type);
}

function firstObject(layerName, type) {
  return objects(layerName, type)[0] ?? null;
}

function point(object, fallback = [0, 0]) {
  return object ? [Math.round(object.x), Math.round(object.y)] : fallback;
}

function rect(object) {
  return {
    x: Math.round(object.x),
    y: Math.round(object.y),
    w: Math.round(object.width ?? 0),
    h: Math.round(object.height ?? 0)
  };
}

function property(owner, name, fallback) {
  const found = owner?.properties?.find((item) => item.name === name);
  return found?.value ?? fallback;
}
