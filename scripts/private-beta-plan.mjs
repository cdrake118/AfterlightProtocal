import { mkdir, readFile, writeFile } from "node:fs/promises";

const distRoot = new URL("../dist/", import.meta.url);
const playtestRoot = new URL("playtest/", distRoot);
const releaseReportUrl = new URL("release-report.json", distRoot);
const playtestJsonUrl = new URL("private-beta-plan.json", playtestRoot);
const playtestMarkdownUrl = new URL("private-beta-plan.md", playtestRoot);

function env(name, fallback) {
  return process.env[name] || fallback;
}

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function gateSummary(gates) {
  const failed = gates.filter((gate) => gate.status === "fail");
  const manual = gates.filter((gate) => gate.status === "manual");
  return {
    passed: gates.length - failed.length - manual.length,
    manual: manual.length,
    failed: failed.length,
    ready: failed.length === 0
  };
}

function makePlan(report) {
  const targetBranch = env("PLAYTEST_BRANCH", "private-beta");
  const waveSize = parsePositiveInt(env("PLAYTEST_WAVE_SIZE", "10"), 10);
  const feedbackUrl = env("PLAYTEST_FEEDBACK_URL", "TBD");
  const feedbackMode = env("PLAYTEST_FEEDBACK_MODE", feedbackUrl === "TBD" ? "local-archive" : "url");
  const feedbackInbox = env("PLAYTEST_FEEDBACK_DIR", "playtest-feedback-inbox");
  const gates = gateSummary(report.gates);
  const branchCommandPrefix = `STEAM_BRANCH=${targetBranch}`;

  return {
    app: report.app,
    version: report.version,
    generatedAt: new Date().toISOString(),
    targetBranch,
    sourceBranch: report.steam.branch,
    waveSize,
    feedbackUrl,
    feedbackMode,
    feedbackInbox,
    releaseReport: "dist/release-report.json",
    uploadReport: "dist/steam/steam-upload-report.json",
    readiness: {
      releaseGates: gates,
      appIdConfigured: report.steam.appId !== "000000",
      depotIdConfigured: report.steam.depotId !== "000001",
      uploadMode: report.steamUpload.mode,
      redactedCommand: report.steamUpload.command.includes("<redacted>")
    },
    commands: {
      refreshReportForBeta: `${branchCommandPrefix} npm run release:report`,
      dryRunBetaUpload: `${branchCommandPrefix} npm run steam:upload:dry-run`,
      realBetaUpload: `STEAM_UPLOAD=1 ${branchCommandPrefix} npm run steam:upload`
    },
    testerPacket: [
      "Install the private beta branch through Steam access keys or tester package access.",
      "Play at least one full round as Investigator and one full round as Anomaly.",
      "Try Host Lobby, Quick Join, Browse, Join Code, Ready, How to Play, Net Log, and Sound.",
      "Record role, map, match result, disconnects, input device, frame pacing issues, and any confusing UI moments.",
      feedbackMode === "url"
        ? "Submit feedback with screenshots or short clips to the configured feedback URL when possible."
        : "Save copied feedback packet JSON or exported report archives into the local feedback inbox."
    ],
    focusAreas: [
      "Lobby and invite clarity",
      "Flashlight readability and anomaly counterplay",
      "Ability feedback and cooldown comprehension",
      "Controller prompts and keyboard prompts",
      "Net Log usefulness during connection confusion",
      "Round length, comeback chances, and results screen clarity"
    ],
    promotionCriteria: [
      "All release report gates pass.",
      "No crash or load failure reports from the current tester wave.",
      "At least 80 percent of testers can start a match without assistance.",
      "Average round feedback identifies tuning issues rather than basic control confusion.",
      "No unresolved IP, trademark, or external-runtime audit failures.",
      "Steam app id, depot id, package access, and private branch are configured before external testers are invited."
    ],
    knownRisks: [
      "Browser prototype uses local mock lobbies and loopback transport, not real Steam networking yet.",
      "Steam app and depot ids remain placeholders until Steamworks setup is complete.",
      "Real upload requires SteamCMD credentials and Steam Guard policy that can support automation.",
      "AAA visual target will require a native engine art and rendering pass beyond this browser prototype."
    ]
  };
}

function makeMarkdown(plan) {
  const readiness = [
    `- Release gates: ${plan.readiness.releaseGates.passed} passed, ${plan.readiness.releaseGates.manual} manual, ${plan.readiness.releaseGates.failed} failed`,
    `- Steam app id configured: ${plan.readiness.appIdConfigured ? "yes" : "no"}`,
    `- Steam depot id configured: ${plan.readiness.depotIdConfigured ? "yes" : "no"}`,
    `- Upload mode: ${plan.readiness.uploadMode}`,
    `- Redacted upload command: ${plan.readiness.redactedCommand ? "yes" : "no"}`
  ].join("\n");
  const commands = Object.entries(plan.commands)
    .map(([name, command]) => `- ${name}: \`${command}\``)
    .join("\n");
  const testerPacket = plan.testerPacket.map((item) => `- ${item}`).join("\n");
  const focusAreas = plan.focusAreas.map((item) => `- ${item}`).join("\n");
  const promotionCriteria = plan.promotionCriteria.map((item) => `- ${item}`).join("\n");
  const knownRisks = plan.knownRisks.map((item) => `- ${item}`).join("\n");

  return `# ${plan.app} Private Beta Plan

- Version: ${plan.version}
- Generated: ${plan.generatedAt}
- Target branch: ${plan.targetBranch}
- Report branch: ${plan.sourceBranch}
- First wave size: ${plan.waveSize}
- Feedback URL: ${plan.feedbackUrl}
- Feedback mode: ${plan.feedbackMode}
- Local feedback inbox: ${plan.feedbackInbox}

## Readiness

${readiness}

## Commands

${commands}

## Tester Packet

${testerPacket}

## Focus Areas

${focusAreas}

## Promotion Criteria

${promotionCriteria}

## Known Risks

${knownRisks}
`;
}

const report = await readJson(releaseReportUrl);
const plan = makePlan(report);

await mkdir(playtestRoot, { recursive: true });
await writeFile(playtestJsonUrl, `${JSON.stringify(plan, null, 2)}\n`);
await writeFile(playtestMarkdownUrl, makeMarkdown(plan));

console.log(`Private beta plan written to dist/playtest/private-beta-plan.json and dist/playtest/private-beta-plan.md`);
