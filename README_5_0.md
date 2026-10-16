# Alpha 5.0 — Live Server Racing Duels

Two authenticated WAX accounts queue for a two-pilot race on one of three stage labels. Both pilots receive the same eight-gate server course and five-second countdown. The server runs 20 Hz physics updates from control inputs, streams state snapshots over WebSocket, and decides completion based on gate crossings. Touch and keyboard controls supported. A bounded exhibition history persists to `ranked50_exhibition.json`.

Run `npm install && npm start`, authenticate via `wallet.html`, then open `matchmaking.html` in two separate authenticated browsers.

**Limitations:** The new race is a top-down live duel; the 3D solo challenge remains separate. Stage names currently share one gate geometry. Results are exhibition-only, no rating updates, no NFT minting or prizes. No independent security audit, load testing, real-device multiplayer test, or production deployment.
