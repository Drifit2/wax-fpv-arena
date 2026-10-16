# Alpha 5.8 — Collectors Championship

Adds `collectors-championship.html` and rotating weekly cosmetic exhibition themes. Public board `GET /api/contest58/board`; authenticated status `GET /api/contest58/me`; one authenticated vote per account per week via `POST /api/contest58/vote` `{ "account": "publishedpilot" }`. Votes persist in `contest58_votes.json`. No self-voting; only published exhibits can receive new votes. Unpublished exhibits are excluded from public tallies.

Launch: `npm install && npm start`, authenticate in `/wallet.html`, publish in `/exhibition.html`, and visit `/collectors-championship.html`.

**Limitations:** Community voting is vulnerable to Sybil/multi-account manipulation and is NOT an official ranked competition or reward system. Themes are display prompts, not automatically judged. No NFT minting, prizes, or chain writes. Requires production abuse prevention and privacy review before public deployment.
