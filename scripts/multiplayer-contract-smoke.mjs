import assert from "node:assert/strict";
import { LocalLoopbackTransport, PlatformServices } from "../src/platform.js";

function requireMessage(messages, type, { reliable } = {}) {
  const message = messages.find((candidate) => {
    return candidate.type === type && (reliable === undefined || candidate.reliable === reliable);
  });

  assert.ok(message, `Expected ${type} message${reliable === undefined ? "" : ` with reliable=${reliable}`}`);
  return message;
}

const transport = new LocalLoopbackTransport();
const host = new PlatformServices({ networkTransport: transport, peerId: "host-peer" });
const client = new PlatformServices({ networkTransport: transport, peerId: "client-peer" });

const hostLobby = host.lobbies.create({ role: "Investigator", map: "Observatory Annex" });
host.presence.setActivity({
  state: "lobby",
  details: "Hosting a private lobby",
  map: hostLobby.map,
  role: "Investigator",
  party: { size: hostLobby.members.length, capacity: hostLobby.capacity },
  inviteCode: hostLobby.inviteCode
});

const hostedSession = host.network.host({
  lobbyId: hostLobby.id,
  map: hostLobby.map,
  role: "Investigator"
});

const connectedSession = client.network.connect({
  sessionId: hostedSession.id,
  map: hostLobby.map,
  role: "Anomaly"
});

client.presence.setActivity({
  state: "lobby",
  details: "Joined by invite",
  map: hostLobby.map,
  role: "Anomaly",
  party: { size: hostLobby.members.length, capacity: hostLobby.capacity },
  inviteCode: hostLobby.inviteCode
});

client.network.sendReliable("client_ready", {
  playerId: "player-client",
  role: "Anomaly",
  ready: true
});

client.network.sendUnreliable("client_input", {
  playerId: "player-client",
  move: { x: 1, y: 0 },
  aim: 0.5,
  light: false,
  dash: false,
  sequence: 1
});

host.network.sendReliable("match_started", {
  map: hostLobby.map,
  seed: 1842,
  duration: 300,
  roles: {
    host: "Investigator",
    client: "Anomaly"
  }
});

host.network.sendReliable("match_event", {
  kind: "relay_online",
  relayId: "relay-east",
  relaysCharged: 1
});

host.network.sendUnreliable("match_snapshot", {
  tick: 42,
  timeRemaining: 298.6,
  anomalyStability: 94,
  investigators: [
    { id: "host-player", x: 12, y: 8, resolve: 100 }
  ],
  anomaly: { visible: false }
});

assert.equal(connectedSession.id, hostedSession.id, "Client should connect to the hosted session id");
assert.equal(host.network.getState().mode, "host", "Host should remain in host mode");
assert.equal(client.network.getState().mode, "client", "Client should remain in client mode");
assert.equal(host.network.getTransportState().connected, true, "Host transport peer should be connected");
assert.equal(client.network.getTransportState().connected, true, "Client transport peer should be connected");
assert.deepEqual(transport.getState().sessions[0].peers.sort(), ["client-peer", "host-peer"], "Loopback transport should route both peers through one session");

requireMessage(host.network.getMessages(), "session_hosted", { reliable: true });
requireMessage(client.network.getMessages(), "session_connected", { reliable: true });

const readyMessage = requireMessage(host.network.getReceivedMessages(), "client_ready", { reliable: true });
assert.equal(readyMessage.payload.ready, true, "Host should receive the client's ready state");

const inputMessage = requireMessage(host.network.getReceivedMessages(), "client_input", { reliable: false });
assert.equal(inputMessage.payload.sequence, 1, "Host should receive ordered client input payloads");

const startMessage = requireMessage(client.network.getReceivedMessages(), "match_started", { reliable: true });
assert.equal(startMessage.payload.duration, 300, "Client should receive the authoritative match duration");

const eventMessage = requireMessage(client.network.getReceivedMessages(), "match_event", { reliable: true });
assert.equal(eventMessage.payload.kind, "relay_online", "Client should receive reliable match events");

const snapshotMessage = requireMessage(client.network.getReceivedMessages(), "match_snapshot", { reliable: false });
assert.equal(snapshotMessage.payload.tick, 42, "Client should receive host snapshots");

host.network.disconnect("contract-complete");
client.network.disconnect("contract-complete");

requireMessage(client.network.getReceivedMessages(), "session_disconnected", { reliable: true });

const reverseHost = new PlatformServices({ networkTransport: transport, peerId: "reverse-host-peer" });
const reverseClient = new PlatformServices({ networkTransport: transport, peerId: "reverse-client-peer" });
const reverseSession = reverseHost.network.host({
  lobbyId: "reverse-contract",
  map: "Tideglass Aquarium",
  role: "Investigator"
});
reverseClient.network.connect({
  sessionId: reverseSession.id,
  map: "Tideglass Aquarium",
  role: "Anomaly"
});
reverseClient.network.disconnect("client-left");

const reverseDisconnect = requireMessage(reverseHost.network.getReceivedMessages(), "session_disconnected", { reliable: true });
assert.equal(reverseDisconnect.payload.reason, "client-left", "Host should receive client disconnect notices");
reverseHost.network.disconnect("contract-complete");

assert.equal(transport.getState().sessions.length, 0, "Loopback transport should clear empty sessions");

console.log("multiplayer contract smoke ok");
