# WAX FPV Arena Alpha 8.2 — Test Readiness & Race Integrity

- Adds dependency-free offline race integrity tests (`npm run test:offline`).
- Rejects missing or invalid race IDs for championship score awarding.
- Adds explicit integration dependency preflight (`npm run test:preflight`).
- Adds combined integration runner (`npm run test:all-integration`) for network-enabled Node environments.
- Reports build version 8.2 in `/api/team75/health`.

## Run

```sh
npm run test:offline
npm install
npm run test:all-integration
npm start
```

The WebSocket integration tests require `ws` and `eosjs-ecc` installed from npm. Network restrictions can prevent installation; the offline tests do not require either dependency. This release does not implement 4v4 matchmaking, production hosting, or on-chain NFT minting.
