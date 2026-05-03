import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("..", import.meta.url);
const webDist = new URL("../dist/web/", import.meta.url);
const steamDist = new URL("../dist/steam/", import.meta.url);
const manifestUrl = new URL("build-manifest.json", webDist);

function env(name, fallback) {
  return process.env[name] || fallback;
}

function quote(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

function vdfObject(name, entries, indent = 0) {
  const pad = " ".repeat(indent);
  const innerPad = " ".repeat(indent + 2);
  const lines = [`${pad}"${quote(name)}"`, `${pad}{`];
  for (const [key, value] of Object.entries(entries)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      lines.push(vdfObject(key, value, indent + 2));
    } else {
      lines.push(`${innerPad}"${quote(key)}" "${quote(value)}"`);
    }
  }
  lines.push(`${pad}}`);
  return lines.join("\n");
}

async function assertPackagedBuild() {
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  for (const file of manifest.files) {
    const info = await stat(new URL(file, webDist));
    if (!info.isFile()) {
      throw new Error(`Packaged build is missing ${file}`);
    }
  }
  return manifest;
}

function makeDepotVdf({ depotId }) {
  return vdfObject("DepotBuildConfig", {
    DepotID: depotId,
    ContentRoot: fileURLToPath(webDist),
    FileMapping: {
      LocalPath: "*",
      DepotPath: ".",
      recursive: "1"
    }
  });
}

function makeAppVdf({ appId, depotId, branch, description }) {
  return vdfObject("AppBuild", {
    AppID: appId,
    Desc: description,
    BuildOutput: fileURLToPath(new URL("output/", steamDist)),
    ContentRoot: fileURLToPath(webDist),
    SetLive: branch,
    Depots: {
      [depotId]: "depot_build.vdf"
    }
  });
}

const manifest = await assertPackagedBuild();
const appId = env("STEAM_APP_ID", "000000");
const depotId = env("STEAM_DEPOT_ID", "000001");
const branch = env("STEAM_BRANCH", "prototype");
const description = env("STEAM_BUILD_DESC", `${manifest.app} ${manifest.version} ${manifest.target}`);

await mkdir(steamDist, { recursive: true });
await mkdir(new URL("output/", steamDist), { recursive: true });

await writeFile(new URL("depot_build.vdf", steamDist), `${makeDepotVdf({ depotId })}\n`);
await writeFile(new URL("app_build.vdf", steamDist), `${makeAppVdf({ appId, depotId, branch, description })}\n`);
await writeFile(new URL("steam-upload-plan.json", steamDist), `${JSON.stringify({
  appId,
  depotId,
  branch,
  description,
  source: "dist/web",
  manifestVersion: manifest.version,
  generatedAt: new Date().toISOString(),
  steamcmdCommand: "steamcmd +login <user> <password> +run_app_build dist/steam/app_build.vdf +quit"
}, null, 2)}\n`);

console.log(`Steam depot plan generated in ${fileURLToPath(steamDist)}`);
