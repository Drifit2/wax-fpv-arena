# Alpha 4.2 — Server-simulated practice standings

The isolated server-flight challenge now saves completed server-simulated practice results to sim42_practice.json, provides a per-stage top-25 leaderboard at GET /api/sim42/leaderboard?stage=1, and offers authenticated export of sampled server flight states at GET /api/sim42/replay?id=<run id>. The SHA-256 replay digest identifies the server-captured trace but is not a cryptographic proof of fair play.

Run npm install && npm start and open /server-flight.html. Authenticate via /wallet.html first.

**Limitations:** practice only; in-memory runs and replays expire; the server physics are simplified; controls and timing have not undergone security review; records are not NFT prize eligible; no NFT minting is performed. No ranked matchmaking is implemented.
