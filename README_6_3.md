# Alpha 6.3 — Expanded Tournament Exhibitions

- New `/tournament63.html` for 4/8/16/32 pilot single-elimination brackets.
- Admin may create a new event using `FPV_ADMIN_TOKEN` (32+ characters) and optional ISO scheduled start. Admin endpoint: `POST /api/tournament63/admin`. Cannot replace an active event.
- Registration stays open until capacity; full events start when their scheduled time arrives (or immediately without schedule). Existing `/api/tournament62/join` and `/api/tournament62` retained for compatibility.
- Server-side race results advance winners through arbitrary power-of-two bracket rounds. Disconnects without a winner do not advance.
- `/spectator63.html` polls `/api/tournament63/live` once per second for top-down server-state telemetry. **Not a 3D camera or production broadcast.**
- Only one event active at a time. No prize payouts, NFT minting, professional tournament scheduling, automated anti-Sybil protection, or independent security audit.
- Run `npm install && npm start`; open `/tournament63.html`.
