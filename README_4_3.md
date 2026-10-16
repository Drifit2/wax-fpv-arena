# Alpha 4.3 — NFT Championship Trophy Preview

Adds `/trophies.html`, a WAX-authenticated Founders Flight practice trophy preview. The server derives stage completion and best times from its own server-simulated practice record store, not from browser-submitted leaderboard times. After all three stages are completed, the player can export a **non-minting AtomicAssets-oriented metadata draft** with a placeholder IPFS artwork URL.

No real NFT is minted or distributed. No token transfers, blockchain signing, marketplace transactions, or prize claims are performed. The endpoint explicitly returns `prizeEligible: false`, `mintEnabled: false`, `claimEnabled: false`. Competitive anti-cheat and wallet integration still require security testing. Existing game and Alpha 4.2 features remain intact.

Run `npm install && npm start` then visit `http://localhost:8080/trophies.html`. Authenticate through `/wallet.html` first. Complete all three stages using `/server-flight.html` to generate preview metadata. Existing server-simulated practice records in `sim42_practice.json` are used if present.
