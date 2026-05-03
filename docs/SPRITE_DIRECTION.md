# Character Sprite Direction

Afterlight Protocol characters should read as original paranormal containment technicians, not parody or franchise lookalikes.

## Investigator Silhouette

- Top-down, slightly three-quarter readable.
- Helmet or sealed hood with bright visor.
- Handheld calibrated light tool pointed forward.
- Compact containment pack on the back-left side.
- Suit color comes from the selected cosmetic loadout.
- Strong outline and readable color blocks at small size.

## Anomaly Silhouette

- Floating spectral shard with unstable orbit fragments.
- Bright inner crystal shape and soft emission.
- More abstract than humanoid, so the opposing role feels distinct.
- Hidden/revealed state should be communicated by opacity, glow, and outline strength.

## Current Runtime Sprite Pass

- Sprites are rendered into cached browser canvases at runtime.
- Frame size: 128x128 source, drawn around 74x74 to the arena.
- Investigator frames include idle/walk shimmer via 4 stride variants.
- Anomaly frames now use `assets/characters/anomaly-ghost-atlas.png`, a cleaned and normalized 4x9 atlas based on the provided custom ghost sheet.
- If the atlas is unavailable, the game falls back to the procedural shard anomaly.
- No marketplace or third-party assets are required.

## Future Production Sheet

If this direction holds up in playtests, convert the runtime sprites into authored PNG sprite sheets:

- Investigator: idle, walk, light/scan, downed, revive.
- Anomaly: idle, drift, revealed, blackout, attack, dissipate.
- 4 directions minimum; 8 directions preferred.
- Keep the same visual language: clean sci-fi containment gear, readable light tools, original shapes.
