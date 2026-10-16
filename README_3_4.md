# Alpha 3.4 — NFT Premium Combat Rooms

- Optional premium checkbox in online lobby for combat, TDM, and CTF.
- Premium room entry requires authenticated session token and current ownership of an approved AtomicAssets template.
- Free and premium rooms use different namespaces.
- Entitlements are rechecked every 60 seconds; failures remove the player. Combat fire fails closed when verification is stale.
- No NFT templates are approved by default. Configure `approved_nft_templates.json` with real WAX collection names and template IDs.
- No minting, purchasing, royalties, or on-chain rewards are implemented. Seasonal trophy concept remains a design target, not a deployed NFT.
- Note: the game expects the verified wallet token in browser storage. Wallet UI storage key compatibility must be checked before end-to-end use.
- This remains an experimental prototype: live WAX and multiplayer testing required.
