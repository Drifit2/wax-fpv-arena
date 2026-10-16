# Alpha 5.7 — Legendary Exhibition Gallery

- New `exhibition.html` public pilot gallery with animated drone previews and collection-achievement aura effects (gallery only).
- Wallet-authenticated opt-in publish/unpublish endpoints: `GET /api/gallery57/me`, `POST /api/gallery57/publish`.
- Public endpoints: `GET /api/gallery57/list` and `GET /api/gallery57/exhibit?account=...`.
- Only published pilots are visible; title and description are bounded and rendered as text, not HTML.
- NFT ownership is freshly checked when opening an exhibit; unavailable checks fail closed. The list view does not claim ownership verification.
- All gallery visual effects and sets are cosmetic-only; no minting, prizes or gameplay advantages.
- Gallery metadata persists to `gallery57_exhibits.json`.

## Run
`npm install && npm start`; authenticate via `/wallet.html`, then open `/exhibition.html`.

## Limitations
The legendary animation is a 2D SVG gallery effect, not a multiplayer particle system. Collection achievements are off-chain, not minted NFTs. Do not expose the prototype server to the public Internet without production security, moderation, privacy and abuse controls.
