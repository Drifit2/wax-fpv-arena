# Alpha 7.5 — Multiplayer Reliability and Diagnostics

- Added `/api/team75/health` for basic process health and queue/match counts.
- Added `/api/team75/matches` for active race snapshots, disconnect indicators, and last 20 exhibition results.
- Persisted recent server-scored 2v2 race results to `team75_history.json` (atomic writes, capped at 100). Active races themselves are **not** recoverable after a server restart; they are intentionally not restored without pilot session validation.
- Fixed reconnect lookup to scan all active races rather than stopping at the first nonmatching race.
- Prevented superseded socket disconnect events from affecting a reconnected pilot.
- Added server timing metadata to resumed race state.
- Added `tests/smoke75.js` to test server startup, new endpoints, and backward compatibility. Run with `npm install && node tests/smoke75.js`.

## Limitations
No verified live 4-device tests. Automated smoke test was added but not executed in this environment because dependencies could not be installed within the available execution time. No production-grade latency compensation, active-race recovery, blockchain minting, or prize validation. Off-chain exhibition only.
