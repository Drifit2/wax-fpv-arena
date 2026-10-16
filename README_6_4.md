# Alpha 6.4 — Championship Spectator Experience

- `spectator64.html`: perspective-rendered canvas spectator view, selectable chase/tower/orbit camera, polls read-only server race telemetry. Not actual 3D world geometry or video capture.
- `highlights64.html`: completed tournament race result cards from retained server history; not a flight replay recording.
- `podium64.html`: exhibition champion, runner-up and semifinalists derived from bracket records.
- `/api/tournament64/highlights` and `/api/tournament64/podium`: read-only public endpoints.
- Tournament results remain provisional server-simulated exhibitions; no real NFT minting, financial prizes or blockchain trophy transactions.
- Requires `npm install && npm start`; open `spectator64.html`. Live multi-device testing remains outstanding.
