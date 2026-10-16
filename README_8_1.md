# Alpha 8.1 — Club Wars 2v2 integration harness

Added `npm run test:clubwars`, an isolated HTTP + WebSocket integration scenario for a complete 2v2 Club Wars fixture. The test checks captain-only lineup selection, distinct club-member pilots, lineup locking after racing begins, four eligible wallets entering one fixture, race completion, no double scoring, fixture persistence, and legacy 1v1 manual scoring rejection.

Test sessions are available only in a separate `NODE_ENV=test` process with a random secret. No real wallets, prizes, or NFTs are involved.

Run: `npm install && npm test && npm run test:lifecycle && npm run test:clubwars`.

**Testing limitation:** If dependencies cannot be installed, only static checks run; live WebSocket integration remains unverified. Production deployment and blockchain NFT minting remain out of scope.
