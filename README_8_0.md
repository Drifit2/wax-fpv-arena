# WAX FPV Arena Alpha 8.0 — Complete four-pilot race test

## Changes
- Added `npm run test:lifecycle`: real WebSocket four-pilot matchmaking, duplicate-wallet rejection, reconnection, accelerated complete race, and exactly-once history checks.
- Accelerated race clock is **only** permitted in `NODE_ENV=test` with an explicit test secret. Production races remain 180 seconds.
- Manual 1v1 Club Wars record endpoint explicitly rejects 2v2 fixtures; 2v2 results must come from the server-managed race.
- Health version updated to 8.0.

## Run
`npm install && npm test && npm run test:lifecycle`

## Limits
- Test wallets are local-only simulated sessions, not real signed WAX credentials.
- This test does not simulate a complete 2v2 club fixture, multiple concurrent races, or multi-device field conditions.
- No production deployment, on-chain prizes, or NFT minting.
