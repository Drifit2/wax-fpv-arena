# Alpha 7.6 — Match integrity and crash recovery

- Persist a crash-safe journal of active 2v2 match identifiers, pilot accounts, fixtures, and deadlines.
- After restart, unfinished matches are marked **interrupted**, not scored, and visible at `GET /api/team76/recovery`. No old socket or wallet token is restored.
- Added WebSocket `team76Ping` / `team76Pong` for server clock offset and latency sampling.
- Optional monotonically increasing `seq` on `team72Control` rejects out-of-order/duplicate controls.
- Control input expires after 750 ms to prevent stuck throttle after network stalls.
- Added dependency-free structural regression checks: `node tests/regression76.js`.

**Limitations:** Active races are not resumed after a process restart; pilots must rejoin a new match. This is intentionally fail-closed to avoid awarding unverified race results. Real-world four-device and network impairment testing still required. No NFT minting or real prizes.
