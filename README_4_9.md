# Alpha 4.9 — Exhibition Matchmaking

- New `/matchmaking.html` pairs two authenticated WAX wallet sessions on the same championship stage.
- Server sends a synchronized future start timestamp and accepts exhibition finish reports.
- Disconnect/cancel ends a match. No real ranking changes are made.
- **Security:** This prototype does not bind the synchronized match to the authoritative server-flight simulation. Submitted times are client claims, unverified and ineligible for rewards. Match queues/ratings are memory-only. Do not award NFTs based on these results.
- Run `npm install && npm start` and open `/matchmaking.html`.
- Next: link each pilot to separate server-simulated race sessions and persist independently verified match results.
