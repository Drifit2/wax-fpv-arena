# Alpha 9.1 — relay integrity and spectator view

- Adds read-only `/api/relay91/live` endpoint and `relay-spectator91.html`, updating every two seconds.
- Adds pure `relay-integrity91.js` award eligibility check: eight distinct wallet identities, ordered team slots, checkpoint handoffs, both teams complete, and completed reason.
- Adds offline negative tests for malformed rosters, incomplete legs, timeout/disconnect, and missing handoffs.
- Run `npm test` for offline checks; live multiplayer requires npm dependencies and a real eight-client integration run.
- Results remain provisional/off-chain. Do not use for prizes.
