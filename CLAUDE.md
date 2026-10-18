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
python3 build.py
```
- The script concatenates `src/head.html`, `style.css`, `body.html` and the JS files, in this order:
  `data.js, sim.js, scene.js, terra.js, ui.js, ui2.js, main.js`
- The JS is wrapped in one IIFE `(()=>{ ... })()`, so every function shares one scope.
- Outputs:
  - `index.html`: GitHub Pages, with the full doctype wrapper.
  - `dist/artifact.html`: the claude.ai artifact version.
- Always commit `src/`, `index.html` and `dist/` together.
- Syntax check after building:
  `node -e "const s=require('fs').readFileSync('dist/artifact.html','utf8');const m=s.match(/<script>([\s\S]*)<\/script>/g);new Function(m[m.length-1].replace(/<\/?script>/g,''));console.log('ok')"`
- Simulation logic can be tested headlessly in Node with a stubbed `THREE`/DOM (run it with a `timeout`).
- Visuals, dragging and popover placement need a real browser.

## Modules
| File | What lives there |
|---|---|
| `data.js` | Helpers: `$`, `clamp`, `L`, `N`, `esc`<br>Param defs `PD`<br>Species catalogue `CAT`: hab water/land/amph, `w` fresh/salt, roots, preys/attacks<br>`BREED`, `LIMIT`, `SHAPES`, `MATS` (with `therm`), weather `WX`, `REGIONS`<br>`REGIONS` types: `city` (incl. `custom`) and `biome`, with `modes`<br>Also `PRESETS` per mode, `TAGS` |
| `sim.js` | Global state `S`<br>Hourly `step` covers:<br>• water chemistry O2/CO2/NH3/NO3/algae/detritus, in mg over water volume `wL`<br>• land/air humidity, waste, mould<br>• temperature, predation, breeding<br>`forecast`/`runTrial`<br>`autoBalance`: staged greedy; protects animals first and never removes them; a real tank gets suggestions only (`S.report`) |
| `scene.js` | Renderer, camera, jar geometry, terrain helpers (`groundY`, `inWater`, `fitInJar`, `clampInR`, so nothing passes through the glass)<br>Creature and decor models<br>Weather visuals<br>Pointer input<br>`animate()` |
| `terra.js` | Build-your-own terrain:<br>• heightmap `S.terra={n:24,h[],m[]}`<br>• 11 materials `TMATS`<br>• brushes and stacking<br>• `enterBuild`/`exitBuild` (build mode: paused, daytime, clear weather, no auto-rotate)<br>• build toolbar |
| `ui.js` | Right panel tabs (Add / Jar / Env / Analysis, each with tag filters)<br>Header chrome (`renderChrome`), meters, balance budgets, environment pane<br>Save/load, 3 jars (snapshot/restore) |
| `ui2.js` | Mode switching aqua/rain/palu, which keeps the items<br>Left (balance) and right (list) overlays<br>Object popover: draggable, sits beside the object; decor rotation and size<br>Issue pill with one-tap fixes<br>Auto-balance report |
| `main.js` | Boot and the frame loop: sim step, render, and throttled UI refresh |

## Persistence
- `localStorage['ecojar.v4']` = `{cur, jars[3], ana}`, with migration from v2.
- Overlay prefs: `ecojar.ov`.
- Language: `ecojar.lang`.
- New per-jar state must be added to `SNAP_KEYS` in `ui.js`.

## Conventions
- Keep it a single page: there is no npm runtime dependency.
- External scripts come only from cdnjs, and stylesheets only from Google Fonts.
- Colours are CSS tokens on `:root`, with light and dark themes. Layout must work at phone width.
- Real-tank jars (`S.real`): never auto-delete or auto-change anything; give suggestions only.
- After changes, check that every preset except 「失衡示範」 survives about 6 simulated days.
