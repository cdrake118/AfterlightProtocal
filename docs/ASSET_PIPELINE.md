# Art Asset Pipeline

The runtime should only load game-ready transparent atlases plus JSON metadata. Raw generated sheets are source material, not runtime assets.

## Character Workflow

1. Generate or commission concept poses.
2. Clean frames in Aseprite with a transparent background.
3. Export a fixed grid PNG and atlas JSON.
4. Run `npm run assets:validate`.
5. Add the validated PNG/JSON to `assets/characters/runtime-character-manifest.json`.

Run:

```sh
npm run assets:review
```

This runs the full character-art handoff chain: brief generation, atlas-template generation, runtime atlas validation, runtime atlas preview, and PNG audit.

Run:

```sh
npm run assets:brief
```

This writes `dist/assets/character-art-brief.json` and `.md` from `assets/characters/character-art-briefs.json`, including prompt direction, negative prompts, exact atlas dimensions, anchors, and handoff checks.

Run:

```sh
npm run assets:atlas-handoff
```

This writes `dist/assets/character-atlas-handoff/` with one SVG production guide and Markdown handoff per planned character atlas. Use these guides for image generation, Aseprite cleanup, or TexturePacker framing: they show exact canvas bounds, fixed cells, row labels, safe padding, anchors, and foot baselines so oversized heads, missing feet, and drifting sprites are caught before runtime.

Run:

```sh
npm run assets:atlas-templates
```

This writes starter atlas JSON files into `dist/assets/atlas-templates/` from the character art briefs. They are handoff templates, not runtime assets; copy and adjust them only after the matching transparent PNG sheet exists.

Run:

```sh
npm run assets:atlas-candidate -- incoming/characters/investigator-clean.png --id investigator-production-atlas --role investigator
```

This writes a candidate atlas manifest and review note into `dist/assets/atlas-candidates/` from a cleaned incoming PNG. It does not modify runtime files. Use it after exporting a transparent fixed-frame sprite sheet, then validate and preview that candidate before promoting it into `assets/characters/`.

Run:

```sh
npm run assets:audit
```

This writes `dist/assets/art-asset-audit.json` and `.md`, listing every character PNG, whether it has alpha transparency, and whether it is safe to treat as a runtime atlas.
The audit is intentionally strict: a PNG is only `Runtime Ready` when it is transparent and referenced by an approved runtime atlas manifest. Transparent generated sheets that are not manifest-backed remain `Candidate` or `Source Only`.

Run:

```sh
npm run assets:atlas-preview
```

This writes SVG overlays into `dist/assets/atlas-previews/` for each atlas in `runtime-character-manifest.json`. Use these previews to catch cropped feet, drifting anchors, unsafe padding, and mislabeled animation rows before the asset appears in-game.

## Runtime Manifest Files

- `assets/characters/runtime-character-manifest.json` lists the atlases allowed into packaged builds.
- `assets/characters/*.atlas.json` defines one validated runtime atlas.
- `assets/characters/character-art-briefs.json` tracks planned production sprite sheets before they enter runtime.
- Generated sheets that still have white/RGB backgrounds stay in `sourceOnlyAssets` and are not loaded by the game.

## Required Character Atlas Manifest

- `image`: path to transparent PNG.
- `frame.width` / `frame.height`: identical size for every frame.
- `grid.columns` / `grid.rows`: exact grid layout.
- `anchor`: foot/body anchor used by the renderer.
- `safePadding`: minimum transparent edge padding.
- `animations`: named frame groups.

The validator rejects RGB/white-background PNGs because those caused the current sprite cropping bugs. The current investigator image sheets are intentionally treated as source-only until they are cleaned and re-exported with alpha transparency, fixed frames, and anchors.

## Runtime Gate

Do not integrate a new character sheet until it passes both:

- `npm run assets:validate`
- `npm run assets:atlas-preview`
- `npm run assets:audit`

The audit may list concept/reference PNGs as not runtime-ready; that is fine. Runtime character atlases should be transparent PNGs with stable JSON metadata. Packaged builds should only include the runtime manifest and approved atlases.
