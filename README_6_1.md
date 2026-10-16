# WAX FPV Arena Alpha 6.1 — Multiplayer UX

Adds a visible matchmaking status, pre-race countdown, post-race rematch requests, and clearer podium messaging. Both original participants must request a rematch within 90 seconds; server checks the same verified WAX accounts and requeues their existing WebSocket sessions. No on-chain rewards or paid gameplay.

## Run
`npm install && npm start` then visit `http://localhost:8080/matchmaking.html`. Authenticate using `wallet.html` and use the session token. Two distinct verified WAX accounts are required for a real duel.

## Limitations
This is a prototype. Real-wallet end-to-end tests, Android haptic integration testing, abuse prevention, matchmaking scalability, and deployment hardening remain outstanding.
