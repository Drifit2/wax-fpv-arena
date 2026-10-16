# WAX FPV Arena — Render alpha deployment

1. Commit `render.yaml` and `.gitignore` at the repository root.
2. In Render, select New > Blueprint and connect Drifit2/wax-fpv-arena.
3. Review the proposed Starter web service and its monthly cost before approving.
4. Once deployed, visit `https://YOUR-SERVICE.onrender.com/lobby.html`.
5. Run `npm ci`, `npm test`, and `npm run test:all-integration` in a suitable development/CI environment before inviting players.

## Important production limitations

- The server writes leaderboard, profile, combat and other JSON state into the application directory. Render deployments/restarts without persistent storage can lose those changes. This blueprint is for disposable alpha testing only; implement persistent external storage before retaining real player progress.
- Do not enable prizes, paid competitions, or claim production-grade anti-cheat. Multiplayer and wallet integrations require live testing.
- Keep `FPV_ADMIN_TOKEN` and any other secrets in Render environment settings, not in GitHub. Never set test-only bypass secrets in production.
- Start with a single instance; multiplayer rooms and authentication sessions are in memory and cannot automatically span instances.
- The health check points to the existing lobby page; verify it returns HTTP 200 after deployment.
