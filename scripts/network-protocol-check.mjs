import assert from "node:assert/strict";
import { makeProtocol } from "./network-protocol.mjs";

const protocol = makeProtocol();
const byType = new Map(protocol.messages.map((message) => [message.type, message]));

assert.equal(byType.size, protocol.messages.length, "Network protocol message types must be unique");
assert.equal(protocol.authority, "host-authoritative", "Protocol should remain host-authoritative");

const smokeContract = [
  ["session_hosted", "reliable"],
  ["session_connected", "reliable"],
  ["client_ready", "reliable"],
  ["client_input", "unreliable"],
  ["match_started", "reliable"],
  ["match_event", "reliable"],
  ["match_snapshot", "unreliable"],
  ["session_disconnected", "reliable"]
];

for (const [type, reliability] of smokeContract) {
  const message = byType.get(type);
  assert.ok(message, `Protocol is missing smoke-tested message: ${type}`);
  assert.equal(message.reliability, reliability, `${type} reliability should stay ${reliability}`);
}

for (const message of protocol.messages) {
  assert.ok(message.direction, `${message.type} must declare direction`);
  assert.ok(message.phase, `${message.type} must declare phase`);
  assert.ok(message.sender, `${message.type} must declare sender`);
  assert.ok(message.receiver, `${message.type} must declare receiver`);
  assert.ok(Array.isArray(message.payload), `${message.type} must declare payload fields`);
}

for (const kind of ["arena_event", "battery_collected", "echo_deployed", "echo_dispersed", "player_revived", "relay_online", "relay_corrupted", "match_ended"]) {
  assert.ok(protocol.eventKinds.includes(kind), `Protocol event kinds should include ${kind}`);
}

console.log(`network protocol check ok: ${protocol.messages.length} messages, ${protocol.eventKinds.length} event kinds`);
