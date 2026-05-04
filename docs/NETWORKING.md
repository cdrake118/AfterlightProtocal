# Networking Plan

## Prototype State

The current browser build uses a local mock lobby and mock lobby browser. It is not real online multiplayer yet. It exists to validate UX, match flow, search/join states, and platform boundaries before binding to a transport.

The party host build adds a Railway-ready Socket.IO relay in `server.js`. For the next-weekend party milestone, the laptop host browser remains match-authoritative while phones send controller input through Socket.IO rooms.

## Party Host Routes

- `/host`: laptop/TV host display.
- `/join?code=ROOM`: phone controller join flow.
- `/healthz`: Railway health check.
- `/rooms`: JSON room diagnostics.
- `/diagnostics`: human-readable room diagnostics.

## Party Socket Events

- `host:create`: host creates a room and receives a QR join URL.
- `lobby:state`: server broadcasts room members, role choices, skins, ready state, and connection state.
- `player:join`: phone joins by room code.
- `player:update`: phone updates role, skin, name, or ready state.
- `player:input`: phone sends joystick/actions to the server.
- `phone:input`: server relays sanitized phone input to the host.
- `host:start`: host announces match start.
- `host:state`: host sends low-rate match state back to phones, including the anomaly private minimap feed.

## Session Messages

Gameplay should exchange compact messages:

- ClientInput: movement vector, aim direction, tool state, anomaly dash request.
- MatchSnapshot: seed, positions, visibility, health, pickups, timer.
- MatchEvent: battery collected, player collapsed, player revived, anomaly revealed, match ended.
- LobbyState: members, roles, readiness, map, privacy, region.
- LobbyState also carries an invite code, capacity, privacy, region, and launch state.
- LobbyListing: id, invite code, host, map, region, ping, player count, capacity, privacy.
- JoinByInvite: invite code plus desired role; returns a lobby state or a not-found result.

## Network Session Contract

- `NetworkSession.host` starts a host-authoritative session from the lobby, map, and role.
- Reliable messages carry match lifecycle and important events: launch, match start, battery pickup, revive, ability use, player collapse, and match end.
- Unreliable messages are reserved for high-frequency input/snapshot traffic.
- The browser prototype stores emitted messages in the mock session so tests can verify event shape before a real transport exists.
- The in-game Net Log panel reads the mock session state and recent messages for local multiplayer diagnostics.
- Match launch, snapshots, round summaries, and feedback packets carry a host seed so confusing rounds can be reproduced during debugging.
- Prototype testers can paste a recorded seed into the lobby toolbar to rerun the same seeded gameplay sequence locally.
- Results can copy a replay URL with map, role, duration, bot pressure, and seed parameters for shareable reproduction.
- `LocalLoopbackTransport` provides an adapter-shaped in-memory transport for local host/client verification. Production platform transports should preserve the same `host`, `connect`, reliable send, unreliable send, receive, and disconnect semantics.

## Host/Client Contract Smoke

Run:

```sh
npm run network:protocol
```

This writes the generated protocol catalog in `dist/network`, including message direction, reliability, payload fields, event kinds, and anti-cheat notes.

Run:

```sh
npm run network:check
```

This verifies that the protocol catalog still covers the smoke-tested host/client messages and reliability expectations.

Run:

```sh
npm run replay:check
```

This verifies the replay-link contract and writes scenario samples in `dist/replay` for shareable reproduction URLs.

Run:

```sh
npm run smoke:multiplayer
```

This creates separate host and client platform adapters, connects the client to the host session id through `LocalLoopbackTransport`, and asserts the core production contract:

- Client ready state is reliable host-bound traffic.
- Client input is unreliable host-bound traffic.
- Match start and match events are reliable client-bound traffic.
- Match snapshots are unreliable client-bound traffic.
- Disconnect notices are reliable to peers that are still connected. The smoke covers host-to-client and client-to-host disconnects in separate sessions.

The test is internet-free by design, but it is no longer transport-free. Steam Networking Sockets, Steam Networking Messages, Epic Online Services, or a custom relay should be able to replace the loopback transport while keeping these message names and reliability expectations intact.

Run:

```sh
npm run party:deploy-check
```

This verifies the Railway-facing deployment contract before a party test:

- `railway.json` uses `npm start` and `/healthz`.
- `package.json` keeps `start` and `serve:party` pointed at `server.js`.
- `server.js` reads `PORT`, binds `0.0.0.0`, and exposes `/healthz`, `/host`, and `/join`.
- Required Socket.IO and QR dependencies are present.

Run:

```sh
npm run party:server-smoke
```

This boots the real Node party server on a temporary local port and verifies the next-weekend phone-controller path:

- `/healthz`, `/rooms`, `/diagnostics`, `/host`, and `/join?code=ROOM` respond.
- A host can create a Socket.IO room with a QR-ready join URL.
- A phone client can join the room with a role and skin.
- Phone joystick/action input relays to the host as sanitized `phone:input` data.

## Lobby UX Contract

- Host creates a private lobby with a short invite code.
- Quick Join searches public lobbies for the selected map, then creates a public lobby if none are open.
- Browse shows public and private mock listings with player count, ping, region, and invite code.
- Join Code accepts a short invite code and resolves through the same lobby service interface a Steam invite or platform deep link would use later.
- Ready state is per-member and moves the lobby into a launching state before the match countdown.

## Presence Contract

- Presence activity is published through the platform adapter during lobby, launch, live match, and results states.
- Activity includes state, readable details, map, role, party size/capacity, invite code when available, time remaining during live play, and match outcome after results.
- Steam rich presence can map these fields to friend-list text, join buttons, and invite metadata without gameplay code calling Steam directly.

## Latency Strategy

- Investigators can use client-side prediction for movement.
- Flashlight hits should be host-authoritative with visual client prediction.
- Anomaly visibility should be host-authoritative to prevent cheating.
- Pickups and collapse events should resolve on the host only.

## Anti-Cheat Baseline

- Never trust client hit claims.
- Clamp input speed and cooldowns on the host.
- Keep anomaly position hidden from investigator clients unless revealed.
- Do not replicate hidden state to clients that do not need it.
