import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const distRoot = new URL("../dist/", import.meta.url);
const networkRoot = new URL("network/", distRoot);
const protocolJsonUrl = new URL("network-protocol.json", networkRoot);
const protocolMarkdownUrl = new URL("network-protocol.md", networkRoot);

export const messages = [
  {
    type: "session_hosted",
    direction: "local",
    reliability: "reliable",
    sender: "host adapter",
    receiver: "local diagnostics",
    phase: "lobby",
    payload: ["id", "mode", "lobbyId", "map", "role", "connected", "startedAt"],
    notes: "Emitted when a host-authoritative session is created."
  },
  {
    type: "session_connected",
    direction: "local",
    reliability: "reliable",
    sender: "client adapter",
    receiver: "local diagnostics",
    phase: "lobby",
    payload: ["id", "mode", "map", "role", "connected", "startedAt"],
    notes: "Emitted when a client joins a hosted session id."
  },
  {
    type: "client_ready",
    direction: "client_to_host",
    reliability: "reliable",
    sender: "client",
    receiver: "host",
    phase: "lobby",
    payload: ["playerId", "role", "ready"],
    notes: "Authoritative ready state must not be dropped."
  },
  {
    type: "client_input",
    direction: "client_to_host",
    reliability: "unreliable",
    sender: "client",
    receiver: "host",
    phase: "playing",
    payload: ["playerId", "move", "aim", "light", "dash", "sequence"],
    notes: "High-frequency input. Host clamps speed, cooldowns, and sequence ordering."
  },
  {
    type: "match_launching",
    direction: "host_to_clients",
    reliability: "reliable",
    sender: "host",
    receiver: "clients",
    phase: "countdown",
    payload: ["countdown", "lobbyId", "seed", "map", "role", "phase", "time"],
    notes: "Starts synchronized launch countdown and announces the host match seed."
  },
  {
    type: "match_started",
    direction: "host_to_clients",
    reliability: "reliable",
    sender: "host",
    receiver: "clients",
    phase: "playing",
    payload: ["map", "seed", "duration", "roles"],
    notes: "Establishes authoritative seed and match duration."
  },
  {
    type: "match_snapshot",
    direction: "host_to_clients",
    reliability: "unreliable",
    sender: "host",
    receiver: "clients",
    phase: "playing",
    payload: ["tick", "seed", "timeRemaining", "anomalyStability", "teamResolve", "investigators", "anomaly", "relays"],
    notes: "High-frequency state. Hidden anomaly fields must be filtered per receiver in production."
  },
  {
    type: "match_event",
    direction: "host_to_clients",
    reliability: "reliable",
    sender: "host",
    receiver: "clients",
    phase: "playing",
    payload: ["kind", "map", "role", "phase", "time"],
    notes: "Umbrella event for battery, revive, relay, reveal, collapse, and ability milestones."
  },
  {
    type: "match_ended",
    direction: "host_to_clients",
    reliability: "reliable",
    sender: "host",
    receiver: "clients",
    phase: "results",
    payload: ["role", "outcome", "map", "seed", "stats", "timeRemaining", "teamResolve", "anomalyStability"],
    notes: "Authoritative round summary used by achievements, stats, presence, and feedback packets."
  },
  {
    type: "session_disconnected",
    direction: "bidirectional",
    reliability: "reliable",
    sender: "host_or_client",
    receiver: "connected_peers",
    phase: "any",
    payload: ["reason"],
    notes: "Only peers still connected can receive disconnect notices."
  }
];

export const eventKinds = [
  "battery_collected",
  "arena_event",
  "echo_deployed",
  "echo_dispersed",
  "investigator_collapsed",
  "player_collapsed",
  "player_revived",
  "relay_online",
  "relay_corrupted",
  "anomaly_revealed",
  "ability_used",
  "match_ended"
];

export function makeProtocol() {
  return {
    app: "Afterlight Protocol",
    version: "0.1.0",
    generatedAt: new Date().toISOString(),
    authority: "host-authoritative",
    transportTargets: [
      "LocalLoopbackTransport",
      "Steam Networking Sockets",
      "Steam Networking Messages",
      "future platform relay"
    ],
    reliabilityPolicy: {
      reliable: "Lifecycle, lobby, objective, collapse/revive, summary, and disconnect events.",
      unreliable: "High-frequency client input and host snapshots."
    },
    antiCheatNotes: [
      "Never trust client hit claims.",
      "Clamp movement speed, dash cooldowns, interact/revive ranges, and ability cooldowns on the host.",
      "Do not replicate hidden anomaly position or intent to investigator clients unless revealed.",
      "Filter match snapshots per receiver before replacing the loopback transport with a real online transport."
    ],
    eventKinds,
    messages
  };
}

export function makeMarkdown(data) {
  const rows = data.messages.map((message) => {
    return `| \`${message.type}\` | ${message.direction} | ${message.reliability} | ${message.phase} | ${message.payload.map((field) => `\`${field}\``).join(", ")} |`;
  }).join("\n");
  const eventRows = data.eventKinds.map((kind) => `- \`${kind}\``).join("\n");
  const antiCheat = data.antiCheatNotes.map((note) => `- ${note}`).join("\n");
  const transports = data.transportTargets.map((target) => `- ${target}`).join("\n");

  return `# ${data.app} Network Protocol

- Version: ${data.version}
- Generated: ${data.generatedAt}
- Authority: ${data.authority}

## Transport Targets

${transports}

## Reliability Policy

- Reliable: ${data.reliabilityPolicy.reliable}
- Unreliable: ${data.reliabilityPolicy.unreliable}

## Messages

| Type | Direction | Reliability | Phase | Payload Fields |
| --- | --- | --- | --- | --- |
${rows}

## Match Event Kinds

${eventRows}

## Anti-Cheat Notes

${antiCheat}
`;
}

const protocol = makeProtocol();

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  await mkdir(networkRoot, { recursive: true });
  await writeFile(protocolJsonUrl, `${JSON.stringify(protocol, null, 2)}\n`);
  await writeFile(protocolMarkdownUrl, makeMarkdown(protocol));

  console.log(`Network protocol written to dist/network/network-protocol.json and dist/network/network-protocol.md with ${protocol.messages.length} messages`);
}
