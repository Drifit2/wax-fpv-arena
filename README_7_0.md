# Alpha 7.0 — Dedicated Club Wars Matchmaking

Run `npm install && npm start`; open `/club-wars69.html`. Create/accept a fixture, wait for its scheduled start, then both lineup pilots follow **Open dedicated Club Wars race**. Each authenticates and queues on the same stage in `/matchmaking.html?clubFixture=<id>`. The server matches only the two named pilots in that fixture, and automatically scores completed server-simulated races toward first-to-two victories. Race 2/3 requires requeueing.

New read-only `/api/club70/live` exposes public fixture queue status, live telemetry and scores for spectators. Legacy manual race-ID submission remains. This is a **server-simulated exhibition**, not production-secure verified racing, blockchain NFT minting, actual prize distribution, or real-money competition. It is not a multi-pilot simultaneous team race. Multi-device and WAX-wallet end-to-end testing remain outstanding.
