# WAX FPV Arena Alpha 7.3 — Club Wars 2v2

Run `npm install && npm start`; open `/club-wars73.html`.

Use the legacy Club Wars UI to challenge/accept a fixture. Both captains use `/club-wars73.html` to register two distinct members from their own club. When both lineups are present, the accepted fixture is ready. At or after the scheduled time, each selected pilot opens `/team-racing73.html?fixture=FIXTURE_ID` and joins with a verified WAX session. The server pairs exactly those four accounts, assigns home to red and away to blue, runs the 2v2 simulation, and persists an automatic best-of-three fixture score. Repeat joining after each race until one club has two wins. Public fixture API `/api/club73/fixtures`; authenticated lineup API `POST /api/club73/lineup` with `{id,side,pilots:[account1,account2]}`.

This is an off-chain, provisional prototype. Simulated race points are not verified competitive outcomes; no blockchain prizes or NFT minting. Live multi-device tests are still required. Existing 1v1 fixtures remain compatible. Disconnect handling may end a race early; production reconnects, arbitration, historical lineup freezes and security review remain outstanding.
