# Alpha 9.0 — checkpoint relay handoffs

Relay teams now advance through four legs by clearing **two course gates per active pilot**, not by a timer. Server switches to the next pilot only after their second checkpoint. A relay completes only when both teams clear all four legs; if the race deadline expires, the result is a timeout and **cannot award a Club Wars fixture victory**. Checkpoint handoffs emit `relay88Handoff` with `trigger: "checkpoint"`. The server retains the provisional off-chain scoring model.

Run `npm install && npm start`, `npm test`, then visit `relay-racing89.html` or `club-wars86.html`. Eight-client integration and device validation remain outstanding.
