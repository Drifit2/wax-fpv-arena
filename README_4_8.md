# Alpha 4.8 — Competitive Integrity (practice-only)

Adds an administrator-only bulk audit endpoint and dashboard.

- `POST /api/admin48/audit` with header `x-fpv-admin-token: <FPV_ADMIN_TOKEN>` and JSON `{ "ids": "all" }` or `{ "ids": ["trace-id"] }` audits stored Alpha 4.7 control traces.
- `GET /api/admin48/report` returns latest audit per trace.
- Audits persist to `integrity48_audits.json` using atomic rename.
- Checks deterministic replay, trace digest, duration, step limits, leaderboard linkage, duplicate digests.
- Open `/integrity.html` for the administrator dashboard.

**Limitations:** Does not prove honest gameplay or prevent server compromise. Existing records without stored traces cannot be audited. Admin token must be 32+ characters, served only over HTTPS in production. The replay hash is not a signature. All records remain practice-only; minting and NFT rewards are disabled.

Run `npm install && FPV_ADMIN_TOKEN=<random-long-secret> npm start`.
