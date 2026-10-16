# Alpha 6.0 — Unified Arena Command Center

Entry point: `/lobby.html` (or open `index.html` for the legacy simulator). New responsive lobby offers mode navigation, a public leaderboard and opt-in collector spotlight, authenticated pilot stats and recent exhibition history, and server status. Added `GET /api/lobby60/status` public endpoint. No change to flight physics, matchmaking or WAX authentication. All user-sourced strings in lobby use HTML escaping; server auth remains authoritative.

Run `npm install && npm start`, then open `http://localhost:8080/lobby.html`. Connect wallet via wallet.html; the session is read from `sessionStorage` on the same origin. Test two devices and real WAX sessions before production. 3D Three.js assets require internet; local JSON persistence is not production-grade. This is an alpha, not a deployed game.
