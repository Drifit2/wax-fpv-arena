# Alpha 9.3 — eight-client relay end-to-end test harness

Adds `tests/integration93.js`, a real eight-WebSocket-client test for a relay4v4 club fixture. The test provisions isolated test-only wallet sessions, checks captain authorization and lineup locking, verifies matchmaking, disconnects/reconnects one pilot, rejects a duplicate live wallet, waits for a race result, checks no scoring for an incomplete relay, confirms JSON persistence, and ensures the completed match disappears from the spectator feed.

Run `npm install` then `npm run test:relay-e2e` on a Node 18+ machine with working dependencies. The test uses a temporary directory and localhost server. It does not interact with mainnet or issue NFT rewards.

`npm test` includes a dependency-free **structural coverage check**, NOT the actual eight-client test. Live WebSocket tests cannot be claimed to pass until dependencies are installed and `npm run test:relay-e2e` completes successfully. The test currently simulates the relay until a race timeout if pilots do not reach every gate; incomplete fixtures must remain unscored.
