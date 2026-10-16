# Alpha 5.6 — Collectors Journal and Cosmetic Set Achievements

## Included
- New `collectors-journal.html`: responsive collection dashboard with verified NFT livery display and cosmetic-set achievements.
- Three off-chain workshop component sets: Velocity, Guardian, Nightfall.
- `GET /api/journal56/me`: authenticated collection progress, fresh linked NFT ownership check (fails closed), and saved visual badges.
- `POST /api/journal56/discover`: authenticated, server-validated workshop loadout matching; idempotent achievement persistence in `pilot52_progress.json`.
- Set achievements do not mint NFTs, confer token rewards, or affect flight physics.
- Existing race visuals and NFT-verified liveries from Alpha 5.5 are retained.

## Run
`npm install && npm start`; sign in at `/wallet.html`, select parts at `/workshop.html`, then open `/collectors-journal.html`.

## Limitations
The new aura rewards are collection-journal badges, not yet 3D multiplayer particle effects. Real NFT rarity tiers and multi-asset ownership inventories require an explicit trusted collection/template registry and production validation. Wallet and multiplayer integration testing remain outstanding.
