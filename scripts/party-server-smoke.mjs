import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer as createNetServer } from "node:net";
import { fileURLToPath } from "node:url";
import { io } from "socket.io-client";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PARTY_SMOKE_PORT ?? await getAvailablePort());
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
server.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

try {
  await waitForHttp(`${baseUrl}/healthz`);
  await smokeHttpRoutes();
  await smokeSocketRoom();
  console.log("party server smoke ok");
} finally {
  server.kill("SIGTERM");
  await Promise.race([
    once(server, "exit"),
    new Promise((resolve) => setTimeout(resolve, 1000))
  ]);
}

async function smokeHttpRoutes() {
  const health = await getJson("/healthz");
  assert(health.ok === true, "/healthz should return ok true");
  assert(health.app === "Afterlight Protocol", "/healthz should identify the app");

  const rooms = await getJson("/rooms");
  assert(Array.isArray(rooms), "/rooms should return a JSON array");

  const diagnostics = await getText("/diagnostics");
  assert(diagnostics.includes("Afterlight") || diagnostics.includes("Rooms"), "/diagnostics should render room diagnostics HTML");

  const host = await fetch(`${baseUrl}/host`);
  assert(host.ok, "/host should return the host display shell");
  assert((host.headers.get("content-type") ?? "").includes("text/html"), "/host should return HTML");

  const join = await fetch(`${baseUrl}/join?code=TEST`);
  assert(join.ok, "/join should return the phone controller shell");
  assert((join.headers.get("content-type") ?? "").includes("text/html"), "/join should return HTML");
}

async function smokeSocketRoom() {
  const host = io(baseUrl);
  const player = io(baseUrl);
  try {
    await Promise.all([waitForSocket(host), waitForSocket(player)]);
    const create = await emitAck(host, "host:create", {
      map: "Observatory Annex",
      duration: 180,
      origin: baseUrl
    });
    assert(create.ok === true, "host:create should succeed");
    assert(create.room.code.length === 4, "room code should be short and joinable");
    assert(create.room.joinUrls.some((url) => url.includes("/join?code=")), "room should include phone join URL");

    const join = await emitAck(player, "player:join", {
      code: create.room.code,
      name: "Smoke",
      role: "Anomaly",
      skin: "black"
    });
    assert(join.ok === true, "player:join should succeed");
    assert(join.member.role === "Anomaly", "player role should be preserved when available");

    const inputReceived = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("phone input relay timed out")), 1000);
      host.once("phone:input", (message) => {
        clearTimeout(timeout);
        resolve(message);
      });
    });
    player.emit("player:input", {
      move: { x: 0.5, y: 0 },
      aim: { x: 1, y: 0 },
      light: true,
      ability: false,
      sequence: 1
    });
    const message = await inputReceived;
    assert(message.input.light === true, "phone input should relay sanitized light state to host");
  } finally {
    host.close();
    player.close();
  }
}

async function waitForHttp(url) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 5000) {
    if (server.exitCode !== null) {
      throw new Error(`party server exited early:\n${output}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Keep polling until the server has bound the port.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`party server did not become healthy at ${url}\n${output}`);
}

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  assert(response.ok, `${path} should return 200`);
  return response.json();
}

async function getText(path) {
  const response = await fetch(`${baseUrl}${path}`);
  assert(response.ok, `${path} should return 200`);
  return response.text();
}

function waitForSocket(socket) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("socket connect timed out")), 1500);
    socket.once("connect", () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.once("connect_error", reject);
  });
}

function emitAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${event} ack timed out`)), 1500);
    socket.emit(event, payload, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const listener = createNetServer();
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", () => {
      const address = listener.address();
      listener.close(() => {
        if (address && typeof address === "object") resolve(address.port);
        else reject(new Error("could not reserve an available party smoke port"));
      });
    });
  });
}
