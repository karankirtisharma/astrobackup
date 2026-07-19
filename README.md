# CYPHERNAUT // MANIFESTO

A single-scene interactive experience: two archetypes — the Cypherpunk and the
Astronaut — synchronize into one identity when the visitor initiates the
protocol. Built as a strict event-driven state machine: nothing progresses
without user intent, and nothing ever snaps.

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (or PORT env)
npm run build      # production build → dist/
```

## Asset pipeline

Source GLBs (Tripo AI, ~57MB / ~2M triangles each, unrigged) live in
`assets-src/` and are never served. The optimizer strips the transmission
extension, simplifies to ~260k tris, normalizes both characters to 1.8 units
with feet at y=0, compresses textures to WebP and geometry with meshopt:

```bash
npm run optimize:models   # assets-src/*.glb → public/models/*.glb (~2-3.3MB)
```

## Architecture

- `src/state/` — the 10-state FSM (`transitions.ts` is the single authority),
  zustand store, seeded synchronization simulation.
- `src/motion/` — persistent proxy objects (the "nothing snaps" guarantee:
  GSAP only ever tweens long-lived proxies, one `useFrame` per subsystem
  composes them), the conductor that translates state changes into timelines.
- `src/scene/` — R3F scene: camera rig, six-light rig, reflective stage,
  procedural idle for the unrigged characters, energy-bridge particle shader,
  post-processing. Raycasting hits invisible capsules on layer 1 only.
- `src/ui/` — DOM overlay: nav, HUD, classified dossier panels (one master
  GSAP timeline built from `data-anim` attributes; close is literally
  `timeline.reverse()`), the protocol/sync overlay, boot loader.
  Contract: any node written imperatively is rendered EMPTY by React.
- `src/scroll/` — the post-completion manifesto (page unlocks only after
  `PROTOCOL COMPLETE`).

## QA flags (query string)

| Flag | Effect |
|---|---|
| `?tier=low\|mid\|high` | Force quality tier (reflector/shadows/DPR/particles) |
| `?nofx=1` | Disable post-processing |
| `?noreflect=1` | Disable floor reflections |
| `?motion=full\|reduced` | Override `prefers-reduced-motion` |

Degradation ladder: high → mid → low on performance decline or context loss;
static-record fallback (`Fallback.tsx`) on missing WebGL2, a dead render
loop, or repeated context death. The manifesto's content always survives.
