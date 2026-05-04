import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { io } from "socket.io-client";

const root = fileURLToPath(new URL("..", import.meta.url));
const distRoot = resolve(root, "dist", "party");
const jsonPath = join(distRoot, "party-remote-smoke.json");
const markdownPath = join(distRoot, "party-remote-smoke.md");
const args = parseArgs(process.argv.slice(2));
const baseUrl = normalizeBaseUrl(args.url ?? process.env.PARTY_REMOTE_URL ?? process.env.RAILWAY_PUBLIC_URL);

if (args.help || !baseUrl) {
  printUsage();
  process.exit(args.help ? 0 : 1);
}

const checks = [];
let roomCode = null;

try {
  await smokeHttpRoutes();
  roomCode = await smokeSocketRoom();
} catch (error) {
  checks.push({
    area: "Remote Smoke",
    status: "blocked",
    detail: error.message
  });
}

const blockers = checks.filter((check) => check.status === "blocked");
const output = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  baseUrl,
  ready: blockers.length === 0,
  roomCode,
  summary: {
    checks: checks.length,
    blocked: blockers.length
  },
  checks
};

await mkdir(dirname(jsonPath), { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(output));

console.log(`party remote smoke ${output.ready ? "ready" : "blocked"}: ${output.summary.blocked} blockers`);
console.log(`wrote ${relative(root, jsonPath)} and ${relative(root, markdownPath)}`);

if (!output.ready) process.exit(1);

async function smokeHttpRoutes() {
  const health = await getJson("/healthz");
  record("Health Route", health.ok === true && health.app === "Afterlight Protocol", "/healthz returns ok true for Afterlight Protocol.");

  const rooms = await getJson("/rooms");
  record("Rooms Route", Array.isArray(rooms), "/rooms returns JSON diagnostics.");

  const diagnostics = await getText("/diagnostics");
  record("Diagnostics Route", diagnostics.includes("Afterlight") || diagnostics.includes("Rooms"), "/diagnostics renders human-readable room diagnostics.");

  const host = await fetchWithTimeout(`${baseUrl}/host`);
  record("Host Route", host.ok && (host.headers.get("content-type") ?? "").includes("text/html"), "/host returns the laptop display shell.");

  const join = await fetchWithTimeout(`${baseUrl}/join?code=TEST`);
  record("Join Route", join.ok && (join.headers.get("content-type") ?? "").includes("text/html"), "/join returns the phone controller shell.");
}

async function smokeSocketRoom() {
  const host = io(baseUrl, { timeout: 5000 });
  const player = io(baseUrl, { timeout: 5000 });
  try {
    await Promise.all([waitForSocket(host), waitForSocket(player)]);
    record("Socket Connect", true, "Host and phone sockets connect to the remote server.");

    const create = await emitAck(host, "host:create", {
      map: "Observatory Annex",
      duration: 180,
      origin: baseUrl
    });
    record("Host Create", create?.ok === true && create.room?.code?.length === 4, "Host can create a room with a short code.");
    record("Join URL", create?.room?.joinUrls?.some((url) => url.includes("/join?code=")), "Room includes QR-ready phone join URLs.");

    const join = await emitAck(player, "player:join", {
      code: create.room.code,
      name: "RemoteSmoke",
      role: "Investigator",
      skin: "blue"
    });
    record("Phone Join", join?.ok === true && join.member?.name === "RemoteSmoke", "Phone can join the remote room.");

    const inputReceived = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("remote phone input relay timed out")), 3000);
      host.once("phone:input", (message) => {
        clearTimeout(timeout);
        resolve(message);
      });
    });
    player.emit("player:input", {
      move: { x: 0.35, y: -0.25 },
      aim: { x: 1, y: 0 },
      light: true,
      ability: false,
      sequence: 1
    });
    const message = await inputReceived;
    record("Input Relay", message.input?.light === true && message.name === "RemoteSmoke", "Phone input relays to the host over the deployed Socket.IO server.");
    return create.room.code;
  } finally {
    host.close();
    player.close();
  }
}

async function getJson(path) {
  const response = await fetchWithTimeout(`${baseUrl}${path}`);
  record(`${path} HTTP`, response.ok, `${path} returns HTTP ${response.status}.`);
  return response.json();
}

async function getText(path) {
  const response = await fetchWithTimeout(`${baseUrl}${path}`);
  record(`${path} HTTP`, response.ok, `${path} returns HTTP ${response.status}.`);
  return response.text();
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function waitForSocket(socket) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("remote socket connect timed out")), 6000);
    socket.once("connect", () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function emitAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${event} ack timed out`)), 6000);
    socket.emit(event, payload, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

function record(area, ok, detail) {
  checks.push({
    area,
    status: ok ? "ready" : "blocked",
    detail
  });
  if (!ok) throw new Error(detail);
}

function makeMarkdown(data) {
  const rows = data.checks.map((check) => `| ${check.area} | ${check.status} | ${check.detail} |`).join("\n");
  return `# Party Remote Smoke

- Generated: ${data.generatedAt}
- URL: ${data.baseUrl}
- Ready: ${data.ready ? "yes" : "no"}
- Blockers: ${data.summary.blocked}
- Room code: ${data.roomCode ?? "-"}

| Area | Status | Detail |
|---|---|---|
${rows}
`;
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--url") parsed.url = rawArgs[++index];
  }
  return parsed;
}

function normalizeBaseUrl(value) {
  if (!value) return "";
  return String(value).trim().replace(/\/+$/, "");
}

function printUsage() {
  console.log(`Usage:
  npm run party:remote-smoke -- --url https://YOUR-RAILWAY-DOMAIN

Environment fallback:
  PARTY_REMOTE_URL=https://YOUR-RAILWAY-DOMAIN npm run party:remote-smoke
`);
}
