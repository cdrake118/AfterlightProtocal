const listeners = new Map();

class FakeElement {
  constructor(id) {
    this.id = id;
    this.textContent = "";
    this.value = 0;
    if (id === "mapSelect") {
      this.value = "Observatory Annex";
    }
    if (id === "durationSelect") {
      this.value = "300";
    }
    if (id === "botPressureSelect") {
      this.value = "standard";
    }
    this.width = 1280;
    this.height = 720;
    this.style = {};
    this.dataset = {};
    this.attributes = new Map(id === "helpPanel" ? [["hidden", ""]] : []);
    this.classList = {
      toggle() {}
    };
  }

  addEventListener(type, listener) {
    listeners.set(`${this.id}:${type}`, listener);
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: 1280, height: 720 };
  }

  getContext() {
    return new Proxy(
      {},
      {
        get(target, prop) {
          if (prop === "createLinearGradient" || prop === "createRadialGradient") {
            return () => ({ addColorStop() {} });
          }
          if (!(prop in target)) {
            target[prop] = () => {};
          }
          return target[prop];
        },
        set(target, prop, value) {
          target[prop] = value;
          return true;
        }
      }
    );
  }

  focus() {}

  select() {}

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
}

const elements = new Map();
const ids = [
  "stage",
  "game",
  "mainMenuPanel",
  "startBtn",
  "menuHelpBtn",
  "settingsBtn",
  "closeHelpBtn",
  "phase",
  "timer",
  "anomalyMeter",
  "batteryMeter",
  "resolveMeter",
  "signalMeter",
  "abilityMeter",
  "eventName",
  "eventMeter",
  "status",
  "hostBtn",
  "joinBtn",
  "browseBtn",
  "netLogBtn",
  "reportsBtn",
  "suitBtn",
  "inviteInput",
  "joinCodeBtn",
  "seedInput",
  "replaySeedBtn",
  "mapSelect",
  "durationSelect",
  "botPressureSelect",
  "roleBtn",
  "abilityBtn",
  "interactBtn",
  "abilityRef",
  "interactRef",
  "readyBtn",
  "resetBtn",
  "soundBtn",
  "motionBtn",
  "contrastBtn",
  "settingsPanel",
  "closeSettingsBtn",
  "lobbyPanel",
  "browserPanel",
  "browserList",
  "closeBrowserBtn",
  "networkPanel",
  "networkSummary",
  "networkList",
  "closeNetworkBtn",
  "reportsPanel",
  "reportsSummary",
  "reportsList",
  "importReportsBtn",
  "exportReportsBtn",
  "clearReportsBtn",
  "reportImportPanel",
  "reportImportText",
  "mergeReportsBtn",
  "cancelReportImportBtn",
  "closeReportsBtn",
  "resultsPanel",
  "resultTitle",
  "resultStats",
  "achievementList",
  "tuningNotes",
  "feedbackBtn",
  "copyFeedbackBtn",
  "copyReplayLinkBtn",
  "feedbackText",
  "rematchBtn"
];

for (const id of ids) {
  elements.set(id, new FakeElement(id));
}

globalThis.document = {
  querySelector(selector) {
    return elements.get(selector.slice(1));
  }
};

globalThis.window = {
  devicePixelRatio: 1,
  addEventListener(type, listener) {
    listeners.set(`window:${type}`, listener);
  }
};

let activeGamepads = [];
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    getGamepads() {
      return activeGamepads;
    }
  }
});

let frameCallback = null;
globalThis.requestAnimationFrame = (listener) => {
  frameCallback = listener;
  return 1;
};
globalThis.structuredClone = globalThis.structuredClone ?? ((value) => JSON.parse(JSON.stringify(value)));

const { PlatformServices } = await import("../src/platform.js");
const platformSmoke = new PlatformServices();
const presenceEvents = [];
platformSmoke.presence.subscribe((activity) => {
  presenceEvents.push(activity.state);
});
platformSmoke.presence.setActivity({
  state: "playing",
  details: "Investigator on Tideglass Aquarium",
  map: "Tideglass Aquarium",
  role: "Investigator",
  party: { size: 4, capacity: 5 },
  inviteCode: "TIDE71"
});
if (platformSmoke.presence.getActivity().inviteCode !== "TIDE71" || !presenceEvents.includes("playing")) {
  throw new Error("expected presence service to store and emit activity");
}
const networkEvents = [];
platformSmoke.network.subscribe((message) => {
  networkEvents.push(message.type);
});
platformSmoke.network.host({ lobbyId: "pub-2716", map: "Tideglass Aquarium", role: "Investigator" });
platformSmoke.network.sendReliable("match_started", { map: "Tideglass Aquarium" });
platformSmoke.network.sendUnreliable("input", { x: 0.5, y: 0 });
if (!networkEvents.includes("session_hosted") || !networkEvents.includes("match_started")) {
  throw new Error("expected network session to emit hosted and match messages");
}
if (platformSmoke.network.getMessages().filter((message) => message.reliable).length < 2) {
  throw new Error("expected network session to retain reliable messages");
}
platformSmoke.feedback.clearReports();
const feedbackEntry = platformSmoke.feedback.savePacket({
  build: { app: "Afterlight Protocol Prototype", version: "0.1.0" },
  session: { role: "Investigator", map: "Tideglass Aquarium", outcome: "Smoke Test" },
  testerReport: { summary: "Smoke feedback" }
});
if (!feedbackEntry.id || feedbackEntry.packet.archive.reportId !== feedbackEntry.id) {
  throw new Error("expected feedback service to stamp archived packets");
}
const persistedFeedback = new PlatformServices();
if (persistedFeedback.feedback.listReports()[0]?.id !== feedbackEntry.id) {
  throw new Error("expected feedback reports to persist through storage");
}
const importResult = persistedFeedback.feedback.importReports([
  feedbackEntry,
  {
    id: "rpt-import-smoke",
    savedAt: "2026-04-30T14:19:00.000Z",
    role: "Anomaly",
    map: "Prism Foundry",
    outcome: "The anomaly collapsed the team",
    packet: {
      build: { app: "Afterlight Protocol Prototype", version: "0.1.0" },
      archive: { reportId: "rpt-import-smoke", savedAt: "2026-04-30T14:19:00.000Z" },
      session: { role: "Anomaly", map: "Prism Foundry", outcome: "The anomaly collapsed the team" }
    }
  },
  { id: "bad-report" }
]);
if (importResult.imported !== 1 || importResult.skipped !== 2) {
  throw new Error("expected feedback import to merge one report and skip duplicates or invalid entries");
}
if (!persistedFeedback.feedback.listReports().some((report) => report.id === "rpt-import-smoke")) {
  throw new Error("expected imported feedback report to persist");
}
platformSmoke.cosmetics.equipSuit("ember");
const persistedCosmetics = new PlatformServices();
if (persistedCosmetics.cosmetics.getLoadout().suit.id !== "ember") {
  throw new Error("expected cosmetic loadout to persist through storage");
}
persistedCosmetics.cosmetics.equipSuit("prism");
if (persistedCosmetics.cosmetics.getLoadout().suit.id === "prism") {
  throw new Error("expected locked cosmetic to require entitlement");
}
persistedCosmetics.entitlements.grant("afterlight_prism_pack");
persistedCosmetics.cosmetics.equipSuit("prism");
if (persistedCosmetics.cosmetics.getLoadout().suit.id !== "prism") {
  throw new Error("expected granted entitlement to unlock cosmetic");
}
platformSmoke.storage.saveSettings({
  map: "Tideglass Aquarium",
  role: "Anomaly",
  soundEnabled: true,
  inputMode: "gamepad",
  matchDuration: 420,
  botPressure: "intense",
  reduceMotion: true,
  highContrast: true
});
const savedSettings = platformSmoke.storage.loadSettings();
if (
  savedSettings.map !== "Tideglass Aquarium"
  || savedSettings.role !== "Anomaly"
  || savedSettings.soundEnabled !== true
  || savedSettings.inputMode !== "gamepad"
  || savedSettings.matchDuration !== 420
  || savedSettings.botPressure !== "intense"
  || savedSettings.reduceMotion !== true
  || savedSettings.highContrast !== true
) {
  throw new Error("expected storage service to persist settings");
}
const unlocks = platformSmoke.achievements.evaluateRound({
  role: "Investigator",
  outcome: "Investigators contained the anomaly",
  stats: {
    abilityUses: 3,
    pickups: 3,
    revives: 1,
    relaysCharged: 0,
    relaysCorrupted: 0
  },
  timeRemaining: 22,
  teamResolve: 48,
  anomalyStability: 0
});
if (!unlocks.some((achievement) => achievement.id === "STAY_POWERED")) {
  throw new Error("expected achievement service to unlock STAY_POWERED");
}
platformSmoke.stats.recordRound({
  role: "Investigator",
  outcome: "Investigators contained the anomaly",
  map: "Tideglass Aquarium",
  stats: {
    abilityUses: 2,
    echoesDeployed: 3,
    echoesDispelled: 1,
    pickups: 1,
    revives: 1,
    relaysCharged: 0,
    relaysCorrupted: 0
  },
  timeRemaining: 120,
  teamResolve: 72,
  anomalyStability: 0
});
const persistedPlatformSmoke = new PlatformServices();
const profile = persistedPlatformSmoke.stats.getProfile();
if (profile.matches !== 1 || profile.investigatorWins !== 1 || profile.totalRevives !== 1 || profile.totalEchoesDeployed !== 3) {
  throw new Error("expected career stats to persist through storage");
}
if (!persistedPlatformSmoke.achievements.listUnlocked().some((achievement) => achievement.id === "STAY_POWERED")) {
  throw new Error("expected achievement unlocks to persist through storage");
}
if (persistedPlatformSmoke.achievements.evaluateRound({
  role: "Investigator",
  outcome: "Investigators contained the anomaly",
  stats: {
    abilityUses: 3,
    pickups: 3,
    revives: 1,
    relaysCharged: 0,
    relaysCorrupted: 0
  }
}).length !== 0) {
  throw new Error("expected achievement unlocks to be one-time");
}
const echoUnlocks = persistedPlatformSmoke.achievements.evaluateRound({
  role: "Anomaly",
  outcome: "The anomaly collapsed the team",
  stats: {
    abilityUses: 2,
    echoesDeployed: 6,
    echoesDispelled: 0,
    pickups: 0,
    revives: 0,
    relaysCharged: 0,
    relaysCorrupted: 1
  }
});
if (!echoUnlocks.some((achievement) => achievement.id === "ECHO_CHAMBER")) {
  throw new Error("expected anomaly echo achievement to unlock");
}
platformSmoke.storage.saveSettings({
  map: "Tideglass Aquarium",
  role: "Anomaly",
  soundEnabled: false,
  inputMode: "keyboard"
});

await import("../src/game.js");

elements.get("inviteInput").value = "TIDE71";
listeners.get("joinCodeBtn:click")?.();
if (elements.get("mapSelect").value !== "Tideglass Aquarium") {
  throw new Error(`expected invite join to select Tideglass Aquarium, got ${elements.get("mapSelect").value}`);
}

listeners.get("readyBtn:click")?.();
let frameTime = performance.now();
for (let i = 0; i < 260; i += 1) {
  activeGamepads = i === 110
    ? [{
        connected: true,
        axes: [0.5, 0.25, 0.8, 0],
        buttons: [
          { pressed: true, value: 1 },
          { pressed: false, value: 0 },
          { pressed: false, value: 0 },
          { pressed: false, value: 0 },
          { pressed: false, value: 0 },
          { pressed: false, value: 0 },
          { pressed: false, value: 0 },
          { pressed: true, value: 1 }
        ]
      }]
    : [];
  frameTime += 33;
  frameCallback?.(frameTime);
}

if (elements.get("phase").textContent !== "Live Match") {
  throw new Error(`expected Live Match, got ${elements.get("phase").textContent}`);
}

console.log("runtime smoke ok");
