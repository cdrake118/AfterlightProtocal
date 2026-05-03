# Map Pipeline

Use Tiled for the next-weekend map authoring workflow.

## Layers

- `collision`: rectangle objects with type `wall`.
- `props`: rectangle objects with type `prop` and optional `color` property.
- `spawns`: point objects with type `investigatorSpawn` or `anomalySpawn`.
- `batteries`: point objects with type `batterySpawn`.
- `labels`: point objects with type `label`.

Run:

```sh
npm run maps:import
```

The importer converts the Tiled JSON object layers into the existing map shape used by `src/game.js` and prints the result.

Run:

```sh
npm run maps:build
```

This writes `assets/maps/manor-party.game-map.json`, the reusable game-map asset that can be packaged or wired into runtime.

The first production goal is one polished party map rather than spreading effort across every prototype arena.
