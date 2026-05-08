# Afterlight Storage

Runtime storage uses `AFTERLIGHT_STORAGE_DIR` when set. On Railway, the app defaults to `/data/afterlight` when a `/data` volume is mounted. Local development falls back to `.afterlight-data/`.

## Structure

```text
afterlight/
  maps/
    drafts/
    published/
  media/
    images/
      backgrounds/
      foregrounds/
      props/
      misc/
    music/
    sfx/
  uploads/
  logs/
  tmp/
```

## Public Runtime Paths

- Uploaded map music is stored in `media/music/` and served from `/assets/audio/maps/<filename>`.
- Uploaded map sound effects are stored in `media/sfx/` and served from `/storage/audio/sfx/<filename>`.
- Uploaded map images are stored in `media/images/<kind>/` and served from `/storage/images/<kind>/<filename>`.
- Published map JSON is stored in `maps/published/` and exposed through `/api/maps`.
- Server storage events are appended to `logs/server-events.jsonl`.

## Useful Endpoints

- `GET /api/storage` reports the active storage root, directory layout, and file counts.
- `GET /api/map-music`, `POST /api/map-music`, `DELETE /api/map-music/:filename` manage server music.
- `GET /api/sound-effects`, `POST /api/sound-effects`, `DELETE /api/sound-effects/:filename` manage server sound effects.
- `GET /api/sound-effects/config`, `PUT /api/sound-effects/config` manage global sound effect assignments.
- `GET /api/map-images?kind=props`, `POST /api/map-images`, `DELETE /api/map-images/:kind/:filename` manage server images.
- `GET /api/maps`, `POST /api/maps`, `GET /api/maps/:filename`, `DELETE /api/maps/:filename` manage published map JSON.
