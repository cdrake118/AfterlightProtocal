import { mkdir, readFile, writeFile } from "node:fs/promises";

const distRoot = new URL("../dist/", import.meta.url);
const storeRoot = new URL("store/", distRoot);
const storeKitUrl = new URL("store-page-kit.json", storeRoot);
const replayCheckUrl = new URL("replay/replay-link-check.json", distRoot);
const captureJsonUrl = new URL("capture-plan.json", storeRoot);
const captureMarkdownUrl = new URL("capture-plan.md", storeRoot);

function env(name, fallback) {
  return process.env[name] || fallback;
}

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function localCaptureUrl(baseUrl, scenario) {
  const url = new URL(baseUrl);
  url.searchParams.set("map", scenario.parsed.map);
  url.searchParams.set("role", scenario.parsed.role);
  url.searchParams.set("duration", String(scenario.parsed.duration));
  url.searchParams.set("bots", scenario.parsed.bots);
  url.searchParams.set("seed", scenario.parsed.seed);
  return url.href;
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function makeScreenshotShots({ storeKit, replayCheck, baseUrl }) {
  const scenarios = replayCheck.scenarios;
  const scenarioByName = new Map(scenarios.map((scenario) => [scenario.name, scenario]));
  const defaultScenario = scenarioByName.get("default-investigator") ?? scenarios[0];
  const anomalyScenario = scenarioByName.get("anomaly-foundry-intense") ?? scenarios[1] ?? defaultScenario;
  const aquariumScenario = scenarioByName.get("aquarium-short-relaxed") ?? scenarios[2] ?? defaultScenario;

  return [
    {
      id: "steam-screenshot-01-lobby",
      title: "Private Lobby And Role Setup",
      filename: "steam_screenshot_01_lobby_setup.png",
      captureUrl: localCaptureUrl(baseUrl, defaultScenario),
      sourceBrief: storeKit.visualAssetBrief.screenshotList[0],
      setup: "Open the lobby before readying up; show invite code, roster, map, role, round length, and bot pressure.",
      qa: ["No debug overlays", "Invite code readable", "Original Afterlight Protocol identity visible"]
    },
    {
      id: "steam-screenshot-02-reveal",
      title: "Investigator Beam Reveal",
      filename: "steam_screenshot_02_investigator_reveal.png",
      captureUrl: localCaptureUrl(baseUrl, defaultScenario),
      sourceBrief: storeKit.visualAssetBrief.screenshotList[1],
      setup: "Start the round, sweep the flashlight across cover, and capture the anomaly silhouette inside the beam edge.",
      qa: ["Flashlight cone readable", "Anomaly is visible but not centered like a posed character", "HUD meters fit on screen"]
    },
    {
      id: "steam-screenshot-03-team-reveal",
      title: "Team Flashlight Reveal",
      filename: "steam_screenshot_03_team_reveal.png",
      captureUrl: localCaptureUrl(baseUrl, aquariumScenario),
      sourceBrief: storeKit.visualAssetBrief.screenshotList[2],
      setup: "Capture investigators converging on the anomaly with signal pressure, teammate tags, and readable flashlight cones.",
      qa: ["Team coordination is obvious", "Team tags do not overlap prompts", "Map lighting differs from the reveal shot"]
    },
    {
      id: "steam-screenshot-04-anomaly-blackout",
      title: "Anomaly Blackout Counterplay",
      filename: "steam_screenshot_04_anomaly_blackout.png",
      captureUrl: localCaptureUrl(baseUrl, anomalyScenario),
      sourceBrief: storeKit.visualAssetBrief.screenshotList[3],
      setup: "Play as the anomaly, trigger Blackout Wave near investigators, and frame echo decoys.",
      qa: ["Blackout effect reads at thumbnail size", "Echo decoys are visible", "Scene still shows gameplay information"]
    },
    {
      id: "steam-screenshot-05-results",
      title: "Results And Feedback Packet",
      filename: "steam_screenshot_05_results_feedback.png",
      captureUrl: localCaptureUrl(baseUrl, defaultScenario),
      sourceBrief: storeKit.visualAssetBrief.screenshotList[4],
      setup: "Finish a short round and capture results with seed, achievements, tuning notes, and feedback controls.",
      qa: ["Result headline readable", "Seed visible for reproducibility", "No raw JSON textarea covering the results"]
    }
  ];
}

function makeTrailerShots({ storeKit, replayCheck, baseUrl }) {
  const scenarios = replayCheck.scenarios;
  return storeKit.trailerBeatSheet.map((beat, index) => {
    const scenario = scenarios[index % scenarios.length];
    return {
      id: `trailer-beat-${String(index + 1).padStart(2, "0")}`,
      beat,
      captureUrl: localCaptureUrl(baseUrl, scenario),
      suggestedClip: `trailer_beat_${String(index + 1).padStart(2, "0")}_${slug(scenario.name)}.mp4`,
      qa: [
        "No debug overlays",
        "No unlicensed or protected source references",
        "Readable action at 1080p and small embedded-player size"
      ]
    };
  });
}

function makePlan({ storeKit, replayCheck }) {
  const baseUrl = env("CAPTURE_BASE_URL", "http://127.0.0.1:5173/");
  return {
    app: storeKit.app,
    version: storeKit.version,
    generatedAt: new Date().toISOString(),
    baseUrl,
    screenshots: makeScreenshotShots({ storeKit, replayCheck, baseUrl }),
    trailer: {
      targetRuntimeSeconds: 65,
      beats: makeTrailerShots({ storeKit, replayCheck, baseUrl }),
      audioNotes: [
        "Use original music and sound design only.",
        "Mix UI pings, flashlight pressure, blackout, and containment moments clearly.",
        "Keep captions short enough for localization."
      ]
    },
    capsuleArt: {
      direction: storeKit.visualAssetBrief.capsuleDirection,
      requiredSlots: storeKit.visualAssetBrief.requiredSteamAssets.filter((asset) => asset.toLowerCase().includes("capsule") || asset.toLowerCase().includes("hero") || asset.toLowerCase().includes("logo")),
      qa: [
        "Logo remains readable at the smallest Steam capsule slot.",
        "Key art uses original Afterlight Protocol suits, anomaly shapes, props, and typography.",
        "No screenshots, props, poses, or UI elements copied from another franchise."
      ]
    },
    finalQa: [
      "Capture from the target production build when available; browser prototype captures are planning placeholders.",
      "Use the same build version for all screenshots in a submission batch.",
      "Avoid debug overlays, browser chrome, local file paths, and placeholder text.",
      "Confirm screenshots represent actual playable states.",
      "Run the store kit and submission packet after replacing any capture plan assumptions."
    ]
  };
}

function makeMarkdown(plan) {
  const screenshots = plan.screenshots.map((shot) => `### ${shot.title}

- File: \`${shot.filename}\`
- URL: ${shot.captureUrl}
- Brief: ${shot.sourceBrief}
- Setup: ${shot.setup}
- QA: ${shot.qa.join("; ")}
`).join("\n");
  const trailer = plan.trailer.beats.map((beat) => `- ${beat.id}: \`${beat.suggestedClip}\` from ${beat.captureUrl} - ${beat.beat}`).join("\n");
  const audio = plan.trailer.audioNotes.map((item) => `- ${item}`).join("\n");
  const slots = plan.capsuleArt.requiredSlots.map((item) => `- ${item}`).join("\n");
  const capsuleQa = plan.capsuleArt.qa.map((item) => `- ${item}`).join("\n");
  const finalQa = plan.finalQa.map((item) => `- ${item}`).join("\n");

  return `# ${plan.app} Capture Plan

- Version: ${plan.version}
- Generated: ${plan.generatedAt}
- Capture base URL: ${plan.baseUrl}

## Gameplay Screenshots

${screenshots}

## Trailer Capture

- Target runtime: ${plan.trailer.targetRuntimeSeconds}s

${trailer}

### Audio Notes

${audio}

## Capsule Art

${plan.capsuleArt.direction}

### Required Slots

${slots}

### Capsule QA

${capsuleQa}

## Final QA

${finalQa}
`;
}

const [storeKit, replayCheck] = await Promise.all([
  readJson(storeKitUrl),
  readJson(replayCheckUrl)
]);
const plan = makePlan({ storeKit, replayCheck });

await mkdir(storeRoot, { recursive: true });
await writeFile(captureJsonUrl, `${JSON.stringify(plan, null, 2)}\n`);
await writeFile(captureMarkdownUrl, makeMarkdown(plan));

console.log("Capture plan written to dist/store/capture-plan.json and dist/store/capture-plan.md");
