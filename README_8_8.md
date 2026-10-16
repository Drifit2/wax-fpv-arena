# Alpha 8.8 — 4v4 Relay Exhibition

Eight wallet-authenticated pilots queue as two teams of four. Each team has exactly one active flight at a time. The server automatically hands off the baton every 20 seconds and sends `relay88Handoff` events; teammates cannot advance their aircraft while waiting. A four-leg relay ends after 80 seconds. Relay scores use completed legs and gate progress. No prize eligibility or on-chain rewards.

Run `npm install && npm start`, then open `/relay-racing88.html`. Offline checks: `npm test`. Live multiplayer validation remains outstanding. Relay fixtures and competitive season rankings are not yet supported.
