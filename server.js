import { createReadStream, existsSync } from "node:fs";
import { appendFile, copyFile, mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { basename, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import QRCode from "qrcode";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT ?? 5173);
const roomTtlMs = 1000 * 60 * 60 * 6;
const storageRoot = resolve(process.env.AFTERLIGHT_STORAGE_DIR ?? (existsSync("/data") ? "/data/afterlight" : join(root, ".afterlight-data")));
const storageDirs = makeStorageDirs(storageRoot);
const mapMusicDir = resolve(process.env.MAP_MUSIC_DIR ?? storageDirs.music);
const soundEffectsDir = resolve(process.env.MAP_SOUND_EFFECTS_DIR ?? storageDirs.sfx);
const soundEffectsConfigFile = resolve(process.env.SOUND_EFFECTS_CONFIG_FILE ?? join(soundEffectsDir, "sound-effects.json"));
const globalSettingsFile = resolve(process.env.GLOBAL_SETTINGS_FILE ?? join(storageDirs.settings, "global-settings.json"));
const maxMapMusicUploadBytes = 12 * 1024 * 1024;
const maxMapMusicRequestBytes = Math.ceil(maxMapMusicUploadBytes * 1.4) + 2048;
const maxSoundEffectUploadBytes = 12 * 1024 * 1024;
const maxSoundEffectRequestBytes = Math.ceil(maxSoundEffectUploadBytes * 1.4) + 2048;
const maxMapImageUploadBytes = 10 * 1024 * 1024;
const maxMapImageRequestBytes = Math.ceil(maxMapImageUploadBytes * 1.4) + 2048;
const maxMapDataBytes = 2 * 1024 * 1024;
const rooms = new Map();

const defaultGlobalSettings = {
  batteries: {
    respawnTimerSeconds: 30,
    lowBatteryThreshold: 0.35,
    startingPickups: 1,
    maxActivePickups: 3,
    flashlightBatteryMax: 165.6,
    flashlightDrainPerSecond: 19.2,
    aiFlashlightDrainPerSecond: 15.6,
    overchargeDurationSeconds: 18,
    overchargeDamageMultiplier: 2.15,
    overchargeReviveMultiplier: 1.75
  }
};

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

const soundEffectEventIds = new Set([
  "ghost_shock",
  "ghost_damage",
  "ghost_escape",
  "ghost_escape_loop",
  "ghost_grab",
  "ghost_carry_loop",
  "battery_spawn",
  "pickup",
  "round_intro",
  "round_outro",
  "flashlight_on",
  "flashlight_off",
  "revive_progress",
  "revive",
  "downed",
  "blackout",
  "dash",
  "relay",
  "lightning",
  "win",
  "lose",
  "hit"
]);

await ensureStorage();
await appendStorageLog("storage:ready", {
  root: storageRoot,
  volume: existsSync("/data")
});

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
    if (requestUrl.pathname === "/api/storage" && req.method === "GET") {
      sendJson(res, await storageStatus());
      return;
    }
    if (requestUrl.pathname === "/api/global-settings" && req.method === "GET") {
      sendJson(res, await readGlobalSettings());
      return;
    }
    if (requestUrl.pathname === "/api/global-settings" && req.method === "PUT") {
      sendJson(res, await saveGlobalSettings(req));
      return;
    }
    if (requestUrl.pathname === "/api/maps" && req.method === "GET") {
      sendJson(res, await listStoredMaps());
      return;
    }
    if (requestUrl.pathname === "/api/maps" && req.method === "POST") {
      sendJson(res, await saveStoredMap(req), 201);
      return;
    }
    if (requestUrl.pathname.startsWith("/api/maps/") && req.method === "GET") {
      sendJson(res, await readStoredMap(requestUrl.pathname));
      return;
    }
    if (requestUrl.pathname.startsWith("/api/maps/") && req.method === "DELETE") {
      sendJson(res, await deleteStoredMap(requestUrl.pathname));
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
    if (requestUrl.pathname === "/api/sound-effects" && req.method === "GET") {
      sendJson(res, await listSoundEffects());
      return;
    }
    if (requestUrl.pathname === "/api/sound-effects" && req.method === "POST") {
      sendJson(res, await saveSoundEffect(req), 201);
      return;
    }
    if (requestUrl.pathname === "/api/sound-effects/config" && req.method === "GET") {
      sendJson(res, await readSoundEffectsConfig());
      return;
    }
    if (requestUrl.pathname === "/api/sound-effects/config" && req.method === "PUT") {
      sendJson(res, await saveSoundEffectsConfig(req));
      return;
    }
    if (requestUrl.pathname.startsWith("/api/sound-effects/") && req.method === "DELETE") {
      sendJson(res, await deleteSoundEffect(requestUrl.pathname));
      return;
    }
    if (requestUrl.pathname === "/api/map-images" && req.method === "GET") {
      sendJson(res, await listMapImages(requestUrl.searchParams.get("kind")));
      return;
    }
    if (requestUrl.pathname === "/api/map-images" && req.method === "POST") {
      sendJson(res, await saveMapImage(req), 201);
      return;
    }
    if (requestUrl.pathname.startsWith("/api/map-images/") && req.method === "DELETE") {
      sendJson(res, await deleteMapImage(requestUrl.pathname));
      return;
    }
    if (requestUrl.pathname.startsWith("/assets/audio/maps/") && (req.method === "GET" || req.method === "HEAD")) {
      await sendMapMusicAsset(requestUrl.pathname, res);
      return;
    }
    if (requestUrl.pathname.startsWith("/storage/audio/sfx/") && (req.method === "GET" || req.method === "HEAD")) {
      await sendSoundEffectAsset(requestUrl.pathname, res);
      return;
    }
    if (requestUrl.pathname.startsWith("/storage/images/") && (req.method === "GET" || req.method === "HEAD")) {
      await sendMapImageAsset(requestUrl.pathname, res);
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
  console.log(`Afterlight party server listening on 0.0.0.0:${port}`);
  appendStorageLog("server:start", { port }).catch(() => {});
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`Afterlight party server received ${signal}; shutting down`);
    server.close(() => {
      appendStorageLog("server:stop", { signal }).finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 5000).unref();
  });
}

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

function makeStorageDirs(base) {
  return {
    root: base,
    maps: join(base, "maps"),
    mapDrafts: join(base, "maps", "drafts"),
    mapPublished: join(base, "maps", "published"),
    media: join(base, "media"),
    images: join(base, "media", "images"),
    imageBackgrounds: join(base, "media", "images", "backgrounds"),
    imageForegrounds: join(base, "media", "images", "foregrounds"),
    imageProps: join(base, "media", "images", "props"),
    imageMisc: join(base, "media", "images", "misc"),
    music: join(base, "media", "music"),
    sfx: join(base, "media", "sfx"),
    settings: join(base, "settings"),
    uploads: join(base, "uploads"),
    logs: join(base, "logs"),
    tmp: join(base, "tmp")
  };
}

async function ensureStorage() {
  await Promise.all(Object.values(storageDirs).map((dir) => mkdir(dir, { recursive: true })));
  await migrateLegacyMusic();
}

async function migrateLegacyMusic() {
  const legacyDir = join("/data", "map-music");
  if (!existsSync(legacyDir) || resolve(legacyDir) === resolve(mapMusicDir)) return;
  const entries = await readdir(legacyDir, { withFileTypes: true });
  await mkdir(mapMusicDir, { recursive: true });
  await Promise.all(entries
    .filter((entry) => entry.isFile() && [".mp3", ".ogg", ".wav"].includes(extname(entry.name).toLowerCase()))
    .map(async (entry) => {
      const target = join(mapMusicDir, sanitizeAudioFilename(entry.name));
      if (existsSync(target)) return;
      await copyFile(join(legacyDir, entry.name), target);
    }));
}

async function storageStatus() {
  await ensureStorage();
  return {
    ok: true,
    root: storageRoot,
    volume: existsSync("/data"),
    structure: {
      maps: {
        drafts: relativeStoragePath(storageDirs.mapDrafts),
        published: relativeStoragePath(storageDirs.mapPublished)
      },
      media: {
        images: {
          backgrounds: relativeStoragePath(storageDirs.imageBackgrounds),
          foregrounds: relativeStoragePath(storageDirs.imageForegrounds),
          props: relativeStoragePath(storageDirs.imageProps),
          misc: relativeStoragePath(storageDirs.imageMisc)
        },
        music: relativeStoragePath(mapMusicDir),
        sfx: relativeStoragePath(soundEffectsDir)
      },
      uploads: relativeStoragePath(storageDirs.uploads),
      settings: relativeStoragePath(storageDirs.settings),
      logs: relativeStoragePath(storageDirs.logs),
      tmp: relativeStoragePath(storageDirs.tmp)
    },
    counts: {
      maps: await countFiles(storageDirs.mapPublished),
      images: await countFiles(storageDirs.images),
      music: await countFiles(mapMusicDir),
      sfx: await countFiles(soundEffectsDir),
      settings: await countFiles(storageDirs.settings),
      logs: await countFiles(storageDirs.logs)
    }
  };
}

async function countFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true, recursive: true });
    return entries.filter((entry) => entry.isFile()).length;
  } catch {
    return 0;
  }
}

function relativeStoragePath(dir) {
  return dir === storageRoot ? "." : dir.replace(`${storageRoot}${sep}`, "");
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
  await appendStorageLog("music:upload", { filename, size: info.size });
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
  await appendStorageLog("music:delete", { filename });
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

async function listSoundEffects() {
  await mkdir(soundEffectsDir, { recursive: true });
  const entries = await readdir(soundEffectsDir, { withFileTypes: true });
  const items = await Promise.all(entries
    .filter((entry) => entry.isFile() && isAudioExtension(entry.name))
    .map(async (entry) => {
      const filePath = join(soundEffectsDir, entry.name);
      const info = await stat(filePath);
      return soundEffectItem(entry.name, info.size, info.mtimeMs);
    }));
  return { ok: true, soundEffects: items.sort((a, b) => a.name.localeCompare(b.name)) };
}

async function saveSoundEffect(req) {
  const payload = await readJsonBody(req, maxSoundEffectRequestBytes);
  const { mimeType, bytes, extension } = dataUrlToBytes(payload.dataUrl, audioMimeTypes());
  if (bytes.length > maxSoundEffectUploadBytes) throw httpError(413, "Audio upload is larger than 12 MB.");
  await mkdir(soundEffectsDir, { recursive: true });
  const filename = await uniqueStoredFilename(soundEffectsDir, `${slugifyAudioName(payload.name || "sound-effect")}${extension}`);
  const filePath = join(soundEffectsDir, filename);
  await writeFile(filePath, bytes);
  const info = await stat(filePath);
  await appendStorageLog("sfx:upload", { filename, size: info.size });
  return { ok: true, soundEffect: soundEffectItem(filename, info.size, info.mtimeMs, mimeType) };
}

async function deleteSoundEffect(pathname) {
  const filename = sanitizeAudioFilename(decodeURIComponent(pathname.replace(/^\/api\/sound-effects\//, "")));
  if (!filename) throw httpError(400, "Choose a valid sound effect file.");
  if (filename === "config") throw httpError(400, "Choose a valid sound effect file.");
  const filePath = resolveStoredFile(soundEffectsDir, filename);
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code === "ENOENT") throw httpError(404, "Sound effect not found.");
    throw error;
  }
  await removeSoundEffectAssignments(`/storage/audio/sfx/${filename}`);
  await appendStorageLog("sfx:delete", { filename });
  return { ok: true, deleted: filename };
}

async function sendSoundEffectAsset(pathname, res) {
  const filename = sanitizeAudioFilename(decodeURIComponent(pathname.replace(/^\/storage\/audio\/sfx\//, "")));
  if (!filename) {
    sendText(res, 404, "Not found");
    return;
  }
  const filePath = resolveStoredFile(soundEffectsDir, filename);
  if (!existsSync(filePath)) {
    sendText(res, 404, "Not found");
    return;
  }
  await sendFile(res, filePath);
}

async function readSoundEffectsConfig() {
  await mkdir(soundEffectsDir, { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(soundEffectsConfigFile, "utf8"));
    return { ok: true, version: 1, soundEffects: normalizeSoundEffectsConfig(parsed.soundEffects ?? parsed) };
  } catch (error) {
    if (error.code === "ENOENT") return { ok: true, version: 1, soundEffects: {} };
    throw error;
  }
}

async function saveSoundEffectsConfig(req) {
  const payload = await readJsonBody(req, maxMapDataBytes);
  const soundEffects = normalizeSoundEffectsConfig(payload.soundEffects ?? payload);
  await mkdir(soundEffectsDir, { recursive: true });
  await writeFile(soundEffectsConfigFile, `${JSON.stringify({ version: 1, soundEffects }, null, 2)}\n`);
  await appendStorageLog("sfx:config", { assignments: Object.keys(soundEffects).length });
  return { ok: true, version: 1, soundEffects };
}

async function removeSoundEffectAssignments(src) {
  const config = await readSoundEffectsConfig();
  const soundEffects = { ...config.soundEffects };
  let changed = false;
  for (const [id, effect] of Object.entries(soundEffects)) {
    if (effect?.src === src) {
      delete soundEffects[id];
      changed = true;
    }
  }
  if (changed) {
    await mkdir(soundEffectsDir, { recursive: true });
    await writeFile(soundEffectsConfigFile, `${JSON.stringify({ version: 1, soundEffects }, null, 2)}\n`);
  }
}

async function readGlobalSettings() {
  await mkdir(storageDirs.settings, { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(globalSettingsFile, "utf8"));
    return { ok: true, version: 1, settings: normalizeGlobalSettings(parsed.settings ?? parsed) };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { ok: true, version: 1, settings: normalizeGlobalSettings(defaultGlobalSettings) };
    }
    throw error;
  }
}

async function saveGlobalSettings(req) {
  const payload = await readJsonBody(req, maxMapDataBytes);
  const settings = normalizeGlobalSettings(payload.settings ?? payload);
  await mkdir(storageDirs.settings, { recursive: true });
  await writeFile(globalSettingsFile, `${JSON.stringify({ version: 1, settings }, null, 2)}\n`);
  await appendStorageLog("settings:global", { groups: Object.keys(settings).length });
  return { ok: true, version: 1, settings };
}

function normalizeGlobalSettings(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const batteries = source.batteries && typeof source.batteries === "object" && !Array.isArray(source.batteries)
    ? source.batteries
    : {};
  const defaults = defaultGlobalSettings.batteries;
  const settings = {
    batteries: {
      respawnTimerSeconds: clampNumber(batteries.respawnTimerSeconds, 5, 180, defaults.respawnTimerSeconds),
      lowBatteryThreshold: clampNumber(batteries.lowBatteryThreshold, 0.05, 0.95, defaults.lowBatteryThreshold),
      startingPickups: Math.round(clampNumber(batteries.startingPickups, 0, 8, defaults.startingPickups)),
      maxActivePickups: Math.round(clampNumber(batteries.maxActivePickups, 1, 12, defaults.maxActivePickups)),
      flashlightBatteryMax: clampNumber(batteries.flashlightBatteryMax, 30, 300, defaults.flashlightBatteryMax),
      flashlightDrainPerSecond: clampNumber(batteries.flashlightDrainPerSecond, 1, 60, defaults.flashlightDrainPerSecond),
      aiFlashlightDrainPerSecond: clampNumber(batteries.aiFlashlightDrainPerSecond, 1, 60, defaults.aiFlashlightDrainPerSecond),
      overchargeDurationSeconds: clampNumber(batteries.overchargeDurationSeconds, 0, 60, defaults.overchargeDurationSeconds),
      overchargeDamageMultiplier: clampNumber(batteries.overchargeDamageMultiplier, 1, 5, defaults.overchargeDamageMultiplier),
      overchargeReviveMultiplier: clampNumber(batteries.overchargeReviveMultiplier, 1, 5, defaults.overchargeReviveMultiplier)
    }
  };
  settings.batteries.maxActivePickups = Math.max(settings.batteries.startingPickups, settings.batteries.maxActivePickups);
  return settings;
}

function normalizeSoundEffectsConfig(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value).reduce((next, [id, effect]) => {
    if (!soundEffectEventIds.has(id)) return next;
    const normalized = normalizeSoundEffectEntry(effect);
    if (normalized) next[id] = normalized;
    return next;
  }, {});
}

function normalizeSoundEffectEntry(effect) {
  const src = String(effect?.src ?? "");
  if (!src.startsWith("/storage/audio/sfx/")) return null;
  const filename = sanitizeAudioFilename(decodeURIComponent(src.replace(/^\/storage\/audio\/sfx\//, "")));
  if (!filename) return null;
  return {
    name: sanitizeText(effect.name, filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), 80),
    src: `/storage/audio/sfx/${filename}`,
    mimeType: mimeTypes[extname(filename).toLowerCase()] ?? "audio/mpeg",
    size: Math.max(0, Number(effect.size ?? 0) || 0),
    volume: clampNumber(effect.volume, 0, 1, 1),
    bus: effect.bus === "music" ? "music" : "sfx",
    loop: effect.loop === true
  };
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

function soundEffectItem(filename, size, mtimeMs, mimeType = null) {
  return {
    name: filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
    filename,
    src: `/storage/audio/sfx/${filename}`,
    mimeType: mimeType ?? mimeTypes[extname(filename).toLowerCase()] ?? "audio/mpeg",
    size,
    updatedAt: new Date(mtimeMs).toISOString()
  };
}

async function listMapImages(kind) {
  const kinds = kind ? [sanitizeImageKind(kind)] : imageKinds();
  const images = [];
  for (const itemKind of kinds) {
    const dir = imageKindDir(itemKind);
    await mkdir(dir, { recursive: true });
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !isImageExtension(entry.name)) continue;
      const info = await stat(join(dir, entry.name));
      images.push(mapImageItem(itemKind, entry.name, info.size, info.mtimeMs));
    }
  }
  return { ok: true, images: images.sort((a, b) => a.name.localeCompare(b.name)) };
}

async function saveMapImage(req) {
  const payload = await readJsonBody(req, maxMapImageRequestBytes);
  const kind = sanitizeImageKind(payload.kind ?? "misc");
  const { mimeType, bytes, extension } = dataUrlToBytes(payload.dataUrl, imageMimeTypes());
  if (bytes.length > maxMapImageUploadBytes) throw httpError(413, "Image upload is larger than 10 MB.");
  const dir = imageKindDir(kind);
  await mkdir(dir, { recursive: true });
  const filename = await uniqueStoredFilename(dir, `${slugifyStorageName(payload.name || "map-image")}${extension}`);
  const filePath = join(dir, filename);
  await writeFile(filePath, bytes);
  const info = await stat(filePath);
  await appendStorageLog("image:upload", { kind, filename, size: info.size });
  return { ok: true, image: mapImageItem(kind, filename, info.size, info.mtimeMs, mimeType) };
}

async function deleteMapImage(pathname) {
  const [, kind, rawFilename] = /^\/api\/map-images\/([^/]+)\/([^/]+)$/.exec(pathname) ?? [];
  const imageKind = sanitizeImageKind(kind);
  const filename = sanitizeImageFilename(decodeURIComponent(rawFilename ?? ""));
  if (!filename) throw httpError(400, "Choose a valid image file.");
  const filePath = resolveStoredFile(imageKindDir(imageKind), filename);
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code === "ENOENT") throw httpError(404, "Image file not found.");
    throw error;
  }
  await appendStorageLog("image:delete", { kind: imageKind, filename });
  return { ok: true, deleted: filename };
}

async function sendMapImageAsset(pathname, res) {
  const [, kind, rawFilename] = /^\/storage\/images\/([^/]+)\/([^/]+)$/.exec(pathname) ?? [];
  const imageKind = sanitizeImageKind(kind);
  const filename = sanitizeImageFilename(decodeURIComponent(rawFilename ?? ""));
  if (!filename) {
    sendText(res, 404, "Not found");
    return;
  }
  const filePath = resolveStoredFile(imageKindDir(imageKind), filename);
  if (!existsSync(filePath)) {
    sendText(res, 404, "Not found");
    return;
  }
  await sendFile(res, filePath);
}

function mapImageItem(kind, filename, size, mtimeMs, mimeType = null) {
  return {
    kind,
    name: filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
    filename,
    src: `/storage/images/${kind}/${filename}`,
    mimeType: mimeType ?? mimeTypes[extname(filename).toLowerCase()] ?? "image/png",
    size,
    updatedAt: new Date(mtimeMs).toISOString()
  };
}

async function listStoredMaps() {
  await mkdir(storageDirs.mapPublished, { recursive: true });
  const entries = await readdir(storageDirs.mapPublished, { withFileTypes: true });
  const maps = await Promise.all(entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".json")
    .map(async (entry) => {
      const info = await stat(join(storageDirs.mapPublished, entry.name));
      return storedMapItem(entry.name, info.size, info.mtimeMs);
    }));
  return { ok: true, maps: maps.sort((a, b) => a.name.localeCompare(b.name)) };
}

async function saveStoredMap(req) {
  const payload = await readJsonBody(req, maxMapDataBytes);
  const map = payload.map ?? payload;
  if (!map || typeof map !== "object" || Array.isArray(map)) throw httpError(400, "Map payload must be an object.");
  const name = sanitizeText(map.name ?? payload.name, "Untitled Map", 64);
  await mkdir(storageDirs.mapPublished, { recursive: true });
  const filename = await uniqueStoredFilename(storageDirs.mapPublished, `${slugifyStorageName(name)}.json`);
  const filePath = join(storageDirs.mapPublished, filename);
  await writeFile(filePath, `${JSON.stringify(map, null, 2)}\n`);
  const info = await stat(filePath);
  await appendStorageLog("map:save", { filename, size: info.size });
  return { ok: true, map: storedMapItem(filename, info.size, info.mtimeMs) };
}

async function readStoredMap(pathname) {
  const filename = sanitizeJsonFilename(decodeURIComponent(pathname.replace(/^\/api\/maps\//, "")));
  if (!filename) throw httpError(400, "Choose a valid map file.");
  const filePath = resolveStoredFile(storageDirs.mapPublished, filename);
  try {
    return { ok: true, map: JSON.parse(await readFile(filePath, "utf8")) };
  } catch (error) {
    if (error.code === "ENOENT") throw httpError(404, "Map file not found.");
    throw error;
  }
}

async function deleteStoredMap(pathname) {
  const filename = sanitizeJsonFilename(decodeURIComponent(pathname.replace(/^\/api\/maps\//, "")));
  if (!filename) throw httpError(400, "Choose a valid map file.");
  const filePath = resolveStoredFile(storageDirs.mapPublished, filename);
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code === "ENOENT") throw httpError(404, "Map file not found.");
    throw error;
  }
  await appendStorageLog("map:delete", { filename });
  return { ok: true, deleted: filename };
}

function storedMapItem(filename, size, mtimeMs) {
  return {
    name: filename.replace(/\.json$/i, "").replace(/[-_]+/g, " "),
    filename,
    src: `/api/maps/${filename}`,
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

function sanitizeImageFilename(value) {
  const name = basename(String(value ?? ""));
  const ext = extname(name).toLowerCase();
  if (!Object.values(imageMimeTypes()).includes(ext)) return "";
  return `${slugifyStorageName(name.slice(0, -ext.length))}${ext}`;
}

function sanitizeJsonFilename(value) {
  const name = basename(String(value ?? ""));
  const ext = extname(name).toLowerCase();
  if (ext !== ".json") return "";
  return `${slugifyStorageName(name.slice(0, -ext.length))}.json`;
}

function slugifyAudioName(value) {
  return String(value).toLowerCase().replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "map-music";
}

function slugifyStorageName(value) {
  return String(value).toLowerCase().replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}

async function uniqueStoredFilename(dir, preferred) {
  const ext = extname(preferred).toLowerCase();
  const base = slugifyStorageName(preferred.slice(0, -ext.length));
  for (let index = 0; index < 1000; index += 1) {
    const candidate = index ? `${base}-${index + 1}${ext}` : `${base}${ext}`;
    if (!existsSync(join(dir, candidate))) return candidate;
  }
  return `${base}-${Date.now()}${ext}`;
}

function dataUrlToBytes(dataUrl, allowedMimeTypes) {
  const match = /^data:([^;,]+);base64,([a-z0-9+/=\s]+)$/i.exec(String(dataUrl ?? ""));
  if (!match) throw httpError(400, "Upload must be a base64 data URL.");
  const mimeType = match[1].toLowerCase();
  const extension = allowedMimeTypes[mimeType];
  if (!extension) throw httpError(400, "Unsupported file type.");
  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!bytes.length) throw httpError(400, "Upload was empty.");
  return { mimeType, bytes, extension };
}

function imageMimeTypes() {
  return {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/svg+xml": ".svg"
  };
}

function audioMimeTypes() {
  return {
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav"
  };
}

function isAudioExtension(filename) {
  return [".mp3", ".ogg", ".wav"].includes(extname(filename).toLowerCase());
}

function imageKinds() {
  return ["backgrounds", "foregrounds", "props", "misc"];
}

function sanitizeImageKind(value) {
  const aliases = {
    background: "backgrounds",
    foreground: "foregrounds",
    prop: "props",
    decoration: "props"
  };
  const kind = aliases[String(value ?? "").toLowerCase()] ?? String(value ?? "").toLowerCase();
  if (imageKinds().includes(kind)) return kind;
  throw httpError(400, "Choose a valid image kind.");
}

function imageKindDir(kind) {
  return {
    backgrounds: storageDirs.imageBackgrounds,
    foregrounds: storageDirs.imageForegrounds,
    props: storageDirs.imageProps,
    misc: storageDirs.imageMisc
  }[kind];
}

function isImageExtension(filename) {
  return Object.values(imageMimeTypes()).includes(extname(filename).toLowerCase());
}

function resolveStoredFile(dir, filename) {
  const libraryRoot = resolve(dir);
  const filePath = resolve(libraryRoot, filename);
  if (filePath !== libraryRoot && filePath.startsWith(`${libraryRoot}${sep}`)) return filePath;
  throw httpError(403, "File is outside storage.");
}

async function appendStorageLog(event, detail = {}) {
  await mkdir(storageDirs.logs, { recursive: true });
  const line = `${JSON.stringify({ event, detail, at: new Date().toISOString() })}\n`;
  await appendFile(join(storageDirs.logs, "server-events.jsonl"), line);
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
    ability: role === "Anomaly" && Boolean(payload.ability),
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
