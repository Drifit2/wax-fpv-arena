# Alpha 4.7 — deterministic race replay audits

Adds durable input traces for **new** completed server-simulated races, a deterministic re-simulation verifier, SHA-256 trace fingerprints, pilot audit endpoints and a protected administrator audit endpoint. Existing Alpha 4.6 records lack input traces and cannot be retroactively verified.

## Endpoints
- GET `/api/sim47/my-traces` — authenticated pilot lists own completed traces.
- GET `/api/sim47/verify?id=<race UUID>` — independently replays saved controls and checks final physics state, time, checkpoints and sampled replay digest.
- GET `/api/admin47/verify?id=<race UUID>` — same audit with `x-fpv-admin-token` configured via `FPV_ADMIN_TOKEN`.

Trace data is stored in `sim47_traces.json` (latest 500) and persists across restarts. Trace integrity is checked against the saved fingerprint; fingerprints are not signed or anchored outside the server, and server administrators can alter both. Inputs are only recorded on race completion, so incomplete flights are not audited. No NFT minting, prize eligibility or real-money competition is enabled.

Run `npm install && npm start`; authenticate in `wallet.html`, race in `server-flight.html`, then use `replay-audit.html`.
