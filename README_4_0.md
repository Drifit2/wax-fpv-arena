# Alpha 4.0 — Server Flight Challenge

Run `npm install && npm start`, authenticate at `/wallet.html`, then visit `/server-flight.html`. The main 3D simulator remains at `/index.html`.

New isolated flight mode accepts throttle/turn/lift inputs only. The Node server integrates motion in fixed 50ms steps, validates control packet ordering and rate, owns course gates, and determines finish times. The browser only renders the returned state.

**Limits:** Simplified 2.5D physics, not yet integrated with the main Three.js flight engine; in-memory race sessions; no audited anti-cheat, replay verification, race leaderboard or NFT prize eligibility. Client-side controls can still be scripted. WAX authentication and NFT API flows need real integration testing.
