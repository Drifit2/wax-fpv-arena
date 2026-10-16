# Alpha 7.7 — Multiplayer integrity tests

This increment adds executable pure-policy unit tests and a real HTTP/WebSocket smoke test. It fixes duplicate disconnect/error events extending the 15-second reconnection grace period, validates controls via a tested policy helper, and prevents completed club fixtures from receiving additional awards.

## Test
- `node tests/unit77.js` — no dependencies needed.
- `node tests/regression76.js` — legacy structural regression.
- `npm install && node tests/integration77.js` — starts an isolated server and tests HTTP endpoints and WebSocket ping/pong.

The integration test does not simulate authenticated four-wallet racing; this still requires live testing or an isolated test authentication facility. No on-chain prizes or NFT minting.
