# Alpha 6.6 — Championship Experience

- `arena66.html`: team identity editor, pilot introductions, reactions, tournament rivalries, downloadable SVG highlight cards.
- Wallet-authenticated team identity edits stored in `team66_profiles.json`. Public team names and mottos are unmoderated: deploy moderation before public launch.
- Spectator reactions require wallet authentication, rate-limited to one per 10 seconds per account; kept only in server memory. Multiple accounts can bypass rate limits.
- Rivalries derived exclusively from repeated server-recorded tournament results; no invented matchups.
- SVG cards use recorded results and XML-escaped labels. No video capture, minting, token rewards or financial prizes.
- Server endpoints: GET/POST `/api/arena66/identity`, GET `/api/arena66/me`, GET `/api/arena66/state`, POST `/api/arena66/reaction`.
- To run: `npm install && npm start`; open `http://localhost:8080/arena66.html`.
- Live multi-wallet, mobile and production-security testing remain outstanding.
