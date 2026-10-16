# Alpha 3.9 — Server gate telemetry practice

Connects the 3D Founders Flight races to authenticated server-side attempt IDs, fixed server-defined X/Z gate centers, sequential gate crossing, altitude bounds, sampled velocity checks, timing checks and persistent practice profiles.

**Not prize secure:** browser-provided coordinates can be fabricated; sampled telemetry and server timing do not constitute server-authoritative flight physics. No minting or real NFT prizes. A production competitive system needs server-simulated flight state from validated input events, secure deployment, and abuse protection.

Open `/season.html`, authenticate via `/wallet.html`, and launch a championship stage. The server uses `/api/season/flight-start`, `/api/season/flight-sample`, and `/api/season/flight-finish`.
