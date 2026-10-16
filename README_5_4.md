# Alpha 5.4 — Collectible Drone Workshop

Open `workshop.html` after signing in via `wallet.html`. Customize frame, propellers, lighting, trails and hangar backdrop. Choices persist per WAX account in `pilot52_progress.json` and are sent to opponents in live race state as cosmetic-only `workshop` metadata. The browser workshop includes an animated preview. The live 3D renderer currently renders NFT paint colors, not full frame/prop geometry or trail effects; those require a future renderer update.

API: `GET /api/workshop54/loadout` and `POST /api/workshop54/loadout`, authenticated with the same Bearer session as the pilot career. POST requires all five enumerated fields; arbitrary values are rejected. NFT ownership is checked independently and fails closed; the workshop does not create or mint NFTs. No collection achievements, paid upgrades, marketplace transactions, or NFT prizes are implemented in this alpha.

Run `npm install && npm start`. All race physics and times remain unaffected. Syntax checks are not substitutes for live wallet, network, and multi-device testing.
