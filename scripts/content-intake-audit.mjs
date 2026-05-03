import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const incomingRoot = resolve(root, "incoming");
const distRoot = resolve(root, "dist", "content");
const jsonPath = join(distRoot, "content-intake-audit.json");
const markdownPath = join(distRoot, "content-intake-audit.md");

const files = await discoverFiles(incomingRoot);
const entries = [];

for (const file of files) {
  entries.push(await inspectFile(file));
}

const output = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  source: relative(root, incomingRoot),
  summary: {
    totalFiles: entries.length,
    characterFiles: entries.filter((entry) => entry.area === "characters").length,
    mapFiles: entries.filter((entry) => entry.area === "maps").length,
    audioFiles: entries.filter((entry) => entry.area === "audio").length,
    referenceFiles: entries.filter((entry) => entry.area === "reference").length,
    pngs: entries.filter((entry) => entry.kind === "png").length,
    jsonFiles: entries.filter((entry) => entry.kind === "json").length,
    audioAssets: entries.filter((entry) => entry.kind === "audio").length,
    candidates: entries.filter((entry) => entry.status === "candidate").length,
    needsCleanup: entries.filter((entry) => entry.status === "needs-cleanup").length
  },
  entries
};

await mkdir(distRoot, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(output));

console.log(`content intake audit ok: ${output.summary.totalFiles} files, ${output.summary.candidates} candidates`);
console.log(`wrote ${relative(root, jsonPath)} and ${relative(root, markdownPath)}`);

async function discoverFiles(dir) {
  const found = [];
  let children = [];
  try {
    children = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const child of children) {
    const path = join(dir, child.name);
    if (child.isDirectory()) {
      found.push(...await discoverFiles(path));
    } else if (child.isFile() && child.name !== ".gitkeep" && child.name !== "README.md") {
      found.push(path);
    }
  }
  return found.sort();
}

async function inspectFile(file) {
  const info = await stat(file);
  const rel = normalize(relative(root, file));
  const area = rel.split("/")[1] ?? "unknown";
  const ext = extname(file).toLowerCase();
  const base = {
    file: rel,
    area,
    bytes: info.size,
    kind: "unknown",
    status: "source-only",
    notes: [],
    nextStep: "Keep as reference until it is assigned to a production pipeline."
  };

  if (ext === ".png") return inspectPng(file, base);
  if (ext === ".json") return inspectJson(file, base);
  if ([".ogg", ".mp3", ".wav", ".m4a", ".flac"].includes(ext)) return inspectAudio(file, base);
  if ([".jpg", ".jpeg", ".webp"].includes(ext)) {
    return {
      ...base,
      kind: "image-reference",
      status: "source-only",
      notes: ["Reference image format; runtime atlases and map plates should be exported as PNG."],
      nextStep: "Use as source/reference, then export a pipeline-specific PNG target."
    };
  }
  return base;
}

async function inspectPng(file, base) {
  let header = null;
  const notes = [];
  try {
    header = parsePngHeader(await readFile(file));
  } catch (error) {
    notes.push(error.message);
  }

  if (!header) {
    return {
      ...base,
      kind: "png",
      status: "needs-cleanup",
      notes,
      nextStep: "Re-export as a valid PNG before pipeline use."
    };
  }

  const isCharacter = base.area === "characters";
  const isMap = base.area === "maps";
  const expectedCharacterGrid = header.width % 128 === 0 && header.height % 128 === 0;
  const notesOut = [
    `PNG ${header.width}x${header.height}`,
    header.hasAlpha ? "Has alpha transparency." : "No alpha transparency."
  ];

  if (isCharacter && header.hasAlpha && expectedCharacterGrid) {
    return {
      ...base,
      kind: "png",
      status: "candidate",
      width: header.width,
      height: header.height,
      hasAlpha: header.hasAlpha,
      notes: [...notesOut, "Looks like a possible fixed-frame 128px character atlas candidate."],
      nextStep: "Create matching atlas JSON, run npm run assets:validate, then inspect npm run assets:atlas-preview."
    };
  }

  if (isCharacter) {
    return {
      ...base,
      kind: "png",
      status: "needs-cleanup",
      width: header.width,
      height: header.height,
      hasAlpha: header.hasAlpha,
      notes: [...notesOut, "Character sheets need transparent backgrounds and fixed 128x128 frame grids before runtime."],
      nextStep: "Clean in Aseprite, export transparent fixed-frame atlas PNG, then run npm run assets:review."
    };
  }

  if (isMap && header.hasAlpha) {
    return {
      ...base,
      kind: "png",
      status: "candidate",
      width: header.width,
      height: header.height,
      hasAlpha: header.hasAlpha,
      notes: [...notesOut, "Possible map plate or overlay candidate."],
      nextStep: "Add to assets/maps/map-art-manifest.json, then run npm run maps:art."
    };
  }

  return {
    ...base,
    kind: "png",
    status: header.hasAlpha ? "candidate" : "needs-cleanup",
    width: header.width,
    height: header.height,
    hasAlpha: header.hasAlpha,
    notes: notesOut,
    nextStep: header.hasAlpha
      ? "Assign this PNG to the correct asset pipeline and document the target manifest."
      : "Re-export with transparency if it is intended for runtime."
  };
}

async function inspectJson(file, base) {
  try {
    const data = JSON.parse(await readFile(file, "utf8"));
    if (data.type === "map" && data.orientation === "orthogonal") {
      return {
        ...base,
        kind: "json",
        status: "candidate",
        jsonType: "tiled-map",
        notes: ["Looks like an orthogonal Tiled map JSON."],
        nextStep: "Move to assets/maps/, then run npm run maps:validate and npm run maps:preview."
      };
    }
    if (data.image && data.frame && data.grid && data.animations) {
      return {
        ...base,
        kind: "json",
        status: "candidate",
        jsonType: "character-atlas",
        notes: ["Looks like a character atlas manifest candidate."],
        nextStep: "Confirm image path, then run npm run assets:validate with this manifest."
      };
    }
    return {
      ...base,
      kind: "json",
      status: "source-only",
      jsonType: "unknown",
      notes: ["Valid JSON, but not recognized as a Tiled map or character atlas manifest."],
      nextStep: "Keep as reference or convert to a recognized pipeline manifest."
    };
  } catch {
    return {
      ...base,
      kind: "json",
      status: "needs-cleanup",
      notes: ["JSON parse failed."],
      nextStep: "Fix JSON syntax before pipeline use."
    };
  }
}

function inspectAudio(file, base) {
  const isRuntimeFormat = [".ogg", ".mp3"].includes(extname(file).toLowerCase());
  return {
    ...base,
    kind: "audio",
    status: isRuntimeFormat ? "candidate" : "needs-cleanup",
    notes: [
      isRuntimeFormat ? "Runtime-friendly browser audio format." : "Source/master audio format; convert to OGG or MP3 for runtime."
    ],
    nextStep: isRuntimeFormat
      ? "Match this file to assets/audio/audio-manifest.json, place it in assets/audio/, then run npm run audio:review."
      : "Export an OGG runtime file and preserve the source master outside runtime assets."
  };
}

function makeMarkdown(data) {
  const rows = data.entries.length
    ? data.entries.map((entry) => `| \`${entry.file}\` | ${entry.area} | ${entry.kind} | ${entry.status} | ${entry.bytes} | ${entry.notes.join(" ")} | ${entry.nextStep} |`).join("\n")
    : "| - | - | - | - | - | No incoming files found. | Drop new files into `incoming/` and rerun `npm run content:intake`. |";

  return `# Content Intake Audit

- Generated: ${data.generatedAt}
- Source: \`${data.source}\`
- Total files: ${data.summary.totalFiles}
- Candidates: ${data.summary.candidates}
- Needs cleanup: ${data.summary.needsCleanup}

This report is a first-pass intake screen. It does not approve runtime files or move anything into \`assets/\`.

| File | Area | Kind | Status | Bytes | Notes | Next Step |
|---|---|---|---|---:|---|---|
${rows}
`;
}

function parsePngHeader(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("File is not a PNG.");
  }
  const ihdr = buffer.subarray(12, 16).toString("ascii");
  if (ihdr !== "IHDR") {
    throw new Error("PNG IHDR header missing.");
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

function normalize(path) {
  return path.replaceAll("\\", "/");
}
