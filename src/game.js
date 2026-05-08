import { PlatformServices } from "./platform.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const stageEl = document.querySelector("#stage");
const mainMenuPanel = document.querySelector("#mainMenuPanel");
const startBtn = document.querySelector("#startBtn");
const menuHelpBtn = document.querySelector("#menuHelpBtn");
const settingsBtn = document.querySelector("#settingsBtn");
const closeHelpBtn = document.querySelector("#closeHelpBtn");
const phaseEl = document.querySelector("#phase");
const timerEl = document.querySelector("#timer");
const anomalyMeter = document.querySelector("#anomalyMeter");
const anomalyHealthPercent = document.querySelector("#anomalyHealthPercent");
const batteryMeter = document.querySelector("#batteryMeter");
const signalMeter = document.querySelector("#signalMeter");
const abilityMeter = document.querySelector("#abilityMeter");
const eventName = document.querySelector("#eventName");
const eventMeter = document.querySelector("#eventMeter");
const statusEl = document.querySelector("#status");
const hostBtn = document.querySelector("#hostBtn");
const joinBtn = document.querySelector("#joinBtn");
const browseBtn = document.querySelector("#browseBtn");
const netLogBtn = document.querySelector("#netLogBtn");
const reportsBtn = document.querySelector("#reportsBtn");
const suitBtn = document.querySelector("#suitBtn");
const inviteInput = document.querySelector("#inviteInput");
const joinCodeBtn = document.querySelector("#joinCodeBtn");
const seedInput = document.querySelector("#seedInput");
const replaySeedBtn = document.querySelector("#replaySeedBtn");
const mapSelect = document.querySelector("#mapSelect");
const durationSelect = document.querySelector("#durationSelect");
const botPressureSelect = document.querySelector("#botPressureSelect");
const roleBtn = document.querySelector("#roleBtn");
const abilityBtn = document.querySelector("#abilityBtn");
const interactBtn = document.querySelector("#interactBtn");
const abilityRef = document.querySelector("#abilityRef");
const interactRef = document.querySelector("#interactRef");
const readyBtn = document.querySelector("#readyBtn");
const resetBtn = document.querySelector("#resetBtn");
const soundBtn = document.querySelector("#soundBtn");
const masterVolumeInput = document.querySelector("#masterVolume");
const musicVolumeInput = document.querySelector("#musicVolume");
const sfxVolumeInput = document.querySelector("#sfxVolume");
const motionBtn = document.querySelector("#motionBtn");
const contrastBtn = document.querySelector("#contrastBtn");
const settingsPanel = document.querySelector("#settingsPanel");
const closeSettingsBtn = document.querySelector("#closeSettingsBtn");
const lobbyPanel = document.querySelector("#lobbyPanel");
const browserPanel = document.querySelector("#browserPanel");
const browserList = document.querySelector("#browserList");
const closeBrowserBtn = document.querySelector("#closeBrowserBtn");
const networkPanel = document.querySelector("#networkPanel");
const networkSummary = document.querySelector("#networkSummary");
const networkList = document.querySelector("#networkList");
const closeNetworkBtn = document.querySelector("#closeNetworkBtn");
const reportsPanel = document.querySelector("#reportsPanel");
const reportsSummary = document.querySelector("#reportsSummary");
const reportsList = document.querySelector("#reportsList");
const exportReportsBtn = document.querySelector("#exportReportsBtn");
const importReportsBtn = document.querySelector("#importReportsBtn");
const clearReportsBtn = document.querySelector("#clearReportsBtn");
const reportImportPanel = document.querySelector("#reportImportPanel");
const reportImportText = document.querySelector("#reportImportText");
const mergeReportsBtn = document.querySelector("#mergeReportsBtn");
const cancelReportImportBtn = document.querySelector("#cancelReportImportBtn");
const closeReportsBtn = document.querySelector("#closeReportsBtn");
const resultsPanel = document.querySelector("#resultsPanel");
const resultTitle = document.querySelector("#resultTitle");
const resultStats = document.querySelector("#resultStats");
const achievementList = document.querySelector("#achievementList");
const tuningNotes = document.querySelector("#tuningNotes");
const feedbackBtn = document.querySelector("#feedbackBtn");
const copyFeedbackBtn = document.querySelector("#copyFeedbackBtn");
const copyReplayLinkBtn = document.querySelector("#copyReplayLinkBtn");
const feedbackText = document.querySelector("#feedbackText");
const rematchBtn = document.querySelector("#rematchBtn");

const services = new PlatformServices();
const world = { width: 1280, height: 720 };
const keys = new Set();
const mouse = { x: world.width / 2, y: world.height / 2, down: false };
const controller = {
  connected: false,
  moveX: 0,
  moveY: 0,
  aimX: 0,
  aimY: 0,
  light: false,
  interact: false,
  dash: false,
  ability: false,
  lastDash: false,
  lastAbility: false,
  justDash: false,
  justAbility: false
};
const partySession = {
  socket: null,
  code: null,
  joinUrl: null,
  joinUrls: [],
  qrDataUrl: null,
  members: [],
  inputs: new Map(),
  started: false,
  lastSnapshotAt: 0
};
let partyPanel = null;
let socketLoaderPromise = null;
let last = performance.now();
let playerRole = "Investigator";
let currentScreen = "menu";
let returnToMenuAfterHelp = false;
let ready = false;
let lightning = 0;
let arenaFlashColor = "#dff7ff";
let arenaEventCooldown = 14;
let arenaEventWindow = 14;
let messageTimer = 0;
let cameraShake = 0;
let abilityFlash = 0;
let lobbyState = null;
let soundEnabled = false;
let audioContext = null;
let audioMaster = null;
let audioMusic = null;
let audioSfx = null;
let audioManifest = null;
let audioManifestPromise = null;
let globalSoundEffects = null;
let globalSoundEffectsPromise = null;
let audioUnlockPending = false;
const audioBuffers = new Map();
const audioBufferPromises = new Map();
const missingAudioAssets = new Set();
let currentMusicSource = null;
let currentMusicGain = null;
let currentMusicTrackSrc = "";
let requestedMusicTrackSrc = "";
const audioVolumes = {
  master: 0.9,
  music: 0.72,
  sfx: 0.88
};
loadGlobalSoundEffects();
let lastHitSound = 0;
let lastGhostDamageSound = 0;
let lastGhostEscapeSound = 0;
let currentMapName = "Observatory Annex";
let matchDuration = 300;
let botPressure = "standard";
let inputMode = "keyboard";
let reduceMotion = false;
let highContrast = false;
let playerSuit = services.cosmetics.getLoadout().suit;
let matchSeed = createMatchSeed();
let matchRandom = makeSeededRng(matchSeed);
let replaySeed = null;
let countdown = 0;
let interactBoost = 0;
let signalPulse = 0;
let lastSignalPing = 0;
let lastRoundSummary = null;
let lastFeedbackEntry = null;
let blackoutMask = null;
let batterySpawnTimer = 30;
let builderPlaytestOptions = { freezeAnomaly: false };
const recentNetworkEvents = [];

const GameBalance = {
  roundDurationSeconds: 300,
  ghost: {
    moveSpeed: 99.45,
    attackBonusRange: 2,
    attackConfirmSeconds: 0.08,
    attackCooldownSeconds: 0.9,
    visibilityAfterHitSeconds: 0.42,
    grabDurationSeconds: 2,
    grabSpeedMultiplier: 1.25,
    shockDurationSeconds: 1,
    escapeDurationSeconds: 4,
    escapeSpeedMultiplier: 1.5,
    revivedInvulnerableSeconds: 3,
    lightningRevealSeconds: 0.7,
    magicCooldownSeconds: 30,
    initialMagicDelaySeconds: 30,
    magicDurationSeconds: 5,
    magicRadius: 360,
    memorySecondsForBots: 1.45
  },
  tracker: {
    moveSpeed: 99.45,
    flashlightBatteryMax: 144,
    flashlightDrainPerSecond: 19.2,
    aiFlashlightDrainPerSecond: 15.6,
    flashlightBeamLength: 285,
    flashlightBeamAngleRadians: 0.34,
    flashlightDamagePerSecond: 18.4,
    aiFlashlightDamagePerSecond: 6.325,
    reviveDurationSeconds: 2.2,
    reviveRange: 72
  },
  warning: {
    weakDistance: 190,
    strongDistance: 105,
    signalPingThreshold: 0.62
  },
  batteries: {
    spawnIntervalSeconds: 30,
    lowBatteryThreshold: 0.35,
    startingPickups: 1,
    maxActivePickups: 3,
    overchargeDurationSeconds: 18,
    overchargeDamageMultiplier: 2.15,
    overchargeReviveMultiplier: 1.75
  },
  lightning: {
    revealDurationSeconds: 0.7
  },
  ai: {
    probeMinCooldownSeconds: 1.6,
    probeMaxCooldownSeconds: 3.7
  }
};

const reviveRange = GameBalance.tracker.reviveRange;
const reviveSeconds = GameBalance.tracker.reviveDurationSeconds;
const relayRange = 76;
const relaysEnabled = false;
const batterySpawnInterval = GameBalance.batteries.spawnIntervalSeconds;
const lowBatterySpawnThreshold = GameBalance.batteries.lowBatteryThreshold;
const startingBatteryPickups = GameBalance.batteries.startingPickups;
const maxActiveBatteryPickups = GameBalance.batteries.maxActivePickups;
const maxBatteryCapacity = GameBalance.tracker.flashlightBatteryMax;
const blackoutDrainRadius = GameBalance.ghost.magicRadius;
const proximityWarningRange = GameBalance.warning.weakDistance;
const proximityDangerRange = GameBalance.warning.strongDistance;
const overchargeDuration = GameBalance.batteries.overchargeDurationSeconds;
const overchargeDamageMultiplier = GameBalance.batteries.overchargeDamageMultiplier;
const overchargeReviveMultiplier = GameBalance.batteries.overchargeReviveMultiplier;
const navCellSize = 44;
const investigatorMoveSpeed = GameBalance.tracker.moveSpeed;
const anomalyMoveSpeed = GameBalance.ghost.moveSpeed;
const aiAnomalyVisibleThreshold = 0.18;
const aiAnomalyMemoryMax = GameBalance.ghost.memorySecondsForBots;
const aiProbeMinCooldown = GameBalance.ai.probeMinCooldownSeconds;
const aiProbeMaxCooldown = GameBalance.ai.probeMaxCooldownSeconds;
const characterSpriteSize = 128;
const anomalyVisualScale = 0.85;
const investigatorVisual = {
  width: 48,
  height: 78,
  atlasWidth: 56,
  atlasHeight: 88,
  downWidth: 74,
  downHeight: 48,
  shadowWidth: 24,
  shadowHeight: 6,
  barOffset: 94,
  nameplateOffset: 124,
  reviveLabelOffset: 106,
  flashlightForward: 18,
  flashlightChestLift: 42,
  flashlightSideOffset: 6
};
const characterSpriteCache = new Map();
const investigatorAtlases = {};
const anomalyAtlas = {
  image: null,
  ready: false,
  cols: 4,
  rows: 9,
  frame: 128,
  src: "assets/characters/anomaly-ghost-atlas.png"
};

const abilityMax = {
  Investigator: 8,
  Anomaly: GameBalance.ghost.magicCooldownSeconds
};
const initialAnomalyBlackoutDelay = GameBalance.ghost.initialMagicDelaySeconds;

const echoMaxLife = 5.4;

const botPressureTuning = {
  relaxed: {
    label: "Relaxed",
    investigatorSpeed: 0.92,
    anomalySpeed: 0.88,
    investigatorDamage: 0.92,
    anomalyTouch: 0.82,
    investigatorRelay: 0.9,
    anomalyRelay: 0.86
  },
  standard: {
    label: "Standard",
    investigatorSpeed: 1,
    anomalySpeed: 1,
    investigatorDamage: 1,
    anomalyTouch: 1,
    investigatorRelay: 1,
    anomalyRelay: 1
  },
  intense: {
    label: "Intense",
    investigatorSpeed: 1.08,
    anomalySpeed: 1.14,
    investigatorDamage: 1.08,
    anomalyTouch: 1.18,
    investigatorRelay: 1.08,
    anomalyRelay: 1.14
  }
};

const inputPrompts = {
  keyboard: {
    interact: "Stand near",
    revive: "Stay close",
    ability: "E",
    dash: "-",
    light: "Mouse"
  },
  gamepad: {
    interact: "Stand near",
    revive: "Stay close",
    ability: "Y/LB",
    dash: "A",
    light: "RT"
  }
};

const maps = {
  "Observatory Annex": {
    floor: ["#111b22", "#17151f", "#21171d"],
    event: {
      name: "Skylight Flash",
      color: "#dff7ff",
      status: "Skylight flash exposed hidden movement",
      detail: "A clean reveal pulse sweeps the annex and briefly exposes hidden movement.",
      effect: "reveal"
    },
    player: [640, 380],
    anomaly: [892, 362],
    investigators: [
      [402, 250, "#7ae4d6", "Vale"],
      [414, 472, "#f4b35d", "Mira"],
      [808, 238, "#c7a8ff", "Sable"]
    ],
    batteries: [[198, 354], [640, 156], [1080, 356], [640, 564]],
    relays: [[346, 356], [930, 356]],
    labels: [
      [640, 258, "CALIBRATION"],
      [372, 602, "LAB A"],
      [904, 602, "LAB B"]
    ],
    walls: [
      { x: 92, y: 96, w: 1096, h: 22 },
      { x: 92, y: 602, w: 1096, h: 22 },
      { x: 92, y: 96, w: 22, h: 528 },
      { x: 1166, y: 96, w: 22, h: 528 },
      { x: 262, y: 210, w: 24, h: 300 },
      { x: 996, y: 210, w: 24, h: 300 },
      { x: 430, y: 338, w: 420, h: 26 },
      { x: 536, y: 162, w: 208, h: 22 },
      { x: 536, y: 536, w: 208, h: 22 }
    ],
    props: [
      { x: 178, y: 156, w: 58, h: 112, color: "#26323a" },
      { x: 154, y: 450, w: 70, h: 72, color: "#2e2635" },
      { x: 338, y: 154, w: 132, h: 64, color: "#1c3537" },
      { x: 812, y: 502, w: 138, h: 58, color: "#372d22" },
      { x: 1058, y: 170, w: 58, h: 120, color: "#2a303a" },
      { x: 1048, y: 452, w: 78, h: 80, color: "#322834" }
    ]
  },
  "Tideglass Aquarium": {
    floor: ["#0d1b1d", "#10232b", "#1e1923"],
    event: {
      name: "Tank Surge",
      color: "#57d8ff",
      status: "Tank surge distorted the signal",
      detail: "A pressure surge spikes signal reads and makes proximity warnings less trustworthy.",
      effect: "signal"
    },
    player: [634, 468],
    anomaly: [958, 224],
    investigators: [
      [326, 230, "#7ae4d6", "Vale"],
      [330, 498, "#f4b35d", "Mira"],
      [760, 374, "#c7a8ff", "Sable"]
    ],
    batteries: [[182, 304], [514, 170], [1058, 472], [724, 558]],
    relays: [[474, 356], [872, 356]],
    labels: [
      [652, 226, "TIDEGLASS"],
      [332, 602, "FILTRATION"],
      [936, 602, "TANKS"]
    ],
    walls: [
      { x: 92, y: 96, w: 1096, h: 22 },
      { x: 92, y: 602, w: 1096, h: 22 },
      { x: 92, y: 96, w: 22, h: 528 },
      { x: 1166, y: 96, w: 22, h: 528 },
      { x: 244, y: 178, w: 24, h: 360 },
      { x: 1018, y: 178, w: 24, h: 360 },
      { x: 392, y: 276, w: 226, h: 24 },
      { x: 668, y: 420, w: 226, h: 24 },
      { x: 544, y: 174, w: 24, h: 168 },
      { x: 720, y: 378, w: 24, h: 170 }
    ],
    props: [
      { x: 150, y: 154, w: 64, h: 134, color: "#17343a" },
      { x: 146, y: 438, w: 78, h: 92, color: "#2e2635" },
      { x: 334, y: 152, w: 142, h: 72, color: "#123a40" },
      { x: 592, y: 500, w: 126, h: 58, color: "#21333a" },
      { x: 848, y: 154, w: 84, h: 140, color: "#1d3640" },
      { x: 944, y: 420, w: 128, h: 72, color: "#372d22" }
    ]
  },
  "Prism Foundry": {
    floor: ["#101716", "#181922", "#241a1a"],
    event: {
      name: "Prism Flare",
      color: "#f4b35d",
      status: "Prism flare cast false anomaly echoes",
      detail: "A refracted flare throws echo decoys through the baffles and splits investigator attention.",
      effect: "echo"
    },
    player: [308, 512],
    anomaly: [968, 188],
    investigators: [
      [330, 230, "#7ae4d6", "Vale"],
      [604, 498, "#f4b35d", "Mira"],
      [910, 482, "#c7a8ff", "Sable"]
    ],
    batteries: [[176, 190], [622, 238], [1092, 536], [642, 566]],
    relays: [[414, 384], [872, 300]],
    labels: [
      [640, 246, "PRISM LINE"],
      [360, 602, "COOLANT"],
      [944, 602, "CASTING"]
    ],
    walls: [
      { x: 92, y: 96, w: 1096, h: 22 },
      { x: 92, y: 602, w: 1096, h: 22 },
      { x: 92, y: 96, w: 22, h: 528 },
      { x: 1166, y: 96, w: 22, h: 528 },
      { x: 250, y: 170, w: 24, h: 204 },
      { x: 250, y: 448, w: 24, h: 118 },
      { x: 520, y: 120, w: 24, h: 224 },
      { x: 520, y: 408, w: 24, h: 168 },
      { x: 742, y: 142, w: 24, h: 174 },
      { x: 742, y: 378, w: 24, h: 210 },
      { x: 1006, y: 184, w: 24, h: 224 },
      { x: 348, y: 302, w: 232, h: 24 },
      { x: 690, y: 430, w: 264, h: 24 },
      { x: 374, y: 520, w: 216, h: 24 }
    ],
    props: [
      { x: 146, y: 326, w: 76, h: 94, color: "#28301e" },
      { x: 332, y: 152, w: 108, h: 60, color: "#313026" },
      { x: 362, y: 440, w: 90, h: 54, color: "#1d3330" },
      { x: 604, y: 150, w: 84, h: 118, color: "#2a2738" },
      { x: 604, y: 338, w: 86, h: 66, color: "#332322" },
      { x: 812, y: 510, w: 126, h: 56, color: "#233531" },
      { x: 1052, y: 302, w: 72, h: 118, color: "#3a2f1d" },
      { x: 946, y: 148, w: 58, h: 76, color: "#28301e" }
    ]
  },
  "Gloamhall Manor": {
    floor: ["#17151a", "#2a1922", "#2a2f1d"],
    event: {
      name: "Storm Flash",
      color: "#dff7ff",
      status: "Storm flash exposed the manor corridors",
      detail: "A lightning burst cuts through the manor and briefly exposes hidden movement.",
      effect: "reveal"
    },
    player: [180, 186],
    anomaly: [640, 352],
    investigators: [
      [1102, 154, "#e76f8a", "Rowan"],
      [180, 560, "#c7a8ff", "Vale"],
      [1108, 560, "#f4e15d", "Mira"]
    ],
    batteries: [[196, 188], [1088, 184], [202, 548], [1086, 542], [640, 542]],
    relays: [[356, 250], [920, 250]],
    labels: [
      [640, 246, "GRAND STAIR"],
      [302, 254, "CHECKER HALL"],
      [964, 254, "LAB WING"],
      [340, 552, "BATHS"],
      [640, 552, "PARLOR"],
      [976, 552, "DINING"]
    ],
    walls: [
      { x: 92, y: 96, w: 1096, h: 22 },
      { x: 92, y: 602, w: 1096, h: 22 },
      { x: 92, y: 96, w: 22, h: 528 },
      { x: 1166, y: 96, w: 22, h: 528 },
      { x: 404, y: 118, w: 24, h: 160 },
      { x: 404, y: 344, w: 24, h: 114 },
      { x: 404, y: 520, w: 24, h: 82 },
      { x: 852, y: 118, w: 24, h: 164 },
      { x: 852, y: 350, w: 24, h: 108 },
      { x: 852, y: 520, w: 24, h: 82 },
      { x: 522, y: 118, w: 24, h: 118 },
      { x: 734, y: 118, w: 24, h: 118 },
      { x: 522, y: 390, w: 24, h: 102 },
      { x: 734, y: 390, w: 24, h: 102 },
      { x: 428, y: 318, w: 160, h: 24 },
      { x: 692, y: 318, w: 160, h: 24 },
      { x: 428, y: 472, w: 160, h: 24 },
      { x: 692, y: 472, w: 160, h: 24 },
      { x: 174, y: 308, w: 170, h: 24 },
      { x: 174, y: 308, w: 24, h: 116 },
      { x: 320, y: 396, w: 24, h: 86 },
      { x: 936, y: 322, w: 182, h: 24 },
      { x: 936, y: 322, w: 24, h: 116 },
      { x: 1094, y: 322, w: 24, h: 154 },
      { x: 240, y: 478, w: 182, h: 24 },
      { x: 862, y: 478, w: 250, h: 24 }
    ],
    props: [
      { x: 248, y: 160, w: 94, h: 48, color: "#243333" },
      { x: 306, y: 238, w: 54, h: 96, color: "#33241d" },
      { x: 586, y: 150, w: 108, h: 56, color: "#33241d" },
      { x: 594, y: 510, w: 92, h: 54, color: "#2f3320" },
      { x: 940, y: 190, w: 92, h: 52, color: "#1f3b3a" },
      { x: 1020, y: 398, w: 70, h: 110, color: "#303822" },
      { x: 222, y: 506, w: 84, h: 64, color: "#1f3438" },
      { x: 324, y: 516, w: 72, h: 48, color: "#393024" },
      { x: 910, y: 524, w: 148, h: 52, color: "#3a3320" },
      { x: 656, y: 256, w: 64, h: 46, color: "#402629" }
    ]
  },
  "Gloamhall Manor Compact": {
    floor: ["#17151a", "#2a1922", "#2a2f1d"],
    event: {
      name: "Storm Flash",
      color: "#dff7ff",
      status: "Storm flash exposed the compact manor",
      detail: "A short lightning burst reveals the compact wing before the anomaly can slip away.",
      effect: "reveal"
    },
    player: [206, 212],
    anomaly: [640, 348],
    investigators: [
      [996, 214, "#7ae4d6", "Vale"],
      [262, 534, "#f4b35d", "Mira"],
      [1030, 520, "#c7a8ff", "Sable"]
    ],
    batteries: [[220, 210], [1040, 220], [274, 532], [1006, 526], [640, 520]],
    relays: [[358, 352], [914, 352]],
    labels: [
      [640, 230, "STAIR HALL"],
      [306, 246, "CHECKER"],
      [964, 246, "STUDY"],
      [640, 536, "PARLOR"]
    ],
    walls: [
      { x: 92, y: 96, w: 1096, h: 22 },
      { x: 92, y: 602, w: 1096, h: 22 },
      { x: 92, y: 96, w: 22, h: 528 },
      { x: 1166, y: 96, w: 22, h: 528 },
      { x: 416, y: 118, w: 24, h: 172 },
      { x: 416, y: 354, w: 24, h: 248 },
      { x: 840, y: 118, w: 24, h: 174 },
      { x: 840, y: 360, w: 24, h: 242 },
      { x: 494, y: 320, w: 144, h: 24 },
      { x: 718, y: 320, w: 122, h: 24 },
      { x: 494, y: 466, w: 154, h: 24 },
      { x: 716, y: 466, w: 124, h: 24 },
      { x: 202, y: 326, w: 166, h: 24 },
      { x: 202, y: 326, w: 24, h: 114 },
      { x: 344, y: 408, w: 24, h: 96 },
      { x: 930, y: 332, w: 168, h: 24 },
      { x: 930, y: 332, w: 24, h: 132 },
      { x: 1074, y: 332, w: 24, h: 174 }
    ],
    props: [
      { x: 252, y: 160, w: 82, h: 48, color: "#223434" },
      { x: 314, y: 238, w: 54, h: 86, color: "#33241d" },
      { x: 570, y: 150, w: 132, h: 56, color: "#33241d" },
      { x: 590, y: 510, w: 104, h: 50, color: "#2f3320" },
      { x: 944, y: 198, w: 92, h: 54, color: "#1f3b3a" },
      { x: 1010, y: 414, w: 76, h: 96, color: "#303822" },
      { x: 250, y: 500, w: 86, h: 58, color: "#1f3438" },
      { x: 890, y: 520, w: 160, h: 50, color: "#3a3320" }
    ]
  }
};

const builderPlaytestMapName = "Builder Playtest";
const builderPlaytestMapKey = "afterlight-playtest-map";
const builderPlaytestOptionsKey = "afterlight-playtest-options";
maps[builderPlaytestMapName] = {
  ...maps["Gloamhall Manor Compact"],
  labels: maps["Gloamhall Manor Compact"].labels.map((label) => [...label]),
  walls: maps["Gloamhall Manor Compact"].walls.map((wall) => ({ ...wall })),
  props: maps["Gloamhall Manor Compact"].props.map((prop) => ({ ...prop })),
  investigators: maps["Gloamhall Manor Compact"].investigators.map((spawn) => [...spawn]),
  batteries: maps["Gloamhall Manor Compact"].batteries.map((spawn) => [...spawn])
};

let walls = [];
let props = [];
let mapDecorations = [];
let mapBackgroundImage = null;
let mapForegroundImage = null;
let mapOccluders = [];
let roomLabels = [];
let floorColors = maps[currentMapName].floor;
const floorPatterns = new Map();
const mapImageCache = new Map();

const state = {
  phase: "lobby",
  time: matchDuration,
  player: makeAgent(640, 380, "#dfefff", "Player"),
  anomaly: makeAnomaly(),
  investigators: [],
  batteries: [],
  relays: [],
  echoes: [],
  particles: [],
  rings: [],
  blackout: 0,
  comebackBatterySpawned: false,
  stats: makeStats()
};

function makeStats() {
  return {
    startedAt: matchDuration,
    abilityUses: 0,
    arenaEvents: 0,
    echoesDeployed: 0,
    echoesDispelled: 0,
    pickups: 0,
    damageDealt: 0,
    contacts: 0,
    revives: 0,
    relaysCharged: 0,
    relaysCorrupted: 0,
    ghostCatches: 0,
    lightningReveals: 0,
    batteryEvents: [],
    ghostAttackEvents: [],
    lightningEvents: [],
    reviveEvents: [],
    outcome: "Pending"
  };
}

function getMatchOptions() {
  return {
    duration: matchDuration,
    durationLabel: formatTime(matchDuration),
    botPressure,
    botPressureLabel: getBotTuning().label,
    reduceMotion,
    highContrast
  };
}

function getBotTuning() {
  return botPressureTuning[botPressure] ?? botPressureTuning.standard;
}

function setMatchDuration(value) {
  const parsed = Number.parseInt(value, 10);
  matchDuration = [180, 300, 420].includes(parsed) ? parsed : 300;
  durationSelect.value = String(matchDuration);
}

function setBotPressure(value) {
  botPressure = botPressureTuning[value] ? value : "standard";
  botPressureSelect.value = botPressure;
}

function makeAgent(x, y, color, name) {
  return {
    x,
    y,
    spawnX: x,
    spawnY: y,
    vx: 0,
    vy: 0,
    radius: 10,
    speed: investigatorMoveSpeed,
    dash: 0,
    dashCooldown: 0,
    abilityCooldown: 0,
    battery: maxBatteryCapacity,
    overcharge: 0,
    invulnerable: 0,
    carriedByAnomaly: false,
    catchPressure: 0,
    warningContactTime: 0,
    attackCooldown: 0,
    resolve: 100,
    aim: 0,
    lightOn: false,
    lastLightOn: false,
    reviveProgress: 0,
    color,
    name,
    ai: false,
    wander: randomAngle(),
    nextTurn: 0,
    intent: "patrol",
    intentTarget: null,
    patrolIndex: Math.floor(randomRange(0, Math.max(1, roomLabels.length))),
    searchTarget: null,
    anomalyMemory: 0,
    lastKnownAnomaly: null,
    probeTimer: 0,
    probeCooldown: randomRange(aiProbeMinCooldown, aiProbeMaxCooldown)
  };
}

function getHumanInvestigatorCount() {
  if (lobbyState?.members?.length) {
    return lobbyState.members.filter((member) => member.role === "Investigator" && !String(member.id ?? "").startsWith("bot")).length;
  }
  return playerRole === "Investigator" ? 1 : 0;
}

function makeAnomaly() {
  const map = maps[currentMapName] ?? maps["Observatory Annex"];
  return {
    x: map.anomaly[0],
    y: map.anomaly[1],
    vx: 0,
    vy: 0,
    radius: 10,
    speed: anomalyMoveSpeed,
    dash: 0,
    dashCooldown: 0,
    abilityCooldown: 0,
    stability: 100,
    revealed: 0,
    damageFlash: 0,
    carryTimer: 0,
    carriedAgent: null,
    shockTimer: 0,
    escapeTimer: 0,
    lastMoveX: 1,
    lastMoveY: 0,
    escapeDirX: 1,
    escapeDirY: 0,
    aim: 0,
    ai: true,
    target: null
  };
}

function resetMatch() {
  stopMapMusic();
  loadMap(currentMapName);
  setMatchSeed(replaySeed ?? createMatchSeed());
  const map = maps[currentMapName] ?? maps["Observatory Annex"];
  state.phase = "lobby";
  state.time = matchDuration;
  countdown = 0;
  state.player = makeAgent(map.player[0], map.player[1], playerSuit.color, "Player");
  state.anomaly = makeAnomaly();
  state.investigators = map.investigators.map(([x, y, color, name]) => ({ ...makeAgent(x, y, color, name), ai: true }));
  state.batteries = map.batteries.map(([x, y]) => makeBattery(x, y, false));
  batterySpawnTimer = batterySpawnInterval;
  for (let i = 0; i < startingBatteryPickups; i += 1) {
    spawnBatteryPickup(false);
  }
  state.relays = relaysEnabled ? map.relays.map(([x, y]) => makeRelay(x, y)) : [];
  state.echoes = [];
  state.particles = [];
  state.rings = [];
  state.blackout = 0;
  state.comebackBatterySpawned = false;
  state.stats = makeStats();
  cameraShake = 0;
  abilityFlash = 0;
  interactBoost = 0;
  signalPulse = 0;
  lastSignalPing = 0;
  lightning = 0;
  arenaFlashColor = maps[currentMapName]?.event?.color ?? "#dff7ff";
  setArenaEventCooldown(randomRange(10, 18));
  seedInput.value = replaySeed ? formatSeed(replaySeed) : "";
  resultsPanel.hidden = true;
  lobbyPanel.hidden = false;
  updateLobbyPanel(lobbyState);
  publishPresence("lobby");
  setStatus(`${currentMapName} ready`);
  syncScreen();
}

function loadMap(name) {
  installBuilderPlaytestMap();
  currentMapName = maps[name] ? name : "Observatory Annex";
  builderPlaytestOptions = currentMapName === builderPlaytestMapName
    ? loadBuilderPlaytestOptions()
    : { freezeAnomaly: false };
  const map = maps[currentMapName];
  walls = map.walls.map((wall) => ({ ...wall }));
  props = map.props.map((prop) => ({ ...prop }));
  mapDecorations = (map.decorations ?? []).map((decoration) => ({ ...decoration }));
  mapBackgroundImage = map.backgroundImage ? { ...map.backgroundImage } : null;
  mapForegroundImage = map.foregroundImage ? { ...map.foregroundImage } : null;
  mapOccluders = (map.occluders ?? []).map((occluder) => ({ ...occluder }));
  roomLabels = map.labels.map((label) => [...label]);
  floorColors = [...map.floor];
}

function loadBuilderPlaytestOptions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(builderPlaytestOptionsKey) ?? "{}");
    return {
      freezeAnomaly: Boolean(parsed?.freezeAnomaly)
    };
  } catch {
    return { freezeAnomaly: false };
  }
}

function installBuilderPlaytestMap() {
  let builderMap = null;
  try {
    builderMap = JSON.parse(localStorage.getItem(builderPlaytestMapKey) ?? "null");
  } catch {
    builderMap = null;
  }
  if (!builderMap || typeof builderMap !== "object") {
    return;
  }
  const fallback = maps["Gloamhall Manor Compact"];
  maps[builderPlaytestMapName] = {
    ...fallback,
    ...builderMap,
    event: { ...fallback.event, ...(builderMap.event ?? {}) },
    floor: Array.isArray(builderMap.floor) && builderMap.floor.length >= 3 ? [...builderMap.floor] : [...fallback.floor],
    player: Array.isArray(builderMap.player) ? [...builderMap.player] : [...fallback.player],
    anomaly: Array.isArray(builderMap.anomaly) ? [...builderMap.anomaly] : [...fallback.anomaly],
    investigators: Array.isArray(builderMap.investigators) ? builderMap.investigators.map((spawn) => [...spawn]) : fallback.investigators.map((spawn) => [...spawn]),
    batteries: Array.isArray(builderMap.batteries) ? builderMap.batteries.map((spawn) => [...spawn]) : fallback.batteries.map((spawn) => [...spawn]),
    relays: Array.isArray(builderMap.relays) ? builderMap.relays.map((relay) => [...relay]) : [],
    labels: Array.isArray(builderMap.labels) ? builderMap.labels.map((label) => [...label]) : fallback.labels.map((label) => [...label]),
    walls: Array.isArray(builderMap.walls) ? builderMap.walls.map((wall) => ({ ...wall })) : fallback.walls.map((wall) => ({ ...wall })),
    props: Array.isArray(builderMap.props) ? builderMap.props.map((prop) => ({ ...prop })) : fallback.props.map((prop) => ({ ...prop })),
    decorations: Array.isArray(builderMap.decorations) ? builderMap.decorations.map((decoration) => ({ ...decoration })) : [],
    backgroundImage: builderMap.backgroundImage ? { ...builderMap.backgroundImage } : null,
    foregroundImage: builderMap.foregroundImage ? { ...builderMap.foregroundImage } : null,
    occluders: Array.isArray(builderMap.occluders) ? builderMap.occluders.map((occluder) => ({ ...occluder })) : [],
    music: builderMap.music ? { ...builderMap.music } : null,
    soundEffects: builderMap.soundEffects && typeof builderMap.soundEffects === "object" ? { ...builderMap.soundEffects } : {}
  };
}

function makeBattery(x, y, active = true, kind = "standard") {
  return { x, y, radius: kind === "overcharge" ? 15 : 11, active, kind, pulse: active ? visualRandom() * 10 : 0 };
}

function clampWorldX(x, radius = 0) {
  return clamp(x, radius, world.width - radius);
}

function clampWorldY(y, radius = 0) {
  return clamp(y, radius, world.height - radius);
}

function makeRelay(x, y) {
  return { x, y, radius: 19, charge: 0, active: false, corrupted: 0, pulse: visualRandom() * 10 };
}

function startMatch() {
  ready = true;
  if (isPartyHostActive()) {
    playerRole = "Investigator";
    syncRoleUi();
    applyPartyAssignments();
  }
  currentScreen = "lobby";
  syncScreen();
  services.network.host({ lobbyId: lobbyState?.id ?? "local", map: currentMapName, role: playerRole });
  state.phase = "countdown";
  state.time = matchDuration;
  countdown = 3;
  state.anomaly.abilityCooldown = initialAnomalyBlackoutDelay;
  state.stats = makeStats();
  resultsPanel.hidden = true;
  lobbyPanel.hidden = true;
  if (partyPanel) {
    partyPanel.hidden = true;
  }
  if (isPartyHostActive()) {
    applyPartyAssignments();
  } else if (playerRole === "Anomaly") {
    state.anomaly.ai = false;
    state.player.x = state.anomaly.x;
    state.player.y = state.anomaly.y;
  } else {
    state.anomaly.ai = true;
  }
  partySession.socket?.emit("host:start", { seed: formatSeed(), map: currentMapName, duration: matchDuration });
  publishPresence("launching");
  publishMatchEvent("match_launching", { countdown, lobbyId: lobbyState?.id ?? null, seed: formatSeed(), matchOptions: getMatchOptions() }, true);
  playSound("start");
  setStatus(`${currentMapName} launch in 3`);
}

function beginMatch() {
  state.phase = "playing";
  countdown = 0;
  playMapSoundCue("round_intro");
  startMapMusic();
  publishPresence("playing");
  publishMatchEvent("match_started", makeMatchSnapshot(), true);
  setStatus(playerRole === "Anomaly" ? "Anomaly link established" : "Investigator link established");
  if (maps[currentMapName]?.music?.src && !soundEnabled) {
    setStatus("Sound is off; turn on Sound to hear map music");
  }
}

function endMatch(text) {
  state.phase = "ended";
  stopMapMusic();
  playMapSoundCue("round_outro");
  state.stats.outcome = text;
  const summary = makeRoundSummary(text);
  lastRoundSummary = summary;
  const achievements = services.achievements.evaluateRound(summary);
  const career = services.stats.recordRound(summary);
  showResults(text, achievements, career);
  publishPresence("results", text);
  publishMatchEvent("match_ended", summary, true);
  services.network.disconnect("match ended");
  playSound(text.includes("contained") ? "win" : "lose");
  setStatus(text);
}

function setStatus(text) {
  statusEl.textContent = text;
  messageTimer = 2.6;
}

function update(dt) {
  if (messageTimer > 0) {
    messageTimer -= dt;
  }

  if (state.phase === "countdown") {
    countdown = Math.max(0, countdown - dt);
    setStatus(`${currentMapName} launch in ${Math.max(1, Math.ceil(countdown))}`);
    updateHud();
    if (countdown <= 0) {
      beginMatch();
    }
    return;
  }

  if (state.phase !== "playing") {
    return;
  }

  updateControllerInput();
  state.time = Math.max(0, state.time - dt);
  lightning = Math.max(0, lightning - dt);
  arenaEventCooldown = Math.max(0, arenaEventCooldown - dt);
  state.blackout = Math.max(0, state.blackout - dt);
  cameraShake = Math.max(0, cameraShake - dt);
  abilityFlash = Math.max(0, abilityFlash - dt);
  signalPulse = Math.max(0, signalPulse - dt);
  state.player.abilityCooldown = Math.max(0, state.player.abilityCooldown - dt);
  state.anomaly.abilityCooldown = Math.max(0, state.anomaly.abilityCooldown - dt);
  updateOverchargeTimers(dt);
  updateAnomalyStateTimers(dt);
  const signal = getSignalStrength();
  if (signal > GameBalance.warning.signalPingThreshold && performance.now() - lastSignalPing > 1100 - signal * 460) {
    signalPulse = 0.62;
    lastSignalPing = performance.now();
    playSound("signal");
  }
  if (arenaEventCooldown <= 0) {
    triggerArenaEvent();
    setArenaEventCooldown(randomRange(18, 36));
  }

  if (isPartyHostActive()) {
    controlPartyActors(dt);
  } else if (playerRole === "Anomaly") {
    controlAnomaly(state.anomaly, dt);
    updateAiInvestigators(dt);
  } else {
    controlInvestigator(state.player, dt);
    updateAiAnomaly(dt);
    updateAiInvestigators(dt);
  }

  resolveFlashlights(dt);
  updateBatterySpawns(dt);
  updateComebackBattery();
  resolvePickups();
  resolveRevives(dt);
  resolveRelays(dt);
  updateEchoes(dt);
  updateParticles(dt);
  updateRings(dt);
  updateHud();
  publishPartySnapshot();

  if (state.anomaly.stability <= 0) {
    endMatch("Investigators contained the anomaly");
  } else if (allInvestigatorsDown()) {
    endMatch("The anomaly collapsed the team");
  } else if (state.time <= 0) {
    endMatch("Round ended in a draw");
  }
}

function setArenaEventCooldown(value) {
  arenaEventCooldown = value;
  arenaEventWindow = Math.max(value, 1);
}

function triggerArenaEvent() {
  const event = maps[currentMapName]?.event ?? maps["Observatory Annex"].event;
  arenaFlashColor = event.color;
  lightning = reduceMotion ? 0.26 : 0.68;
  state.stats.arenaEvents += 1;
  publishMatchEvent("arena_event", { event: event.name, effect: event.effect, count: state.stats.arenaEvents }, true);
  createRing(world.width / 2, world.height / 2, event.color, 520, 0.85);

  if (event.effect === "echo") {
    deployEchoes(false);
    addCameraShake(0.08);
  } else if (event.effect === "signal") {
    signalPulse = 0.84;
    state.anomaly.revealed = Math.max(state.anomaly.revealed, 0.32);
    for (const battery of state.batteries) {
      if (battery.active) {
        battery.pulse += 4;
      }
    }
  } else {
    state.anomaly.revealed = Math.max(state.anomaly.revealed, GameBalance.lightning.revealDurationSeconds);
    state.stats.lightningReveals += 1;
    recordTelemetry("lightningEvents", {
      event: event.name,
      anomalyPosition: snapshotPoint(state.anomaly),
      activeTrackers: getInvestigators().filter((agent) => agent.resolve > 0).length
    });
    playSound("lightning");
  }

  burst(state.anomaly.x, state.anomaly.y, event.color, 18);
  setStatus(event.status);
}

function controlInvestigator(agent, dt) {
  if (agent.carriedByAnomaly) {
    setInvestigatorLight(agent, false);
    agent.dash = 0;
    agent.catchPressure = 0;
    agent.x = state.anomaly.x - Math.cos(state.anomaly.aim) * 24;
    agent.y = state.anomaly.y - Math.sin(state.anomaly.aim) * 24;
    return;
  }
  if (agent.resolve <= 0) {
    setInvestigatorLight(agent, false);
    agent.dash = 0;
    updateDash(agent, dt);
    return;
  }
  const movement = readMovement();
  const speed = agent.speed;
  moveCircle(agent, movement.x * speed * dt, movement.y * speed * dt);
  agent.aim = readAim(agent);
  setInvestigatorLight(agent, (mouse.down || controller.light) && agent.battery > 0 && agent.resolve > 0);
  if (agent.lightOn) {
    const before = agent.battery;
    agent.battery = Math.max(0, agent.battery - dt * GameBalance.tracker.flashlightDrainPerSecond);
    recordBatteryDrain(agent, before, agent.battery, "flashlight_on");
  }
  updateDash(agent, dt);
}

function controlAnomaly(anomaly, dt) {
  if (anomaly.shockTimer > 0) {
    anomaly.vx = 0;
    anomaly.vy = 0;
    revealAnomaly(1);
    touchInvestigators(dt);
    return;
  }
  if (isPlaytestAnomalyFrozen()) {
    holdAnomalyStill(anomaly, dt);
    return;
  }
  const movement = getAnomalyMovementVector(anomaly, readMovement());
  const speed = anomaly.speed * getAnomalySpeedMultiplier(anomaly) * (anomaly.dash > 0 ? 2.15 : 1);
  if (Math.hypot(movement.x, movement.y) > 0.08) {
    anomaly.aim = Math.atan2(movement.y, movement.x);
  }
  moveCircle(anomaly, movement.x * speed * dt, movement.y * speed * dt);
  updateCarriedInvestigatorPosition();
  if (anomaly.dash > 0) {
    revealAnomaly(0.9);
  }
  updateDash(anomaly, dt);
  touchInvestigators(dt);
}

function controlPartyActors(dt) {
  applyPartyAssignments();
  updateControllerInput();
  const playerInput = getPartyInput(state.player.remotePlayerId);
  if (playerInput) {
    controlInvestigatorFromInput(state.player, playerInput, dt);
  } else {
    controlInvestigator(state.player, dt);
  }

  for (const agent of state.investigators) {
    const input = getPartyInput(agent.remotePlayerId);
    if (input) {
      controlInvestigatorFromInput(agent, input, dt);
    }
  }

  const anomalyInput = getPartyInput(state.anomaly.remotePlayerId);
  if (anomalyInput) {
    controlAnomalyFromInput(state.anomaly, anomalyInput, dt);
  } else {
    updateAiAnomaly(dt);
  }

  updateAiInvestigators(dt);
}

function controlInvestigatorFromInput(agent, input, dt) {
  if (!agent || agent.carriedByAnomaly) {
    return;
  }
  if (agent.resolve <= 0) {
    setInvestigatorLight(agent, false);
    agent.dash = 0;
    updateDash(agent, dt);
    return;
  }
  const movement = normalizeInputVector(input.move);
  const speed = agent.speed;
  moveCircle(agent, movement.x * speed * dt, movement.y * speed * dt);
  const aim = normalizeInputVector(input.aim ?? input.move);
  if (Math.hypot(aim.x, aim.y) > 0.12) {
    agent.aim = Math.atan2(aim.y, aim.x);
  }
  setInvestigatorLight(agent, input.light && agent.battery > 0 && agent.resolve > 0);
  if (agent.lightOn) {
    const before = agent.battery;
    agent.battery = Math.max(0, agent.battery - dt * GameBalance.tracker.flashlightDrainPerSecond);
    recordBatteryDrain(agent, before, agent.battery, "flashlight_on");
  }
  updateDash(agent, dt);
}

function controlAnomalyFromInput(anomaly, input, dt) {
  if (anomaly.shockTimer > 0) {
    anomaly.vx = 0;
    anomaly.vy = 0;
    revealAnomaly(1);
    touchInvestigators(dt);
    return;
  }
  if (isPlaytestAnomalyFrozen()) {
    holdAnomalyStill(anomaly, dt);
    return;
  }
  if (input.dash) {
    triggerDashForActor(anomaly, "Anomaly");
  }
  if (input.ability && anomaly.abilityCooldown <= 0) {
    anomaly.abilityCooldown = abilityMax.Anomaly;
    triggerBlackout({ trackStats: true, announce: true });
  }
  const movement = getAnomalyMovementVector(anomaly, normalizeInputVector(input.move));
  const speed = anomaly.speed * getAnomalySpeedMultiplier(anomaly) * (anomaly.dash > 0 ? 2.15 : 1);
  if (Math.hypot(movement.x, movement.y) > 0.08) {
    anomaly.aim = Math.atan2(movement.y, movement.x);
  }
  moveCircle(anomaly, movement.x * speed * dt, movement.y * speed * dt);
  updateCarriedInvestigatorPosition();
  if (anomaly.dash > 0) {
    revealAnomaly(0.9);
  }
  updateDash(anomaly, dt);
  touchInvestigators(dt);
}

function normalizeInputVector(value) {
  const x = clamp(Number(value?.x) || 0, -1, 1);
  const y = clamp(Number(value?.y) || 0, -1, 1);
  const len = Math.hypot(x, y);
  return len > 1 ? { x: x / len, y: y / len } : { x, y };
}

function getAnomalyMovementVector(anomaly, movement) {
  const len = Math.hypot(movement.x, movement.y);
  if (anomaly.escapeTimer > 0) {
    if (len > 0.08) {
      setAnomalyRunDirection(anomaly, movement.x / len, movement.y / len);
      return movement;
    }
    return getAnomalyEscapeDirection(anomaly);
  }
  if (len > 0.08) {
    setAnomalyRunDirection(anomaly, movement.x / len, movement.y / len);
  }
  return movement;
}

function setAnomalyRunDirection(anomaly, x, y) {
  anomaly.lastMoveX = x;
  anomaly.lastMoveY = y;
  if (anomaly.escapeTimer > 0) {
    anomaly.escapeDirX = x;
    anomaly.escapeDirY = y;
  }
}

function getAnomalyEscapeDirection(anomaly) {
  const fallbackX = Math.cos(anomaly.aim ?? 0);
  const fallbackY = Math.sin(anomaly.aim ?? 0);
  const x = Number.isFinite(anomaly.escapeDirX) ? anomaly.escapeDirX : fallbackX;
  const y = Number.isFinite(anomaly.escapeDirY) ? anomaly.escapeDirY : fallbackY;
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

function isPlaytestAnomalyFrozen() {
  return currentMapName === builderPlaytestMapName && builderPlaytestOptions.freezeAnomaly;
}

function holdAnomalyStill(anomaly, dt) {
  anomaly.vx = 0;
  anomaly.vy = 0;
  anomaly.dash = 0;
  updateDash(anomaly, dt);
  updateCarriedInvestigatorPosition();
  touchInvestigators(dt);
}

function updateAiAnomaly(dt) {
  const anomaly = state.anomaly;
  if (anomaly.shockTimer > 0) {
    anomaly.vx = 0;
    anomaly.vy = 0;
    revealAnomaly(1);
    touchInvestigators(dt);
    return;
  }
  if (isPlaytestAnomalyFrozen()) {
    holdAnomalyStill(anomaly, dt);
    return;
  }
  const tuning = getBotTuning();
  const targets = getInvestigators().filter((agent) => agent.resolve > 0);
  if (!targets.length) {
    return;
  }
  const brightThreat = targets.find((agent) => agent.lightOn && inLightCone(agent, anomaly));
  const relayTarget = relaysEnabled ? nearestCorruptibleRelay(anomaly, 460) : null;
  const target = relayTarget ?? chooseAnomalyTarget(targets);

  if (brightThreat && anomaly.abilityCooldown <= 0) {
    anomaly.abilityCooldown = abilityMax.Anomaly;
    triggerBlackout({ trackStats: false, announce: true });
  }

  const fleeing = (brightThreat && state.blackout <= 0) || anomaly.escapeTimer > 0;
  const directionTarget = fleeing ? (brightThreat ?? target) : target;
  const moveTarget = fleeing ? directionTarget : getAiAnomalyMoveTarget(anomaly, directionTarget);
  const baseAngle = Math.atan2(moveTarget.y - anomaly.y, moveTarget.x - anomaly.x);
  const dir = fleeing ? baseAngle + Math.PI + Math.sin(performance.now() * 0.002) * 0.9 : baseAngle;
  const urgency = (relayTarget ? 1.08 : fleeing ? 1.15 : 1) * getAnomalySpeedMultiplier(anomaly);
  anomaly.aim = dir;
  setAnomalyRunDirection(anomaly, Math.cos(dir), Math.sin(dir));
  if (fleeing && anomaly.dashCooldown <= 0) {
    anomaly.dash = 0.18;
    anomaly.dashCooldown = 2.2;
    revealAnomaly(0.9);
    playSound("dash");
  }
  moveCircle(anomaly, Math.cos(dir) * anomaly.speed * urgency * tuning.anomalySpeed * dt, Math.sin(dir) * anomaly.speed * urgency * tuning.anomalySpeed * dt);
  updateCarriedInvestigatorPosition();
  if (anomaly.dash > 0) {
    revealAnomaly(0.9);
  }
  updateDash(anomaly, dt);
  touchInvestigators(dt);
}

function updateAiInvestigators(dt) {
  for (const agent of state.investigators) {
    if (agent.remotePlayerId) {
      continue;
    }
    if (agent.carriedByAnomaly) {
      setInvestigatorLight(agent, false);
      agent.dash = 0;
      updateCarriedInvestigatorPosition();
      continue;
    }
    if (agent.resolve <= 0) {
      setInvestigatorLight(agent, false);
      continue;
    }
    updateAiAnomalyAwareness(agent, dt);
    agent.nextTurn -= dt;
    if (agent.nextTurn <= 0) {
      agent.nextTurn = randomRange(0.45, 1.35);
      assignInvestigatorIntent(agent);
    }
    steerAiInvestigator(agent, dt);
    const focus = chooseInvestigatorFocus(agent);
    agent.aim = Math.atan2(focus.y - agent.y, focus.x - agent.x);
    setInvestigatorLight(agent, shouldAiUseLight(agent, focus));
    if (agent.lightOn) {
      const before = agent.battery;
      agent.battery = Math.max(0, agent.battery - dt * GameBalance.tracker.aiFlashlightDrainPerSecond);
      recordBatteryDrain(agent, before, agent.battery, "flashlight_on");
    }
  }
}

function chooseAnomalyTarget(targets) {
  return targets
    .map((agent) => {
      const isolation = targets.filter((other) => other !== agent && distance(agent, other) < 150).length === 0 ? 28 : 0;
      const weakness = 100 - agent.resolve;
      const batteryValue = Math.max(0, maxBatteryCapacity * 0.45 - agent.battery) * 0.35;
      const reach = 420 - distance(state.anomaly, agent);
      return { agent, score: isolation + weakness + batteryValue + reach * 0.16 };
    })
    .sort((a, b) => b.score - a.score)[0].agent;
}

function assignInvestigatorIntent(agent) {
  const downed = nearestDowned(agent, 360);
  if (downed && !aiAnomalyThreatensPoint(agent, downed, 118)) {
    agent.intent = "revive";
    agent.intentTarget = downed;
    return;
  }

  const anomalyIntel = getAiAnomalyIntel(agent);
  const closeThreat = anomalyIntel && distance(agent, anomalyIntel) < 145;
  if (closeThreat && agent.resolve < 52) {
    agent.intent = "evade";
    agent.intentTarget = anomalyIntel;
    return;
  }

  const overchargeBattery = nearestBattery(agent, 540, (pickup) => pickup.kind === "overcharge");
  const battery = overchargeBattery ?? (agent.battery < maxBatteryCapacity * lowBatterySpawnThreshold ? nearestBattery(agent, 540) : null);
  if (battery) {
    agent.intent = "battery";
    agent.intentTarget = battery;
    return;
  }

  const relay = relaysEnabled ? nearestRelayObjective(agent, 560) : null;
  if (relay) {
    agent.intent = "relay";
    agent.intentTarget = relay;
    return;
  }

  agent.intent = anomalyIntel ? "hunt" : "patrol";
  agent.intentTarget = anomalyIntel ?? getAiPatrolTarget(agent);
  agent.wander = randomAngle();
}

function steerAiInvestigator(agent, dt) {
  const tuning = getBotTuning();
  const target = agent.intentTarget;
  let dx = Math.cos(agent.wander);
  let dy = Math.sin(agent.wander);
  let speedFactor = 0.42;

  if (agent.intent === "evade") {
    const threat = target ?? getAiAnomalyIntel(agent) ?? state.anomaly;
    dx = agent.x - threat.x;
    dy = agent.y - threat.y;
    speedFactor = 0.72;
  } else if (target && (agent.intent === "revive" || agent.intent === "battery" || agent.intent === "relay")) {
    dx = target.x - agent.x;
    dy = target.y - agent.y;
    speedFactor = agent.intent === "revive" ? 0.68 : 0.58;
  } else if (target && agent.intent === "hunt") {
    const orbit = Math.atan2(target.y - agent.y, target.x - agent.x) + Math.PI * 0.5;
    const approach = Math.atan2(target.y - agent.y, target.x - agent.x);
    dx = Math.cos(orbit) * 0.55 + Math.cos(approach) * 0.45;
    dy = Math.sin(orbit) * 0.55 + Math.sin(approach) * 0.45;
    speedFactor = 0.48;
  } else if (target && agent.intent === "patrol") {
    dx = target.x - agent.x;
    dy = target.y - agent.y;
    speedFactor = 0.46;
    if (distance(agent, target) < 54) {
      agent.searchTarget = null;
    }
  }

  const len = Math.hypot(dx, dy) || 1;
  moveCircle(agent, (dx / len) * agent.speed * speedFactor * tuning.investigatorSpeed * dt, (dy / len) * agent.speed * speedFactor * tuning.investigatorSpeed * dt);
  updateDash(agent, dt);
}

function shouldAiUseLight(agent, target = state.anomaly) {
  if (agent.battery <= 0 || agent.resolve <= 0) {
    return false;
  }
  const origin = getInvestigatorFlashlightOrigin(agent);
  const dist = distance(origin, target);
  const range = getFlashlightBeamRange(agent);
  if (dist > range || segmentBlocked(origin.x, origin.y, target.x, target.y)) {
    return false;
  }
  if (target !== state.anomaly) {
    if (target.kind === "patrol") {
      return agent.probeTimer > 0 && getAnomalyProximityWarning(agent) > 0;
    }
    if (target.kind === "search") {
      return agent.probeTimer > 0 && dist < range;
    }
    return dist < 260;
  }
  return dist < 210 || state.anomaly.revealed > aiAnomalyVisibleThreshold || agent.anomalyMemory > 0.35;
}

function chooseInvestigatorFocus(agent) {
  const anomalyIntel = getAiAnomalyIntel(agent);
  const echo = nearestEcho(agent, 320);
  if (echo && (!anomalyIntel || distance(agent, echo) < distance(agent, anomalyIntel) * 0.86)) {
    return echo;
  }
  if (anomalyIntel) {
    return anomalyIntel;
  }
  return agent.intent === "patrol" ? getAiPatrolTarget(agent) : getAiSearchTarget(agent);
}

function updateAiAnomalyAwareness(agent, dt) {
  agent.anomalyMemory = Math.max(0, agent.anomalyMemory - dt);
  agent.probeTimer = Math.max(0, agent.probeTimer - dt);
  agent.probeCooldown = Math.max(0, agent.probeCooldown - dt);

  if (canAiSeeAnomaly(agent)) {
    rememberAnomaly(agent, state.anomaly.revealed > 0.42 ? 10 : 28);
    return;
  }

  const warning = getAnomalyProximityWarning(agent);
  if (agent.probeTimer <= 0 && agent.probeCooldown <= 0 && (warning || visualChance(dt * 0.18))) {
    const sweepAngle = agent.aim + randomRange(-0.9, 0.9);
    agent.probeTimer = randomRange(warning ? 0.5 : 0.28, warning ? 0.9 : 0.52);
    agent.probeCooldown = randomRange(aiProbeMinCooldown + 0.45, aiProbeMaxCooldown + 0.9);
    agent.searchTarget = warning ? {
      x: clampWorldX(agent.x + Math.cos(sweepAngle) * 170, agent.radius),
      y: clampWorldY(agent.y + Math.sin(sweepAngle) * 170, agent.radius),
      kind: "search"
    } : pickAiSearchTarget(agent);
  }
}

function canAiSeeAnomaly(agent) {
  const dist = distance(agent, state.anomaly);
  if (agent.lightOn && inLightCone(agent, state.anomaly)) {
    return true;
  }
  return state.anomaly.revealed > aiAnomalyVisibleThreshold
    && dist < 500
    && !segmentBlocked(agent.x, agent.y, state.anomaly.x, state.anomaly.y);
}

function rememberAnomaly(agent, scatter) {
  const angle = randomAngle();
  const offset = randomRange(0, scatter);
  agent.lastKnownAnomaly = {
    x: clampWorldX(state.anomaly.x + Math.cos(angle) * offset, state.anomaly.radius),
    y: clampWorldY(state.anomaly.y + Math.sin(angle) * offset, state.anomaly.radius),
    kind: "anomaly-memory"
  };
  agent.anomalyMemory = aiAnomalyMemoryMax;
  agent.searchTarget = agent.lastKnownAnomaly;
}

function getAiAnomalyIntel(agent) {
  if (canAiSeeAnomaly(agent)) {
    return state.anomaly;
  }
  if (agent.anomalyMemory > 0 && agent.lastKnownAnomaly) {
    return agent.lastKnownAnomaly;
  }
  return null;
}

function getAiPatrolTarget(agent) {
  const route = roomLabels.length
    ? roomLabels
    : [[state.player.spawnX, state.player.spawnY, "START"], [world.width / 2, world.height / 2, "CENTER"]];
  const index = clamp(agent.patrolIndex ?? 0, 0, route.length - 1);
  const [x, y] = route[index];
  if (distance(agent, { x, y }) < 58) {
    agent.patrolIndex = (index + 1) % route.length;
  }
  const [nextX, nextY] = route[agent.patrolIndex ?? index];
  return { x: nextX, y: nextY, kind: "patrol" };
}

function aiAnomalyThreatensPoint(agent, point, range) {
  const anomalyIntel = getAiAnomalyIntel(agent);
  return Boolean(anomalyIntel && distance(anomalyIntel, point) < range);
}

function getAiAnomalyMoveTarget(anomaly, target) {
  if (!segmentBlocked(anomaly.x, anomaly.y, target.x, target.y)) {
    return target;
  }

  const path = findNavPath(anomaly, target, anomaly.radius + 5);
  if (path.length > 1) {
    return path[1];
  }
  if (path.length === 1) {
    return path[0];
  }
  return target;
}

function findNavPath(start, goal, clearance) {
  const nodes = buildNavNodes(clearance);
  const startNode = nearestNavNode(nodes, start, true) ?? nearestNavNode(nodes, start, false);
  const goalNode = nearestNavNode(nodes, goal, true) ?? nearestNavNode(nodes, goal, false);
  if (!startNode || !goalNode) {
    return [];
  }

  const open = new Set([startNode.key]);
  const cameFrom = new Map();
  const gScore = new Map([[startNode.key, 0]]);
  const fScore = new Map([[startNode.key, distance(startNode, goalNode)]]);
  const nodeByKey = new Map(nodes.map((node) => [node.key, node]));

  while (open.size) {
    let currentKey = null;
    let currentScore = Infinity;
    for (const key of open) {
      const score = fScore.get(key) ?? Infinity;
      if (score < currentScore) {
        currentScore = score;
        currentKey = key;
      }
    }
    if (!currentKey) {
      break;
    }
    if (currentKey === goalNode.key) {
      return reconstructNavPath(cameFrom, nodeByKey, currentKey);
    }

    open.delete(currentKey);
    const current = nodeByKey.get(currentKey);
    for (const neighbor of getNavNeighbors(current, nodeByKey)) {
      if (segmentBlocked(current.x, current.y, neighbor.x, neighbor.y)) {
        continue;
      }
      const tentative = (gScore.get(currentKey) ?? Infinity) + distance(current, neighbor);
      if (tentative >= (gScore.get(neighbor.key) ?? Infinity)) {
        continue;
      }
      cameFrom.set(neighbor.key, currentKey);
      gScore.set(neighbor.key, tentative);
      fScore.set(neighbor.key, tentative + distance(neighbor, goalNode));
      open.add(neighbor.key);
    }
  }

  return [];
}

function buildNavNodes(clearance) {
  const nodes = [];
  for (let y = clearance; y <= world.height - clearance; y += navCellSize) {
    for (let x = clearance; x <= world.width - clearance; x += navCellSize) {
      if (!pointBlockedForCircle(x, y, clearance)) {
        nodes.push({ x, y, key: `${x}:${y}` });
      }
    }
  }
  return nodes;
}

function nearestNavNode(nodes, point, requireClearLine) {
  return nodes
    .filter((node) => !requireClearLine || !segmentBlocked(point.x, point.y, node.x, node.y))
    .map((node) => ({ node, dist: distance(point, node) }))
    .sort((a, b) => a.dist - b.dist)[0]?.node ?? null;
}

function getNavNeighbors(node, nodeByKey) {
  const neighbors = [];
  for (let y = -1; y <= 1; y += 1) {
    for (let x = -1; x <= 1; x += 1) {
      if (x === 0 && y === 0) {
        continue;
      }
      const neighbor = nodeByKey.get(`${node.x + x * navCellSize}:${node.y + y * navCellSize}`);
      if (neighbor) {
        neighbors.push(neighbor);
      }
    }
  }
  return neighbors;
}

function reconstructNavPath(cameFrom, nodeByKey, currentKey) {
  const path = [];
  let key = currentKey;
  while (key) {
    const node = nodeByKey.get(key);
    if (node) {
      path.unshift(node);
    }
    key = cameFrom.get(key);
  }
  return path;
}

function pointBlockedForCircle(x, y, radius) {
  if (x < radius || x > world.width - radius || y < radius || y > world.height - radius) {
    return true;
  }
  return [...walls, ...props].some((obstacle) => pointNearObstacle(x, y, radius, obstacle));
}

function getAiSearchTarget(agent) {
  if (!agent.searchTarget || distance(agent, agent.searchTarget) < 54) {
    agent.searchTarget = pickAiSearchTarget(agent);
  }
  return agent.searchTarget;
}

function pickAiSearchTarget(agent) {
  const relayTargets = relaysEnabled
    ? state.relays
      .filter((relay) => relay.corrupted > 0 || !relay.active)
      .map((relay) => ({ x: relay.x, y: relay.y, kind: "search" }))
    : [];
  const batteryTargets = state.batteries
    .filter((battery) => battery.active && (battery.kind === "overcharge" || agent.battery < maxBatteryCapacity * 0.7))
    .map((battery) => ({ x: battery.x, y: battery.y, kind: "search" }));
  const labelTargets = roomLabels.map(([x, y]) => ({ x, y, kind: "search" }));
  const candidates = [...relayTargets, ...batteryTargets, ...labelTargets];
  const base = candidates.length ? candidates[Math.floor(randomRange(0, candidates.length))] : agent;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const angle = randomAngle();
    const offset = randomRange(44, 160);
    const x = clampWorldX(base.x + Math.cos(angle) * offset, agent.radius);
    const y = clampWorldY(base.y + Math.sin(angle) * offset, agent.radius);
    const blocked = [...walls, ...props].some((rect) => pointInObstacle(x, y, rect));
    if (!blocked) {
      return { x, y, kind: "search" };
    }
  }
  return { x: base.x, y: base.y, kind: "search" };
}

function resolveFlashlights(dt) {
  const anomaly = state.anomaly;
  let hit = false;
  for (const agent of getInvestigators()) {
    resolveEchoLight(agent, dt);
    if (agent.lightOn && agent.resolve > 0 && inLightCone(agent, anomaly)) {
      hit = true;
      const baseDamage = agent.ai
        ? GameBalance.tracker.aiFlashlightDamagePerSecond * getBotTuning().investigatorDamage
        : GameBalance.tracker.flashlightDamagePerSecond;
      const damage = baseDamage * getLightDamageMultiplier(agent);
      anomaly.stability = Math.max(0, anomaly.stability - dt * damage);
      state.stats.damageDealt += dt * damage;
      revealAnomaly(GameBalance.ghost.visibilityAfterHitSeconds);
      if (canShockAnomaly(anomaly)) {
        shockAnomaly();
      }
      anomaly.damageFlash = Math.min(1, Math.max(anomaly.damageFlash ?? 0, 0.38 + damage * dt * 0.18));
      if (visualChance(dt * 18)) {
        burst(anomaly.x, anomaly.y, anomaly.shockTimer > 0 ? "#dff7ff" : "#7ae4d6", 1);
      }
      if (performance.now() - lastHitSound > 180) {
        lastHitSound = performance.now();
        playSound("hit");
      }
      if (performance.now() - lastGhostDamageSound > 145) {
        lastGhostDamageSound = performance.now();
        playSound("ghost_damage");
      }
    }
  }
  anomaly.revealed = Math.max(0, anomaly.revealed - dt * (hit ? 0.4 : 1.4));
  anomaly.damageFlash = Math.max(0, (anomaly.damageFlash ?? 0) - dt * (hit ? 0.75 : 2.4));
}

function resolveEchoLight(agent, dt) {
  if (!agent.lightOn || agent.resolve <= 0) {
    return;
  }
  for (const echo of state.echoes) {
    if (echo.life <= 0) {
      continue;
    }
    if (!inLightCone(agent, echo)) {
      continue;
    }
    echo.life -= dt * 2.8;
    if (visualChance(dt * 18)) {
      burst(echo.x, echo.y, "#e76f8a", 1);
    }
    if (echo.life <= 0) {
      echo.life = 0;
      state.stats.echoesDispelled += 1;
      publishMatchEvent("echo_dispersed", { echoesDispelled: state.stats.echoesDispelled }, true);
      createRing(echo.x, echo.y, "#e76f8a", 96, 0.52);
      burst(echo.x, echo.y, "#e76f8a", 16);
    }
  }
}

function touchInvestigators(dt) {
  if (state.anomaly.carriedAgent || state.anomaly.shockTimer > 0 || state.anomaly.escapeTimer > 0) {
    clearAnomalyCatchPressure();
    return;
  }
  for (const agent of getInvestigators()) {
    if (agent.resolve <= 0 || agent.invulnerable > 0) {
      agent.catchPressure = 0;
      agent.warningContactTime = 0;
      continue;
    }
    const catchDistance = agent.radius + state.anomaly.radius + GameBalance.ghost.attackBonusRange;
    const dist = distance(agent, state.anomaly);
    if (dist < catchDistance && agent.attackCooldown <= 0) {
      agent.warningContactTime += dt;
      const facingWithLight = agent.lightOn && inLightCone(agent, state.anomaly);
      agent.catchPressure += dt * (facingWithLight ? 0.2 : 1);
      if (agent.catchPressure < GameBalance.ghost.attackConfirmSeconds) {
        if (visualChance(dt * 14)) {
          burst(agent.x, agent.y, "#e76f8a", 1);
        }
        continue;
      }
      state.stats.contacts += 1;
      startAnomalyCarry(agent);
      revealAnomaly(GameBalance.ghost.grabDurationSeconds);
      playSound("hit");
      agent.attackCooldown = GameBalance.ghost.attackCooldownSeconds;
    } else {
      agent.catchPressure = Math.max(0, agent.catchPressure - dt * 2.4);
      agent.warningContactTime = getAnomalyProximityWarning(agent) ? agent.warningContactTime + dt : 0;
    }
  }
}

function clearAnomalyCatchPressure() {
  for (const agent of getInvestigators()) {
    agent.catchPressure = 0;
    agent.warningContactTime = 0;
  }
}

function startAnomalyCarry(agent) {
  recordGhostAttack(agent, "grabbed");
  const anomaly = state.anomaly;
  anomaly.carriedAgent = agent;
  anomaly.carryTimer = GameBalance.ghost.grabDurationSeconds;
  anomaly.shockTimer = 0;
  anomaly.escapeTimer = 0;
  agent.carriedByAnomaly = true;
  setInvestigatorLight(agent, false);
  agent.dash = 0;
  agent.catchPressure = 0;
  agent.reviveProgress = 0;
  updateCarriedInvestigatorPosition();
  createRing(anomaly.x, anomaly.y, "#e76f8a", 96, 0.5);
  burst(anomaly.x, anomaly.y, "#e76f8a", 18);
  playSound("ghost_grab");
  publishMatchEvent("investigator_grabbed", { name: agent.name }, true);
  setStatus(`${agent.name} grabbed`);
}

function updateCarriedInvestigatorPosition() {
  const anomaly = state.anomaly;
  const agent = anomaly.carriedAgent;
  if (!agent) {
    return;
  }
  const offset = anomaly.radius + agent.radius * 0.5;
  agent.x = clampWorldX(anomaly.x - Math.cos(anomaly.aim) * offset, agent.radius);
  agent.y = clampWorldY(anomaly.y - Math.sin(anomaly.aim) * offset, agent.radius);
  agent.aim = anomaly.aim;
  setInvestigatorLight(agent, false);
}

function dropCarriedInvestigator() {
  const anomaly = state.anomaly;
  const agent = anomaly.carriedAgent;
  if (!agent) {
    return;
  }
  updateCarriedInvestigatorPosition();
  agent.carriedByAnomaly = false;
  anomaly.carriedAgent = null;
  anomaly.carryTimer = 0;
  anomaly.revealed = Math.min(anomaly.revealed, 0.08);
  createRing(agent.x, agent.y, "#e76f8a", 76, 0.5);
  collapseInvestigator(agent);
}

function shockAnomaly() {
  const anomaly = state.anomaly;
  const escapeX = Number.isFinite(anomaly.lastMoveX) ? anomaly.lastMoveX : Math.cos(anomaly.aim ?? 0);
  const escapeY = Number.isFinite(anomaly.lastMoveY) ? anomaly.lastMoveY : Math.sin(anomaly.aim ?? 0);
  anomaly.shockTimer = GameBalance.ghost.shockDurationSeconds;
  anomaly.escapeTimer = 0;
  anomaly.escapeDirX = escapeX;
  anomaly.escapeDirY = escapeY;
  anomaly.dash = 0;
  anomaly.revealed = Math.max(anomaly.revealed, GameBalance.ghost.shockDurationSeconds);
  createRing(anomaly.x, anomaly.y, "#dff7ff", 92, 0.42);
  burst(anomaly.x, anomaly.y, "#dff7ff", 16);
  addCameraShake(0.045);
  playSound("ghost_shock");
}

function canShockAnomaly(anomaly = state.anomaly) {
  return anomaly.shockTimer <= 0 && anomaly.escapeTimer <= 0;
}

function getAnomalySpeedMultiplier(anomaly = state.anomaly) {
  if (anomaly.shockTimer > 0) {
    return 0;
  }
  if (anomaly.carryTimer > 0 && anomaly.carriedAgent) {
    return GameBalance.ghost.grabSpeedMultiplier;
  }
  if (anomaly.escapeTimer > 0) {
    return GameBalance.ghost.escapeSpeedMultiplier;
  }
  return 1;
}

function setInvestigatorLight(agent, enabled) {
  const next = Boolean(enabled);
  if (agent.lightOn !== next) {
    playSound(next ? "flashlight_on" : "flashlight_off");
  }
  agent.lightOn = next;
  agent.lastLightOn = next;
}

function collapseInvestigator(agent) {
  recordGhostAttack(agent, "caught");
  if (state.anomaly.carriedAgent === agent) {
    state.anomaly.carriedAgent = null;
    state.anomaly.carryTimer = 0;
  }
  agent.carriedByAnomaly = false;
  agent.resolve = 0;
  setInvestigatorLight(agent, false);
  agent.reviveProgress = 0;
  publishMatchEvent("investigator_collapsed", { name: agent.name, role: playerRole, cause: "contact" }, true);
  state.stats.ghostCatches += 1;
  createRing(agent.x, agent.y, "#e76f8a", 72, 0.48);
  burst(agent.x, agent.y, "#e76f8a", 22);
  playSound("downed");
  if (agent === state.player && playerRole === "Investigator") {
    setStatus("You were caught by the anomaly");
  } else {
    setStatus(`${agent.name} was caught`);
  }
}

function getLightDamageMultiplier(agent) {
  return agent.overcharge > 0 ? overchargeDamageMultiplier : 1;
}

function updateOverchargeTimers(dt) {
  for (const agent of getInvestigators()) {
    agent.overcharge = Math.max(0, (agent.overcharge ?? 0) - dt);
    agent.invulnerable = Math.max(0, (agent.invulnerable ?? 0) - dt);
    agent.attackCooldown = Math.max(0, (agent.attackCooldown ?? 0) - dt);
  }
}

function updateAnomalyStateTimers(dt) {
  const anomaly = state.anomaly;
  if (anomaly.carryTimer > 0 && anomaly.carriedAgent) {
    anomaly.carryTimer = Math.max(0, anomaly.carryTimer - dt);
    revealAnomaly(Math.max(anomaly.carryTimer, 0.16));
    updateCarriedInvestigatorPosition();
    if (visualChance(dt * 10)) {
      trailSmoke(anomaly.x, anomaly.y, "#e76f8a", 1);
    }
    if (anomaly.carryTimer <= 0) {
      dropCarriedInvestigator();
    }
  }

  const wasShocked = anomaly.shockTimer > 0;
  anomaly.shockTimer = Math.max(0, (anomaly.shockTimer ?? 0) - dt);
  if (wasShocked) {
    revealAnomaly(Math.max(anomaly.shockTimer, 0.22));
    if (visualChance(dt * 18)) {
      trailSmoke(anomaly.x, anomaly.y, "#dff7ff", 1);
    }
    if (anomaly.shockTimer <= 0) {
      anomaly.escapeTimer = Math.max(anomaly.escapeTimer ?? 0, GameBalance.ghost.escapeDurationSeconds);
      burst(anomaly.x, anomaly.y, "#b7f4ff", 12);
      playSound("ghost_escape");
      setStatus("Anomaly breaking away");
    }
  }

  anomaly.escapeTimer = Math.max(0, (anomaly.escapeTimer ?? 0) - dt);
  if (anomaly.escapeTimer > 0 && visualChance(dt * 15)) {
    trailSmoke(anomaly.x, anomaly.y, "#b8c8d2", 1);
  }
  if (anomaly.escapeTimer > 0 && performance.now() - lastGhostEscapeSound > 780) {
    lastGhostEscapeSound = performance.now();
    playSound("ghost_escape_loop");
  }
}

function resolvePickups() {
  for (const battery of state.batteries) {
    if (!battery.active) {
      continue;
    }
    for (const agent of getInvestigators()) {
      if (agent.resolve > 0 && distance(agent, battery) < agent.radius + battery.radius) {
        const overcharge = battery.kind === "overcharge";
        const before = agent.battery;
        agent.battery = maxBatteryCapacity;
        if (overcharge) {
          agent.overcharge = overchargeDuration;
        }
        battery.active = false;
        battery.kind = "standard";
        battery.radius = 11;
        battery.pulse = 0;
        state.stats.pickups += 1;
        playSound("pickup");
        recordBatteryEvent(agent, overcharge ? "overcharge_pickup" : "pickup", before, agent.battery);
        publishMatchEvent("battery_collected", { name: agent.name, pickups: state.stats.pickups, overcharge }, true);
        burst(battery.x, battery.y, overcharge ? "#dff7ff" : "#f4b35d", overcharge ? 26 : 16);
        if (overcharge) {
          createRing(agent.x, agent.y, "#dff7ff", 118, 0.7);
          setStatus(`${agent.name} picked up Overcharge`);
        }
      }
    }
  }
}

function updateBatterySpawns(dt) {
  const activeCount = state.batteries.filter((battery) => battery.active).length;
  if (activeCount >= maxActiveBatteryPickups) {
    batterySpawnTimer = batterySpawnInterval;
    return;
  }

  if (!needsLowBatterySpawn()) {
    batterySpawnTimer = Math.min(batterySpawnTimer, batterySpawnInterval);
    return;
  }

  batterySpawnTimer -= dt;
  if (batterySpawnTimer > 0) {
    return;
  }

  spawnBatteryPickup(true);
  batterySpawnTimer = batterySpawnInterval;
}

function needsLowBatterySpawn() {
  const activeStandardBattery = state.batteries.some((battery) => battery.active && battery.kind !== "overcharge");
  if (activeStandardBattery) {
    return false;
  }
  return getInvestigators().some((agent) => (
    agent.resolve > 0
    && agent.battery <= maxBatteryCapacity * lowBatterySpawnThreshold
  ));
}

function spawnBatteryPickup(announce) {
  const inactive = state.batteries.filter((battery) => !battery.active);
  const activeCount = state.batteries.length - inactive.length;
  if (!inactive.length || activeCount >= maxActiveBatteryPickups) {
    return false;
  }

  const battery = inactive[Math.floor(randomRange(0, inactive.length))];
  battery.active = true;
  battery.kind = "standard";
  battery.radius = 11;
  battery.pulse = visualRandom() * 10;
  createRing(battery.x, battery.y, "#f4b35d", 58, 0.5);
  recordTelemetry("batteryEvents", {
    trackerId: null,
    eventType: "spawn",
    batteryBefore: null,
    batteryAfter: null,
    position: snapshotPoint(battery),
    ghostDistance: null
  });
  if (announce && playerRole === "Investigator") {
    setStatus("Battery pickup appeared");
  }
  if (announce) {
    playSound("battery_spawn");
  }
  return true;
}

function updateComebackBattery() {
  if (state.comebackBatterySpawned) {
    return;
  }
  const investigators = getInvestigators();
  const active = investigators.filter((agent) => agent.resolve > 0);
  const downed = investigators.length - active.length;
  if (active.length !== 1 || downed <= 0 || active[0].overcharge > 0) {
    return;
  }
  spawnComebackBattery();
}

function spawnComebackBattery() {
  const inactive = state.batteries.filter((battery) => !battery.active);
  if (!inactive.length) {
    return false;
  }
  const survivor = getInvestigators().find((agent) => agent.resolve > 0) ?? state.player;
  const battery = inactive
    .map((candidate) => ({ battery: candidate, dist: distance(survivor, candidate) }))
    .sort((a, b) => b.dist - a.dist)[0].battery;
  battery.active = true;
  battery.kind = "overcharge";
  battery.radius = 15;
  battery.pulse = visualRandom() * 10;
  state.comebackBatterySpawned = true;
  createRing(battery.x, battery.y, "#dff7ff", 104, 0.75);
  recordTelemetry("batteryEvents", {
    trackerId: null,
    eventType: "overcharge_spawn",
    batteryBefore: null,
    batteryAfter: null,
    position: snapshotPoint(battery),
    ghostDistance: null
  });
  setStatus("Overcharge battery appeared");
  playSound("battery_spawn");
  return true;
}

function resolveRevives(dt) {
  for (const agent of getInvestigators()) {
    if (agent.resolve > 0) {
      agent.reviveProgress = 0;
      continue;
    }
    agent.reviveProgress = Math.max(0, agent.reviveProgress - dt * 0.18);
  }

  const downed = getInvestigators().filter((agent) => agent.resolve <= 0);
  if (!downed.length) {
    return;
  }

  if (playerRole === "Investigator" && state.player.resolve > 0) {
    const target = nearestDowned(state.player, reviveRange);
    if (target) {
      advanceRevive(target, dt * getReviveRate(state.player), state.player);
    }
  }

  for (const helper of state.investigators) {
    if (helper.resolve <= 0) {
      continue;
    }
    const target = nearestDowned(helper, reviveRange);
    if (target && distance(target, state.anomaly) > 100) {
      advanceRevive(target, dt * 0.55 * getReviveRate(helper), helper);
    }
  }
}

function getReviveRate(helper) {
  return helper.overcharge > 0 ? overchargeReviveMultiplier : 1;
}

function advanceRevive(target, amount, helper) {
  target.reviveProgress += amount;
  createRing(target.x, target.y, "#7ae4d6", 52, 0.32);
  if (target.reviveProgress >= reviveSeconds) {
    recordReviveEvent(target, helper);
    target.resolve = 44;
    target.battery = Math.max(target.battery, maxBatteryCapacity * 0.35);
    target.reviveProgress = 0;
    target.invulnerable = GameBalance.ghost.revivedInvulnerableSeconds;
    target.catchPressure = 0;
    state.stats.revives += 1;
    playSound("revive");
    publishMatchEvent("player_revived", { name: target.name, revives: state.stats.revives }, true);
    burst(target.x, target.y, "#7ae4d6", 28);
    setStatus(`${target.name} revived`);
  }
}

function recordTelemetry(bucket, entry, limit = 80) {
  const target = state.stats[bucket];
  if (!Array.isArray(target) || target.length >= limit) {
    return;
  }
  target.push({
    timeSinceRoundStart: Math.round((state.stats.startedAt - state.time) * 10) / 10,
    ...entry
  });
}

function snapshotPoint(point) {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y)
  };
}

function getAgentId(agent) {
  return agent === state.player ? "player" : agent.name;
}

function recordGhostAttack(agent, result) {
  recordTelemetry("ghostAttackEvents", {
    trackerId: getAgentId(agent),
    ghostPosition: snapshotPoint(state.anomaly),
    trackerPosition: snapshotPoint(agent),
    distanceAtCatch: Math.round(distance(agent, state.anomaly)),
    warningDurationBeforeCatch: Math.round((agent.warningContactTime ?? 0) * 10) / 10,
    trackerWasUsingFlashlight: Boolean(agent.lightOn),
    trackerFacingGhost: agent.lightOn && inLightCone(agent, state.anomaly),
    nearbyTrackerCount: getInvestigators().filter((other) => other !== agent && other.resolve > 0 && distance(other, agent) < 150).length,
    result
  });
  agent.catchPressure = 0;
  agent.warningContactTime = 0;
}

function recordBatteryEvent(agent, eventType, batteryBefore, batteryAfter) {
  recordTelemetry("batteryEvents", {
    trackerId: getAgentId(agent),
    eventType,
    batteryBefore: Math.round(batteryBefore),
    batteryAfter: Math.round(batteryAfter),
    position: snapshotPoint(agent),
    ghostDistance: Math.round(distance(agent, state.anomaly))
  });
}

function recordBatteryDrain(agent, before, after, eventType) {
  if (before > 0 && after <= 0) {
    recordBatteryEvent(agent, "depleted", before, after);
    return;
  }
  const crossedLow = before > maxBatteryCapacity * lowBatterySpawnThreshold && after <= maxBatteryCapacity * lowBatterySpawnThreshold;
  if (crossedLow) {
    recordBatteryEvent(agent, eventType, before, after);
  }
}

function recordReviveEvent(target, helper) {
  recordTelemetry("reviveEvents", {
    downedTrackerId: getAgentId(target),
    reviverTrackerId: helper ? getAgentId(helper) : null,
    reviveDuration: reviveSeconds,
    ghostDistanceDuringRevive: Math.round(distance(target, state.anomaly)),
    batterySpent: null,
    result: "revived"
  });
}

function resolveRelays(dt) {
  if (!relaysEnabled || state.phase !== "playing") {
    interactBoost = 0;
    return;
  }

  for (const relay of state.relays) {
    relay.pulse += dt * (relay.active ? 4 : 1.6);
    relay.corrupted = Math.max(0, relay.corrupted - dt);
    if (relay.corrupted > 0) {
      relay.active = false;
      relay.charge = Math.max(0, relay.charge - dt * 0.16);
      continue;
    }

    if (relay.active && distance(relay, state.anomaly) < 305) {
      state.anomaly.stability = Math.max(0, state.anomaly.stability - dt * 4.2);
      state.anomaly.revealed = Math.max(state.anomaly.revealed, 0.36);
      if (visualChance(dt * 4)) {
        burst(state.anomaly.x, state.anomaly.y, "#dff7ff", 1);
      }
    }
  }

  resolveAiRelayWork(dt);

  const actor = playerRole === "Anomaly" ? state.anomaly : state.player;
  const relay = nearestRelay(actor, relayRange);
  if (!relay) {
    interactBoost = 0;
    return;
  }

  const amount = dt + interactBoost;
  if (playerRole === "Investigator") {
    if (relay.corrupted > 0 || !relay.active) {
      workInvestigatorRelay(relay, amount, true);
    }
  } else if (relay.active || relay.charge > 0.1) {
    workAnomalyRelay(relay, amount, true);
  }
  interactBoost = 0;
}

function resolveAiRelayWork(dt) {
  const tuning = getBotTuning();
  for (const helper of state.investigators) {
    if (helper.resolve <= 0) {
      continue;
    }
    const relay = nearestRelay(helper, relayRange);
    if (relay && (relay.corrupted > 0 || !relay.active)) {
      workInvestigatorRelay(relay, dt * 0.34 * tuning.investigatorRelay, false);
    }
  }

  if (!state.anomaly.ai) {
    return;
  }
  const relay = nearestRelay(state.anomaly, relayRange + 8);
  if (relay && (relay.active || relay.charge > 0.12)) {
    workAnomalyRelay(relay, dt * 0.62 * tuning.anomalyRelay, false);
  }
}

function workInvestigatorRelay(relay, amount, announce) {
  if (relay.corrupted > 0) {
    relay.corrupted = Math.max(0, relay.corrupted - amount * 2.1);
    createRing(relay.x, relay.y, "#7ae4d6", 62, 0.26);
    if (announce) {
      setStatus("Purging relay corruption");
    }
    return;
  }

  if (relay.active) {
    if (announce) {
      setStatus("Relay already online");
    }
    return;
  }

  relay.charge = clamp(relay.charge + amount * 0.48, 0, 1);
  createRing(relay.x, relay.y, "#7ae4d6", 72, 0.38);
  if (relay.charge >= 1) {
    relay.active = true;
    state.stats.relaysCharged += 1;
    playSound("relay");
    publishMatchEvent("relay_online", { relaysCharged: state.stats.relaysCharged }, true);
    burst(relay.x, relay.y, "#7ae4d6", 30);
    setStatus("Containment relay online");
  } else if (announce) {
    setStatus(`Charging relay ${Math.round(relay.charge * 100)}%`);
  }
}

function workAnomalyRelay(relay, amount, announce) {
  const wasCorrupted = relay.corrupted > 0;
  relay.active = false;
  relay.charge = Math.max(0, relay.charge - amount * 0.72);
  relay.corrupted = Math.max(relay.corrupted, 3.8);
  if (!wasCorrupted) {
    state.stats.relaysCorrupted += 1;
    publishMatchEvent("relay_corrupted", { relaysCorrupted: state.stats.relaysCorrupted }, true);
  }
  createRing(relay.x, relay.y, "#e76f8a", 86, 0.42);
  if (visualChance(amount * 8)) {
    burst(relay.x, relay.y, "#e76f8a", 6);
  }
  if (announce) {
    burst(relay.x, relay.y, "#e76f8a", 10);
    setStatus("Relay corrupted");
  }
}

function nearestRelay(actor, range) {
  const candidates = state.relays
    .map((relay) => ({ relay, dist: distance(actor, relay) }))
    .filter(({ dist }) => dist <= range)
    .sort((a, b) => a.dist - b.dist);
  return candidates[0]?.relay ?? null;
}

function nearestRelayObjective(actor, range) {
  const candidates = state.relays
    .filter((relay) => relay.corrupted > 0 || !relay.active)
    .map((relay) => ({ relay, dist: distance(actor, relay), priority: relay.corrupted > 0 ? 80 : 0 }))
    .filter(({ dist }) => dist <= range)
    .sort((a, b) => (b.priority - b.dist * 0.12) - (a.priority - a.dist * 0.12));
  return candidates[0]?.relay ?? null;
}

function nearestCorruptibleRelay(actor, range) {
  const candidates = state.relays
    .filter((relay) => relay.active || relay.charge > 0.35)
    .map((relay) => ({ relay, dist: distance(actor, relay), priority: relay.active ? 90 : relay.charge * 60 }))
    .filter(({ dist }) => dist <= range)
    .sort((a, b) => (b.priority - b.dist * 0.1) - (a.priority - a.dist * 0.1));
  return candidates[0]?.relay ?? null;
}

function nearestBattery(actor, range, predicate = () => true) {
  const candidates = state.batteries
    .filter((battery) => battery.active && predicate(battery))
    .map((battery) => ({ battery, dist: distance(actor, battery) }))
    .filter(({ dist }) => dist <= range)
    .sort((a, b) => a.dist - b.dist);
  return candidates[0]?.battery ?? null;
}

function nearestEcho(actor, range) {
  const candidates = state.echoes
    .map((echo) => ({ echo, dist: distance(actor, echo) }))
    .filter(({ echo, dist }) => echo.life > 0 && dist <= range && !segmentBlocked(actor.x, actor.y, echo.x, echo.y))
    .sort((a, b) => a.dist - b.dist);
  return candidates[0]?.echo ?? null;
}

function useRoleAbility() {
  if (state.phase !== "playing") {
    setStatus("Ready up to use role abilities");
    return;
  }

  if (playerRole === "Investigator") {
    if (state.player.resolve <= 0) {
      setStatus("Waiting for revive");
      return;
    }
    if (state.player.abilityCooldown > 0) {
      setStatus(`Pulse charging: ${Math.ceil(state.player.abilityCooldown)}s`);
      return;
    }
    state.player.abilityCooldown = abilityMax.Investigator;
    state.stats.abilityUses += 1;
    playSound("ability");
    abilityFlash = 0.28;
    createRing(state.player.x, state.player.y, "#dff7ff", 390, 1.05);
    burst(state.player.x, state.player.y, "#dff7ff", 24);
    const tagged = distance(state.player, state.anomaly) < 360 && !segmentBlocked(state.player.x, state.player.y, state.anomaly.x, state.anomaly.y);
    if (tagged) {
      state.anomaly.revealed = Math.max(state.anomaly.revealed, 2.3);
      state.anomaly.stability = Math.max(0, state.anomaly.stability - 10);
      addCameraShake(0.14);
      createRing(state.anomaly.x, state.anomaly.y, "#7ae4d6", 130, 0.9);
      burst(state.anomaly.x, state.anomaly.y, "#dff7ff", 30);
      publishMatchEvent("ability_used", { role: playerRole, ability: "Pulse Scan", tagged: true }, true);
      setStatus("Pulse tagged the anomaly");
    } else {
      addCameraShake(0.05);
      publishMatchEvent("ability_used", { role: playerRole, ability: "Pulse Scan", tagged: false }, true);
      setStatus("Pulse wave expanded, no anomaly lock");
    }
    return;
  }

  if (state.anomaly.abilityCooldown > 0) {
    setStatus(`Blackout charging: ${Math.ceil(state.anomaly.abilityCooldown)}s`);
    return;
  }
  state.anomaly.abilityCooldown = abilityMax.Anomaly;
  triggerBlackout({ trackStats: true, announce: true });
}

function triggerBlackout({ trackStats, announce }) {
  if (trackStats) {
    state.stats.abilityUses += 1;
  }
  publishMatchEvent("ability_used", { role: "Anomaly", ability: "Blackout Wave", trackStats }, true);
  playSound("blackout");
  state.blackout = 5;
  abilityFlash = 0.35;
  state.anomaly.revealed = Math.min(state.anomaly.revealed, 0.08);
  addCameraShake(0.26);
  createRing(state.anomaly.x, state.anomaly.y, "#e76f8a", blackoutDrainRadius, 1.15);
  burst(state.anomaly.x, state.anomaly.y, "#e76f8a", 34);
  deployEchoes(trackStats);
  for (const agent of getInvestigators()) {
    const reach = 1 - clamp(distance(agent, state.anomaly) / blackoutDrainRadius, 0, 1);
    if (reach > 0 && agent.resolve > 0) {
      agent.battery = Math.max(0, agent.battery - maxBatteryCapacity * 0.72 * reach);
      agent.resolve = Math.max(0, agent.resolve - 5 * reach);
      burst(agent.x, agent.y, "#e76f8a", 5);
    }
  }
  if (announce) {
    setStatus("Blackout wave deployed");
  }
}

function deployEchoes(trackStats) {
  const count = 3;
  for (let i = 0; i < count; i += 1) {
    state.echoes.push(makeEcho(i));
  }
  if (trackStats) {
    state.stats.echoesDeployed += count;
  }
  publishMatchEvent("echo_deployed", { echoes: count, trackStats }, true);
}

function makeEcho(index) {
  const angle = state.anomaly.aim ?? (performance.now() * 0.001 + index * ((Math.PI * 2) / 3));
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const drift = angle + index * ((Math.PI * 2) / 3) + randomRange(-0.6, 0.6);
    const range = randomRange(110, 320);
    const x = clampWorldX(state.anomaly.x + Math.cos(drift) * range, 18);
    const y = clampWorldY(state.anomaly.y + Math.sin(drift) * range, 18);
    const blocked = [...walls, ...props].some((obstacle) => pointInObstacle(x, y, obstacle));
    if (!blocked) {
      return { x, y, radius: 18, life: echoMaxLife, pulse: visualRandom() * 10 };
    }
  }
  return {
    x: clampWorldX(state.anomaly.x + Math.cos(angle + index) * 150, 18),
    y: clampWorldY(state.anomaly.y + Math.sin(angle + index) * 150, 18),
    radius: 18,
    life: echoMaxLife,
    pulse: visualRandom() * 10
  };
}

function updateEchoes(dt) {
  state.echoes = state.echoes.filter((echo) => {
    echo.life -= dt;
    echo.pulse += dt * 5;
    return echo.life > 0;
  });
}

function allInvestigatorsDown() {
  return getInvestigators().every((agent) => agent.resolve <= 0);
}

function getAnomalyProximityWarning(agent) {
  if (state.phase !== "playing" || agent.resolve <= 0) {
    return 0;
  }
  const dist = distance(agent, state.anomaly);
  if (dist <= proximityDangerRange) {
    return 2;
  }
  if (dist <= proximityWarningRange) {
    return 1;
  }
  return 0;
}

function getInvestigators() {
  return playerRole === "Investigator" ? [state.player, ...state.investigators] : state.investigators;
}

function nearestDowned(helper, range) {
  const candidates = getInvestigators()
    .filter((agent) => agent !== helper && agent.resolve <= 0)
    .map((agent) => ({ agent, dist: distance(helper, agent) }))
    .filter(({ dist }) => dist <= range)
    .sort((a, b) => a.dist - b.dist);
  return candidates[0]?.agent ?? null;
}

function readMovement() {
  let x = 0;
  let y = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) y -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) y += 1;
  if (Math.hypot(controller.moveX, controller.moveY) > 0.18) {
    x += controller.moveX;
    y += controller.moveY;
  }
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

function readAim(agent) {
  if (Math.hypot(controller.aimX, controller.aimY) > 0.22) {
    return Math.atan2(controller.aimY, controller.aimX);
  }
  return Math.atan2(mouse.y - agent.y, mouse.x - agent.x);
}

function updateControllerInput() {
  const pad = getActiveGamepad();
  controller.connected = Boolean(pad);
  const dashPressed = Boolean(pad?.buttons[0]?.pressed);
  const interactPressed = Boolean(pad?.buttons[2]?.pressed);
  const abilityPressed = Boolean(pad?.buttons[3]?.pressed || pad?.buttons[4]?.pressed);
  controller.moveX = applyDeadzone(pad?.axes[0] ?? 0, 0.18);
  controller.moveY = applyDeadzone(pad?.axes[1] ?? 0, 0.18);
  controller.aimX = applyDeadzone(pad?.axes[2] ?? 0, 0.22);
  controller.aimY = applyDeadzone(pad?.axes[3] ?? 0, 0.22);
  controller.light = Boolean(pad?.buttons[7]?.pressed || (pad?.buttons[7]?.value ?? 0) > 0.35);
  controller.interact = interactPressed;
  controller.dash = dashPressed;
  controller.ability = abilityPressed;
  controller.justDash = dashPressed && !controller.lastDash;
  controller.justAbility = abilityPressed && !controller.lastAbility;
  controller.lastDash = dashPressed;
  controller.lastAbility = abilityPressed;
  if (
    Math.hypot(controller.moveX, controller.moveY) > 0
    || Math.hypot(controller.aimX, controller.aimY) > 0
    || controller.light
    || controller.interact
    || controller.dash
    || controller.ability
  ) {
    setInputMode("gamepad");
  }
  if (controller.justDash) {
    tryDash();
  }
  if (controller.justAbility) {
    useRoleAbility();
  }
}

function getActiveGamepad() {
  const pads = globalThis.navigator?.getGamepads?.() ?? [];
  return Array.from(pads).find((pad) => pad?.connected) ?? null;
}

function applyDeadzone(value, deadzone) {
  const magnitude = Math.abs(value);
  if (magnitude < deadzone) {
    return 0;
  }
  return Math.sign(value) * ((magnitude - deadzone) / (1 - deadzone));
}

function updateDash(agent, dt) {
  agent.dash = Math.max(0, agent.dash - dt);
  agent.dashCooldown = Math.max(0, agent.dashCooldown - dt);
}

function tryDash() {
  const actor = playerRole === "Anomaly" ? state.anomaly : state.player;
  if (playerRole === "Investigator" && actor.resolve <= 0) {
    setStatus("Waiting for revive");
    return;
  }
  if (playerRole === "Investigator") {
    setStatus("Investigators do not dash");
    return;
  }
  triggerDashForActor(actor, playerRole);
}

function triggerDashForActor(actor, role) {
  if (actor.dash <= 0 && actor.dashCooldown <= 0 && state.phase === "playing") {
    actor.dash = 0.16;
    actor.dashCooldown = role === "Anomaly" ? 2.2 : 1.6;
    if (role === "Anomaly") {
      revealAnomaly(0.9);
    }
    addCameraShake(0.04);
    playSound("dash");
  }
}

function revealAnomaly(amount) {
  state.anomaly.revealed = Math.max(state.anomaly.revealed, amount);
}

function setInputMode(mode) {
  if (mode !== "keyboard" && mode !== "gamepad") {
    return;
  }
  if (inputMode === mode) {
    return;
  }
  inputMode = mode;
  persistSettings();
}

function promptFor(action, label) {
  return `${inputPrompts[inputMode][action]}: ${label}`;
}

function moveCircle(entity, dx, dy) {
  entity.x += dx;
  for (const wall of walls) {
    resolveCircleObstacle(entity, wall);
  }
  for (const prop of props) {
    resolveCircleObstacle(entity, prop);
  }
  entity.y += dy;
  for (const wall of walls) {
    resolveCircleObstacle(entity, wall);
  }
  for (const prop of props) {
    resolveCircleObstacle(entity, prop);
  }
  entity.x = clampWorldX(entity.x, entity.radius);
  entity.y = clampWorldY(entity.y, entity.radius);
}

function resolveCircleObstacle(circle, obstacle) {
  if (isSegmentWall(obstacle)) {
    resolveCircleSegment(circle, obstacle);
    return;
  }
  resolveCircleRect(circle, obstacle);
}

function resolveCircleRect(circle, rect) {
  const cx = clamp(circle.x, rect.x, rect.x + rect.w);
  const cy = clamp(circle.y, rect.y, rect.y + rect.h);
  const dx = circle.x - cx;
  const dy = circle.y - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > 0 && dist < circle.radius) {
    const push = circle.radius - dist;
    circle.x += (dx / dist) * push;
    circle.y += (dy / dist) * push;
  }
}

function resolveCircleSegment(circle, segment) {
  const closest = closestPointOnSegment(circle.x, circle.y, segment.x, segment.y, segment.x2, segment.y2);
  const dx = circle.x - closest.x;
  const dy = circle.y - closest.y;
  const dist = Math.hypot(dx, dy);
  const minDist = circle.radius + wallThickness(segment) / 2;
  if (dist > 0 && dist < minDist) {
    const push = minDist - dist;
    circle.x += (dx / dist) * push;
    circle.y += (dy / dist) * push;
  } else if (dist === 0) {
    const angle = Math.atan2(segment.y2 - segment.y, segment.x2 - segment.x) + Math.PI / 2;
    circle.x += Math.cos(angle) * minDist;
    circle.y += Math.sin(angle) * minDist;
  }
}

function getInvestigatorFlashlightOrigin(agent) {
  const aim = agent?.aim ?? 0;
  const forward = investigatorVisual.flashlightForward;
  const side = investigatorVisual.flashlightSideOffset;
  return {
    x: clamp(agent.x + Math.cos(aim) * forward - Math.sin(aim) * side, 0, world.width),
    y: clamp(agent.y - investigatorVisual.flashlightChestLift + Math.sin(aim) * forward + Math.cos(aim) * side * 0.2, 0, world.height)
  };
}

function getInvestigatorVisualBounds(agent) {
  const width = hasInvestigatorAtlas(agent) ? investigatorVisual.atlasWidth : investigatorVisual.width;
  const height = hasInvestigatorAtlas(agent) ? investigatorVisual.atlasHeight : investigatorVisual.height;
  return {
    x: agent.x - width / 2,
    y: agent.y - height,
    w: width,
    h: height + 10
  };
}

function inLightCone(agent, target) {
  const origin = getInvestigatorFlashlightOrigin(agent);
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist > getFlashlightBeamRange(agent)) {
    return false;
  }
  const angle = Math.atan2(dy, dx);
  const diff = Math.abs(angleDelta(agent.aim, angle));
  if (diff > GameBalance.tracker.flashlightBeamAngleRadians) {
    return false;
  }
  return !segmentBlocked(origin.x, origin.y, target.x, target.y);
}

function getFlashlightBeamRange(agent) {
  if (!agent || agent.resolve <= 0 || agent.battery <= 0) {
    return 0;
  }
  const batteryRatio = clamp(agent.battery / maxBatteryCapacity, 0, 1);
  return GameBalance.tracker.flashlightBeamLength * batteryRatio;
}

function segmentBlocked(x1, y1, x2, y2) {
  return [...walls, ...props].some((obstacle) => lineIntersectsObstacle(x1, y1, x2, y2, obstacle));
}

function lineIntersectsObstacle(x1, y1, x2, y2, obstacle) {
  if (!isSegmentWall(obstacle)) {
    return lineIntersectsRect(x1, y1, x2, y2, obstacle);
  }
  return segmentDistance(x1, y1, x2, y2, obstacle.x, obstacle.y, obstacle.x2, obstacle.y2) <= wallThickness(obstacle) / 2;
}

function lineIntersectsRect(x1, y1, x2, y2, rect) {
  if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) {
    return true;
  }
  const edges = [
    [rect.x, rect.y, rect.x + rect.w, rect.y],
    [rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h],
    [rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h],
    [rect.x, rect.y + rect.h, rect.x, rect.y]
  ];
  return edges.some(([x3, y3, x4, y4]) => linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4));
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function pointInObstacle(x, y, obstacle) {
  if (!isSegmentWall(obstacle)) {
    return pointInRect(x, y, obstacle);
  }
  return distancePointToSegment(x, y, obstacle.x, obstacle.y, obstacle.x2, obstacle.y2) <= wallThickness(obstacle) / 2;
}

function pointNearObstacle(x, y, radius, obstacle) {
  if (isSegmentWall(obstacle)) {
    return distancePointToSegment(x, y, obstacle.x, obstacle.y, obstacle.x2, obstacle.y2) <= radius + wallThickness(obstacle) / 2;
  }
  const closestX = clamp(x, obstacle.x, obstacle.x + obstacle.w);
  const closestY = clamp(y, obstacle.y, obstacle.y + obstacle.h);
  return Math.hypot(x - closestX, y - closestY) <= radius;
}

function isSegmentWall(obstacle) {
  return obstacle?.shape === "segment"
    || (Number.isFinite(Number(obstacle?.x2)) && Number.isFinite(Number(obstacle?.y2)));
}

function wallThickness(obstacle) {
  const fallback = obstacle?.visible === false ? 1 : 24;
  const thickness = Number(obstacle?.thickness ?? fallback);
  return Number.isFinite(thickness) ? thickness : fallback;
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (!lengthSq) {
    return { x: x1, y: y1 };
  }
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lengthSq, 0, 1);
  return { x: x1 + dx * t, y: y1 + dy * t };
}

function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const point = closestPointOnSegment(px, py, x1, y1, x2, y2);
  return Math.hypot(px - point.x, py - point.y);
}

function segmentDistance(x1, y1, x2, y2, x3, y3, x4, y4) {
  if (linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4)) {
    return 0;
  }
  return Math.min(
    distancePointToSegment(x1, y1, x3, y3, x4, y4),
    distancePointToSegment(x2, y2, x3, y3, x4, y4),
    distancePointToSegment(x3, y3, x1, y1, x2, y2),
    distancePointToSegment(x4, y4, x1, y1, x2, y2)
  );
}

function linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (den === 0) {
    return false;
  }
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

function angleDelta(a, b) {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

function draw() {
  const viewport = getCanvasViewport();
  const shake = !reduceMotion && cameraShake > 0 ? cameraShake * 18 : 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(viewport.x, viewport.y);
  ctx.scale(viewport.scale, viewport.scale);
  if (shake) {
    ctx.translate((visualRandom() - 0.5) * shake, (visualRandom() - 0.5) * shake);
  }
  drawWorld();
  drawLighting();
  drawRings();
  drawEchoes();
  drawAgents();
  drawOcclusionOverlays();
  drawObjectiveHints();
  drawParticles();
  drawBlackoutDarkness();
  drawOverlay();
  drawSignalFeedback();
  drawCountdown();
  ctx.restore();
}

function getCanvasViewport() {
  const scale = Math.min(canvas.width / world.width, canvas.height / world.height);
  const width = world.width * scale;
  const height = world.height * scale;
  return {
    scale,
    x: (canvas.width - width) / 2,
    y: (canvas.height - height) / 2,
    width,
    height
  };
}

function drawWorld() {
  const hasArtBackground = Boolean(mapBackgroundImage?.src);
  const floor = ctx.createLinearGradient(0, 0, world.width, world.height);
  floor.addColorStop(0, floorColors[0]);
  floor.addColorStop(0.45, floorColors[1]);
  floor.addColorStop(1, floorColors[2]);
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, world.width, world.height);
  if (!hasArtBackground) {
    drawFloorMaterialTexture();
  }
  drawMapImage(mapBackgroundImage);

  const centerGlow = ctx.createRadialGradient(world.width * 0.55, world.height * 0.48, 40, world.width * 0.55, world.height * 0.48, 620);
  centerGlow.addColorStop(0, "rgba(122, 228, 214, 0.08)");
  centerGlow.addColorStop(0.48, "rgba(244, 179, 93, 0.035)");
  centerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, 0, world.width, world.height);

  if (!hasArtBackground) {
    drawMapSetDressing();
  }
  for (const decoration of mapDecorations) {
    drawMapImage(decoration);
  }

  if (!hasArtBackground) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "rgba(122, 228, 214, 0.42)";
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 16]);
    ctx.strokeRect(92, 98, 1096, 524);
    ctx.restore();
  }

  for (const wall of walls) {
    if (wall.visible === false) {
      continue;
    }
    if (isSegmentWall(wall)) {
      drawWallSegment(wall);
    } else {
      drawRect(wall, "#43515a", "#111820", "wall");
      drawWallDetails(wall);
    }
  }
  for (const prop of props) {
    drawRect(prop, prop.color, "#10151a", "prop");
    drawPropDetails(prop);
  }
  drawMapImage(mapForegroundImage);

  for (const [x, y, label] of roomLabels) {
    drawRoomLabel(x, y, label);
  }

  for (const battery of state.batteries) {
    if (!battery.active) {
      continue;
    }
    drawBattery(battery);
  }

  if (relaysEnabled) {
    for (const relay of state.relays) {
      drawRelay(relay);
    }
  }
}

function drawFloorMaterialTexture() {
  const pattern = getFloorPattern(currentMapName);
  if (!pattern) {
    return;
  }
  ctx.save();
  ctx.globalAlpha = currentMapName === "Tideglass Aquarium" ? 0.42 : currentMapName.startsWith("Gloamhall Manor") ? 0.38 : 0.34;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.restore();
}

function drawMapImage(imageRect) {
  if (!imageRect?.src) {
    return;
  }
  const image = getMapImage(imageRect.src);
  if (!image?.complete || !image.naturalWidth) {
    return;
  }
  ctx.save();
  const width = imageRect.w ?? image.naturalWidth;
  const height = imageRect.h ?? image.naturalHeight;
  const x = imageRect.x ?? 0;
  const y = imageRect.y ?? 0;
  const rotation = ((imageRect.rotation ?? 0) * Math.PI) / 180;
  ctx.translate(x + width / 2, y + height / 2);
  ctx.rotate(rotation);
  ctx.globalAlpha = Number.isFinite(imageRect.opacity) ? imageRect.opacity : 1;
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function getMapImage(src) {
  if (mapImageCache.has(src)) {
    return mapImageCache.get(src);
  }
  if (typeof Image !== "function") {
    mapImageCache.set(src, null);
    return null;
  }
  const image = new Image();
  image.addEventListener("load", () => {
    if (!state.ended) draw();
  }, { once: true });
  image.src = src;
  mapImageCache.set(src, image);
  return image;
}

function getFloorPattern(mapName) {
  if (floorPatterns.has(mapName)) {
    return floorPatterns.get(mapName);
  }
  const source = createTextureCanvas(192, 192);
  if (!source) {
    floorPatterns.set(mapName, null);
    return null;
  }
  const textureCtx = source.getContext("2d");
  if (!textureCtx) {
    floorPatterns.set(mapName, null);
    return null;
  }
  renderFloorTexture(textureCtx, source.width, source.height, mapName);
  const pattern = ctx.createPattern?.(source, "repeat") ?? null;
  floorPatterns.set(mapName, pattern);
  return pattern;
}

function createTextureCanvas(width, height) {
  if (typeof OffscreenCanvas === "function") {
    return new OffscreenCanvas(width, height);
  }
  if (typeof document === "undefined" || typeof document.createElement !== "function") {
    return null;
  }
  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  return source;
}

function renderFloorTexture(textureCtx, width, height, mapName) {
  const palette = {
    "Tideglass Aquarium": ["#0c2529", "#184047", "#75d7e7", "#0d141a"],
    "Prism Foundry": ["#1f1712", "#45301c", "#f4b35d", "#0f1012"],
    "Gloamhall Manor": ["#211319", "#463132", "#d3b06f", "#0f090b"],
    "Gloamhall Manor Compact": ["#211319", "#463132", "#d3b06f", "#0f090b"],
    "Observatory Annex": ["#111b22", "#253743", "#a7c4cf", "#090e13"]
  }[mapName] ?? ["#111b22", "#253743", "#a7c4cf", "#090e13"];
  const rand = seededTextureRandom(mapName);
  const base = textureCtx.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, palette[0]);
  base.addColorStop(1, palette[1]);
  textureCtx.fillStyle = base;
  textureCtx.fillRect(0, 0, width, height);

  textureCtx.globalAlpha = 0.24;
  textureCtx.strokeStyle = palette[2];
  textureCtx.lineWidth = 1;
  for (let x = 0; x <= width; x += 48) {
    textureCtx.beginPath();
    textureCtx.moveTo(x + 0.5, 0);
    textureCtx.lineTo(x + 0.5, height);
    textureCtx.stroke();
  }
  for (let y = 0; y <= height; y += 48) {
    textureCtx.beginPath();
    textureCtx.moveTo(0, y + 0.5);
    textureCtx.lineTo(width, y + 0.5);
    textureCtx.stroke();
  }

  for (let i = 0; i < 150; i += 1) {
    const x = rand() * width;
    const y = rand() * height;
    const size = 0.7 + rand() * 2.4;
    textureCtx.globalAlpha = 0.04 + rand() * 0.14;
    textureCtx.fillStyle = rand() > 0.5 ? "#ffffff" : palette[3];
    textureCtx.fillRect(x, y, size, size);
  }

  textureCtx.globalAlpha = mapName === "Tideglass Aquarium" ? 0.18 : mapName.startsWith("Gloamhall Manor") ? 0.14 : 0.11;
  textureCtx.strokeStyle = mapName === "Prism Foundry" ? "#f4b35d" : mapName.startsWith("Gloamhall Manor") ? "#f0cf92" : "#dff7ff";
  for (let i = 0; i < 9; i += 1) {
    const x = rand() * width;
    const y = rand() * height;
    textureCtx.beginPath();
    textureCtx.moveTo(x, y);
    textureCtx.bezierCurveTo(x + rand() * 38 - 19, y + rand() * 28 - 14, x + rand() * 58 - 29, y + rand() * 54 - 27, x + rand() * 70 - 35, y + rand() * 70 - 35);
    textureCtx.stroke();
  }
  textureCtx.globalAlpha = 1;
}

function seededTextureRandom(seedText) {
  let seed = 2166136261;
  for (const char of seedText) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    seed ^= seed >>> 16;
    return (seed >>> 0) / 4294967296;
  };
}

function drawMapSetDressing() {
  if (currentMapName === "Tideglass Aquarium") {
    drawAquariumDressing();
  } else if (currentMapName === "Prism Foundry") {
    drawFoundryDressing();
  } else if (currentMapName.startsWith("Gloamhall Manor")) {
    drawManorDressing();
  } else {
    drawObservatoryDressing();
  }
}

function drawObservatoryDressing() {
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = "rgba(223, 247, 255, 0.58)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 10]);
  [180, 238, 302].forEach((radius) => {
    ctx.beginPath();
    ctx.arc(640, 356, radius, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(640 + Math.cos(angle) * 74, 356 + Math.sin(angle) * 74);
    ctx.lineTo(640 + Math.cos(angle) * 318, 356 + Math.sin(angle) * 318);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAquariumDressing() {
  const shimmer = Math.sin(performance.now() * 0.0016) * 8;
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "rgba(87, 216, 255, 0.5)";
  ctx.fillStyle = "rgba(87, 216, 255, 0.055)";
  [
    { x: 136, y: 138, w: 96, h: 412 },
    { x: 936, y: 138, w: 148, h: 378 },
    { x: 494, y: 126, w: 292, h: 82 }
  ].forEach((tank) => {
    ctx.beginPath();
    ctx.roundRect(tank.x, tank.y, tank.w, tank.h, 12);
    ctx.fill();
    ctx.stroke();
    for (let y = tank.y + 30; y < tank.y + tank.h - 18; y += 34) {
      ctx.beginPath();
      ctx.moveTo(tank.x + 12, y + Math.sin(y * 0.03 + shimmer) * 3);
      ctx.bezierCurveTo(tank.x + tank.w * 0.35, y - 8, tank.x + tank.w * 0.65, y + 8, tank.x + tank.w - 12, y);
      ctx.stroke();
    }
  });
  ctx.restore();
}

function drawFoundryDressing() {
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = "rgba(244, 179, 93, 0.55)";
  ctx.fillStyle = "rgba(244, 179, 93, 0.055)";
  ctx.lineWidth = 2;
  [
    [244, 538, 366, 538],
    [708, 180, 1012, 180],
    [520, 344, 760, 344]
  ].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalAlpha = 0.08;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 2;
  });
  [
    { x: 300, y: 164, r: 34 },
    { x: 982, y: 502, r: 40 },
    { x: 622, y: 470, r: 30 }
  ].forEach((prism, index) => {
    ctx.save();
    ctx.translate(prism.x, prism.y);
    ctx.rotate(index * 0.58 + performance.now() * 0.0002);
    ctx.beginPath();
    for (let i = 0; i < 3; i += 1) {
      const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
      const x = Math.cos(a) * prism.r;
      const y = Math.sin(a) * prism.r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

function drawManorDressing() {
  ctx.save();
  ctx.globalAlpha = 0.18;
  drawManorRunner(548, 126, 184, 196, "#6c2630", "#d3b06f");
  drawManorRunner(520, 342, 240, 130, "#8b6f2c", "#324625");
  drawManorRunner(132, 124, 258, 170, "#1e3737", "#d9d3bc", true);
  drawManorRunner(890, 142, 236, 142, "#273d3a", "#c2d7d4", true);
  drawManorRunner(888, 512, 232, 72, "#3f3e24", "#d3b06f");

  ctx.globalAlpha = 0.24;
  ctx.strokeStyle = "rgba(240, 207, 146, 0.5)";
  ctx.lineWidth = 2;
  [
    [560, 184, 720, 184],
    [560, 208, 720, 208],
    [570, 230, 710, 230],
    [502, 500, 778, 500],
    [502, 584, 778, 584]
  ].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "rgba(240, 207, 146, 0.26)";
  [
    { x: 586, y: 158, w: 108, h: 16 },
    { x: 594, y: 510, w: 92, h: 18 },
    { x: 248, y: 160, w: 94, h: 16 },
    { x: 910, y: 524, w: 148, h: 16 }
  ].forEach((table) => {
    ctx.beginPath();
    ctx.roundRect(table.x, table.y, table.w, table.h, 7);
    ctx.fill();
  });
  ctx.restore();
}

function drawManorRunner(x, y, w, h, primary, accent, checker = false) {
  ctx.save();
  ctx.fillStyle = primary;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();

  if (checker) {
    ctx.globalAlpha *= 0.52;
    const cell = 24;
    for (let row = 0; row < Math.ceil(h / cell); row += 1) {
      for (let col = 0; col < Math.ceil(w / cell); col += 1) {
        if ((row + col) % 2 === 0) {
          ctx.fillStyle = accent;
          ctx.fillRect(x + col * cell, y + row * cell, Math.min(cell, w - col * cell), Math.min(cell, h - row * cell));
        }
      }
    }
  } else {
    ctx.globalAlpha *= 0.55;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    for (let inset = 12; inset <= 24; inset += 12) {
      ctx.strokeRect(x + inset, y + inset, Math.max(0, w - inset * 2), Math.max(0, h - inset * 2));
    }
  }
  ctx.restore();
}

function drawRect(rect, fill, stroke, kind = "surface") {
  const material = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  material.addColorStop(0, lightenColor(fill, 0.16));
  material.addColorStop(0.52, fill);
  material.addColorStop(1, darkenColor(fill, 0.2));
  ctx.shadowColor = "rgba(0, 0, 0, 0.34)";
  ctx.shadowBlur = kind === "wall" ? 8 : 5;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = material;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 5);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.save();
  ctx.globalAlpha = kind === "wall" ? 0.24 : 0.16;
  ctx.strokeStyle = "rgba(226, 238, 246, 0.72)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rect.x + 7, rect.y + 5);
  ctx.lineTo(rect.x + rect.w - 7, rect.y + 5);
  ctx.stroke();
  ctx.restore();
}

function drawWallSegment(wall) {
  const thickness = wallThickness(wall);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0, 0, 0, 0.34)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.strokeStyle = "#111820";
  ctx.lineWidth = thickness + 4;
  ctx.beginPath();
  ctx.moveTo(wall.x, wall.y);
  ctx.lineTo(wall.x2, wall.y2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = "#43515a";
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.moveTo(wall.x, wall.y);
  ctx.lineTo(wall.x2, wall.y2);
  ctx.stroke();
  ctx.globalAlpha = 0.24;
  ctx.strokeStyle = "rgba(226, 238, 246, 0.72)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(wall.x, wall.y);
  ctx.lineTo(wall.x2, wall.y2);
  ctx.stroke();
  ctx.restore();
}

function drawPropDetails(prop) {
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "rgba(226, 238, 246, 0.32)";
  ctx.lineWidth = 1;
  const inset = 8;
  ctx.beginPath();
  ctx.roundRect(prop.x + inset, prop.y + inset, Math.max(8, prop.w - inset * 2), Math.max(8, prop.h - inset * 2), 4);
  ctx.stroke();
  if (prop.w > 74) {
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.moveTo(prop.x + prop.w * 0.5, prop.y + 10);
    ctx.lineTo(prop.x + prop.w * 0.5, prop.y + prop.h - 10);
    ctx.stroke();
  }
  if (prop.h > 74) {
    ctx.globalAlpha = 0.14;
    ctx.beginPath();
    ctx.moveTo(prop.x + 10, prop.y + prop.h * 0.5);
    ctx.lineTo(prop.x + prop.w - 10, prop.y + prop.h * 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWallDetails(rect) {
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "rgba(5, 8, 12, 0.58)";
  const horizontal = rect.w >= rect.h;
  if (horizontal) {
    for (let x = rect.x + 28; x < rect.x + rect.w - 16; x += 64) {
      ctx.beginPath();
      ctx.roundRect(x, rect.y + rect.h * 0.5 - 3, 18, 6, 3);
      ctx.fill();
    }
  } else {
    for (let y = rect.y + 28; y < rect.y + rect.h - 16; y += 64) {
      ctx.beginPath();
      ctx.roundRect(rect.x + rect.w * 0.5 - 3, y, 6, 18, 3);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = "rgba(226, 238, 246, 0.34)";
  [
    [rect.x + 9, rect.y + 9],
    [rect.x + rect.w - 9, rect.y + 9],
    [rect.x + 9, rect.y + rect.h - 9],
    [rect.x + rect.w - 9, rect.y + rect.h - 9]
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function lightenColor(color, amount) {
  return mixColor(color, "#ffffff", amount);
}

function darkenColor(color, amount) {
  return mixColor(color, "#000000", amount);
}

function mixColor(color, target, amount) {
  const source = parseHexColor(color);
  const destination = parseHexColor(target);
  if (!source || !destination) {
    return color;
  }
  const channel = (a, b) => Math.round(a + (b - a) * amount).toString(16).padStart(2, "0");
  return `#${channel(source.r, destination.r)}${channel(source.g, destination.g)}${channel(source.b, destination.b)}`;
}

function parseHexColor(color) {
  const match = /^#?([a-f0-9]{6})$/i.exec(color);
  if (!match) {
    return null;
  }
  const value = Number.parseInt(match[1], 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function drawBattery(battery) {
  battery.pulse += 0.05;
  const pulse = Math.sin(battery.pulse);
  const r = battery.radius + pulse * 2;
  const overcharge = battery.kind === "overcharge";
  const core = overcharge ? "#dff7ff" : "#f4b35d";
  const shell = overcharge ? "#7ae4d6" : "#5b3715";
  ctx.save();
  ctx.translate(battery.x, battery.y);
  ctx.shadowColor = core;
  ctx.shadowBlur = (overcharge ? 24 : 16) + pulse * 4;
  ctx.fillStyle = overcharge ? "rgba(122, 228, 214, 0.16)" : "rgba(244, 179, 93, 0.12)";
  ctx.beginPath();
  ctx.arc(0, 0, r + 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = core;
  ctx.strokeStyle = shell;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(overcharge ? -13 : -10, overcharge ? -16 : -13, overcharge ? 26 : 20, overcharge ? 32 : 26, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = overcharge ? "#f8fbfd" : "#fff0b8";
  ctx.fillRect(overcharge ? -6 : -5, overcharge ? -20 : -16, overcharge ? 12 : 10, 4);
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.fillRect(-5, -8, overcharge ? 12 : 10, 4);
  ctx.strokeStyle = overcharge ? "rgba(5, 8, 12, 0.72)" : "rgba(255, 240, 184, 0.72)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-4, 5);
  ctx.lineTo(1, -1);
  ctx.lineTo(-1, 7);
  ctx.lineTo(5, 0);
  ctx.stroke();
  ctx.restore();
}

function drawRoomLabel(x, y, text) {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#d9e7ee";
  ctx.font = "700 20px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawRelay(relay) {
  const charge = clamp(relay.charge, 0, 1);
  const color = relay.corrupted > 0 ? "#e76f8a" : relay.active ? "#dff7ff" : "#7ae4d6";
  const glow = relay.active ? 26 : 12;
  ctx.save();
  ctx.translate(relay.x, relay.y);
  ctx.shadowColor = color;
  ctx.shadowBlur = glow * 0.62;
  ctx.fillStyle = "rgba(4, 8, 12, 0.78)";
  ctx.strokeStyle = "rgba(226, 238, 246, 0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-34, -28, 68, 56, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(122, 228, 214, 0.08)";
  ctx.beginPath();
  ctx.roundRect(-25, -18, 50, 13, 4);
  ctx.fill();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 50, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(relay.x, relay.y);
  ctx.rotate(Math.PI / 4);
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fillStyle = relay.corrupted > 0 ? "#3a111d" : relay.active ? "#dff7ff" : "#10272c";
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-relay.radius, -relay.radius, relay.radius * 2, relay.radius * 2, 5);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(5, 8, 12, 0.72)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-relay.radius + 6, 0);
  ctx.lineTo(relay.radius - 6, 0);
  ctx.moveTo(0, -relay.radius + 6);
  ctx.lineTo(0, relay.radius - 6);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.globalAlpha = relay.corrupted > 0 ? 0.58 : 0.9;
  ctx.beginPath();
  ctx.arc(relay.x, relay.y, relay.radius + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge);
  ctx.stroke();
  if (relay.active) {
    ctx.globalAlpha = 0.18 + Math.sin(relay.pulse) * 0.06;
    ctx.beginPath();
    ctx.arc(relay.x, relay.y, 305, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "800 11px Inter, sans-serif";
  ctx.fillStyle = color;
  ctx.shadowColor = "#05070a";
  ctx.shadowBlur = 8;
  const label = relay.corrupted > 0
    ? "CORRUPTED"
    : relay.active
      ? "ONLINE"
      : `${Math.round(charge * 100)}%`;
  ctx.fillText(label, relay.x, relay.y - 34);
  ctx.restore();
}

function drawLighting() {
  drawLightingWashes();
  drawAmbientDarkness();
}

function drawLightingWashes() {
  ctx.save();
  for (const agent of getInvestigators()) {
    if (!agent.lightOn || agent.resolve <= 0) {
      continue;
    }
    const range = getFlashlightBeamRange(agent);
    if (range <= 0) {
      continue;
    }
    drawFlashlightIllumination(agent, range);
  }
  if (lightning > 0) {
    ctx.globalAlpha = lightning * 0.42;
    ctx.fillStyle = arenaFlashColor;
    ctx.fillRect(0, 0, world.width, world.height);
  }
  if (state.blackout > 0 && playerRole === "Anomaly") {
    ctx.globalAlpha = Math.min(0.34, state.blackout * 0.12);
    ctx.fillStyle = "#e76f8a";
    ctx.fillRect(0, 0, world.width, world.height);
  }
  if (abilityFlash > 0) {
    ctx.globalAlpha = Math.min(0.32, abilityFlash * 1.1);
    ctx.fillStyle = playerRole === "Anomaly" ? "#e76f8a" : "#dff7ff";
    ctx.fillRect(0, 0, world.width, world.height);
  }
  ctx.restore();
}

function drawAmbientDarkness() {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = state.blackout > 0 && playerRole === "Anomaly" ? "rgba(0, 0, 0, 0.48)" : "rgba(0, 0, 0, 0.34)";
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.restore();
}

function drawFlashlightIllumination(agent, range) {
  const spread = GameBalance.tracker.flashlightBeamAngleRadians;
  const origin = getInvestigatorFlashlightOrigin(agent);
  const points = getFlashlightRayPoints(agent, origin, range, spread * 1.18);
  if (points.length < 2) {
    return;
  }
  const centerHit = castFlashlightRay(origin, agent.aim, range);
  const focusX = centerHit.x;
  const focusY = centerHit.y;
  const focusDistance = distance(origin, centerHit);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  for (const point of points) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
  ctx.clip();

  ctx.globalCompositeOperation = "screen";
  const spill = ctx.createRadialGradient(origin.x, origin.y, 12, origin.x, origin.y, range);
  spill.addColorStop(0, "rgba(255, 250, 232, 0.44)");
  spill.addColorStop(0.22, "rgba(255, 238, 192, 0.26)");
  spill.addColorStop(0.58, "rgba(183, 229, 219, 0.13)");
  spill.addColorStop(1, "rgba(122, 228, 214, 0)");
  ctx.fillStyle = spill;
  ctx.fillRect(origin.x - range, origin.y - range, range * 2, range * 2);

  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.28;
  const wash = ctx.createRadialGradient(focusX, focusY, 4, focusX, focusY, Math.max(70, range * 0.36));
  wash.addColorStop(0, "rgba(255, 242, 198, 0.72)");
  wash.addColorStop(0.48, "rgba(255, 223, 150, 0.28)");
  wash.addColorStop(1, "rgba(255, 223, 150, 0)");
  ctx.fillStyle = wash;
  ctx.beginPath();
  ctx.arc(focusX, focusY, Math.max(70, range * 0.36), 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = "rgba(255, 250, 226, 0.36)";
  ctx.lineWidth = Math.max(16, 34 * (focusDistance / Math.max(range, 1)));
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(origin.x + Math.cos(agent.aim) * 8, origin.y + Math.sin(agent.aim) * 8);
  ctx.lineTo(focusX, focusY);
  ctx.stroke();

  ctx.globalAlpha = 0.34;
  const hotspot = ctx.createRadialGradient(focusX, focusY, 0, focusX, focusY, 58);
  hotspot.addColorStop(0, "rgba(255, 252, 230, 0.82)");
  hotspot.addColorStop(0.42, "rgba(255, 236, 184, 0.34)");
  hotspot.addColorStop(1, "rgba(255, 236, 184, 0)");
  ctx.fillStyle = hotspot;
  ctx.beginPath();
  ctx.arc(focusX, focusY, 58, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const bulb = ctx.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, 72);
  bulb.addColorStop(0, "rgba(255, 250, 232, 0.34)");
  bulb.addColorStop(0.46, "rgba(122, 228, 214, 0.12)");
  bulb.addColorStop(1, "rgba(122, 228, 214, 0)");
  ctx.fillStyle = bulb;
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, 72, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getFlashlightRayPoints(agent, origin, range, spread) {
  const points = [];
  const steps = 18;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const angle = agent.aim - spread + spread * 2 * t;
    points.push(castFlashlightRay(origin, angle, range));
  }
  return points;
}

function castFlashlightRay(origin, angle, range) {
  const end = {
    x: clamp(origin.x + Math.cos(angle) * range, 0, world.width),
    y: clamp(origin.y + Math.sin(angle) * range, 0, world.height)
  };
  let closest = { ...end, distance: distance(origin, end) };
  for (const obstacle of [...walls, ...props]) {
    const hit = raycastObstacle(origin.x, origin.y, end.x, end.y, obstacle);
    if (hit && hit.distance < closest.distance) {
      closest = hit;
    }
  }
  return closest;
}

function raycastObstacle(x1, y1, x2, y2, obstacle) {
  if (isSegmentWall(obstacle)) {
    return raycastThickSegment(x1, y1, x2, y2, obstacle);
  }
  return raycastRect(x1, y1, x2, y2, obstacle);
}

function raycastThickSegment(x1, y1, x2, y2, segment) {
  const thickness = wallThickness(segment) / 2;
  const dx = segment.x2 - segment.x;
  const dy = segment.y2 - segment.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * thickness;
  const ny = (dx / length) * thickness;
  const corners = [
    [segment.x + nx, segment.y + ny],
    [segment.x2 + nx, segment.y2 + ny],
    [segment.x2 - nx, segment.y2 - ny],
    [segment.x - nx, segment.y - ny]
  ];
  return raycastPolygon(x1, y1, x2, y2, corners);
}

function raycastRect(x1, y1, x2, y2, rect) {
  return raycastPolygon(x1, y1, x2, y2, [
    [rect.x, rect.y],
    [rect.x + rect.w, rect.y],
    [rect.x + rect.w, rect.y + rect.h],
    [rect.x, rect.y + rect.h]
  ]);
}

function raycastPolygon(x1, y1, x2, y2, points) {
  let closest = null;
  for (let i = 0; i < points.length; i += 1) {
    const [x3, y3] = points[i];
    const [x4, y4] = points[(i + 1) % points.length];
    const hit = segmentIntersectionPoint(x1, y1, x2, y2, x3, y3, x4, y4);
    if (!hit) {
      continue;
    }
    hit.distance = Math.hypot(hit.x - x1, hit.y - y1);
    if (!closest || hit.distance < closest.distance) {
      closest = hit;
    }
  }
  return closest;
}

function segmentIntersectionPoint(x1, y1, x2, y2, x3, y3, x4, y4) {
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 0.0001) {
    return null;
  }
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) {
    return null;
  }
  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1)
  };
}

function drawBlackoutDarkness() {
  if (state.blackout <= 0 || playerRole !== "Investigator") {
    return;
  }

  if (!blackoutMask) {
    blackoutMask = createTextureCanvas(world.width, world.height);
  }
  const maskCtx = blackoutMask?.getContext?.("2d");
  if (!maskCtx) {
    return;
  }

  const intensity = clamp(state.blackout / 5, 0, 1);
  maskCtx.save();
  maskCtx.globalCompositeOperation = "source-over";
  maskCtx.clearRect(0, 0, world.width, world.height);
  maskCtx.fillStyle = `rgba(0, 0, 0, ${0.82 + intensity * 0.1})`;
  maskCtx.fillRect(0, 0, world.width, world.height);
  maskCtx.globalCompositeOperation = "destination-out";
  for (const agent of getInvestigators()) {
    if (!agent.lightOn || agent.resolve <= 0) {
      continue;
    }
    carveFlashlightVision(maskCtx, agent, getFlashlightBeamRange(agent) * 1.15, 0.42);
  }
  maskCtx.restore();

  ctx.drawImage(blackoutMask, 0, 0);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const agent of getInvestigators()) {
    if (!agent.lightOn || agent.resolve <= 0) {
      continue;
    }
    drawBlackoutFlashlightGlow(agent);
  }
  ctx.restore();
}

function carveFlashlightVision(targetCtx, agent, range, spread) {
  if (range <= 0) {
    return;
  }
  const origin = getInvestigatorFlashlightOrigin(agent);
  const beam = targetCtx.createRadialGradient(origin.x, origin.y, 18, origin.x, origin.y, range);
  beam.addColorStop(0, "rgba(255, 255, 255, 1)");
  beam.addColorStop(0.34, "rgba(255, 255, 255, 0.88)");
  beam.addColorStop(0.74, "rgba(255, 255, 255, 0.42)");
  beam.addColorStop(1, "rgba(255, 255, 255, 0)");
  targetCtx.fillStyle = beam;
  targetCtx.beginPath();
  targetCtx.moveTo(origin.x, origin.y);
  targetCtx.arc(origin.x, origin.y, range, agent.aim - spread, agent.aim + spread);
  targetCtx.closePath();
  targetCtx.fill();

  const core = targetCtx.createRadialGradient(origin.x, origin.y, 4, origin.x, origin.y, 72);
  core.addColorStop(0, "rgba(255, 255, 255, 0.85)");
  core.addColorStop(1, "rgba(255, 255, 255, 0)");
  targetCtx.fillStyle = core;
  targetCtx.beginPath();
  targetCtx.arc(origin.x, origin.y, 72, 0, Math.PI * 2);
  targetCtx.fill();
}

function drawBlackoutFlashlightGlow(agent) {
  const range = getFlashlightBeamRange(agent);
  if (range <= 0) {
    return;
  }
  const origin = getInvestigatorFlashlightOrigin(agent);
  const beam = ctx.createRadialGradient(origin.x, origin.y, 8, origin.x, origin.y, range + 5);
  beam.addColorStop(0, "rgba(248, 251, 253, 0.36)");
  beam.addColorStop(0.42, "rgba(122, 228, 214, 0.12)");
  beam.addColorStop(1, "rgba(122, 228, 214, 0)");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.arc(origin.x, origin.y, range + 20, agent.aim - GameBalance.tracker.flashlightBeamAngleRadians, agent.aim + GameBalance.tracker.flashlightBeamAngleRadians);
  ctx.closePath();
  ctx.fill();
}

function drawAgents() {
  for (const agent of getInvestigators()) {
    drawInvestigator(agent);
  }
  drawAnomaly(state.anomaly);
}

function drawOcclusionOverlays() {
  if (!mapOccluders.length) {
    return;
  }
  const source = mapForegroundImage?.src ? mapForegroundImage : mapBackgroundImage;
  if (!source?.src) {
    return;
  }
  const actors = [
    ...getInvestigators().filter((agent) => agent.resolve > 0),
    state.anomaly,
    ...state.echoes
  ];
  for (const occluder of mapOccluders) {
    if (!actors.some((actor) => actorBehindOccluder(actor, occluder))) {
      continue;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(occluder.x, occluder.y, occluder.w, occluder.h);
    ctx.clip();
    drawMapImage(source);
    drawLightingWashes();
    drawAmbientDarkness();
    ctx.restore();
  }
}

function actorBehindOccluder(actor, occluder) {
  const depthY = Number(occluder.depthY ?? occluder.y + occluder.h);
  const bounds = getActorVisualBounds(actor);
  return getActorOcclusionDepthY(actor, bounds) < depthY && boundsOverlap(bounds, occluder);
}

function getActorOcclusionDepthY(actor, bounds = getActorVisualBounds(actor)) {
  if (typeof actor?.resolve === "number" && typeof actor?.battery === "number") {
    return actor.y;
  }
  if (actor === state.anomaly) {
    return actor.y + (actor.radius ?? 0);
  }
  return actor.y + (actor.radius ?? 0);
}

function getActorVisualBounds(actor) {
  if (typeof actor?.resolve === "number" && typeof actor?.battery === "number") {
    return getInvestigatorVisualBounds(actor);
  }
  if (actor === state.anomaly) {
    const size = 98 * anomalyVisualScale;
    return {
      x: actor.x - size / 2,
      y: actor.y - size / 2,
      w: size,
      h: size
    };
  }
  const radius = actor.radius ?? 18;
  return {
    x: actor.x - radius * 2,
    y: actor.y - radius * 2,
    w: radius * 4,
    h: radius * 4
  };
}

function boundsOverlap(a, b) {
  return a.x + a.w >= b.x
    && a.x <= b.x + b.w
    && a.y + a.h >= b.y
    && a.y <= b.y + b.h;
}

function drawEchoes() {
  for (const echo of state.echoes) {
    const life = clamp(echo.life / echoMaxLife, 0, 1);
    const alpha = playerRole === "Anomaly" ? 0.48 : 0.16 + life * 0.12;
    const pulse = Math.sin(echo.pulse) * 5;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(echo.x, echo.y);
    ctx.rotate(echo.pulse * 0.14);
    ctx.shadowColor = "#e76f8a";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "#e76f8a";
    ctx.fillStyle = "rgba(231, 111, 138, 0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const r = echo.radius + pulse + (i % 2) * 9;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (playerRole === "Anomaly") {
      drawNameplate(echo.x, echo.y - 34, "ECHO", `${Math.ceil(echo.life)}s`, "#e76f8a");
    }
  }
}

function drawHunterSprite(agent, down, isPlayer) {
  if (hasInvestigatorAtlas(agent)) {
    drawInvestigatorAtlasSprite(agent, down, isPlayer);
    return true;
  }
  if (!down) {
    return false;
  }
  const stride = down ? 0 : Math.floor(performance.now() / 150 + agent.x * 0.01 + agent.y * 0.01) % 4;
  const sprite = getHunterSprite(agent.color, down, stride);
  if (!sprite) {
    return false;
  }
  const blinkAlpha = getInvulnerabilityAlpha(agent, down);
  ctx.save();
  ctx.globalAlpha = blinkAlpha;
  ctx.translate(agent.x, agent.y);
  ctx.rotate(down ? agent.aim + Math.PI / 2 : agent.aim);
  ctx.shadowColor = down ? "rgba(0, 0, 0, 0.4)" : agent.color;
  ctx.shadowBlur = down ? 4 : 16;
  ctx.drawImage(
    sprite,
    -investigatorVisual.downWidth / 2,
    -investigatorVisual.downHeight / 2,
    investigatorVisual.downWidth,
    investigatorVisual.downHeight
  );
  if (isPlayer) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#f8fbfd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, agent.radius + 9, -0.8, 0.8);
    ctx.stroke();
  }
  ctx.restore();
  return true;
}

function hasInvestigatorAtlas(agent) {
  const atlas = investigatorAtlases[getInvestigatorAtlasKey(agent)];
  return Boolean(atlas?.ready && atlas.image);
}

function drawInvestigatorAtlasSprite(agent, down, isPlayer) {
  const atlas = investigatorAtlases[getInvestigatorAtlasKey(agent)];
  if (!atlas?.ready || !atlas.image) {
    drawAtlasLoadingMarker(agent, isPlayer);
    return true;
  }
  const frame = down ? 1 : Math.floor(performance.now() / 150 + agent.x * 0.01 + agent.y * 0.01) % atlas.cols;
  const row = down ? getInvestigatorAtlasRow(Math.PI / 2) : getInvestigatorAtlasRow(agent.aim);
  const sprite = getInvestigatorAtlasFrame(atlas, row, frame, down);
  if (!sprite) {
    drawAtlasLoadingMarker(agent, isPlayer);
    return true;
  }
  const blinkAlpha = getInvulnerabilityAlpha(agent, down);
  ctx.save();
  ctx.globalAlpha = down ? blinkAlpha * 0.74 : blinkAlpha;
  ctx.translate(agent.x, agent.y);
  if (down) {
    ctx.rotate(agent.aim + Math.PI / 2);
  }
  ctx.shadowColor = down ? "rgba(0, 0, 0, 0.42)" : agent.color;
  ctx.shadowBlur = down ? 4 : 16;
  if (down) {
    ctx.drawImage(
      sprite,
      -investigatorVisual.downWidth / 2,
      -investigatorVisual.downHeight / 2,
      investigatorVisual.downWidth,
      investigatorVisual.downHeight
    );
  } else {
    ctx.drawImage(
      sprite,
      -investigatorVisual.atlasWidth / 2,
      -investigatorVisual.atlasHeight,
      investigatorVisual.atlasWidth,
      investigatorVisual.atlasHeight
    );
  }
  if (isPlayer) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#f8fbfd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, agent.radius + 9, -0.8, 0.8);
    ctx.stroke();
  }
  ctx.restore();
  return true;
}

function drawAtlasLoadingMarker(agent, isPlayer) {
  ctx.save();
  ctx.translate(agent.x, agent.y);
  ctx.globalAlpha = 0.36;
  ctx.fillStyle = agent.color;
  ctx.shadowColor = agent.color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(0, 0, agent.radius, 0, Math.PI * 2);
  ctx.fill();
  if (isPlayer) {
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "#f8fbfd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, agent.radius + 9, -0.8, 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

function getInvestigatorAtlasKey(agent) {
  if (agent === state.player) {
    return playerSuit.sprite ?? "brown";
  }
  if (agent.color === "#7ae4d6") {
    return "blond";
  }
  if (agent.color === "#c7a8ff") {
    return "black";
  }
  if (agent.color === "#e76f8a") {
    return "red";
  }
  return "brown";
}

function getInvestigatorAtlasRow(aim) {
  const normalized = (aim + Math.PI * 2) % (Math.PI * 2);
  const sector = Math.round(normalized / (Math.PI / 4)) % 8;
  return [2, 3, 4, 5, 6, 7, 0, 1][sector];
}

function getInvestigatorAtlasFrame(atlas, row, col, down) {
  const key = `atlas:${atlas.src}:${row}:${col}:${down ? "down" : "active"}`;
  if (characterSpriteCache.has(key)) {
    return characterSpriteCache.get(key);
  }
  const sprite = createTextureCanvas(characterSpriteSize, characterSpriteSize);
  if (!sprite) {
    characterSpriteCache.set(key, null);
    return null;
  }
  const spriteCtx = sprite.getContext("2d", { willReadFrequently: true });
  if (!spriteCtx) {
    characterSpriteCache.set(key, null);
    return null;
  }
  const layout = atlas.layout;
  const sx = layout.startX + col * layout.gapX - layout.w / 2;
  const sy = layout.startY + clamp(row, 0, atlas.rows - 1) * layout.gapY - layout.h / 2;
  spriteCtx.clearRect(0, 0, characterSpriteSize, characterSpriteSize);
  spriteCtx.imageSmoothingEnabled = true;
  spriteCtx.imageSmoothingQuality = "high";
  spriteCtx.drawImage(atlas.image, sx, sy, layout.w, layout.h, 0, 0, characterSpriteSize, characterSpriteSize);
  keyOutWhiteBackground(spriteCtx, characterSpriteSize, characterSpriteSize);
  keepLargestSpriteComponent(spriteCtx, characterSpriteSize, characterSpriteSize);
  recenterSpriteFrame(spriteCtx, characterSpriteSize, characterSpriteSize, down);
  if (down) {
    spriteCtx.globalCompositeOperation = "source-atop";
    spriteCtx.fillStyle = "rgba(62, 72, 82, 0.34)";
    spriteCtx.fillRect(0, 0, characterSpriteSize, characterSpriteSize);
    spriteCtx.globalCompositeOperation = "source-over";
  }
  characterSpriteCache.set(key, sprite);
  return sprite;
}

function keyOutWhiteBackground(spriteCtx, width, height) {
  let imageData;
  try {
    imageData = spriteCtx.getImageData(0, 0, width, height);
  } catch {
    return;
  }
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    const chroma = max - min;
    const bright = (r + g + b) / 3;
    const paper = min > 236 || (bright > 206 && chroma < 28);
    if (paper) {
      const alpha = min > 236 ? 0 : clamp((206 - bright) / 24, 0, 1);
      data[i + 3] = Math.round(data[i + 3] * alpha);
    }
  }
  spriteCtx.putImageData(imageData, 0, 0);
}

function keepLargestSpriteComponent(spriteCtx, width, height) {
  let imageData;
  try {
    imageData = spriteCtx.getImageData(0, 0, width, height);
  } catch {
    return;
  }
  const data = imageData.data;
  const total = width * height;
  const labels = new Int32Array(total);
  const stack = new Int32Array(total);
  const sizes = [0];
  let label = 0;
  let largestLabel = 0;
  let largestSize = 0;

  for (let index = 0; index < total; index += 1) {
    if (labels[index] !== 0 || data[index * 4 + 3] <= 18) {
      continue;
    }
    label += 1;
    let size = 0;
    let stackSize = 0;
    stack[stackSize] = index;
    stackSize += 1;
    labels[index] = label;

    while (stackSize > 0) {
      stackSize -= 1;
      const current = stack[stackSize];
      size += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < width - 1 ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y < height - 1 ? current + width : -1
      ];
      for (const next of neighbors) {
        if (next < 0 || labels[next] !== 0 || data[next * 4 + 3] <= 18) {
          continue;
        }
        labels[next] = label;
        stack[stackSize] = next;
        stackSize += 1;
      }
    }

    sizes[label] = size;
    if (size > largestSize) {
      largestSize = size;
      largestLabel = label;
    }
  }

  if (!largestLabel) {
    return;
  }
  const keepThreshold = Math.max(10, largestSize * 0.08);
  for (let index = 0; index < total; index += 1) {
    const pixelLabel = labels[index];
    if (pixelLabel === 0) {
      continue;
    }
    if (pixelLabel !== largestLabel && sizes[pixelLabel] < keepThreshold) {
      data[index * 4 + 3] = 0;
    }
  }
  spriteCtx.putImageData(imageData, 0, 0);
}

function recenterSpriteFrame(spriteCtx, width, height, down) {
  let imageData;
  try {
    imageData = spriteCtx.getImageData(0, 0, width, height);
  } catch {
    return;
  }
  const data = imageData.data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 18) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (minX >= maxX || minY >= maxY) {
    return;
  }

  const trimW = maxX - minX + 1;
  const trimH = maxY - minY + 1;
  const source = createTextureCanvas(width, height);
  const sourceCtx = source?.getContext?.("2d");
  if (!sourceCtx) {
    return;
  }
  sourceCtx.putImageData(imageData, 0, 0);
  spriteCtx.clearRect(0, 0, width, height);
  spriteCtx.imageSmoothingEnabled = true;
  spriteCtx.imageSmoothingQuality = "high";
  const maxTargetW = down ? 96 : 106;
  const maxTargetH = down ? 88 : 114;
  const scale = Math.min(maxTargetW / trimW, maxTargetH / trimH);
  const targetW = trimW * scale;
  const targetH = trimH * scale;
  const dx = (width - targetW) / 2;
  const dy = down ? (height - targetH) / 2 + 5 : height - targetH - 4;
  spriteCtx.drawImage(source, minX, minY, trimW, trimH, dx, dy, targetW, targetH);
}

function getHunterSprite(color, down, frame) {
  const key = `hunter:${color}:${down ? "down" : "active"}:${frame}`;
  if (characterSpriteCache.has(key)) {
    return characterSpriteCache.get(key);
  }
  const sprite = createTextureCanvas(characterSpriteSize, characterSpriteSize);
  if (!sprite) {
    characterSpriteCache.set(key, null);
    return null;
  }
  const spriteCtx = sprite.getContext("2d");
  if (!spriteCtx) {
    characterSpriteCache.set(key, null);
    return null;
  }
  renderHunterSprite(spriteCtx, color, down, frame);
  characterSpriteCache.set(key, sprite);
  return sprite;
}

function renderHunterSprite(spriteCtx, color, down, frame) {
  const cx = characterSpriteSize / 2;
  const cy = characterSpriteSize / 2;
  const accent = down ? "#66727c" : color;
  const suit = down ? "#39444d" : darkenColor(color, 0.18);
  const dark = "#071015";
  const light = down ? "#7d8b94" : lightenColor(color, 0.34);
  const stride = [-4, 2, 4, -2][frame % 4];

  spriteCtx.clearRect(0, 0, characterSpriteSize, characterSpriteSize);
  spriteCtx.save();
  spriteCtx.translate(cx, cy);
  spriteCtx.globalAlpha = down ? 0.78 : 1;

  spriteCtx.fillStyle = "rgba(0, 0, 0, 0.34)";
  spriteCtx.beginPath();
  spriteCtx.ellipse(-2, 16, 32, 12, 0, 0, Math.PI * 2);
  spriteCtx.fill();

  spriteCtx.strokeStyle = "rgba(223, 247, 255, 0.28)";
  spriteCtx.lineWidth = 2;
  spriteCtx.fillStyle = down ? "#263039" : "#132329";
  spriteCtx.beginPath();
  spriteCtx.roundRect(-35, -15, 25, 31, 8);
  spriteCtx.fill();
  spriteCtx.stroke();

  spriteCtx.fillStyle = dark;
  spriteCtx.beginPath();
  spriteCtx.roundRect(-33, -22 + stride * 0.35, 18, 8, 4);
  spriteCtx.roundRect(-33, 14 - stride * 0.35, 18, 8, 4);
  spriteCtx.fill();

  spriteCtx.fillStyle = suit;
  spriteCtx.strokeStyle = dark;
  spriteCtx.lineWidth = 4;
  spriteCtx.beginPath();
  spriteCtx.roundRect(-21, -23, 44, 46, 15);
  spriteCtx.fill();
  spriteCtx.stroke();

  spriteCtx.fillStyle = "rgba(248, 251, 253, 0.12)";
  spriteCtx.beginPath();
  spriteCtx.roundRect(-12, -19, 22, 7, 4);
  spriteCtx.fill();

  spriteCtx.fillStyle = down ? "#20282e" : accent;
  spriteCtx.strokeStyle = dark;
  spriteCtx.lineWidth = 3;
  spriteCtx.beginPath();
  spriteCtx.arc(-1, 0, 24, 0, Math.PI * 2);
  spriteCtx.fill();
  spriteCtx.stroke();

  const visor = spriteCtx.createLinearGradient(3, -11, 31, 7);
  visor.addColorStop(0, down ? "#28333a" : "#f8fbfd");
  visor.addColorStop(0.48, down ? "#40505a" : "#91f0eb");
  visor.addColorStop(1, down ? "#1f272d" : "#10272c");
  spriteCtx.fillStyle = visor;
  spriteCtx.strokeStyle = "rgba(5, 8, 12, 0.78)";
  spriteCtx.lineWidth = 2;
  spriteCtx.beginPath();
  spriteCtx.roundRect(5, -13, 34, 25, 9);
  spriteCtx.fill();
  spriteCtx.stroke();

  spriteCtx.fillStyle = "rgba(255, 255, 255, 0.62)";
  spriteCtx.fillRect(12, -8, 17, 3);
  spriteCtx.fillStyle = down ? "#273139" : light;
  spriteCtx.beginPath();
  spriteCtx.arc(15, -15, 4, 0, Math.PI * 2);
  spriteCtx.fill();

  spriteCtx.strokeStyle = light;
  spriteCtx.lineWidth = 3;
  spriteCtx.beginPath();
  spriteCtx.moveTo(-11, -20);
  spriteCtx.lineTo(-25, -31 + stride * 0.35);
  spriteCtx.moveTo(-10, 20);
  spriteCtx.lineTo(-25, 31 - stride * 0.35);
  spriteCtx.stroke();

  spriteCtx.fillStyle = down ? "#2f3941" : "#e9fbff";
  spriteCtx.strokeStyle = dark;
  spriteCtx.lineWidth = 2;
  spriteCtx.beginPath();
  spriteCtx.roundRect(26, -8, 28, 16, 6);
  spriteCtx.fill();
  spriteCtx.stroke();
  spriteCtx.fillStyle = down ? "#1e252b" : "#f4b35d";
  spriteCtx.fillRect(48, -3, 11, 6);

  spriteCtx.strokeStyle = "rgba(223, 247, 255, 0.42)";
  spriteCtx.lineWidth = 1.5;
  spriteCtx.beginPath();
  spriteCtx.arc(-1, 0, 17, Math.PI * 0.2, Math.PI * 1.2);
  spriteCtx.stroke();
  spriteCtx.restore();
}

function drawAnomalySprite(anomaly, alpha) {
  if (drawAnomalyAtlasSprite(anomaly, alpha)) {
    return true;
  }
  const frame = Math.floor(performance.now() / 130) % 6;
  const sprite = getAnomalySprite(frame);
  if (!sprite) {
    return false;
  }
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha * 1.08);
  ctx.globalCompositeOperation = "screen";
  const size = 94 * anomalyVisualScale;
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}

function drawAnomalyAtlasSprite(anomaly, alpha) {
  if (!anomalyAtlas.ready || !anomalyAtlas.image) {
    return false;
  }
  const pose = getAnomalyAtlasPose(anomaly);
  const sx = pose.col * anomalyAtlas.frame;
  const sy = pose.row * anomalyAtlas.frame;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha * 1.18);
  ctx.shadowColor = "#7ae4d6";
  ctx.shadowBlur = 16;
  if (pose.flip) {
    ctx.scale(-1, 1);
  }
  const size = 98 * anomalyVisualScale;
  const half = size / 2;
  ctx.drawImage(anomalyAtlas.image, sx, sy, anomalyAtlas.frame, anomalyAtlas.frame, -half, -half, size, size);
  if ((anomaly.damageFlash ?? 0) > 0) {
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = Math.min(0.74, (anomaly.damageFlash ?? 0) * alpha);
    ctx.fillStyle = "#ff3f55";
    ctx.fillRect(-half, -half, size, size);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = Math.min(0.5, (anomaly.damageFlash ?? 0) * 0.7);
    ctx.fillStyle = "rgba(255, 80, 70, 0.75)";
    ctx.beginPath();
    ctx.arc(0, 0, 52 * anomalyVisualScale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return true;
}

function getAnomalyAtlasPose(anomaly) {
  const frame = Math.floor(performance.now() / 145) % anomalyAtlas.cols;
  const angle = anomaly.aim ?? 0;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  if (Math.abs(dx) > Math.abs(dy) * 1.15) {
    return { row: frame % 2 === 0 ? 1 : 2, col: frame, flip: dx < 0 };
  }
  if (dy > 0) {
    return { row: 4, col: frame, flip: false };
  }
  return { row: 0, col: frame, flip: false };
}

function getAnomalySprite(frame) {
  const key = `anomaly:${frame}`;
  if (characterSpriteCache.has(key)) {
    return characterSpriteCache.get(key);
  }
  const sprite = createTextureCanvas(characterSpriteSize, characterSpriteSize);
  if (!sprite) {
    characterSpriteCache.set(key, null);
    return null;
  }
  const spriteCtx = sprite.getContext("2d");
  if (!spriteCtx) {
    characterSpriteCache.set(key, null);
    return null;
  }
  renderAnomalySprite(spriteCtx, frame);
  characterSpriteCache.set(key, sprite);
  return sprite;
}

function renderAnomalySprite(spriteCtx, frame) {
  const cx = characterSpriteSize / 2;
  const cy = characterSpriteSize / 2;
  const pulse = Math.sin(frame / 6 * Math.PI * 2);
  spriteCtx.clearRect(0, 0, characterSpriteSize, characterSpriteSize);
  spriteCtx.save();
  spriteCtx.translate(cx, cy);
  spriteCtx.rotate(frame * 0.16);

  const aura = spriteCtx.createRadialGradient(0, 0, 6, 0, 0, 54);
  aura.addColorStop(0, "rgba(255, 214, 224, 0.76)");
  aura.addColorStop(0.35, "rgba(231, 111, 138, 0.34)");
  aura.addColorStop(1, "rgba(231, 111, 138, 0)");
  spriteCtx.fillStyle = aura;
  spriteCtx.beginPath();
  spriteCtx.arc(0, 0, 54, 0, Math.PI * 2);
  spriteCtx.fill();

  spriteCtx.fillStyle = "rgba(231, 111, 138, 0.88)";
  spriteCtx.strokeStyle = "#2a0914";
  spriteCtx.lineWidth = 4;
  spriteCtx.beginPath();
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const radius = 23 + (i % 2) * 10 + pulse * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) spriteCtx.moveTo(x, y);
    else spriteCtx.lineTo(x, y);
  }
  spriteCtx.closePath();
  spriteCtx.fill();
  spriteCtx.stroke();

  spriteCtx.fillStyle = "rgba(255, 214, 224, 0.8)";
  spriteCtx.beginPath();
  spriteCtx.moveTo(-7, -18);
  spriteCtx.lineTo(15, -6);
  spriteCtx.lineTo(3, 19);
  spriteCtx.lineTo(-18, 5);
  spriteCtx.closePath();
  spriteCtx.fill();

  spriteCtx.strokeStyle = "rgba(255, 238, 243, 0.78)";
  spriteCtx.lineWidth = 2;
  spriteCtx.beginPath();
  spriteCtx.moveTo(-28, 0);
  spriteCtx.lineTo(30, -3);
  spriteCtx.moveTo(1, -30);
  spriteCtx.lineTo(5, 29);
  spriteCtx.stroke();

  spriteCtx.fillStyle = "rgba(255, 238, 243, 0.72)";
  for (let i = 0; i < 5; i += 1) {
    const angle = frame * 0.28 + i * ((Math.PI * 2) / 5);
    const x = Math.cos(angle) * (38 + pulse * 3);
    const y = Math.sin(angle) * (38 + pulse * 3);
    spriteCtx.save();
    spriteCtx.translate(x, y);
    spriteCtx.rotate(angle);
    spriteCtx.beginPath();
    spriteCtx.moveTo(0, -6);
    spriteCtx.lineTo(6, 0);
    spriteCtx.lineTo(0, 6);
    spriteCtx.lineTo(-6, 0);
    spriteCtx.closePath();
    spriteCtx.fill();
    spriteCtx.restore();
  }
  spriteCtx.restore();
}

function drawInvestigator(agent) {
  const down = agent.resolve <= 0;
  const isPlayer = agent === state.player && playerRole === "Investigator";
  const blinkAlpha = getInvulnerabilityAlpha(agent, down);
  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.beginPath();
  ctx.ellipse(agent.x, agent.y + 3, investigatorVisual.shadowWidth, investigatorVisual.shadowHeight, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (!down && agent.overcharge > 0) {
    drawOverchargeAura(agent);
  }
  if (!down && agent.invulnerable > 0) {
    drawInvulnerabilityAura(agent);
  }

  const drewSprite = drawHunterSprite(agent, down, isPlayer);
  if (!drewSprite) {
    const aimY = Math.sin(agent.aim);
    const facing = getInvestigatorFacingDirection(agent.aim);
    const stride = Math.sin(performance.now() / 120 + agent.x * 0.03 + agent.y * 0.02) * 3;
    const handX = facing === "left" ? -15 : (facing === "right" ? 15 : 0);
    const handY = facing === "down" ? -32 : (facing === "up" ? -55 : -43 + aimY * 5);
    const shoulderX = facing === "left" ? -10 : (facing === "right" ? 10 : 0);
    ctx.save();
    ctx.globalAlpha = blinkAlpha;
    ctx.translate(agent.x, agent.y);
    ctx.shadowColor = agent.color;
    ctx.shadowBlur = down ? 0 : 18;
    ctx.strokeStyle = "#071015";
    ctx.lineWidth = 4;

    ctx.strokeStyle = down ? "rgba(32, 40, 46, 0.72)" : darkenColor(agent.color, 0.34);
    ctx.beginPath();
    ctx.moveTo(-7, -8);
    ctx.lineTo(-12, -2 + stride);
    ctx.moveTo(8, -8);
    ctx.lineTo(13, -2 - stride);
    ctx.stroke();

    ctx.fillStyle = down ? "#53606a" : darkenColor(agent.color, 0.18);
    ctx.strokeStyle = "#071015";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-15, -56, 30, 46, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = down ? "#2b3339" : agent.color;
    ctx.beginPath();
    ctx.arc(0, -65, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = down ? "#20282e" : "rgba(5, 8, 12, 0.72)";
    ctx.beginPath();
    ctx.roundRect(-8, -68, 16, 9, 4);
    ctx.fill();

    ctx.strokeStyle = down ? "rgba(32, 40, 46, 0.7)" : lightenColor(agent.color, 0.36);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(shoulderX, -43);
    ctx.lineTo(handX, handY);
    ctx.stroke();

    ctx.fillStyle = down ? "#2b3339" : "#e9fbff";
    ctx.strokeStyle = "#071015";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (facing === "left") {
      ctx.roundRect(handX - 22, handY - 6, 22, 12, 5);
    } else if (facing === "right") {
      ctx.roundRect(handX, handY - 6, 22, 12, 5);
    } else {
      ctx.roundRect(handX - 11, handY - 6, 22, 12, 5);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = down ? "#273039" : lightenColor(agent.color, 0.28);
    ctx.beginPath();
    ctx.roundRect(-12, -31, 24, 10, 5);
    ctx.fill();

    if (isPlayer) {
      ctx.strokeStyle = "#f8fbfd";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, agent.radius + 6, -0.8, 0.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawInvestigatorHeldFlashlight(agent, down);

  ctx.save();
  if (down) {
    const progress = clamp(agent.reviveProgress / reviveSeconds, 0, 1);
    ctx.strokeStyle = "#7ae4d6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(agent.x, agent.y, agent.radius + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
    ctx.fillStyle = "#dff7ff";
    ctx.font = "800 12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("REVIVE", agent.x, agent.y - investigatorVisual.reviveLabelOffset);
  } else {
    drawProximityWarning(agent);
  }
  ctx.restore();
}

function drawInvestigatorHeldFlashlight(agent, down) {
  if (down) {
    return;
  }
  const aim = agent.aim;
  const facing = getInvestigatorFacingDirection(aim);
  if (facing === "up") {
    return;
  }
  const originX = agent.x + Math.cos(aim) * 14;
  const originY = agent.y - 42 + Math.sin(aim) * 10;
  ctx.save();
  ctx.translate(originX, originY);
  ctx.rotate(aim);
  ctx.shadowColor = agent.lightOn ? "#f4b35d" : "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = agent.lightOn ? 12 : 4;
  ctx.fillStyle = "#e9fbff";
  ctx.strokeStyle = "#071015";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-6, -5, 22, 10, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = agent.lightOn ? "#f4b35d" : "#7a8890";
  ctx.beginPath();
  ctx.roundRect(13, -4, 8, 8, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function getInvestigatorFacingDirection(aim) {
  const x = Math.cos(aim);
  const y = Math.sin(aim);
  if (Math.abs(y) > Math.abs(x)) {
    return y < 0 ? "up" : "down";
  }
  return x < 0 ? "left" : "right";
}

function getInvulnerabilityAlpha(agent, down) {
  if (down || agent.invulnerable <= 0) {
    return 1;
  }
  const blink = Math.sin(performance.now() * 0.018) * 0.5 + 0.5;
  return 0.46 + blink * 0.24;
}

function drawInvulnerabilityAura(agent) {
  const pulse = Math.sin(performance.now() * 0.018) * 0.5 + 0.5;
  ctx.save();
  ctx.globalAlpha = 0.18 + pulse * 0.18;
  ctx.strokeStyle = "#f8fbfd";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.arc(agent.x, agent.y, agent.radius + 15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawOverchargeAura(agent) {
  const pulse = Math.sin(performance.now() * 0.009) * 0.5 + 0.5;
  ctx.save();
  ctx.globalAlpha = 0.42 + pulse * 0.18;
  ctx.strokeStyle = "#dff7ff";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#7ae4d6";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(agent.x, agent.y, agent.radius + 13 + pulse * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawProximityWarning(agent) {
  if (playerRole !== "Investigator") {
    return;
  }
  const level = getAnomalyProximityWarning(agent);
  if (!level) {
    return;
  }
  const critical = level === 2;
  const pulse = Math.sin(performance.now() * (critical ? 0.014 : 0.009)) * 0.5 + 0.5;
  const y = agent.y - investigatorVisual.nameplateOffset - 22 - pulse * 3;
  ctx.save();
  ctx.globalAlpha = critical ? 0.92 : 0.78;
  ctx.fillStyle = critical ? "rgba(231, 111, 138, 0.9)" : "rgba(244, 179, 93, 0.88)";
  ctx.strokeStyle = "#f8fbfd";
  ctx.lineWidth = 1.8;
  ctx.shadowColor = critical ? "#e76f8a" : "#f4b35d";
  ctx.shadowBlur = critical ? 18 : 10;
  ctx.beginPath();
  ctx.arc(agent.x, y, critical ? 12 : 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#071015";
  ctx.font = critical ? "900 18px Inter, sans-serif" : "900 15px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(critical ? "!" : "?", agent.x, y + 1);
  ctx.restore();
}

function drawAnomaly(anomaly) {
  const stealthPhase = state.phase === "playing" || state.phase === "countdown";
  const escapeVisibility = getAnomalyEscapeVisibility(anomaly);
  const alpha = playerRole === "Anomaly" && stealthPhase
    ? (anomaly.revealed > aiAnomalyVisibleThreshold ? 1 : 0.4)
    : stealthPhase
      ? Math.max(anomaly.revealed, escapeVisibility)
      : 0.72;
  if (alpha <= 0.02) {
    return;
  }
  const usingAtlas = anomalyAtlas.ready && anomalyAtlas.image;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(anomaly.x, anomaly.y);
  if (!usingAtlas) {
    ctx.save();
    ctx.scale(anomalyVisualScale, anomalyVisualScale);
    ctx.rotate(Math.sin(performance.now() * 0.0018) * 0.08);
    ctx.shadowColor = "#e76f8a";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "rgba(231, 111, 138, 0.18)";
    ctx.strokeStyle = "rgba(231, 111, 138, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, anomaly.radius + 18 + Math.sin(performance.now() * 0.003) * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e76f8a";
    ctx.strokeStyle = "#2a0914";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2 + performance.now() * 0.001;
      const r = anomaly.radius + (i % 2) * 8 + Math.sin(performance.now() * 0.004 + i) * 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 221, 229, 0.48)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + 0.24;
      const x = Math.cos(a) * (anomaly.radius * 0.72);
      const y = Math.sin(a) * (anomaly.radius * 0.72);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "#ffb2c1";
    ctx.globalAlpha = alpha * 0.64;
    ctx.beginPath();
    ctx.arc(-5, -5, anomaly.radius * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  drawAnomalySprite(anomaly, alpha);
  drawAnomalyStateEffects(anomaly, alpha);
  if (!usingAtlas) {
    ctx.save();
    ctx.scale(anomalyVisualScale, anomalyVisualScale);
    ctx.globalAlpha = alpha * 0.58;
    ctx.fillStyle = "#ffd6df";
    for (let i = 0; i < 4; i += 1) {
      const a = performance.now() * 0.0014 + i * Math.PI * 0.5;
      const x = Math.cos(a) * (anomaly.radius + 19);
      const y = Math.sin(a) * (anomaly.radius + 19);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 5);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(255, 225, 232, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-anomaly.radius - 3, 0);
    ctx.lineTo(anomaly.radius + 5, -2);
    ctx.moveTo(0, -anomaly.radius - 6);
    ctx.lineTo(4, anomaly.radius + 5);
    ctx.stroke();
    ctx.restore();
  }
  if (playerRole === "Anomaly") {
    ctx.strokeStyle = "#f8fbfd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, anomaly.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  if (playerRole === "Anomaly" || alpha > 0.24) {
    drawNameplate(anomaly.x, anomaly.y - 36, playerRole === "Anomaly" ? "YOU" : "ANOMALY", getAnomalyStateLabel(), "#e76f8a");
  }
}

function getAnomalyEscapeVisibility(anomaly) {
  if (playerRole === "Anomaly" || anomaly.escapeTimer <= 0) {
    return 0;
  }
  const progress = clamp(anomaly.escapeTimer / GameBalance.ghost.escapeDurationSeconds, 0, 1);
  return 0.92 * progress * progress;
}

function drawAnomalyStateEffects(anomaly, alpha) {
  const now = performance.now();
  if (anomaly.shockTimer > 0) {
    const pulse = Math.sin(now * 0.026) * 0.5 + 0.5;
    ctx.save();
    ctx.globalAlpha = alpha * (0.48 + pulse * 0.28);
    ctx.strokeStyle = "#dff7ff";
    ctx.fillStyle = "rgba(223, 247, 255, 0.16)";
    ctx.lineWidth = 2.4;
    ctx.shadowColor = "#7ae4d6";
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(0, 0, anomaly.radius + 18 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 5; i += 1) {
      const angle = now * 0.006 + i * ((Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
      ctx.lineTo(Math.cos(angle + 0.34) * (anomaly.radius + 22), Math.sin(angle + 0.34) * (anomaly.radius + 22));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, anomaly.radius + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (anomaly.escapeTimer > 0) {
    const fade = clamp(anomaly.escapeTimer / GameBalance.ghost.escapeDurationSeconds, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha * (0.16 + fade * 0.22);
    ctx.strokeStyle = "#b8c8d2";
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, anomaly.radius + 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (anomaly.carriedAgent) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.42;
    ctx.strokeStyle = "#e76f8a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, anomaly.radius + 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawNameplate(x, y, title, subtitle, color) {
  const titleWidth = measureTextWidth(title, 10);
  const subtitleWidth = measureTextWidth(subtitle, 8);
  const width = Math.max(54, titleWidth, subtitleWidth) + 18;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(5, 8, 12, 0.72)";
  ctx.strokeStyle = "rgba(226, 238, 246, 0.14)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-width / 2, -21, width, 28, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "800 10px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title.toUpperCase(), 0, -10);
  ctx.fillStyle = "#d9e7ee";
  ctx.font = "700 8px Inter, sans-serif";
  ctx.fillText(subtitle.toUpperCase(), 0, 1);
  ctx.restore();
}

function drawObjectiveHints() {
  if (state.phase !== "playing") {
    return;
  }
  const actor = playerRole === "Anomaly" ? state.anomaly : state.player;
  if (relaysEnabled) {
    const relay = nearestRelay(actor, relayRange + 8);
    if (relay) {
      if (playerRole === "Investigator" && (relay.corrupted > 0 || !relay.active)) {
        drawWorldPrompt(relay.x, relay.y + 48, relay.corrupted > 0 ? "Purging relay" : "Charging relay", "#7ae4d6");
      } else if (playerRole === "Anomaly" && (relay.active || relay.charge > 0.1)) {
        drawWorldPrompt(relay.x, relay.y + 48, "Corrupting relay", "#e76f8a");
      }
    }
  }

  if (playerRole === "Investigator" && state.player.resolve > 0) {
    const downed = nearestDowned(state.player, reviveRange);
    if (downed) {
      drawWorldPrompt(downed.x, downed.y + 48, "Reviving", "#dff7ff");
    }
    const battery = nearestBattery(state.player, 86);
    if (battery && (battery.kind === "overcharge" || state.player.battery < maxBatteryCapacity * 0.96)) {
      drawWorldPrompt(
        battery.x,
        battery.y + 34,
        battery.kind === "overcharge" ? "Overcharge" : "Battery refill",
        battery.kind === "overcharge" ? "#dff7ff" : "#f4b35d"
      );
    }
  }
}

function drawWorldPrompt(x, y, text, color) {
  const width = measureTextWidth(text, 11) + 22;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(5, 8, 12, 0.78)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-width / 2, -13, width, 26, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f8fbfd";
  ctx.font = "800 11px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, 0, 4);
  ctx.restore();
}

function measureTextWidth(text, size) {
  const measured = ctx.measureText?.(text);
  return measured?.width ?? text.length * size * 0.62;
}

function getIntentLabel(agent) {
  const labels = {
    revive: "reviving",
    battery: "resupply",
    relay: "relay",
    evade: "evading",
    hunt: "hunting",
    patrol: "patrol"
  };
  return labels[agent.intent] ?? "patrol";
}

function getAnomalyStateLabel() {
  if (state.anomaly.shockTimer > 0) {
    return "shocked";
  }
  if (state.anomaly.carriedAgent) {
    return "carrying";
  }
  if (state.anomaly.escapeTimer > 0) {
    return "escaping";
  }
  if (state.blackout > 0) {
    return "blackout";
  }
  if (state.anomaly.revealed > 0.2) {
    return "exposed";
  }
  const relay = nearestCorruptibleRelay(state.anomaly, 460);
  if (relaysEnabled && relay) {
    return "contesting";
  }
  return "veiled";
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawRings() {
  for (const ring of state.rings) {
    const progress = ring.age / ring.duration;
    const radius = ring.radius * progress;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 6 * (1 - progress) + 1;
    ctx.shadowColor = ring.color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawOverlay() {
  const vignette = ctx.createRadialGradient(640, 360, 180, 640, 360, 740);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.58)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, world.width, world.height);
}

function drawSignalFeedback() {
  if (state.phase !== "playing") {
    return;
  }
  const signal = getSignalStrength();
  if (signal <= 0.08) {
    return;
  }
  const actor = playerRole === "Anomaly" ? state.anomaly : state.player;
  const color = playerRole === "Anomaly" ? "#e76f8a" : "#7ae4d6";
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.16 + signal * 0.24 + signalPulse * 0.26;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 + signal * 4;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18 + signal * 18;
  ctx.beginPath();
  ctx.arc(actor.x, actor.y, 44 + signal * 34 + signalPulse * 36, 0, Math.PI * 2);
  ctx.stroke();

  if (playerRole === "Investigator" && signal > 0.72) {
    ctx.globalAlpha = 0.08 + signalPulse * 0.18;
    ctx.fillStyle = "#7ae4d6";
    ctx.fillRect(0, 0, world.width, world.height);
  }
  ctx.restore();
}

function drawCountdown() {
  if (state.phase !== "countdown") {
    return;
  }
  ctx.save();
  ctx.fillStyle = "rgba(2, 4, 7, 0.48)";
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "#90a3af";
  ctx.font = "800 22px Inter, sans-serif";
  ctx.fillText(currentMapName.toUpperCase(), world.width / 2, 288);
  ctx.fillStyle = "#f8fbfd";
  ctx.shadowColor = "#7ae4d6";
  ctx.shadowBlur = 28;
  ctx.font = "900 96px Inter, sans-serif";
  ctx.fillText(Math.max(1, Math.ceil(countdown)).toString(), world.width / 2, 390);
  ctx.font = "800 20px Inter, sans-serif";
  ctx.shadowBlur = 0;
  ctx.fillText(playerRole === "Anomaly" ? "Collapse the team" : "Contain the anomaly", world.width / 2, 432);
  ctx.restore();
}

function burst(x, y, color, count) {
  const particleCount = reduceMotion ? Math.ceil(count * 0.35) : count;
  for (let i = 0; i < particleCount; i += 1) {
    const angle = visualRandom() * Math.PI * 2;
    const speed = 34 + visualRandom() * 90;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + visualRandom() * 0.5,
      size: 2 + visualRandom() * 4,
      color
    });
  }
}

function trailSmoke(x, y, color = "#b8c8d2", count = 1) {
  const particleCount = reduceMotion ? 1 : count;
  for (let i = 0; i < particleCount; i += 1) {
    const angle = visualRandom() * Math.PI * 2;
    const speed = 10 + visualRandom() * 28;
    state.particles.push({
      x: x + (visualRandom() * 20 - 10),
      y: y + (visualRandom() * 20 - 10),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 10,
      life: 0.55 + visualRandom() * 0.45,
      size: 7 + visualRandom() * 8,
      grow: 12 + visualRandom() * 10,
      color
    });
  }
}

function addCameraShake(amount) {
  cameraShake = Math.max(cameraShake, reduceMotion ? amount * 0.18 : amount);
}

function updateParticles(dt) {
  state.particles = state.particles.filter((p) => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.size += (p.grow ?? 0) * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    return p.life > 0;
  });
}

function createRing(x, y, color, radius, duration) {
  state.rings.push({ x, y, color, radius, duration, age: 0 });
}

function updateRings(dt) {
  state.rings = state.rings.filter((ring) => {
    ring.age += dt;
    return ring.age <= ring.duration;
  });
}

function updateHud() {
  if (stageEl?.dataset) {
    stageEl.dataset.phase = state.phase;
    stageEl.dataset.role = playerRole.toLowerCase();
  }
  phaseEl.textContent = state.phase === "playing"
    ? "Live Match"
    : state.phase === "countdown"
      ? "Launching"
      : state.phase === "ended"
        ? "Results"
        : "Lobby";
  timerEl.textContent = formatTime(state.time);
  anomalyMeter.value = state.anomaly.stability;
  const anomalyHealthText = `${Math.max(0, Math.round(state.anomaly.stability))}%`;
  if (anomalyHealthPercent) {
    anomalyHealthPercent.value = anomalyHealthText;
    anomalyHealthPercent.textContent = anomalyHealthText;
  }
  batteryMeter.max = maxBatteryCapacity;
  batteryMeter.value = playerRole === "Investigator" ? state.player.battery : maxBatteryCapacity;
  signalMeter.value = getSignalStrength() * 100;
  const actor = playerRole === "Investigator" ? state.player : state.anomaly;
  const maxCooldown = abilityMax[playerRole];
  abilityMeter.value = 100 - (actor.abilityCooldown / maxCooldown) * 100;
  const abilityName = playerRole === "Investigator" ? "Pulse Scan" : "Blackout Wave";
  abilityBtn.textContent = actor.abilityCooldown > 0
    ? `${abilityName} ${Math.ceil(actor.abilityCooldown)}s`
    : abilityName;
  abilityRef.textContent = actor.abilityCooldown > 0
    ? `E ${Math.ceil(actor.abilityCooldown)}s`
    : playerRole === "Investigator" ? "E Pulse Scan" : "E Blackout";
  interactRef.hidden = !relaysEnabled;
  interactRef.textContent = relaysEnabled ? "Near Relay" : "";
  const event = maps[currentMapName]?.event ?? maps["Observatory Annex"].event;
  const eventProgress = state.phase === "playing" || state.phase === "countdown"
    ? 100 - (arenaEventCooldown / arenaEventWindow) * 100
    : 0;
  eventName.textContent = state.phase === "playing"
    ? `${event.name} ${Math.max(0, Math.ceil(arenaEventCooldown))}s`
    : event.name;
  eventMeter.value = clamp(eventProgress, 0, 100);
}

function getTeamResolve() {
  const investigators = getInvestigators();
  if (!investigators.length) {
    return 0;
  }
  return investigators.reduce((total, agent) => total + agent.resolve, 0) / investigators.length;
}

function getSignalStrength() {
  if (state.phase !== "playing" && state.phase !== "countdown") {
    return 0;
  }

  if (playerRole === "Investigator") {
    if (state.player.resolve <= 0) {
      return 0;
    }
    const dist = distance(state.player, state.anomaly);
    let signal = clamp(1 - (dist - 70) / 360, 0, 1);
    if (segmentBlocked(state.player.x, state.player.y, state.anomaly.x, state.anomaly.y)) {
      signal *= 0.72;
    }
    if (state.anomaly.revealed > 0.2) {
      signal = Math.max(signal, 0.68);
    }
    const echo = nearestEcho(state.player, 300);
    if (echo) {
      signal = Math.max(signal, 0.48 * clamp(echo.life / echoMaxLife, 0, 1));
    }
    return signal;
  }

  const lightThreat = getInvestigators().some((agent) => agent.lightOn && inLightCone(agent, state.anomaly)) ? 1 : 0;
  const proximityThreat = getInvestigators().reduce((highest, agent) => {
    if (agent.resolve <= 0) {
      return highest;
    }
    return Math.max(highest, 1 - distance(agent, state.anomaly) / 260);
  }, 0);

  return clamp(Math.max(lightThreat, proximityThreat * 0.72), 0, 1);
}

function makeRoundSummary(outcome) {
  const activeTrackers = getInvestigators().filter((agent) => agent.resolve > 0).length;
  return {
    role: playerRole,
    outcome,
    winner: outcome.includes("contained") ? "trackers" : outcome.includes("collapsed") ? "ghost" : "timeout",
    map: currentMapName,
    seed: formatSeed(),
    matchOptions: getMatchOptions(),
    stats: { ...state.stats },
    roundDuration: Math.max(0, state.stats.startedAt - state.time),
    timeRemaining: state.time,
    trackersRemaining: activeTrackers,
    teamResolve: getTeamResolve(),
    anomalyStability: state.anomaly.stability,
    telemetry: {
      ghostHealthRemaining: Math.round(state.anomaly.stability),
      trackersRemaining: activeTrackers,
      trackersDownedTotal: getInvestigators().filter((agent) => agent.resolve <= 0).length,
      revivesTotal: state.stats.revives,
      flashlightDamageTotal: Math.round(state.stats.damageDealt),
      batteriesCollected: state.stats.pickups,
      lightningReveals: state.stats.lightningReveals,
      ghostMagicUses: state.stats.abilityUses,
      ghostCatches: state.stats.ghostCatches,
      averageTrackerDistanceToGhost: Math.round(getAverageTrackerDistanceToGhost())
    }
  };
}

function getAverageTrackerDistanceToGhost() {
  const investigators = getInvestigators();
  if (!investigators.length) {
    return 0;
  }
  return investigators.reduce((total, agent) => total + distance(agent, state.anomaly), 0) / investigators.length;
}

function makeFeedbackPacket(career = services.stats.getProfile(), tuning = null) {
  const summary = lastRoundSummary ?? makeRoundSummary(state.stats.outcome);
  const notes = tuning ?? makeTuningNotes(summary);
  const recentMessages = services.network.getMessages().slice(-8).map((message) => ({
    type: message.type,
    reliable: message.reliable,
    phase: message.payload?.phase ?? null,
    time: message.payload?.time ?? null
  }));

  return {
    build: {
      app: "Afterlight Protocol Prototype",
      version: "0.1.0",
      target: "web-static"
    },
    testerReport: {
      severity: "low | medium | high | blocking",
      summary: "",
      reproductionSteps: "",
      expectedResult: "",
      actualResult: "",
      inputDevice: inputMode,
      screenshotOrClip: ""
    },
    session: {
      role: summary.role,
      map: summary.map,
      seed: summary.seed,
      outcome: summary.outcome,
      elapsed: formatTime(Math.max(0, summary.stats.startedAt - summary.timeRemaining)),
      timeRemaining: Math.ceil(summary.timeRemaining),
      teamResolve: Math.round(summary.teamResolve),
      anomalyStability: Math.round(summary.anomalyStability),
      lobbyId: lobbyState?.id ?? null,
      inviteCode: lobbyState?.inviteCode ?? null,
      networkMode: services.network.getState()?.mode ?? null,
      matchOptions: summary.matchOptions,
      arenaEvent: maps[summary.map]?.event?.name ?? null,
      replayUrl: makeReplayUrl(summary),
      recentMessages
    },
    stats: summary.stats,
    tuningNotes: notes,
    career: {
      matches: career.matches,
      investigatorWins: career.investigatorWins,
      anomalyWins: career.anomalyWins,
      totalRevives: career.totalRevives,
      totalRelaysCharged: career.totalRelaysCharged,
      totalEchoesDeployed: career.totalEchoesDeployed
    },
    focusAreas: [
      "Lobby and invite clarity",
      "Ability feedback and cooldown comprehension",
      "Map-specific arena event readability",
      "Flashlight readability and anomaly counterplay",
      "Anomaly echo decoy readability",
      "Controller prompts and keyboard prompts",
      "Round length and comeback chances"
    ]
  };
}

function makeTuningNotes(summary) {
  const notes = [];
  const stats = summary.stats;
  const elapsed = Math.max(0, stats.startedAt - summary.timeRemaining);
  const elapsedRatio = stats.startedAt > 0 ? elapsed / stats.startedAt : 0;

  if (summary.winner === "timeout" || summary.outcome.includes("draw") || summary.outcome.includes("Signal lost")) {
    notes.push(makeTuningNote(
      "Round Pacing",
      "The match reached the time limit. Watch whether players spent too long searching or lacked enough readable tracking cues."
    ));
  } else if (summary.outcome.includes("contained") && elapsedRatio < 0.5) {
    notes.push(makeTuningNote(
      "Anomaly Pressure",
      "Investigators contained the anomaly quickly. Consider stronger anomaly routes, more cover, or higher bot pressure on this map."
    ));
  } else if (summary.outcome.includes("collapsed") && elapsedRatio < 0.5) {
    notes.push(makeTuningNote(
      "Investigator Survivability",
      "The team collapsed early. Check whether battery access, revive windows, or bot pressure made recovery too difficult."
    ));
  }

  if (stats.abilityUses === 0) {
    notes.push(makeTuningNote(
      "Ability Discovery",
      "No role abilities were used. The ability button, cooldown meter, or How to Play copy may need more emphasis."
    ));
  }

  if (stats.arenaEvents === 0) {
    notes.push(makeTuningNote(
      "Arena Event Pace",
      "No arena event fired this round. Short rounds may need a faster first event to teach each map's identity."
    ));
  }

  if (stats.echoesDeployed > 0 && stats.echoesDispelled === 0) {
    notes.push(makeTuningNote(
      "Echo Counterplay",
      "Echoes were deployed but never dispelled. Confirm players notice they can burn decoys out with light."
    ));
  }

  if (!notes.length) {
    notes.push(makeTuningNote(
      "Playtest Read",
      "No obvious tuning flags. Focus the next test on subjective tension, map readability, and role preference."
    ));
  }

  return notes.slice(0, 4);
}

function makeTuningNote(label, body) {
  return { label, body };
}

function makeMatchSnapshot() {
  return {
    map: currentMapName,
    seed: formatSeed(),
    role: playerRole,
    matchOptions: getMatchOptions(),
    time: Math.ceil(state.time),
    anomalyStability: Math.round(state.anomaly.stability),
    teamResolve: Math.round(getTeamResolve()),
    activeEchoes: state.echoes.length,
    arenaEvent: maps[currentMapName]?.event?.name ?? null,
    arenaEventCooldown: Math.ceil(arenaEventCooldown),
    relays: state.relays.map((relay) => ({
      charge: Number(relay.charge.toFixed(2)),
      active: relay.active,
      corrupted: Number(relay.corrupted.toFixed(2))
    })),
    stats: { ...state.stats }
  };
}

function publishMatchEvent(type, payload = {}, reliable = true) {
  const body = {
    ...payload,
    map: currentMapName,
    role: playerRole,
    phase: state.phase,
    time: Math.ceil(state.time)
  };
  return reliable
    ? services.network.sendReliable(type, body)
    : services.network.sendUnreliable(type, body);
}

function publishPresence(stateName, outcome = null) {
  const lobby = lobbyState;
  const party = lobby
    ? { size: lobby.members.length, capacity: lobby.capacity ?? 5 }
    : { size: playerRole === "Investigator" ? 4 : 4, capacity: 5 };
  const details = {
    lobby: `In lobby: ${currentMapName}`,
    launching: `Launching ${currentMapName}`,
    playing: `${playerRole} on ${currentMapName}`,
    results: outcome ?? "Viewing results"
  }[stateName] ?? "In menus";

  services.presence.setActivity({
    state: stateName,
    details,
    map: currentMapName,
    role: playerRole,
    party,
    inviteCode: lobby?.inviteCode ?? null,
    timeRemaining: state.phase === "playing" ? Math.ceil(state.time) : null,
    outcome
  });
}

function isPartyHostActive() {
  return Boolean(partySession.socket?.connected && partySession.code);
}

async function createPartyRoom() {
  try {
    const ioClient = await loadSocketIoClient();
    if (!partySession.socket) {
      partySession.socket = ioClient();
      bindPartySocket();
    }
    if (!partySession.socket.connected) {
      await new Promise((resolve) => {
        partySession.socket.once("connect", resolve);
        setTimeout(resolve, 1200);
      });
    }
    partySession.socket.emit("host:create", {
      map: currentMapName,
      duration: matchDuration,
      origin: location.origin
    }, (response) => {
      if (!response?.ok) {
        setStatus("Party room could not be created");
        return;
      }
      partySession.code = response.room.code;
      partySession.joinUrl = response.room.joinUrl;
      partySession.joinUrls = response.room.joinUrls ?? [response.room.joinUrl];
      partySession.qrDataUrl = response.qrDataUrl;
      partySession.members = response.room.members ?? [];
      renderPartyPanel();
      setStatus(`Party room ${partySession.code} ready`);
    });
  } catch (error) {
    console.warn(error);
    setStatus("Start the party server with npm run serve:party");
  }
}

function loadSocketIoClient() {
  if (globalThis.io) {
    return Promise.resolve(globalThis.io);
  }
  if (socketLoaderPromise) {
    return socketLoaderPromise;
  }
  socketLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/socket.io/socket.io.js";
    script.async = true;
    script.onload = () => globalThis.io ? resolve(globalThis.io) : reject(new Error("Socket.IO client missing"));
    script.onerror = () => reject(new Error("Socket.IO client failed to load"));
    document.head.append(script);
  });
  return socketLoaderPromise;
}

function bindPartySocket() {
  partySession.socket.on("connect", () => {
    renderPartyPanel();
  });
  partySession.socket.on("disconnect", () => {
    renderPartyPanel();
    setStatus("Party relay disconnected");
  });
  partySession.socket.on("lobby:state", (room) => {
    partySession.code = room.code;
    partySession.joinUrl = room.joinUrl;
    partySession.joinUrls = room.joinUrls ?? [room.joinUrl];
    partySession.members = room.members ?? [];
    syncPartyLobbyState();
    renderPartyPanel();
  });
  partySession.socket.on("phone:input", (message) => {
    partySession.inputs.set(message.playerId, {
      ...message.input,
      role: message.role,
      skin: message.skin,
      receivedAt: performance.now()
    });
  });
}

function syncPartyLobbyState() {
  if (!partySession.code) return;
  lobbyState = {
    id: `party-${partySession.code}`,
    inviteCode: partySession.code,
    privacy: "party",
    host: "Laptop Host",
    region: "Railway",
    capacity: 5,
    map: currentMapName,
    state: state.phase === "playing" ? "playing" : "open",
    members: partySession.members.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      ready: member.ready,
      skin: member.skin
    }))
  };
  updateLobbyPanel(lobbyState);
}

function applyPartyAssignments() {
  if (!isPartyHostActive()) return;
  const investigators = partySession.members.filter((member) => member.connected !== false && member.role === "Investigator");
  const anomaly = partySession.members.find((member) => member.connected !== false && member.role === "Anomaly");
  const investigatorAgents = [state.player, ...state.investigators];
  investigatorAgents.forEach((agent, index) => {
    const member = investigators[index];
    agent.remotePlayerId = member?.id ?? null;
    if (member) {
      agent.name = member.name;
      agent.color = getPartySkinColor(member.skin, agent.color);
      agent.ai = false;
    } else if (agent !== state.player) {
      agent.ai = true;
    }
  });
  state.anomaly.remotePlayerId = anomaly?.id ?? null;
  state.anomaly.ai = !anomaly;
}

function getPartyInput(playerId) {
  if (!playerId) return null;
  const input = partySession.inputs.get(playerId);
  if (!input || performance.now() - input.receivedAt > 650) {
    return null;
  }
  return input;
}

function getPartySkinColor(skin, fallback) {
  return {
    brown: "#f4b35d",
    blond: "#7ae4d6",
    black: "#c7a8ff",
    red: "#e76f8a"
  }[skin] ?? fallback;
}

function renderPartyPanel() {
  if (!partyPanel) {
    partyPanel = document.createElement("aside");
    partyPanel.className = "party-panel";
    partyPanel.setAttribute("aria-label", "Phone controller room");
    stageEl.append(partyPanel);
  }
  if (!partySession.code) {
    partyPanel.hidden = true;
    return;
  }
  if (state.phase !== "lobby") {
    partyPanel.hidden = true;
    return;
  }
  const members = partySession.members.map((member) => `
    <li class="${member.connected === false ? "offline" : ""}">
      <strong>${member.name}</strong>
      <span>${member.role}${member.ready ? " ready" : ""}</span>
    </li>
  `).join("");
  partyPanel.hidden = false;
  partyPanel.innerHTML = `
    <div>
      <span class="label">Phone Controllers</span>
      <h2>${partySession.code}</h2>
    </div>
    ${partySession.qrDataUrl ? `<img src="${partySession.qrDataUrl}" alt="Join room QR code">` : ""}
    <p>${partySession.joinUrl ?? `${location.origin}/join?code=${partySession.code}`}</p>
    ${partySession.joinUrls?.length > 1 ? `<p class="party-alt-link">Fallback: ${partySession.joinUrls[partySession.joinUrls.length - 1]}</p>` : ""}
    <div class="party-actions">
      <button type="button" data-party-action="copy">Copy Link</button>
      <button type="button" data-party-action="fullscreen">Fullscreen</button>
    </div>
    <ul>${members || "<li><strong>Waiting</strong><span>Scan to join</span></li>"}</ul>
  `;
}

function handlePartyPanelClick(event) {
  const action = event.target.closest("[data-party-action]")?.dataset.partyAction;
  if (!action) {
    return;
  }
  if (action === "copy") {
    copyText(partySession.joinUrl ?? "", "Join link copied", "Join link ready to copy");
  }
  if (action === "fullscreen") {
    requestHostFullscreen();
  }
}

async function requestHostFullscreen() {
  const target = stageEl ?? document.documentElement;
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setStatus("Fullscreen closed");
    } else {
      await target.requestFullscreen?.();
      setStatus("Host display fullscreen");
    }
  } catch {
    setStatus("Fullscreen blocked by browser");
  }
}

function publishPartySnapshot() {
  if (!isPartyHostActive() || state.phase !== "playing") {
    return;
  }
  const now = performance.now();
  if (now - partySession.lastSnapshotAt < 100) {
    return;
  }
  partySession.lastSnapshotAt = now;
  partySession.socket.emit("host:state", {
    phase: state.phase,
    map: currentMapName,
    timeRemaining: state.time,
    anomalyHealth: Math.round(state.anomaly.stability),
    anomaly: {
      x: Math.round(state.anomaly.x),
      y: Math.round(state.anomaly.y),
      revealed: Number(state.anomaly.revealed.toFixed(2))
    },
    investigators: getInvestigators().map((agent) => ({
      id: agent.remotePlayerId ?? agent.name,
      name: agent.name,
      x: Math.round(agent.x),
      y: Math.round(agent.y),
      aim: Number(agent.aim.toFixed(3)),
      lightOn: Boolean(agent.lightOn),
      color: agent.color,
      resolve: Math.round(agent.resolve),
      battery: Math.round(agent.battery)
    })),
    walls: walls.map(snapshotWall)
  });
}

function snapshotWall(wall) {
  if (isSegmentWall(wall)) {
    return {
      shape: "segment",
      x: Math.round(wall.x),
      y: Math.round(wall.y),
      x2: Math.round(wall.x2),
      y2: Math.round(wall.y2),
      thickness: Math.round(wallThickness(wall)),
      ...(wall.visible === false ? { visible: false } : {})
    };
  }
  return {
    x: Math.round(wall.x),
    y: Math.round(wall.y),
    w: Math.round(wall.w),
    h: Math.round(wall.h),
    ...(wall.visible === false ? { visible: false } : {})
  };
}

function showResults(text, achievements = [], career = services.stats.getProfile()) {
  const elapsed = Math.max(0, state.stats.startedAt - state.time);
  const notes = makeTuningNotes(lastRoundSummary ?? makeRoundSummary(text));
  lastFeedbackEntry = services.feedback.savePacket(makeFeedbackPacket(career, notes));
  resultTitle.textContent = text;
  const primaryStat = text.includes("contained")
    ? ["Anomaly Health", `${Math.round(state.anomaly.stability)}%`]
    : ["Investigators Active", `${getInvestigators().filter((agent) => agent.resolve > 0).length}/${getInvestigators().length}`];
  resultStats.innerHTML = `
    <dt>Time</dt><dd>${formatTime(elapsed)}</dd>
    <dt>${primaryStat[0]}</dt><dd>${primaryStat[1]}</dd>
    <dt>Arena Events</dt><dd>${state.stats.arenaEvents}</dd>
  `;
  achievementList.innerHTML = renderAchievements(achievements);
  achievementList.hidden = achievements.length === 0;
  tuningNotes.innerHTML = renderTuningNotes(notes);
  feedbackText.value = JSON.stringify(lastFeedbackEntry.packet, null, 2);
  feedbackText.hidden = true;
  updateReportsPanel();
  resultsPanel.hidden = false;
}

function renderTuningNotes(notes) {
  const items = notes.map((note) => `
    <li>
      <strong>${note.label}</strong>
      <span>${note.body}</span>
    </li>
  `).join("");
  return `
    <span class="label">Tuning Notes</span>
    <ul>${items}</ul>
  `;
}

function renderAchievements(achievements) {
  if (!achievements.length) {
    return "";
  }
  const items = achievements.map((achievement) => `
    <li>
      <span>Achievement</span>
      <strong>${achievement.name}</strong>
      <em>${achievement.description}</em>
    </li>
  `).join("");
  return `<ul>${items}</ul>`;
}

function getQuickStartCopy() {
  if (playerRole === "Anomaly") {
    return {
      role: "Anomaly",
      goal: "Collapse the team before they contain you.",
      steps: [
        "Match investigator speed, but stay out of steady light.",
        "Touch investigators to instantly collapse them.",
        "Use Blackout Wave to cut visibility when the team groups up."
      ]
    };
  }
  return {
    role: "Investigator",
    goal: "Find the anomaly and keep light pressure on it.",
    steps: [
      "Move with WASD and aim with the mouse.",
      "Hold the mouse button to shine your light.",
      "Watch warning icons, revive teammates, and grab Overcharge when you are the last one standing."
    ]
  };
}

function updateLobbyPanel(lobby) {
  const members = lobby?.members ?? [
    { id: "player", name: "Player", role: playerRole, ready, color: playerSuit.color },
    { id: "bot-1", name: "Vale", role: "Investigator", ready: true },
    { id: "bot-2", name: "Mira", role: "Investigator", ready: true },
    { id: "bot-3", name: "Sable", role: "Investigator", ready: true }
  ];
  const roster = members.map((member) => {
    const color = member.color ?? (member.role === "Anomaly" ? "#e76f8a" : "#7ae4d6");
    const stateText = member.ready ? "Ready" : "Open";
    return `
      <li>
        <span class="dot" style="color: ${color}; background: ${color}"></span>
        <span>${member.name}</span>
        <span class="role">${member.role} · ${stateText}</span>
      </li>
    `;
  }).join("");
  const capacity = lobby?.capacity ?? 5;
  const filled = members.length;
  const readyCount = members.filter((member) => member.ready).length;
  const inviteCode = lobby?.inviteCode ?? "LOCAL";
  const privacy = lobby?.privacy ?? "solo";
  const region = lobby?.region ?? "Local";
  const career = services.stats.getProfile();
  const catalog = services.cosmetics.getCatalog();
  const unlockedSuits = catalog.filter((suit) => suit.unlocked).length;
  const mapEvent = maps[lobby?.map ?? currentMapName]?.event ?? maps["Observatory Annex"].event;
  const quickStart = getQuickStartCopy();
  lobbyPanel.innerHTML = `
    <span class="label">${lobby?.map ?? currentMapName}</span>
    <h2>${lobby ? `${privacy} lobby ${lobby.id}` : "Local Lobby"}</h2>
    <div class="lobby-meta">
      <span>${filled}/${capacity} slots</span>
      <span>${readyCount}/${filled} ready</span>
      <span>${region}</span>
    </div>
    <div class="coach-card">
      <span>Quick Start</span>
      <strong>${quickStart.role}</strong>
      <small>${quickStart.goal}</small>
      <ol>
        ${quickStart.steps.map((step) => `<li>${step}</li>`).join("")}
      </ol>
    </div>
    <div class="invite-card">
      <span>Invite Code</span>
      <strong>${inviteCode}</strong>
    </div>
    <div class="career-card">
      <span>Career</span>
      <strong>${career.matches} matches</strong>
      <small>${career.investigatorWins + career.anomalyWins} wins · ${services.achievements.listUnlocked().length} achievements</small>
    </div>
    <div class="career-card">
      <span>Loadout</span>
      <strong>${playerSuit.name}</strong>
      <small>${unlockedSuits}/${catalog.length} suits unlocked</small>
    </div>
    <div class="career-card">
      <span>Match Options</span>
      <strong>${formatTime(matchDuration)}</strong>
      <small>${getBotTuning().label} bot pressure · seed ${formatSeed()}</small>
    </div>
    <div class="career-card event-card">
      <span>Arena Event</span>
      <strong style="color: ${mapEvent.color}">${mapEvent.name}</strong>
      <small>${mapEvent.detail}</small>
    </div>
    <ul class="roster">${roster}</ul>
  `;
}

function syncSuitButton() {
  suitBtn.textContent = `Suit: ${playerSuit.name}`;
  suitBtn.style.borderColor = playerSuit.color;
}

function equipSuit(loadout) {
  playerSuit = loadout.suit;
  syncSuitButton();
  if (state.player) {
    state.player.color = playerSuit.color;
  }
  updateLobbyPanel(lobbyState);
}

function openLobbyBrowser() {
  const listings = services.lobbies.search();
  browserList.innerHTML = listings.map((listing) => `
    <article class="browser-row">
      <div>
        <h3>${listing.host} <span>${listing.inviteCode}</span></h3>
        <p>${listing.map} · ${listing.region} · ${listing.ping} ms · ${listing.players}/${listing.capacity} · ${listing.privacy}</p>
      </div>
      <button type="button" data-join-lobby="${listing.id}">Join</button>
    </article>
  `).join("");
  browserPanel.hidden = false;
  setStatus(`${listings.length} lobbies discovered`);
}

function closeLobbyBrowser() {
  browserPanel.hidden = true;
}

function toggleNetworkPanel() {
  networkPanel.hidden = !networkPanel.hidden;
  updateNetworkPanel();
}

function closeNetworkPanel() {
  networkPanel.hidden = true;
}

function toggleReportsPanel() {
  reportsPanel.hidden = !reportsPanel.hidden;
  updateReportsPanel();
}

function closeReportsPanel() {
  reportsPanel.hidden = true;
  closeReportImportPanel();
}

function closeReportImportPanel() {
  reportImportPanel.hidden = true;
}

function updateNetworkPanel() {
  const session = services.network.getState();
  const messages = services.network.getMessages();
  networkSummary.innerHTML = `
    <span>${session?.connected ? "Connected" : "Offline"}</span>
    <span>${session?.mode ?? "none"}</span>
    <span>${messages.length} messages</span>
  `;
  networkList.innerHTML = recentNetworkEvents.map((event) => `
    <li>
      <strong>${event.type}</strong>
      <span>${event.reliable ? "reliable" : "unreliable"} · ${event.phase ?? "service"} · ${event.time ?? "--"}s</span>
    </li>
  `).join("");
}

function updateReportsPanel() {
  const reports = services.feedback.listReports();
  const digest = makeReportsDigest(reports);
  reportsSummary.innerHTML = `
    <span>${digest.count} saved</span>
    <span>${digest.replayLinks} replay links</span>
    <span>${digest.outcomes.contained}/${digest.outcomes.collapsed}/${digest.outcomes.draw} W/A/D</span>
    <span>${digest.lastMap ?? "No rounds"}</span>
    <span>${digest.lastSeed ?? "--"}</span>
  `;
  reportsList.innerHTML = reports.length
    ? reports.map((report) => renderReportRow(report)).join("")
    : `<article class="browser-row"><div><h3>No reports yet</h3><p>Finish a round to archive a feedback packet and replay link.</p></div></article>`;
}

function renderReportRow(report) {
  const session = report.packet?.session ?? {};
  const saved = new Date(report.savedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const replay = session.replayUrl ? "Replay link ready" : "Legacy packet";
  return `
    <article class="browser-row report-row">
      <div>
        <h3>${session.seed ?? "--"} <span>${saved}</span></h3>
        <p>${report.map ?? "Unknown map"} · ${report.role ?? "Unknown role"} · ${session.matchOptions?.durationLabel ?? "--:--"} · ${session.matchOptions?.botPressureLabel ?? "Standard"} · ${replay}</p>
        <p>${report.outcome ?? "No outcome"}</p>
      </div>
      <div class="report-actions">
        <button type="button" data-load-report="${report.id}">Load</button>
        <button type="button" data-copy-report-link="${report.id}">Copy</button>
      </div>
    </article>
  `;
}

function findReport(id) {
  return services.feedback.listReports().find((report) => report.id === id) ?? null;
}

function loadReportReplay(report) {
  const session = report?.packet?.session;
  if (!session) {
    setStatus("Report has no replay data");
    return;
  }
  if (maps[session.map]) {
    currentMapName = session.map;
    mapSelect.value = session.map;
  }
  if (session.role === "Investigator" || session.role === "Anomaly") {
    playerRole = session.role;
    syncRoleUi();
  }
  setMatchDuration(session.matchOptions?.duration);
  setBotPressure(session.matchOptions?.botPressure);
  replaySeed = parseSeed(session.seed);
  seedInput.value = replaySeed ? formatSeed(replaySeed) : "";
  persistSettings();
  resetMatch();
  closeReportsPanel();
  setStatus(`Loaded report ${report.id}`);
}

async function copyReportReplayLink(report) {
  const replayUrl = report?.packet?.session?.replayUrl;
  if (!replayUrl) {
    setStatus("Report has no replay link");
    return;
  }
  await copyText(replayUrl, "Replay link copied", "Replay link ready to copy");
}

function incrementDigestBucket(bucket, key) {
  const normalized = key || "Unknown";
  bucket[normalized] = (bucket[normalized] ?? 0) + 1;
}

function makeReportsDigest(reports = services.feedback.listReports()) {
  const digest = {
    count: reports.length,
    outcomes: {
      contained: 0,
      collapsed: 0,
      draw: 0,
      unknown: 0
    },
    maps: {},
    roles: {},
    replayLinks: 0,
    averageDuration: 0,
    lastSeed: null,
    lastMap: null
  };
  let totalDuration = 0;
  let durationSamples = 0;

  reports.forEach((report) => {
    const session = report.packet?.session ?? {};
    const outcome = String(report.outcome ?? session.outcome ?? "");
    if (outcome.includes("contained")) {
      digest.outcomes.contained += 1;
    } else if (outcome.includes("collapsed")) {
      digest.outcomes.collapsed += 1;
    } else if (outcome.includes("Signal lost") || outcome.includes("draw")) {
      digest.outcomes.draw += 1;
    } else {
      digest.outcomes.unknown += 1;
    }

    incrementDigestBucket(digest.maps, report.map ?? session.map);
    incrementDigestBucket(digest.roles, report.role ?? session.role);
    if (session.replayUrl) {
      digest.replayLinks += 1;
    }
    const duration = Number(session.matchOptions?.duration);
    if (Number.isFinite(duration) && duration > 0) {
      totalDuration += duration;
      durationSamples += 1;
    }
  });

  digest.averageDuration = durationSamples ? Math.round(totalDuration / durationSamples) : 0;
  digest.lastSeed = reports[0]?.packet?.session?.seed ?? null;
  digest.lastMap = reports[0]?.map ?? reports[0]?.packet?.session?.map ?? null;
  return digest;
}

function makeReportsArchive() {
  const reports = services.feedback.listReports();
  return {
    app: "Afterlight Protocol Prototype",
    version: "0.1.0",
    exportedAt: new Date().toISOString(),
    count: reports.length,
    digest: makeReportsDigest(reports),
    reports
  };
}

async function exportReportsArchive() {
  const archive = makeReportsArchive();
  await copyText(
    JSON.stringify(archive, null, 2),
    `Exported ${archive.count} reports`,
    "Report archive ready to copy"
  );
}

function parseReportsArchive(value) {
  const parsed = JSON.parse(value);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (Array.isArray(parsed?.reports)) {
    return parsed.reports;
  }
  throw new Error("Expected an exported report archive");
}

function openReportImportPanel() {
  reportImportPanel.hidden = false;
  reportImportText.focus();
}

function importReportsArchive() {
  let entries;
  try {
    entries = parseReportsArchive(reportImportText.value);
  } catch {
    setStatus("Paste a valid report archive JSON");
    return;
  }

  const result = services.feedback.importReports(entries);
  reportImportText.value = "";
  closeReportImportPanel();
  updateReportsPanel();
  setStatus(`Imported ${result.imported} reports, skipped ${result.skipped}`);
}

function clearReportsArchive() {
  services.feedback.clearReports();
  updateReportsPanel();
  setStatus("Saved reports cleared");
}

function formatTime(value) {
  const minutes = Math.floor(value / 60).toString().padStart(2, "0");
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function createMatchSeed() {
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
}

function parseSeed(value) {
  const normalized = String(value ?? "").trim().replace(/^#/, "").replace(/^0x/i, "").replace(/[^a-f0-9]/gi, "");
  if (!normalized) {
    return null;
  }
  return (Number.parseInt(normalized.slice(0, 8), 16) >>> 0) || null;
}

function setMatchSeed(seed) {
  matchSeed = (seed >>> 0) || 1;
  matchRandom = makeSeededRng(matchSeed);
}

function makeSeededRng(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomRange(min, max) {
  return min + matchRandom() * (max - min);
}

function randomAngle() {
  return randomRange(0, Math.PI * 2);
}

function visualRandom() {
  return Math.random();
}

function visualChance(chance) {
  return visualRandom() < chance;
}

function formatSeed(seed = matchSeed) {
  return seed.toString(16).toUpperCase().padStart(8, "0");
}

function applyReplaySeed() {
  const parsed = parseSeed(seedInput.value);
  replaySeed = parsed;
  resetMatch();
  if (parsed) {
    setStatus(`Replay seed locked: ${formatSeed(parsed)}`);
  } else {
    setStatus(`Replay seed cleared, new seed ${formatSeed()}`);
  }
}

function makeReplayUrl(summary = lastRoundSummary ?? makeRoundSummary(state.stats.outcome)) {
  let url;
  try {
    url = new URL(globalThis.location?.href ?? "http://127.0.0.1/afterlight-protocol");
  } catch {
    url = new URL("http://127.0.0.1/afterlight-protocol");
  }
  url.hash = "";
  url.searchParams.set("map", summary.map);
  url.searchParams.set("role", summary.role);
  url.searchParams.set("duration", String(summary.matchOptions.duration));
  url.searchParams.set("bots", summary.matchOptions.botPressure);
  url.searchParams.set("seed", summary.seed);
  return url.href;
}

function applyReplayParamsFromUrl() {
  let params;
  try {
    params = new URL(globalThis.location?.href ?? "").searchParams;
  } catch {
    return;
  }

  const map = params.get("map");
  if (maps[map]) {
    currentMapName = map;
    mapSelect.value = map;
  }

  const role = params.get("role");
  if (role === "Investigator" || role === "Anomaly") {
    playerRole = role;
    syncRoleUi();
  }

  if (params.has("duration")) {
    setMatchDuration(params.get("duration"));
  }
  if (params.has("bots")) {
    setBotPressure(params.get("bots"));
  }

  const seed = parseSeed(params.get("seed"));
  if (seed) {
    replaySeed = seed;
    seedInput.value = formatSeed(seed);
  }
}

async function copyText(text, successStatus, fallbackStatus) {
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard API unavailable");
    }
    await navigator.clipboard.writeText(text);
    setStatus(successStatus);
  } catch {
    feedbackText.hidden = false;
    feedbackText.value = text;
    feedbackText.select?.();
    setStatus(fallbackStatus);
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  syncSoundButton();
  persistSettings();
  if (soundEnabled) {
    audioUnlockPending = true;
    if (ensureAudio()) {
      setStatus(`Sound on (${audioContext?.state ?? "pending"})`);
      playSound("audio_test");
      if (state.phase === "playing") {
        startMapMusic();
      }
    }
  } else {
    stopMapMusic();
    setStatus("Sound off");
  }
}

function syncSoundButton() {
  soundBtn.textContent = soundEnabled ? "Sound On" : "Sound Off";
  soundBtn.classList.toggle("is-active", soundEnabled);
  syncVolumeControls();
}

function syncVolumeControls() {
  if (masterVolumeInput) masterVolumeInput.value = Math.round(audioVolumes.master * 100);
  if (musicVolumeInput) musicVolumeInput.value = Math.round(audioVolumes.music * 100);
  if (sfxVolumeInput) sfxVolumeInput.value = Math.round(audioVolumes.sfx * 100);
  applyAudioVolumes();
}

function setAudioVolume(bus, value) {
  audioVolumes[bus] = clamp(Number(value) / 100, 0, 1);
  applyAudioVolumes();
  persistSettings();
}

function applyAudioVolumes() {
  if (!audioContext) {
    return;
  }
  const now = audioContext.currentTime;
  audioMaster?.gain.setTargetAtTime(audioVolumes.master, now, 0.025);
  audioMusic?.gain.setTargetAtTime(audioVolumes.music, now, 0.025);
  audioSfx?.gain.setTargetAtTime(audioVolumes.sfx, now, 0.025);
}

function syncAccessibilityButtons() {
  motionBtn.textContent = reduceMotion ? "Motion Reduced" : "Motion Full";
  motionBtn.classList.toggle("is-active", reduceMotion);
  contrastBtn.textContent = highContrast ? "Contrast High" : "Contrast Std";
  contrastBtn.classList.toggle("is-active", highContrast);
  document.body?.classList?.toggle("high-contrast", highContrast);
  canvas.classList.toggle("high-contrast", highContrast);
}

function syncRoleUi() {
  const abilityName = playerRole === "Investigator" ? "Pulse Scan" : "Blackout Wave";
  roleBtn.textContent = `Role: ${playerRole}`;
  abilityBtn.textContent = abilityName;
  abilityRef.textContent = playerRole === "Investigator" ? "E Pulse Scan" : "E Blackout";
  interactRef.hidden = !relaysEnabled;
  interactRef.textContent = relaysEnabled ? "Near Relay" : "";
}

function loadAnomalyAtlas() {
  if (typeof Image !== "function") {
    return;
  }
  const image = new Image();
  image.onload = () => {
    anomalyAtlas.image = image;
    anomalyAtlas.ready = true;
  };
  image.onerror = () => {
    anomalyAtlas.image = null;
    anomalyAtlas.ready = false;
  };
  image.src = anomalyAtlas.src;
}

function loadInvestigatorAtlases() {
  if (typeof Image !== "function") {
    return;
  }
  for (const atlas of Object.values(investigatorAtlases)) {
    const image = new Image();
    image.onload = () => {
      atlas.image = image;
      atlas.ready = true;
      characterSpriteCache.clear();
    };
    image.onerror = () => {
      atlas.image = null;
      atlas.ready = false;
    };
    image.src = atlas.src;
  }
}

function syncScreen() {
  if (stageEl?.dataset) {
    stageEl.dataset.screen = currentScreen;
  }
  mainMenuPanel.hidden = currentScreen !== "menu";
  if (currentScreen === "menu") {
    closeLobbyBrowser();
    closeNetworkPanel();
    closeReportsPanel();
    settingsPanel.hidden = true;
  }
}

function showMainMenu() {
  currentScreen = "menu";
  returnToMenuAfterHelp = false;
  syncScreen();
  setStatus("Main menu");
}

function showLobbyScreen() {
  currentScreen = "lobby";
  syncScreen();
  updateLobbyPanel(lobbyState);
  setStatus(`${currentMapName} ready`);
}

function openSettingsPanel() {
  settingsPanel.hidden = false;
}

function closeSettingsPanel() {
  settingsPanel.hidden = true;
}

function applySavedSettings() {
  const settings = services.storage.loadSettings({
    map: currentMapName,
    role: playerRole,
    soundEnabled,
    inputMode,
    matchDuration,
    botPressure,
    reduceMotion,
    highContrast,
    audioVolumes
  });
  if (maps[settings.map]) {
    currentMapName = settings.map;
    mapSelect.value = currentMapName;
  }
  if (settings.role === "Investigator" || settings.role === "Anomaly") {
    playerRole = settings.role;
    syncRoleUi();
  }
  soundEnabled = Boolean(settings.soundEnabled);
  audioUnlockPending = soundEnabled;
  if (settings.inputMode === "keyboard" || settings.inputMode === "gamepad") {
    inputMode = settings.inputMode;
  }
  setMatchDuration(settings.matchDuration);
  setBotPressure(settings.botPressure);
  reduceMotion = Boolean(settings.reduceMotion);
  highContrast = Boolean(settings.highContrast);
  Object.assign(audioVolumes, {
    master: clamp(Number(settings.audioVolumes?.master ?? audioVolumes.master), 0, 1),
    music: clamp(Number(settings.audioVolumes?.music ?? audioVolumes.music), 0, 1),
    sfx: clamp(Number(settings.audioVolumes?.sfx ?? audioVolumes.sfx), 0, 1)
  });
  syncSoundButton();
  syncAccessibilityButtons();
}

function persistSettings() {
  services.storage.saveSettings({
    map: currentMapName,
    role: playerRole,
    soundEnabled,
    inputMode,
    matchDuration,
    botPressure,
    reduceMotion,
    highContrast,
    audioVolumes: { ...audioVolumes }
  });
}

function ensureAudio() {
  if (!audioContext) {
    const AudioCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioCtor) {
      setStatus("Audio is not supported in this browser");
      soundEnabled = false;
      syncSoundButton();
      return false;
    }
    audioContext = new AudioCtor();
    audioMaster = audioContext.createGain();
    audioMusic = audioContext.createGain();
    audioSfx = audioContext.createGain();
    audioMaster.gain.setValueAtTime(audioVolumes.master, audioContext.currentTime);
    audioMusic.gain.setValueAtTime(audioVolumes.music, audioContext.currentTime);
    audioSfx.gain.setValueAtTime(audioVolumes.sfx, audioContext.currentTime);
    audioMusic.connect(audioMaster);
    audioSfx.connect(audioMaster);
    audioMaster.connect(audioContext.destination);
    loadAudioManifest();
    loadGlobalSoundEffects();
  }
  if (audioContext.state === "suspended") {
    const resumeResult = audioContext.resume?.();
    if (resumeResult?.then) {
      resumeResult
        .then(() => {
          if (soundEnabled) {
            setStatus(`Sound on (${audioContext.state})`);
          }
        })
        .catch(() => {
          setStatus("Audio unlock blocked; click Sound On again");
        });
    }
  }
  return true;
}

function playSound(type) {
  if (!soundEnabled) {
    return;
  }
  if (!ensureAudio()) {
    return;
  }
  if (playMapSoundEffect(type)) {
    return;
  }
  if (playManifestSound(type)) {
    return;
  }
  const now = audioContext.currentTime;
  if (type === "flashlight_on") {
    playClickSound(now, 860, 1280, 0.04, 0.075);
    return;
  }
  if (type === "audio_test") {
    playTone({ frequency: 440, endFrequency: 440, duration: 0.12, wave: "sine", volume: 0.14, startTime: now });
    playTone({ frequency: 660, endFrequency: 660, duration: 0.12, wave: "sine", volume: 0.14, startTime: now + 0.16 });
    playTone({ frequency: 880, endFrequency: 880, duration: 0.16, wave: "triangle", volume: 0.16, startTime: now + 0.32 });
    return;
  }
  if (type === "flashlight_off") {
    playClickSound(now, 560, 230, 0.036, 0.055);
    return;
  }
  if (type === "ghost_grab") {
    playTone({ frequency: 112, endFrequency: 58, duration: 0.2, wave: "sawtooth", volume: 0.09, startTime: now });
    playTone({ frequency: 620, endFrequency: 280, duration: 0.14, wave: "square", volume: 0.042, startTime: now + 0.025 });
    playNoise({ startTime: now, duration: 0.18, volume: 0.075, highpass: 260, lowpass: 1800 });
    return;
  }
  if (type === "ghost_shock") {
    playTone({ frequency: 1240, endFrequency: 460, duration: 0.24, wave: "square", volume: 0.085, startTime: now });
    playTone({ frequency: 740, endFrequency: 1480, duration: 0.12, wave: "sawtooth", volume: 0.044, startTime: now + 0.03 });
    playNoise({ startTime: now, duration: 0.22, volume: 0.07, highpass: 820, lowpass: 4200 });
    return;
  }
  if (type === "ghost_escape") {
    playTone({ frequency: 260, endFrequency: 92, duration: 0.44, wave: "triangle", volume: 0.065, startTime: now });
    playNoise({ startTime: now, duration: 0.5, volume: 0.078, highpass: 90, lowpass: 1200, fadeIn: 0.04 });
    return;
  }
  if (type === "ghost_escape_loop") {
    playTone({ frequency: 180, endFrequency: 96, duration: 0.34, wave: "triangle", volume: 0.042, startTime: now });
    playNoise({ startTime: now, duration: 0.36, volume: 0.045, highpass: 120, lowpass: 900, fadeIn: 0.035 });
    return;
  }
  if (type === "ghost_damage") {
    playTone({ frequency: 920 + visualRandom() * 120, endFrequency: 540, duration: 0.105, wave: "sawtooth", volume: 0.036, startTime: now });
    playNoise({ startTime: now, duration: 0.11, volume: 0.03, highpass: 900, lowpass: 3600 });
    return;
  }
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const settings = {
    start: [220, 0.13, "sine", 0.08],
    ability: [620, 0.18, "triangle", 0.08],
    blackout: [96, 0.28, "sawtooth", 0.08],
    dash: [330, 0.06, "triangle", 0.045],
    relay: [520, 0.32, "sine", 0.08],
    signal: [260, 0.055, "sine", 0.04],
    lightning: [1180, 0.22, "sawtooth", 0.07],
    revive: [680, 0.26, "triangle", 0.08],
    downed: [190, 0.22, "sawtooth", 0.07],
    battery_spawn: [980, 0.16, "triangle", 0.06],
    pickup: [760, 0.1, "sine", 0.075],
    hit: [440, 0.045, "square", 0.05],
    win: [520, 0.34, "triangle", 0.09],
    lose: [132, 0.38, "sawtooth", 0.085]
  }[type] ?? [260, 0.1, "sine", 0.02];
  const [frequency, duration, wave, volume] = settings;
  osc.type = wave;
  osc.frequency.setValueAtTime(frequency, now);
  if (type === "win") {
    osc.frequency.exponentialRampToValueAtTime(880, now + duration);
  }
  if (type === "lose" || type === "blackout") {
    osc.frequency.exponentialRampToValueAtTime(Math.max(42, frequency * 0.45), now + duration);
  }
  if (type === "lightning") {
    osc.frequency.exponentialRampToValueAtTime(260, now + duration * 0.72);
  }
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain).connect(getAudioDestination("sfx"));
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playMapSoundCue(type) {
  if (!soundEnabled || !ensureAudio()) {
    return false;
  }
  return playMapSoundEffect(type);
}

function playMapSoundEffect(type) {
  if (!globalSoundEffects && !globalSoundEffectsPromise) {
    loadGlobalSoundEffects();
  }
  const entry = globalSoundEffects?.[type] ?? maps[currentMapName]?.soundEffects?.[type];
  if (!entry?.src || missingAudioAssets.has(entry.src)) {
    return false;
  }
  const buffer = audioBuffers.get(entry.src);
  if (!buffer) {
    getDecodedAudioBuffer(entry.src)
      .then((decoded) => {
        if (soundEnabled) {
          playAudioBufferEntry(decoded, entry);
        }
      })
      .catch(() => {});
    return true;
  }
  playAudioBufferEntry(buffer, entry);
  return true;
}

function playClickSound(now, startFrequency, endFrequency, duration, volume) {
  playTone({ frequency: startFrequency, endFrequency, duration, wave: "square", volume, startTime: now });
  playNoise({ startTime: now, duration: duration * 0.72, volume: volume * 0.45, highpass: 1800, lowpass: 5200 });
}

function loadAudioManifest() {
  if (audioManifest || audioManifestPromise) {
    return audioManifestPromise;
  }
  audioManifestPromise = fetch("assets/audio/audio-manifest.json")
    .then((response) => response.ok ? response.json() : null)
    .then((manifest) => {
      audioManifest = manifest;
      return manifest;
    })
    .catch(() => {
      audioManifest = null;
      return null;
    });
  return audioManifestPromise;
}

function loadGlobalSoundEffects() {
  if (globalSoundEffects || globalSoundEffectsPromise) {
    return globalSoundEffectsPromise;
  }
  globalSoundEffectsPromise = fetch("/api/sound-effects/config")
    .then((response) => response.ok ? response.json() : null)
    .then((payload) => {
      globalSoundEffects = payload?.soundEffects && typeof payload.soundEffects === "object" ? payload.soundEffects : {};
      return globalSoundEffects;
    })
    .catch(() => {
      globalSoundEffects = {};
      return globalSoundEffects;
    });
  return globalSoundEffectsPromise;
}

function playManifestSound(type) {
  const entry = audioManifest?.sfx?.[type];
  if (!entry?.src || missingAudioAssets.has(entry.src)) {
    if (!audioManifest) {
      loadAudioManifest();
    }
    return false;
  }
  const buffer = audioBuffers.get(entry.src);
  if (!buffer) {
    loadAudioBuffer(entry.src);
    return false;
  }
  playAudioBufferEntry(buffer, entry);
  return true;
}

function playAudioBufferEntry(buffer, entry) {
  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  source.buffer = buffer;
  source.loop = Boolean(entry.loop);
  gain.gain.setValueAtTime(Number(entry.volume ?? 1), audioContext.currentTime);
  source.connect(gain).connect(getAudioDestination(entry.bus ?? "sfx"));
  source.start();
  if (!entry.loop) {
    source.stop(audioContext.currentTime + buffer.duration + 0.02);
  }
}

function startMapMusic() {
  if (!soundEnabled || !ensureAudio()) {
    return;
  }
  const track = maps[currentMapName]?.music;
  const src = track?.src;
  if (!src) {
    stopMapMusic();
    return;
  }
  if (currentMusicSource && currentMusicTrackSrc === src) {
    currentMusicGain?.gain.setTargetAtTime(clamp(Number(track.volume ?? 1), 0, 1), audioContext.currentTime, 0.025);
    return;
  }
  stopMapMusic();
  requestedMusicTrackSrc = src;
  getDecodedAudioBuffer(src)
    .then((buffer) => {
      if (!soundEnabled || state.phase !== "playing" || requestedMusicTrackSrc !== src) {
        return;
      }
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = buffer;
      source.loop = track.loop !== false;
      gain.gain.setValueAtTime(clamp(Number(track.volume ?? 1), 0, 1), audioContext.currentTime);
      source.connect(gain).connect(getAudioDestination("music"));
      source.start();
      currentMusicSource = source;
      currentMusicGain = gain;
      currentMusicTrackSrc = src;
    })
    .catch(() => {
      if (requestedMusicTrackSrc === src) {
        setStatus("Map music could not be loaded");
      }
    });
}

function stopMapMusic() {
  requestedMusicTrackSrc = "";
  if (currentMusicSource) {
    try {
      currentMusicSource.stop();
    } catch {
      // Source may already be stopped.
    }
    currentMusicSource.disconnect?.();
  }
  currentMusicGain?.disconnect?.();
  currentMusicSource = null;
  currentMusicGain = null;
  currentMusicTrackSrc = "";
}

function getDecodedAudioBuffer(src) {
  const cached = audioBuffers.get(src);
  if (cached) {
    return Promise.resolve(cached);
  }
  if (missingAudioAssets.has(src)) {
    return Promise.reject(new Error(`missing audio ${src}`));
  }
  const pending = audioBufferPromises.get(src);
  if (pending) {
    return pending;
  }
  audioBuffers.set(src, null);
  const request = fetch(src)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`missing audio ${src}`);
      }
      return response.arrayBuffer();
    })
    .then((data) => audioContext.decodeAudioData(data))
    .then((buffer) => {
      audioBuffers.set(src, buffer);
      audioBufferPromises.delete(src);
      return buffer;
    })
    .catch((error) => {
      audioBuffers.delete(src);
      audioBufferPromises.delete(src);
      missingAudioAssets.add(src);
      throw error;
    });
  audioBufferPromises.set(src, request);
  return request;
}

function loadAudioBuffer(src) {
  if (audioBuffers.has(src) || missingAudioAssets.has(src)) {
    return;
  }
  audioBuffers.set(src, null);
  fetch(src)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`missing audio ${src}`);
      }
      return response.arrayBuffer();
    })
    .then((data) => audioContext.decodeAudioData(data))
    .then((buffer) => {
      audioBuffers.set(src, buffer);
    })
    .catch(() => {
      audioBuffers.delete(src);
      missingAudioAssets.add(src);
    });
}

function playTone({ frequency, endFrequency = frequency, duration, wave = "sine", volume = 0.02, startTime = audioContext.currentTime }) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(Math.max(1, frequency), startTime);
  if (endFrequency !== frequency) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), startTime + duration);
  }
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + Math.min(0.018, duration * 0.28));
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain).connect(getAudioDestination("sfx"));
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function playNoise({ startTime = audioContext.currentTime, duration = 0.12, volume = 0.02, highpass = 120, lowpass = 5000, fadeIn = 0.006 }) {
  const sampleRate = audioContext.sampleRate;
  const frameCount = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i += 1) {
    data[i] = visualRandom() * 2 - 1;
  }
  const source = audioContext.createBufferSource();
  const high = audioContext.createBiquadFilter();
  const low = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  high.type = "highpass";
  high.frequency.setValueAtTime(highpass, startTime);
  low.type = "lowpass";
  low.frequency.setValueAtTime(lowpass, startTime);
  source.buffer = buffer;
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + Math.max(0.004, fadeIn));
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  source.connect(high).connect(low).connect(gain).connect(getAudioDestination("sfx"));
  source.start(startTime);
  source.stop(startTime + duration + 0.02);
}

function getAudioDestination(bus = "sfx") {
  if (bus === "music") {
    return audioMusic ?? audioMaster ?? audioContext.destination;
  }
  return audioSfx ?? audioMaster ?? audioContext.destination;
}

function unlockAudioFromGesture() {
  if (!soundEnabled || !audioUnlockPending || !ensureAudio()) {
    return;
  }
  audioUnlockPending = false;
  playSound("audio_test");
  if (state.phase === "playing") {
    startMapMusic();
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

services.lobbies.subscribe((lobby) => {
  lobbyState = lobby;
  if (lobby?.map && maps[lobby.map] && lobby.map !== currentMapName) {
    currentMapName = lobby.map;
    mapSelect.value = lobby.map;
    persistSettings();
    resetMatch();
  }
  updateLobbyPanel(lobby);
  if (state.phase === "lobby") {
    publishPresence("lobby");
  }
  if (!lobby) {
    return;
  }
  const player = lobby.members.find((member) => member.id === "player");
  setStatus(`${lobby.map} ${lobby.privacy} lobby ${lobby.id}: ${player.role}`);
});

services.network.subscribe((message) => {
  recentNetworkEvents.unshift({
    type: message.type,
    reliable: message.reliable,
    phase: message.payload?.phase,
    time: message.payload?.time
  });
  recentNetworkEvents.splice(8);
  updateNetworkPanel();
});

startBtn.addEventListener("click", () => {
  showLobbyScreen();
});

menuHelpBtn.addEventListener("click", () => {
  returnToMenuAfterHelp = true;
  showLobbyScreen();
  document.querySelector(".help-details").open = true;
});

closeHelpBtn.addEventListener("click", () => {
  document.querySelector(".help-details").open = false;
  if (returnToMenuAfterHelp) {
    showMainMenu();
  }
});

settingsBtn.addEventListener("click", () => {
  openSettingsPanel();
});

closeSettingsBtn.addEventListener("click", () => {
  closeSettingsPanel();
});

hostBtn.addEventListener("click", async () => {
  closeLobbyBrowser();
  services.lobbies.create({ role: playerRole, map: currentMapName });
  await createPartyRoom();
});

joinBtn.addEventListener("click", () => {
  closeLobbyBrowser();
  services.lobbies.quickJoin({ role: playerRole, map: currentMapName });
});

browseBtn.addEventListener("click", () => {
  openLobbyBrowser();
});

netLogBtn.addEventListener("click", () => {
  toggleNetworkPanel();
});

reportsBtn.addEventListener("click", () => {
  toggleReportsPanel();
});

suitBtn.addEventListener("click", () => {
  const loadout = services.cosmetics.cycleSuit(1);
  equipSuit(loadout);
  setStatus(`Suit equipped: ${loadout.suit.name}`);
});

closeBrowserBtn.addEventListener("click", () => {
  closeLobbyBrowser();
});

closeNetworkBtn.addEventListener("click", () => {
  closeNetworkPanel();
});

importReportsBtn.addEventListener("click", () => {
  if (reportImportPanel.hidden) {
    openReportImportPanel();
  } else {
    closeReportImportPanel();
  }
});

exportReportsBtn.addEventListener("click", () => {
  exportReportsArchive();
});

clearReportsBtn.addEventListener("click", () => {
  clearReportsArchive();
});

mergeReportsBtn.addEventListener("click", () => {
  importReportsArchive();
});

cancelReportImportBtn.addEventListener("click", () => {
  reportImportText.value = "";
  closeReportImportPanel();
});

closeReportsBtn.addEventListener("click", () => {
  closeReportsPanel();
});

joinCodeBtn.addEventListener("click", () => {
  const inviteCode = inviteInput.value;
  if (!inviteCode.trim()) {
    setStatus("Enter an invite code first");
    return;
  }
  const lobby = services.lobbies.joinByInvite({ inviteCode, role: playerRole });
  if (!lobby) {
    setStatus("Invite code not found");
    return;
  }
  currentMapName = lobby.map;
  mapSelect.value = lobby.map;
  persistSettings();
  closeLobbyBrowser();
  setStatus(`Joined invite ${lobby.inviteCode}`);
});

replaySeedBtn.addEventListener("click", () => {
  applyReplaySeed();
});

seedInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    applyReplaySeed();
  }
});

browserList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-join-lobby]");
  if (!button) {
    return;
  }
  const lobby = services.lobbies.join({ id: button.dataset.joinLobby, role: playerRole });
  if (!lobby) {
    setStatus("Lobby is no longer available");
    return;
  }
  currentMapName = lobby.map;
  mapSelect.value = lobby.map;
  persistSettings();
  closeLobbyBrowser();
  setStatus(`Joined ${lobby.host}'s lobby`);
});

reportsList.addEventListener("click", (event) => {
  const loadButton = event.target.closest("[data-load-report]");
  if (loadButton) {
    loadReportReplay(findReport(loadButton.dataset.loadReport));
    return;
  }

  const copyButton = event.target.closest("[data-copy-report-link]");
  if (copyButton) {
    copyReportReplayLink(findReport(copyButton.dataset.copyReportLink));
  }
});

mapSelect.addEventListener("change", () => {
  currentMapName = mapSelect.value;
  if (lobbyState) {
    services.lobbies.setMap(currentMapName);
  } else {
    resetMatch();
  }
  persistSettings();
  partySession.socket?.emit("host:update", { map: currentMapName, duration: matchDuration, phase: state.phase });
});

durationSelect.addEventListener("change", () => {
  setMatchDuration(durationSelect.value);
  resetMatch();
  persistSettings();
  partySession.socket?.emit("host:update", { map: currentMapName, duration: matchDuration, phase: state.phase });
});

botPressureSelect.addEventListener("change", () => {
  setBotPressure(botPressureSelect.value);
  updateLobbyPanel(lobbyState);
  persistSettings();
  setStatus(`${getBotTuning().label} bot pressure`);
});

roleBtn.addEventListener("click", () => {
  playerRole = playerRole === "Investigator" ? "Anomaly" : "Investigator";
  syncRoleUi();
  services.lobbies.setRole(playerRole);
  persistSettings();
  resetMatch();
});

abilityBtn.addEventListener("click", () => {
  useRoleAbility();
});

interactBtn.addEventListener("click", () => {
  if (state.phase !== "playing") {
    setStatus("Interact is available during a match");
    return;
  }
  interactBoost = 0.62;
});

readyBtn.addEventListener("click", () => {
  services.lobbies.setReady(true);
  startMatch();
});

resetBtn.addEventListener("click", () => {
  ready = false;
  services.lobbies.setReady(false);
  resetMatch();
});

soundBtn.addEventListener("click", () => {
  toggleSound();
});

masterVolumeInput?.addEventListener("input", () => {
  setAudioVolume("master", masterVolumeInput.value);
});

musicVolumeInput?.addEventListener("input", () => {
  setAudioVolume("music", musicVolumeInput.value);
});

sfxVolumeInput?.addEventListener("input", () => {
  setAudioVolume("sfx", sfxVolumeInput.value);
});

motionBtn.addEventListener("click", () => {
  reduceMotion = !reduceMotion;
  syncAccessibilityButtons();
  persistSettings();
  setStatus(reduceMotion ? "Reduced motion enabled" : "Full motion enabled");
});

contrastBtn.addEventListener("click", () => {
  highContrast = !highContrast;
  syncAccessibilityButtons();
  persistSettings();
  setStatus(highContrast ? "High contrast enabled" : "Standard contrast enabled");
});

feedbackBtn.addEventListener("click", () => {
  feedbackText.hidden = !feedbackText.hidden;
  if (!feedbackText.hidden) {
    feedbackText.focus();
    setStatus("Feedback packet ready");
  }
});

copyFeedbackBtn.addEventListener("click", async () => {
  feedbackText.hidden = false;
  const packet = feedbackText.value;
  await copyText(packet, "Feedback packet copied", "Feedback packet ready to copy");
});

copyReplayLinkBtn.addEventListener("click", async () => {
  const replayUrl = makeReplayUrl();
  await copyText(replayUrl, "Replay link copied", "Replay link ready to copy");
});

rematchBtn.addEventListener("click", () => {
  resetMatch();
  startMatch();
});

window.addEventListener("keydown", (event) => {
  unlockAudioFromGesture();
  setInputMode("keyboard");
  keys.add(event.code);
  if (event.code === "Space") {
    tryDash();
  }
  if (event.code === "KeyE") {
    useRoleAbility();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

window.addEventListener("gamepadconnected", () => {
  setStatus("Controller connected");
});

window.addEventListener("gamepaddisconnected", () => {
  setStatus("Controller disconnected");
});

canvas.addEventListener("pointermove", (event) => {
  setInputMode("keyboard");
  const rect = canvas.getBoundingClientRect();
  const dprX = canvas.width / rect.width;
  const dprY = canvas.height / rect.height;
  const viewport = getCanvasViewport();
  mouse.x = clamp(((event.clientX - rect.left) * dprX - viewport.x) / viewport.scale, 0, world.width);
  mouse.y = clamp(((event.clientY - rect.top) * dprY - viewport.y) / viewport.scale, 0, world.height);
});

canvas.addEventListener("pointerdown", () => {
  unlockAudioFromGesture();
  setInputMode("keyboard");
  mouse.down = true;
});

window.addEventListener("pointerdown", () => {
  unlockAudioFromGesture();
});

window.addEventListener("pointerup", () => {
  mouse.down = false;
});

window.addEventListener("resize", resizeCanvas);

stageEl.addEventListener("click", handlePartyPanelClick);

loadAnomalyAtlas();
loadInvestigatorAtlases();
applySavedSettings();
applyReplayParamsFromUrl();
equipSuit(services.cosmetics.getLoadout());
resetMatch();
resizeCanvas();
updateHud();
requestAnimationFrame(loop);
