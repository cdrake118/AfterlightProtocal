import { createReadStream, existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { basename, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import QRCode from "qrcode";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT ?? 5173);
const roomTtlMs = 1000 * 60 * 60 * 6;
const mapMusicDir = resolve(process.env.MAP_MUSIC_DIR ?? (existsSync("/data") ? "/data/map-music" : join(root, "assets", "audio", "maps")));
const maxMapMusicUploadBytes = 12 * 1024 * 1024;
const maxMapMusicRequestBytes = Math.ceil(maxMapMusicUploadBytes * 1.4) + 2048;
const rooms = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav"
};

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? "/", getOrigin(req));
    if (requestUrl.pathname === "/healthz") {
      sendJson(res, {
        ok: true,
        app: "Afterlight Protocol",
        rooms: rooms.size,
        uptime: Math.round(process.uptime())
      });
      return;
    }
    if (requestUrl.pathname === "/rooms") {
      sendJson(res, [...rooms.values()].map(serializeRoom));
      return;
    }
    if (requestUrl.pathname === "/diagnostics") {
      sendHtml(res, renderDiagnosticsPage([...rooms.values()]));
      return;
    }
    if (requestUrl.pathname === "/api/map-music" && req.method === "GET") {
      sendJson(res, await listMapMusic());
      return;
    }
    if (requestUrl.pathname === "/api/map-music" && req.method === "POST") {
      sendJson(res, await saveMapMusic(req), 201);
      return;
    }
    if (requestUrl.pathname.startsWith("/api/map-music/") && req.method === "DELETE") {
      sendJson(res, await deleteMapMusic(requestUrl.pathname));
      return;
    }
    if (requestUrl.pathname.startsWith("/assets/audio/maps/") && (req.method === "GET" || req.method === "HEAD")) {
      await sendMapMusicAsset(requestUrl.pathname, res);
      return;
    }
    if (requestUrl.pathname === "/host") {
      await sendFile(res, join(root, "index.html"));
      return;
    }
    if (requestUrl.pathname === "/join" || requestUrl.pathname === "/controller") {
      await sendFile(res, join(root, "controller.html"));
      return;
    }
    await sendStatic(requestUrl.pathname, res);
  } catch (error) {
    console.error(error);
    if (error.status) {
      sendJson(res, { ok: false, error: error.message }, error.status);
      return;
    }
    sendText(res, 500, "Internal server error");
  }
});

const io = new Server(server, {
  cors: { origin: true },
  connectionStateRecovery: {
    maxDisconnectionDuration: 1000 * 60 * 2,
    skipMiddlewares: true
  }
});

io.on("connection", (socket) => {
  socket.on("host:create", async (payload = {}, reply) => {
    pruneRooms();
    const code = makeRoomCode();
    const origins = makeJoinOrigins(payload.origin || getSocketOrigin(socket));
    const joinUrls = origins.map((origin) => `${origin}/join?code=${code}`);
    const joinUrl = joinUrls[0];
    const room = {
      code,
      hostSocketId: socket.id,
      hostConnected: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      map: sanitizeText(payload.map, "Observatory Annex", 48),
      duration: clampNumber(payload.duration, 180, 600, 300),
      phase: "lobby",
      members: [],
      lastState: null,
      joinUrl,
      joinUrls,
      qrDataUrl: await QRCode.toDataURL(joinUrl, { margin: 1, scale: 7 })
    };
    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.kind = "host";
    reply?.({ ok: true, room: serializeRoom(room), qrDataUrl: room.qrDataUrl });
    emitLobbyState(room);
  });

  socket.on("host:update", (payload = {}) => {
    const room = getHostRoom(socket);
    if (!room) return;
    room.map = sanitizeText(payload.map, room.map, 48);
    room.duration = clampNumber(payload.duration, 180, 600, room.duration);
    room.phase = sanitizeText(payload.phase, room.phase, 24);
    room.updatedAt = Date.now();
    emitLobbyState(room);
  });

  socket.on("host:start", (payload = {}) => {
    const room = getHostRoom(socket);
    if (!room) return;
    room.phase = "playing";
    room.seed = sanitizeText(payload.seed, "", 16);
    room.updatedAt = Date.now();
    emitLobbyState(room);
    socket.to(room.code).emit("match:start", {
      code: room.code,
      map: room.map,
      duration: room.duration,
      seed: room.seed
    });
  });

  socket.on("host:state", (payload = {}) => {
    const room = getHostRoom(socket);
    if (!room) return;
    room.lastState = {
      ...payload,
      sentAt: Date.now()
    };
    room.updatedAt = Date.now();
    socket.to(room.code).emit("host:state", room.lastState);
  });

  socket.on("player:join", (payload = {}, reply) => {
    pruneRooms();
    const code = normalizeCode(payload.code);
    const room = rooms.get(code);
    if (!room) {
      reply?.({ ok: false, error: "Room not found" });
      return;
    }
    if (room.members.length >= 5) {
      reply?.({ ok: false, error: "Room is full" });
      return;
    }
    const preferredRole = sanitizeRole(payload.role);
    const role = chooseRole(room, preferredRole);
    const member = {
      id: socket.id,
      name: sanitizeText(payload.name, makeGuestName(room.members.length + 1), 18),
      role,
      skin: sanitizeText(payload.skin, "brown", 24),
      ready: false,
      connected: true,
      joinedAt: Date.now(),
      lastInputAt: 0
    };
    room.members = room.members.filter((existing) => existing.id !== socket.id);
    room.members.push(member);
    room.updatedAt = Date.now();
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.kind = "player";
    socket.data.memberId = member.id;
    reply?.({ ok: true, room: serializeRoom(room), member });
    emitLobbyState(room);
  });

  socket.on("player:update", (payload = {}) => {
    const room = getPlayerRoom(socket);
    const member = getMember(room, socket.id);
    if (!room || !member) return;
    if (payload.name !== undefined) member.name = sanitizeText(payload.name, member.name, 18);
    if (payload.skin !== undefined) member.skin = sanitizeText(payload.skin, member.skin, 24);
    if (payload.role !== undefined) member.role = chooseRole(room, sanitizeRole(payload.role), member.id);
    if (payload.ready !== undefined) member.ready = Boolean(payload.ready);
    member.connected = true;
    room.updatedAt = Date.now();
    emitLobbyState(room);
  });

  socket.on("player:input", (payload = {}) => {
    const room = getPlayerRoom(socket);
    const member = getMember(room, socket.id);
    if (!room || !member) return;
    member.lastInputAt = Date.now();
    io.to(room.hostSocketId).emit("phone:input", {
      playerId: member.id,
      name: member.name,
      role: member.role,
      skin: member.skin,
      input: sanitizeInput(payload, member.role),
      sentAt: Date.now()
    });
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    const room = code ? rooms.get(code) : null;
    if (!room) return;
    if (socket.data.kind === "host") {
      room.hostConnected = false;
      room.hostSocketId = null;
      room.phase = "host-disconnected";
    } else {
      const member = getMember(room, socket.id);
      if (member) member.connected = false;
    }
    room.updatedAt = Date.now();
    emitLobbyState(room);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Afterlight party server listening on http://127.0.0.1:${port}`);
});

async function sendStatic(pathname, res) {
  const safePath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  let filePath = resolve(root, safePath === "/" ? "index.html" : safePath.slice(1));
  if (!filePath.startsWith(root)) {
    sendText(res, 403, "Forbidden");
    return;
  }
  if (existsSync(filePath)) {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, "index.html");
  }
  if (!existsSync(filePath)) {
    sendText(res, 404, "Not found");
    return;
  }
  await sendFile(res, filePath);
}

async function sendFile(res, filePath) {
  const info = await stat(filePath);
  if (!info.isFile()) {
    sendText(res, 404, "Not found");
    return;
  }
  const type = mimeTypes[extname(filePath)] ?? "application/octet-stream";
  res.writeHead(200, {
    "content-type": type,
    "cache-control": type.includes("html") ? "no-store" : "public, max-age=60"
  });
  createReadStream(filePath).pipe(res);
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(data, null, 2));
}

function sendHtml(res, html) {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  res.end(html);
}

function sendText(res, status, text) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
}

function getOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] ?? "http";
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? `127.0.0.1:${port}`;
  return `${proto}://${host}`;
}

async function listMapMusic() {
  await mkdir(mapMusicDir, { recursive: true });
  const entries = await readdir(mapMusicDir, { withFileTypes: true });
  const items = await Promise.all(entries
    .filter((entry) => entry.isFile() && [".mp3", ".ogg", ".wav"].includes(extname(entry.name).toLowerCase()))
    .map(async (entry) => {
      const filePath = join(mapMusicDir, entry.name);
      const info = await stat(filePath);
      return mapMusicItem(entry.name, info.size, info.mtimeMs);
    }));
  return { ok: true, music: items.sort((a, b) => a.name.localeCompare(b.name)) };
}

async function saveMapMusic(req) {
  const payload = await readJsonBody(req, maxMapMusicRequestBytes);
  const dataUrl = String(payload.dataUrl ?? "");
  const match = /^data:(audio\/mpeg|audio\/mp3);base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) throw httpError(400, "Upload an MP3 audio file.");
  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!bytes.length) throw httpError(400, "MP3 upload was empty.");
  if (bytes.length > maxMapMusicUploadBytes) throw httpError(413, "MP3 upload is larger than 12 MB.");
  await mkdir(mapMusicDir, { recursive: true });
  const base = slugifyAudioName(payload.name || "map-music");
  const filename = await uniqueAudioFilename(`${base}.mp3`);
  const filePath = join(mapMusicDir, filename);
  await writeFile(filePath, bytes);
  const info = await stat(filePath);
  return { ok: true, music: mapMusicItem(filename, info.size, info.mtimeMs) };
}

async function deleteMapMusic(pathname) {
  const filename = basename(decodeURIComponent(pathname.replace(/^\/api\/map-music\//, "")));
  if (!filename || filename !== sanitizeAudioFilename(filename)) throw httpError(400, "Choose a valid music file.");
  const filePath = resolveMapMusicFile(filename);
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code === "ENOENT") throw httpError(404, "Music file not found.");
    throw error;
  }
  return { ok: true, deleted: filename };
}

async function sendMapMusicAsset(pathname, res) {
  const filename = basename(decodeURIComponent(pathname.replace(/^\/assets\/audio\/maps\//, "")));
  if (!filename || filename !== sanitizeAudioFilename(filename)) {
    sendText(res, 404, "Not found");
    return;
  }
  const filePath = resolveMapMusicFile(filename);
  if (!existsSync(filePath)) {
    sendText(res, 404, "Not found");
    return;
  }
  await sendFile(res, filePath);
}

async function readJsonBody(req, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw httpError(413, "Request body is too large.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw httpError(400, "Request body must be JSON.");
  }
}

async function uniqueAudioFilename(preferred) {
  const safe = sanitizeAudioFilename(preferred);
  const base = safe.replace(/\.mp3$/i, "");
  for (let index = 0; index < 1000; index += 1) {
    const candidate = index ? `${base}-${index + 1}.mp3` : safe;
    if (!existsSync(join(mapMusicDir, candidate))) return candidate;
  }
  return `${base}-${Date.now()}.mp3`;
}

function resolveMapMusicFile(filename) {
  const libraryRoot = resolve(mapMusicDir);
  const filePath = resolve(libraryRoot, filename);
  if (filePath !== libraryRoot && filePath.startsWith(`${libraryRoot}${sep}`)) return filePath;
  throw httpError(403, "Music file is outside the library.");
}

function mapMusicItem(filename, size, mtimeMs) {
  return {
    name: filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
    filename,
    src: `/assets/audio/maps/${filename}`,
    mimeType: mimeTypes[extname(filename).toLowerCase()] ?? "audio/mpeg",
    size,
    updatedAt: new Date(mtimeMs).toISOString()
  };
}

function sanitizeAudioFilename(value) {
  const name = basename(String(value ?? ""));
  const ext = extname(name).toLowerCase();
  if (![".mp3", ".ogg", ".wav"].includes(ext)) return "";
  const stem = slugifyAudioName(name.slice(0, -ext.length));
  return `${stem}${ext}`;
}

function slugifyAudioName(value) {
  return String(value).toLowerCase().replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "map-music";
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getSocketOrigin(socket) {
  const proto = socket.handshake.headers["x-forwarded-proto"] ?? "http";
  const host = socket.handshake.headers["x-forwarded-host"] ?? socket.handshake.headers.host ?? `127.0.0.1:${port}`;
  return `${proto}://${host}`;
}

function getHostRoom(socket) {
  const code = socket.data.roomCode;
  const room = code ? rooms.get(code) : null;
  return room?.hostSocketId === socket.id ? room : null;
}

function getPlayerRoom(socket) {
  const code = socket.data.roomCode;
  return code ? rooms.get(code) : null;
}

function getMember(room, id) {
  return room?.members.find((member) => member.id === id) ?? null;
}

function emitLobbyState(room) {
  io.to(room.code).emit("lobby:state", serializeRoom(room));
}

function serializeRoom(room) {
  return {
    code: room.code,
    map: room.map,
    duration: room.duration,
    phase: room.phase,
    hostConnected: room.hostConnected,
    joinUrl: room.joinUrl,
    joinUrls: room.joinUrls ?? [room.joinUrl],
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    members: room.members.map((member) => ({ ...member }))
  };
}

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    for (let i = 0; i < 4; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (!rooms.has(code)) return code;
  }
  return String(Date.now()).slice(-4);
}

function makeJoinOrigins(origin) {
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    parsed = new URL(`http://127.0.0.1:${port}`);
  }
  const explicitOrigin = parsed.origin;
  const localHost = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (!localHost) {
    return [explicitOrigin];
  }
  const lanOrigins = getLanAddresses().map((address) => `${parsed.protocol}//${address}:${parsed.port || port}`);
  return [...new Set([...lanOrigins, explicitOrigin])];
}

function getLanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
}

function normalizeCode(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function sanitizeRole(value) {
  return value === "Anomaly" ? "Anomaly" : "Investigator";
}

function chooseRole(room, preferred, memberId = null) {
  if (preferred !== "Anomaly") return "Investigator";
  const anomalyTaken = room.members.some((member) => member.id !== memberId && member.role === "Anomaly");
  return anomalyTaken ? "Investigator" : "Anomaly";
}

function sanitizeText(value, fallback, maxLength) {
  const text = String(value ?? "").trim().replace(/[<>]/g, "");
  return (text || fallback).slice(0, maxLength);
}

function sanitizeInput(payload, role = "Investigator") {
  return {
    move: sanitizeVector(payload.move),
    aim: sanitizeVector(payload.aim),
    light: Boolean(payload.light),
    dash: role === "Anomaly" && Boolean(payload.dash),
    ability: Boolean(payload.ability),
    sequence: Number.isFinite(payload.sequence) ? payload.sequence : 0
  };
}

function sanitizeVector(value) {
  const x = clampNumber(value?.x, -1, 1, 0);
  const y = clampNumber(value?.y, -1, 1, 0);
  const len = Math.hypot(x, y);
  if (len <= 1) return { x, y };
  return { x: x / len, y: y / len };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function makeGuestName(index) {
  return `Player ${index}`;
}

function pruneRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (!room.hostConnected && now - room.updatedAt > 1000 * 60 * 20) {
      rooms.delete(code);
    } else if (now - room.createdAt > roomTtlMs) {
      rooms.delete(code);
    }
  }
}

function renderDiagnosticsPage(roomList) {
  const rows = roomList.map((room) => `
    <tr>
      <td>${room.code}</td>
      <td>${room.phase}</td>
      <td>${room.map}</td>
      <td>${room.hostConnected ? "yes" : "no"}</td>
      <td>${room.members.filter((member) => member.connected).length}/${room.members.length}</td>
      <td>${new Date(room.updatedAt).toLocaleTimeString()}</td>
    </tr>
  `).join("");
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Afterlight Diagnostics</title>
      <style>
        body { background: #071014; color: #eef7f8; font-family: system-ui, sans-serif; margin: 32px; }
        table { border-collapse: collapse; width: 100%; max-width: 980px; }
        th, td { border-bottom: 1px solid #234047; padding: 10px 12px; text-align: left; }
        th { color: #7ae4d6; }
        a { color: #f4b35d; }
      </style>
    </head>
    <body>
      <h1>Afterlight Room Diagnostics</h1>
      <p><a href="/healthz">Health JSON</a> | <a href="/host">Host Display</a> | <a href="/join">Phone Join</a></p>
      <table>
        <thead><tr><th>Code</th><th>Phase</th><th>Map</th><th>Host</th><th>Players</th><th>Updated</th></tr></thead>
        <tbody>${rows || "<tr><td colspan=\"6\">No active rooms</td></tr>"}</tbody>
      </table>
    </body>
  </html>`;
}

export async function listAssetFiles() {
  return readdir(join(root, "assets"), { recursive: true });
}

export async function readAssetFile(pathname) {
  return readFile(join(root, "assets", pathname), "utf8");
}
