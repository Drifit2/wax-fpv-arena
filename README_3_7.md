# Alpha 3.7 — Authenticated seasonal practice profiles

Adds server-persisted WAX-account practice records for the three Founders Flight stages, session-authenticated endpoints, stage progression checks, best-time storage, and a non-minting NFT reward preview. Run `npm install && npm start`, authenticate at `/wallet.html`, then play from `/season.html` in the same tab. Endpoints: `GET /api/season/my-profile`, `POST /api/season/practice-submit`, `GET /api/season/reward-preview`.

**SECURITY LIMITATION:** Flight physics, checkpoint events and times are still computed in the browser. These are *client-reported practice times*, not server-authoritative results. No actual NFT prize claims, minting, automated rewards, or payments are enabled. Authentication uses the prior prototype implementation and requires live wallet verification testing before deployment. Never use these times to distribute valuable prizes.
