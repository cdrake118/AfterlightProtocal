# Incoming Asset Drop Zone

Use this folder for newly generated, commissioned, or exported files before they enter runtime.

## Folders

- `characters/`: raw character sheets, cleaned atlas PNGs, and candidate atlas JSON.
- `maps/`: Tiled JSON, rendered map plates, and reference map art.
- `audio/`: music and SFX exports before they are placed into `assets/audio/`.
- `reference/`: screenshots, mood boards, and source-only references.

Run:

```sh
npm run content:intake
```

The intake audit writes `dist/content/content-intake-audit.json` and `.md`. It does not move files or approve runtime assets. It gives a first-pass classification so generated files can be cleaned, documented, validated, and intentionally promoted through the normal asset/map/audio pipelines.
