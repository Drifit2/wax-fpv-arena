# WAX FPV Arena Alpha 9.8 — isolated practice and controller sessions

Run `npm ci`, then `npm start`, and open **http://localhost:8080/lobby.html**. Requires Node.js 18+. The 3D engine is bundled.

Alpha 9.8 protects practice attempts from other accounts and locks each controller connection to one pairing. Run `npm run test:isolation` for the new real HTTP/WebSocket regressions. See REVIEW_FIXES.md for details.

## Play directly on your phone

1. Start the server on your computer or hosting service.
2. On the same Wi-Fi, open `http://YOUR-COMPUTER-LAN-IP:8080/` in your phone browser. For remote access, use your deployed HTTPS address. This ZIP does not create public hosting.
3. Select a mode and press **Start flight**. Touchscreen devices show two flight sticks automatically.
4. Left stick: up/down changes altitude; left/right turns. Right stick: up/down flies forward/backward; left/right strafes. **FIRE** fires in combat modes.
5. Use **Expand flight** for fullscreen when supported. Rotate your phone for a wider view. Lift a finger to release that stick; switching apps releases all held controls.

The existing separate-device phone controller remains available at `/controller`.

## Changes and validation

Added simultaneous direct touch sticks, combat fire and fullscreen controls. Fixed stale host-side controller events during pairing changes, malformed controller messages, and held input after focus loss. Existing keyboard controls, NFT cosmetics, seasons and multiplayer screens are retained.

Run `npm test` and `npm run test:all-integration`. The DOM checks exercise touch input through real flight math with a stub renderer; they do not verify real WebGL rendering or physical Android devices. See REVIEW_FIXES.md for release status. Live WAX authentication/ownership and successful fully flown relay validation remain outstanding. No on-chain awards or public deployment are included.

---

# WAX FPV Arena Alpha 9.6

Run `npm ci` and `npm start`, then open **http://localhost:8080/lobby.html**. Node.js 18+ is required.

For a phone controller, open solo flight on your computer and choose **Generate pairing code**. On your phone, open `http://YOUR-COMPUTER-LAN-IP:8080/controller` on the same network and enter the code. Left stick controls throttle/yaw; right stick controls pitch/roll. Backup buttons are available for all axes. Tilt requires supported motion sensors and a secure HTTPS origin; LAN HTTP can still use touch controls. No public hosting is included.

This release repairs phone input, multi-touch, reconnects and focus-loss behavior, and adds a 500 ms phone-input timeout. Run `npm test` and `npm run test:navigation` to repeat the automated checks. Physical-device and visual checks remain outstanding; see REVIEW_FIXES.md.

# WAX FPV Arena Alpha 9.5

Run `npm ci`, then `npm start`, and open **http://localhost:8080/lobby.html**. Node.js 18+ is required. The included 3D engine needs no CDN fetch. Live WAX services still require internet access.

This update makes season requests safe across restarts, orders final telemetry before result submission, prevents duplicate finish rewards, and adds next-stage navigation. NFTs remain cosmetic, with no performance advantage.

Run `npm test` for offline and simulated DOM/network checks. See REVIEW_FIXES.md for verified behavior and remaining release work.

# WAX FPV Arena Alpha 9.4 — solo flight stability

Run `npm ci` then `npm start` and open **http://localhost:8080/lobby.html**. The Three.js 0.169.0 engine is bundled; see THREE-LICENSE.txt. Node.js 18 or newer is required.

This update fixes the solo module parse failure, first-frame weather lighting failure, Start/Restart handler integration, repair-key conflict, and stuck phone input on disconnect. It also adds a touch descent button. NFTs remain cosmetic with no performance advantage.

Validation: `npm test` includes module syntax and DOM/flight logic checks using a stub renderer. `npm run test:all-integration` runs real local HTTP/WebSocket checks. These do not replace WebGL visual or physical Android playtesting. See REVIEW_FIXES.md for details.

# WAX FPV Arena Alpha 9.3 — integration repair

Run `npm ci` and `npm start`, then open **http://localhost:8080/lobby.html** for the integrated command center. Direct flight remains at `/`.

This revision repairs page routing, wallet session parsing, both WebSocket channels, and isolated multiplayer test setup. See REVIEW_FIXES.md for validation and remaining limits.

## Earlier release history

# WAX FPV Arena Alpha 1.2

Run `npm install` then `npm start`, open http://localhost:8080.

Added: five-minute combat matches, first-to-15 team win condition, match-end notifications, red/blue spawn positions, match HUD, and persistent per-guest-profile kill/death totals in combat_stats.json.

This is an experimental prototype. Combat uses client-reported flight positions, wallet identity is not authenticated, and the combat scoreboard is not secure enough for prizes or paid matches. Room state and match timer reset on server restart. No real-money or NFT purchases.


## Alpha 1.3 — Challenge progression
- Gauntlet mode: beat a countdown, gain time for each checkpoint. Rookie / Pro / Ace adjust time budgets.
- UTC daily track seed, accessible via Load daily challenge.
- Local XP, ranks, medals and persistent career progress (localStorage). No tokens or NFTs are awarded.
- No verified global challenge leaderboard or server-side Gauntlet validation.


Alpha 1.4 adds weekly seeded cup (Monday UTC), adaptive local rival target, daily missions, weekly points and career-unlocked cosmetic paints. All scores and rewards are stored locally and are not authenticated or on-chain.


## Alpha 1.5 Skill Rush
- AI rival drone follows a checkpoint-interpolated pace (visual opponent, not full physics AI).
- Elimination Sprint: each checkpoint refreshes a progressively shorter countdown; failure ends the run.
- Freestyle near-miss combos award score for proximity to scenery, capped at 8x.
- All new scoring is local/unverified and not eligible for crypto rewards.


## Alpha 1.6 Championship Circuit
- Three-round solo championship with target times 75/62/50 seconds; no online bracket matchmaking.
- Moving hazard orbs on the course; proximity collision applies a four-second penalty and velocity disruption.
- Local championship title count stored in browser.
- Prototype feature, not server-verified and not eligible for blockchain rewards.

## Alpha 1.7 — Smartphone haptic controller
Start the server with `npm install && npm start`. Open the main game on a desktop at `http://SERVER-IP:8080`, click **Generate pairing code**, then open `http://SERVER-IP:8080/controller` on the smartphone. Enter the pairing code. Hold touch buttons to control the quad. Android browsers with Vibration API support receive checkpoint and collision feedback. Both devices must reach the same server. For access over the internet, use HTTPS/WSS. Phone controller messages are ephemeral and are not blockchain transactions. Pair codes are temporary; no authentication guarantees beyond knowledge of the code. Live multi-device testing is pending.


## Alpha 1.8 — Phone controller improvements
- Dual virtual analog sticks with deadzone and sensitivity slider. Input currently maps to digital flight keys; it is not true proportional flight physics.
- Optional gyroscope pitch/roll steering, with permission and neutral calibration. Requires supported device and secure context (HTTPS except localhost).
- Adjustable vibration duration; haptics require browser Vibration API support.
- Existing pairing, combat buttons and fallback directional buttons retained.
- Not tested on physical Android/iOS devices; multiplayer server deployment required.


## Alpha 1.9 — Flight handling
Stabilized and acro-inspired handling, control response slider, phone axis protocol and velocity inertia. Phone axes are currently derived from directional touch states (not fully proportional thumbstick displacement). This is an arcade physics upgrade, not a physically accurate drone simulation.


## Alpha 2.0 immersion additions
- Smartphone joysticks send continuously proportional axis positions at 25Hz, instead of threshold-only directions.
- Procedural motor hum through Web Audio after user interaction; sound and speed-responsive FOV toggles.
- Browser Gamepad API supports connected USB/Bluetooth gamepads (axis mapping may vary).
- These are immersion enhancements, not a fully physically accurate 6DOF quad model.
- Browser, phone haptics, multiplayer latency and wallet integrations require real-device testing.


## Alpha 2.1 additions
- Adjustable horizontal wind drift with optional time-varying gusts.
- Adjustable inertia affecting response smoothing in both assisted and acro-inspired modes.
- Live wind-speed HUD readout.
- These are intentionally simplified gameplay physics; full 6-DOF forces, angular velocities, PID, and propwash remain unimplemented.


## Alpha 2.2 — Storm Circuit
- Weather presets: clear, fog, rain, thunderstorm. Weather alters fog distance, wind strength and velocity drag.
- Day, sunset, night and accelerated cycle; lightning flash effect during storms.
- Rain particle field and low-altitude ground impacts with a two-second penalty.
- Optional seeded weather cup derives preset/time from the track seed; **client-side only, not validated for online rewards**.
- These are simplified effects, not volumetric weather or realistic collision physics.


## Alpha 2.3 — Damage & Immersion
- Approximate obstacle collision volumes with hull damage and momentum rebound.
- Hull integrity HUD; drone disabled at zero hull.
- Field repairs cost 5 race seconds and reset hull integrity.
- Synthesized impact sounds (requires audio to be enabled via user gesture).
- Visual AI rival avoidance offset around nearby obstacles.
- Toggle collision and impact sound effects.

**Limitations:** Not full rigid-body collision physics, AI remains waypoint-driven, and all competition remains experimental. No server-authoritative validation.


## Alpha 2.4: Endurance & Pit Crew
- Component health for motors, propellers, and flight controller, with approximate handling consequences.
- Pit repairs near starting pad (within 12 m and slower than 7 m/s), with eight-second time penalty.
- Optional endurance mode disables field repairs and counts clean finishes locally.
- Optional stereo impact cue, dependent on browser audio support.
- Weather-aware AI and full spatial audio remain future work; this is not physics-accurate or competition-secure.
- New features require browser/device playtesting.


## Alpha 2.5 additions
- Three-stage local endurance league with increasing wind and weather, qualification requires finishing without field repairs.
- Persistent local league trophy count.
- Minimal/full cockpit display toggle.
- Optional synthesized ambient wind with volume control.
- These are experimental client-side systems; no secure competition validation or realistic 3D spatial audio.


## Alpha 2.6 — Rival League and NFT Collection Quests
- Four selectable AI rival pace personalities: Nova, Vector, Blaze and Specter. These modify the existing waypoint rival target; they do not add physics-driven autonomous AI.
- Two locally earned cosmetic showcase badges (Scout and Ace) with persistent browser storage. They are **not NFTs**.
- Four proposed NFT cosmetic collection themes; previews are conceptual, and no minting or purchases occur.
- WAX garage inventory browsing and existing ownership checks remain as in 2.5. NFT collection is encouraged but optional, and gives no speed or combat advantage.
- The Scout badge uses the existing daily mission race count, not a lifetime counter.
- Wallet authentication, secure NFT entitlements, production multiplayer and real WAX minting remain unimplemented.


## Alpha 2.7: NFT Marketplace Discovery and Creator Launch Kit
- Browse live public AtomicMarket sales through the AtomicAssets API, optionally filtered by collection.
- Follow links to inspect listings and complete any purchase independently on AtomicHub.
- Download an AtomicAssets-oriented JSON collection blueprint for four proposed cosmetic themes.
- No minting, contract deployment, signing, or authenticated marketplace transactions are implemented.
- Marketplace availability, price formatting and external URLs need live integration verification.


## Alpha 2.8 — AtomicHub Creator Studio

Open `/studio.html` on the same running server. Design proposed AtomicAssets metadata, preview rarity and category, validate collection name and CID, and export a JSON draft. This is a local metadata design tool; it does not mint, create schemas, list NFTs, connect signed wallets, or charge WAX. AtomicHub external marketplace links remain in the main game. For production NFT entitlements, implement cryptographic wallet authentication and allowlist trusted on-chain collection/template IDs.

# Alpha 3.1 — Verified WAX pilot prototype

Run `npm install && npm start`, then open http://localhost:8080/wallet.html.

## Added
- Single-use, 5-minute challenge; wallet-signed nonce via Cloud Wallet legacy `userAccountProof`.
- Backend checks proof against active/owner public keys fetched from WAX RPC; 1-hour bearer session, logout and expiration.
- Authenticated NFT entitlement endpoint rechecks current ownership and the operator allowlist.
- Fails closed on missing NFT allowlist, API errors, missing signatures, or invalid sessions.

## Limitations
- This is a proof-of-concept, not production security audited. WaxJS is deprecated by WAX; migrate the client to WharfKit before launch.
- Sessions are in memory and reset on restart; deploy only behind HTTPS. Do not store bearer tokens in persistent browser storage.
- Wallet session is not yet bound to multiplayer WebSocket identity, and entitlement does not actually equip a drone or unlock premium combat.
- Public leaderboard and combat remain non-authoritative.
- No NFTs minted and no purchases or commissions executed.
- Configure real approved collection and template IDs in approved_nft_templates.json.
- External WAX RPC and AtomicAssets availability is required.


See README_3_2.md for NFT-equipped multiplayer.


See README_3_6.md for playable local championship stages and limitations.


Alpha 3.8: See README_3_8.md for server-timed practice attempts and limitations.


Alpha 4.3: see [README_4_3.md](README_4_3.md) for the trophy preview.


## Alpha 4.4
See README_4_4.md. NFT Collection Manager: http://localhost:8080/collection-manager.html
