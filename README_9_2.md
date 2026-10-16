# Alpha 9.2 — relay championship integrity

This update adds `relay-integrity92.js` as the server's fixture-award validation gate.

Checks: exactly eight distinct accounts in the correct red/blue slots; four checkpoint-triggered handoffs per side, in the correct order and with the correct from/to accounts and race ID; timestamps within the match window; each pilot has cleared two gates; completed legs and active indexes agree; no pending disconnected pilots; and only `completed` races may award a relay fixture.

`npm test` runs dependency-free unit/structural tests, including `tests/relay92.js` with 14 invalid-result cases. These are **not** eight-client end-to-end tests.

For local testing after `npm install`, run `npm start` and use `relay-racing89.html`, `relay-spectator91.html`, and `club-wars86.html`. WebSocket integration tests require `ws` and `eosjs-ecc` and have not been run in this build environment. Production deployment, NFT minting, prize eligibility, and independent server security review remain outstanding.
