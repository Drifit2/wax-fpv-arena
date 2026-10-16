# Alpha 7.2 — Simultaneous 2v2 Exhibition Racing

Run `npm install && npm start` and visit `/team-racing72.html`. Four distinct wallet-authenticated pilots join one server-simulated match; server advances all four flights on the same 50ms loop and broadcasts synchronized telemetry. Team scoring rewards finishing and gates, with small time bonus. Mobile touch controls included. Public read-only status: `/api/team72/status`.

**Limitations:** This is an independent exhibition queue, not yet integrated with Club Wars fixtures or seasonal standings. No relay, 4v4, live validation, prizes, blockchain transactions, or NFT minting. Queue is first-four unique accounts, with automatic alternating teams; no captain roster selection yet. Server restart clears match history.
