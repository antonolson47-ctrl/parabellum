# PARABELLUM: build progress (resume from here)

Title: **PARABELLUM**, subtitle "Shayla vs. the Undead and the Steakburger Apocalypse". Repo target: antonolson47-ctrl/parabellum (GitHub Pages).
Plan: plan/GAME_PLAN.md (approved). Anton's decisions (Oct 7):
- Cast is ONLY Shayla, Kennedy (curls, no cap), Kelly, Kayleigh and Kambree. No kids, Gigi, baby, KD, Cocoa, Uncle Ronnie or Aunt Ruth.
- 9 levels: hospital, Freddo's, Pub_ic Library, Farmers' Market, Dickson St, Old Main/Senior Walk, Wilson Park Castle, Mt Sequoyah boss, Home reunion. No tailgate.
- FULL GORE ONLY: no Toned Down toggle, no bleeping, no gore setting. 18+ notice on the title screen.
- Shayla swears a lot, with many barks (kills, headshots, reloads, low HP, Kennedy arriving, level starts) and reworded action-movie riffs.
- Realistic character upgrade (top priority).

## Architecture
- Characters: CC0 Quaternius Universal Base Characters (Superhero F/M, rigged, PBR) + Universal Animation Library (CC0, 43 clips). Downloaded with `assets_src/itch_dl.py`.
- `assets_src/build_assets.mjs` → `build_assets/*.glb` (meshopt + jpeg, downscaled) → base64-embedded at build.
- `src/*.js` (ES modules) are bundled with esbuild (three + GLTFLoader + meshopt decoder + SkeletonUtils) into one IIFE, then inlined into `index.html` by `build.sh`.
- Tests: `test/` Playwright (Chromium + WebKit), with `window.__PB` hooks for autoplay.

## Milestones
- [x] M0 assets downloaded (assets_src/ubc, assets_src/ual)
- [x] M1 asset pipeline (build_assets/*.glb)
- [x] M2 character factory (src/chars.js; dev/chars.html?view=lineup|closeup|zombies|one:<key>; render with `node test/dev.cjs "dev/chars.html?view=lineup" out.png 1280 720`)
- [ ] M3 engine core (renderer, input, HUD, player, weapons, zombies, gore)
- [ ] M4 levels 1-9 + Kennedy AI + pickups + shop + saves
- [ ] M5 story/cutscenes + barks + ending
- [ ] M6 audio (music + sfx)
- [ ] M7 tests (iPhone/iPad landscape, Android, portrait) + autoplay all 9 levels with 0 errors
- [ ] M8 publish to antonolson47-ctrl/parabellum + live check + screenshots

## Log
- 06:55 CT: assets downloaded (CC0). Starting the pipeline.
- M1 done: build_assets/ (female/male/anims/hair_*.glb, *_light.jpg). Runtime loader src/assets.js (fetch in dev, window.__PB_ASSETS base64 in bundle).
- M2 done: src/chars.js. Key facts: meshopt quantization folds into inverse-bind matrices -> bakeBind() converts body/eyes/brows to float bind-pose positions. Clothing = vertex 'garment' flag (smoothed + inflated) + shader crisp cuts from cutParams() (sleeves, hems, necklines, open jackets via uOpen). Patterns: 0 solid, 1 flannel, 2 denim, 3 knit, 4 print. Zombies: uZomb (decay, seed, wounds, stains), uBlood (runtime hit blood), eye glow. Accessories attach to bones in bind pose. Read tool caches images by path: always use NEW filenames for renders.

## M3/M4 — engine + game modules (written 2026-10-07 AM CT)
All modules exist in src/: util, engine, style, input, hud, world, fx, audio, save, text, weapons, state, zombies, player,
kweepie, pickups, kennedy, props, levels (9 builders), bosses, story (cutscenes + portrait), game (flow/director/shop/HUD/autopilot), main.
- Dev entry: dev/game.html (importmap -> node_modules). Bundles clean with esbuild (src/main.js IIFE).
- Test hooks: window.__PB (state(), startLevel(i), autopilot(on), autoSkip(ms), skipCine(), killAll(), toBoss(), hurtBoss(f), tp, look, fast(on)); errors in window.__PB_ERRORS.
- Burger bags in Freddo's/Library/Market bumped to 6 -> total burgers available 161, cokes 156 (need 120/120).
- Kambree aviators: temples removed (glasses(...,temples=false)).
- NEXT: run dev/game.html in Playwright, fix runtime errors level by level, then build.sh (single-file), tests, pages.

## M5–M7 progress (2026-10-07 ~07:45 CT)
- Game runs end-to-end in dev (dev/game.html). Cutscenes (intro, kellyCall, kennedy, finale, reunion, short) render with 3D close-ups.
- test/fullrun.cjs: autopilot plays all 9 shifts (substeps=3). Run r1 (desktop 1280x720): ALL 9 levels complete, 0 page errors,
  haul 161 burgers / 156 cokes -> reunion ending. Only assist: Mother boss (hurtBoss after 150s) -> Mother HP lowered 8000->6000.
- build.sh -> dist/index.html (+dist/assets/) and dist/Parabellum.html (single file, 6.5 MB).
- Fixes: sign z-fighting (signs offset 1.5cm), Kennedy rifle now follows right hand in root space, player pushed out of zombies/blob,
  zombie blood tint capped 0.5, cine doll light dimmed, intro staging fixed.
- NEXT: cine screenshot review, Mother visual check, mobile emulation runs (iPhone/iPad landscape, Android, portrait) on dist/, make_pages.sh, publish.

## Resume run (2026-10-07 07:45 CT)
1. [done] Full-gore check: no Toned Down toggle, no bleep/censor code, no gore setting anywhere in src/ (grep: toned|bleep|censor|gore setting -> none).
   Removed a leftover unused `settings.easy` damage multiplier in player.js. Title keeps the 18+ notice ("18+ · GRAPHIC GORE & NONSTOP SWEARING").
   Dialogue is uncensored (text.js/story.js contain the raw words, no asterisks).
   Harness fix: dist/ has a static <title>, so tests now wait for window.__PB + mode 'title' (earlier iPhone/Pixel runs died on that, not on a game bug).

### Step 2 — visual review (done, ~07:46 CT)
- Fresh dist captures at 1280×720 DPR 1.5: `screenshots/final/02_closeup_shayla.png` (intro close-up), `04b_kennedy_closeup.png`, `05_reunion.png`, `05b_reunion_peace.png`.
- Faces are detailed and not blocky: sculpted skinned heads with eyelids/liner, brows, lips, curled hair (Kennedy, no cap), clothing shader (flannel, scrubs). The red-light tint on faces is gone.
- Still simple: the truck in the Kennedy cutscene is box geometry, gun viewmodels are box geometry, and Kennedy's mustache is a tube.

### Step 3 — mobile smoke on dist/index.html (done, ~07:48 CT)
- test/play.cjs now takes `BROWSER=webkit`.
- Each run: load → start L1 → autopilot 20 s → title → Vendy's shop (13 buy buttons).

| Device | Browser | Result |
|---|---|---|
| iPhone 15 landscape | WebKit | PASS, 0 page errors / 0 console errors, 2 kills in 20 s |
| iPad Pro 11 landscape | Chromium | PASS, 0 errors (swiftshader ReadPixels perf warning only) |
| Pixel 7 landscape | Chromium | PASS, 0 errors (same warning) |
| iPhone 15 portrait | WebKit | PASS, 0 errors |

- Real issue fixed: in portrait, the HUD vitals panel overlapped the finger/burger/coke chips and the objective. Moved the chips to a second row on the right, shrank the monitor/Kennedy bar, and pushed the objective/rule/toast/boss bar down. Re-verified in WebKit (`test/shots/sm_portrait_play2.png`, 0 errors).
- Shots: `test/shots/sm_{iph,ipad,pix,portrait}_{title,play,shop}.png`.

### Step 4 — published (done, 07:49 CT)
- `make_pages.sh` assembles `../parabellum-pages`: index.html (dist build + PWA links), assets/ (4.0 MB), Parabellum.html (6.5 MB single file), PIL icons (Butcherman P), manifest.webmanifest, .nojekyll, README, PROGRESS, src/, dev/game.html, test harness, and downscaled final screenshots. 13 MB total; the largest file is 6.5 MB, well under GitHub's 100 MB limit.
- Repo: https://github.com/antonolson47-ctrl/parabellum (public, main). Pages enabled (legacy build from main /).
- Live: https://antonolson47-ctrl.github.io/parabellum/ returned HTTP 200 at 07:49:56 CT. assets/*.glb, manifest, icons and Parabellum.html all return 200.
- Live WebKit check (iPhone 15 landscape): booted, played L1 20 s (12 kills, 12 headshots), opened the shop (13 items), 0 page errors / 0 console errors. Shots: `test/shots/sm_live_{title,play,shop}.png`.
- test/play.cjs now accepts a full URL in PAGE.

### Step 5 — final screenshots (done)
`screenshots/final/`: 01_title.png, 02_closeup_shayla.png, 03_hospital_gameplay.png, 04_kennedy_joins.png, 04b_kennedy_closeup.png, 04c_kennedy_ingame.png, 05_reunion.png, 05b_reunion_peace.png (1280×720 @1.5x, dist build).

### Post-publish full playthrough (iPhone 15 landscape emulation, dist, 07:52–08:28 CT)
- r2: all 9 shifts, 0 page errors / 0 console errors, final haul 143/136 → reunion ending, back to title.
- Assists: hurtBoss once on the Mother (L8).
- L3 Library stalled (20-min timeout). Cause: the autopilot checked line of sight to pickups at 1 m, so it walked straight into a 0.76 m reading table toward a coke and stuck there. It was a test-bot bug, not a player bug. I checked that zombies still reach a player hugging that table.
- Fix: the bot checks the path at 0.3 m (knee height). Re-ran L3 on iPhone/dist (r3): cleared in 48 s with no assists, picked up all 18 burgers and 20 cokes, 0 errors.
- Test hooks now expose `P` (pickups). Rebuilt and republished.

### Birthday references removed + REPLAY (08:40 CT)
- Anton never said this was a birthday game, so every birthday reference is gone:
  - title footer now reads "An original parody for Shayla · all music & sound procedurally generated"
  - reunion banner now reads "WELCOME HOME SHAYLA!" / "FAMILY REUNION · love, the family (and Kweepie)"
  - end card now reads "Welcome home, Shayla ♥"
  - rewrote the intro, Kennedy and reunion lines
  - Kennedy's rifle "The Birthday One" is renamed "The Gift" (weapon, shop items, toast)
  - cleaned the meta description, manifest, README and plan docs
- The title button says REPLAY once Shift 9 is complete and restarts from Shift 1 (upgrades kept).
- Re-captured screenshots/final/01_title.png, 05_reunion.png and 05b_reunion_peace.png.
