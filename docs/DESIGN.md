# Afterlight Protocol Design Brief

## Pillars

- Asymmetric tension: one hidden anomaly pressures a coordinated investigator team.
- Readable fear: proximity, light, sound, and environment behavior communicate risk.
- Original identity: paranormal science, unstable facilities, and optical instruments instead of cartoon haunted mansion fantasy.
- Short rounds: five-minute matches with immediate rematch flow.
- Platform-ready systems: lobby, session, input, cosmetics, and achievements stay behind adapters.

## Core Match

- Players: 1 anomaly vs 2-4 investigators.
- Duration: 5 minutes.
- Investigator win: reduce anomaly health to zero.
- Anomaly win: collapse all investigator resolve before time expires.
- Draw: timer expires with both sides active.

## Investigator Kit

- Beam tool: a focused cone of calibrated light that reveals and damages the anomaly.
- Battery cell: drains while active, does not auto-recharge, and refills from field pickups; one pickup starts on the map, then another appears every 20 seconds up to three active pickups.
- Revive tether: restores collapsed allies after a short channel.
- Signal meter: proximity readout that grows with anomaly danger without granting exact position.
- Field AI: bot investigators prioritize revives, batteries, searching, and coordinated hunting for solo playtesting.
- Readability layer: teammate nameplates, bot intent tags, world prompts, and signal feedback keep objectives scannable.

## Anomaly Kit

- Veil: invisible unless caught by light, lightning, sensors, or proximity effects.
- Touch collapse: drains investigator resolve on contact.
- Surge: future feature that disrupts nearby batteries and lamps.
- Phase dash: future feature for short repositioning with a cooldown.
- Echo interference: Blackout Wave creates five seconds of true darkness where investigators only see through active flashlight beams, then leaves decoys that create false signal pressure and pull investigator aim until burned out.

## Prototype Controls

Investigator mode:

- Move: WASD or arrow keys.
- Aim: mouse.
- Light: hold left mouse button.
- Revive tether: stand near a collapsed teammate to revive them over time.
- Controller: left stick move, right stick aim, right trigger light.

Anomaly mode:

- Move: WASD or arrow keys.
- Dash: Space.
- Blackout wave: E, 5-second duration, 30-second cooldown.
- Drain: touch investigators.
- Signal meter: shows exposure risk from light and nearby investigators.
- Controller: left stick move, A dash, Y or left bumper blackout.
- Bot anomaly behavior: pressures weak or isolated investigators and breaks away from beams.
- Blackout Wave: disrupts investigator batteries, blacks out the arena except for flashlight beams, and drops echo decoys.

## Copyright Guardrails

Do not use third-party-owned names, characters, costumes, map layouts, UI phrasing, music, sound effects, icons, or item designs. Shared genre concepts such as hidden movement, flashlights, batteries, revives, and timed rounds must be expressed with original art, naming, audio, and rules.

## Prototype Map

Current prototype arenas:

Observatory Annex:

- Central calibration chamber.
- Two side laboratories.
- Narrow service corridor.
- Generator alcove with battery spawns.
- Skylight Flash arena event that briefly reveals the anomaly.

Tideglass Aquarium:

- Split filtration lanes.
- Offset tank corridors.
- More line-of-sight breaks than the annex.
- Battery routes that pull investigators toward opposite sides of the map.
- Tank Surge arena event that creates a false signal spike and briefly distorts reads.

Prism Foundry:

- Industrial casting floor with offset furnace baffles.
- Long vertical barriers broken by mid-lane gaps.
- Batteries placed near outer routes so investigators must choose between safety and uptime.
- Stronger echo-decoy value because the side lanes create believable false signal reads.
- Prism Flare arena event that throws extra false anomaly echoes across the baffles.

Lobby setup now supports map selection, round length, and bot pressure before readying up. Ready starts a short countdown before control goes live.
The lobby panel shows a map briefing for the selected arena event before launch.

## Visual Feedback

- Player-controlled characters receive a thin white selection ring.
- Teammate tags display current AI intent such as hunting, resupply, revive, or evade.
- Nearby interactables show concise world prompts for revives and battery refills.
- Ability buttons display cooldown seconds after use.
- The top HUD shows the selected arena event and a countdown meter so timed map beats are learnable.
- World prompts automatically switch between keyboard/mouse and controller labels based on the last input method.
- `npm run input:map` generates semantic input action sets for future Steam Input manifests and platform glyph prompts.
- Motion and contrast toggles persist through settings for playtest readability and accessibility checks.
- Anomaly echo decoys create false reads for signal and bot aim so stealth counterplay can be tested in solo sessions.
- The arena renders under a darkness mask; flashlight beams, live investigators, and battery pickups carve light pools, and lightning events briefly relight the whole arena. High contrast mode lifts the darkness floor.

## Audio Feedback

- A procedural Web Audio score plays a calm menu mood and a driving round mood; a tension parameter raises drone brightness, adds rhythm ticks, and noise swells as the anomaly applies pressure (blackouts, reveals, last-investigator stands, final 30 seconds).
- Heartbeat thumps play for the local investigator and quicken as the anomaly closes, mirroring the phone controller's proximity haptics.
- Phone controllers vibrate on anomaly proximity, when downed or revived, and on anomaly damage ticks for the anomaly player.
- File-based music/SFX from the audio manifest still override synthesized cues when assets are installed.

## Progression Hooks

- Match results evaluate achievements through the platform adapter rather than direct gameplay code.
- Round summaries accumulate lifetime stats through the platform stats adapter.
- Results expose a copyable playtest feedback packet with build, lobby, session, stats, recent network events, and tester report prompts.
- Results also show tuning notes that flag pacing, objective clarity, arena event frequency, ability discovery, and echo counterplay.
- Feedback packets persist through a capped playtest feedback adapter so recent beta reports can be recovered across rounds.
- Feedback intake automation supports either a hosted URL or a local archive handoff for early private waves.
- Store capture automation maps replay-link scenarios to screenshot, trailer, and capsule-art handoff shots.
- Match results and feedback packets include a seed for reproducing suspicious or confusing rounds during design review.
- The lobby toolbar accepts a pasted seed so testers can replay a prior round setup with the same gameplay-relevant randomness.
- Results can copy a replay link that restores map, role, duration, bot pressure, and seed from URL parameters.
- The Reports panel lists recent saved feedback packets and can load or copy their replay setups.
- The Reports panel summarizes outcome mix and replay-link coverage, then can import, export, or clear the local report archive before a fresh test wave.
- Round length and bot pressure persist through settings and are included in results, network summaries, and feedback packets.
- Current prototype achievements cover completing a match, role wins, revives, ability usage, echo deployment, and battery pickups.
- Unlocks persist through the mock storage service and appear on the results panel.
- Role, map, sound, and preferred input label mode also save through the storage adapter so the same contract can later map to Steam Cloud.
- Lobby, launch, live match, and results states publish rich presence through the platform adapter.
- Match lifecycle and major gameplay milestones publish reliable events through the mock network session adapter.
- Cosmetic loadouts persist through the platform adapter; entitlement checks gate future suit packs without gameplay code knowing about store ownership.
