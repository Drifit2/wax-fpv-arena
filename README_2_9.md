# WAX FPV Arena Alpha 2.9 — NFT Launchpad

Run `npm install` then `npm start`; visit http://localhost:8080/launchpad.html.

New: unsigned AtomicAssets `mintasset` transaction JSON generator; network selector; public NFT ownership lookup; link from game UI.

This does NOT mint NFTs, sign transactions, verify wallet identity, or grant premium access. Do not use generated drafts without reviewing creator permissions, schema, template, collection, and recipient on the intended network. Existing guest session and ownership lookup are NOT secure WAX wallet authentication.

Next: implement a wallet-provider-specific challenge/response proof with independently verified signature, nonce expiry and replay protection, then approved-collection entitlement checks.
