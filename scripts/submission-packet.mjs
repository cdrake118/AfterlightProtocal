import { mkdir, readFile, writeFile } from "node:fs/promises";

const distRoot = new URL("../dist/", import.meta.url);
const submissionRoot = new URL("submission/", distRoot);
const releaseReportUrl = new URL("release-report.json", distRoot);
const playtestPlanUrl = new URL("playtest/private-beta-plan.json", distRoot);
const feedbackIntakeUrl = new URL("playtest/feedback-intake.json", distRoot);
const storeKitUrl = new URL("store/store-page-kit.json", distRoot);
const capturePlanUrl = new URL("store/capture-plan.json", distRoot);
const localizationKitUrl = new URL("localization/source-strings.json", distRoot);
const configCheckUrl = new URL("config/platform-config-check.json", distRoot);
const inputActionMapUrl = new URL("input/input-action-map.json", distRoot);
const networkProtocolUrl = new URL("network/network-protocol.json", distRoot);
const replayLinkCheckUrl = new URL("replay/replay-link-check.json", distRoot);
const submissionJsonUrl = new URL("submission-packet.json", submissionRoot);
const submissionMarkdownUrl = new URL("submission-packet.md", submissionRoot);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function countByStatus(gates) {
  return gates.reduce((counts, gate) => {
    counts[gate.status] = (counts[gate.status] ?? 0) + 1;
    return counts;
  }, {});
}

function makeSubmissionPacket({ release, playtest, feedbackIntake, store, capture, localization, config, input, protocol, replay }) {
  const gateCounts = countByStatus(release.gates);
  const blockers = config.blockers.map((blocker) => blocker.replace(" is placeholder.", " must be replaced before real Steam submission or external tester upload."));
  const manualPrerequisites = [
    ...config.uploadPrerequisites,
    ...config.betaPrerequisites
  ];

  return {
    app: store.app,
    version: release.version,
    generatedAt: new Date().toISOString(),
    target: release.target,
    readiness: {
      releaseGateCount: release.gates.length,
      gateCounts,
      allReleaseGatesPass: release.gates.every((gate) => gate.status === "pass"),
      steamAppConfigured: release.steam.appId !== "000000",
      steamDepotConfigured: release.steam.depotId !== "000001",
      readyForRealUpload: config.readyForRealUpload,
      inputActionSets: input.actionSets.length,
      networkMessages: protocol.messages.length,
      replayScenarios: replay.scenarios.length,
      replayLinksValid: replay.valid,
      localizationStringCount: localization.strings.length,
      targetLanguageCount: localization.targetLanguages.length,
      storePageState: store.pageState,
      captureScreenshotCount: capture.screenshots.length,
      captureTrailerBeatCount: capture.trailer.beats.length,
      playtestBranch: playtest.targetBranch,
      playtestWaveSize: playtest.waveSize,
      feedbackIntakeMode: feedbackIntake.mode,
      feedbackIntakeReady: feedbackIntake.ready
    },
    artifacts: {
      releaseReport: "dist/release-report.md",
      steamUploadReport: "dist/steam/steam-upload-report.json",
      platformConfigCheck: "dist/config/platform-config-check.md",
      inputActionMap: "dist/input/input-action-map.md",
      networkProtocol: "dist/network/network-protocol.md",
      replayLinkCheck: "dist/replay/replay-link-check.md",
      privateBetaPlan: "dist/playtest/private-beta-plan.md",
      feedbackIntake: "dist/playtest/feedback-intake.md",
      sampleFeedbackPacket: "dist/playtest/sample-feedback-packet.json",
      storePageKit: "dist/store/store-page-kit.md",
      capturePlan: "dist/store/capture-plan.md",
      localizationBrief: "dist/localization/localization-brief.md"
    },
    commands: {
      verifyRuntime: "npm run check",
      refreshSubmissionPacket: "npm run submission:packet",
      dryRunSteamUpload: "npm run steam:upload:dry-run",
      realSteamUpload: "STEAM_UPLOAD=1 npm run steam:upload",
      betaBranchDryRun: `STEAM_BRANCH=${playtest.targetBranch} npm run steam:upload:dry-run`,
      betaBranchUpload: `STEAM_UPLOAD=1 STEAM_BRANCH=${playtest.targetBranch} npm run steam:upload`,
      refreshFeedbackIntake: "npm run playtest:intake",
      refreshCapturePlan: "npm run store:capture"
    },
    blockers,
    manualPrerequisites,
    nextActions: [
      "Complete Steamworks app, package, depot, and private branch setup.",
      "Configure real Steam app/depot ids and run the beta branch dry run.",
      "Capture production-quality screenshots and trailer footage from the target build.",
      "Produce capsule and library art from the store kit visual brief.",
      "Send localization source strings to translators and review glossary-sensitive terms.",
      "Invite the first private beta wave only after tester access and feedback intake are available."
    ],
    snapshots: {
      releaseGates: release.gates,
      platformAdapters: release.platformAdapters,
      inputActionSets: input.actionSets.map((set) => set.name),
      networkReliability: protocol.reliabilityPolicy,
      networkMessages: protocol.messages.map((message) => ({
        type: message.type,
        direction: message.direction,
        reliability: message.reliability
      })),
      replayLinkScenarios: replay.scenarios.map((scenario) => ({
        name: scenario.name,
        map: scenario.parsed.map,
        role: scenario.parsed.role,
        duration: scenario.parsed.duration,
        bots: scenario.parsed.bots,
        seed: scenario.parsed.seed
      })),
      feedbackIntake: {
        mode: feedbackIntake.mode,
        ready: feedbackIntake.ready,
        targetBranch: feedbackIntake.targetBranch,
        inboxDirectory: feedbackIntake.localArchive.inboxDirectory,
        feedbackUrl: feedbackIntake.feedbackUrl
      },
      capturePlan: {
        baseUrl: capture.baseUrl,
        screenshotFiles: capture.screenshots.map((shot) => shot.filename),
        trailerClips: capture.trailer.beats.map((beat) => beat.suggestedClip),
        capsuleSlots: capture.capsuleArt.requiredSlots
      },
      storeTags: store.steamTags,
      targetLanguages: localization.targetLanguages,
      knownRisks: playtest.knownRisks
    },
    configChecks: {
      readyForDryRun: config.readyForDryRun,
      readyForRealUpload: config.readyForRealUpload,
      checks: config.checks
    }
  };
}

function makeMarkdown(packet) {
  const gateCounts = Object.entries(packet.readiness.gateCounts)
    .map(([status, count]) => `- ${status}: ${count}`)
    .join("\n");
  const artifacts = Object.entries(packet.artifacts)
    .map(([name, path]) => `- ${name}: \`${path}\``)
    .join("\n");
  const commands = Object.entries(packet.commands)
    .map(([name, command]) => `- ${name}: \`${command}\``)
    .join("\n");
  const blockers = packet.blockers.length
    ? packet.blockers.map((item) => `- ${item}`).join("\n")
    : "- None";
  const manualPrerequisites = packet.manualPrerequisites.length
    ? packet.manualPrerequisites.map((item) => `- ${item}`).join("\n")
    : "- None";
  const nextActions = packet.nextActions.map((item) => `- ${item}`).join("\n");
  const adapters = packet.snapshots.platformAdapters.map((item) => `- ${item}`).join("\n");
  const inputActionSets = packet.snapshots.inputActionSets.map((item) => `- ${item}`).join("\n");
  const networkMessages = packet.snapshots.networkMessages.map((message) => `- \`${message.type}\`: ${message.direction}, ${message.reliability}`).join("\n");
  const replayScenarios = packet.snapshots.replayLinkScenarios
    .map((scenario) => `- ${scenario.name}: ${scenario.map}, ${scenario.role}, ${scenario.duration}s, ${scenario.bots}, seed ${scenario.seed}`)
    .join("\n");
  const tags = packet.snapshots.storeTags.map((item) => `- ${item}`).join("\n");
  const screenshots = packet.snapshots.capturePlan.screenshotFiles.map((item) => `- \`${item}\``).join("\n");
  const trailerClips = packet.snapshots.capturePlan.trailerClips.map((item) => `- \`${item}\``).join("\n");
  const languages = packet.snapshots.targetLanguages.map((item) => `- ${item}`).join("\n");
  const risks = packet.snapshots.knownRisks.map((item) => `- ${item}`).join("\n");

  return `# ${packet.app} Submission Packet

- Version: ${packet.version}
- Generated: ${packet.generatedAt}
- Target: ${packet.target}
- Store page state: ${packet.readiness.storePageState}
- Capture plan: ${packet.readiness.captureScreenshotCount} screenshots, ${packet.readiness.captureTrailerBeatCount} trailer beats
- Playtest branch: ${packet.readiness.playtestBranch}
- First beta wave size: ${packet.readiness.playtestWaveSize}
- Feedback intake: ${packet.readiness.feedbackIntakeMode} (${packet.readiness.feedbackIntakeReady ? "ready" : "not ready"})
- Input action sets: ${packet.readiness.inputActionSets}
- Network messages: ${packet.readiness.networkMessages}
- Replay link scenarios: ${packet.readiness.replayScenarios}
- Localization strings: ${packet.readiness.localizationStringCount}

## Readiness

- All release gates pass: ${packet.readiness.allReleaseGatesPass ? "yes" : "no"}
- Steam app configured: ${packet.readiness.steamAppConfigured ? "yes" : "no"}
- Steam depot configured: ${packet.readiness.steamDepotConfigured ? "yes" : "no"}
- Ready for real upload: ${packet.readiness.readyForRealUpload ? "yes" : "no"}
- Replay links valid: ${packet.readiness.replayLinksValid ? "yes" : "no"}

### Gate Counts

${gateCounts}

## Blockers

${blockers}

## Manual Prerequisites

${manualPrerequisites}

## Artifacts

${artifacts}

## Commands

${commands}

## Next Actions

${nextActions}

## Platform Adapters

${adapters}

## Input Action Sets

${inputActionSets}

## Network Messages

${networkMessages}

## Replay Link Scenarios

${replayScenarios}

## Feedback Intake

- Mode: ${packet.snapshots.feedbackIntake.mode}
- Ready: ${packet.snapshots.feedbackIntake.ready ? "yes" : "no"}
- Local inbox: \`${packet.snapshots.feedbackIntake.inboxDirectory}\`
- Feedback URL: ${packet.snapshots.feedbackIntake.feedbackUrl ?? "local archive handoff"}

## Capture Plan

- Base URL: ${packet.snapshots.capturePlan.baseUrl}

### Screenshot Files

${screenshots}

### Trailer Clips

${trailerClips}

## Store Tags

${tags}

## Target Languages

${languages}

## Known Risks

${risks}
`;
}

const [release, playtest, feedbackIntake, store, capture, localization, config, input, protocol, replay] = await Promise.all([
  readJson(releaseReportUrl),
  readJson(playtestPlanUrl),
  readJson(feedbackIntakeUrl),
  readJson(storeKitUrl),
  readJson(capturePlanUrl),
  readJson(localizationKitUrl),
  readJson(configCheckUrl),
  readJson(inputActionMapUrl),
  readJson(networkProtocolUrl),
  readJson(replayLinkCheckUrl)
]);
const packet = makeSubmissionPacket({ release, playtest, feedbackIntake, store, capture, localization, config, input, protocol, replay });

await mkdir(submissionRoot, { recursive: true });
await writeFile(submissionJsonUrl, `${JSON.stringify(packet, null, 2)}\n`);
await writeFile(submissionMarkdownUrl, makeMarkdown(packet));

console.log("Submission packet written to dist/submission/submission-packet.json and dist/submission/submission-packet.md");
