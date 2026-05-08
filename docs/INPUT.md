# Input Plan

The browser prototype supports keyboard/mouse and standard gamepad controls directly. World prompts switch between keyboard and gamepad text labels based on the last input method.

Run:

```sh
npm run input:map
```

This writes a generated action map to `dist/input`. The map is shaped for future Steam Input or platform-glyph integration and records action sets, current bindings, action types, and localization ids.
`npm run localization:kit` reads this generated map and adds action-set/action names to the source-string catalog.

## Action Sets

- Menu: UI select/back affordances for future menu navigation.
- Investigator: movement, aim, light, and proximity revive.
- Anomaly: movement, dash, and blackout wave.

## Steam Input Path

The future native build should convert the generated action map into a Steam Input action manifest, then replace text prompts with platform glyph lookups. Gameplay should continue to ask for semantic actions instead of platform-specific buttons.
