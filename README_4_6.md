# Alpha 4.6 — Championship Practice Integrity Admin

Start with `FPV_ADMIN_TOKEN=<32+ random characters> npm start`. Open `http://localhost:8080/admin.html`. Enter the configured token. Never publish the token or expose this demo server to the public internet without HTTPS, rate limits, access controls and a security review.

Admin APIs: `GET /api/admin46/queue`, `GET /api/admin46/records?account=...`, `POST /api/admin46/decision` (statuses `needs_investigation`, `reviewed_practice`, `rejected_practice`). Header: `x-fpv-admin-token`. Decisions are appended to `audit46_events.json`.

Automated flags are basic data-integrity heuristics, NOT anti-cheat verification. Existing SHA-256 replay fingerprints cannot be independently audited because full completed replays are not persistently stored. Admin decisions never approve NFT minting, do not grant prize eligibility, and do not trigger blockchain actions. Future work: durable input/replay evidence, deterministic replay verifier, protected authentication, transaction-signing and independent security testing.
