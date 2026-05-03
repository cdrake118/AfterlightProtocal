import { mkdir, readFile, writeFile } from "node:fs/promises";

const distRoot = new URL("../dist/", import.meta.url);
const playtestRoot = new URL("playtest/", distRoot);
const playtestPlanUrl = new URL("private-beta-plan.json", playtestRoot);
const intakeJsonUrl = new URL("feedback-intake.json", playtestRoot);
const intakeMarkdownUrl = new URL("feedback-intake.md", playtestRoot);
const samplePacketUrl = new URL("sample-feedback-packet.json", playtestRoot);

function env(name, fallback) {
  return process.env[name] || fallback;
}

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function normalizeMode(value, feedbackUrl) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "url" || normalized === "local-archive") {
    return normalized;
  }
  return feedbackUrl && feedbackUrl !== "TBD" ? "url" : "local-archive";
}

function makeSamplePacket(plan) {
  return {
    build: {
      app: plan.app,
      version: plan.version,
      target: "web-static"
    },
    testerReport: {
      severity: "low | medium | high | blocking",
      summary: "Short description of the issue or tuning note.",
      reproductionSteps: "Steps the tester took before the issue happened.",
      expectedResult: "What the tester expected.",
      actualResult: "What happened instead.",
      inputDevice: "keyboard | gamepad | unknown",
      screenshotOrClip: "Filename, URL, or none"
    },
    session: {
      role: "Investigator",
      map: "Observatory Annex",
      seed: "00000001",
      outcome: "Investigators contained the anomaly",
      replayUrl: "Paste the Copy Replay Link value here."
    },
    stats: {},
    tuningNotes: []
  };
}

function makeIntake(plan) {
  const feedbackUrl = plan.feedbackUrl === "TBD" ? "" : plan.feedbackUrl;
  const mode = normalizeMode(env("PLAYTEST_FEEDBACK_MODE", ""), feedbackUrl);
  const inboxDirectory = env("PLAYTEST_FEEDBACK_DIR", "playtest-feedback-inbox");
  const samplePacket = makeSamplePacket(plan);

  return {
    app: plan.app,
    version: plan.version,
    generatedAt: new Date().toISOString(),
    targetBranch: plan.targetBranch,
    mode,
    ready: mode === "local-archive" || Boolean(feedbackUrl),
    feedbackUrl: mode === "url" ? feedbackUrl : null,
    localArchive: {
      inboxDirectory,
      acceptedFiles: [
        "single feedback packet JSON copied from the results screen",
        "saved report archive JSON copied from Reports > Export"
      ],
      mergePath: "Open Reports, choose Import, paste an exported archive, then Merge.",
      namingPattern: "YYYY-MM-DD_tester_seed_or_issue.json"
    },
    testerSteps: [
      "Finish a round and open the results screen.",
      "Use Copy Packet for one issue or Reports > Export for a batch of rounds.",
      mode === "url"
        ? "Submit the JSON payload to the configured feedback URL."
        : "Save the JSON payload into the local feedback inbox folder.",
      "Include screenshots or short clips when the tester report references visual or input issues.",
      "Keep the replay link or seed with every issue so the round setup can be reproduced."
    ],
    triageSteps: [
      "Sort reports by severity, then group repeated seeds and replay links.",
      "Import archive files through the Reports panel before reproducing a bug.",
      "Prioritize blocking launch/load issues, then lobby/session issues, then tuning notes.",
      "Attach accepted fixes or tuning decisions to the original report id."
    ],
    requiredFields: Object.keys(samplePacket.testerReport),
    samplePacket
  };
}

function makeMarkdown(intake) {
  const testerSteps = intake.testerSteps.map((item) => `- ${item}`).join("\n");
  const triageSteps = intake.triageSteps.map((item) => `- ${item}`).join("\n");
  const acceptedFiles = intake.localArchive.acceptedFiles.map((item) => `- ${item}`).join("\n");
  const requiredFields = intake.requiredFields.map((item) => `- \`${item}\``).join("\n");

  return `# ${intake.app} Feedback Intake

- Version: ${intake.version}
- Generated: ${intake.generatedAt}
- Target branch: ${intake.targetBranch}
- Mode: ${intake.mode}
- Ready: ${intake.ready ? "yes" : "no"}
- Feedback URL: ${intake.feedbackUrl ?? "local archive handoff"}
- Local inbox: \`${intake.localArchive.inboxDirectory}\`

## Tester Steps

${testerSteps}

## Accepted Local Files

${acceptedFiles}

## Triage Steps

${triageSteps}

## Required Tester Report Fields

${requiredFields}

## Local Merge Path

${intake.localArchive.mergePath}
`;
}

const plan = await readJson(playtestPlanUrl);
const intake = makeIntake(plan);

await mkdir(playtestRoot, { recursive: true });
await writeFile(intakeJsonUrl, `${JSON.stringify(intake, null, 2)}\n`);
await writeFile(intakeMarkdownUrl, makeMarkdown(intake));
await writeFile(samplePacketUrl, `${JSON.stringify(intake.samplePacket, null, 2)}\n`);

console.log(`Feedback intake written to dist/playtest/feedback-intake.json and dist/playtest/feedback-intake.md`);
