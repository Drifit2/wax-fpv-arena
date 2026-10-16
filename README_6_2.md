# WAX FPV Arena Alpha 6.2 — Four-Pilot Tournament Exhibition

- `tournament.html`: wallet-authenticated registration, live elimination bracket, public standings, and champion display.
- Four distinct WAX wallet accounts automatically seed two semifinals and a final. Entrants queue in `matchmaking.html?tournament=arena-cup-1`.
- The server matches only the assigned opponent when tournament-tagged. Results are recorded from the existing server-simulated duel, not from client-submitted winners. Disconnects and no-winner results do not advance the bracket; pilots can retry.
- `GET /api/tournament62`, `POST /api/tournament62/join` (Bearer session). Persistence: `tournament62.json`.
- Single exhibition cup; no admin reset, spectator live camera, automated scheduling, prizes, token transfers, or NFT minting. Bracket view is read-only spectator coverage via polling/refresh. Prototype not production audited.
- Run `npm install && npm start`; open `/tournament.html`.
