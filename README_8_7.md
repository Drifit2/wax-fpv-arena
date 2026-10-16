# Alpha 8.7 — 4v4 championship standings and integration harness

- New `GET /api/club87/standings`: server-derived standings for 4v4 fixtures, 3 points per completed fixture victory. Unfinished fixtures do not award points. Race wins/losses tracked separately.
- New `club-standings87.html`: mobile-responsive, auto-refreshing leaderboard; safe text rendering.
- New `tests/integration87.js`: isolated 8-wallet, 8-WebSocket 4v4 fixture test covering captain controls, roster locking, matchmaking, race result, persistence and standings. Run with `npm install && npm run test:4v4`. Uses test-only mock wallet sessions and accelerated race clock; never expose test credentials publicly.
- `npm test` continues to run offline tests; integration requires installed `ws` and `eosjs-ecc` dependencies.
- **Not production-ready:** 4v4 multiplayer test is not a substitute for real-device and WAX mainnet validation; all standings are provisional, off-chain, and do not award prizes.
