import { mkdir, readFile, writeFile } from "node:fs/promises";

const distRoot = new URL("../dist/", import.meta.url);
const storeRoot = new URL("store/", distRoot);
const releaseReportUrl = new URL("release-report.json", distRoot);
const playtestPlanUrl = new URL("playtest/private-beta-plan.json", distRoot);
const storeJsonUrl = new URL("store-page-kit.json", storeRoot);
const storeMarkdownUrl = new URL("store-page-kit.md", storeRoot);

const blockedTerms = [
  "mario",
  "luigi",
  "nintendo",
  "wii",
  "ghost mansion"
];

function env(name, fallback) {
  return process.env[name] || fallback;
}

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function assertOriginalCopy(text) {
  const normalized = text.toLowerCase();
  const found = blockedTerms.filter((term) => normalized.includes(term));
  if (found.length) {
    throw new Error(`Blocked store copy term(s): ${found.join(", ")}`);
  }
}

function makeKit({ release, playtest }) {
  const pageState = env("STORE_PAGE_STATE", "draft");
  const targetLanguages = env("STORE_LANGUAGES", "English,French,German,Spanish - Latin America,Japanese")
    .split(",")
    .map((language) => language.trim())
    .filter(Boolean);

  return {
    app: release.app.replace(" Prototype", ""),
    version: release.version,
    generatedAt: new Date().toISOString(),
    pageState,
    targetBranch: playtest.targetBranch,
    releaseGates: release.gates,
    positioning: {
      shortDescription: "A short-round asymmetric light-and-shadow arena game where investigators coordinate under pressure while one hidden anomaly stalks the facility.",
      oneLinePitch: "Coordinate, reveal, and contain the unseen before the lights fail.",
      audience: [
        "Players who like short social horror rounds",
        "Teams that enjoy communication-heavy objectives",
        "Solo testers who want bot-supported asymmetric practice"
      ],
      differentiators: [
        "Readable proximity pressure through signal, lighting, and sound cues",
        "Host-authoritative multiplayer architecture planned from the prototype stage",
        "Original paranormal science setting built around optical instruments and unstable research sites",
        "Built-in playtest feedback packets for faster beta iteration"
      ]
    },
    storeCopy: {
      about: [
        "Afterlight Protocol is an asymmetric party-horror arena game about containment under bad information.",
        "A team of investigators enters unstable research sites with calibrated light tools and limited battery reserves. Somewhere in the dark, a hidden anomaly watches for weak angles, isolated players, and moments when the team overextends.",
        "Rounds are short, tense, and readable. Investigators win by tracking and draining the anomaly's health. The anomaly wins by collapsing the team's resolve before containment is complete."
      ],
      featureBullets: [
        "One hidden anomaly against a coordinated investigator team",
        "Five-minute rounds built for immediate rematches",
        "Flashlight pressure, battery routing, revives, and blackout counterplay",
        "Original arenas with walls, props, and line-of-sight breaks that shape each hunt",
        "Keyboard/mouse and standard gamepad support",
        "Mock lobby, invite-code, presence, stats, achievements, cosmetics, and feedback adapters ready for platform integration"
      ],
      earlyAccessNote: "The current prototype validates the match loop, lobby flow, platform adapter boundaries, and release automation. Real online transport and final AAA-quality art production remain separate production milestones."
    },
    steamTags: [
      "Asymmetric Multiplayer",
      "Horror",
      "Stealth",
      "Team-Based",
      "Party Game",
      "PvP",
      "Atmospheric",
      "Controller"
    ],
    visualAssetBrief: {
      capsuleDirection: "Show investigator silhouettes sweeping precise cones of light through a research facility while a refracted anomaly shape interrupts the beam path. Keep the logo readable at small sizes.",
      screenshotList: [
        "Lobby with invite code, roster, map, and role selection visible",
        "Investigator beam revealing the anomaly near cover",
        "Investigator team coordinating a flashlight reveal with team tags visible",
        "Anomaly perspective during blackout with echo decoys visible",
        "Results panel with achievements and feedback packet controls"
      ],
      requiredSteamAssets: [
        "Header capsule",
        "Small capsule",
        "Main capsule",
        "Vertical capsule",
        "Library capsule",
        "Library hero",
        "Logo transparent PNG",
        "At least five gameplay screenshots",
        "One gameplay trailer"
      ]
    },
    trailerBeatSheet: [
      "0-5s: Title, unstable facility exterior, signal spike.",
      "5-15s: Investigator team enters, light cones and battery routing established.",
      "15-28s: Flashlight sweep reveals the anomaly for a split second.",
      "28-42s: Anomaly counters with blackout, isolation, and echo decoys.",
      "42-55s: Team revive, final chase, escalating timer.",
      "55-65s: Match result, quick rematch energy, wishlist callout."
    ],
    localizationPlan: {
      targetLanguages,
      firstPassScope: [
        "Store short description",
        "About section",
        "Feature bullets",
        "Trailer captions",
        "How to Play panel",
        "Lobby and results UI",
        "Controller prompt labels"
      ],
      glossary: {
        anomaly: "The hidden opposing role; keep as a scientific/paranormal term.",
        investigator: "The coordinated team role.",
        resolve: "Team health/morale resource.",
        stability: "Anomaly health/resource."
      }
    },
    releaseChecklist: [
      "Replace placeholder Steam app and depot ids.",
      "Upload a private beta branch and validate tester access.",
      "Capture screenshots from the target production build, not only the browser prototype.",
      "Produce capsule art at all Steam-required sizes from one consistent key art direction.",
      "Record trailer footage with final UI, final audio mix, and no debug overlays.",
      "Run release report, upload dry run, private beta plan, and store kit before store page submission.",
      "Review store copy for IP, trademark, external dependency, and unsupported feature claims.",
      "Localize the store page before Next Fest or wider beta outreach."
    ],
    knownRisks: playtest.knownRisks
  };
}

function makeMarkdown(kit) {
  const features = kit.storeCopy.featureBullets.map((item) => `- ${item}`).join("\n");
  const tags = kit.steamTags.map((item) => `- ${item}`).join("\n");
  const screenshots = kit.visualAssetBrief.screenshotList.map((item) => `- ${item}`).join("\n");
  const steamAssets = kit.visualAssetBrief.requiredSteamAssets.map((item) => `- ${item}`).join("\n");
  const trailer = kit.trailerBeatSheet.map((item) => `- ${item}`).join("\n");
  const languages = kit.localizationPlan.targetLanguages.map((item) => `- ${item}`).join("\n");
  const localizationScope = kit.localizationPlan.firstPassScope.map((item) => `- ${item}`).join("\n");
  const checklist = kit.releaseChecklist.map((item) => `- ${item}`).join("\n");
  const risks = kit.knownRisks.map((item) => `- ${item}`).join("\n");

  return `# ${kit.app} Store Page Kit

- Version: ${kit.version}
- Generated: ${kit.generatedAt}
- Page state: ${kit.pageState}
- Target beta branch: ${kit.targetBranch}

## Positioning

${kit.positioning.oneLinePitch}

${kit.positioning.shortDescription}

## About

${kit.storeCopy.about.join("\n\n")}

## Features

${features}

## Steam Tags

${tags}

## Visual Asset Brief

${kit.visualAssetBrief.capsuleDirection}

### Screenshots

${screenshots}

### Required Steam Assets

${steamAssets}

## Trailer Beat Sheet

${trailer}

## Localization Plan

### Target Languages

${languages}

### First Pass Scope

${localizationScope}

## Release Checklist

${checklist}

## Known Risks

${risks}
`;
}

const [release, playtest] = await Promise.all([
  readJson(releaseReportUrl),
  readJson(playtestPlanUrl)
]);
const kit = makeKit({ release, playtest });
const markdown = makeMarkdown(kit);

assertOriginalCopy(`${JSON.stringify(kit)}\n${markdown}`);

await mkdir(storeRoot, { recursive: true });
await writeFile(storeJsonUrl, `${JSON.stringify(kit, null, 2)}\n`);
await writeFile(storeMarkdownUrl, markdown);

console.log("Store page kit written to dist/store/store-page-kit.json and dist/store/store-page-kit.md");
