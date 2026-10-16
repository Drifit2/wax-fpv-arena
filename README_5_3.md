# Alpha 5.3 — Verified NFT Hangar and live 3D cosmetic sync

New `hangar.html` shows a stylized CSS drone preview, equipped AtomicAssets NFT, theme, and live ownership verification status. `GET /api/pilot53/hangar` requires an authenticated WAX session and checks AtomicAssets ownership and approved collection/template. The existing `POST /api/pilot52/cosmetic` equips or unequips an approved wallet-owned asset.

On each new live duel pairing, the server independently rechecks both pilots' linked NFT ownership, fails closed on API errors, and sends *only validated* theme/paint/glow data to both competitors in the `rankedState` packets. Multiplayer 3D drones render these verified cosmetic colors. Four approved theme palettes: neon, storm, vanguard, legacy. The owner check can take up to 7 seconds; the server countdown is 7 seconds and may need network-latency refinement.

Configure `approved_nft_templates.json` with real approved template IDs (empty by default). These are cosmetics only: physics, speed, gate logic, and race timing are unchanged. No blockchain minting, rewards or NFT trading. The existing client uses CDN Three.js and needs internet for 3D. This is a prototype; test live two-device racing, wallet signing, owner transfers and security before production.

Run: `npm install && npm start`, then open `wallet.html`, `hangar.html`, `matchmaking.html`.
