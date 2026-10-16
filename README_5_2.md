# Alpha 5.2 — Pilot career progression and NFT cosmetic eligibility

New `pilot-career.html` and API routes `/api/pilot52/me`, `/api/pilot52/leaderboard`, `/api/pilot52/cosmetic`. Completed server-simulated exhibition duels award XP, levels, wins and provisional Elo-style ratings (K=16). Divisions: Bronze <1000, Silver 1000+, Gold 1150+, Diamond 1300+, Ace 1500+. Data persists in `pilot52_progress.json` (created at runtime). Disconnect results do not earn progression.

NFT cosmetic linking requires an authenticated WAX session and real-time AtomicAssets owner check against `approved_nft_templates.json`. The allowlist is empty by default; configure your actual approved collection/template IDs before testing. Cosmetic links are not ownership proof forever; recheck before production use. Cosmetic is a profile badge; 3D multiplayer paint sync is not implemented and NFT ownership does not affect speed or physics.

Exhibition progression is provisional, not a secure official ranking. No NFT minting, prize claims or financial rewards. Run `npm install && npm start`; visit `wallet.html`, then `pilot-career.html` and `matchmaking.html`. JavaScript syntax checks are not live wallet or two-client tests.
