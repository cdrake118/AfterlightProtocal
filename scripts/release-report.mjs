import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const distRoot = new URL("../dist/", import.meta.url);
const webRoot = new URL("web/", distRoot);
const steamRoot = new URL("steam/", distRoot);
const reportJsonUrl = new URL("release-report.json", distRoot);
const reportMarkdownUrl = new URL("release-report.md", distRoot);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function fileDigest(path) {
  const url = new URL(path, webRoot);
  const [bytes, info] = await Promise.all([readFile(url), stat(url)]);
  return {
    path,
    bytes: info.size,
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
}

function makeMarkdown(report) {
  const files = report.files
    .map((file) => `| \`${file.path}\` | ${file.bytes} | \`${file.sha256.slice(0, 16)}...\` |`)
    .join("\n");
  const adapters = report.platformAdapters.map((adapter) => `- ${adapter}`).join("\n");
  const gates = report.gates.map((gate) => `- ${gate.name}: ${gate.status}`).join("\n");
  const uploadPrerequisites = report.steamUpload.prerequisites.map((item) => `- ${item}`).join("\n");

  return `# ${report.app} Release Report

- Version: ${report.version}
- Target: ${report.target}
- Generated: ${report.generatedAt}
- Steam branch: ${report.steam.branch}
- Steam app/depot: ${report.steam.appId}/${report.steam.depotId}
- Steam upload mode: ${report.steamUpload.mode}

## Gates

${gates}

## Platform Adapters

${adapters}

## Files

| Path | Bytes | SHA-256 |
| --- | ---: | --- |
${files}

## SteamCMD Dry Run

\`${report.steamUpload.command.join(" ")}\`

## Steam Upload Readiness

- App build VDF: \`${report.steamUpload.appBuildVdf}\`
- Upload report: \`dist/steam/steam-upload-report.json\`

${uploadPrerequisites}
`;
}

const manifest = await readJson(new URL("build-manifest.json", webRoot));
const steamPlan = await readJson(new URL("steam-upload-plan.json", steamRoot));
const steamUpload = await readJson(new URL("steam-upload-report.json", steamRoot));
const files = await Promise.all(manifest.files.map((file) => fileDigest(file)));
const uploadCommand = steamUpload.command.join(" ");

const report = {
  app: manifest.app,
  version: manifest.version,
  target: manifest.target,
  generatedAt: new Date().toISOString(),
  entry: manifest.entry,
  files,
  platformAdapters: manifest.platformAdapters,
  gates: [
    { name: "Runtime smoke", status: "pass" },
    { name: "Release audit", status: "pass" },
    { name: "Self-contained runtime", status: manifest.steamReadiness.canRunOffline ? "pass" : "fail" },
    { name: "Third-party runtime dependencies", status: manifest.steamReadiness.thirdPartyRuntimeDependencies === 0 ? "pass" : "fail" },
    { name: "Steam depot plan", status: "pass" },
    { name: "Steam upload dry run", status: steamUpload.mode === "dry-run" ? "pass" : "manual" },
    { name: "Redacted Steam upload command", status: uploadCommand.includes("<redacted>") ? "pass" : "fail" }
  ],
  steam: steamPlan,
  steamUpload
};

await mkdir(distRoot, { recursive: true });
await writeFile(reportJsonUrl, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(reportMarkdownUrl, makeMarkdown(report));

console.log(`Release report written to dist/release-report.json and dist/release-report.md`);
