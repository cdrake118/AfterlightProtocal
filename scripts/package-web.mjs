import { mkdir, readFile, stat, writeFile, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("..", import.meta.url);
const distRoot = new URL("../dist/web/", import.meta.url);

const requiredFiles = [
  "index.html",
  "controller.html",
  "styles.css",
  "controller.css",
  "src/game.js",
  "src/controller.js",
  "src/platform.js",
  "server.js",
  "assets/audio/audio-manifest.json",
  "assets/characters/runtime-character-manifest.json",
  "assets/characters/anomaly-ghost.atlas.json",
  "assets/maps/manor-party.game-map.json",
  "assets/maps/manor-party.tiled.json",
  "assets/characters/anomaly-ghost-atlas.png",
  "README.md",
  "docs/CONFIGURATION.md",
  "docs/DESIGN.md",
  "docs/SPRITE_DIRECTION.md",
  "docs/ASSET_PIPELINE.md",
  "docs/MAP_PIPELINE.md",
  "docs/AUDIO_PIPELINE.md",
  "docs/NETWORKING.md",
  "docs/STEAM_ROADMAP.md"
];

const packageFiles = [
  "index.html",
  "controller.html",
  "styles.css",
  "controller.css",
  "src/game.js",
  "src/controller.js",
  "src/platform.js",
  "server.js",
  "assets/audio/audio-manifest.json",
  "assets/characters/runtime-character-manifest.json",
  "assets/characters/anomaly-ghost.atlas.json",
  "assets/maps/manor-party.tiled.json",
  "assets/characters/anomaly-ghost-atlas.png",
  "README.md",
  "docs/CONFIGURATION.md",
  "docs/DESIGN.md",
  "docs/SPRITE_DIRECTION.md",
  "docs/ASSET_PIPELINE.md",
  "docs/MAP_PIPELINE.md",
  "docs/AUDIO_PIPELINE.md",
  "docs/NETWORKING.md",
  "docs/STEAM_ROADMAP.md",
  "package.json"
];

async function assertFile(path) {
  const file = new URL(path, root);
  const info = await stat(file);
  if (!info.isFile()) {
    throw new Error(`Expected file: ${path}`);
  }
}

async function copyIntoDist(path) {
  const source = new URL(path, root);
  const target = new URL(path, distRoot);
  await mkdir(dirname(fileURLToPath(target)), { recursive: true });
  await copyFile(source, target);
}

function makeManifest(packageJson) {
  return {
    app: "Afterlight Protocol Prototype",
    version: packageJson.version,
    target: "web-static",
    generatedAt: new Date().toISOString(),
    entry: "index.html",
    files: packageFiles,
    platformAdapters: [
      "lobbies",
      "input",
      "network",
      "loopback-transport",
      "presence",
      "playtest-feedback",
      "achievements",
      "career-stats",
      "entitlements",
      "cosmetics",
      "storage"
    ],
    steamReadiness: {
      canRunOffline: true,
      thirdPartyRuntimeDependencies: 0,
      nextAutomationStep: "Run the Steam upload dry run, then configure SteamCMD credentials for a private beta branch."
    }
  };
}

for (const file of requiredFiles) {
  await assertFile(file);
}

await mkdir(distRoot, { recursive: true });
for (const file of packageFiles) {
  await copyIntoDist(file);
}

const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const manifest = makeManifest(packageJson);
await writeFile(new URL("build-manifest.json", distRoot), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Packaged ${packageFiles.length} files to ${join("dist", "web")}`);
