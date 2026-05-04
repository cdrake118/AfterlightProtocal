import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const distRoot = resolve(root, "dist", "party");
const jsonPath = join(distRoot, "party-content-punchlist.json");
const markdownPath = join(distRoot, "party-content-punchlist.md");

const content = await readOptional("dist/content/content-pipeline-report.json");
const readiness = await readOptional("dist/party/party-build-readiness.json");
const punchlist = makePunchlist({ content, readiness });

await mkdir(distRoot, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(punchlist, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(punchlist));

console.log(`party content punchlist ok: ${punchlist.summary.openItems} open items`);
console.log(`wrote ${relative(root, jsonPath)} and ${relative(root, markdownPath)}`);

async function readOptional(path) {
  try {
    return JSON.parse(await readFile(resolve(root, path), "utf8"));
  } catch {
    return null;
  }
}

function makePunchlist({ content, readiness }) {
  const contentActions = content?.nextActions ?? [];
  const readinessChecks = readiness?.checks ?? [];
  const actions = contentActions.length
    ? contentActions
    : [{
      priority: "P0",
      area: "Content Review",
      action: "Run the content review pipeline to generate the current production blockers.",
      command: "npm run content:review",
      doneWhen: "dist/content/content-pipeline-report.json exists.",
      source: "docs/CONTENT_PIPELINE.md"
    }];
  const items = actions.map((action) => expandAction(action, content));
  const blockedChecks = readinessChecks.filter((check) => check.status === "blocked");
  const warningChecks = readinessChecks.filter((check) => check.status === "warning");

  return {
    app: "Afterlight Protocol",
    generatedAt: new Date().toISOString(),
    target: readiness?.target ?? "Next-weekend couch party build",
    purpose: "Producer-facing list of the remaining content assets needed for the laptop plus phone-controller party build.",
    summary: {
      ready: readiness?.summary?.ready ?? false,
      openItems: items.length,
      p0: items.filter((item) => item.priority === "P0").length,
      p1: items.filter((item) => item.priority === "P1").length,
      partyBlockers: blockedChecks.length,
      partyWarnings: warningChecks.length
    },
    board: {
      now: items.filter((item) => item.priority === "P0"),
      next: items.filter((item) => item.priority === "P1"),
      later: items.filter((item) => !["P0", "P1"].includes(item.priority))
    },
    partyChecks: readinessChecks.map((check) => ({
      area: check.area,
      status: check.status,
      detail: check.detail
    })),
    setupCommands: {
      refresh: "npm run party:readiness",
      reviewContent: "npm run content:review",
      serveHost: "npm run serve:party",
      remoteSmoke: "npm run party:remote-smoke -- --url https://YOUR-RAILWAY-DOMAIN"
    }
  };
}

function expandAction(action, content) {
  const area = action.area;
  const preset = presets()[area] ?? presets().Default;
  return {
    priority: action.priority,
    area,
    status: action.priority === "P0" ? "blocked" : "warning",
    action: action.action,
    assetNeed: preset.assetNeed,
    acceptance: preset.acceptance,
    handoff: action.source,
    auditCommand: action.command,
    candidateCommand: preset.candidateCommand,
    installCommand: preset.installCommand,
    doneWhen: action.doneWhen,
    currentCounts: currentCountsFor(area, content),
    ownerHint: preset.ownerHint
  };
}

function presets() {
  return {
    "Character Art": {
      assetNeed: "One cleaned investigator sprite atlas: transparent PNG plus matching atlas JSON with fixed frame size, stable foot anchors, and no cropped feet.",
      acceptance: [
        "PNG has alpha transparency and fixed production frames.",
        "Atlas JSON validates without errors.",
        "Preview SVG shows stable anchors, visible feet, safe padding, and no original placeholder body behind the sprite.",
        "Runtime manifest includes anomaly plus investigator atlas."
      ],
      candidateCommand: "npm run assets:atlas-candidate -- incoming/characters/investigator-clean.png --id investigator-production-atlas --role investigator",
      installCommand: "npm run assets:atlas-install -- incoming/characters/investigator-clean.png --atlas dist/assets/atlas-candidates/investigator-production-atlas.atlas.json --brief investigator-production-atlas --dry-run",
      ownerHint: "Art pipeline or Aseprite cleanup"
    },
    "Map Art": {
      assetNeed: "One rendered Manor party-test map plate that matches the Tiled pixel bounds and supports readable collision, props, spawns, labels, and battery placement.",
      acceptance: [
        "PNG dimensions match the map-art manifest exactly.",
        "Map art is local under assets/maps/ and referenced by a Tiled image layer.",
        "Tiled preview shows art underneath collision, spawn, label, prop, and battery overlays.",
        "Map validation and layout audit remain clean."
      ],
      candidateCommand: "npm run maps:art-candidate -- incoming/maps/manor-party-render.png --map-id manor-party-render",
      installCommand: "npm run maps:art-install -- incoming/maps/manor-party-render.png --map-id manor-party-render --dry-run",
      ownerHint: "Map art or Tiled pass"
    },
    Audio: {
      assetNeed: "Mastered OGG/MP3 music and SFX files for the manifest slots, starting with player-critical SFX before ambience loops.",
      acceptance: [
        "Each file matches a manifest slot and browser-safe format.",
        "Loops have clean starts and seamless repeats.",
        "One-shots are trimmed and readable on TV and phone speakers.",
        "Audio audit reports every installed slot as ready."
      ],
      candidateCommand: "npm run audio:candidate -- incoming/audio/flashlight-on.ogg --slot flashlight_on",
      installCommand: "npm run audio:install -- incoming/audio/flashlight-on.ogg --slot flashlight_on --dry-run",
      ownerHint: "Sound design and mix pass"
    },
    "Map Editor": {
      assetNeed: "A valid Tiled map source with required object layers, clean collision, spawns, props, batteries, and labels.",
      acceptance: [
        "Required object layers exist.",
        "Spawns and batteries are outside collision.",
        "Preview is readable without opening runtime.",
        "Validation reports zero errors."
      ],
      candidateCommand: "npm run maps:new -- --id manor-v2 --image incoming/maps/manor-v2.png --dry-run",
      installCommand: "npm run maps:new -- --id manor-v2 --image incoming/maps/manor-v2.png",
      ownerHint: "Tiled authoring"
    },
    Default: {
      assetNeed: "Production-readiness task from the generated content report.",
      acceptance: ["Complete the content report action and rerun party readiness."],
      candidateCommand: "npm run content:intake",
      installCommand: "npm run content:promotion",
      ownerHint: "Production QA"
    }
  };
}

function currentCountsFor(area, content) {
  const summary = content?.summary ?? {};
  if (area === "Character Art") {
    return {
      runtimeAtlases: summary.characterRuntimeAtlases ?? 0,
      productionReadyPngs: summary.characterRuntimePngs ?? 0,
      totalPngs: summary.characterPngsTotal ?? 0
    };
  }
  if (area === "Map Art") {
    return {
      readyMapArt: summary.readyMapArt ?? 0,
      plannedMapArt: summary.plannedMapArt ?? 0,
      validMaps: summary.validMaps ?? 0,
      totalMaps: summary.totalMaps ?? 0
    };
  }
  if (area === "Audio") {
    return {
      readyAudio: summary.audioReady ?? 0,
      totalAudio: summary.audioTotal ?? 0,
      productionBriefs: summary.audioBriefs ?? 0
    };
  }
  if (area === "Map Editor" || area === "Map Design") {
    return {
      validMaps: summary.validMaps ?? 0,
      totalMaps: summary.totalMaps ?? 0,
      mapLayoutScore: summary.mapLayoutScore ?? 0,
      mapLayoutWarnings: summary.mapLayoutWarnings ?? 0
    };
  }
  return {};
}

function makeMarkdown(data) {
  const now = section("P0 Now", data.board.now);
  const next = section("P1 Next", data.board.next);
  const later = section("Later", data.board.later);
  const checks = data.partyChecks.map((check) => `| ${check.area} | ${check.status} | ${check.detail} |`).join("\n");
  const commands = Object.entries(data.setupCommands).map(([name, command]) => `- ${name}: \`${command}\``).join("\n");
  return `# Party Content Punchlist

- Generated: ${data.generatedAt}
- Target: ${data.target}
- Ready: ${data.summary.ready ? "yes" : "no"}
- Open items: ${data.summary.openItems}
- P0 items: ${data.summary.p0}
- P1 items: ${data.summary.p1}

${data.purpose}

${now}

${next}

${later}

## Party Checks

| Area | Status | Detail |
|---|---|---|
${checks}

## Refresh Commands

${commands}
`;
}

function section(title, items) {
  if (!items.length) return `## ${title}\n\n- None.`;
  return `## ${title}

${items.map((item) => itemMarkdown(item)).join("\n")}`;
}

function itemMarkdown(item) {
  const counts = Object.entries(item.currentCounts)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ") || "n/a";
  return `### ${item.area}

- Status: ${item.status}
- Owner hint: ${item.ownerHint}
- Need: ${item.assetNeed}
- Current counts: ${counts}
- Handoff: \`${item.handoff}\`
- Candidate command: \`${item.candidateCommand}\`
- Install dry-run: \`${item.installCommand}\`
- Audit command: \`${item.auditCommand}\`
- Done when: ${item.doneWhen}

Acceptance:
${item.acceptance.map((entry) => `- ${entry}`).join("\n")}
`;
}
