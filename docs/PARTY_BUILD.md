# Party Build Readiness

The next-weekend target is a laptop-hosted shared display shown on the TV, with phones joining as controllers.

Run:

```sh
npm run party:readiness
```

This runs the content review, multiplayer contract smoke, and writes:

- `dist/party/party-build-readiness.json`
- `dist/party/party-build-readiness.md`

Use this report before inviting testers. It focuses on the couch-party path rather than the later Steam/private-beta path: runtime atlases, Manor map art, Tiled health, production audio, content promotion status, and phone-controller networking contract health.

## Party Setup

- Start the host display with `npm run serve:party`.
- Open `/host` on the laptop.
- Show the laptop on the TV with HDMI first; AirPlay is the fallback.
- Phones join with the QR code or room URL.
- Run one host plus one-phone control smoke before guests arrive.
