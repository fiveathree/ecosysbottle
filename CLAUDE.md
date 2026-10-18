# CLAUDE.md — 生態瓶實驗室 / Eco Jar Lab

A 3D ecosystem-jar simulator, delivered as one self-contained HTML page.
- three.js r128: loaded as UMD from cdnjs.
- No framework and no bundler.

## Working with the owner
- The owner speaks Cantonese and is not technical. Reply in Cantonese (繁體中文), not in English.
- Explain anything they must do themselves step by step, using the exact current button and menu names.
- Every user-facing string is bilingual: use `L('中文','English')`, or `N([zh,en])` for name arrays.
- Fonts are Google Noto (Sans / Sans TC / Serif / Serif TC / Sans Mono).

## Build
```
node build.js        # or: npm run build   (python3 build.py gives the same output)
npm test             # build + automated tests (needs `npm install` once)
```
- `build.js` also syntax-checks the bundle. Python is not installed on the owner's PC, so prefer the Node build.
- The script concatenates `src/head.html`, `style.css`, `body.html` and the JS files, in this order:
  `data.js, sim.js, scene.js, terra.js, ui.js, ui2.js, play.js, main.js`
- The JS is wrapped in one IIFE `(()=>{ ... })()`, so every function shares one scope.
- Outputs:
  - `index.html`: GitHub Pages, with the full doctype wrapper.
  - `dist/artifact.html`: the claude.ai artifact version.
- Always commit `src/`, `index.html` and `dist/` together.
- `tests/sim.test.js` runs the whole page in jsdom with real three.js r128 (dev dependencies only; the page itself has none). It checks:
  every preset survives 6 days, auto-balance on presets, the messy-paludarium + move-to-empty-jar flow, hunger recovery, and share-link round trip.
  `RUNS=10 npm test` runs each preset more times.
- Visuals, dragging and popover placement need a real browser.

## Modules
| File | What lives there |
|---|---|
| `data.js` | Helpers: `$`, `clamp`, `L`, `N`, `esc`<br>Param defs `PD`<br>Species catalogue `CAT`: hab water/land/amph, `w` fresh/salt, roots, preys/attacks<br>`BREED`, `LIMIT`, `SHAPES`, `MATS` (with `therm`), weather `WX`, `REGIONS`<br>`REGIONS` types: `city` (incl. `custom`) and `biome`, with `modes`<br>Also `PRESETS` per mode, `TAGS`<br>`VARIANTS` colour morphs per species (`params.v`, random on add, babies inherit; `variantOf(it)`) |
| `sim.js` | Global state `S` (incl. `fan`: cools 2–3°C when the lid is open)<br>Hourly `step` covers:<br>• water chemistry O2/CO2/NH3/NO3/algae/detritus, in mg over water volume `wL`<br>• land/air humidity, waste, mould<br>• temperature, predation, breeding<br>`forecast`/`runTrial`<br>`autoBalance`: staged greedy, scored with a fixed random seed (`seeded`) so options are compared fairly; protects animals first and never removes them; animals it still cannot save are listed in `S.report.doomed` for the "move to an empty jar" button; a real tank gets suggestions only (`S.report`)<br>`eat`: hungry animals eat up to 3× so fullness can recover; animals eat in a shuffled order each hour<br>Food web: a surface biofilm (light × surface × volume) and plant litter keep grazers fed; land animals get their share of food before fish<br>Breeding: capped by jar size (smaller when sealed), needs fullness > 90%, and flake-fed fish only breed if the daily food covers another litter |
| `scene.js` | Renderer, camera, jar geometry, terrain helpers (`groundY`, `inWater`, `fitInJar`, `clampInR`, so nothing passes through the glass)<br>Creature and decor models<br>Weather visuals<br>Pointer input (touch: vertical swipe scrolls the page)<br>Camera follow / first-person view (`camF`, `camFollow`, `camStop`)<br>`animate()` |
| `terra.js` | Build-your-own terrain:<br>• heightmap `S.terra={n:24,h[],m[]}`<br>• 11 materials `TMATS`<br>• brushes and stacking<br>• `enterBuild`/`exitBuild` (build mode: paused, daytime, clear weather, no auto-rotate)<br>• build toolbar |
| `ui.js` | Right panel tabs (Add / Jar / Env / Analysis, each with tag filters)<br>Setup tab has Simple / Advanced (`envAdv`, pref `ecojar.envAdv`): mark advanced-only blocks with `data-adv`<br>Header chrome (`renderChrome`), meters, balance budgets, environment pane<br>Save/load, 3 jars (snapshot/restore) |
| `ui2.js` | Mode switching aqua/rain/palu, which keeps the items<br>Left (balance) and right (list) overlays, opened/closed by the edge arrows (`setOv`)<br>Camera bar, day/night view lock (`viewLight`, view only)<br>Phones (≤700px): bottom dock `#dock` + pull-up sheet (`setSheet(open,full)`, drag `#grab`); `showTab` opens the sheet on phones<br>Quick guide `TOUR` (spotlight steps; each step lists target selectors, first visible wins; auto-starts once, pref `ecojar.tour`; replay from the ⋯ menu)<br>Presets dialog, share link (`#s=` deflate + base64url) and "copy this jar"<br>Object popover: draggable, sits beside the object; decor rotation and size<br>Issue pill with one-tap fixes<br>Auto-balance report |
| `play.js` | 「玩法」tab: challenges `CHAL` (per jar, `S.chal`; `survive` = no animal deaths for N days, `reach` = hit a goal in time), achievements `ACH` and the species collection (per viewer, `pref` keys `ecojar.ach` / `ecojar.col`; `unlock(id)`), 30-day time-travel preview (`travelPreview`, seeded trial) and `fastForward` (not for real tanks)<br>Unlocks `UNLOCKS` (order: fresh aquatic → rainforest → paludarium → salt water → rare animals): milestones open species, regions, presets and features (`rain`, `palu`, `salt`, `ff`). Only `FREE_PRESETS` start open. `lockOf(kind,key)` (kind = type/region/feature/preset) gates the Add catalog, mode switch, water level, Setup regions/water and the presets dialog (`presetLock(mode,key,p)`). New unlocks open a centred popup (`celebrate`) with a moving 3D preview built by `itemModel` (scene.js). Hidden switch: tap the title 7 times → unlock everything (`ecojar.all`). Items already in a jar, shared links and 「分析水缸」 are never locked.<br>`playTick()` runs once a second from main.js; `S.deathN` counts animal deaths per jar |
| `main.js` | Boot and the frame loop: sim step, render, and throttled UI refresh |

## Persistence
- `localStorage['ecojar.v4']` = `{cur, jars[3], ana}`, with migration from v2.
- Overlay prefs: `ecojar.ov`.
- Language: `ecojar.lang`. Header: Share and language live in the 「⋯」 menu (`#moreMenu`). Day/night view lock: `ecojar.dn`. Use the `pref` helper (data.js) for these per-viewer settings.
- New per-jar state must be added to `SNAP_KEYS` in `ui.js` (e.g. `fan`, `chal`, `deathN`). Shared links and split/trial copies clear `chal` and `deathN`.

## Conventions
- Keep it a single page: there is no npm runtime dependency.
- External scripts come only from cdnjs, and stylesheets only from Google Fonts.
- Colours are CSS tokens on `:root`, with light and dark themes. Layout must work at phone width.
- Real-tank jars (`S.real`): never auto-delete or auto-change anything; give suggestions only.
  They bypass every unlock (except presets and fast-forward) so people can model their own tank, but they never count towards collection, achievements or challenges.
- After changes, run `npm test`; every preset except 「失衡示範」 must survive 6 and 30 simulated days.
  If one fails, `node tests/diag30.js aqua.eco` shows when and why animals die (`RUNS`, `DAYS` env vars).
- `.stage>canvas` styles target only the 3D canvas; other canvases (the trend chart) live inside overlays.
