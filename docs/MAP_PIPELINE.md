# Map Pipeline

Use Tiled for the next-weekend map authoring workflow.

Open `assets/maps/afterlight.tiled-project` in Tiled so object types, layer names, and map conventions stay consistent.

## Layers

- `collision`: rectangle objects with type `wall`.
- `props`: rectangle objects with type `prop` and optional `color` property.
- `spawns`: point objects with type `investigatorSpawn` or `anomalySpawn`.
- `batteries`: point objects with type `batterySpawn`.
- `labels`: point objects with type `label`.
- Optional image layers can hold rendered floor art, lighting guides, or reference plates. Use local project assets only; remote image URLs are rejected.

Run:

```sh
npm run maps:art
```

This validates `assets/maps/map-art-manifest.json` and writes `dist/maps/map-art-audit.json` and `.md`. Planned entries document art direction; ready entries must point at local PNG map plates with the expected pixel size.

Run:

```sh
npm run maps:kit
```

This writes `dist/maps/map-editor-kit.json` and `.md`, summarizing the Tiled project, required object types, required layers, and authoring checklist.

Run:

```sh
npm run maps:preview
```

This writes an SVG preview to `dist/maps/previews/` so walls, props, spawns, batteries, and labels can be reviewed without opening the runtime.
If the Tiled map includes image layers, the preview includes them underneath gameplay markup so collision and spawn alignment can be checked against art.

Run:

```sh
npm run maps:validate
```

This checks every required Tiled layer, spawn count, battery count, object bounds, collision rectangles, and obvious spawn-in-wall mistakes. It writes `dist/maps/tiled-map-validation.json` and `.md` for quick review.

Run:

```sh
npm run maps:import
```

The importer first runs validation, then converts the Tiled JSON object layers into the existing map shape used by `src/game.js` and prints the result.

Run:

```sh
npm run maps:build
```

This validates the Tiled source and writes `assets/maps/manor-party.game-map.json`, the reusable game-map asset that can be packaged or wired into runtime.

The first production goal is one polished party map rather than spreading effort across every prototype arena.

## Authoring Rules

- Keep the shared party map readable from a TV distance.
- Put collision in `collision` only; decoration can live in `props`.
- Place one anomaly spawn and two to five investigator spawns.
- Place at least three battery spawns so pickup timing has enough rotation points.
- Keep spawns and batteries outside collision rectangles.
- Prefer corridors, rooms, corners, and line-of-sight blockers over large open arenas.
- Keep imported rendered art aligned to the same pixel bounds as the Tiled map, then author collision over it.
- Track rendered background plates in `assets/maps/map-art-manifest.json` before wiring them into Tiled image layers.
