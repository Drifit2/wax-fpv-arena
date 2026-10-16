# Alpha 4.5 — Trophy Review Center

Adds `/claim-center.html`, an authenticated, account-bound review workflow. The server independently reads all three stages from server-simulated practice records, allows one persistent Founders Flight Finisher manual-review request per account, and returns request status. It does not trust client-submitted race times, award prize eligibility, approve requests, or mint/transfer NFTs.

Review requests are saved in `claim45_review_requests.json` with atomic file replacement. No admin approval endpoint is exposed. The session is required for status and submissions. Restart the server using `npm install && npm start`, authenticate at `/wallet.html`, complete all three stages at `/server-flight.html`, then visit `/claim-center.html`.

Limitations: development-grade file storage and sessions, no durable replay audit or production anti-cheat, no on-chain claims, no real NFT scarcity enforcement.
