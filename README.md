# Parkour Lab — public browser beta

This package publishes the current Parkour Lab experience as a static website. It is a starting point for BRIDGE LAB, not yet the complete bridging/PvP platform.

## Run locally

1. Install Node.js 18 or newer.
2. Open a terminal in this folder.
3. Run `npm test` to execute the physics test suite.
4. Start a local static server, for example `npx serve .`, then open the URL it prints.

The page loads Three.js r128 from cdnjs, so an internet connection is required when opening the game.

## Publish with GitHub Pages

1. Create a public GitHub repository (for example `bridge-lab`).
2. Upload the contents of this folder to the repository root. Make sure `index.html` is at the root, not nested inside another folder.
3. Open the repository Settings → Pages.
4. Under Build and deployment, choose Deploy from a branch.
5. Select `main` and `/(root)`, then Save.
6. Wait for GitHub Pages to finish deploying. The public URL will be shown in Settings → Pages.

## Current scope and limitations

- The playable page is the existing Parkour Lab Three.js game.
- `src/physics.js` and `src/courses.js` are modular source files; the current `index.html` still embeds its own game implementation rather than importing those modules.
- `npm test` runs the included 46-check physics test script. Passing tests are useful regression checks, not proof of exact Minecraft Java parity.
- This package does not yet contain the voxel block-placement/bridging system, PvP system, accounts, cloud saves, or global leaderboards.
- The page uses localStorage for local settings/progress.

## Project structure

- `index.html` — static website entry point
- `src/physics.js` — modular movement physics implementation
- `src/courses.js` — course data and platform builder
- `tests/physics-tests.js` — physics regression checks
- `package.json` — test command
