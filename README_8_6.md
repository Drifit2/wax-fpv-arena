# Alpha 8.6 — Club Wars 4v4 fixture prototype

Captain-confirmed four-pilot lineups for each club. Use the existing Club Wars challenge/accept endpoints to create and accept a fixture, then POST `/api/club86/lineup` from each captain with `{id,side,pilots:[four wallet names]}`. Four home and four away pilots join the same scheduled fixture with `team72Join`, `mode85:"4v4"`, `fixture73:"war-..."` and a valid wallet token. Once all eight join, the server starts a 4v4 match. The server records a winning team only for a completed/timeout race, with no disconnection award. First club to two wins wins the fixture.

Visit `club-wars86.html` for roster administration, and `team-racing86.html?fixture=war-...` for racing. Run `npm test` for offline tests. Production multiplayer and real-device testing are still pending. All scoring is provisional and off-chain.
