# Alpha 8.4 — Seasonal leaderboards

Adds `season-leaderboard84.html` and `/api/season84/standings?season=YYYY-MM` for monthly pilot and club standings. Pilot results are archived in `season84_results.json` (up to 10,000 eligible races), seeded from prior bounded history on first launch. Races with disconnects, ties, or invalid data do not count. Duplicate race IDs are ignored. Club standings use persisted 2v2 Club Wars fixture races and deduplicate race IDs. All standings remain provisional and off-chain.

Run `npm install && npm start`; run offline checks with `npm run test:offline`. Archive files are written to the application directory, which needs write access. There is no production database, audit signature, 4v4 mode, or live-device certification.
