# Music And Sound Pipeline

The current browser synth sounds remain a fallback. Production-quality audio should come from mastered `.ogg` or `.mp3` files listed in `assets/audio/audio-manifest.json`.

## Next-Weekend Audio Set

- Menu loop.
- Lobby loop.
- Round ambience loop.
- Ghost-near tension layer.
- Flashlight on/off.
- Flashlight damage loop.
- Ghost shock, grab, and escape.
- Lightning reveal.
- Battery pickup.
- Player downed and revive.

## Runtime Rules

- Audio unlock must happen from a user gesture on the main menu.
- Settings should expose `Master`, `Music`, and `SFX`.
- Tension layers should imply danger without giving exact ghost direction.
- Repeated SFX should be rate-limited to avoid clipping.

## Audit

Run:

```sh
npm run audio:audit
```

This writes `dist/assets/audio-asset-audit.json` and `.md`, listing every required music/SFX slot, whether the file exists, its bus, loop setting, and size. The browser synth sounds remain fallback only; a high-quality party build should drive this audit toward zero missing files.

## Candidate Intake

Run:

```sh
npm run audio:candidate -- incoming/audio/flashlight-on.ogg --slot flashlight_on
```

This writes a candidate report into `dist/assets/audio-candidates/` from an incoming music or SFX file. It does not move files into runtime. Use it to confirm the manifest slot, target path, loop setting, bus, production intent, and next placement step before copying the file into `assets/audio/`.

## Production Briefs

Run:

```sh
npm run audio:brief
```

This writes `dist/assets/audio-brief.json` and `.md` from `assets/audio/audio-manifest.json` plus `assets/audio/audio-briefs.json`. Use it as the handoff sheet for music and SFX production: each slot lists the target file path, intent, duration, loop behavior, legally-clean prompt, and delivery checklist.

Run:

```sh
npm run audio:production-pack
```

This writes `dist/assets/audio-production-pack/` with a production index and couch-party cue sheet. Use it when commissioning, generating, or reviewing final files: it groups every music/SFX slot by target path, mix priority, audition order, speaker checks, and acceptance criteria for laptop, TV, and phone playback.

For a full audio readiness pass, run:

```sh
npm run audio:review
```

This generates the production brief first, then audits which runtime files are still missing.
