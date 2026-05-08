const world = { width: 1280, height: 720 };
const defaultMapSize = { width: 1280, height: 720, aspectRatio: "16:9" };
const gridSize = 32;
const runtimeFootprints = {
  investigator: { radius: 10, boundsLabel: "20px" },
  anomaly: { radius: 10, boundsLabel: "20px" }
};
const resizeEdgeHitPadding = 10;
const resizeCornerHitRadius = 8;
const resizeEdgeHandleLength = 34;
const resizeIntentThreshold = 6;
const resizeIntentRatio = 1.35;
const occluderDepthHitPadding = 28;
const defaultWallThickness = 24;
const defaultBarrierThickness = 1;
const barrierCollisionPadding = 10;
const defaultOccluderThickness = 96;
const wallAnchorHitRadius = 18;
const storageFloorImageMax = { width: 1280, height: 720, quality: 0.86 };
const storageDecorationImageMax = { width: 640, height: 640, quality: 0.86 };
const savedMapsKey = "afterlight-map-builder-saves";
const lastLoadedMapKey = "afterlight-map-builder-last-loaded";
const assetTrayKey = "afterlight-map-builder-assets";
const playtestMapKey = "afterlight-playtest-map";
const playtestOptionsKey = "afterlight-playtest-options";
const snapModePreferenceKey = "afterlight-map-builder-snap-mode";
const actorBarrierPreferenceKey = "afterlight-map-builder-actor-barriers";
const historyLimit = 50;
const anomalyAtlasSrc = "assets/characters/anomaly-ghost-atlas.png";
const anomalyAtlasFrame = 128;
const anomalyPreviewScale = 0.85;
const investigatorPreview = {
  width: 56,
  height: 88,
  radius: 10,
  shadowWidth: 24,
  shadowHeight: 6
};
const anomalyPreview = {
  size: 98 * anomalyPreviewScale,
  radius: 10
};

const defaultEvent = {
  name: "Storm Flash",
  color: "#dff7ff",
  status: "Storm flash exposed the manor corridors",
  detail: "A lightning burst cuts through the manor and briefly exposes hidden movement.",
  effect: "reveal"
};

const sampleMap = {
  name: "Manor Party",
  size: defaultMapSize,
  floor: ["#17151a", "#2a1922", "#2a2f1d"],
  event: defaultEvent,
  player: [180, 186],
  anomaly: [640, 352],
  investigators: [
    [1102, 154, "#e76f8a", "Rowan"],
    [180, 560, "#c7a8ff", "Vale"],
    [1108, 560, "#f4e15d", "Mira"]
  ],
  batteries: [[196, 188], [1088, 184], [640, 542]],
  relays: [],
  labels: [[640, 246, "GRAND STAIR"], [302, 254, "CHECKER HALL"], [976, 552, "DINING"]],
  backgroundImage: null,
  foregroundImage: null,
  decorations: [],
  occluders: [],
  music: null,
  walls: [
    { x: 92, y: 96, w: 1096, h: 22 },
    { x: 92, y: 602, w: 1096, h: 22 },
    { x: 92, y: 96, w: 22, h: 528 },
    { x: 1166, y: 96, w: 22, h: 528 },
    { x: 404, y: 118, w: 24, h: 160 },
    { x: 404, y: 344, w: 24, h: 258 },
    { x: 852, y: 118, w: 24, h: 164 },
    { x: 852, y: 350, w: 24, h: 252 },
    { x: 428, y: 318, w: 160, h: 24 },
    { x: 692, y: 318, w: 160, h: 24 },
    { x: 428, y: 472, w: 160, h: 24 },
    { x: 692, y: 472, w: 160, h: 24 }
  ],
  props: [
    { x: 248, y: 160, w: 94, h: 48, color: "#243333" },
    { x: 586, y: 150, w: 108, h: 56, color: "#33241d" },
    { x: 910, y: 524, w: 148, h: 52, color: "#3a3320" }
  ]
};

let map = normalizeGameMap(sampleMap);
let activeTool = "select";
let selected = null;
let selectedGroup = [];
let selectedEndpoint = null;
let pointer = null;
let exportMode = "game";
let lastExport = "";
let statusTimer = 0;
let pendingDecoration = null;
let analysisOverlay = false;
let suppressHistory = false;
let history = [];
let historyIndex = -1;
let assetTray = loadAssetTray();
let lastPointerEvent = null;
let componentClipboard = null;
let activeSaveSlot = "";
let musicLibrary = [];
let musicPreviewAudio = null;
let musicPreviewSrc = "";

const imageCache = new Map();

const canvas = document.querySelector("#builderCanvas");
const ctx = canvas.getContext("2d");
const mapName = document.querySelector("#mapName");
const floorInputs = [document.querySelector("#floorA"), document.querySelector("#floorB"), document.querySelector("#floorC")];
const activeToolEl = document.querySelector("#activeTool");
const cursorPosition = document.querySelector("#cursorPosition");
const objectCount = document.querySelector("#objectCount");
const inspectorEmpty = document.querySelector("#inspectorEmpty");
const inspectorFields = document.querySelector("#inspectorFields");
const validationSummary = document.querySelector("#validationSummary");
const validationList = document.querySelector("#validationList");
const exportOutput = document.querySelector("#exportOutput");
const importFile = document.querySelector("#importFile");
const playtestFreezeAnomaly = document.querySelector("#playtestFreezeAnomaly");
const respectBarriersToggle = document.querySelector("#respectBarriersToggle");
const backgroundFile = document.querySelector("#backgroundFile");
const foregroundFile = document.querySelector("#foregroundFile");
const decorationFile = document.querySelector("#decorationFile");
const musicFile = document.querySelector("#musicFile");
const mediaStatus = document.querySelector("#mediaStatus");
const floorImageStatus = document.querySelector("#floorImageStatus");
const foregroundImageStatus = document.querySelector("#foregroundImageStatus");
const musicStatus = document.querySelector("#musicStatus");
const musicLibrarySelect = document.querySelector("#musicLibrarySelect");
const mapMusicVolume = document.querySelector("#mapMusicVolume");
const musicVolumeValue = document.querySelector("#musicVolumeValue");
const musicVolumeField = document.querySelector("#musicVolumeField");
const assetTrayEl = document.querySelector("#assetTray");
const gridToggle = document.querySelector("#gridToggle");
const snapToggle = document.querySelector("#snapToggle");
const snapMode = document.querySelector("#snapMode");
const savedMapSelect = document.querySelector("#savedMapSelect");
const layerList = document.querySelector("#layerList");
const deleteMapModal = document.querySelector("#deleteMapModal");
const deleteMapMessage = document.querySelector("#deleteMapMessage");
const confirmDeleteMapBtn = document.querySelector("#confirmDeleteMapBtn");
const cancelDeleteMapBtn = document.querySelector("#cancelDeleteMapBtn");
let pendingDeleteMapName = "";

const inspector = {
  type: document.querySelector("#objectType"),
  x: document.querySelector("#objectX"),
  y: document.querySelector("#objectY"),
  w: document.querySelector("#objectW"),
  h: document.querySelector("#objectH"),
  depthY: document.querySelector("#objectDepthY"),
  depthYRange: document.querySelector("#objectDepthYRange"),
  frontEdgeValue: document.querySelector("#frontEdgeValue"),
  name: document.querySelector("#objectName"),
  color: document.querySelector("#objectColor"),
  opacity: document.querySelector("#objectOpacity"),
  rotation: document.querySelector("#objectRotation"),
  sizeFields: document.querySelector("#sizeFields"),
  nameField: document.querySelector("#nameField"),
  colorField: document.querySelector("#colorField"),
  opacityField: document.querySelector("#opacityField"),
  rotationField: document.querySelector("#rotationField"),
  depthField: document.querySelector("#depthField")
};

restoreSnapPreference();
restoreActorBarrierPreference();
wireControls();
const restoredLastMap = restoreLastLoadedMap();
syncPlaytestOptionsForm();
syncForm();
updateExport();
validateMap();
renderAssetTray();
renderSavedMaps();
loadMusicLibrary();
commitHistory(restoredLastMap ? `Load ${activeSaveSlot}` : "Initial");
draw();

function wireControls() {
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => setTool(button.dataset.tool));
  });

  mapName.addEventListener("input", () => {
    map.name = mapName.value.trim() || "Untitled Map";
    changed(false);
  });

  floorInputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      map.floor[index] = input.value;
      changed(false);
    });
  });

  document.querySelector("#newMapBtn").addEventListener("click", () => {
    startNewMap();
  });
  document.querySelector("#sampleBtn").addEventListener("click", () => {
    map = normalizeGameMap(sampleMap);
    activeSaveSlot = "";
    rememberLastLoadedMap("");
    clearSelection();
    syncForm();
    commitHistory("Sample");
    renderSavedMaps("");
    markStatus("Sample loaded");
  });
  document.querySelector("#importBtn").addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", importJsonFile);
  document.querySelector("#validateBtn").addEventListener("click", validateMap);
  document.querySelector("#undoBtn").addEventListener("click", undo);
  document.querySelector("#redoBtn").addEventListener("click", redo);
  document.querySelector("#copyComponentBtn").addEventListener("click", copyComponent);
  document.querySelector("#pasteComponentBtn").addEventListener("click", pasteComponent);
  document.querySelector("#analysisBtn").addEventListener("click", toggleAnalysisOverlay);
  document.querySelector("#playtestBtn").addEventListener("click", playtestMap);
  playtestFreezeAnomaly.addEventListener("change", savePlaytestOptions);
  respectBarriersToggle.addEventListener("change", () => {
    persistActorBarrierPreference();
    markStatus(respectBarriersToggle.checked ? "Actor barrier movement enabled" : "Actor barrier movement disabled");
  });
  document.querySelector("#fitBtn").addEventListener("click", draw);
  document.querySelector("#exportGameBtn").addEventListener("click", () => setExportMode("game"));
  document.querySelector("#exportTiledBtn").addEventListener("click", () => setExportMode("tiled"));
  document.querySelector("#copyBtn").addEventListener("click", copyExport);
  document.querySelector("#downloadBtn").addEventListener("click", downloadExport);
  document.querySelector("#deleteBtn").addEventListener("click", deleteSelection);
  document.querySelector("#backgroundBtn").addEventListener("click", () => backgroundFile.click());
  document.querySelector("#foregroundBtn").addEventListener("click", () => foregroundFile.click());
  document.querySelector("#decorationBtn").addEventListener("click", () => decorationFile.click());
  document.querySelector("#musicBtn").addEventListener("click", () => musicFile.click());
  document.querySelector("#selectBackgroundBtn").addEventListener("click", selectBackground);
  document.querySelector("#selectForegroundBtn").addEventListener("click", selectForeground);
  floorImageStatus.addEventListener("click", selectBackground);
  foregroundImageStatus.addEventListener("click", selectForeground);
  document.querySelector("#clearBackgroundBtn").addEventListener("click", clearBackground);
  document.querySelector("#clearForegroundBtn").addEventListener("click", clearForeground);
  document.querySelector("#clearMusicBtn").addEventListener("click", clearMusic);
  document.querySelector("#useMusicBtn").addEventListener("click", useSelectedMusic);
  document.querySelector("#previewMusicBtn").addEventListener("click", previewSelectedMusic);
  document.querySelector("#refreshMusicBtn").addEventListener("click", () => loadMusicLibrary(true));
  document.querySelector("#deleteMusicBtn").addEventListener("click", deleteSelectedMusic);
  document.querySelector("#saveNamedBtn").addEventListener("click", saveNamedMap);
  document.querySelector("#loadNamedBtn").addEventListener("click", loadNamedMap);
  document.querySelector("#deleteNamedBtn").addEventListener("click", requestDeleteNamedMap);
  confirmDeleteMapBtn.addEventListener("click", confirmDeleteNamedMap);
  cancelDeleteMapBtn.addEventListener("click", closeDeleteMapModal);
  deleteMapModal.addEventListener("click", (event) => {
    if (event.target === deleteMapModal) closeDeleteMapModal();
  });
  backgroundFile.addEventListener("change", importBackgroundImage);
  foregroundFile.addEventListener("change", importForegroundImage);
  decorationFile.addEventListener("change", importDecorationImage);
  musicFile.addEventListener("change", importMusicFile);
  mapMusicVolume.addEventListener("input", () => {
    if (!map.music) {
      updateMediaStatus();
      return;
    }
    map.music.volume = clamp(Number(mapMusicVolume.value), 0, 1);
    if (musicPreviewAudio && musicPreviewSrc === map.music.src) {
      musicPreviewAudio.volume = map.music.volume;
    }
    updateMediaStatus();
    changed(false);
  });
  gridToggle.addEventListener("change", draw);
  snapToggle.addEventListener("change", () => {
    if (!snapToggle.checked) {
      snapMode.value = "off";
    } else if (snapMode.value === "off") {
      snapMode.value = "grid";
    }
    persistSnapPreference();
    draw();
  });
  snapMode.addEventListener("change", () => {
    snapToggle.checked = snapMode.value !== "off";
    persistSnapPreference();
    markStatus(`${snapMode.selectedOptions[0].textContent} snap`);
    draw();
  });
  assetTrayEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-asset-index]");
    if (!button) return;
    selectAsset(Number(button.dataset.assetIndex));
  });
  layerList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-layer-ref]");
    if (!button) return;
    if (event.shiftKey) toggleSelection(parseLayerRef(button.dataset.layerRef));
    else setSelection(parseLayerRef(button.dataset.layerRef));
    syncInspector();
    draw();
  });
  document.querySelectorAll("[data-template]").forEach((button) => {
    button.addEventListener("click", () => loadTemplate(button.dataset.template));
  });
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => addPreset(button.dataset.preset));
  });

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointerleave", handlePointerUp);

  ["x", "y", "w", "h", "depthY", "depthYRange", "name", "color", "opacity", "rotation"].forEach((key) => {
    inspector[key].addEventListener("input", () => updateSelectedFromInspector(key));
  });
  document.querySelectorAll("[data-front-edge]").forEach((button) => {
    button.addEventListener("click", () => setSelectedOccluderFrontEdge(button.dataset.frontEdge));
  });
  document.querySelectorAll("[data-front-edge-nudge]").forEach((button) => {
    button.addEventListener("click", () => nudgeSelectedOccluderFrontEdge(Number(button.dataset.frontEdgeNudge)));
  });

  window.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !isTypingTarget(event.target)) {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c" && !isTypingTarget(event.target)) {
      event.preventDefault();
      copyComponent();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v" && !isTypingTarget(event.target)) {
      event.preventDefault();
      pasteComponent();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y" && !isTypingTarget(event.target)) {
      event.preventDefault();
      redo();
      return;
    }
    if (selected && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key) && !isTypingTarget(event.target)) {
      event.preventDefault();
      nudgeSelection(event);
      return;
    }
    if ((event.key === "Delete" || event.key === "Backspace") && selected && !isTypingTarget(event.target)) {
      event.preventDefault();
      deleteSelection();
    }
    if (event.key === "Escape") {
      if (!deleteMapModal.hidden) {
        closeDeleteMapModal();
        return;
      }
      clearSelection();
      pointer = null;
      syncInspector();
      draw();
    }
  });

  window.addEventListener("resize", draw);
}

function setTool(tool) {
  activeTool = tool;
  if (pointer?.mode === "drawSegment") {
    pointer = null;
  }
  document.querySelectorAll("[data-tool]").forEach((button) => {
    const active = button.dataset.tool === tool;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  activeToolEl.textContent = titleCase(tool);
  canvas.style.cursor = tool === "select" ? "default" : "crosshair";
}

function updateSelectCursor(point) {
  if (activeTool !== "select" || pointer) return;
  const handle = hitResizeHandle(point);
  canvas.style.cursor = handle ? resizeCursor(handle) : "default";
}

async function importBackgroundImage() {
  const [file] = backgroundFile.files;
  if (!file) return;
  try {
    const asset = await readImageAsset(file, "backgrounds");
    map.backgroundImage = {
      ...asset,
      x: 0,
      y: 0,
      w: world.width,
      h: world.height,
      opacity: 0.82
    };
    setSelection({ kind: "background", index: 0 });
    preloadImage(asset.src);
    syncInspector();
    changed();
    markStatus("Floor image loaded");
  } catch (error) {
    markStatus(`Floor image failed: ${error.message}`);
  } finally {
    backgroundFile.value = "";
  }
}

async function importForegroundImage() {
  const [file] = foregroundFile.files;
  if (!file) return;
  try {
    const asset = await readImageAsset(file, "foregrounds");
    map.foregroundImage = {
      ...asset,
      x: 0,
      y: 0,
      w: world.width,
      h: world.height,
      opacity: 1
    };
    setSelection({ kind: "foreground", index: 0 });
    preloadImage(asset.src);
    syncInspector();
    changed();
    markStatus("Foreground image loaded");
  } catch (error) {
    markStatus(`Foreground failed: ${error.message}`);
  } finally {
    foregroundFile.value = "";
  }
}

async function importDecorationImage() {
  const [file] = decorationFile.files;
  if (!file) return;
  try {
    pendingDecoration = await readImageAsset(file, "props");
    preloadImage(pendingDecoration.src);
    assetTray = [pendingDecoration, ...assetTray.filter((asset) => asset.src !== pendingDecoration.src)].slice(0, 18);
    saveAssetTray();
    renderAssetTray();
    mediaStatus.textContent = `${pendingDecoration.name} ready`;
    setTool("decoration");
    markStatus("Click map to place image");
  } catch (error) {
    markStatus(`Prop image failed: ${error.message}`);
  } finally {
    decorationFile.value = "";
  }
}

async function importMusicFile() {
  const [file] = musicFile.files;
  if (!file) return;
  try {
    const uploaded = await uploadAudioAsset(file);
    musicLibrary = [uploaded, ...musicLibrary.filter((item) => item.filename !== uploaded.filename)];
    renderMusicLibrary(uploaded.filename);
    map.music = musicFromLibraryItem(uploaded);
    updateMediaStatus();
    changed();
    markStatus("Music uploaded");
  } catch (error) {
    markStatus(`Music failed: ${error.message}`);
  } finally {
    musicFile.value = "";
  }
}

async function loadMusicLibrary(showStatus = false) {
  try {
    const response = await fetch("/api/map-music");
    const payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload.error || "Music library could not load");
    musicLibrary = Array.isArray(payload.music) ? payload.music : [];
    renderMusicLibrary();
    if (showStatus) markStatus(musicLibrary.length ? "Music library refreshed" : "No server music yet");
  } catch (error) {
    musicLibrary = [];
    renderMusicLibrary();
    if (showStatus) markStatus(`Music library failed: ${error.message}`);
  }
}

function renderMusicLibrary(preferred = "") {
  const current = preferred || filenameForMusic(map.music) || selectedMusicItem()?.filename || musicLibrarySelect.value;
  musicLibrarySelect.innerHTML = "";
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = musicLibrary.length ? "Choose server music" : "No server music uploaded";
  musicLibrarySelect.append(emptyOption);
  for (const item of musicLibrary) {
    const option = document.createElement("option");
    option.value = item.filename;
    option.textContent = `${item.name} (${formatBytes(item.size)})`;
    musicLibrarySelect.append(option);
  }
  musicLibrarySelect.value = musicLibrary.some((item) => item.filename === current) ? current : "";
}

function selectedMusicItem() {
  return musicLibrary.find((item) => item.filename === musicLibrarySelect.value) ?? null;
}

function filenameForMusic(track) {
  if (!track?.src) return "";
  return musicLibrary.find((item) => item.src === track.src)?.filename ?? "";
}

function useSelectedMusic() {
  const item = selectedMusicItem();
  if (!item) {
    markStatus("Choose server music first");
    return;
  }
  map.music = musicFromLibraryItem(item);
  updateMediaStatus();
  changed();
  markStatus(`Using ${item.name}`);
}

function previewSelectedMusic() {
  const button = document.querySelector("#previewMusicBtn");
  const item = selectedMusicItem() ?? map.music;
  if (!item?.src) {
    markStatus("Choose server music first");
    return;
  }
  if (musicPreviewAudio && musicPreviewSrc === item.src && !musicPreviewAudio.paused) {
    stopMusicPreview();
    return;
  }
  stopMusicPreview();
  musicPreviewSrc = item.src;
  musicPreviewAudio = new Audio(item.src);
  musicPreviewAudio.volume = clamp(Number(map.music?.src === item.src ? map.music.volume : mapMusicVolume.value), 0, 1);
  musicPreviewAudio.addEventListener("ended", stopMusicPreview, { once: true });
  musicPreviewAudio.addEventListener("error", () => {
    stopMusicPreview();
    markStatus("Music preview failed");
  }, { once: true });
  const play = musicPreviewAudio.play();
  button.textContent = "Stop";
  if (play?.catch) {
    play.catch(() => {
      stopMusicPreview();
      markStatus("Music preview blocked by browser");
    });
  }
}

function stopMusicPreview() {
  if (musicPreviewAudio) {
    musicPreviewAudio.pause();
    musicPreviewAudio.currentTime = 0;
  }
  musicPreviewAudio = null;
  musicPreviewSrc = "";
  const button = document.querySelector("#previewMusicBtn");
  if (button) button.textContent = "Play";
}

async function deleteSelectedMusic() {
  const item = selectedMusicItem();
  if (!item) {
    markStatus("Choose server music to remove");
    return;
  }
  if (map.music?.src === item.src) {
    map.music = null;
  }
  if (musicPreviewSrc === item.src) stopMusicPreview();
  try {
    const response = await fetch(`/api/map-music/${encodeURIComponent(item.filename)}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload.error || "Music could not be removed");
    musicLibrary = musicLibrary.filter((entry) => entry.filename !== item.filename);
    renderMusicLibrary();
    updateMediaStatus();
    changed();
    markStatus(`Removed ${item.name}`);
  } catch (error) {
    markStatus(`Remove failed: ${error.message}`);
  }
}

function selectBackground() {
  if (!map.backgroundImage) {
    markStatus("No floor image loaded");
    return;
  }
  setSelection({ kind: "background", index: 0 });
  syncInspector();
  draw();
}

function selectForeground() {
  if (!map.foregroundImage) {
    markStatus("No foreground image loaded");
    return;
  }
  setSelection({ kind: "foreground", index: 0 });
  syncInspector();
  draw();
}

function clearBackground() {
  map.backgroundImage = null;
  if (selected?.kind === "background") clearSelection();
  syncInspector();
  changed();
  markStatus("Floor image cleared");
}

function clearForeground() {
  map.foregroundImage = null;
  if (selected?.kind === "foreground") clearSelection();
  syncInspector();
  changed();
  markStatus("Foreground image cleared");
}

function clearMusic() {
  if (!map.music) {
    markStatus("No map music loaded");
    return;
  }
  if (musicPreviewSrc === map.music.src) stopMusicPreview();
  map.music = null;
  updateMediaStatus();
  changed();
  markStatus("Map music cleared");
}

function readImageAsset(file, kind = "misc") {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Choose an image file"));
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const src = String(reader.result);
      const image = new Image();
      image.addEventListener("load", async () => {
        try {
          const uploaded = await uploadImageAsset(file, kind, src);
          resolve({
            name: uploaded.name || file.name.replace(/\.[^.]+$/, ""),
            src: uploaded.src,
            naturalWidth: image.naturalWidth || 192,
            naturalHeight: image.naturalHeight || 192,
            mimeType: uploaded.mimeType || file.type,
            size: uploaded.size ?? file.size,
            rotation: 0
          });
        } catch (error) {
          reject(error);
        }
      }, { once: true });
      image.addEventListener("error", () => reject(new Error("Image could not be read")), { once: true });
      image.src = src;
    }, { once: true });
    reader.addEventListener("error", () => reject(new Error("Image could not be read")), { once: true });
    reader.readAsDataURL(file);
  });
}

function uploadImageAsset(file, kind, dataUrl) {
  return fetch("/api/map-images", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: file.name,
      kind,
      mimeType: file.type || "image/png",
      size: file.size,
      dataUrl
    })
  })
    .then(async (response) => {
      const payload = await response.json();
      if (!response.ok || payload.ok === false) throw new Error(payload.error || "Image could not be uploaded");
      return payload.image;
    });
}

function uploadAudioAsset(file) {
  return new Promise((resolve, reject) => {
    const looksLikeMp3 = file.type === "audio/mpeg" || file.type === "audio/mp3" || /\.mp3$/i.test(file.name);
    if (!looksLikeMp3) {
      reject(new Error("Choose an MP3 file"));
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", async () => {
      try {
        const response = await fetch("/api/map-music", {
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
        if (!response.ok || payload.ok === false) throw new Error(payload.error || "MP3 could not be uploaded");
        resolve(payload.music);
      } catch (error) {
        reject(error);
      }
    }, { once: true });
    reader.addEventListener("error", () => reject(new Error("MP3 could not be read")), { once: true });
    reader.readAsDataURL(file);
  });
}

function musicFromLibraryItem(item) {
  const existingVolume = map.music?.src === item.src ? map.music.volume : undefined;
  return {
    name: item.name,
    src: item.src,
    mimeType: item.mimeType || "audio/mpeg",
    size: item.size ?? 0,
    volume: clamp(Number(existingVolume ?? mapMusicVolume.value), 0, 1),
    loop: true
  };
}

function updateMediaStatus() {
  updateImageStatus(floorImageStatus, map.backgroundImage, "Floor");
  updateImageStatus(foregroundImageStatus, map.foregroundImage, "Foreground");
  const musicFilename = filenameForMusic(map.music);
  if (musicFilename) musicLibrarySelect.value = musicFilename;
  const volume = clamp(Number(map.music?.volume ?? 1), 0, 1);
  mapMusicVolume.value = String(volume);
  musicVolumeValue.textContent = `${Math.round(volume * 100)}%`;
  musicVolumeField.classList.toggle("is-disabled", !map.music);
  mapMusicVolume.disabled = !map.music;
  musicStatus.textContent = map.music ? `Music: ${map.music.name}` : "No map music loaded";
}

function updateImageStatus(element, image, label) {
  if (!element) return;
  element.classList.toggle("has-image", Boolean(image?.src));
  element.style.backgroundImage = image?.src ? `linear-gradient(rgba(3, 7, 11, 0.28), rgba(3, 7, 11, 0.78)), url("${image.src}")` : "";
  element.textContent = image?.src ? `${label}: ${image.name || "image"}` : `${label}: none`;
}

function restoreSnapPreference() {
  const saved = localStorage.getItem(snapModePreferenceKey);
  if (saved && [...snapMode.options].some((option) => option.value === saved)) {
    snapMode.value = saved;
  }
  snapToggle.checked = snapMode.value !== "off";
}

function persistSnapPreference() {
  localStorage.setItem(snapModePreferenceKey, snapMode.value);
}

function restoreActorBarrierPreference() {
  respectBarriersToggle.checked = localStorage.getItem(actorBarrierPreferenceKey) === "true";
}

function persistActorBarrierPreference() {
  localStorage.setItem(actorBarrierPreferenceKey, respectBarriersToggle.checked ? "true" : "false");
}

function preloadImage(src) {
  if (!src || imageCache.has(src)) return imageCache.get(src) ?? null;
  const image = new Image();
  image.addEventListener("load", draw, { once: true });
  image.src = src;
  imageCache.set(src, image);
  return image;
}

function handlePointerDown(event) {
  lastPointerEvent = event;
  canvas.setPointerCapture(event.pointerId);
  const segmentTool = activeTool === "wall" || activeTool === "barrier";
  const wallTool = activeTool === "wall" || activeTool === "barrier";
  const wallPoint = segmentTool ? wallDrawPoint(event) : null;
  const point = wallPoint?.point ?? canvasPoint(event);
  const hit = hitTest(point);
  if (segmentTool) {
    if (pointer?.mode === "drawSegment") {
      finishSegmentObject(point);
    } else if (wallPoint.anchor) {
      pointer = { mode: "drawSegment", kind: activeTool, start: point, current: point };
      markStatus("Endpoint linked");
    } else if (wallTool && hit?.kind === "wall") {
      setSelection(hit);
      syncInspector();
      markStatus("Wall selected");
    } else {
      pointer = { mode: "drawSegment", kind: activeTool, start: point, current: point };
      markStatus("Click wall endpoint");
    }
    draw();
    return;
  }
  if (activeTool === "select") {
    const handle = hitResizeHandle(point);
    if (handle && selectedGroup.length <= 1) {
      selectedEndpoint = (selected?.kind === "wall" || selected?.kind === "occluder") && (handle === "start" || handle === "end")
        ? { ref: { ...selected }, endpoint: handle }
        : null;
      pointer = { mode: "resize", handle, start: point, original: cloneObject(readSelection(selected)) };
      canvas.style.cursor = resizeCursor(handle);
      syncInspector();
      draw();
      return;
    }
    selectedEndpoint = null;
    if (event.shiftKey && hit) {
      toggleSelection(hit);
      pointer = null;
      syncInspector();
      draw();
      return;
    }
    if (hit && !isRefSelected(hit)) {
      setSelection(hit);
    } else if (!hit) {
      if (!event.shiftKey) clearSelection();
    }
    pointer = hit
      ? { mode: "move", start: point, originalGroup: selectedGroup.map((ref) => ({ ref: { ...ref }, original: cloneObject(readSelection(ref)) })) }
      : { mode: "marquee", start: point, current: point, additive: event.shiftKey, baseGroup: selectedGroup.map((ref) => ({ ...ref })) };
    syncInspector();
    draw();
    return;
  }
  if (activeTool === "erase") {
    if (hit) {
      setSelection(hit);
      deleteSelection();
    }
    return;
  }
  if (activeTool === "prop" || activeTool === "occluder") {
    pointer = { mode: "drawRect", kind: activeTool, start: point, current: point };
    return;
  }
  addPointObject(activeTool, point);
}

function handlePointerMove(event) {
  lastPointerEvent = event;
  const point = pointer?.mode === "drawSegment"
    ? wallDrawPoint(event).point
    : pointer?.mode === "resize" && (selected?.kind === "wall" || selected?.kind === "occluder") && isSegmentWall(pointer.original)
      ? wallDrawPoint(event, selected).point
      : canvasPoint(event);
  cursorPosition.textContent = `x ${Math.round(point.x)}, y ${Math.round(point.y)}`;
  if (!pointer) {
    updateSelectCursor(point);
    return;
  }
  if (pointer.mode === "drawRect") {
    pointer.current = point;
    draw();
    return;
  }
  if (pointer.mode === "drawSegment") {
    pointer.current = point;
    draw();
    return;
  }
  if (pointer.mode === "marquee") {
    pointer.current = point;
    const rect = normalizeRect(pointer.start, pointer.current);
    const refs = rect.w >= 4 && rect.h >= 4 ? refsInMarquee(rect) : [];
    setSelectionGroup(pointer.additive ? mergeRefs(pointer.baseGroup, refs) : refs);
    syncInspector();
    draw();
    return;
  }
  if (pointer.mode === "move" && selected) {
    moveSelection(point.x - pointer.start.x, point.y - pointer.start.y);
    syncInspector();
    draw();
  }
  if (pointer.mode === "resize" && selected) {
    resizeSelection(point);
    syncInspector();
    draw();
  }
}

function handlePointerUp() {
  if (pointer?.mode === "drawSegment") {
    return;
  }
  if (pointer?.mode === "drawRect") {
    const rect = normalizeRect(pointer.start, pointer.current);
    if (rect.w >= 8 && rect.h >= 8) {
      const target = pointer.kind === "prop"
        ? map.props
        : pointer.kind === "occluder"
          ? map.occluders
          : map.walls;
      let barrierCoverLineMatch = null;
      let object = pointer.kind === "prop"
        ? { ...rect, color: "#26323a" }
        : pointer.kind === "occluder"
          ? normalizeOccluder({ ...rect, name: `Occluder ${map.occluders.length + 1}` })
          : { ...rect, visible: pointer.kind !== "barrier" };
      if (pointer.kind === "occluder") {
        barrierCoverLineMatch = bestBarrierEdgeForOccluder(object);
        if (barrierCoverLineMatch) {
          object = normalizeOccluder({ ...object, depthY: barrierCoverLineMatch.depthY });
        }
      }
      target.push(object);
      setSelection({ kind: pointer.kind === "barrier" ? "wall" : pointer.kind, index: target.length - 1 });
      changed(true, true);
      if (pointer.kind === "occluder") {
        markStatus(barrierCoverLineMatch
          ? `Occluder added. Cover Line matched ${barrierCoverLineMatch.label}`
          : "Occluder added. Drag Cover Line or use Match Barrier");
      }
    }
  }
  if (pointer?.mode === "marquee") {
    const rect = normalizeRect(pointer.start, pointer.current);
    if (rect.w < 4 || rect.h < 4) {
      setSelectionGroup(pointer.additive ? pointer.baseGroup : []);
    }
    if (selectedGroup.length > 1) {
      markStatus(`${selectedGroup.length} items selected`);
    }
  }
  if (pointer?.mode === "move" || pointer?.mode === "resize") {
    commitHistory(pointer.mode === "resize" ? "Resize" : "Move");
    validateMap();
    renderLayerList();
  }
  pointer = null;
  canvas.style.cursor = activeTool === "select" ? "default" : "crosshair";
  syncInspector();
  draw();
}

function finishSegmentObject(point) {
  const start = pointer.start;
  const length = distance(start, point);
  if (length < 8) {
    pointer = { mode: "drawSegment", kind: pointer.kind, start: point, current: point };
    markStatus(pointer.kind === "occluder" ? "Occluder start reset" : "Wall start reset");
    return;
  }
  if (pointer.kind === "occluder") {
    map.occluders.push(normalizeOccluder({
      shape: "segment",
      x: start.x,
      y: start.y,
      x2: point.x,
      y2: point.y,
      thickness: defaultOccluderThickness,
      name: `Occluder ${map.occluders.length + 1}`
    }));
    setSelection({ kind: "occluder", index: map.occluders.length - 1 });
    pointer = null;
    changed(true, true);
    markStatus("Segment occluder added");
    return;
  }
  map.walls.push(normalizeWall({
    shape: "segment",
    x: start.x,
    y: start.y,
    x2: point.x,
    y2: point.y,
    thickness: pointer.kind === "barrier" ? defaultBarrierThickness : defaultWallThickness,
    visible: pointer.kind !== "barrier"
  }));
  setSelection({ kind: "wall", index: map.walls.length - 1 });
  pointer = null;
  changed(true, true);
  markStatus("Angled wall added");
}

function addPointObject(tool, point) {
  if (tool === "decoration") {
    if (!pendingDecoration) {
      markStatus("Load a prop image first");
      return;
    }
    const size = fitImageSize(pendingDecoration, 160, 120);
    map.decorations.push({
      name: pendingDecoration.name,
      src: pendingDecoration.src,
      x: clamp(Math.round(point.x - size.w / 2), 0, world.width - size.w),
      y: clamp(Math.round(point.y - size.h / 2), 0, world.height - size.h),
      w: size.w,
      h: size.h,
      opacity: 1
    });
    setSelection({ kind: "decoration", index: map.decorations.length - 1 });
  } else if (tool === "investigator") {
    const next = map.investigators.length + 2;
    map.investigators.push([point.x, point.y, ["#e76f8a", "#c7a8ff", "#f4e15d", "#7ae4d6"][map.investigators.length % 4], `Player ${next}`]);
    setSelection({ kind: "investigator", index: map.investigators.length - 1 });
  } else if (tool === "anomaly") {
    map.anomaly = [point.x, point.y];
    setSelection({ kind: "anomaly", index: 0 });
  } else if (tool === "battery") {
    map.batteries.push([point.x, point.y]);
    setSelection({ kind: "battery", index: map.batteries.length - 1 });
  } else if (tool === "label") {
    const name = window.prompt("Label name", "ROOM");
    if (!name) return;
    map.labels.push([point.x, point.y, name.trim().toUpperCase()]);
    setSelection({ kind: "label", index: map.labels.length - 1 });
  }
  changed();
}

function fitImageSize(asset, maxWidth, maxHeight) {
  const width = Math.max(1, asset.naturalWidth || maxWidth);
  const height = Math.max(1, asset.naturalHeight || maxHeight);
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    w: Math.max(16, Math.round(width * scale)),
    h: Math.max(16, Math.round(height * scale))
  };
}

function canvasPoint(event, options = {}) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = world.width / rect.width;
  const scaleY = world.height / rect.height;
  const x = clamp((event.clientX - rect.left) * scaleX, 0, world.width);
  const y = clamp((event.clientY - rect.top) * scaleY, 0, world.height);
  if (options.snap === false || !snapToggle.checked || snapMode.value === "off" || event.altKey) return { x: Math.round(x), y: Math.round(y) };
  return snapPoint({ x, y }, snapMode.value);
}

function wallDrawPoint(event, ignoreRef = null) {
  const raw = canvasPoint(event, { snap: false });
  const anchor = event.altKey ? null : wallAnchorHit(raw, ignoreRef);
  if (anchor) return { point: anchor.point, anchor };
  if (!snapToggle.checked || snapMode.value === "off" || event.altKey) return { point: raw, anchor: null };
  return { point: snapPoint(raw, snapMode.value), anchor: null };
}

function snapPoint(point, mode) {
  if (mode === "grid") {
    return { x: Math.round(point.x / gridSize) * gridSize, y: Math.round(point.y / gridSize) * gridSize };
  }
  if (mode === "bounds") {
    return {
      x: nearest(point.x, [0, 92, 96, 1184, 1188, world.width]),
      y: nearest(point.y, [0, 96, 120, 600, 624, world.height])
    };
  }
  const guides = collectSnapGuides();
  return {
    x: nearest(point.x, mode === "centers" ? guides.centerX : guides.edgeX),
    y: nearest(point.y, mode === "centers" ? guides.centerY : guides.edgeY)
  };
}

function nearest(value, guides, threshold = 14) {
  let best = value;
  let bestDistance = threshold + 1;
  for (const guide of guides) {
    const distanceToGuide = Math.abs(value - guide);
    if (distanceToGuide < bestDistance) {
      best = guide;
      bestDistance = distanceToGuide;
    }
  }
  return Math.round(best);
}

function collectSnapGuides() {
  const rects = [...map.walls, ...map.props, ...map.decorations, ...map.occluders, ...(map.backgroundImage ? [map.backgroundImage] : []), ...(map.foregroundImage ? [map.foregroundImage] : [])];
  return rects.reduce((guides, rect) => {
    if (isSegmentWall(rect)) {
      guides.edgeX.push(rect.x, rect.x2);
      guides.edgeY.push(rect.y, rect.y2);
      guides.centerX.push((rect.x + rect.x2) / 2);
      guides.centerY.push((rect.y + rect.y2) / 2);
    } else {
      guides.edgeX.push(rect.x, rect.x + rect.w);
      guides.edgeY.push(rect.y, rect.y + rect.h);
      guides.centerX.push(rect.x + rect.w / 2);
      guides.centerY.push(rect.y + rect.h / 2);
    }
    return guides;
  }, { edgeX: [0, world.width], edgeY: [0, world.height], centerX: [world.width / 2], centerY: [world.height / 2] });
}

function hitTest(point) {
  const actorHits = actorPreviewEntries();
  for (let i = actorHits.length - 1; i >= 0; i -= 1) {
    const actor = actorHits[i];
    if (pointInActorPreview(point, actor)) {
      return { ...actor.ref };
    }
  }
  const pointHits = [
    ...map.batteries.map((spawn, index) => ({ kind: "battery", index, point: spawn })),
    ...map.labels.map((label, index) => ({ kind: "label", index, point: label }))
  ];
  for (let i = pointHits.length - 1; i >= 0; i -= 1) {
    const hit = pointHits[i];
    const radius = getPointHitRadius(hit.kind);
    if (distance(point, { x: hit.point[0], y: hit.point[1] }) <= radius) {
      return { kind: hit.kind, index: hit.index };
    }
  }
  for (let index = map.walls.length - 1; index >= 0; index -= 1) {
    if (pointInWall(point, map.walls[index])) return { kind: "wall", index };
  }
  for (let index = map.props.length - 1; index >= 0; index -= 1) {
    if (pointInRect(point, map.props[index])) return { kind: "prop", index };
  }
  for (let index = map.decorations.length - 1; index >= 0; index -= 1) {
    if (pointInRect(point, map.decorations[index])) return { kind: "decoration", index };
  }
  for (let index = map.occluders.length - 1; index >= 0; index -= 1) {
    if (pointInOccluder(point, map.occluders[index])) return { kind: "occluder", index };
  }
  return null;
}

function pointInActorPreview(point, actor) {
  const bounds = getActorPreviewBounds(actor);
  const radius = getPointHitRadius(actor.ref.kind);
  return (point.x >= bounds.x
    && point.x <= bounds.x + bounds.w
    && point.y >= bounds.y
    && point.y <= bounds.y + bounds.h)
    || distance(point, { x: actor.point[0], y: actor.point[1] }) <= radius;
}

function getPointHitRadius(kind) {
  if (kind === "label") return 44;
  if (kind === "anomaly") return runtimeFootprints.anomaly.radius + 6;
  if (kind === "player" || kind === "investigator") return runtimeFootprints.investigator.radius + 6;
  return 18;
}

function readSelection(ref) {
  if (!ref) return null;
  if (ref.kind === "wall") return map.walls[ref.index];
  if (ref.kind === "prop") return map.props[ref.index];
  if (ref.kind === "decoration") return map.decorations[ref.index];
  if (ref.kind === "background") return map.backgroundImage;
  if (ref.kind === "foreground") return map.foregroundImage;
  if (ref.kind === "occluder") return map.occluders[ref.index];
  if (ref.kind === "player") return { x: map.player[0], y: map.player[1], name: "Host Investigator", color: "#7ae4d6" };
  if (ref.kind === "anomaly") return { x: map.anomaly[0], y: map.anomaly[1], name: "Anomaly", color: "#e76f8a" };
  if (ref.kind === "investigator") {
    const spawn = map.investigators[ref.index];
    return { x: spawn[0], y: spawn[1], color: spawn[2], name: spawn[3] };
  }
  if (ref.kind === "battery") {
    const spawn = map.batteries[ref.index];
    return { x: spawn[0], y: spawn[1], name: `Battery ${ref.index + 1}`, color: "#f4b35d" };
  }
  if (ref.kind === "label") {
    const label = map.labels[ref.index];
    return { x: label[0], y: label[1], name: label[2], color: "#9ed0ff" };
  }
  return null;
}

function writeSelection(ref, next) {
  if (!ref) return;
  const x = clamp(Math.round(next.x ?? 0), 0, world.width);
  const y = clamp(Math.round(next.y ?? 0), 0, world.height);
  if (ref.kind === "wall") {
    const existing = map.walls[ref.index];
    const dx = x - Math.round(existing.x ?? 0);
    const dy = y - Math.round(existing.y ?? 0);
    const current = {
      ...existing,
      ...next,
      x,
      y,
      ...(isSegmentWall(existing) && next.x2 === undefined ? { x2: existing.x2 + dx } : {}),
      ...(isSegmentWall(existing) && next.y2 === undefined ? { y2: existing.y2 + dy } : {})
    };
    map.walls[ref.index] = normalizeWall(current);
  }
  if (ref.kind === "prop") {
    const current = { ...map.props[ref.index], ...next, x, y };
    map.props[ref.index] = { ...clampRect(current), color: current.color ?? "#26323a" };
  }
  if (ref.kind === "decoration") map.decorations[ref.index] = normalizeImageRect({ ...map.decorations[ref.index], ...next, x, y });
  if (ref.kind === "background") map.backgroundImage = normalizeImageRect({ ...map.backgroundImage, ...next, x, y });
  if (ref.kind === "foreground") map.foregroundImage = normalizeImageRect({ ...map.foregroundImage, ...next, x, y });
  if (ref.kind === "occluder") {
    const existing = map.occluders[ref.index];
    if (isSegmentWall(existing)) {
      const dx = x - Math.round(existing.x ?? 0);
      const dy = y - Math.round(existing.y ?? 0);
      map.occluders[ref.index] = normalizeOccluder({
        ...existing,
        ...next,
        x,
        y,
        ...(next.x2 === undefined ? { x2: existing.x2 + dx } : {}),
        ...(next.y2 === undefined ? { y2: existing.y2 + dy } : {})
      });
      return;
    }
    const existingDepthY = existing.depthY ?? existing.y + existing.h;
    const incomingDepthY = Number(next.depthY);
    const depthMoved = Number.isFinite(incomingDepthY) && Math.round(incomingDepthY) !== Math.round(existingDepthY);
    const depthY = depthMoved ? incomingDepthY : existingDepthY + (y - Math.round(existing.y ?? 0));
    map.occluders[ref.index] = normalizeOccluder({ ...existing, ...next, x, y, depthY });
  }
  if (ref.kind === "player") map.player = [x, y];
  if (ref.kind === "anomaly") map.anomaly = [x, y];
  if (ref.kind === "investigator") {
    const current = map.investigators[ref.index];
    map.investigators[ref.index] = [x, y, next.color ?? current[2], next.name ?? current[3]];
  }
  if (ref.kind === "battery") map.batteries[ref.index] = [x, y];
  if (ref.kind === "label") map.labels[ref.index] = [x, y, next.name ?? map.labels[ref.index][2]];
}

function moveSelection(dx, dy) {
  const originals = pointer.originalGroup ?? (pointer.original ? [{ ref: selected, original: pointer.original }] : []);
  if (!originals.length) return;
  for (const item of originals) {
    if (!item.original) continue;
    writeSelection(item.ref, movedSelectionObject(item.ref, item.original, dx, dy));
  }
  updateExport();
}

function movedSelectionObject(ref, original, dx, dy) {
  if (!actorMovementRespectsBarriers(ref)) {
    return {
      ...original,
      x: original.x + dx,
      y: original.y + dy
    };
  }
  const point = moveActorPointWithBarriers(original, dx, dy, getActorCollisionRadius(ref.kind));
  return {
    ...original,
    x: point.x,
    y: point.y
  };
}

function actorMovementRespectsBarriers(ref) {
  return respectBarriersToggle.checked && (ref?.kind === "player" || ref?.kind === "investigator" || ref?.kind === "anomaly");
}

function getActorCollisionRadius(kind) {
  return kind === "anomaly" ? runtimeFootprints.anomaly.radius : runtimeFootprints.investigator.radius;
}

function moveActorPointWithBarriers(original, dx, dy, radius) {
  const circle = {
    x: original.x,
    y: original.y,
    radius
  };
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
  const stepX = dx / steps;
  const stepY = dy / steps;
  for (let index = 0; index < steps; index += 1) {
    moveActorCircleWithBarriers(circle, stepX, stepY);
  }
  return {
    x: clamp(Math.round(circle.x), radius, world.width - radius),
    y: clamp(Math.round(circle.y), radius, world.height - radius)
  };
}

function moveActorCircleWithBarriers(circle, dx, dy) {
  circle.x += dx;
  for (const wall of map.walls) {
    resolveActorCircleObstacle(circle, wall);
  }
  circle.y += dy;
  for (const wall of map.walls) {
    resolveActorCircleObstacle(circle, wall);
  }
  circle.x = clamp(circle.x, circle.radius, world.width - circle.radius);
  circle.y = clamp(circle.y, circle.radius, world.height - circle.radius);
}

function resolveActorCircleObstacle(circle, obstacle) {
  if (isSegmentWall(obstacle)) {
    resolveActorCircleSegment(circle, obstacle);
    return;
  }
  resolveActorCircleRect(circle, obstacle);
}

function resolveActorCircleRect(circle, rect) {
  const bounds = collisionBoundsForObstacle(rect);
  const cx = clamp(circle.x, bounds.x, bounds.x + bounds.w);
  const cy = clamp(circle.y, bounds.y, bounds.y + bounds.h);
  const dx = circle.x - cx;
  const dy = circle.y - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > 0 && dist < circle.radius) {
    const push = circle.radius - dist;
    circle.x += (dx / dist) * push;
    circle.y += (dy / dist) * push;
    return;
  }
  if (dist === 0 && pointInRect(circle, bounds)) {
    const pushes = [
      { dx: bounds.x - circle.x - circle.radius, dy: 0, distance: Math.abs(circle.x - bounds.x) },
      { dx: bounds.x + bounds.w - circle.x + circle.radius, dy: 0, distance: Math.abs(bounds.x + bounds.w - circle.x) },
      { dx: 0, dy: bounds.y - circle.y - circle.radius, distance: Math.abs(circle.y - bounds.y) },
      { dx: 0, dy: bounds.y + bounds.h - circle.y + circle.radius, distance: Math.abs(bounds.y + bounds.h - circle.y) }
    ].sort((a, b) => a.distance - b.distance);
    circle.x += pushes[0].dx;
    circle.y += pushes[0].dy;
  }
}

function resolveActorCircleSegment(circle, segment) {
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

function collisionBoundsForObstacle(obstacle) {
  if (obstacle?.visible !== false || isSegmentWall(obstacle)) {
    return obstacle;
  }
  return {
    ...obstacle,
    x: obstacle.x - barrierCollisionPadding,
    y: obstacle.y,
    w: obstacle.w + barrierCollisionPadding * 2,
    h: obstacle.h
  };
}

function nudgeSelection(event) {
  const step = event.shiftKey ? gridSize : event.altKey ? 1 : 8;
  const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
  const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
  if (nudgeSelectedEndpoint(dx, dy)) {
    event.preventDefault();
    syncInspector();
    changed(true, false);
    commitHistory("Nudge Endpoint");
    return;
  }
  const refs = selectedGroup.length ? selectedGroup : selected ? [selected] : [];
  if (!refs.length) return;
  for (const ref of refs) {
    const current = readSelection(ref);
    if (!current) continue;
    writeSelection(ref, movedSelectionObject(ref, current, dx, dy));
  }
  syncInspector();
  changed(true, false);
  commitHistory("Nudge");
}

function nudgeSelectedEndpoint(dx, dy) {
  if (!selectedEndpoint || selectedGroup.length > 1 || !sameRef(selectedEndpoint.ref, selected)) return false;
  const wall = readSelection(selectedEndpoint.ref);
  if (!isSegmentWall(wall)) return false;
  writeSelection(selectedEndpoint.ref, selectedEndpoint.endpoint === "start"
    ? { ...wall, x: wall.x + dx, y: wall.y + dy, x2: wall.x2, y2: wall.y2 }
    : { ...wall, x: wall.x, y: wall.y, x2: wall.x2 + dx, y2: wall.y2 + dy });
  return true;
}

function copyComponent() {
  const refs = selectedGroup.length > 1 ? selectedGroup : selected ? [selected] : [];
  if (!refs.length || refs.every((ref) => ref.kind === "background" || ref.kind === "foreground")) {
    markStatus("Select a component to copy");
    return;
  }
  if (refs.length > 1) {
    componentClipboard = {
      kind: "group",
      items: refs
        .filter((ref) => ref.kind !== "background" && ref.kind !== "foreground")
        .map((ref) => ({ kind: ref.kind, data: cloneObject(readSelection(ref)) }))
    };
    markStatus(`${componentClipboard.items.length} components copied`);
    return;
  }
  const object = readSelection(selected);
  if (!object || selected.kind === "background" || selected.kind === "foreground") {
    markStatus("Select a component to copy");
    return;
  }
  componentClipboard = {
    kind: selected.kind,
    data: cloneObject(object)
  };
  markStatus(`${componentLabel(selected.kind)} copied`);
}

function pasteComponent() {
  if (!componentClipboard) {
    markStatus("Nothing copied");
    return;
  }
  if (componentClipboard.kind === "group") {
    const pasted = [];
    for (const item of componentClipboard.items ?? []) {
      const ref = pasteComponentItem(item.kind, cloneObject(item.data), 32);
      if (ref) pasted.push(ref);
    }
    setSelectionGroup(pasted);
    syncInspector();
    changed();
    markStatus(`${pasted.length} components pasted`);
    return;
  }
  const pastedRef = pasteComponentItem(componentClipboard.kind, cloneObject(componentClipboard.data), 32);
  if (!pastedRef) {
    markStatus("That component cannot be pasted");
    return;
  }
  setSelection(pastedRef);
  syncInspector();
  changed();
  markStatus(`${componentLabel(componentClipboard.kind)} pasted`);
}

function pasteComponentItem(kind, data, offset) {
  if (kind === "wall") {
    map.walls.push(clampPastedWall({
      ...data,
      x: data.x + offset,
      y: data.y + offset,
      ...(isSegmentWall(data) ? { x2: data.x2 + offset, y2: data.y2 + offset } : {})
    }));
    return { kind: "wall", index: map.walls.length - 1 };
  } else if (kind === "prop") {
    map.props.push({ ...clampPastedRect({ ...data, x: data.x + offset, y: data.y + offset }), color: data.color ?? "#26323a" });
    return { kind: "prop", index: map.props.length - 1 };
  } else if (kind === "decoration") {
    map.decorations.push(normalizeImageRect({ ...data, x: data.x + offset, y: data.y + offset }));
    return { kind: "decoration", index: map.decorations.length - 1 };
  } else if (kind === "occluder") {
    map.occluders.push(normalizeOccluder({
      ...data,
      x: data.x + offset,
      y: data.y + offset,
      ...(isSegmentWall(data) ? { x2: data.x2 + offset, y2: data.y2 + offset } : {})
    }));
    return { kind: "occluder", index: map.occluders.length - 1 };
  } else if (kind === "label") {
    map.labels.push([clamp(data.x + offset, 0, world.width), clamp(data.y + offset, 0, world.height), data.name ?? "ROOM"]);
    return { kind: "label", index: map.labels.length - 1 };
  } else if (kind === "battery") {
    map.batteries.push([clamp(data.x + offset, 0, world.width), clamp(data.y + offset, 0, world.height)]);
    return { kind: "battery", index: map.batteries.length - 1 };
  } else if (kind === "investigator" || kind === "player") {
    const next = map.investigators.length + 2;
    map.investigators.push([
      clamp(data.x + offset, 0, world.width),
      clamp(data.y + offset, 0, world.height),
      data.color ?? "#7ae4d6",
      kind === "player" ? `Player ${next}` : data.name ?? `Player ${next}`
    ]);
    return { kind: "investigator", index: map.investigators.length - 1 };
  } else if (kind === "anomaly") {
    map.anomaly = [clamp(data.x + offset, 0, world.width), clamp(data.y + offset, 0, world.height)];
    return { kind: "anomaly", index: 0 };
  }
  return null;
}

function clampPastedRect(rect) {
  return {
    ...clampRect(rect),
    ...(rect.visible === false ? { visible: false } : {})
  };
}

function clampPastedWall(wall) {
  return normalizeWall(wall);
}

function componentLabel(kind) {
  if (kind === "wall" && componentClipboard?.data?.visible === false) return "Barrier";
  if (kind === "decoration") return "Image";
  if (kind === "occluder") return "Occluder";
  if (kind === "player" || kind === "investigator") return "Investigator";
  return titleCase(kind);
}

function hitResizeHandle(point) {
  const object = readSelection(selected);
  if (!isResizableSelection(selected, object)) return null;
  if (selected?.kind === "wall" && isSegmentWall(object)) {
    return getResizeHandles(object).find((handle) => distance(point, handle) <= wallAnchorHitRadius)?.name ?? null;
  }
  if (selected?.kind === "occluder" && isSegmentWall(object)) {
    return getResizeHandles(object).find((handle) => distance(point, handle) <= wallAnchorHitRadius)?.name ?? null;
  }
  if (selected?.kind === "occluder" && hitOccluderDepthLine(point, object)) {
    return "depth";
  }
  const edge = hitResizeEdge(point, object);
  if (edge) return edge;
  const corners = getResizeHandles(object).filter((handle) => handle.type === "corner");
  return corners.find((handle) => distance(point, handle) <= resizeCornerHitRadius)?.name ?? null;
}

function hitOccluderDepthLine(point, occluder) {
  const depthY = occluder.depthY ?? occluder.y + occluder.h;
  return point.x >= occluder.x
    && point.x <= occluder.x + occluder.w
    && Math.abs(point.y - depthY) <= occluderDepthHitPadding;
}

function hitResizeEdge(point, rect) {
  const x1 = rect.x;
  const x2 = rect.x + rect.w;
  const y1 = rect.y;
  const y2 = rect.y + rect.h;
  const cx = x1 + rect.w / 2;
  const cy = y1 + rect.h / 2;
  const horizontalHalf = Math.min(Math.max(resizeEdgeHandleLength / 2, rect.w * 0.28), Math.max(rect.w / 2 - resizeCornerHitRadius, resizeEdgeHandleLength / 2));
  const verticalHalf = Math.min(Math.max(resizeEdgeHandleLength / 2, rect.h * 0.28), Math.max(rect.h / 2 - resizeCornerHitRadius, resizeEdgeHandleLength / 2));
  if (Math.abs(point.y - y1) <= resizeEdgeHitPadding && point.x >= cx - horizontalHalf && point.x <= cx + horizontalHalf) return "n";
  if (Math.abs(point.y - y2) <= resizeEdgeHitPadding && point.x >= cx - horizontalHalf && point.x <= cx + horizontalHalf) return "s";
  if (Math.abs(point.x - x2) <= resizeEdgeHitPadding && point.y >= cy - verticalHalf && point.y <= cy + verticalHalf) return "e";
  if (Math.abs(point.x - x1) <= resizeEdgeHitPadding && point.y >= cy - verticalHalf && point.y <= cy + verticalHalf) return "w";
  return null;
}

function getResizeHandles(rect) {
  if (isSegmentWall(rect)) {
    return [
      { name: "start", type: "endpoint", x: rect.x, y: rect.y },
      { name: "end", type: "endpoint", x: rect.x2, y: rect.y2 }
    ];
  }
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  return [
    { name: "nw", type: "corner", x: rect.x, y: rect.y },
    { name: "n", type: "edge", x: cx, y: rect.y },
    { name: "ne", type: "corner", x: rect.x + rect.w, y: rect.y },
    { name: "e", type: "edge", x: rect.x + rect.w, y: cy },
    { name: "se", type: "corner", x: rect.x + rect.w, y: rect.y + rect.h },
    { name: "s", type: "edge", x: cx, y: rect.y + rect.h },
    { name: "sw", type: "corner", x: rect.x, y: rect.y + rect.h },
    { name: "w", type: "edge", x: rect.x, y: cy }
  ];
}

function resizeCursor(handle) {
  if (handle === "start" || handle === "end") return "crosshair";
  if (handle === "depth") return "ns-resize";
  if (handle === "n" || handle === "s") return "ns-resize";
  if (handle === "e" || handle === "w") return "ew-resize";
  if (handle === "nw" || handle === "se") return "nwse-resize";
  if (handle === "ne" || handle === "sw") return "nesw-resize";
  return "default";
}

function resizeSelection(point) {
  const original = pointer.original;
  if (!original) return;
  if (selected?.kind === "wall" && isSegmentWall(original)) {
    selectedEndpoint = { ref: { ...selected }, endpoint: pointer.handle };
    writeSelection(selected, pointer.handle === "start"
      ? { ...original, x: point.x, y: point.y, x2: original.x2, y2: original.y2 }
      : { ...original, x: original.x, y: original.y, x2: point.x, y2: point.y });
    updateExport();
    return;
  }
  if (selected?.kind === "occluder" && isSegmentWall(original)) {
    selectedEndpoint = { ref: { ...selected }, endpoint: pointer.handle };
    writeSelection(selected, pointer.handle === "start"
      ? { ...original, x: point.x, y: point.y, x2: original.x2, y2: original.y2 }
      : { ...original, x: original.x, y: original.y, x2: point.x, y2: point.y });
    updateExport();
    return;
  }
  if (selected?.kind === "occluder" && pointer.handle === "depth") {
    writeSelection(selected, {
      ...original,
      depthY: clamp(Math.round(point.y), original.y, original.y + original.h)
    });
    updateExport();
    return;
  }
  const handle = getResizeIntentHandle(pointer.handle, point);
  let left = original.x;
  let top = original.y;
  let right = original.x + original.w;
  let bottom = original.y + original.h;
  if (handle.includes("w")) left = point.x;
  if (handle.includes("e")) right = point.x;
  if (handle.includes("n")) top = point.y;
  if (handle.includes("s")) bottom = point.y;
  const rect = clampRect({
    ...original,
    x: Math.min(left, right),
    y: Math.min(top, bottom),
    w: Math.abs(right - left),
    h: Math.abs(bottom - top)
  });
  writeSelection(selected, rect);
  updateExport();
}

function getResizeIntentHandle(handle, point) {
  if (handle.length < 2 || lastPointerEvent?.shiftKey) return handle;
  const dx = Math.abs(point.x - pointer.start.x);
  const dy = Math.abs(point.y - pointer.start.y);
  if (Math.max(dx, dy) < resizeIntentThreshold) return handle;
  if (dy > dx * resizeIntentRatio) return handle.includes("n") ? "n" : "s";
  if (dx > dy * resizeIntentRatio) return handle.includes("w") ? "w" : "e";
  return handle;
}

function isResizableSelection(ref, object = readSelection(ref)) {
  return Boolean(object && ref && ["wall", "prop", "decoration", "background", "foreground", "occluder"].includes(ref.kind));
}

function updateSelectedFromInspector(key) {
  if (!selected || selectedGroup.length > 1) return;
  const current = readSelection(selected);
  const next = { ...current };
  if (key === "depthYRange") {
    next.depthY = Number(inspector.depthYRange.value);
  } else if (["x", "y", "w", "h", "depthY", "opacity", "rotation"].includes(key)) {
    next[key] = Number(inspector[key].value);
  } else {
    next[key] = inspector[key].value;
  }
  writeSelection(selected, next);
  changed(false, false);
  if (key === "depthY" || key === "depthYRange" || key === "y" || key === "h") {
    syncInspector();
  }
  draw();
}

function setSelectedOccluderFrontEdge(position) {
  const occluder = selected?.kind === "occluder" ? readSelection(selected) : null;
  if (!occluder || isSegmentWall(occluder)) return;
  if (position === "barrier") {
    setSelectedOccluderFrontEdgeFromBarrier(occluder);
    return;
  }
  const values = {
    top: occluder.y,
    middle: occluder.y + occluder.h / 2,
    bottom: occluder.y + occluder.h
  };
  setOccluderFrontEdge(values[position] ?? values.middle);
  markStatus(`Cover Line set to ${titleCase(position)}`);
}

function setSelectedOccluderFrontEdgeFromBarrier(occluder) {
  const match = bestBarrierEdgeForOccluder(occluder);
  if (!match) {
    markStatus("No crossing barrier found for this occluder");
    return;
  }
  setOccluderFrontEdge(match.depthY);
  markStatus(`Cover Line matched ${match.label}`);
}

function bestBarrierEdgeForOccluder(occluder) {
  const matches = map.walls
    .map((wall, index) => barrierEdgeCandidate(occluder, wall, index))
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);
  return matches[0] ?? null;
}

function barrierEdgeCandidate(occluder, wall, index) {
  const occluderBounds = { x: occluder.x, y: occluder.y, w: occluder.w, h: occluder.h };
  const center = { x: occluder.x + occluder.w / 2, y: occluder.y + occluder.h / 2 };
  const isBarrier = wall.visible === false;
  if (isSegmentWall(wall)) {
    const pad = Math.max(wallThickness(wall) / 2, 6);
    const bounds = {
      x: Math.min(wall.x, wall.x2) - pad,
      y: Math.min(wall.y, wall.y2) - pad,
      w: Math.abs(wall.x2 - wall.x) + pad * 2,
      h: Math.abs(wall.y2 - wall.y) + pad * 2
    };
    if (!rectsOverlap(occluderBounds, bounds) && !lineIntersectsRect(wall.x, wall.y, wall.x2, wall.y2, occluderBounds)) {
      return null;
    }
    const point = closestPointOnSegment(center.x, center.y, wall.x, wall.y, wall.x2, wall.y2);
    const depthY = clamp(Math.round(point.y), occluder.y, occluder.y + occluder.h);
    const distanceToCenter = Math.abs(depthY - center.y);
    return {
      depthY,
      label: `${isBarrier ? "Barrier" : "Wall"} ${index + 1}`,
      score: (isBarrier ? 0 : 10000) + distanceToCenter
    };
  }

  if (!rectsOverlap(occluderBounds, wall)) {
    return null;
  }
  const wallTop = wall.y;
  const wallMiddle = wall.y + wall.h / 2;
  const wallBottom = wall.y + wall.h;
  const candidates = [wallTop, wallMiddle, wallBottom]
    .filter((y) => y >= occluder.y && y <= occluder.y + occluder.h);
  const rawDepthY = candidates.length
    ? candidates.sort((a, b) => Math.abs(a - center.y) - Math.abs(b - center.y))[0]
    : wallMiddle;
  const depthY = clamp(Math.round(rawDepthY), occluder.y, occluder.y + occluder.h);
  return {
    depthY,
    label: `${isBarrier ? "Barrier" : "Wall"} ${index + 1}`,
    score: (isBarrier ? 0 : 10000) + Math.abs(depthY - center.y)
  };
}

function nudgeSelectedOccluderFrontEdge(delta) {
  const occluder = selected?.kind === "occluder" ? readSelection(selected) : null;
  if (!occluder || isSegmentWall(occluder) || !Number.isFinite(delta)) return;
  setOccluderFrontEdge((occluder.depthY ?? occluder.y + occluder.h) + delta);
  markStatus(`Cover Line nudged ${delta > 0 ? "+" : ""}${delta}`);
}

function setOccluderFrontEdge(depthY) {
  const occluder = selected?.kind === "occluder" ? readSelection(selected) : null;
  if (!occluder || isSegmentWall(occluder)) return;
  writeSelection(selected, {
    ...occluder,
    depthY: clamp(Math.round(Number(depthY)), occluder.y, occluder.y + occluder.h)
  });
  changed(false, false);
  syncInspector();
  draw();
}

function deleteSelection() {
  if (!selected) return;
  deleteRefs(selectedGroup.length ? selectedGroup : [selected]);
  clearSelection();
  changed();
  syncInspector();
}

function deleteRefs(refs) {
  const byKind = new Map();
  for (const ref of refs) {
    if (!byKind.has(ref.kind)) byKind.set(ref.kind, []);
    byKind.get(ref.kind).push(ref.index);
  }
  for (const index of [...new Set(byKind.get("wall") ?? [])].sort((a, b) => b - a)) map.walls.splice(index, 1);
  for (const index of [...new Set(byKind.get("prop") ?? [])].sort((a, b) => b - a)) map.props.splice(index, 1);
  for (const index of [...new Set(byKind.get("decoration") ?? [])].sort((a, b) => b - a)) map.decorations.splice(index, 1);
  for (const index of [...new Set(byKind.get("occluder") ?? [])].sort((a, b) => b - a)) map.occluders.splice(index, 1);
  for (const index of [...new Set(byKind.get("investigator") ?? [])].sort((a, b) => b - a)) map.investigators.splice(index, 1);
  for (const index of [...new Set(byKind.get("battery") ?? [])].sort((a, b) => b - a)) map.batteries.splice(index, 1);
  for (const index of [...new Set(byKind.get("label") ?? [])].sort((a, b) => b - a)) map.labels.splice(index, 1);
  if (byKind.has("background")) map.backgroundImage = null;
  if (byKind.has("foreground")) map.foregroundImage = null;
  if (byKind.has("player")) map.player = [180, 186];
  if (byKind.has("anomaly")) map.anomaly = [640, 352];
}

function draw() {
  ctx.clearRect(0, 0, world.width, world.height);
  drawFloor();
  drawImageRect(map.backgroundImage, isSelected("background", 0));
  if (gridToggle.checked) drawGrid();
  map.decorations.forEach((decoration, index) => drawImageRect(decoration, isSelected("decoration", index)));
  map.props.forEach((prop, index) => drawRect(prop, prop.color, "#7ae4d6", isSelected("prop", index)));
  drawImageRect(map.foregroundImage, isSelected("foreground", 0));
  drawActorPreviews();
  drawActorOcclusionPreview();
  map.walls.forEach((wall, index) => drawWall(wall, isSelected("wall", index)));
  map.occluders.forEach((occluder, index) => drawOccluder(occluder, isSelected("occluder", index)));
  drawActorPreviewControls();
  if (activeTool === "wall" || activeTool === "barrier" || pointer?.mode === "drawSegment") drawWallAnchors();
  map.labels.forEach((label, index) => drawLabel(label, isSelected("label", index)));
  map.batteries.forEach((battery, index) => drawPoint(battery, "#f4b35d", "B", isSelected("battery", index)));
  if (analysisOverlay) drawAnalysisOverlay();
  drawSelectionHandles();
  if (pointer?.mode === "drawRect") {
    const rect = normalizeRect(pointer.start, pointer.current);
    if (pointer.kind === "occluder") {
      drawOccluder(normalizeOccluder(rect), true);
    } else {
      drawRect(rect, pointer.kind === "barrier" ? "rgba(231,111,138,0.12)" : pointer.kind === "wall" ? "rgba(223,247,255,0.32)" : "rgba(122,228,214,0.28)", "#fff4cf", true, pointer.kind === "barrier");
    }
  }
  if (pointer?.mode === "drawSegment") {
    if (pointer.kind === "occluder") {
      drawOccluder(normalizeOccluder({
        shape: "segment",
        x: pointer.start.x,
        y: pointer.start.y,
        x2: pointer.current.x,
        y2: pointer.current.y,
        thickness: defaultOccluderThickness,
        name: "Occluder"
      }), true);
    } else {
      drawWall({
        shape: "segment",
        x: pointer.start.x,
        y: pointer.start.y,
        x2: pointer.current.x,
        y2: pointer.current.y,
        thickness: pointer.kind === "barrier" ? defaultBarrierThickness : defaultWallThickness,
        visible: pointer.kind !== "barrier"
      }, true);
    }
  }
  if (pointer?.mode === "marquee") {
    drawMarquee(normalizeRect(pointer.start, pointer.current));
  }
}

function drawSelectionHandles() {
  const object = readSelection(selected);
  if (selectedGroup.length > 1 || !isResizableSelection(selected, object)) return;
  ctx.save();
  ctx.strokeStyle = "#061014";
  ctx.lineWidth = 2;
  for (const handle of getResizeHandles(object)) {
    ctx.beginPath();
    ctx.fillStyle = selectedEndpoint
      && sameRef(selectedEndpoint.ref, selected)
      && selectedEndpoint.endpoint === handle.name
        ? "#e76f8a"
        : "#fff4cf";
    if (handle.type === "endpoint") {
      ctx.arc(handle.x, handle.y, 7, 0, Math.PI * 2);
    } else if (handle.type === "edge") {
      const horizontal = handle.name === "n" || handle.name === "s";
      ctx.roundRect(
        handle.x - (horizontal ? resizeEdgeHandleLength / 2 : 5),
        handle.y - (horizontal ? 5 : resizeEdgeHandleLength / 2),
        horizontal ? resizeEdgeHandleLength : 10,
        horizontal ? 10 : resizeEdgeHandleLength,
        4
      );
    } else {
      ctx.rect(handle.x - 5, handle.y - 5, 10, 10);
    }
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawMarquee(rect) {
  ctx.save();
  ctx.fillStyle = "rgba(122, 228, 214, 0.12)";
  ctx.strokeStyle = "#fff4cf";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 8]);
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function drawWallAnchors() {
  ctx.save();
  ctx.fillStyle = activeTool === "barrier" ? "#e76f8a" : activeTool === "occluder" ? "#c7a8ff" : "#fff4cf";
  ctx.strokeStyle = "#061014";
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.9;
  for (const anchor of wallAnchorPoints()) {
    ctx.beginPath();
    ctx.arc(anchor.point.x, anchor.point.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawAnalysisOverlay() {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.font = "800 13px Inter, sans-serif";
  ctx.textAlign = "center";
  for (const spawn of [map.player, ...map.investigators]) {
    ctx.strokeStyle = "rgba(122,228,214,0.55)";
    ctx.fillStyle = "rgba(122,228,214,0.08)";
    ctx.beginPath();
    ctx.arc(spawn[0], spawn[1], 96, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  for (const battery of map.batteries) {
    ctx.strokeStyle = "rgba(244,179,93,0.5)";
    ctx.beginPath();
    ctx.arc(battery[0], battery[1], 80, 0, Math.PI * 2);
    ctx.stroke();
  }
  const blockers = [...map.walls, ...map.props];
  for (const spawn of [map.player, ...map.investigators]) {
    const blocked = segmentBlockedByRects(map.anomaly[0], map.anomaly[1], spawn[0], spawn[1], blockers);
    ctx.strokeStyle = blocked ? "rgba(122,228,214,0.28)" : "rgba(231,111,138,0.68)";
    ctx.setLineDash(blocked ? [8, 8] : []);
    ctx.beginPath();
    ctx.moveTo(map.anomaly[0], map.anomaly[1]);
    ctx.lineTo(spawn[0], spawn[1]);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,244,207,0.92)";
  ctx.fillText("QA: spawn safety, batteries, and opening sightlines", world.width / 2, 54);
  ctx.restore();
}

function drawFloor() {
  const floor = ctx.createLinearGradient(0, 0, world.width, world.height);
  floor.addColorStop(0, map.floor[0]);
  floor.addColorStop(0.45, map.floor[1]);
  floor.addColorStop(1, map.floor[2]);
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, world.width, world.height);
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(226,238,246,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= world.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, world.height);
    ctx.stroke();
  }
  for (let y = 0; y <= world.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(world.width, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRect(rect, fill, stroke, selectedState, dashed = false) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = selectedState ? "#fff4cf" : stroke;
  ctx.lineWidth = selectedState ? 5 : 2;
  if (dashed) ctx.setLineDash([12, 8]);
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function drawOccluder(occluder, selectedState) {
  ctx.save();
  if (isSegmentWall(occluder)) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = occluderThickness(occluder);
    ctx.strokeStyle = "rgba(199,168,255,0.13)";
    ctx.beginPath();
    ctx.moveTo(occluder.x, occluder.y);
    ctx.lineTo(occluder.x2, occluder.y2);
    ctx.stroke();
    ctx.lineWidth = selectedState ? 5 : 2;
    ctx.strokeStyle = selectedState ? "#fff4cf" : "#c7a8ff";
    ctx.setLineDash(selectedState ? [] : [14, 8]);
    ctx.beginPath();
    ctx.moveTo(occluder.x, occluder.y);
    ctx.lineTo(occluder.x2, occluder.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    const cx = (occluder.x + occluder.x2) / 2;
    const cy = (occluder.y + occluder.y2) / 2;
    ctx.fillStyle = "#f8fbfd";
    ctx.font = "900 10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("OCCLUDER", cx, cy - 8);
    ctx.restore();
    return;
  }
  ctx.fillStyle = "rgba(199,168,255,0.12)";
  ctx.strokeStyle = selectedState ? "#fff4cf" : "#c7a8ff";
  ctx.lineWidth = selectedState ? 5 : 2;
  ctx.setLineDash(selectedState ? [] : [14, 8]);
  const depthY = occluder.depthY ?? occluder.y + occluder.h;
  ctx.fillRect(occluder.x, occluder.y, occluder.w, occluder.h);
  if (selectedState) {
    const topHeight = Math.max(0, depthY - occluder.y);
    const bottomY = clamp(depthY, occluder.y, occluder.y + occluder.h);
    ctx.fillStyle = "rgba(199,168,255,0.22)";
    ctx.fillRect(occluder.x, occluder.y, occluder.w, topHeight);
    ctx.fillStyle = "rgba(122,228,214,0.08)";
    ctx.fillRect(occluder.x, bottomY, occluder.w, occluder.y + occluder.h - bottomY);
  }
  ctx.strokeRect(occluder.x, occluder.y, occluder.w, occluder.h);
  ctx.setLineDash([]);
  ctx.strokeStyle = selectedState ? "#fff4cf" : "rgba(255,244,207,0.86)";
  ctx.lineWidth = selectedState ? 4 : 2;
  ctx.beginPath();
  ctx.moveTo(occluder.x, depthY);
  ctx.lineTo(occluder.x + occluder.w, depthY);
  ctx.stroke();
  ctx.fillStyle = selectedState ? "#fff4cf" : "#c7a8ff";
  for (const x of [occluder.x, occluder.x + occluder.w]) {
    ctx.beginPath();
    ctx.arc(x, depthY, selectedState ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f8fbfd";
  ctx.font = "900 10px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(selectedState ? "COVER LINE" : "OCCLUDER", occluder.x + occluder.w / 2, Math.max(occluder.y + 14, depthY - 7));
  if (selectedState && occluder.h >= 52) {
    ctx.fillStyle = "rgba(248,251,253,0.72)";
    ctx.font = "800 9px Inter, sans-serif";
    if (depthY - occluder.y > 22) ctx.fillText("BEHIND", occluder.x + occluder.w / 2, occluder.y + 16);
    if (occluder.y + occluder.h - depthY > 22) ctx.fillText("IN FRONT", occluder.x + occluder.w / 2, occluder.y + occluder.h - 10);
  }
  ctx.restore();
}

function drawWall(wall, selectedState) {
  if (!isSegmentWall(wall)) {
    drawRect(wall, wall.visible === false ? "rgba(231,111,138,0.1)" : "#171f28", wall.visible === false ? "#e76f8a" : "#dff7ff", selectedState, wall.visible === false);
    return;
  }
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = wallThickness(wall);
  ctx.strokeStyle = wall.visible === false ? "rgba(231,111,138,0.14)" : "#171f28";
  if (wall.visible === false) ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(wall.x, wall.y);
  ctx.lineTo(wall.x2, wall.y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = selectedState ? 5 : 2;
  ctx.strokeStyle = selectedState ? "#fff4cf" : wall.visible === false ? "#e76f8a" : "#dff7ff";
  if (wall.visible === false && !selectedState) ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.moveTo(wall.x, wall.y);
  ctx.lineTo(wall.x2, wall.y2);
  ctx.stroke();
  ctx.restore();
}

function drawImageRect(rect, selectedState) {
  if (!rect?.src) return;
  const image = preloadImage(rect.src);
  ctx.save();
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const rotation = ((rect.rotation ?? 0) * Math.PI) / 180;
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.globalAlpha = Number.isFinite(rect.opacity) ? rect.opacity : 1;
  if (image?.complete && image.naturalWidth) {
    ctx.drawImage(image, -rect.w / 2, -rect.h / 2, rect.w, rect.h);
  } else {
    ctx.fillStyle = "rgba(122,228,214,0.12)";
    ctx.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = selectedState ? "#fff4cf" : "rgba(122,228,214,0.4)";
  ctx.lineWidth = selectedState ? 5 : 1.5;
  ctx.setLineDash(rect === map.backgroundImage ? [18, 12] : []);
  ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  ctx.restore();
}

function drawImageOnly(rect, options = {}) {
  if (!rect?.src) return;
  const image = preloadImage(rect.src);
  if (!image?.complete || !image.naturalWidth) return;
  ctx.save();
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const rotation = ((rect.rotation ?? 0) * Math.PI) / 180;
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.globalAlpha = options.forceAlpha ?? (Number.isFinite(rect.opacity) ? rect.opacity : 1);
  ctx.drawImage(image, -rect.w / 2, -rect.h / 2, rect.w, rect.h);
  ctx.restore();
}

function drawActorPreviews() {
  for (const actor of actorPreviewEntries()) {
    drawCharacterPreview(actor);
  }
}

function actorPreviewEntries() {
  return [
    {
      role: "investigator",
      ref: { kind: "player", index: 0 },
      point: map.player,
      color: "#7ae4d6",
      label: "P",
      name: "Host Investigator"
    },
    ...map.investigators.map((spawn, index) => ({
      role: "investigator",
      ref: { kind: "investigator", index },
      point: spawn,
      color: spawn[2] ?? "#c7a8ff",
      label: "I",
      name: spawn[3] || `Investigator ${index + 2}`
    })),
    {
      role: "anomaly",
      ref: { kind: "anomaly", index: 0 },
      point: map.anomaly,
      color: "#e76f8a",
      label: "A",
      name: "Anomaly"
    }
  ];
}

function drawCharacterPreview(actor) {
  if (actor.role === "anomaly") {
    drawAnomalyPreview(actor);
  } else {
    drawInvestigatorPreview(actor);
  }
}

function drawActorPreviewControls() {
  for (const actor of actorPreviewEntries()) {
    drawCharacterPreviewSelection(actor);
  }
}

function drawInvestigatorPreview(actor) {
  const [x, y] = actor.point;
  const color = actor.color ?? "#7ae4d6";
  const stride = Math.sin(performance.now() / 220 + x * 0.02 + y * 0.02) * 2;
  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.beginPath();
  ctx.ellipse(x, y + 3, investigatorPreview.shadowWidth, investigatorPreview.shadowHeight, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = darkenColor(color, 0.42);
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(-7, -8);
  ctx.lineTo(-12, -2 + stride);
  ctx.moveTo(8, -8);
  ctx.lineTo(13, -2 - stride);
  ctx.stroke();

  ctx.fillStyle = darkenColor(color, 0.18);
  ctx.strokeStyle = "#071015";
  ctx.beginPath();
  ctx.roundRect(-15, -56, 30, 46, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -65, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(5, 8, 12, 0.74)";
  ctx.beginPath();
  ctx.roundRect(-8, -68, 16, 9, 4);
  ctx.fill();

  ctx.strokeStyle = lightenColor(color, 0.36);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(10, -43);
  ctx.lineTo(15, -43);
  ctx.stroke();

  ctx.fillStyle = "#e9fbff";
  ctx.strokeStyle = "#071015";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(15, -49, 22, 12, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = lightenColor(color, 0.28);
  ctx.beginPath();
  ctx.roundRect(-12, -31, 24, 10, 5);
  ctx.fill();
  ctx.restore();
}

function drawAnomalyPreview(actor) {
  const [x, y] = actor.point;
  const image = preloadImage(anomalyAtlasSrc);
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 32, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = "#7ae4d6";
  ctx.shadowBlur = 18;
  if (image?.complete && image.naturalWidth) {
    const frame = Math.floor(performance.now() / 180) % 4;
    const row = 1;
    const size = anomalyPreview.size;
    ctx.globalAlpha = 0.92;
    ctx.drawImage(
      image,
      frame * anomalyAtlasFrame,
      row * anomalyAtlasFrame,
      anomalyAtlasFrame,
      anomalyAtlasFrame,
      -size / 2,
      -size / 2,
      size,
      size
    );
  } else {
    drawFallbackAnomalyPreview();
  }
  ctx.restore();
}

function drawFallbackAnomalyPreview() {
  const pulse = Math.sin(performance.now() / 260) * 4;
  const aura = ctx.createRadialGradient(0, 0, 8, 0, 0, 46 + pulse);
  aura.addColorStop(0, "rgba(122, 228, 214, 0.34)");
  aura.addColorStop(1, "rgba(122, 228, 214, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 50 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(159, 242, 231, 0.78)";
  ctx.strokeStyle = "rgba(5, 44, 48, 0.82)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-24, -26);
  ctx.quadraticCurveTo(6, -52, 29, -22);
  ctx.quadraticCurveTo(45, 0, 24, 26);
  ctx.quadraticCurveTo(8, 42, -18, 30);
  ctx.quadraticCurveTo(-45, 15, -30, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawCharacterPreviewSelection(actor) {
  const selectedState = isRefSelected(actor.ref);
  const [x, y] = actor.point;
  const radius = actor.role === "anomaly" ? anomalyPreview.radius : investigatorPreview.radius;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = selectedState ? "#fff4cf" : actor.color;
  ctx.lineWidth = selectedState ? 4 : 2;
  ctx.globalAlpha = selectedState ? 1 : 0.68;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 7, -0.8, 0.8);
  ctx.stroke();
  ctx.globalAlpha = selectedState ? 0.95 : 0.72;
  ctx.fillStyle = selectedState ? "#fff4cf" : "rgba(5, 7, 10, 0.78)";
  ctx.strokeStyle = selectedState ? "rgba(5, 7, 10, 0.9)" : actor.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = selectedState ? "#071015" : "#f8fbfd";
  ctx.font = "900 9px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(actor.label, 0, 0.5);
  if (selectedState) {
    ctx.fillStyle = "#fff4cf";
    ctx.font = "900 10px Inter, sans-serif";
    ctx.fillText(actor.name, 0, actor.role === "anomaly" ? -48 : -96);
  }
  ctx.restore();
}

function drawActorOcclusionPreview() {
  if (!map.foregroundImage?.src || !map.occluders.length) {
    return;
  }
  const actors = actorPreviewEntries();
  for (const occluder of map.occluders) {
    if (!actors.some((actor) => actorBehindOccluderPreview(actor, occluder))) {
      continue;
    }
    ctx.save();
    clipOccluderPreview(occluder);
    drawImageOnly(map.foregroundImage);
    ctx.restore();
  }
}

function actorBehindOccluderPreview(actor, occluder) {
  const bounds = getActorPreviewBounds(actor);
  const depthY = actor.role === "anomaly" ? actor.point[1] + anomalyPreview.radius : actor.point[1];
  return depthY < occluderDepthYAtPreview(occluder, actor.point[0], depthY) && boundsOverlap(bounds, occluderBounds(occluder));
}

function getActorPreviewBounds(actor) {
  const [x, y] = actor.point;
  if (actor.role === "anomaly") {
    const size = anomalyPreview.size;
    return { x: x - size / 2, y: y - size / 2, w: size, h: size };
  }
  return {
    x: x - investigatorPreview.width / 2,
    y: y - investigatorPreview.height,
    w: investigatorPreview.width,
    h: investigatorPreview.height + 10
  };
}

function occluderDepthYAtPreview(occluder, x, y) {
  if (!isSegmentWall(occluder)) {
    return Number(occluder.depthY ?? occluder.y + occluder.h);
  }
  return closestPointOnSegment(x, y, occluder.x, occluder.y, occluder.x2, occluder.y2).y;
}

function occluderBounds(occluder) {
  if (!isSegmentWall(occluder)) {
    return occluder;
  }
  const pad = occluderThickness(occluder) / 2;
  return {
    x: Math.min(occluder.x, occluder.x2) - pad,
    y: Math.min(occluder.y, occluder.y2) - pad,
    w: Math.abs(occluder.x2 - occluder.x) + pad * 2,
    h: Math.abs(occluder.y2 - occluder.y) + pad * 2
  };
}

function clipOccluderPreview(occluder) {
  ctx.beginPath();
  if (isSegmentWall(occluder)) {
    const thickness = occluderThickness(occluder);
    const dx = occluder.x2 - occluder.x;
    const dy = occluder.y2 - occluder.y;
    const length = Math.hypot(dx, dy) || 1;
    const px = (-dy / length) * (thickness / 2);
    const py = (dx / length) * (thickness / 2);
    ctx.moveTo(occluder.x + px, occluder.y + py);
    ctx.lineTo(occluder.x2 + px, occluder.y2 + py);
    ctx.lineTo(occluder.x2 - px, occluder.y2 - py);
    ctx.lineTo(occluder.x - px, occluder.y - py);
    ctx.closePath();
  } else {
    ctx.rect(occluder.x, occluder.y, occluder.w, occluder.h);
  }
  ctx.clip();
}

function boundsOverlap(a, b) {
  return a.x + a.w >= b.x
    && a.x <= b.x + b.w
    && a.y + a.h >= b.y
    && a.y <= b.y + b.h;
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

function drawPoint(point, color, label, selectedState, footprint = null, title = "") {
  const radius = footprint?.radius ?? 14;
  ctx.save();
  ctx.translate(point[0], point[1]);
  if (footprint) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = selectedState ? "#fff4cf" : color;
    ctx.lineWidth = selectedState ? 4 : 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = selectedState ? "rgba(255,244,207,0.9)" : "rgba(223,247,255,0.58)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);
    ctx.setLineDash([]);
  }
  ctx.fillStyle = color;
  ctx.strokeStyle = selectedState ? "#fff4cf" : "rgba(5,7,10,0.88)";
  ctx.lineWidth = selectedState ? 5 : 3;
  ctx.beginPath();
  ctx.arc(0, 0, Math.min(14, radius), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#061014";
  ctx.font = "900 12px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 0, 1);
  if (footprint) {
    ctx.fillStyle = "rgba(223,247,255,0.78)";
    ctx.font = "800 9px Inter, sans-serif";
    ctx.fillText(footprint.boundsLabel, 0, radius + 11);
    if (title) {
      ctx.font = "800 8px Inter, sans-serif";
      ctx.fillText(title, 0, -radius - 8);
    }
  }
  ctx.restore();
}

function drawLabel(label, selectedState) {
  ctx.save();
  ctx.font = "900 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = selectedState ? 5 : 3;
  ctx.strokeStyle = selectedState ? "#fff4cf" : "rgba(2,5,8,0.88)";
  ctx.fillStyle = "#dff7ff";
  ctx.strokeText(label[2], label[0], label[1]);
  ctx.fillText(label[2], label[0], label[1]);
  ctx.restore();
}

function syncForm() {
  preloadMapImages();
  updateMediaStatus();
  mapName.value = map.name;
  floorInputs.forEach((input, index) => {
    input.value = map.floor[index];
  });
  syncInspector();
  changed(false);
  draw();
}

function preloadMapImages() {
  if (map.backgroundImage?.src) preloadImage(map.backgroundImage.src);
  if (map.foregroundImage?.src) preloadImage(map.foregroundImage.src);
  for (const decoration of map.decorations) {
    preloadImage(decoration.src);
  }
}

function syncInspector() {
  const object = readSelection(selected);
  renderLayerList();
  if (selectedGroup.length > 1) {
    inspectorEmpty.textContent = `${selectedGroup.length} items selected`;
    inspectorEmpty.hidden = false;
    inspectorFields.hidden = true;
    return;
  }
  inspectorEmpty.textContent = "No selection";
  inspectorEmpty.hidden = Boolean(object);
  inspectorFields.hidden = !object;
  if (!object) return;
  const rectLike = (selected.kind === "wall" && !isSegmentWall(object)) || selected.kind === "prop" || selected.kind === "decoration" || selected.kind === "background" || selected.kind === "foreground" || (selected.kind === "occluder" && !isSegmentWall(object));
  const nameLike = ["player", "investigator", "battery", "label", "anomaly", "decoration", "background", "foreground", "occluder"].includes(selected.kind);
  const colorLike = selected.kind === "prop" || selected.kind === "investigator";
  const opacityLike = selected.kind === "decoration" || selected.kind === "background" || selected.kind === "foreground";
  inspector.type.value = selected.kind === "wall" && object.visible === false ? "Invisible Barrier" : selected.kind === "wall" && isSegmentWall(object) ? "Angled Wall" : selected.kind === "occluder" && isSegmentWall(object) ? "Segment Occluder" : titleCase(selected.kind);
  inspector.x.value = Math.round(object.x);
  inspector.y.value = Math.round(object.y);
  inspector.w.value = Math.round(object.w ?? 0);
  inspector.h.value = Math.round(object.h ?? 0);
  const depthY = Math.round(object.depthY ?? object.y + (object.h ?? 0));
  const depthMin = Math.round(object.y ?? 0);
  const depthMax = Math.round((object.y ?? 0) + (object.h ?? 0));
  inspector.depthY.value = depthY;
  inspector.depthY.min = depthMin;
  inspector.depthY.max = depthMax;
  inspector.depthYRange.value = depthY;
  inspector.depthYRange.min = depthMin;
  inspector.depthYRange.max = depthMax;
  inspector.frontEdgeValue.textContent = `y ${depthY}`;
  inspector.name.value = object.name ?? "";
  inspector.color.value = object.color ?? "#7ae4d6";
  inspector.opacity.value = object.opacity ?? 1;
  inspector.rotation.value = object.rotation ?? 0;
  inspector.sizeFields.hidden = !rectLike;
  inspector.nameField.hidden = !nameLike;
  inspector.colorField.hidden = !colorLike;
  inspector.opacityField.hidden = !opacityLike;
  inspector.rotationField.hidden = !opacityLike;
  inspector.depthField.hidden = !(selected.kind === "occluder" && !isSegmentWall(object));
}

function setExportMode(mode) {
  exportMode = mode;
  updateExport();
  markStatus(`${mode === "game" ? "Game" : "Tiled"} JSON ready`);
}

function updateExport() {
  lastExport = JSON.stringify(exportMode === "game" ? toGameMap() : toTiledMap(), null, 2);
  exportOutput.value = lastExport;
  objectCount.textContent = `${countObjects()} objects`;
}

async function copyExport() {
  updateExport();
  await navigator.clipboard.writeText(lastExport);
  markStatus("JSON copied");
}

function downloadExport() {
  updateExport();
  const blob = new Blob([`${lastExport}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const slug = slugify(map.name);
  anchor.href = url;
  anchor.download = exportMode === "game" ? `${slug}.game-map.json` : `${slug}.tiled.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  markStatus("Download started");
}

async function importJsonFile() {
  const [file] = importFile.files;
  if (!file) return;
  try {
    const incoming = JSON.parse(await file.text());
    map = incoming.type === "map" ? fromTiledMap(incoming) : normalizeGameMap(incoming);
    activeSaveSlot = "";
    rememberLastLoadedMap("");
    clearSelection();
    syncForm();
    renderSavedMaps("");
    markStatus("Import loaded");
  } catch (error) {
    markStatus(`Import failed: ${error.message}`);
  } finally {
    importFile.value = "";
  }
}

function validateMap() {
  const errors = [];
  const warnings = [];
  const blockers = [...map.walls, ...map.props];
  const points = [
    ["host investigator", map.player],
    ["anomaly", map.anomaly],
    ...map.investigators.map((spawn, index) => [`investigator ${index + 2}`, spawn]),
    ...map.batteries.map((spawn, index) => [`battery ${index + 1}`, spawn])
  ];
  if (!map.name.trim()) errors.push("Map name is required.");
  if (map.investigators.length + 1 < 2) errors.push("Add at least two investigator spawns.");
  if (map.investigators.length + 1 > 5) warnings.push("More than five investigator spawns may crowd phone-controller party play.");
  if (map.batteries.length < 3) errors.push("Add at least three battery spawns.");
  [...map.walls, ...map.props, ...map.decorations, ...map.occluders, ...(map.backgroundImage ? [map.backgroundImage] : []), ...(map.foregroundImage ? [map.foregroundImage] : [])].forEach((rect, index) => {
    if (isSegmentWall(rect)) {
      if (distance({ x: rect.x, y: rect.y }, { x: rect.x2, y: rect.y2 }) < 8) errors.push(`Angled wall ${index + 1} needs two distinct points.`);
      if (!pointObjectInBounds({ x: rect.x, y: rect.y }) || !pointObjectInBounds({ x: rect.x2, y: rect.y2 })) errors.push(`Angled wall ${index + 1} is outside the 1280 x 720 playfield.`);
      return;
    }
    if (rect.w <= 0 || rect.h <= 0) errors.push(`Rectangle ${index + 1} needs positive width and height.`);
    if (!rectInBounds(rect)) errors.push(`Rectangle ${index + 1} is outside the 1280 x 720 playfield.`);
  });
  points.forEach(([name, point]) => {
    if (!pointInBounds(point)) errors.push(`${name} is outside the playfield.`);
    if (blockers.some((rect) => pointInBlocker({ x: point[0], y: point[1] }, rect))) errors.push(`${name} is inside collision or a prop.`);
  });
  const collisionArea = map.walls.reduce((sum, rect) => sum + obstacleArea(rect), 0);
  if (collisionArea < 48000) warnings.push("Collision coverage is light; add rooms, corridors, or line-of-sight breaks.");
  validationSummary.classList.remove("is-ok", "has-errors");
  validationList.innerHTML = "";
  const messages = [...errors, ...warnings];
  if (errors.length) {
    validationSummary.textContent = `${errors.length} blockers, ${warnings.length} warnings`;
    validationSummary.classList.add("has-errors");
  } else {
    validationSummary.textContent = warnings.length ? `Ready with ${warnings.length} warnings` : "Ready for export";
    validationSummary.classList.add("is-ok");
  }
  messages.forEach((message) => {
    const item = document.createElement("li");
    item.textContent = message;
    validationList.append(item);
  });
  if (!messages.length) {
    const item = document.createElement("li");
    item.textContent = "No validation issues found.";
    validationList.append(item);
  }
}

function changed(runValidation = true, recordHistory = true) {
  updateMediaStatus();
  updateExport();
  if (runValidation) validateMap();
  renderLayerList();
  if (recordHistory) commitHistory("Edit");
  draw();
}

function markStatus(message) {
  window.clearTimeout(statusTimer);
  activeToolEl.textContent = message;
  statusTimer = window.setTimeout(() => {
    activeToolEl.textContent = titleCase(activeTool);
  }, 1600);
}

function toGameMap() {
  return {
    name: map.name,
    size: { ...defaultMapSize, ...(map.size ?? {}) },
    floor: [...map.floor],
    event: { ...map.event },
    player: [...map.player],
    anomaly: [...map.anomaly],
    investigators: map.investigators.map((spawn) => [...spawn]),
    batteries: map.batteries.map((spawn) => [...spawn]),
    relays: [],
    labels: map.labels.map((label) => [...label]),
    backgroundImage: map.backgroundImage ? { ...map.backgroundImage } : null,
    foregroundImage: map.foregroundImage ? { ...map.foregroundImage } : null,
    decorations: map.decorations.map((decoration) => ({ ...decoration })),
    occluders: map.occluders.map((occluder) => ({ ...occluder })),
    music: map.music ? { ...map.music } : null,
    walls: map.walls.map(serializeWall),
    props: map.props.map((prop) => ({ x: prop.x, y: prop.y, w: prop.w, h: prop.h, color: prop.color }))
  };
}

function toTiledMap() {
  let id = 1;
  let layerId = 1;
  const makeProperties = (entries) => Object.entries(entries)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([name, value]) => ({ name, type: "string", value }));
  const objectLayer = (name, objects) => ({ id: layerId++, name, type: "objectgroup", objects });
  return {
    type: "map",
    version: "1.10",
    tiledversion: "1.11.0",
    orientation: "orthogonal",
    renderorder: "right-down",
    width: 80,
    height: 45,
    tilewidth: 16,
    tileheight: 16,
    infinite: false,
    properties: makeProperties({
      name: map.name,
      musicName: map.music?.name,
      musicSrc: map.music?.src,
      musicMimeType: map.music?.mimeType,
      musicVolume: map.music ? String(map.music.volume ?? 1) : "",
      musicLoop: map.music ? "true" : ""
    }),
    layers: [
      ...(map.backgroundImage ? [{
        id: layerId++,
        name: "art-background",
        type: "imagelayer",
        image: map.backgroundImage.src,
        x: map.backgroundImage.x,
        y: map.backgroundImage.y,
        imagewidth: map.backgroundImage.w,
        imageheight: map.backgroundImage.h,
        opacity: map.backgroundImage.opacity ?? 1,
        properties: makeProperties({ name: map.backgroundImage.name, rotation: String(map.backgroundImage.rotation ?? 0), embedded: "true" })
      }] : []),
      ...(map.foregroundImage ? [{
        id: layerId++,
        name: "art-foreground",
        type: "imagelayer",
        image: map.foregroundImage.src,
        x: map.foregroundImage.x,
        y: map.foregroundImage.y,
        imagewidth: map.foregroundImage.w,
        imageheight: map.foregroundImage.h,
        opacity: map.foregroundImage.opacity ?? 1,
        properties: makeProperties({ name: map.foregroundImage.name, rotation: String(map.foregroundImage.rotation ?? 0), embedded: "true" })
      }] : []),
      objectLayer("collision", map.walls.map((wall, index) => {
        const base = {
          id: id++,
          name: wall.visible === false ? `barrier-${index + 1}` : `wall-${index + 1}`,
          type: "wall",
          x: wall.x,
          y: wall.y,
          properties: makeProperties({
            visible: wall.visible === false ? "false" : "",
            shape: isSegmentWall(wall) ? "segment" : "",
            thickness: isSegmentWall(wall) ? String(wallThickness(wall)) : ""
          })
        };
        return isSegmentWall(wall)
          ? { ...base, polyline: [{ x: 0, y: 0 }, { x: wall.x2 - wall.x, y: wall.y2 - wall.y }] }
          : { ...base, width: wall.w, height: wall.h };
      })),
      objectLayer("props", map.props.map((prop, index) => ({
        id: id++,
        name: `prop-${index + 1}`,
        type: "prop",
        x: prop.x,
        y: prop.y,
        width: prop.w,
        height: prop.h,
        properties: makeProperties({ color: prop.color })
      }))),
      objectLayer("decorations", map.decorations.map((decoration, index) => ({
        id: id++,
        name: decoration.name || `decoration-${index + 1}`,
        type: "decoration",
        x: decoration.x,
        y: decoration.y,
        width: decoration.w,
        height: decoration.h,
        properties: makeProperties({
          image: decoration.src,
          opacity: String(decoration.opacity ?? 1),
          rotation: String(decoration.rotation ?? 0),
          blocking: "false",
          embedded: "true"
        })
      }))),
      objectLayer("occluders", map.occluders.map((occluder, index) => ({
        id: id++,
        name: occluder.name || `occluder-${index + 1}`,
        type: "occluder",
        x: occluder.x,
        y: occluder.y,
        width: isSegmentWall(occluder) ? Math.abs(occluder.x2 - occluder.x) : occluder.w,
        height: isSegmentWall(occluder) ? Math.abs(occluder.y2 - occluder.y) : occluder.h,
        properties: makeProperties({
          depthY: isSegmentWall(occluder) ? "" : String(occluder.depthY ?? occluder.y + occluder.h),
          shape: isSegmentWall(occluder) ? "segment" : "",
          x2: isSegmentWall(occluder) ? String(occluder.x2) : "",
          y2: isSegmentWall(occluder) ? String(occluder.y2) : "",
          thickness: isSegmentWall(occluder) ? String(occluderThickness(occluder)) : ""
        })
      }))),
      objectLayer("spawns", [
        { id: id++, name: "host-investigator", type: "investigatorSpawn", x: map.player[0], y: map.player[1] },
        ...map.investigators.map((spawn, index) => ({
          id: id++,
          name: `investigator-${index + 2}`,
          type: "investigatorSpawn",
          x: spawn[0],
          y: spawn[1],
          properties: makeProperties({ name: spawn[3], color: spawn[2] })
        })),
        { id: id++, name: "anomaly", type: "anomalySpawn", x: map.anomaly[0], y: map.anomaly[1] }
      ]),
      objectLayer("batteries", map.batteries.map((spawn, index) => ({
        id: id++,
        name: `battery-${index + 1}`,
        type: "batterySpawn",
        x: spawn[0],
        y: spawn[1]
      }))),
      objectLayer("labels", map.labels.map((label) => ({
        id: id++,
        name: label[2],
        type: "label",
        x: label[0],
        y: label[1]
      })))
    ]
  };
}

function fromTiledMap(tiled) {
  const layers = new Map((tiled.layers ?? []).map((layer) => [layer.name, layer]));
  const objects = (layerName, type) => (layers.get(layerName)?.objects ?? []).filter((object) => object.type === type);
  const prop = (owner, name, fallback) => owner?.properties?.find((item) => item.name === name)?.value ?? fallback;
  const rect = (object) => normalizeWall(object.polyline?.length >= 2 ? {
    shape: "segment",
    x: Math.round(object.x ?? 0),
    y: Math.round(object.y ?? 0),
    x2: Math.round((object.x ?? 0) + object.polyline[1].x),
    y2: Math.round((object.y ?? 0) + object.polyline[1].y),
    thickness: Number(prop(object, "thickness", String(prop(object, "visible", "true")) === "false" ? defaultBarrierThickness : defaultWallThickness)),
    ...(String(prop(object, "visible", "true")) === "false" ? { visible: false } : {})
  } : {
    x: Math.round(object.x ?? 0),
    y: Math.round(object.y ?? 0),
    w: Math.round(object.width ?? 0),
    h: Math.round(object.height ?? 0),
    ...(String(prop(object, "visible", "true")) === "false" ? { visible: false } : {})
  });
  const point = (object, fallback) => object ? [Math.round(object.x ?? 0), Math.round(object.y ?? 0)] : fallback;
  const investigatorSpawns = objects("spawns", "investigatorSpawn");
  const backgroundLayer = (tiled.layers ?? []).find((layer) => layer.type === "imagelayer" && layer.name === "art-background");
  const foregroundLayer = (tiled.layers ?? []).find((layer) => layer.type === "imagelayer" && layer.name === "art-foreground");
  return normalizeGameMap({
    name: prop(tiled, "name", tiled.name ?? "Imported Map"),
    size: {
      width: Number(tiled.width ?? 80) * Number(tiled.tilewidth ?? 16),
      height: Number(tiled.height ?? 45) * Number(tiled.tileheight ?? 16),
      aspectRatio: "16:9"
    },
    floor: ["#17151a", "#2a1922", "#2a2f1d"],
    event: defaultEvent,
    player: point(investigatorSpawns[0], [180, 186]),
    anomaly: point(objects("spawns", "anomalySpawn")[0], [640, 352]),
    investigators: investigatorSpawns.slice(1).map((object, index) => [
      Math.round(object.x ?? 0),
      Math.round(object.y ?? 0),
      prop(object, "color", ["#e76f8a", "#c7a8ff", "#f4e15d"][index] ?? "#7ae4d6"),
      prop(object, "name", object.name || `Player ${index + 2}`)
    ]),
    batteries: objects("batteries", "batterySpawn").map((object) => point(object, [0, 0])),
    labels: objects("labels", "label").map((object) => [Math.round(object.x ?? 0), Math.round(object.y ?? 0), object.name || "ROOM"]),
    backgroundImage: backgroundLayer?.image ? {
      name: prop(backgroundLayer, "name", backgroundLayer.name || "Floor Image"),
      src: backgroundLayer.image,
      x: Math.round(backgroundLayer.x ?? backgroundLayer.offsetx ?? 0),
      y: Math.round(backgroundLayer.y ?? backgroundLayer.offsety ?? 0),
      w: Math.round(backgroundLayer.imagewidth ?? backgroundLayer.width ?? world.width),
      h: Math.round(backgroundLayer.imageheight ?? backgroundLayer.height ?? world.height),
      opacity: Number(backgroundLayer.opacity ?? 1),
      rotation: Number(prop(backgroundLayer, "rotation", 0))
    } : null,
    foregroundImage: foregroundLayer?.image ? {
      name: prop(foregroundLayer, "name", foregroundLayer.name || "Foreground Image"),
      src: foregroundLayer.image,
      x: Math.round(foregroundLayer.x ?? foregroundLayer.offsetx ?? 0),
      y: Math.round(foregroundLayer.y ?? foregroundLayer.offsety ?? 0),
      w: Math.round(foregroundLayer.imagewidth ?? foregroundLayer.width ?? world.width),
      h: Math.round(foregroundLayer.imageheight ?? foregroundLayer.height ?? world.height),
      opacity: Number(foregroundLayer.opacity ?? 1),
      rotation: Number(prop(foregroundLayer, "rotation", 0))
    } : null,
    decorations: objects("decorations", "decoration").map((object, index) => ({
      name: object.name || `Decoration ${index + 1}`,
      src: prop(object, "image", ""),
      x: Math.round(object.x ?? 0),
      y: Math.round(object.y ?? 0),
      w: Math.round(object.width ?? 96),
      h: Math.round(object.height ?? 96),
      opacity: Number(prop(object, "opacity", 1)),
      rotation: Number(prop(object, "rotation", 0))
    })),
    occluders: objects("occluders", "occluder").map((object, index) => {
      const x2 = prop(object, "x2", "");
      const y2 = prop(object, "y2", "");
      return normalizeOccluder({
        name: object.name || `Occluder ${index + 1}`,
        shape: prop(object, "shape", ""),
        x: Math.round(object.x ?? 0),
        y: Math.round(object.y ?? 0),
        ...(x2 !== "" ? { x2: Number(x2) } : {}),
        ...(y2 !== "" ? { y2: Number(y2) } : {}),
        thickness: Number(prop(object, "thickness", defaultOccluderThickness)),
        w: Math.round(object.width ?? 96),
        h: Math.round(object.height ?? 96),
        depthY: Number(prop(object, "depthY", Number(object.y ?? 0) + Number(object.height ?? 96)))
      });
    }),
    music: prop(tiled, "musicSrc", "") ? {
      name: prop(tiled, "musicName", "Map Music"),
      src: prop(tiled, "musicSrc", ""),
      mimeType: prop(tiled, "musicMimeType", "audio/mpeg"),
      volume: Number(prop(tiled, "musicVolume", 1)),
      loop: String(prop(tiled, "musicLoop", "true")) !== "false"
    } : null,
    walls: objects("collision", "wall").map(rect),
    props: objects("props", "prop").map((object) => ({ ...rect(object), color: prop(object, "color", "#26323a") }))
  });
}

function normalizeGameMap(source) {
  return {
    name: String(source.name ?? "Untitled Map"),
    size: normalizeMapSize(source.size),
    floor: normalizeFloor(source.floor),
    event: { ...defaultEvent, ...(source.event ?? {}) },
    player: normalizePoint(source.player, [180, 186]),
    anomaly: normalizePoint(source.anomaly, [640, 352]),
    investigators: (source.investigators ?? []).map((spawn, index) => [
      Math.round(Number(spawn[0] ?? 0)),
      Math.round(Number(spawn[1] ?? 0)),
      String(spawn[2] ?? ["#e76f8a", "#c7a8ff", "#f4e15d"][index] ?? "#7ae4d6"),
      String(spawn[3] ?? `Player ${index + 2}`)
    ]),
    batteries: (source.batteries ?? []).map((spawn) => normalizePoint(spawn, [0, 0])),
    relays: [],
    labels: (source.labels ?? []).map((label) => [
      Math.round(Number(label[0] ?? 0)),
      Math.round(Number(label[1] ?? 0)),
      String(label[2] ?? "ROOM")
    ]),
    backgroundImage: source.backgroundImage ? normalizeImageRect(source.backgroundImage) : null,
    foregroundImage: source.foregroundImage ? normalizeImageRect(source.foregroundImage) : null,
    decorations: (source.decorations ?? []).filter((decoration) => decoration?.src).map(normalizeImageRect),
    occluders: (source.occluders ?? []).map(normalizeOccluder),
    music: source.music ? normalizeMusic(source.music) : null,
    walls: (source.walls ?? []).map(normalizeWall),
    props: (source.props ?? []).map((prop) => ({ ...clampRect(prop), color: String(prop.color ?? "#26323a") }))
  };
}

function makeNewMap() {
  return {
    name: "New Party Map",
    size: defaultMapSize,
    floor: ["#111b22", "#17151f", "#21171d"],
    event: defaultEvent,
    player: [192, 192],
    anomaly: [640, 360],
    investigators: [[1088, 192, "#e76f8a", "Rowan"]],
    batteries: [[192, 528], [640, 528], [1088, 528]],
    labels: [[640, 176, "HALL"]],
    backgroundImage: null,
    foregroundImage: null,
    decorations: [],
    occluders: [],
    music: null,
    walls: [
      { x: 96, y: 96, w: 1088, h: 24 },
      { x: 96, y: 600, w: 1088, h: 24 },
      { x: 96, y: 96, w: 24, h: 528 },
      { x: 1160, y: 96, w: 24, h: 528 }
    ],
    props: []
  };
}

function loadTemplate(name) {
  map = normalizeGameMap(makeTemplateMap(name));
  activeSaveSlot = "";
  rememberLastLoadedMap("");
  clearSelection();
  syncForm();
  commitHistory(`Template ${name}`);
  renderSavedMaps("");
  markStatus(`${titleCase(name)} template loaded`);
}

function startNewMap() {
  map = normalizeGameMap({ ...makeTemplateMap("blank"), name: "Untitled Map" });
  activeSaveSlot = "";
  rememberLastLoadedMap("");
  clearSelection();
  syncForm();
  commitHistory("New Map");
  renderSavedMaps("");
  markStatus("New unsaved map");
}

function makeTemplateMap(name) {
  if (name === "manor") return sampleMap;
  const base = makeNewMap();
  if (name === "blank") {
    return { ...base, name: "Blank Map", walls: [], props: [], labels: [] };
  }
  if (name === "small") {
    return {
      ...base,
      name: "Small Party Map",
      player: [224, 224],
      anomaly: [640, 352],
      investigators: [[1016, 224, "#e76f8a", "Rowan"], [260, 520, "#c7a8ff", "Vale"]],
      walls: [
        ...base.walls,
        { x: 384, y: 120, w: 24, h: 202 },
        { x: 384, y: 398, w: 24, h: 202 },
        { x: 872, y: 120, w: 24, h: 202 },
        { x: 872, y: 398, w: 24, h: 202 },
        { x: 408, y: 328, w: 168, h: 24 },
        { x: 704, y: 328, w: 168, h: 24 }
      ],
      labels: [[640, 192, "HALL"], [260, 352, "WEST"], [1012, 352, "EAST"]]
    };
  }
  if (name === "large") {
    return {
      ...base,
      name: "Large Party Map",
      investigators: [[1056, 192, "#e76f8a", "Rowan"], [224, 528, "#c7a8ff", "Vale"], [1056, 528, "#f4e15d", "Mira"]],
      batteries: [[192, 192], [640, 170], [1088, 192], [224, 536], [640, 548], [1056, 536]],
      walls: [
        ...base.walls,
        { x: 328, y: 120, w: 24, h: 184 },
        { x: 328, y: 416, w: 24, h: 184 },
        { x: 608, y: 120, w: 24, h: 156 },
        { x: 608, y: 444, w: 24, h: 156 },
        { x: 928, y: 120, w: 24, h: 184 },
        { x: 928, y: 416, w: 24, h: 184 },
        { x: 352, y: 320, w: 196, h: 24 },
        { x: 732, y: 320, w: 196, h: 24 }
      ],
      labels: [[640, 210, "CENTER"], [224, 260, "WEST"], [1056, 260, "EAST"], [640, 536, "LOWER"]]
    };
  }
  if (name === "lab") {
    return {
      ...base,
      name: "Laboratory Wing",
      floor: ["#111b22", "#17151f", "#1a2430"],
      labels: [[640, 210, "CALIBRATION"], [250, 520, "LAB A"], [1010, 520, "LAB B"]],
      props: [
        { x: 184, y: 172, w: 96, h: 72, color: "#1c3537" },
        { x: 524, y: 156, w: 232, h: 54, color: "#26323a" },
        { x: 948, y: 454, w: 120, h: 70, color: "#2a303a" }
      ],
      walls: [...base.walls, { x: 296, y: 180, w: 24, h: 340 }, { x: 960, y: 180, w: 24, h: 340 }, { x: 448, y: 336, w: 384, h: 24 }]
    };
  }
  if (name === "aquarium") {
    return {
      ...base,
      name: "Aquarium Floor",
      floor: ["#0d1b1d", "#10232b", "#1e1923"],
      labels: [[640, 220, "TIDEGLASS"], [300, 530, "FILTRATION"], [980, 530, "TANKS"]],
      props: [
        { x: 172, y: 160, w: 126, h: 80, color: "#123a40" },
        { x: 820, y: 162, w: 180, h: 88, color: "#17343a" },
        { x: 544, y: 500, w: 192, h: 56, color: "#21333a" }
      ],
      walls: [...base.walls, { x: 264, y: 176, w: 24, h: 364 }, { x: 1012, y: 176, w: 24, h: 364 }, { x: 432, y: 282, w: 232, h: 24 }, { x: 616, y: 422, w: 232, h: 24 }]
    };
  }
  return base;
}

function addPreset(name) {
  const center = lastPointerEvent ? canvasPoint(lastPointerEvent) : { x: world.width / 2, y: world.height / 2 };
  const x = Math.round(center.x / gridSize) * gridSize;
  const y = Math.round(center.y / gridSize) * gridSize;
  if (name === "table") map.props.push({ x: x - 72, y: y - 28, w: 144, h: 56, color: "#3a3320" });
  if (name === "shelf") map.props.push({ x: x - 16, y: y - 96, w: 32, h: 192, color: "#33241d" });
  if (name === "pillar") map.props.push({ x: x - 22, y: y - 22, w: 44, h: 44, color: "#26323a" });
  if (name === "corridor") {
    map.walls.push({ x: x - 192, y: y - 96, w: 384, h: 24 }, { x: x - 192, y: y + 72, w: 384, h: 24 });
  }
  if (name === "room") {
    map.walls.push(
      { x: x - 160, y: y - 112, w: 128, h: 24 },
      { x: x + 32, y: y - 112, w: 128, h: 24 },
      { x: x - 160, y: y + 88, w: 320, h: 24 },
      { x: x - 160, y: y - 112, w: 24, h: 200 },
      { x: x + 136, y: y - 112, w: 24, h: 200 }
    );
  }
  if (name === "doorway") {
    map.walls.push({ x: x - 128, y: y - 12, w: 96, h: 24 }, { x: x + 32, y: y - 12, w: 96, h: 24 });
  }
  clearSelection();
  changed();
  markStatus(`${titleCase(name)} preset added`);
}

function normalizeFloor(floor) {
  const next = Array.isArray(floor) ? floor : [];
  return [next[0] ?? "#17151a", next[1] ?? "#2a1922", next[2] ?? "#2a2f1d"].map((color) => String(color));
}

function normalizeMapSize(size) {
  const width = Number(size?.width ?? defaultMapSize.width);
  const height = Number(size?.height ?? defaultMapSize.height);
  return {
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : defaultMapSize.width,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : defaultMapSize.height,
    aspectRatio: "16:9"
  };
}

function normalizePoint(point, fallback) {
  return [
    Math.round(Number(point?.[0] ?? fallback[0])),
    Math.round(Number(point?.[1] ?? fallback[1]))
  ];
}

function normalizeRect(start, end) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return clampRect({ x, y, w: Math.abs(end.x - start.x), h: Math.abs(end.y - start.y) });
}

function isSegmentWall(wall) {
  return wall?.shape === "segment" || (Number.isFinite(Number(wall?.x2)) && Number.isFinite(Number(wall?.y2)));
}

function wallThickness(wall) {
  const fallback = wall?.visible === false ? defaultBarrierThickness : defaultWallThickness;
  const thickness = Number(wall?.thickness ?? fallback);
  return Number.isFinite(thickness) ? thickness : fallback;
}

function occluderThickness(occluder) {
  const thickness = Number(occluder?.thickness ?? defaultOccluderThickness);
  return Number.isFinite(thickness) ? thickness : defaultOccluderThickness;
}

function normalizeWall(wall) {
  if (isSegmentWall(wall)) {
    return {
      shape: "segment",
      x: clamp(Math.round(Number(wall.x ?? 0)), 0, world.width),
      y: clamp(Math.round(Number(wall.y ?? 0)), 0, world.height),
      x2: clamp(Math.round(Number(wall.x2 ?? wall.x ?? 0)), 0, world.width),
      y2: clamp(Math.round(Number(wall.y2 ?? wall.y ?? 0)), 0, world.height),
      thickness: clamp(Math.round(Number(wall.thickness ?? (wall.visible === false ? defaultBarrierThickness : defaultWallThickness))), 1, 96),
      ...(wall.visible === false ? { visible: false } : {})
    };
  }
  return { ...clampRect(wall), ...(wall.visible === false ? { visible: false } : {}) };
}

function serializeWall(wall) {
  return isSegmentWall(wall)
    ? {
      shape: "segment",
      x: wall.x,
      y: wall.y,
      x2: wall.x2,
      y2: wall.y2,
      thickness: wallThickness(wall),
      ...(wall.visible === false ? { visible: false } : {})
    }
    : { x: wall.x, y: wall.y, w: wall.w, h: wall.h, ...(wall.visible === false ? { visible: false } : {}) };
}

function clampRect(rect) {
  const x = clamp(Math.round(Number(rect.x ?? 0)), 0, world.width);
  const y = clamp(Math.round(Number(rect.y ?? 0)), 0, world.height);
  return {
    x,
    y,
    w: clamp(Math.round(Number(rect.w ?? rect.width ?? 1)), 1, world.width - x),
    h: clamp(Math.round(Number(rect.h ?? rect.height ?? 1)), 1, world.height - y)
  };
}

function normalizeImageRect(rect) {
  const base = clampRect(rect);
  return {
    ...base,
    name: String(rect.name ?? "Image"),
    src: String(rect.src ?? rect.image ?? ""),
    naturalWidth: Number(rect.naturalWidth ?? rect.w ?? rect.width ?? base.w),
    naturalHeight: Number(rect.naturalHeight ?? rect.h ?? rect.height ?? base.h),
    mimeType: String(rect.mimeType ?? "image/*"),
    opacity: clamp(Number(rect.opacity ?? 1), 0.1, 1)
    ,
    rotation: Number(rect.rotation ?? 0)
  };
}

function normalizeOccluder(occluder) {
  if (isSegmentWall(occluder)) {
    return {
      shape: "segment",
      x: clamp(Math.round(Number(occluder.x ?? 0)), 0, world.width),
      y: clamp(Math.round(Number(occluder.y ?? 0)), 0, world.height),
      x2: clamp(Math.round(Number(occluder.x2 ?? occluder.x ?? 0)), 0, world.width),
      y2: clamp(Math.round(Number(occluder.y2 ?? occluder.y ?? 0)), 0, world.height),
      thickness: clamp(Math.round(Number(occluder.thickness ?? defaultOccluderThickness)), 8, 240),
      name: String(occluder.name ?? "Occluder")
    };
  }
  const base = clampRect(occluder);
  return {
    ...base,
    name: String(occluder.name ?? "Occluder"),
    depthY: clamp(Math.round(Number(occluder.depthY ?? base.y + base.h)), base.y, base.y + base.h)
  };
}

function normalizeMusic(music) {
  const src = String(music?.src ?? "");
  if (!src) {
    return null;
  }
  return {
    name: String(music.name ?? "Map Music"),
    src,
    mimeType: String(music.mimeType ?? "audio/mpeg"),
    size: Number(music.size ?? 0),
    volume: clamp(Number(music.volume ?? 1), 0, 1),
    loop: music.loop !== false
  };
}

function isSelected(kind, index) {
  return selectedGroup.some((ref) => ref.kind === kind && ref.index === index) || (selected?.kind === kind && selected.index === index);
}

function countObjects() {
  return 2 + map.investigators.length + map.batteries.length + map.labels.length + map.walls.length + map.props.length + map.decorations.length + map.occluders.length + (map.backgroundImage ? 1 : 0) + (map.foregroundImage ? 1 : 0);
}

function commitHistory(label = "Edit") {
  if (suppressHistory) return;
  const snapshot = JSON.stringify(toGameMap());
  if (history[historyIndex]?.snapshot === snapshot) return;
  history = history.slice(0, historyIndex + 1);
  history.push({ label, snapshot });
  if (history.length > historyLimit) history.shift();
  historyIndex = history.length - 1;
  syncHistoryButtons();
}

function restoreHistory(index) {
  const entry = history[index];
  if (!entry) return;
  suppressHistory = true;
  map = normalizeGameMap(JSON.parse(entry.snapshot));
  clearSelection();
  syncForm();
  suppressHistory = false;
  historyIndex = index;
  syncHistoryButtons();
  markStatus(entry.label);
}

function undo() {
  if (historyIndex <= 0) return;
  restoreHistory(historyIndex - 1);
}

function redo() {
  if (historyIndex >= history.length - 1) return;
  restoreHistory(historyIndex + 1);
}

function syncHistoryButtons() {
  document.querySelector("#undoBtn").disabled = historyIndex <= 0;
  document.querySelector("#redoBtn").disabled = historyIndex >= history.length - 1;
}

function loadAssetTray() {
  try {
    const parsed = JSON.parse(localStorage.getItem(assetTrayKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((asset) => asset?.src) : [];
  } catch {
    return [];
  }
}

function saveAssetTray() {
  localStorage.setItem(assetTrayKey, JSON.stringify(assetTray.slice(-18)));
}

function renderAssetTray() {
  assetTrayEl.innerHTML = "";
  if (!assetTray.length) {
    mediaStatus.textContent = pendingDecoration ? `${pendingDecoration.name} ready` : "No prop image loaded";
    return;
  }
  for (const [index, asset] of assetTray.entries()) {
    const button = document.createElement("button");
    button.className = `asset-item${pendingDecoration?.src === asset.src ? " is-active" : ""}`;
    button.type = "button";
    button.dataset.assetIndex = String(index);
    button.style.backgroundImage = `url("${asset.src}")`;
    button.textContent = asset.name;
    assetTrayEl.append(button);
  }
}

function selectAsset(index) {
  pendingDecoration = assetTray[index] ?? null;
  if (!pendingDecoration) return;
  preloadImage(pendingDecoration.src);
  renderAssetTray();
  setTool("decoration");
  markStatus(`${pendingDecoration.name} ready`);
}

function getSavedMaps() {
  try {
    const parsed = JSON.parse(localStorage.getItem(savedMapsKey) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function rememberLastLoadedMap(slot) {
  if (slot) {
    localStorage.setItem(lastLoadedMapKey, slot);
    return;
  }
  localStorage.removeItem(lastLoadedMapKey);
}

function restoreLastLoadedMap() {
  const slot = localStorage.getItem(lastLoadedMapKey) ?? "";
  if (!slot) return false;
  const saved = getSavedMaps();
  const next = saved[slot];
  if (!next) {
    rememberLastLoadedMap("");
    return false;
  }
  activeSaveSlot = slot;
  map = normalizeGameMap(next);
  return true;
}

function setSavedMaps(saved, preferredSlot = activeSaveSlot) {
  localStorage.setItem(savedMapsKey, JSON.stringify(saved));
  renderSavedMaps(preferredSlot);
}

function renderSavedMaps(preferredSlot = activeSaveSlot || savedMapSelect.value || map.name) {
  const saved = getSavedMaps();
  const names = Object.keys(saved).sort();
  savedMapSelect.innerHTML = "";
  const unsavedOption = document.createElement("option");
  unsavedOption.value = "";
  unsavedOption.textContent = activeSaveSlot ? `Editing: ${activeSaveSlot}` : "Current map is unsaved";
  savedMapSelect.append(unsavedOption);
  if (!names.length) {
    savedMapSelect.value = "";
    return;
  }
  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    savedMapSelect.append(option);
  }
  savedMapSelect.value = names.includes(preferredSlot) ? preferredSlot : "";
}

async function saveNamedMap() {
  const saved = getSavedMaps();
  const previousSlot = activeSaveSlot && saved[activeSaveSlot] ? activeSaveSlot : "";
  const slot = normalizeSaveSlot(map.name);
  try {
    if (saved[slot] && previousSlot !== slot) {
      markStatus(`${slot} already exists; load it or choose a new name`);
      renderSavedMaps(previousSlot);
      return;
    }
    if (previousSlot && previousSlot !== slot) {
      delete saved[previousSlot];
    }
    saved[slot] = await compactMapForStorage(toGameMap());
    activeSaveSlot = slot;
    rememberLastLoadedMap(slot);
    setSavedMaps(saved, slot);
    savedMapSelect.value = slot;
    markStatus(previousSlot && previousSlot !== slot ? `Renamed to ${slot}` : `Saved ${slot}`);
  } catch (error) {
    markStatus(`Save failed: ${friendlyStorageError(error)}`);
  }
}

function normalizeSaveSlot(name) {
  return String(name ?? "").trim() || "Untitled Map";
}

function loadNamedMap() {
  const saved = getSavedMaps();
  const slot = savedMapSelect.value;
  const next = saved[slot];
  if (!next) {
    markStatus("No saved map selected");
    return;
  }
  activeSaveSlot = slot;
  rememberLastLoadedMap(slot);
  map = normalizeGameMap(next);
  clearSelection();
  syncForm();
  commitHistory("Load Saved Map");
  renderSavedMaps(slot);
  markStatus(`Loaded ${slot}`);
}

function requestDeleteNamedMap() {
  const name = savedMapSelect.value;
  if (!name) {
    markStatus("Choose a saved map to delete");
    return;
  }
  pendingDeleteMapName = name;
  deleteMapMessage.textContent = `Are you sure you want to delete ${name}?`;
  deleteMapModal.hidden = false;
  confirmDeleteMapBtn.focus();
}

function closeDeleteMapModal() {
  pendingDeleteMapName = "";
  deleteMapModal.hidden = true;
}

function confirmDeleteNamedMap() {
  const name = pendingDeleteMapName;
  if (!name) {
    closeDeleteMapModal();
    return;
  }
  const saved = getSavedMaps();
  if (!saved[name]) {
    closeDeleteMapModal();
    renderSavedMaps();
    markStatus("Saved map was already removed");
    return;
  }
  delete saved[name];
  if (activeSaveSlot === name) {
    activeSaveSlot = "";
  }
  if (localStorage.getItem(lastLoadedMapKey) === name) {
    rememberLastLoadedMap("");
  }
  setSavedMaps(saved);
  closeDeleteMapModal();
  markStatus(`Deleted ${name}`);
}

async function compactMapForStorage(snapshot) {
  const compacted = cloneObject(snapshot);
  if (compacted.backgroundImage) {
    compacted.backgroundImage = await compactImageRectForStorage(compacted.backgroundImage, storageFloorImageMax);
  }
  if (compacted.foregroundImage) {
    compacted.foregroundImage = await compactImageRectForStorage(compacted.foregroundImage, storageFloorImageMax);
  }
  compacted.decorations = await Promise.all((compacted.decorations ?? [])
    .map((decoration) => compactImageRectForStorage(decoration, storageDecorationImageMax)));
  return compacted;
}

async function compactImageRectForStorage(rect, limits) {
  if (!rect?.src || !rect.src.startsWith("data:image/") || rect.src.startsWith("data:image/svg")) {
    return rect;
  }
  const image = await loadImage(rect.src);
  const scale = Math.min(limits.width / image.naturalWidth, limits.height / image.naturalHeight, 1);
  if (scale >= 1 && rect.src.length < 900000) {
    return rect;
  }
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const sourceCtx = source.getContext("2d");
  sourceCtx.drawImage(image, 0, 0, width, height);
  const src = source.toDataURL("image/webp", limits.quality);
  return {
    ...rect,
    src,
    naturalWidth: width,
    naturalHeight: height,
    mimeType: "image/webp"
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error("image could not be compacted")), { once: true });
    image.src = src;
  });
}

function friendlyStorageError(error) {
  if (error?.name === "QuotaExceededError" || String(error?.message ?? "").toLowerCase().includes("quota")) {
    return "browser storage is full; try a smaller floor image or MP3";
  }
  return error?.message || "map could not be saved";
}

function renderLayerList() {
  layerList.innerHTML = "";
  const rows = getLayerRows();
  for (const row of rows) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `layer-item${isRefSelected(row.ref) ? " is-selected" : ""}`;
    button.dataset.layerRef = formatLayerRef(row.ref);
    button.innerHTML = `<span>${escapeHtml(row.name)}</span><span class="layer-kind">${escapeHtml(row.kind)}</span>`;
    layerList.append(button);
  }
}

function getLayerRows() {
  return [
    ...(map.backgroundImage ? [{ ref: { kind: "background", index: 0 }, name: map.backgroundImage.name || "Floor Image", kind: "Floor" }] : []),
    ...(map.foregroundImage ? [{ ref: { kind: "foreground", index: 0 }, name: map.foregroundImage.name || "Foreground Image", kind: "Foreground" }] : []),
    ...map.occluders.map((item, index) => ({ ref: { kind: "occluder", index }, name: item.name || `Occluder ${index + 1}`, kind: isSegmentWall(item) ? "Segment Occluder" : "Occluder" })).reverse(),
    ...map.decorations.map((item, index) => ({ ref: { kind: "decoration", index }, name: item.name || `Image ${index + 1}`, kind: "Image" })).reverse(),
    ...map.props.map((item, index) => ({ ref: { kind: "prop", index }, name: `Prop ${index + 1}`, kind: "Prop" })).reverse(),
    ...map.walls.map((item, index) => ({ ref: { kind: "wall", index }, name: item.visible === false ? `Barrier ${index + 1}` : `Wall ${index + 1}`, kind: item.visible === false ? "Barrier" : "Wall" })).reverse(),
    { ref: { kind: "anomaly", index: 0 }, name: "Anomaly Spawn", kind: "Spawn" },
    { ref: { kind: "player", index: 0 }, name: "Host Investigator", kind: "Spawn" },
    ...map.investigators.map((item, index) => ({ ref: { kind: "investigator", index }, name: item[3] || `Investigator ${index + 2}`, kind: "Spawn" })),
    ...map.batteries.map((item, index) => ({ ref: { kind: "battery", index }, name: `Battery ${index + 1}`, kind: "Battery" })),
    ...map.labels.map((item, index) => ({ ref: { kind: "label", index }, name: item[2] || `Label ${index + 1}`, kind: "Label" }))
  ];
}

function sameRef(a, b) {
  return a?.kind === b?.kind && a?.index === b?.index;
}

function setSelection(ref) {
  selected = ref ? { ...ref } : null;
  selectedGroup = ref ? [{ ...ref }] : [];
  selectedEndpoint = null;
}

function setSelectionGroup(refs) {
  selectedGroup = refs.map((ref) => ({ ...ref }));
  selected = selectedGroup.at(-1) ?? null;
  selectedEndpoint = null;
}

function clearSelection() {
  selected = null;
  selectedGroup = [];
  selectedEndpoint = null;
}

function toggleSelection(ref) {
  if (!ref) return;
  selectedEndpoint = null;
  const index = selectedGroup.findIndex((item) => sameRef(item, ref));
  if (index >= 0) {
    selectedGroup.splice(index, 1);
    selected = selectedGroup.at(-1) ?? null;
    return;
  }
  selectedGroup.push({ ...ref });
  selected = { ...ref };
}

function isRefSelected(ref) {
  return selectedGroup.some((item) => sameRef(item, ref));
}

function wallAnchorHit(point, ignoreRef = null) {
  return wallAnchorPoints()
    .filter((anchor) => !sameRef(anchor.ref, ignoreRef))
    .map((anchor) => ({ ...anchor, distance: distance(point, anchor.point) }))
    .filter((anchor) => anchor.distance <= wallAnchorHitRadius)
    .sort((a, b) => a.distance - b.distance)[0] ?? null;
}

function wallAnchorPoints() {
  const anchors = [];
  map.walls.forEach((wall, index) => {
    if (isSegmentWall(wall)) {
      anchors.push(
        { ref: { kind: "wall", index }, point: { x: wall.x, y: wall.y }, name: "start" },
        { ref: { kind: "wall", index }, point: { x: wall.x2, y: wall.y2 }, name: "end" }
      );
      return;
    }
    const x1 = wall.x;
    const x2 = wall.x + wall.w;
    const y1 = wall.y;
    const y2 = wall.y + wall.h;
    anchors.push(
      { ref: { kind: "wall", index }, point: { x: x1, y: y1 }, name: "nw" },
      { ref: { kind: "wall", index }, point: { x: x2, y: y1 }, name: "ne" },
      { ref: { kind: "wall", index }, point: { x: x2, y: y2 }, name: "se" },
      { ref: { kind: "wall", index }, point: { x: x1, y: y2 }, name: "sw" },
      { ref: { kind: "wall", index }, point: { x: x1 + wall.w / 2, y: y1 }, name: "n" },
      { ref: { kind: "wall", index }, point: { x: x2, y: y1 + wall.h / 2 }, name: "e" },
      { ref: { kind: "wall", index }, point: { x: x1 + wall.w / 2, y: y2 }, name: "s" },
      { ref: { kind: "wall", index }, point: { x: x1, y: y1 + wall.h / 2 }, name: "w" }
    );
  });
  return anchors;
}

function mergeRefs(base, additions) {
  const merged = base.map((ref) => ({ ...ref }));
  for (const ref of additions) {
    if (!merged.some((item) => sameRef(item, ref))) {
      merged.push({ ...ref });
    }
  }
  return merged;
}

function refsInMarquee(rect) {
  return selectableRefs()
    .filter((ref) => rectsOverlap(rect, selectionBounds(ref)))
    .map((ref) => ({ ...ref }));
}

function selectableRefs() {
  return [
    ...map.walls.map((_, index) => ({ kind: "wall", index })),
    ...map.props.map((_, index) => ({ kind: "prop", index })),
    ...map.decorations.map((_, index) => ({ kind: "decoration", index })),
    ...map.occluders.map((_, index) => ({ kind: "occluder", index })),
    ...map.labels.map((_, index) => ({ kind: "label", index })),
    ...map.batteries.map((_, index) => ({ kind: "battery", index })),
    { kind: "player", index: 0 },
    ...map.investigators.map((_, index) => ({ kind: "investigator", index })),
    { kind: "anomaly", index: 0 }
  ];
}

function selectionBounds(ref) {
  const object = readSelection(ref);
  if (!object) return { x: 0, y: 0, w: 0, h: 0 };
  if (ref.kind === "wall" && isSegmentWall(object)) {
    const pad = wallThickness(object) / 2 + 4;
    const x = Math.min(object.x, object.x2) - pad;
    const y = Math.min(object.y, object.y2) - pad;
    return {
      x,
      y,
      w: Math.abs(object.x2 - object.x) + pad * 2,
      h: Math.abs(object.y2 - object.y) + pad * 2
    };
  }
  if (ref.kind === "occluder" && isSegmentWall(object)) {
    const pad = occluderThickness(object) / 2 + 4;
    const x = Math.min(object.x, object.x2) - pad;
    const y = Math.min(object.y, object.y2) - pad;
    return {
      x,
      y,
      w: Math.abs(object.x2 - object.x) + pad * 2,
      h: Math.abs(object.y2 - object.y) + pad * 2
    };
  }
  if (Number.isFinite(object.w) && Number.isFinite(object.h)) {
    return { x: object.x, y: object.y, w: object.w, h: object.h };
  }
  const radius = getPointHitRadius(ref.kind);
  return {
    x: object.x - radius,
    y: object.y - radius,
    w: radius * 2,
    h: radius * 2
  };
}

function rectsOverlap(a, b) {
  return a.x <= b.x + b.w
    && a.x + a.w >= b.x
    && a.y <= b.y + b.h
    && a.y + a.h >= b.y;
}

function formatLayerRef(ref) {
  return `${ref.kind}:${ref.index}`;
}

function parseLayerRef(value) {
  const [kind, index] = value.split(":");
  return { kind, index: Number(index) };
}

function toggleAnalysisOverlay() {
  analysisOverlay = !analysisOverlay;
  const button = document.querySelector("#analysisBtn");
  button.classList.toggle("is-active", analysisOverlay);
  button.setAttribute("aria-pressed", String(analysisOverlay));
  draw();
  markStatus(analysisOverlay ? "QA overlay on" : "QA overlay off");
}

function getPlaytestOptions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(playtestOptionsKey) ?? "{}");
    return {
      freezeAnomaly: Boolean(parsed?.freezeAnomaly)
    };
  } catch {
    return { freezeAnomaly: false };
  }
}

function syncPlaytestOptionsForm() {
  const options = getPlaytestOptions();
  playtestFreezeAnomaly.checked = options.freezeAnomaly;
}

function savePlaytestOptions() {
  const options = {
    freezeAnomaly: playtestFreezeAnomaly.checked
  };
  localStorage.setItem(playtestOptionsKey, JSON.stringify(options));
  return options;
}

async function playtestMap() {
  try {
    const options = savePlaytestOptions();
    localStorage.setItem(playtestMapKey, JSON.stringify(await compactMapForStorage(toGameMap())));
    markStatus(options.freezeAnomaly ? "Playtest map published, anomaly frozen" : "Playtest map published");
    window.location.href = "/host?map=Builder%20Playtest";
  } catch (error) {
    markStatus(`Playtest failed: ${friendlyStorageError(error)}`);
  }
}

function pointInRect(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function pointInWall(point, wall) {
  if (!isSegmentWall(wall)) return pointInRect(point, wall);
  return distancePointToSegment(point.x, point.y, wall.x, wall.y, wall.x2, wall.y2) <= wallThickness(wall) / 2 + 5;
}

function pointInOccluder(point, occluder) {
  if (!isSegmentWall(occluder)) return pointInRect(point, occluder);
  return distancePointToSegment(point.x, point.y, occluder.x, occluder.y, occluder.x2, occluder.y2) <= occluderThickness(occluder) / 2 + 5;
}

function pointInBlocker(point, blocker) {
  return isSegmentWall(blocker)
    ? distancePointToSegment(point.x, point.y, blocker.x, blocker.y, blocker.x2, blocker.y2) <= wallThickness(blocker) / 2
    : pointInRect(point, collisionBoundsForObstacle(blocker));
}

function pointObjectInBounds(point) {
  return point.x >= 0 && point.x <= world.width && point.y >= 0 && point.y <= world.height;
}

function pointInBounds(point) {
  return point[0] >= 0 && point[0] <= world.width && point[1] >= 0 && point[1] <= world.height;
}

function segmentBlockedByRects(x1, y1, x2, y2, rects) {
  return rects.some((rect) => isSegmentWall(rect)
    ? segmentDistance(x1, y1, x2, y2, rect.x, rect.y, rect.x2, rect.y2) <= wallThickness(rect) / 2
    : lineIntersectsRect(x1, y1, x2, y2, rect));
}

function lineIntersectsRect(x1, y1, x2, y2, rect) {
  if (pointInRect({ x: x1, y: y1 }, rect) || pointInRect({ x: x2, y: y2 }, rect)) return true;
  const edges = [
    [rect.x, rect.y, rect.x + rect.w, rect.y],
    [rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h],
    [rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h],
    [rect.x, rect.y + rect.h, rect.x, rect.y]
  ];
  return edges.some(([x3, y3, x4, y4]) => linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4));
}

function linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (den === 0) return false;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const point = closestPointOnSegment(px, py, x1, y1, x2, y2);
  return Math.hypot(px - point.x, py - point.y);
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (!lengthSq) return { x: x1, y: y1 };
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lengthSq, 0, 1);
  return { x: x1 + dx * t, y: y1 + dy * t };
}

function segmentDistance(x1, y1, x2, y2, x3, y3, x4, y4) {
  if (linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4)) return 0;
  return Math.min(
    distancePointToSegment(x1, y1, x3, y3, x4, y4),
    distancePointToSegment(x2, y2, x3, y3, x4, y4),
    distancePointToSegment(x3, y3, x1, y1, x2, y2),
    distancePointToSegment(x4, y4, x1, y1, x2, y2)
  );
}

function obstacleArea(obstacle) {
  return isSegmentWall(obstacle)
    ? distance({ x: obstacle.x, y: obstacle.y }, { x: obstacle.x2, y: obstacle.y2 }) * wallThickness(obstacle)
    : obstacle.w * obstacle.h;
}

function rectInBounds(rect) {
  return rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= world.width && rect.y + rect.h <= world.height;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function cloneObject(object) {
  return JSON.parse(JSON.stringify(object));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function slugify(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "afterlight-map";
}

function formatBytes(value) {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function titleCase(value) {
  return value.replace(/(^|-)([a-z])/g, (_, prefix, letter) => `${prefix ? " " : ""}${letter.toUpperCase()}`);
}

function isTypingTarget(target) {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
