# WAX FPV Arena Alpha 7.4 — Reliability hardening

This release adds a **15-second reconnection grace window** to active 2v2 matches. A disconnected pilot's controls are neutralized and simulation movement paused. Rejoining with the same verified WAX wallet from a fresh WebSocket within 15 seconds restores the existing pilot flight state; no new racer slot or score is created. Expired disconnects end the race with reason `disconnect`, which is **not counted** toward Club Wars standings. The normal 180-second race deadline still applies.

Also prevents cancelling an active race, refuses a second active wallet connection, and locks Club Wars captain lineups as soon as any fixture pilot queues or a race is active. Existing results are persisted as in 7.3.

Start: `npm install && npm start`. Open `/club-wars73.html` and `/team-racing73.html`.

**Limitations:** This is an in-memory reconnect mechanism, not durable across server restarts. Server-side racing remains an exhibition simulation; production multiplayer load, wallet expiration, latency and adversarial tests are still needed. No on-chain prize or NFT minting.
