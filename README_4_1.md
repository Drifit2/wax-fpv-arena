# Alpha 4.1 — Server-flight 3D presentation and replay

The server-flight challenge now has a Three.js 3D chase camera, rendered checkpoint rings, a flight trail, a top-down view toggle, and local playback of received server state snapshots. Flight physics and checkpoint decisions remain on the Alpha 4.0 server. Replays are ephemeral browser-memory visualizations, **not** verified records, authoritative leaderboards, or prize eligibility. The main index.html simulator remains a separate client-side flight engine.

Run `npm install && npm start`, authenticate at `/wallet.html`, and open `/server-flight.html`. The 3D renderer loads Three.js from a CDN and requires internet access.

Do not award NFTs or prizes based on these results. Production requires authoritative simulation hardening, durable verified leaderboards, abuse testing, and minting integration.
