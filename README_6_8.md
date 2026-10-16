# Alpha 6.8 — Club Championship Seasons

Run `npm install && npm start`; open `http://localhost:8080/club-seasons68.html`.

- Club applications require WAX wallet sessions and captain approval; legacy direct join endpoint is disabled.
- Server administrators with `FPV_ADMIN_TOKEN` (32+ characters) open and close season snapshots.
- Standings are computed from existing provisional tournament race records; season close subtracts the baseline snapshot, which is an approximation if rosters change or older records are trimmed.
- Interclub matchup counts reflect existing recorded tournament races and current club membership, not dedicated scheduled team-vs-team fixtures.
- Downloadable SVG banner previews are **not minted NFTs**. No prizes or token transfers.
- Server JS syntax and ZIP integrity checked. Wallet, deployment and multi-user race testing not performed.
