/**
 * Deterministic synchronization simulation.
 * All randomness is consumed ONCE at module init from a seeded PRNG — the
 * sequence is identical on every run, monotonic per task, and every task
 * converges to exactly 100% together with the master clock.
 */

export const SYNC_DURATION = 12.4; // storyboard: "ESTIMATED TIME 12.4 SECS"

export const SYNC_TASKS = [
  'CONNECTING NEURAL PATHWAYS',
  'SHARING CORE BELIEFS',
  'ALIGNING MISSION PARAMETERS',
  'SYNCHRONIZING TIMELINE',
  'ESTABLISHING CYPHERNAUT IDENTITY',
] as const;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(0xc0ffee);

interface TaskProfile {
  /** Pace personality: <1 leads the master, >1 lags it. */
  exp: number;
  /** Where a believable plateau sits along the master clock. */
  stallAt: number;
  stallWidth: number;
}

const PROFILES: TaskProfile[] = SYNC_TASKS.map(() => ({
  exp: 0.75 + rng() * 0.7,
  stallAt: 0.3 + rng() * 0.35,
  stallWidth: 0.05 + rng() * 0.07,
}));

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Per-task progress for master progress m (0..1).
 * Monotonic (personality warps pace, never value), converging: the final
 * blend term pulls every task to m as m → 1, so all bars land together.
 */
export function computeTasks(m: number): number[] {
  return PROFILES.map(({ exp, stallAt, stallWidth }) => {
    let v = Math.pow(m, exp);
    const s = smoothstep(stallAt, stallAt + stallWidth, m);
    v = v * (0.85 + 0.15 * s);
    return Math.min(1, v + (m - v) * (m * m));
  });
}
