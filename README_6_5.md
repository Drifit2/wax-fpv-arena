# Alpha 6.5 — Championship Broadcast Mode

- `broadcast65.html` provides a responsive spectator broadcast interface, selectable stylized telemetry views, live position ranking, a tournament status desk, and recent results.
- `/api/broadcast65/state` is a public read-only endpoint exposing currently active tournament races, server timestamps, sanitized pilot telemetry, and recent winners.
- Commentary is generated in the browser from changes in server-provided gate progress and lead order. Optional voice commentary uses browser speech synthesis and requires a user click.
- Updates are polled approximately every 1.2 seconds, so this is not a frame-perfect feed.
- This is a visualized telemetry broadcast, not a 3D camera or actual recorded flight video.
- No NFT minting, financial rewards, or token prizes. Results remain provisional exhibition results.
- Live multi-device, mobile, and wallet integration testing is still needed.

Run `npm install && npm start`, then open `http://localhost:8080/broadcast65.html`.
