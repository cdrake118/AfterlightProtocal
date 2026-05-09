const settingDefinitions = [
  {
    key: "respawnTimerSeconds",
    label: "Respawn Timer",
    detail: "Seconds before another battery can appear.",
    min: 5,
    max: 180,
    step: 1,
    unit: "sec",
    defaultValue: 30
  },
  {
    key: "lowBatteryThreshold",
    label: "Low Battery Threshold",
    detail: "Battery percentage that allows emergency respawns.",
    min: 5,
    max: 95,
    step: 1,
    unit: "%",
    defaultValue: 35,
    scale: 100
  },
  {
    key: "startingPickups",
    label: "Starting Pickups",
    detail: "Active batteries spawned when a round resets.",
    min: 0,
    max: 8,
    step: 1,
    unit: "",
    defaultValue: 1,
    integer: true
  },
  {
    key: "maxActivePickups",
    label: "Max Active Pickups",
    detail: "Upper limit for active standard batteries.",
    min: 1,
    max: 12,
    step: 1,
    unit: "",
    defaultValue: 3,
    integer: true
  },
  {
    key: "flashlightBatteryMax",
    label: "Battery Capacity",
    detail: "Investigator battery health at full charge.",
    min: 30,
    max: 300,
    step: 1,
    unit: "pts",
    defaultValue: 165.6
  },
  {
    key: "flashlightDrainPerSecond",
    label: "Player Drain Rate",
    detail: "Battery points drained per second while light is on.",
    min: 1,
    max: 60,
    step: 0.1,
    unit: "pts/sec",
    defaultValue: 19.2
  },
  {
    key: "aiFlashlightDrainPerSecond",
    label: "AI Drain Rate",
    detail: "Battery points drained per second by AI investigators.",
    min: 1,
    max: 60,
    step: 0.1,
    unit: "pts/sec",
    defaultValue: 15.6
  },
  {
    key: "overchargeDurationSeconds",
    label: "Overcharge Duration",
    detail: "Seconds an overcharge pickup stays active on a player.",
    min: 0,
    max: 60,
    step: 1,
    unit: "sec",
    defaultValue: 18
  },
  {
    key: "overchargeDamageMultiplier",
    label: "Overcharge Damage",
    detail: "Flashlight damage multiplier during overcharge.",
    min: 1,
    max: 5,
    step: 0.05,
    unit: "x",
    defaultValue: 2.15
  },
  {
    key: "overchargeReviveMultiplier",
    label: "Overcharge Revive",
    detail: "Revive speed multiplier during overcharge.",
    min: 1,
    max: 5,
    step: 0.05,
    unit: "x",
    defaultValue: 1.75
  }
];

const defaultSettings = {
  batteries: Object.fromEntries(settingDefinitions.map((definition) => [
    definition.key,
    definition.scale ? definition.defaultValue / definition.scale : definition.defaultValue
  ]))
};

let settings = structuredClone(defaultSettings);
let saveTimer = 0;

const saveStatus = document.querySelector("#saveStatus");
const batterySummary = document.querySelector("#batterySummary");
const pickupSummary = document.querySelector("#pickupSummary");
const overchargeSummary = document.querySelector("#overchargeSummary");
const settingsFields = document.querySelector("#settingsFields");
const resetBtn = document.querySelector("#resetBtn");
const refreshBtn = document.querySelector("#refreshBtn");

resetBtn.addEventListener("click", resetSettings);
refreshBtn.addEventListener("click", () => loadSettings(true));
settingsFields.addEventListener("input", handleSettingsInput);
settingsFields.addEventListener("change", handleSettingsInput);

renderSettings();
loadSettings();

async function loadSettings(showStatus = false) {
  try {
    const response = await fetch("/api/global-settings");
    const payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload.error || "Settings could not load");
    settings = normalizeSettings(payload.settings);
    renderSettings();
    setSaveStatus(showStatus ? "Settings refreshed" : "Loaded");
  } catch (error) {
    settings = structuredClone(defaultSettings);
    renderSettings();
    setSaveStatus(`Load failed: ${error.message}`);
  }
}

function renderSettings() {
  settingsFields.innerHTML = "";
  for (const definition of settingDefinitions) {
    const value = displayValue(definition, settings.batteries[definition.key]);
    const row = document.createElement("label");
    row.className = "setting-control-row";

    const copy = document.createElement("span");
    copy.className = "setting-copy";
    const label = document.createElement("strong");
    label.textContent = definition.label;
    const detail = document.createElement("small");
    detail.textContent = definition.detail;
    copy.append(label, detail);

    const inputWrap = document.createElement("span");
    inputWrap.className = "setting-input-wrap";
    const input = document.createElement("input");
    input.type = "number";
    input.inputMode = "decimal";
    input.min = String(definition.min);
    input.max = String(definition.max);
    input.step = String(definition.step);
    input.value = formatNumber(value, definition.step);
    input.dataset.settingKey = definition.key;
    const unit = document.createElement("span");
    unit.textContent = definition.unit;
    inputWrap.append(input, unit);

    row.append(copy, inputWrap);
    settingsFields.append(row);
  }
  renderSummary();
}

function renderSummary() {
  const batteries = settings.batteries;
  batterySummary.textContent = `${Math.round(batteries.flashlightBatteryMax)} pts, ${formatNumber(batteries.flashlightDrainPerSecond, 0.1)} pts/sec`;
  pickupSummary.textContent = `${batteries.startingPickups} start, ${batteries.maxActivePickups} max, ${Math.round(batteries.lowBatteryThreshold * 100)}% threshold`;
  overchargeSummary.textContent = `${formatNumber(batteries.overchargeDurationSeconds, 1)} sec, ${formatNumber(batteries.overchargeDamageMultiplier, 0.05)}x damage`;
}

function handleSettingsInput(event) {
  const input = event.target.closest("[data-setting-key]");
  if (!input) return;
  const definition = settingDefinitions.find((item) => item.key === input.dataset.settingKey);
  if (!definition) return;
  const value = clamp(Number(input.value), definition.min, definition.max);
  settings.batteries[definition.key] = storedValue(definition, value);
  renderSummary();
  scheduleSave();
}

function resetSettings() {
  settings = structuredClone(defaultSettings);
  renderSettings();
  saveSettings();
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  setSaveStatus("Saving");
  saveTimer = window.setTimeout(saveSettings, 320);
}

async function saveSettings() {
  try {
    const response = await fetch("/api/global-settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ settings })
    });
    const payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload.error || "Settings could not be saved");
    settings = normalizeSettings(payload.settings);
    if (document.activeElement?.matches?.("[data-setting-key]")) {
      renderSummary();
    } else {
      renderSettings();
    }
    setSaveStatus("Saved");
  } catch (error) {
    setSaveStatus(`Save failed: ${error.message}`);
  }
}

function normalizeSettings(value) {
  const batteries = value?.batteries && typeof value.batteries === "object" ? value.batteries : {};
  const normalized = {
    batteries: Object.fromEntries(settingDefinitions.map((definition) => {
      const fallback = defaultSettings.batteries[definition.key];
      const rawValue = Number(batteries[definition.key] ?? fallback);
      const min = storedValue(definition, definition.min);
      const max = storedValue(definition, definition.max);
      const clamped = clamp(Number.isFinite(rawValue) ? rawValue : fallback, min, max);
      return [definition.key, definition.integer ? Math.round(clamped) : clamped];
    }))
  };
  normalized.batteries.maxActivePickups = Math.max(normalized.batteries.startingPickups, normalized.batteries.maxActivePickups);
  return normalized;
}

function displayValue(definition, value) {
  const scaled = Number(value) * (definition.scale ?? 1);
  return definition.integer ? Math.round(scaled) : scaled;
}

function storedValue(definition, value) {
  const scaled = Number(value) / (definition.scale ?? 1);
  return definition.integer ? Math.round(scaled) : scaled;
}

function formatNumber(value, step) {
  const decimals = String(step).includes(".") ? String(step).split(".")[1].length : 0;
  return Number(value).toFixed(decimals).replace(/\.0+$/, "");
}

function setSaveStatus(message) {
  saveStatus.textContent = message;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
