const joinCard = document.querySelector("#joinCard");
const padScreen = document.querySelector("#padScreen");
const roomCodeInput = document.querySelector("#roomCodeInput");
const nameInput = document.querySelector("#nameInput");
const skinSelect = document.querySelector("#skinSelect");
const investigatorRoleBtn = document.querySelector("#investigatorRoleBtn");
const anomalyRoleBtn = document.querySelector("#anomalyRoleBtn");
const joinRoomBtn = document.querySelector("#joinRoomBtn");
const joinStatus = document.querySelector("#joinStatus");
const roomCodeLabel = document.querySelector("#roomCodeLabel");
const playerLabel = document.querySelector("#playerLabel");
const readyBtn = document.querySelector("#readyBtn");
const miniMap = document.querySelector("#miniMap");
const miniMapCtx = miniMap.getContext("2d");
const joystick = document.querySelector("#joystick");
const joystickKnob = document.querySelector("#joystickKnob");
const aimJoystick = document.querySelector("#aimJoystick");
const aimJoystickKnob = document.querySelector("#aimJoystickKnob");
const lightBtn = document.querySelector("#lightBtn");
const dashBtn = document.querySelector("#dashBtn");
const abilityBtn = document.querySelector("#abilityBtn");
const padStatus = document.querySelector("#padStatus");

const socket = globalThis.io?.();
const params = new URLSearchParams(location.search);
const storedName = localStorage.getItem("afterlight.controller.name") ?? "";
const storedSkin = localStorage.getItem("afterlight.controller.skin") ?? "brown";

let selectedRole = "Investigator";
let member = null;
let lobby = null;
let ready = false;
let sequence = 0;
let move = { x: 0, y: 0 };
let aim = { x: 0, y: 0 };
let light = false;
let dashPulse = false;
let abilityPulse = false;
let activePointerId = null;
let activeAimPointerId = null;
const miniMapImages = new Map();
const miniMapAnomalyAtlas = {
  src: "assets/characters/anomaly-ghost-atlas.png",
  frame: 128,
  cols: 4
};

roomCodeInput.value = (params.get("code") ?? "").toUpperCase();
nameInput.value = storedName;
skinSelect.value = storedSkin;

if (!socket) {
  setJoinStatus("Controller server unavailable. Open this through the party server.");
}

document.querySelectorAll("button, .joystick, .action-pad").forEach((element) => {
  element.addEventListener("selectstart", (event) => event.preventDefault());
  element.addEventListener("dragstart", (event) => event.preventDefault());
});

investigatorRoleBtn.addEventListener("click", () => setRole("Investigator", true));
anomalyRoleBtn.addEventListener("click", () => setRole("Anomaly", true));

joinRoomBtn.addEventListener("click", () => {
  if (!socket) return;
  const code = roomCodeInput.value.trim().toUpperCase();
  const name = nameInput.value.trim() || "Player";
  const skin = skinSelect.value;
  localStorage.setItem("afterlight.controller.name", name);
  localStorage.setItem("afterlight.controller.skin", skin);
  socket.emit("player:join", { code, name, role: selectedRole, skin }, (response) => {
    if (!response?.ok) {
      setJoinStatus(response?.error ?? "Could not join room");
      return;
    }
    member = response.member;
    lobby = response.room;
    openController();
    renderLobby();
  });
});

readyBtn.addEventListener("click", () => {
  ready = !ready;
  readyBtn.classList.toggle("ready", ready);
  readyBtn.textContent = ready ? "Ready" : "Ready?";
  socket.emit("player:update", { ready });
});

skinSelect.addEventListener("change", () => {
  if (member) socket.emit("player:update", { skin: skinSelect.value });
});

dashBtn.addEventListener("click", () => {
  if (member?.role !== "Anomaly") {
    return;
  }
  dashPulse = true;
  dashBtn.classList.add("active");
  setTimeout(() => dashBtn.classList.remove("active"), 120);
});

abilityBtn.addEventListener("click", () => {
  if (member?.role !== "Anomaly") {
    return;
  }
  abilityPulse = true;
  abilityBtn.classList.add("active");
  setTimeout(() => abilityBtn.classList.remove("active"), 140);
});

joystick.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  activePointerId = event.pointerId;
  joystick.setPointerCapture(activePointerId);
  move = updateStick(event, joystick, joystickKnob);
});

joystick.addEventListener("pointermove", (event) => {
  if (event.pointerId === activePointerId) move = updateStick(event, joystick, joystickKnob);
});

joystick.addEventListener("pointerup", releaseJoystick);
joystick.addEventListener("pointercancel", releaseJoystick);

aimJoystick.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (member?.role !== "Investigator") return;
  activeAimPointerId = event.pointerId;
  aimJoystick.setPointerCapture(activeAimPointerId);
  aim = updateStick(event, aimJoystick, aimJoystickKnob);
  light = Math.hypot(aim.x, aim.y) > 0.08;
  aimJoystick.classList.toggle("active", light);
});

aimJoystick.addEventListener("pointermove", (event) => {
  if (event.pointerId !== activeAimPointerId) return;
  aim = updateStick(event, aimJoystick, aimJoystickKnob);
  light = Math.hypot(aim.x, aim.y) > 0.08;
  aimJoystick.classList.toggle("active", light);
});

aimJoystick.addEventListener("pointerup", releaseAimJoystick);
aimJoystick.addEventListener("pointercancel", releaseAimJoystick);

socket?.on("connect", () => {
  setJoinStatus("Connected. Enter a room code.");
});

socket?.on("disconnect", () => {
  padStatus.textContent = "Disconnected. Reconnecting...";
});

socket?.on("lobby:state", (nextLobby) => {
  lobby = nextLobby;
  const updatedMember = lobby.members.find((item) => item.id === member?.id);
  if (updatedMember) {
    member = updatedMember;
    selectedRole = member.role;
  }
  renderLobby();
});

socket?.on("match:start", () => {
  padStatus.textContent = "Match started.";
});

socket?.on("host:state", (state) => {
  if (member?.role === "Anomaly") {
    miniMap.hidden = false;
    drawMiniMap(state, member.role);
  } else {
    miniMap.hidden = true;
  }
  if (state?.phase) {
    padStatus.textContent = `${state.phase} ${state.timeRemaining ? `${Math.ceil(state.timeRemaining)}s` : ""}`.trim();
  }
});

setInterval(() => {
  if (!member || !socket?.connected) return;
  sequence += 1;
  const aimVector = Math.hypot(aim.x, aim.y) > 0.08 ? aim : move;
  socket.emit("player:input", {
    move,
    aim: member?.role === "Investigator" ? aimVector : move,
    light: member?.role === "Investigator" ? light : false,
    dash: member?.role === "Anomaly" ? dashPulse : false,
    ability: member?.role === "Anomaly" ? abilityPulse : false,
    sequence
  });
  dashPulse = false;
  abilityPulse = false;
}, 50);

function setRole(role, emit = false) {
  selectedRole = role;
  investigatorRoleBtn.classList.toggle("selected", role === "Investigator");
  anomalyRoleBtn.classList.toggle("selected", role === "Anomaly");
  if (emit && member) socket.emit("player:update", { role });
}

function openController() {
  joinCard.hidden = true;
  padScreen.hidden = false;
}

function renderLobby() {
  if (!member || !lobby) return;
  roomCodeLabel.textContent = `Room ${lobby.code}`;
  playerLabel.textContent = `${member.name}`;
  setRole(member.role);
  padScreen.dataset.role = member.role.toLowerCase();
  lightBtn.hidden = true;
  aimJoystick.hidden = member.role !== "Investigator";
  abilityBtn.hidden = member.role !== "Anomaly";
  abilityBtn.textContent = "Blackout";
  dashBtn.hidden = member.role !== "Anomaly";
  if (member.role !== "Investigator") releaseAimJoystick();
  padStatus.textContent = `${member.role} assigned. ${lobby.members.filter((item) => item.connected).length} joined.`;
}

function updateStick(event, stick, knob) {
  const rect = stick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const max = rect.width * 0.34;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  const len = Math.hypot(dx, dy);
  const scale = len > max ? max / len : 1;
  const knobX = dx * scale;
  const knobY = dy * scale;
  knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  return len < rect.width * 0.08 ? { x: 0, y: 0 } : {
    x: clamp(dx / max, -1, 1),
    y: clamp(dy / max, -1, 1)
  };
}

function releaseJoystick(event) {
  if (event.pointerId !== activePointerId) return;
  activePointerId = null;
  move = { x: 0, y: 0 };
  joystickKnob.style.transform = "translate(-50%, -50%)";
}

function releaseAimJoystick(event = null) {
  if (event && event.pointerId !== activeAimPointerId) return;
  activeAimPointerId = null;
  aim = { x: 0, y: 0 };
  light = false;
  aimJoystick.classList.remove("active");
  aimJoystickKnob.style.transform = "translate(-50%, -50%)";
}

function drawMiniMap(state, role) {
  resizeMiniMap();
  const w = miniMap.width;
  const h = miniMap.height;
  miniMapCtx.clearRect(0, 0, w, h);
  miniMapCtx.fillStyle = "#071014";
  miniMapCtx.fillRect(0, 0, w, h);
  const viewport = getMiniMapViewport(w, h);
  const sx = (x) => viewport.x + (x / 1280) * viewport.w;
  const sy = (y) => viewport.y + (y / 720) * viewport.h;
  const sw = (width) => (width / 1280) * viewport.w;
  const sh = (height) => (height / 720) * viewport.h;

  drawMiniMapImage(state?.backgroundImage, viewport);
  if (!state?.backgroundImage?.src) {
    miniMapCtx.save();
    miniMapCtx.strokeStyle = "rgba(122, 228, 214, 0.08)";
    miniMapCtx.lineWidth = 1;
    for (let x = 0; x <= 1280; x += 160) {
      miniMapCtx.beginPath();
      miniMapCtx.moveTo(sx(x), viewport.y);
      miniMapCtx.lineTo(sx(x), viewport.y + viewport.h);
      miniMapCtx.stroke();
    }
    for (let y = 0; y <= 720; y += 120) {
      miniMapCtx.beginPath();
      miniMapCtx.moveTo(viewport.x, sy(y));
      miniMapCtx.lineTo(viewport.x + viewport.w, sy(y));
      miniMapCtx.stroke();
    }
    miniMapCtx.restore();
  }
  for (const decoration of state?.decorations ?? []) {
    drawMiniMapImage(decoration, viewport);
  }
  miniMapCtx.strokeStyle = "rgba(122, 228, 214, 0.28)";
  miniMapCtx.lineWidth = 2;
  miniMapCtx.strokeRect(viewport.x, viewport.y, viewport.w, viewport.h);
  for (const wall of state?.walls ?? []) {
    miniMapCtx.strokeStyle = wall.visible === false ? "rgba(244, 179, 93, 0.72)" : "rgba(174, 191, 199, 0.44)";
    miniMapCtx.fillStyle = "rgba(174, 191, 199, 0.22)";
    if (wall.shape === "segment") {
      miniMapCtx.lineWidth = Math.max(1.5, ((wall.thickness ?? 1) / 1280) * viewport.w);
      miniMapCtx.beginPath();
      miniMapCtx.moveTo(sx(wall.x), sy(wall.y));
      miniMapCtx.lineTo(sx(wall.x2), sy(wall.y2));
      miniMapCtx.stroke();
      continue;
    }
    miniMapCtx.fillRect(sx(wall.x), sy(wall.y), sw(wall.w), sh(wall.h));
  }
  for (const prop of state?.props ?? []) {
    miniMapCtx.fillStyle = prop.color ?? "rgba(83, 96, 106, 0.76)";
    miniMapCtx.globalAlpha = 0.7;
    miniMapCtx.fillRect(sx(prop.x), sy(prop.y), sw(prop.w), sh(prop.h));
    miniMapCtx.globalAlpha = 1;
  }
  for (const battery of state?.batteries ?? []) {
    if (!battery.active) continue;
    miniMapCtx.fillStyle = battery.kind === "overcharge" ? "#dff7ff" : "#f4b35d";
    miniMapCtx.beginPath();
    miniMapCtx.arc(sx(battery.x), sy(battery.y), 3.5, 0, Math.PI * 2);
    miniMapCtx.fill();
  }
  drawMiniMapImage(state?.foregroundImage, viewport, 0.4);
  for (const agent of state?.investigators ?? []) {
    const x = sx(agent.x);
    const y = sy(agent.y);
    const facing = Number(agent.aim) || 0;
    if (agent.lightOn && agent.resolve > 0) {
      miniMapCtx.save();
      miniMapCtx.translate(x, y);
      miniMapCtx.rotate(facing);
      miniMapCtx.fillStyle = "rgba(244, 179, 93, 0.2)";
      miniMapCtx.strokeStyle = "rgba(244, 179, 93, 0.48)";
      miniMapCtx.lineWidth = 1;
      miniMapCtx.beginPath();
      miniMapCtx.moveTo(0, 0);
      miniMapCtx.lineTo(36, -12);
      miniMapCtx.lineTo(52, 0);
      miniMapCtx.lineTo(36, 12);
      miniMapCtx.closePath();
      miniMapCtx.fill();
      miniMapCtx.stroke();
      miniMapCtx.restore();
    }
  }
  for (const agent of state?.investigators ?? []) {
    drawMiniMapInvestigatorSprite(agent, sx(agent.x), sy(agent.y), viewport);
  }
  if (role === "Anomaly" && state?.anomaly) {
    drawMiniMapAnomalySprite(state.anomaly, sx(state.anomaly.x), sy(state.anomaly.y), viewport);
  }
}

function drawMiniMapInvestigatorSprite(agent, x, y, viewport) {
  const down = agent.resolve <= 0;
  const scale = getMiniMapCharacterScale(viewport);
  const color = down ? "#8b969e" : (agent.color ?? "#7ae4d6");
  const aim = Number(agent.aim) || 0;
  miniMapCtx.save();
  miniMapCtx.translate(x, y);
  miniMapCtx.globalAlpha = down ? 0.78 : 0.98;
  miniMapCtx.shadowColor = down ? "rgba(0, 0, 0, 0.42)" : color;
  miniMapCtx.shadowBlur = down ? 3 : 10;

  if (down) {
    miniMapCtx.rotate(aim + Math.PI / 2);
    drawMiniMapDownedInvestigator(color, scale);
    miniMapCtx.restore();
    return;
  }

  drawMiniMapStandingInvestigator(agent, color, scale);
  miniMapCtx.restore();
}

function drawMiniMapStandingInvestigator(agent, color, scale) {
  const aim = Number(agent.aim) || 0;
  const aimY = Math.sin(aim);
  const facing = getMiniMapInvestigatorFacingDirection(aim);
  const stride = Math.sin(performance.now() / 120 + agent.x * 0.03 + agent.y * 0.02) * 3 * scale;
  const handX = (facing === "left" ? -15 : (facing === "right" ? 15 : 0)) * scale;
  const handY = (facing === "down" ? -32 : (facing === "up" ? -55 : -43 + aimY * 5)) * scale;
  const shoulderX = (facing === "left" ? -10 : (facing === "right" ? 10 : 0)) * scale;

  miniMapCtx.save();
  miniMapCtx.globalAlpha *= 0.34;
  miniMapCtx.fillStyle = "rgba(0, 0, 0, 0.62)";
  miniMapCtx.beginPath();
  miniMapCtx.ellipse(0, 3 * scale, 24 * scale, 6 * scale, 0, 0, Math.PI * 2);
  miniMapCtx.fill();
  miniMapCtx.restore();

  miniMapCtx.strokeStyle = darkenColor(color, 0.34);
  miniMapCtx.lineWidth = Math.max(1.25, 4 * scale);
  miniMapCtx.beginPath();
  miniMapCtx.moveTo(-7 * scale, -8 * scale);
  miniMapCtx.lineTo(-12 * scale, -2 * scale + stride);
  miniMapCtx.moveTo(8 * scale, -8 * scale);
  miniMapCtx.lineTo(13 * scale, -2 * scale - stride);
  miniMapCtx.stroke();

  miniMapCtx.fillStyle = darkenColor(color, 0.18);
  miniMapCtx.strokeStyle = "#071015";
  miniMapCtx.lineWidth = Math.max(1.4, 3 * scale);
  miniMapCtx.beginPath();
  miniMapCtx.roundRect(-15 * scale, -56 * scale, 30 * scale, 46 * scale, 12 * scale);
  miniMapCtx.fill();
  miniMapCtx.stroke();

  miniMapCtx.fillStyle = color;
  miniMapCtx.beginPath();
  miniMapCtx.arc(0, -65 * scale, 14 * scale, 0, Math.PI * 2);
  miniMapCtx.fill();
  miniMapCtx.stroke();

  miniMapCtx.fillStyle = "rgba(5, 8, 12, 0.72)";
  miniMapCtx.beginPath();
  miniMapCtx.roundRect(-8 * scale, -68 * scale, 16 * scale, 9 * scale, 4 * scale);
  miniMapCtx.fill();

  miniMapCtx.strokeStyle = lightenColor(color, 0.36);
  miniMapCtx.lineWidth = Math.max(1.25, 3 * scale);
  miniMapCtx.beginPath();
  miniMapCtx.moveTo(shoulderX, -43 * scale);
  miniMapCtx.lineTo(handX, handY);
  miniMapCtx.stroke();

  miniMapCtx.fillStyle = "#e9fbff";
  miniMapCtx.strokeStyle = "#071015";
  miniMapCtx.lineWidth = Math.max(1, 2 * scale);
  miniMapCtx.beginPath();
  if (facing === "left") {
    miniMapCtx.roundRect(handX - 22 * scale, handY - 6 * scale, 22 * scale, 12 * scale, 5 * scale);
  } else if (facing === "right") {
    miniMapCtx.roundRect(handX, handY - 6 * scale, 22 * scale, 12 * scale, 5 * scale);
  } else {
    miniMapCtx.roundRect(handX - 11 * scale, handY - 6 * scale, 22 * scale, 12 * scale, 5 * scale);
  }
  miniMapCtx.fill();
  miniMapCtx.stroke();

  miniMapCtx.fillStyle = lightenColor(color, 0.28);
  miniMapCtx.beginPath();
  miniMapCtx.roundRect(-12 * scale, -31 * scale, 24 * scale, 10 * scale, 5 * scale);
  miniMapCtx.fill();
}

function drawMiniMapDownedInvestigator(color, scale) {
  miniMapCtx.fillStyle = "rgba(0, 0, 0, 0.38)";
  miniMapCtx.beginPath();
  miniMapCtx.ellipse(0, 4 * scale, 34 * scale, 11 * scale, 0, 0, Math.PI * 2);
  miniMapCtx.fill();

  miniMapCtx.fillStyle = "#39444d";
  miniMapCtx.strokeStyle = "#071015";
  miniMapCtx.lineWidth = Math.max(1.4, 3 * scale);
  miniMapCtx.beginPath();
  miniMapCtx.roundRect(-34 * scale, -12 * scale, 58 * scale, 24 * scale, 12 * scale);
  miniMapCtx.fill();
  miniMapCtx.stroke();

  miniMapCtx.fillStyle = color;
  miniMapCtx.beginPath();
  miniMapCtx.arc(22 * scale, 0, 16 * scale, 0, Math.PI * 2);
  miniMapCtx.fill();
  miniMapCtx.stroke();

  miniMapCtx.fillStyle = "#20282e";
  miniMapCtx.beginPath();
  miniMapCtx.roundRect(13 * scale, -5 * scale, 18 * scale, 10 * scale, 4 * scale);
  miniMapCtx.fill();
}

function drawMiniMapAnomalySprite(anomaly, x, y, viewport) {
  const image = getMiniMapImage(miniMapAnomalyAtlas.src);
  const scale = getMiniMapCharacterScale(viewport);
  const size = 76 * scale;
  miniMapCtx.save();
  miniMapCtx.translate(x, y);
  miniMapCtx.shadowColor = "#7ae4d6";
  miniMapCtx.shadowBlur = 12;
  miniMapCtx.globalAlpha = 0.92;

  if (image.complete && image.naturalWidth) {
    const pose = getMiniMapAnomalyPose(anomaly);
    if (pose.flip) {
      miniMapCtx.scale(-1, 1);
    }
    const sx = pose.col * miniMapAnomalyAtlas.frame;
    const sy = pose.row * miniMapAnomalyAtlas.frame;
    miniMapCtx.drawImage(
      image,
      sx,
      sy,
      miniMapAnomalyAtlas.frame,
      miniMapAnomalyAtlas.frame,
      -size / 2,
      -size / 2,
      size,
      size
    );
  } else {
    miniMapCtx.fillStyle = "rgba(122, 228, 214, 0.72)";
    miniMapCtx.beginPath();
    miniMapCtx.arc(0, 0, size * 0.34, 0, Math.PI * 2);
    miniMapCtx.fill();
  }

  miniMapCtx.shadowBlur = 0;
  miniMapCtx.strokeStyle = "rgba(248, 251, 253, 0.78)";
  miniMapCtx.lineWidth = Math.max(1, 2 * scale);
  miniMapCtx.beginPath();
  miniMapCtx.arc(0, 0, size * 0.32, -0.8, 0.8);
  miniMapCtx.stroke();
  miniMapCtx.restore();
}

function getMiniMapAnomalyPose(anomaly) {
  const frame = Math.floor(performance.now() / 145) % miniMapAnomalyAtlas.cols;
  const angle = Number(anomaly?.aim) || 0;
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

function getMiniMapCharacterScale(viewport) {
  return clamp(viewport.w / 1280, 0.34, 0.72);
}

function getMiniMapInvestigatorFacingDirection(aim) {
  const x = Math.cos(aim);
  const y = Math.sin(aim);
  if (Math.abs(y) > Math.abs(x)) {
    return y < 0 ? "up" : "down";
  }
  return x < 0 ? "left" : "right";
}

function resizeMiniMap() {
  const rect = miniMap.getBoundingClientRect();
  const width = Math.max(320, Math.round(rect.width || miniMap.width));
  const height = Math.max(180, Math.round(rect.height || miniMap.height));
  if (miniMap.width !== width || miniMap.height !== height) {
    miniMap.width = width;
    miniMap.height = height;
  }
}

function getMiniMapViewport(width, height) {
  const scale = Math.min(width / 1280, height / 720);
  const w = 1280 * scale;
  const h = 720 * scale;
  return {
    x: (width - w) / 2,
    y: (height - h) / 2,
    w,
    h
  };
}

function drawMiniMapImage(imageRect, viewport, alphaOverride = null) {
  if (!imageRect?.src) return;
  const image = getMiniMapImage(imageRect.src);
  if (!image.complete || !image.naturalWidth) return;
  const x = viewport.x + ((imageRect.x ?? 0) / 1280) * viewport.w;
  const y = viewport.y + ((imageRect.y ?? 0) / 720) * viewport.h;
  const width = ((imageRect.w ?? 1280) / 1280) * viewport.w;
  const height = ((imageRect.h ?? 720) / 720) * viewport.h;
  const rotation = ((imageRect.rotation ?? 0) * Math.PI) / 180;
  miniMapCtx.save();
  miniMapCtx.translate(x + width / 2, y + height / 2);
  miniMapCtx.rotate(rotation);
  miniMapCtx.globalAlpha = alphaOverride ?? (Number.isFinite(imageRect.opacity) ? imageRect.opacity : 1);
  miniMapCtx.drawImage(image, -width / 2, -height / 2, width, height);
  miniMapCtx.restore();
}

function getMiniMapImage(src) {
  if (miniMapImages.has(src)) {
    return miniMapImages.get(src);
  }
  const image = new Image();
  image.src = src;
  miniMapImages.set(src, image);
  return image;
}

function setJoinStatus(text) {
  joinStatus.textContent = text;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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
