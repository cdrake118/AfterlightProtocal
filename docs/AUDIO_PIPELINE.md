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
