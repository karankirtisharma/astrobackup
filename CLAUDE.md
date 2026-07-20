# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev        # vite dev server → http://localhost:5173 (override with PORT)
npm run build      # tsc -b && vite build → dist/
npm run preview    # serve the production build
npm run optimize:models   # assets-src/*.glb → public/models/*.glb
```

There is no test runner, linter, or formatter configured. `tsc -b` (via `npm run build`) is the only static check.

`optimize:models` reads `assets-src/`, which is gitignored and absent from a fresh clone. It only runs if you supply the ~57MB source GLBs; the optimized outputs in `public/models/` are committed, so a normal checkout never needs it.

`base` in `vite.config.ts` comes from `DEPLOY_BASE` (GitHub Pages serves under `/<repo>/`).

## Architecture

A single-page WebGL experience: two characters synchronize into one identity when the visitor initiates the protocol. Four layers, each with a strict contract.

### 1. State — a finite state machine, not ad-hoc flags

`src/state/transitions.ts` is the **single authority** on what can happen next. `resolve(scene, phase, event)` is a pure function returning the next `{scene, phase}` or `null`. Illegal events are silently dropped, deliberately — the world does not respond to intents it has not offered.

- 10 `SceneState`s; each has a `Phase` (`entering | active | exiting`) driving two-step close/cancel.
- `src/state/store.ts` is a thin zustand wrapper — `send()` delegates every decision to `resolve()` and gates all events until `booted`.
- Events come from two places: user input, and the conductor's timeline `.call()` callbacks (`SYNC_STARTED`, `SYNC_COMPLETE`, `SETTLE_COMPLETE`, `CANCEL_FINISHED`).

**Add new behavior by adding a state/event to `transitions.ts` first.** Do not branch on scene state inside components to sneak in transitions.

### 2. Motion — persistent proxies ("nothing ever snaps")

`src/motion/proxies.ts` holds long-lived singletons (`cameraProxy`, `characterProxy`, `lightProxy`, `fxProxy`, `syncProxy`). The invariant:

> **GSAP only ever tweens proxies. One `useFrame` per subsystem composes a proxy into the scene (single-writer rule).**

Because a new tween starts from the proxy's *current* value, any interruption — hover-out mid-hover-in, cancel mid-sync — bends the trajectory instead of snapping. Never tween an Object3D directly, and never write the same proxy field from two `useFrame`s.

`src/motion/conductor.ts` subscribes to the store and translates each transition into tweens. Its interruption policy:
- continuous values use `overwrite: 'auto'`;
- structural sequences own a named slot (`protocol`, `cancel`); a new one kills its predecessor;
- **the 12.4s sync timeline is never reversed** — cancel kills it and builds a fresh compressed wind-down.

`src/motion/motionConfig.ts` routes every duration/ease through `md()` / `me()` so `prefers-reduced-motion` is one code path, not a parallel build. Use them for new motion rather than writing raw numbers.

### 3. Scene — `src/scene/`

R3F canvas: camera rig, six-light rig, reflective stage, procedural idle (the characters are unrigged, so idle motion is synthesized in `useProceduralIdle`), particle-shader energy bridge, post-processing.

- **Raycasting is restricted to layer 1** (`raycaster.layers.set(1)` in `Experience.tsx`). Pointer events hit invisible capsule hitboxes; the 260k-triangle character meshes never enter an intersection test. New interactive objects need a layer-1 hitbox.
- Quality tiers `high | mid | low` gate DPR, floor reflections, shadows, and particle counts. `PerformanceMonitor.onDecline` degrades one step — **never mid-ceremony** (guarded by `protocolRunning()`).
- Context loss: first one drops to `low` and lets it restore; a second gives up to the static record.

### 4. UI — `src/ui/`, DOM overlay above the canvas

**Contract: any node written imperatively is rendered EMPTY by React.** React text plus imperative text in one node causes a `removeChild` crash. High-frequency readouts (sync percentage, ETA, task labels) are store subscriptions writing `textContent`/`transform` directly, so per-frame values never re-render React. The accessible value lives in a visually-hidden sibling; the animated node is `aria-hidden` (see `ui/dossier/primitives.tsx`, `ui/overlay/SyncOverlay.tsx`).

Dossier panels build **one master GSAP timeline** from `data-anim` attributes in DOM order (`ui/dossier/panelTimeline.ts`); supported kinds are `mask | type | count | bar | draw | scanline | fade`. Closing does **not** reverse it: reversing un-staggers dozens of nodes and measured ~2.4s, far too slow for a dismissal. `DossierPanel` kills the build timeline and plays a short wind-down instead (`DUR.panelExit`, ~200ms) — the same policy the conductor applies to `CANCEL_PROTOCOL`. Extend a panel by annotating markup, not by writing a new timeline.

Both dossiers render as card grids (`ui/dossier/BentoBody.tsx`, `AstronautBody.tsx`) sharing chrome from `Card.tsx`. Module artwork goes through `ArtSlot`, which resolves `src/assets/dossier/<name>.*` at **build time** via `import.meta.glob` — a missing file silently renders the SVG fallback in `art.tsx` with no network request. The panels are glass, so art must carry real alpha; `npm run art:extract` generates it by keying luminance to the alpha channel (see that folder's README).

### 5. Scroll — `src/scroll/`

The manifesto below the hero. The page unlocks only after `SETTLE_COMPLETE` sets `scrollUnlocked`.

### Failure path

`Fallback.tsx` renders a static record — never a blank page — on missing WebGL2, a software rasterizer (`failIfMajorPerformanceCaveat`), a dead render loop, or repeated context death. `SceneBoundary` in `App.tsx` routes loader/shader crashes there too. The manifesto's content must always survive; keep it out of canvas-only rendering.

## QA flags (query string)

| Flag | Effect |
|---|---|
| `?tier=low\|mid\|high` | Force quality tier |
| `?nofx=1` | Disable post-processing |
| `?noreflect=1` | Disable floor reflections |
| `?motion=full\|reduced` | Override `prefers-reduced-motion` |

In dev, `window.__scene` and `window.__camera` are exposed.

## Config worth knowing

`src/config/` holds the tuning tables the conductor reads: `cameraPoses.ts` (per-state pose + duration), `lightingPresets.ts` (per-state light values), `content.ts` (all copy). Retuning the experience usually means editing these, not the choreography code.
