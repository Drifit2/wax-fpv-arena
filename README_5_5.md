# WAX FPV Arena — Alpha 5.5

## What changed
- Multiplayer 3D rendering now uses the server-provided `workshop` cosmetic loadout for each pilot.
- Classic, Racer, Guardian frame geometries; Standard, Tri-blade, Halo propeller shapes.
- Pulse, solid, strobe and off lighting; ion, comet, sparks and off particle trails.
- Visual-only changes; physics and server-calculated racing results are unchanged.
- New `showcase.html` displays the authenticated pilot's saved workshop and NFT ownership status.
- NFT colors still require server-side ownership verification; workshop components are not minted NFTs.

## Run
`npm install && npm start` then authenticate in `wallet.html`, edit `workshop.html`, and race in `matchmaking.html`.

## Caveats
Three.js loads from a CDN (internet required for 3D); browser rendering and two-device races have not been end-to-end tested. 3D effects are client-side and are not an authoritative simulation. No NFT minting or prize eligibility.
