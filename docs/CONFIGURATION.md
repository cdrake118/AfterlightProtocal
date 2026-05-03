# Configuration Guide

## Safe Defaults

The prototype automation is safe to run without secrets. Missing Steam credentials keep the upload flow in dry-run mode, and placeholder app/depot ids produce local VDFs and readiness reports only.

Use `.env.example` as the source of truth for supported variables. Keep real credentials in your shell, CI secret store, or local untracked environment file.

## Dry Run

Use dry runs while the Steam app and depot are not configured:

```sh
npm run config:check
npm run submission:packet
```

Expected placeholder state:

- `STEAM_APP_ID=000000`
- `STEAM_DEPOT_ID=000001`
- `STEAM_UPLOAD=0`
- `PLAYTEST_FEEDBACK_MODE=local-archive`
- `PLAYTEST_FEEDBACK_URL=TBD`
- `PLAYTEST_FEEDBACK_DIR=playtest-feedback-inbox`

This state should pass local checks and produce a local feedback handoff, but remain blocked for real Steam submission until app/depot values are configured.

## Private Beta Setup

Before inviting external testers:

- Set `STEAM_APP_ID` and `STEAM_DEPOT_ID` to real Steamworks values.
- Set `PLAYTEST_BRANCH` to the private beta branch name.
- Use `PLAYTEST_FEEDBACK_MODE=local-archive` for small internal waves, or set `PLAYTEST_FEEDBACK_MODE=url` and `PLAYTEST_FEEDBACK_URL` for a hosted intake.
- Run `STEAM_BRANCH=$PLAYTEST_BRANCH npm run steam:upload:dry-run`.
- Run `npm run playtest:intake` and review the generated tester handoff.
- Run `npm run submission:packet` and confirm the submission packet lists no placeholder Steam id blockers.

## Real Upload

Real uploads require explicit opt-in:

```sh
STEAM_UPLOAD=1 npm run steam:upload
```

Required variables:

- `STEAMCMD_PATH`: local SteamCMD executable path.
- `STEAM_USERNAME`: Steam build account username.
- `STEAM_PASSWORD`: Steam build account password.
- `STEAM_APP_ID`: real Steam app id.
- `STEAM_DEPOT_ID`: real Steam depot id.

Generated reports redact username and password values. Steam Guard or build-account policy still needs to be handled outside this repo.

## Store And Localization

Store and localization planning reads:

- `STORE_PAGE_STATE`
- `STORE_LANGUAGES`
- `CAPTURE_BASE_URL`

Run:

```sh
npm run store:kit
npm run store:capture
npm run localization:kit
```

The generated store and localization kits include protected-term checks so public-facing copy stays on the original Afterlight Protocol identity.
