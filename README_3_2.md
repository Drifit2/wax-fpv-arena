# WAX FPV Arena Alpha 3.2 — NFT-equipped multiplayer prototype

Run `npm install && npm start`. Open `/wallet.html`, authenticate with a supported WAX Cloud Wallet, then return to `/index.html` in the **same tab** (sessionStorage stores the short-lived token for this tab). Join a multiplayer room and enter an NFT asset ID in Verified NFT Multiplayer. Click Equip verified NFT.

The server validates the signed wallet session and queries live AtomicAssets ownership and `approved_nft_templates.json` collection/template allowlist. Successful verification broadcasts a gold cosmetic finish and verified NFT indicator in the roster. It provides no performance advantage. The allowlist is intentionally empty by default. The cosmetic is session-scoped and does not imply any blockchain transfer.

Security limitations: The existing legacy WaxJS authentication integration has not been end-to-end tested. WebSocket transport should be HTTPS/WSS in production. Ownership is checked at equip time, not continuously; transferring an asset after equip will not immediately revoke the cosmetic. Gold color is a prototype visual, not actual NFT image/mesh rendering. Multiplayer physics and leaderboard remain non-authoritative. Premium combat passes are not enabled.
