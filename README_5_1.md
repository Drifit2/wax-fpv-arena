# Alpha 5.1 — 3D multiplayer visualization and podium

`matchmaking.html` now includes a Three.js 3D live rendering of the existing server-simulated duel, visible gate rings, two drone meshes, chase/cockpit/spectator cameras, a 2D fallback, local-only paint selections, and an exhibition podium. Server physics and race result logic are unchanged from 5.0.

Start with `npm install && npm start`; authenticate in `wallet.html`; open `matchmaking.html` in two browsers. Three.js loads from CDN, so 3D requires internet. Cosmetic paint is local display only, not an owned NFT or synchronized across players. Spectator camera is a view mode for a participant, not a spectator network feature. Podium is exhibition only. No official ratings or NFT rewards. Live two-client testing pending.
