import { mkdir, readFile, writeFile } from "node:fs/promises";

const distRoot = new URL("../dist/", import.meta.url);
const localizationRoot = new URL("localization/", distRoot);
const storeKitUrl = new URL("store/store-page-kit.json", distRoot);
const inputActionMapUrl = new URL("input/input-action-map.json", distRoot);
const localizationJsonUrl = new URL("source-strings.json", localizationRoot);
const localizationMarkdownUrl = new URL("localization-brief.md", localizationRoot);

const blockedTerms = [
  "mario",
  "luigi",
  "nintendo",
  "wii",
  "ghost mansion"
];

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function makeString(id, group, source, note = "") {
  return {
    id,
    group,
    source,
    note,
    maxLength: source.length <= 24 ? 32 : source.length <= 80 ? 96 : 280
  };
}

function assertCleanStrings(strings) {
  const found = [];
  for (const string of strings) {
    const normalized = string.source.toLowerCase();
    for (const term of blockedTerms) {
      if (normalized.includes(term)) {
        found.push(`${string.id}: ${term}`);
      }
    }
  }
  if (found.length) {
    throw new Error(`Blocked localization source term(s): ${found.join(", ")}`);
  }
}

function addInputStrings(strings, inputActionMap) {
  const seen = new Set(strings.map((string) => string.id));
  inputActionMap.actionSets.forEach((set) => {
    strings.push(makeString(`input.action_set.${set.id}`, "input", set.name, `Steam Input action set: ${set.name}.`));
    set.actions.forEach((action) => {
      if (seen.has(action.localizationId)) {
        return;
      }
      seen.add(action.localizationId);
      strings.push(makeString(action.localizationId, "input", action.name, action.note));
    });
  });
}

function makeCatalog(storeKit, inputActionMap) {
  const strings = [
    makeString("ui.title", "ui", "Afterlight Protocol", "Game title."),
    makeString("ui.host_lobby", "ui", "Host Lobby", "Main lobby button."),
    makeString("ui.quick_join", "ui", "Quick Join", "Main lobby button."),
    makeString("ui.browse", "ui", "Browse", "Lobby browser button."),
    makeString("ui.net_log", "ui", "Net Log", "Network diagnostics button."),
    makeString("ui.reports", "ui", "Reports", "Saved playtest reports button."),
    makeString("ui.saved_reports", "ui", "Saved Reports", "Saved playtest reports panel title."),
    makeString("ui.load_report", "ui", "Load", "Loads a saved report replay setup."),
    makeString("ui.import_reports", "ui", "Import", "Opens the saved report archive import field."),
    makeString("ui.export_reports", "ui", "Export", "Copies the saved report archive."),
    makeString("ui.clear_reports", "ui", "Clear", "Clears saved local reports."),
    makeString("ui.merge_reports", "ui", "Merge", "Merges pasted saved report archives."),
    makeString("ui.cancel_report_import", "ui", "Cancel", "Closes the report import field."),
    makeString("ui.report_import_placeholder", "ui", "Paste exported report archive JSON", "Placeholder for report archive import."),
    makeString("ui.report_replay_links", "ui", "replay links", "Saved reports summary count label."),
    makeString("ui.report_outcomes", "ui", "W/A/D", "Saved reports summary shorthand for win, anomaly, draw."),
    makeString("ui.join_code", "ui", "Join Code", "Invite-code join button."),
    makeString("ui.replay_seed", "ui", "Replay Seed", "Applies a pasted match seed."),
    makeString("ui.seed", "ui", "Seed", "Match seed field label."),
    makeString("ui.round", "ui", "Round", "Round length selector label."),
    makeString("ui.bots", "ui", "Bots", "Bot pressure selector label."),
    makeString("ui.ready", "ui", "Ready", "Starts launch countdown."),
    makeString("ui.reset", "ui", "Reset", "Resets the local match."),
    makeString("ui.motion_full", "ui", "Motion Full", "Accessibility toggle label when full motion is active."),
    makeString("ui.motion_reduced", "ui", "Motion Reduced", "Accessibility toggle label when reduced motion is active."),
    makeString("ui.contrast_standard", "ui", "Contrast Std", "Accessibility toggle label when standard contrast is active."),
    makeString("ui.contrast_high", "ui", "Contrast High", "Accessibility toggle label when high contrast is active."),
    makeString("ui.how_to_play", "ui", "How to Play", "Expandable field manual title."),
    makeString("ui.feedback_packet", "ui", "Feedback Packet", "Shows playtest report data after a match."),
    makeString("ui.copy_packet", "ui", "Copy Packet", "Copies playtest report data."),
    makeString("ui.copy_replay_link", "ui", "Copy Replay Link", "Copies a replay setup URL from results."),
    makeString("ui.rematch", "ui", "Rematch", "Starts another round."),
    makeString("ui.tuning_notes", "ui", "Tuning Notes", "Results panel tuning note section."),
    makeString("role.investigator", "roles", "Investigator", "Coordinated team role."),
    makeString("role.anomaly", "roles", "Anomaly", "Hidden opposing role."),
    makeString("map.observatory_annex", "maps", "Observatory Annex", "Prototype arena name."),
    makeString("map.tideglass_aquarium", "maps", "Tideglass Aquarium", "Prototype arena name."),
    makeString("map.prism_foundry", "maps", "Prism Foundry", "Prototype arena name."),
    makeString("map.gloamhall_manor", "maps", "Gloamhall Manor", "Prototype arena name."),
    makeString("map.gloamhall_manor_compact", "maps", "Gloamhall Manor Compact", "Prototype arena name."),
    makeString("meter.time", "hud", "Time", "HUD meter label."),
    makeString("meter.battery", "hud", "Battery", "HUD meter label."),
    makeString("meter.resolve", "hud", "Resolve", "HUD meter label."),
    makeString("meter.signal", "hud", "Signal", "HUD meter label."),
    makeString("meter.ability", "hud", "Ability", "HUD meter label."),
    makeString("meter.arena_event", "hud", "Arena Event", "HUD meter label."),
    makeString("option.round.3_min", "options", "3 min", "Short round option."),
    makeString("option.round.5_min", "options", "5 min", "Default round option."),
    makeString("option.round.7_min", "options", "7 min", "Long round option."),
    makeString("option.bots.relaxed", "options", "Relaxed", "Low bot pressure option."),
    makeString("option.bots.standard", "options", "Standard", "Default bot pressure option."),
    makeString("option.bots.intense", "options", "Intense", "High bot pressure option."),
    makeString("result.investigator_win", "results", "Investigators contained the anomaly", "Investigator victory result."),
    makeString("result.anomaly_win", "results", "The anomaly collapsed the team", "Anomaly victory result."),
    makeString("result.draw", "results", "Signal lost at round limit", "Timer-expired result."),
    makeString("stat.match_seed", "results", "Seed", "Results stat label."),
    makeString("stat.echoes_deployed", "results", "Echoes Deployed", "Results stat label."),
    makeString("stat.echoes_dispelled", "results", "Echoes Dispelled", "Results stat label."),
    makeString("stat.arena_events", "results", "Arena Events", "Results stat label."),
    makeString("tuning.round_pacing", "results", "Round Pacing", "Tuning note category."),
    makeString("tuning.anomaly_pressure", "results", "Anomaly Pressure", "Tuning note category."),
    makeString("tuning.investigator_survivability", "results", "Investigator Survivability", "Tuning note category."),
    makeString("tuning.objective_clarity", "results", "Objective Clarity", "Tuning note category."),
    makeString("tuning.ability_discovery", "results", "Ability Discovery", "Tuning note category."),
    makeString("tuning.arena_event_pace", "results", "Arena Event Pace", "Tuning note category."),
    makeString("tuning.echo_counterplay", "results", "Echo Counterplay", "Tuning note category."),
    makeString("tuning.playtest_read", "results", "Playtest Read", "Tuning note category."),
    makeString("event.skylight_flash", "events", "Skylight Flash", "Observatory Annex arena event."),
    makeString("event.skylight_flash_detail", "events", "A clean reveal pulse sweeps the annex and briefly exposes hidden movement.", "Observatory Annex arena event briefing."),
    makeString("event.tank_surge", "events", "Tank Surge", "Tideglass Aquarium arena event."),
    makeString("event.tank_surge_detail", "events", "A pressure surge spikes signal reads and makes proximity warnings less trustworthy.", "Tideglass Aquarium arena event briefing."),
    makeString("event.prism_flare", "events", "Prism Flare", "Prism Foundry arena event."),
    makeString("event.prism_flare_detail", "events", "A refracted flare throws echo decoys through the baffles and splits investigator attention.", "Prism Foundry arena event briefing."),
    makeString("event.storm_flash", "events", "Storm Flash", "Gloamhall Manor arena event."),
    makeString("event.storm_flash_detail", "events", "A lightning burst cuts through the manor and briefly exposes hidden movement.", "Gloamhall Manor arena event briefing."),
    makeString("help.investigator_summary", "help", "Track the anomaly, keep your light charged, and drain its health before the timer ends.", "How to Play investigator overview."),
    makeString("help.anomaly_summary", "help", "Stay hidden, collapse investigator resolve, and use the arena to break line of sight.", "How to Play anomaly overview."),
    makeString("help.rules_summary", "help", "Investigators win by containing the anomaly. The anomaly wins by collapsing the team.", "How to Play rules overview."),
    makeString("help.arena_events", "help", "Each arena has a timed event that can expose, distort, or misdirect the hunt.", "How to Play arena-event rule."),
    makeString("help.blackout_echoes", "help", "Blackout Wave blacks out the arena except for active flashlight beams.", "How to Play anomaly ability note."),
    makeString("help.echo_decoys", "help", "Echo decoys create false signal pressure and can pull investigator aim until burned out.", "How to Play anomaly decoy rule."),
    makeString("help.accessibility_summary", "help", "Use Motion and Contrast from the top bar to tune readability before hosting or joining.", "How to Play accessibility overview."),
    makeString("help.motion_reduced", "help", "Motion Reduced softens screen shake, lightning flashes, and particle bursts.", "How to Play reduced motion rule."),
    makeString("help.contrast_high", "help", "Contrast High brightens UI surfaces and boosts canvas readability.", "How to Play high contrast rule."),
    makeString("prompt.keyboard_ability", "controls", "E", "Keyboard ability prompt."),
    makeString("prompt.keyboard_dash", "controls", "Space", "Keyboard dash prompt."),
    makeString("prompt.keyboard_light", "controls", "Mouse", "Keyboard/mouse light prompt."),
    makeString("prompt.gamepad_ability", "controls", "Y/LB", "Gamepad ability prompt."),
    makeString("prompt.gamepad_dash", "controls", "A", "Gamepad dash prompt."),
    makeString("prompt.gamepad_light", "controls", "RT", "Gamepad light prompt."),
    makeString("store.short_description", "store", storeKit.positioning.shortDescription, "Steam short description draft."),
    makeString("store.one_line_pitch", "store", storeKit.positioning.oneLinePitch, "Marketing pitch."),
    makeString("store.early_access_note", "store", storeKit.storeCopy.earlyAccessNote, "Prototype scope note.")
  ];

  storeKit.storeCopy.about.forEach((source, index) => {
    strings.push(makeString(`store.about.${index + 1}`, "store", source, "Steam About section paragraph."));
  });
  storeKit.storeCopy.featureBullets.forEach((source, index) => {
    strings.push(makeString(`store.feature.${index + 1}`, "store", source, "Steam feature bullet."));
  });
  storeKit.trailerBeatSheet.forEach((source, index) => {
    strings.push(makeString(`trailer.beat.${index + 1}`, "trailer", source, "Trailer planning beat; translate for caption planning only."));
  });
  addInputStrings(strings, inputActionMap);

  assertCleanStrings(strings);

  return {
    app: storeKit.app,
    version: storeKit.version,
    generatedAt: new Date().toISOString(),
    targetLanguages: storeKit.localizationPlan.targetLanguages,
    glossary: storeKit.localizationPlan.glossary,
    translationGuidance: [
      "Keep Anomaly, Investigator, Resolve, and Health internally consistent.",
      "Preserve button-label brevity for HUD and controller prompts.",
      "Keep input action names short enough for Steam Input and controller-glyph overlays.",
      "Do not introduce references to external franchises or platform brands in player-facing copy.",
      "Translate trailer beats for planning and captioning; they are not final marketing subtitles yet.",
      "Flag any language where Resolve and Health become semantically too similar."
    ],
    strings
  };
}

function makeMarkdown(catalog) {
  const languages = catalog.targetLanguages.map((language) => `- ${language}`).join("\n");
  const glossary = Object.entries(catalog.glossary)
    .map(([term, note]) => `- ${term}: ${note}`)
    .join("\n");
  const guidance = catalog.translationGuidance.map((item) => `- ${item}`).join("\n");
  const rows = catalog.strings
    .map((string) => `| \`${string.id}\` | ${string.group} | ${string.maxLength} | ${string.source.replaceAll("|", "\\|")} |`)
    .join("\n");

  return `# ${catalog.app} Localization Brief

- Version: ${catalog.version}
- Generated: ${catalog.generatedAt}
- Source strings: ${catalog.strings.length}

## Target Languages

${languages}

## Glossary

${glossary}

## Guidance

${guidance}

## Source Strings

| ID | Group | Max Length | Source |
| --- | --- | ---: | --- |
${rows}
`;
}

const [storeKit, inputActionMap] = await Promise.all([
  readJson(storeKitUrl),
  readJson(inputActionMapUrl)
]);
const catalog = makeCatalog(storeKit, inputActionMap);

await mkdir(localizationRoot, { recursive: true });
await writeFile(localizationJsonUrl, `${JSON.stringify(catalog, null, 2)}\n`);
await writeFile(localizationMarkdownUrl, makeMarkdown(catalog));

console.log(`Localization kit written to dist/localization/source-strings.json and dist/localization/localization-brief.md with ${catalog.strings.length} strings`);
