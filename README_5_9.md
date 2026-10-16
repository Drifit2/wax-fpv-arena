# Alpha 5.9 — Seasonal Collector Progression

Adds `/collector-seasons.html`, persistent `collector59_progress.json`, and off-chain collector participation titles.

Endpoints: `GET /api/collector59/season` public; `GET /api/collector59/gallery` public (published exhibitors only); `GET /api/collector59/me` authenticated; `POST /api/collector59/join` authenticated and requires a currently published exhibit. Joining is idempotent per week; records a participation milestone rather than a competition win. Titles: First Flight (1 week), Hangar Regular (3), Master Curator (8), Collection Architect (3 workshop sets). Seasons are 12 weeks, counted from 2026-01-05 UTC.

Start `npm install && npm start`; authenticate in wallet.html, publish in exhibition.html, then open collector-seasons.html. Public gallery only includes opted-in exhibitors currently published. No NFT minting, blockchain rewards, or racing advantages. Progress stored in local JSON: back up data before deployment. Wallet and production abuse/security testing pending.
