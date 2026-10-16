# Alpha 8.3 — 2v2 leaderboard

New `/team-leaderboard83.html` shows provisional pilot standings from `/api/team83/leaderboard`. Rankings are derived from the most recent 100 server-recorded 2v2 results, excluding disconnects, server restarts, duplicate race IDs, invalid winners and duplicate pilot rows. Score = 10 per gate + 100 for a finish; sorting prioritizes wins. These are **off-chain**, not cryptographically verified, not lifetime rankings, and not prize eligible. The existing team racing/Club Wars logic is preserved.

Run `npm install && npm start`; visit `/team-leaderboard83.html`. Offline tests: `npm test`. Multiplayer integration tests still require actual dependencies and pilot testing.
