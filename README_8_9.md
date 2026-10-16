# Alpha 8.9 — Relay Club Wars fixtures (prototype)

Captains may select `mode: "relay4v4"` in POST `/api/club86/lineup`, alongside four distinct club members. Both sides must agree on the same mode before their rosters can be locked. All eight members join with `{type:"team72Join",token,fixture73:id,mode85:"relay4v4"}`. Server creates a four-leg, 80-second relay with one active pilot per team, emits handoff events, and records eligible completed races against the fixture. Best-of-three fixture awards remain provisional and off-chain. `/api/club87/standings` includes both conventional 4v4 and relay fixtures; `/api/club86/fixtures` lists both.

Run `npm install && npm start`, `npm test`. Offline structural checks pass; full WebSocket and real-device validation remain outstanding. The captain UI now exposes relay format. No real prizes or NFT minting.

Captain UI: `/club-wars86.html`; relay client: `/relay-racing89.html?fixture=FIXTURE_ID`.
