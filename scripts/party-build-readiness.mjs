import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const distRoot = resolve(root, "dist", "party");
const jsonPath = join(distRoot, "party-build-readiness.json");
const markdownPath = join(distRoot, "party-build-readiness.md");

const content = await readOptional("dist/content/content-pipeline-report.json");
const promotion = await readOptional("dist/content/content-promotion-plan.json");
const deployCheck = await readOptional("dist/party/party-deploy-check.json");

const checks = makeChecks({ content, promotion, deployCheck });
const blockers = checks.filter((check) => check.status === "blocked");
const warnings = checks.filter((check) => check.status === "warning");
const output = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  target: "Next-weekend couch party build",
  summary: {
    ready: blockers.length === 0,
    blocked: blockers.length,
    warnings: warnings.length,
    checks: checks.length
  },
  checks,
  setupPlan: [
    "Run the host display from the laptop at /host.",
    "Show the laptop on the TV with HDMI first, AirPlay as fallback.",
    "Phones join from the displayed QR code or room URL.",
    "Use Railway for the public join URL when testing off the local machine.",
    "Run a quick host plus one-phone control test before guests arrive."
  ],
  commands: {
    fullReadiness: "npm run party:readiness",
    hostServer: "npm run serve:party",
    contentReview: "npm run content:review",
    multiplayerSmoke: "npm run smoke:multiplayer",
    deployCheck: "npm run party:deploy-check",
    remoteSmoke: "npm run party:remote-smoke -- --url https://YOUR-RAILWAY-DOMAIN",
    partyServerSmoke: "npm run party:server-smoke"
  }
};

await mkdir(distRoot, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(output));

console.log(`party build readiness ${output.summary.ready ? "ready" : "blocked"}: ${output.summary.blocked} blockers, ${output.summary.warnings} warnings`);
console.log(`wrote ${relative(root, jsonPath)} and ${relative(root, markdownPath)}`);

async function readOptional(path) {
  try {
    return JSON.parse(await readFile(resolve(root, path), "utf8"));
  } catch {
    return null;
  }
}

function makeChecks(data) {
  const checks = [];
  const summary = data.content?.summary ?? {};
  const nextActions = data.content?.nextActions ?? [];
  const p0Actions = nextActions.filter((action) => action.priority === "P0");
  const p1Actions = nextActions.filter((action) => action.priority === "P1");

  checks.push({
    area: "Content Report",
    status: data.content ? "ready" : "blocked",
    detail: data.content
      ? "Content review report is available."
      : "Run npm run content:review before party testing."
  });

  checks.push({
    area: "Character Art",
    status: (summary.characterRuntimeAtlases ?? 0) >= 2 ? "ready" : "blocked",
    detail: (summary.characterRuntimeAtlases ?? 0) >= 2
      ? "Anomaly plus investigator runtime atlases are present."
      : "Investigator runtime atlas is still missing; source-only generated sheets should not be used for the party build."
  });

  checks.push({
    area: "Map Art",
    status: (summary.readyMapArt ?? 0) >= 1 ? "ready" : "blocked",
    detail: (summary.readyMapArt ?? 0) >= 1
      ? "At least one ready map plate is available."
      : "The Manor party-test rendered map plate is still planned, not ready."
  });

  checks.push({
    area: "Map Editor",
    status: (summary.validMaps ?? 0) >= 1 && (summary.mapLayoutWarnings ?? 0) === 0 ? "ready" : "warning",
    detail: `Valid maps: ${summary.validMaps ?? 0}/${summary.totalMaps ?? 0}; layout score: ${summary.mapLayoutScore ?? 0}/100.`
  });

  checks.push({
    area: "Audio",
    status: (summary.audioReady ?? 0) === (summary.audioTotal ?? 0) && (summary.audioTotal ?? 0) > 0 ? "ready" : "warning",
    detail: `Production audio files ready: ${summary.audioReady ?? 0}/${summary.audioTotal ?? 0}. Browser fallback can still carry testing, but production files are not filled.`
  });

  checks.push({
    area: "Promotion Plan",
    status: data.promotion ? "ready" : "warning",
    detail: data.promotion
      ? "Candidate promotion checklist is available."
      : "Run npm run content:promotion to generate candidate promotion steps."
  });

  checks.push({
    area: "P0 Actions",
    status: p0Actions.length ? "blocked" : "ready",
    detail: p0Actions.length
      ? p0Actions.map((action) => `${action.area}: ${action.action}`).join(" ")
      : "No P0 content actions remain."
  });

  checks.push({
    area: "P1 Actions",
    status: p1Actions.length ? "warning" : "ready",
    detail: p1Actions.length
      ? p1Actions.map((action) => `${action.area}: ${action.action}`).join(" ")
      : "No P1 content actions remain."
  });

  checks.push({
    area: "Multiplayer Contract",
    status: "ready",
    detail: "npm run party:readiness runs the multiplayer contract smoke before writing this report."
  });

  checks.push({
    area: "Party Server",
    status: "ready",
    detail: "npm run party:readiness runs the live /host plus /join Socket.IO smoke before writing this report."
  });

  checks.push({
    area: "Railway Deploy",
    status: data.deployCheck?.ready ? "ready" : "warning",
    detail: data.deployCheck?.ready
      ? "Railway deploy config and party server entrypoints pass local deployment checks."
      : "Run npm run party:deploy-check before using Railway for the public join URL."
  });

  return checks;
}

function makeMarkdown(data) {
  const checks = data.checks.map((check) => `| ${check.area} | ${check.status} | ${check.detail} |`).join("\n");
  const setup = data.setupPlan.map((item) => `- ${item}`).join("\n");
  const commands = Object.entries(data.commands).map(([name, command]) => `- ${name}: \`${command}\``).join("\n");
  return `# Party Build Readiness

- Generated: ${data.generatedAt}
- Target: ${data.target}
- Ready: ${data.summary.ready ? "yes" : "no"}
- Blockers: ${data.summary.blocked}
- Warnings: ${data.summary.warnings}

## Checks

| Area | Status | Detail |
|---|---|---|
${checks}

## Setup Plan

${setup}

## Commands

${commands}
`;
}
