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
let light = false;
let dashPulse = false;
let abilityPulse = false;
let activePointerId = null;

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

lightBtn.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  light = true;
  lightBtn.classList.add("active");
});

lightBtn.addEventListener("pointerup", releaseLight);
lightBtn.addEventListener("pointercancel", releaseLight);
lightBtn.addEventListener("pointerleave", releaseLight);

dashBtn.addEventListener("click", () => {
  if (member?.role !== "Anomaly") {
    return;
  }
  dashPulse = true;
  dashBtn.classList.add("active");
  setTimeout(() => dashBtn.classList.remove("active"), 120);
});

abilityBtn.addEventListener("click", () => {
  abilityPulse = true;
  abilityBtn.classList.add("active");
  setTimeout(() => abilityBtn.classList.remove("active"), 140);
});

joystick.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  activePointerId = event.pointerId;
  joystick.setPointerCapture(activePointerId);
  updateJoystick(event);
});

joystick.addEventListener("pointermove", (event) => {
  if (event.pointerId === activePointerId) updateJoystick(event);
});

joystick.addEventListener("pointerup", releaseJoystick);
joystick.addEventListener("pointercancel", releaseJoystick);

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
  socket.emit("player:input", {
    move,
    aim: move,
    light,
    dash: member?.role === "Anomaly" ? dashPulse : false,
    ability: abilityPulse,
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
  lightBtn.textContent = member.role === "Anomaly" ? "Grab" : "Light";
  abilityBtn.textContent = member.role === "Anomaly" ? "Blackout" : "Ping";
  dashBtn.hidden = member.role !== "Anomaly";
  padStatus.textContent = `${member.role} assigned. ${lobby.members.filter((item) => item.connected).length} joined.`;
}

function updateJoystick(event) {
  const rect = joystick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const max = rect.width * 0.34;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  const len = Math.hypot(dx, dy);
  const scale = len > max ? max / len : 1;
  const knobX = dx * scale;
  const knobY = dy * scale;
  joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  move = len < rect.width * 0.08 ? { x: 0, y: 0 } : {
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

function releaseLight() {
  light = false;
  lightBtn.classList.remove("active");
}

function drawMiniMap(state, role) {
  const w = miniMap.width;
  const h = miniMap.height;
  miniMapCtx.clearRect(0, 0, w, h);
  miniMapCtx.fillStyle = "#071014";
  miniMapCtx.fillRect(0, 0, w, h);
  miniMapCtx.strokeStyle = "rgba(122, 228, 214, 0.28)";
  miniMapCtx.lineWidth = 2;
  miniMapCtx.strokeRect(8, 8, w - 16, h - 16);
  const sx = (x) => 8 + (x / 1280) * (w - 16);
  const sy = (y) => 8 + (y / 720) * (h - 16);
  for (const wall of state?.walls ?? []) {
    miniMapCtx.strokeStyle = wall.visible === false ? "rgba(244, 179, 93, 0.72)" : "rgba(174, 191, 199, 0.44)";
    miniMapCtx.fillStyle = "rgba(174, 191, 199, 0.22)";
    if (wall.shape === "segment") {
      miniMapCtx.lineWidth = Math.max(1.5, ((wall.thickness ?? 1) / 1280) * (w - 16));
      miniMapCtx.beginPath();
      miniMapCtx.moveTo(sx(wall.x), sy(wall.y));
      miniMapCtx.lineTo(sx(wall.x2), sy(wall.y2));
      miniMapCtx.stroke();
      continue;
    }
    miniMapCtx.fillRect(sx(wall.x), sy(wall.y), (wall.w / 1280) * (w - 16), (wall.h / 720) * (h - 16));
  }
  for (const agent of state?.investigators ?? []) {
    miniMapCtx.fillStyle = agent.resolve <= 0 ? "#f4b35d" : "#7ae4d6";
    miniMapCtx.beginPath();
    miniMapCtx.arc(sx(agent.x), sy(agent.y), 4, 0, Math.PI * 2);
    miniMapCtx.fill();
  }
  if (role === "Anomaly" && state?.anomaly) {
    miniMapCtx.fillStyle = "#e76f8a";
    miniMapCtx.beginPath();
    miniMapCtx.arc(sx(state.anomaly.x), sy(state.anomaly.y), 6, 0, Math.PI * 2);
    miniMapCtx.fill();
  }
}

function setJoinStatus(text) {
  joinStatus.textContent = text;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
