# Alpha 3.1 — Verified WAX pilot prototype

Run `npm install && npm start`, then open http://localhost:8080/wallet.html.

## Added
- Single-use, 5-minute challenge; wallet-signed nonce via Cloud Wallet legacy `userAccountProof`.
- Backend checks proof against active/owner public keys fetched from WAX RPC; 1-hour bearer session, logout and expiration.
- Authenticated NFT entitlement endpoint rechecks current ownership and the operator allowlist.
- Fails closed on missing NFT allowlist, API errors, missing signatures, or invalid sessions.

## Limitations
- This is a proof-of-concept, not production security audited. WaxJS is deprecated by WAX; migrate the client to WharfKit before launch.
- Sessions are in memory and reset on restart; deploy only behind HTTPS. Do not store bearer tokens in persistent browser storage.
- Wallet session is not yet bound to multiplayer WebSocket identity, and entitlement does not actually equip a drone or unlock premium combat.
- Public leaderboard and combat remain non-authoritative.
- No NFTs minted and no purchases or commissions executed.
- Configure real approved collection and template IDs in approved_nft_templates.json.
- External WAX RPC and AtomicAssets availability is required.
