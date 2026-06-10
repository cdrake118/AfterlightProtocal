# Afterlight Protocol

Afterlight Protocol is an original asymmetric party-horror arena prototype inspired by hidden-role light-and-shadow games, built with original characters, names, maps, UI, and audio identity.

The first milestone in this repository is a browser prototype. It proves the round loop, investigator flashlight combat, anomaly stealth pressure, battery pickups, lobby flow, and a platform adapter shape that can later be wired to Steamworks.

## Run Locally

Run:

```sh
npm run serve
```

Then open `http://127.0.0.1:5173`.

Controls are documented in `docs/DESIGN.md`.

## Run Party Host

Run:

```sh
npm run serve:party
```

Then open `http://127.0.0.1:5173/host` on the laptop display. Use HDMI or AirPlay to show that laptop screen on the TV.

Click `Host` to create a phone-controller room. Phones can scan the QR code or open `/join?code=ROOM`. The host browser remains match-authoritative for this next-weekend milestone; the server relays lobby state and phone inputs.

Controller connection flow:

1. Host opens `/host` and presses `Host`.
2. Share the QR/link shown in the host panel.
3. Phone opens `/join`, enters the room code (if needed), picks role/skin, and taps `Ready`.
4. Host starts once the lobby is ready.

Railway can run the same entrypoint:

```sh
npm start
```

Railway should provide `PORT`; no extra port configuration is required in the app.

## Package Build

Automation variables are listed in `.env.example` and explained in `docs/CONFIGURATION.md`.

Run:

```sh
npm run package:web
```

This writes a static playable build to `dist/web` and emits `dist/web/build-manifest.json` for future depot/upload automation.

Run:

```sh
npm run audit:release
```

This packages the build, then verifies the manifest, required files, self-contained runtime references, and packaged public-copy guardrails.

Run:

```sh
npm run steam:plan
```

This packages and audits the build, then writes SteamCMD-style VDF descriptors to `dist/steam`. Set `STEAM_APP_ID`, `STEAM_DEPOT_ID`, `STEAM_BRANCH`, and `STEAM_BUILD_DESC` to generate real app/depot values.

Run:

```sh
npm run release:report
```

This runs the full packaging/audit/Steam planning chain, then writes `dist/release-report.json` and `dist/release-report.md` with gate status, file sizes, and SHA-256 hashes.
The report includes the Steam upload dry-run gate and the redacted SteamCMD command for the generated app build VDF.

Run:

```sh
npm run steam:upload:dry-run
```

This writes `dist/steam/steam-upload-report.json` with the redacted SteamCMD command that would upload the current build. A real upload requires `STEAM_UPLOAD=1`, `STEAMCMD_PATH`, `STEAM_USERNAME`, and `STEAM_PASSWORD`.

Run:

```sh
npm run playtest:plan
```

This writes `dist/playtest/private-beta-plan.json` and `dist/playtest/private-beta-plan.md` with beta branch commands, tester instructions, focus areas, promotion criteria, and known risks. Set `PLAYTEST_BRANCH`, `PLAYTEST_WAVE_SIZE`, and `PLAYTEST_FEEDBACK_URL` to customize the plan.

Run:

```sh
npm run store:kit
```

This writes `dist/store/store-page-kit.json` and `dist/store/store-page-kit.md` with draft Steam store copy, feature bullets, tag suggestions, visual asset specs, trailer beats, localization scope, and release checklist. Set `STORE_PAGE_STATE` and `STORE_LANGUAGES` to customize the kit.

Run:

```sh
npm run store:capture
```

This writes `dist/store/capture-plan.json` and `dist/store/capture-plan.md` with gameplay screenshot shots, replay-link setup URLs, trailer clip filenames, capsule-art QA, and final capture checks.

Run:

```sh
npm run localization:kit
```

This writes `dist/localization/source-strings.json` and `dist/localization/localization-brief.md` with source strings for store copy, key UI labels, controls, input actions, results, help text, trailer beats, glossary, and translator guidance.

Run:

```sh
npm run network:protocol
```

This writes `dist/network/network-protocol.json` and `dist/network/network-protocol.md` with host/client message types, reliability, payload fields, event kinds, and anti-cheat notes for future online transport work.

Run:

```sh
npm run network:check
```

This verifies the generated protocol contract against the multiplayer smoke-test message expectations.

Run:

```sh
npm run replay:check
```

This writes `dist/replay/replay-link-check.json` and `dist/replay/replay-link-check.md` with validated replay URL scenarios for map, role, round length, bot pressure, and seed restoration.

Run:

```sh
npm run input:map
```

This writes `dist/input/input-action-map.json` and `dist/input/input-action-map.md` with Steam Input-ready action sets, current keyboard/gamepad bindings, and localization ids.

Run:

```sh
npm run assets:validate
```

This verifies the current runtime character atlas manifests and rejects RGB/white-background sprite sheets before they can enter runtime. Generated investigator sheets remain source-only until they are cleaned into transparent fixed-frame atlases.

Run:

```sh
npm run maps:import
```

This converts the sample Tiled manor party map into the existing game map data shape.

Run:

```sh
npm run config:check
```

This writes `dist/config/platform-config-check.json` and `dist/config/platform-config-check.md` with redacted Steam, playtest, and store environment readiness.

Run:

```sh
npm run playtest:intake
```

This writes `dist/playtest/feedback-intake.json`, `dist/playtest/feedback-intake.md`, and `dist/playtest/sample-feedback-packet.json` with a hosted-URL or local-archive feedback handoff plan.

Run:

```sh
npm run submission:packet
```

This writes `dist/submission/submission-packet.json` and `dist/submission/submission-packet.md` with links to release, upload, beta, feedback-intake, store, capture-plan, and localization artifacts plus blockers, manual prerequisites, commands, and next actions.

Run:

```sh
npm run smoke:multiplayer
```

This runs an internet-free host/client contract check through the local loopback transport for lobby session setup, reliable match events, unreliable input/snapshots, and disconnect notices.

## Current Scope

- Local playable prototype.
- Original visual identity and mechanics language.
- Five prototype arenas: Observatory Annex, Tideglass Aquarium, Prism Foundry, Gloamhall Manor, and Gloamhall Manor Compact.
- Map-specific arena events for reveal, signal distortion, and echo misdirection.
- Arena-event HUD countdown and lobby briefing cards for playtest readability.
- Mock lobby flow.
- Procedural Web Audio soundtrack with menu and round moods, a tension layer that follows anomaly pressure, and synthesized SFX for every cue (sound is on by default; file-based tracks still override when present).
- Heartbeat proximity audio that quickens as the anomaly closes on the local investigator.
- Dynamic darkness rendering: the arena sits in shadow while flashlight beams, player auras, and battery pickups carve light pools out of it; lightning events briefly light the whole arena.
- Railway-ready party relay server with `/host`, `/join`, `/healthz`, `/rooms`, and `/diagnostics`.
- Phone controller UI with joystick, role/skin selection, ready state, private anomaly minimap, and haptic feedback (proximity pulses, downed/revive buzzes, anomaly damage ticks).
- Asset pipeline docs and atlas validation for transparent fixed-frame sprite sheets.
- Tiled map pipeline docs and a sample manor party map import.
- Audio manifest and pipeline docs for music/SFX replacement assets.
- Platform abstraction stubs for lobbies, invite codes, network sessions, achievements, career stats, entitlements, cosmetics, persistent settings, and rich presence.
- Local loopback transport for repeatable host/client contract checks before Steam networking is integrated.
- Replay-link contract automation for shareable playtest reproduction URLs.
- Input action map automation for Steam Input and future platform glyph support.
- Private beta planning automation for Steam branch playtests.
- Store page kit automation for copy, visual assets, trailer planning, localization, and release checklist work.
- Store capture-plan automation for screenshot, trailer, and capsule-art handoff.
- Localization source-string automation for store and key in-game text.
- Redacted platform configuration checks for Steam upload and beta readiness.
- Submission packet automation that aggregates release, beta, store, and localization readiness.
- Feedback intake automation for hosted feedback URLs or local archive handoff.
- Post-match tuning notes that turn round stats into playtest recommendations.
- Match seeds in results, snapshots, and feedback packets for reproducible playtest debugging.
- Replay Seed control for rerunning a prior seeded round locally.
- Replay links that restore map, role, duration, bot pressure, and seed from URL parameters.
- Saved Reports panel for loading or copying recent archived feedback replay setups.
- Report archive digest, import, export, and clear controls for managing local playtest waves.
- Keyboard/mouse plus standard gamepad input.
- Socket.IO party relay dependency for next-weekend phone-controller testing.

## Next Milestone

The next production step is moving the gameplay prototype into a native engine target, most likely Unreal Engine if visual quality is the highest priority, while keeping the game rules and lobby/session model defined here.
