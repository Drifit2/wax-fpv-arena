# WAX FPV Arena Alpha 3.0 — NFT Eligibility Foundation

Run `npm install && npm start`, then open `http://localhost:8080/entitlements.html`.

New: `/api/nft-eligibility` checks live AtomicAssets public owner, collection, and template ID against the fail-closed `approved_nft_templates.json` allowlist. The default allowlist is EMPTY. Configure only after verifying real NFT templates. Public inspection NEVER grants premium access.

Security limitations: Wallet signatures and server-authenticated wallet sessions are NOT implemented. Client-reported flight positions remain untrusted. Do not enable paid combat or valuable rewards. API requires outbound internet and may rate-limit. No minting or transfers performed.
