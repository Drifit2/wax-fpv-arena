# Alpha 7.9 — Four-pilot multiplayer integration harness

## Implemented
- Real four-WebSocket pilot test: matchmaking, unique pilots, active match telemetry.
- Duplicate wallet rejection test.
- Simulated socket failure and reconnect within 15 seconds, preserving match ID.
- Expired disconnect test: match closes and cannot award prizes.
- Strict local-only test session endpoint. Available only with `NODE_ENV=test`, nonempty `FPV_TEST79_SECRET`, correct secret header, and loopback source. In normal operation the endpoint returns 404. This is **not** a WAX blockchain proof and must never be enabled on a public deployment.
- Health version 7.9.

## Run
`npm install`
`npm test`
`npm run test:integration`
`npm run test:multiplayer` (takes ~17 seconds)

## Limits
This integration test uses isolated test-only wallet identities, **not** real on-chain WAX signatures. It validates an exhibition race interrupted by a disconnect, not a complete 180-second race or a live 2v2 Club Wars fixture. Four-device field testing, deployment, NFT minting, and on-chain prizes remain outstanding.
