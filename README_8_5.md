# Alpha 8.5 — Eight-player 4v4 exhibition

Adds `team-racing85.html`, an eight-pilot server-simulated exhibition queue, distinct from the existing four-pilot 2v2 queue. Red and blue each have four pilots. Match completion uses existing server-authoritative flight simulation, disconnection handling, and result persistence. This is **exhibition only**, not 4v4 Club Wars fixture scheduling or championship scoring. The legacy 2v2 queue is kept separate. Wallet verification is still required for joining.

Run `npm install && npm start`, then visit `http://localhost:8080/team-racing85.html`. Run `npm run test:offline` for offline checks. Real eight-client end-to-end racing has not been validated. On-chain NFT minting and production deployment are not included.
