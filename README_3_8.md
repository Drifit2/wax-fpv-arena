# Alpha 3.8 — server-timed practice attempts

Adds authenticated one-use practice attempt IDs with server start and finish clocks, elapsed-time tolerance, stage ordering, expiry, and per-account practice records. Visit `/season.html` for Start/Finish timed practice controls. These controls do not automatically connect to the in-game checkpoint engine; pilots must start and finish them manually.

**Security limitation:** Server timing is NOT server-authoritative flight validation. A player can wait out a plausible time without flying; checkpoint and physics data are not verified. Results remain practice-only. No NFT prize eligibility, claims, minting, or distribution is enabled. Do not use this for prize-bearing tournaments.

To run: `npm install && npm start`; visit `http://localhost:8080/season.html`. Authentication requires live WAX RPC and wallet integration.
