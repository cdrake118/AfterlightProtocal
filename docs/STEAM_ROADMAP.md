# Steam And Platform Roadmap

## Platform Strategy

The game should not call Steamworks directly from gameplay code. Instead, all platform services should sit behind small interfaces:

- LobbyService: create, search, join, invite, leave, ready state.
- Invite Flow: short invite codes in the prototype map to Steam lobby invites or platform deep links in production.
- NetworkSession: host, connect, emit reliable match events, send unreliable input/snapshots, disconnect.
- Transport: local loopback in the prototype, then Steam Networking Sockets/Messages or another platform relay behind the same network session contract.
- PresenceService: friends, rich presence, join requests, party size, map, role, and invite metadata.
- PlaytestFeedbackService: local report capture in the prototype, later replaceable with a beta backend or platform-specific reporting flow.
- EntitlementService: ownership and DLC checks; cosmetics query this instead of embedding store logic.
- CosmeticService: loadouts, unlock state, and future DLC/entitlement-gated cosmetics.
- AchievementService: round summary evaluation, one-time unlocks, and stat-backed milestones.
- StatsService: lifetime match totals and best records suitable for Steam stats.
- StorageService: persisted settings, achievement progress, cosmetics, saves, and cloud sync.
- Input Layer: keyboard/mouse and standard gamepad actions stay gameplay-owned; prompt mode is tracked so Steam Input glyphs can replace text labels later.

The browser prototype includes a mock platform service in `src/platform.js` to establish this separation.

## Steam Path

1. Complete Steamworks onboarding and pay the current Steam Direct app fee.
2. Create app, packages, depots, and branches.
3. Integrate Steam lobbies for party formation and invites.
4. Integrate Steam Networking Sockets or Steam Networking Messages for gameplay transport.
5. Replace mock achievement, storage, and presence services with Steam stat/achievement, cloud save, and rich presence calls; then add controller glyphs.
6. Automate build upload with SteamCMD.
7. Create a private beta branch for playtests.
8. Prepare store page, trailer, capsule art, localization, and release checklist.

## Multiplayer Model

Use a host-authoritative session for the first public version:

- Lobby owner becomes host by default.
- Host simulates anomaly, investigators, pickups, hazards, and match timer.
- Clients submit input commands.
- Host broadcasts snapshots and important events.
- Future dedicated-server support remains possible because game rules stay deterministic and isolated.

## Automation Goals

- One command to build the game for the active target.
- One command to package Steam depots.
- One command to upload to a selected Steam branch.
- One command to run smoke tests against local host/client instances.

Current prototype automation:

- `npm run check` validates syntax and the runtime smoke path.
- `.env.example` and `docs/CONFIGURATION.md` document safe dry-run, private beta, real-upload, store, and localization configuration.
- `npm run package:web` stages the dependency-free static build in `dist/web` with a build manifest.
- `npm run audit:release` packages the build and validates the manifest, runtime files, self-contained references, and packaged public-copy guardrails.
- `npm run steam:plan` packages, audits, and generates SteamCMD-style app/depot VDF descriptors in `dist/steam`.
- `npm run steam:upload:dry-run` packages, audits, plans, and writes a redacted SteamCMD upload report without contacting Steam.
- `STEAM_UPLOAD=1 npm run steam:upload` packages, audits, plans, and runs SteamCMD when `STEAMCMD_PATH`, `STEAM_USERNAME`, and `STEAM_PASSWORD` are configured.
- `npm run release:report` runs the full release chain, including the upload dry run, and writes JSON/Markdown reports with gates, file sizes, SHA-256 hashes, and redacted SteamCMD upload readiness.
- `npm run playtest:plan` runs the release report chain and writes private beta JSON/Markdown plans in `dist/playtest`.
- `npm run playtest:intake` writes feedback-intake JSON/Markdown and a sample packet for hosted URL or local archive handoff.
- `npm run store:kit` runs the playtest plan chain and writes Steam store-page planning JSON/Markdown in `dist/store`.
- `npm run store:capture` writes screenshot, trailer, and capsule-art capture planning JSON/Markdown in `dist/store`.
- `npm run localization:kit` runs the store and input-map chains, then writes source-string JSON/Markdown localization briefs in `dist/localization`.
- `npm run config:check` writes a redacted Steam/playtest/store environment readiness report in `dist/config`.
- `npm run input:map` writes Steam Input-ready action-map JSON/Markdown in `dist/input`.
- `npm run network:protocol` writes host/client network protocol JSON/Markdown in `dist/network`.
- `npm run network:check` verifies the network protocol catalog against smoke-tested message and reliability expectations.
- `npm run replay:check` writes replay-link contract JSON/Markdown in `dist/replay` for shareable reproduction URLs.
- `npm run submission:packet` runs the localization chain and writes a single submission-readiness handoff in `dist/submission`.
- `npm run smoke:multiplayer` runs a local host/client contract smoke test through the in-memory loopback transport for reliable lifecycle events and unreliable input/snapshot traffic.

Steam depot planning uses environment variables:

- `STEAM_APP_ID`: Steam app id, defaults to `000000` for dry runs.
- `STEAM_DEPOT_ID`: depot id, defaults to `000001` for dry runs.
- `STEAM_BRANCH`: target branch, defaults to `prototype`.
- `STEAM_BUILD_DESC`: build description, defaults to app/version/target metadata.
- `STEAMCMD_PATH`: local SteamCMD executable path for real uploads.
- `STEAM_USERNAME`: Steam build account name for real uploads.
- `STEAM_PASSWORD`: Steam build account password for real uploads.
- `STEAM_UPLOAD`: must be `1` for `npm run steam:upload` to perform a real upload; otherwise it writes a dry-run report.

Real upload automation writes `dist/steam/steam-upload-report.json` with a redacted command and refuses to run if required configuration is missing. The branch upload still depends on Steamworks-side app/depot/package setup and a build account whose Steam Guard policy is compatible with automation.

Private beta planning uses environment variables:

- `PLAYTEST_BRANCH`: target branch for beta instructions, defaults to `private-beta`.
- `PLAYTEST_WAVE_SIZE`: first tester wave size, defaults to `10`.
- `PLAYTEST_FEEDBACK_MODE`: `local-archive` or `url`, defaults to `local-archive` when no URL is configured.
- `PLAYTEST_FEEDBACK_URL`: feedback destination shown to testers, defaults to `TBD`.
- `PLAYTEST_FEEDBACK_DIR`: local inbox folder for copied packets and exported report archives.

Store page kit generation uses environment variables:

- `STORE_PAGE_STATE`: store page state label, defaults to `draft`.
- `STORE_LANGUAGES`: comma-separated first-pass localization targets, defaults to English, French, German, Spanish - Latin America, and Japanese.
- `CAPTURE_BASE_URL`: local or hosted build URL used when generating replay-link setup URLs for the capture plan, defaults to `http://127.0.0.1:5173/`.

## Future Platforms

The adapter model allows future support for Epic Online Services, console platform APIs, or a custom account backend without rewriting game rules.

## Builder/Admin Panel Plan

To keep gameplay UI simple while still supporting map/editor/admin tools, add a separate password-protected builder/admin surface:

- `/admin` web route for map builder, asset upload, room diagnostics, moderation actions, and content toggles.
- Password-protected session gate for v1; later replace with account roles and server-issued tokens.
- Keep runtime gameplay clients read-only for these tools (no admin controls in the match HUD).
- Add audit logs for asset uploads, map publishes, and room management actions.
