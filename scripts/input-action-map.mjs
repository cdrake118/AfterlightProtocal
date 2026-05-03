import { mkdir, writeFile } from "node:fs/promises";

const distRoot = new URL("../dist/", import.meta.url);
const inputRoot = new URL("input/", distRoot);
const inputJsonUrl = new URL("input-action-map.json", inputRoot);
const inputMarkdownUrl = new URL("input-action-map.md", inputRoot);

const actionSets = [
  {
    id: "menu",
    name: "Menu",
    actions: [
      {
        id: "ui_select",
        name: "Select",
        type: "button",
        keyboard: ["Enter", "Mouse Left"],
        gamepad: ["A"],
        localizationId: "input.ui_select",
        note: "Confirm lobby and menu UI selections."
      },
      {
        id: "ui_back",
        name: "Back",
        type: "button",
        keyboard: ["Escape"],
        gamepad: ["B"],
        localizationId: "input.ui_back",
        note: "Close overlays or back out of panels in a future menu flow."
      }
    ]
  },
  {
    id: "investigator",
    name: "Investigator",
    actions: [
      {
        id: "move",
        name: "Move",
        type: "vector",
        keyboard: ["WASD", "Arrow Keys"],
        gamepad: ["Left Stick"],
        localizationId: "input.move",
        note: "Current runtime maps keyboard movement and standard gamepad left stick."
      },
      {
        id: "aim",
        name: "Aim",
        type: "vector",
        keyboard: ["Mouse"],
        gamepad: ["Right Stick"],
        localizationId: "input.aim",
        note: "Right-stick aim should map to a Steam Input joystick camera/mouse region later."
      },
      {
        id: "light",
        name: "Project Light",
        type: "button",
        keyboard: ["Mouse Left"],
        gamepad: ["Right Trigger"],
        localizationId: "input.light",
        note: "Held action; drains battery while active."
      },
      {
        id: "ability",
        name: "Pulse Scan",
        type: "button",
        keyboard: ["E"],
        gamepad: ["Y", "Left Bumper"],
        localizationId: "input.pulse_scan",
        note: "Investigator role ability."
      }
    ]
  },
  {
    id: "anomaly",
    name: "Anomaly",
    actions: [
      {
        id: "move",
        name: "Move",
        type: "vector",
        keyboard: ["WASD", "Arrow Keys"],
        gamepad: ["Left Stick"],
        localizationId: "input.move",
        note: "Anomaly movement."
      },
      {
        id: "dash",
        name: "Dash",
        type: "button",
        keyboard: ["Space"],
        gamepad: ["A"],
        localizationId: "input.dash",
        note: "Short repositioning burst."
      },
      {
        id: "ability",
        name: "Blackout Wave",
        type: "button",
        keyboard: ["E"],
        gamepad: ["Y", "Left Bumper"],
        localizationId: "input.blackout_wave",
        note: "Anomaly role ability."
      }
    ]
  }
];

function makeMap() {
  return {
    app: "Afterlight Protocol",
    version: "0.1.0",
    generatedAt: new Date().toISOString(),
    promptModes: ["keyboard", "gamepad"],
    steamInputReadiness: {
      actionManifestReady: true,
      runtimeGlyphs: "future",
      currentRuntimePrompts: "text labels switch between keyboard and gamepad by last input"
    },
    actionSets
  };
}

function makeMarkdown(map) {
  const sets = map.actionSets.map((set) => {
    const rows = set.actions.map((action) => {
      return `| \`${action.id}\` | ${action.name} | ${action.type} | ${action.keyboard.join(", ")} | ${action.gamepad.join(", ")} | \`${action.localizationId}\` |`;
    }).join("\n");
    return `## ${set.name}

| Action | Name | Type | Keyboard | Gamepad | Localization |
| --- | --- | --- | --- | --- | --- |
${rows}
`;
  }).join("\n");

  return `# ${map.app} Input Action Map

- Version: ${map.version}
- Generated: ${map.generatedAt}
- Prompt modes: ${map.promptModes.join(", ")}
- Runtime glyphs: ${map.steamInputReadiness.runtimeGlyphs}
- Current prompts: ${map.steamInputReadiness.currentRuntimePrompts}

${sets}
`;
}

const map = makeMap();

await mkdir(inputRoot, { recursive: true });
await writeFile(inputJsonUrl, `${JSON.stringify(map, null, 2)}\n`);
await writeFile(inputMarkdownUrl, makeMarkdown(map));

console.log("Input action map written to dist/input/input-action-map.json and dist/input/input-action-map.md");
