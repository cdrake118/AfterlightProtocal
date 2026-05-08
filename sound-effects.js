const soundEffectDefinitions = [
  { id: "ghost_shock", label: "Anomaly stunned", bus: "sfx" },
  { id: "ghost_damage", label: "Anomaly taking damage", bus: "sfx" },
  { id: "ghost_escape", label: "Anomaly running away", bus: "sfx" },
  { id: "ghost_escape_loop", label: "Anomaly escape loop", bus: "sfx" },
  { id: "ghost_grab", label: "Investigator being caught", bus: "sfx" },
  { id: "ghost_carry_loop", label: "Anomaly carrying investigator", bus: "sfx" },
  { id: "battery_spawn", label: "Battery spawning", bus: "sfx" },
  { id: "pickup", label: "Battery being picked up", bus: "sfx" },
  { id: "round_intro", label: "Game intro music", bus: "music" },
  { id: "round_outro", label: "Game outro music", bus: "music" },
  { id: "flashlight_on", label: "Flashlight turned on", bus: "sfx" },
  { id: "flashlight_off", label: "Flashlight turned off", bus: "sfx" },
  { id: "revive_progress", label: "Investigator being revived", bus: "sfx" },
  { id: "revive", label: "Investigator revived", bus: "sfx" },
  { id: "downed", label: "Investigator downed", bus: "sfx" },
  { id: "blackout", label: "Anomaly blackout", bus: "sfx" },
  { id: "dash", label: "Dash / speed burst", bus: "sfx" },
  { id: "ability", label: "Pulse scan ability", bus: "sfx" },
  { id: "relay", label: "Relay charged", bus: "sfx" },
  { id: "lightning", label: "Arena event / lightning", bus: "sfx" },
  { id: "win", label: "Team wins", bus: "sfx" },
  { id: "lose", label: "Anomaly wins", bus: "sfx" },
  { id: "hit", label: "Damage impact", bus: "sfx" }
];

let soundLibrary = [];
let assignments = {};
let saveTimer = 0;
let previewAudio = null;
let previewButton = null;
let previewSrc = "";

const uploadBtn = document.querySelector("#uploadBtn");
const playLibraryBtn = document.querySelector("#playLibraryBtn");
const refreshBtn = document.querySelector("#refreshBtn");
const deleteBtn = document.querySelector("#deleteBtn");
const soundFile = document.querySelector("#soundFile");
const librarySelect = document.querySelector("#librarySelect");
const libraryStatus = document.querySelector("#libraryStatus");
const saveStatus = document.querySelector("#saveStatus");
const soundEffectsList = document.querySelector("#soundEffectsList");

uploadBtn.addEventListener("click", () => soundFile.click());
playLibraryBtn.addEventListener("click", playSelectedLibraryAudio);
refreshBtn.addEventListener("click", () => refreshAll(true));
deleteBtn.addEventListener("click", deleteSelectedSoundEffect);
soundFile.addEventListener("change", importSoundEffectFile);
soundEffectsList.addEventListener("click", handleAssignmentClick);
soundEffectsList.addEventListener("change", handleAssignmentChange);
soundEffectsList.addEventListener("input", handleVolumeInput);

refreshAll();

async function refreshAll(showStatus = false) {
  await Promise.all([loadSoundLibrary(showStatus), loadAssignments(showStatus)]);
  renderLibrary();
  renderAssignments();
}

async function importSoundEffectFile() {
  const [file] = soundFile.files;
  if (!file) return;
  try {
    const uploaded = await uploadSoundEffectAsset(file);
    soundLibrary = [uploaded, ...soundLibrary.filter((item) => item.filename !== uploaded.filename)];
    renderLibrary(uploaded.filename);
    renderAssignments();
    setLibraryStatus("Audio uploaded");
  } catch (error) {
    setLibraryStatus(`Upload failed: ${error.message}`);
  } finally {
    soundFile.value = "";
  }
}

async function loadSoundLibrary(showStatus = false) {
  try {
    const response = await fetch("/api/sound-effects");
    const payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload.error || "Audio library could not load");
    soundLibrary = Array.isArray(payload.soundEffects) ? payload.soundEffects : [];
    if (showStatus) setLibraryStatus(soundLibrary.length ? "Library refreshed" : "No audio uploaded");
  } catch (error) {
    soundLibrary = [];
    setLibraryStatus(`Library failed: ${error.message}`);
  }
}

async function loadAssignments(showStatus = false) {
  try {
    const response = await fetch("/api/sound-effects/config");
    const payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload.error || "Assignments could not load");
    assignments = normalizeAssignments(payload.soundEffects);
    if (showStatus) setSaveStatus("Assignments refreshed");
  } catch (error) {
    assignments = {};
    setSaveStatus(`Assignments failed: ${error.message}`);
  }
}

function renderLibrary(preferred = librarySelect.value) {
  librarySelect.innerHTML = "";
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = soundLibrary.length ? "Choose uploaded audio" : "No audio uploaded";
  librarySelect.append(emptyOption);
  for (const item of soundLibrary) {
    const option = document.createElement("option");
    option.value = item.filename;
    option.textContent = `${item.name} (${formatBytes(item.size)})`;
    librarySelect.append(option);
  }
  librarySelect.value = soundLibrary.some((item) => item.filename === preferred) ? preferred : "";
  setLibraryStatus(soundLibrary.length ? `${soundLibrary.length} audio file${soundLibrary.length === 1 ? "" : "s"}` : "No audio uploaded");
}

function renderAssignments() {
  stopPreview();
  soundEffectsList.innerHTML = "";
  for (const definition of soundEffectDefinitions) {
    const current = assignments[definition.id] ?? null;
    const row = document.createElement("div");
    row.className = "sound-effect-row";

    const top = document.createElement("div");
    top.className = "sound-row-top";
    const title = document.createElement("strong");
    title.textContent = definition.label;
    const detail = document.createElement("small");
    detail.textContent = current?.name || "Default";
    top.append(title, detail);

    const select = document.createElement("select");
    select.dataset.soundEvent = definition.id;
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Default / none";
    select.append(defaultOption);
    for (const item of soundLibrary) {
      const option = document.createElement("option");
      option.value = item.filename;
      option.textContent = item.name;
      select.append(option);
    }
    if (current?.src && !soundLibrary.some((item) => item.src === current.src)) {
      const option = document.createElement("option");
      option.value = current.src;
      option.textContent = `${current.name} (assigned)`;
      select.append(option);
    }
    select.value = filenameForAssignment(current);

    const range = document.createElement("input");
    range.type = "range";
    range.min = "0";
    range.max = "1";
    range.step = "0.05";
    range.value = String(clamp(Number(current?.volume ?? 1), 0, 1));
    range.disabled = !current;
    range.dataset.soundVolume = definition.id;

    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.textContent = "Play";
    playButton.disabled = !current;
    playButton.dataset.playSoundEvent = definition.id;

    const controls = document.createElement("div");
    controls.className = "sound-row-controls";
    controls.append(range, playButton);

    row.append(top, select, controls);
    soundEffectsList.append(row);
  }
  setSaveStatus(`${Object.keys(assignments).length} assigned`);
}

function handleAssignmentClick(event) {
  const button = event.target.closest("[data-play-sound-event]");
  if (!button) return;
  const effect = assignments[button.dataset.playSoundEvent];
  if (!effect?.src) {
    setSaveStatus("Choose audio first");
    return;
  }
  playPreview(effect, button, setSaveStatus);
}

function handleAssignmentChange(event) {
  const select = event.target.closest("[data-sound-event]");
  if (!select) return;
  const definition = soundEffectDefinitions.find((item) => item.id === select.dataset.soundEvent);
  if (!definition) return;
  if (!select.value) {
    delete assignments[definition.id];
  } else {
    const item = soundLibrary.find((entry) => entry.filename === select.value)
      ?? soundLibrary.find((entry) => entry.src === select.value);
    if (!item) {
      setSaveStatus("Choose uploaded audio");
      renderAssignments();
      return;
    }
    assignments[definition.id] = soundEffectFromLibraryItem(item, definition, assignments[definition.id]?.volume);
  }
  renderAssignments();
  scheduleSave();
}

function handleVolumeInput(event) {
  const range = event.target.closest("[data-sound-volume]");
  if (!range) return;
  const effect = assignments[range.dataset.soundVolume];
  if (!effect) return;
  effect.volume = clamp(Number(range.value), 0, 1);
  setSaveStatus("Saving");
  scheduleSave();
}

async function deleteSelectedSoundEffect() {
  const item = selectedSoundEffectItem();
  if (!item) {
    setLibraryStatus("Choose audio to remove");
    return;
  }
  if (previewSrc === item.src) stopPreview();
  try {
    const response = await fetch(`/api/sound-effects/${encodeURIComponent(item.filename)}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload.error || "Audio could not be removed");
    await refreshAll();
    setLibraryStatus(`Removed ${item.name}`);
  } catch (error) {
    setLibraryStatus(`Remove failed: ${error.message}`);
  }
}

function selectedSoundEffectItem() {
  return soundLibrary.find((item) => item.filename === librarySelect.value) ?? null;
}

function playSelectedLibraryAudio() {
  const item = selectedSoundEffectItem();
  if (!item?.src) {
    setLibraryStatus("Choose audio to play");
    return;
  }
  playPreview({ ...item, volume: 1 }, playLibraryBtn, setLibraryStatus);
}

function playPreview(entry, button, reportStatus) {
  if (previewAudio && previewSrc === entry.src && !previewAudio.paused) {
    stopPreview();
    return;
  }
  stopPreview();
  previewSrc = entry.src;
  previewButton = button;
  previewAudio = new Audio(entry.src);
  previewAudio.volume = clamp(Number(entry.volume ?? 1), 0, 1);
  previewAudio.addEventListener("ended", stopPreview, { once: true });
  previewAudio.addEventListener("error", () => {
    stopPreview();
    reportStatus("Audio preview failed");
  }, { once: true });
  const play = previewAudio.play();
  button.textContent = "Stop";
  if (play?.catch) {
    play.catch(() => {
      stopPreview();
      reportStatus("Audio preview blocked by browser");
    });
  }
}

function stopPreview() {
  if (previewAudio) {
    previewAudio.pause();
    previewAudio.currentTime = 0;
  }
  if (previewButton) previewButton.textContent = "Play";
  previewAudio = null;
  previewButton = null;
  previewSrc = "";
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  setSaveStatus("Saving");
  saveTimer = window.setTimeout(saveAssignments, 320);
}

async function saveAssignments() {
  try {
    const response = await fetch("/api/sound-effects/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ soundEffects: assignments })
    });
    const payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload.error || "Assignments could not be saved");
    assignments = normalizeAssignments(payload.soundEffects);
    setSaveStatus("Saved");
  } catch (error) {
    setSaveStatus(`Save failed: ${error.message}`);
  }
}

function uploadSoundEffectAsset(file) {
  return new Promise((resolve, reject) => {
    const isSupportedAudio = ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/x-wav"].includes(file.type)
      || /\.(mp3|ogg|wav)$/i.test(file.name);
    if (!isSupportedAudio) {
      reject(new Error("Choose an MP3, OGG, or WAV file"));
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", async () => {
      try {
        const response = await fetch("/api/sound-effects", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type || "audio/mpeg",
            size: file.size,
            dataUrl: String(reader.result)
          })
        });
        const payload = await response.json();
        if (!response.ok || payload.ok === false) throw new Error(payload.error || "Audio could not be uploaded");
        resolve(payload.soundEffect);
      } catch (error) {
        reject(error);
      }
    }, { once: true });
    reader.addEventListener("error", () => reject(new Error("Audio could not be read")), { once: true });
    reader.readAsDataURL(file);
  });
}

function soundEffectFromLibraryItem(item, definition, volume = 1) {
  return {
    name: item.name,
    src: item.src,
    mimeType: item.mimeType || "audio/mpeg",
    size: item.size ?? 0,
    volume: clamp(Number(volume ?? 1), 0, 1),
    bus: definition.bus ?? "sfx",
    loop: false
  };
}

function normalizeAssignments(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowed = new Set(soundEffectDefinitions.map((definition) => definition.id));
  return Object.entries(value).reduce((next, [id, effect]) => {
    if (!allowed.has(id) || !effect?.src) return next;
    const definition = soundEffectDefinitions.find((item) => item.id === id);
    next[id] = {
      name: String(effect.name ?? definition?.label ?? "Sound Effect"),
      src: String(effect.src),
      mimeType: String(effect.mimeType ?? "audio/mpeg"),
      size: Number(effect.size ?? 0),
      volume: clamp(Number(effect.volume ?? 1), 0, 1),
      bus: effect.bus === "music" ? "music" : definition?.bus ?? "sfx",
      loop: effect.loop === true
    };
    return next;
  }, {});
}

function filenameForAssignment(effect) {
  if (!effect?.src) return "";
  const item = soundLibrary.find((entry) => entry.src === effect.src);
  return item?.filename ?? effect.src;
}

function setLibraryStatus(message) {
  libraryStatus.textContent = message;
}

function setSaveStatus(message) {
  saveStatus.textContent = message;
}

function formatBytes(value) {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
