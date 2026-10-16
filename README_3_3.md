# Alpha 3.3 — Verified NFT visual identities

Server-approved AtomicAssets templates can be assigned a `theme` in `approved_nft_templates.json`: `neon`, `storm`, `vanguard`, or `legacy`. After wallet-session authentication and ownership validation, the server selects the theme, determines its cosmetic paint, and broadcasts the visual identity to the multiplayer roster. Other players see the themed drone paint and a colored aura. These are procedural in-game visuals, not imported NFT artwork.

Example **configuration only** (replace IDs with verified real collection/template identifiers):

```json
{ "collections": [{ "name": "yourwaxcol1", "template_ids": ["123456"], "theme": "neon" }] }
```

The shipped allowlist is empty (deny-all). NFT possession never increases speed, handling, combat damage or scoring. This version does not deploy NFTs, sell passes, mint rewards or implement live combat-pass access. Ownership is checked on equip only; server-side periodic rechecks and hardened wallet integration are needed before production.

Run `npm install && npm start` and open `http://localhost:8080`.
