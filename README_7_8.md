# WAX FPV Arena Alpha 7.8 — Race Safety and Regression Tests

## Implemented
- Fixed critical malformed `team72Control` sequence assignment (`m.seqp...`) that prevented valid sequenced controls from updating properly.
- Enforced ranked/team queue mutual exclusion in both directions.
- Bound team controls to the verified account and blocked control input for disconnected pilots.
- Added WebSocket `team78Diagnostics` with active matches, queue depth, and reconnect grace.
- Added dependency-free `tests/regression78.js` and extended the WebSocket integration test.
- Updated `/api/team75/health` version to 7.8.

## Run
`npm install && npm start`
`npm test`
`npm run test:integration`

## Limitations
No live authenticated four-pilot fixture test, no production hosting or on-chain prizes. Integration test requires npm dependencies and a local server.
