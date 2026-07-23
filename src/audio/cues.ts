import { audio, duckAmbience, isSoundOn, isUnlocked, noiseBuffer, sfxOut } from './engine';

/**
 * The cue library. Each entry is a small synth recipe rather than a sample.
 *
 * House rules, applied here rather than at every call site:
 *  - every cue detunes itself slightly per fire, so a repeated hover never
 *    plays the identical sound twice (the thing that makes UI audio grating);
 *  - cues are rate-limited per name, so a pointer sweeping a nav can't machine-gun;
 *  - nothing plays before the context is unlocked or while muted.
 */

/** Last fire time per cue name, for rate limiting. */
const lastFired = new Map<string, number>();

function gate(name: string, minGapMs: number): AudioContext | null {
  if (!isSoundOn() || !isUnlocked()) return null;
  const c = audio();
  if (!c || !sfxOut()) return null;
  const now = c.currentTime * 1000;
  const prev = lastFired.get(name) ?? -1e9;
  if (now - prev < minGapMs) return null;
  lastFired.set(name, now);
  return c;
}

/** Random detune factor around 1.0 — the anti-repetition trick. */
const vary = (amount = 0.06) => 1 + (Math.random() * 2 - 1) * amount;

interface ToneOpts {
  freq: number;
  /** Sweep to this frequency across the duration. */
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  /** Attack time; the rest of dur is the decay. */
  attack?: number;
  /** Optional low-pass, in Hz. */
  lp?: number;
  delay?: number;
}

function tone(c: AudioContext, o: ToneOpts): void {
  const out = sfxOut();
  if (!out) return;
  const t = c.currentTime + (o.delay ?? 0);
  const osc = c.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(o.to, 1), t + o.dur);

  const g = c.createGain();
  const peak = o.gain ?? 0.2;
  const atk = o.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + atk);
  // Exponential decay to near-silence, never to 0 (exponentialRamp cannot
  // reach zero and will throw or click if asked to).
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);

  let node: AudioNode = g;
  if (o.lp) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lp;
    g.connect(f);
    node = f;
  }
  osc.connect(g);
  node.connect(out);
  osc.start(t);
  osc.stop(t + o.dur + 0.05);
}

interface NoiseOpts {
  dur: number;
  gain?: number;
  /** Band-pass centre; sweeps f0 → f1 if f1 given. */
  f0: number;
  f1?: number;
  q?: number;
  delay?: number;
  type?: BiquadFilterType;
}

function noise(c: AudioContext, o: NoiseOpts): void {
  const out = sfxOut();
  if (!out) return;
  const t = c.currentTime + (o.delay ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 1);
  src.loop = true;

  const f = c.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.setValueAtTime(o.f0, t);
  if (o.f1 !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(o.f1, 1), t + o.dur);
  f.Q.value = o.q ?? 1.2;

  const g = c.createGain();
  const peak = o.gain ?? 0.12;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.02, o.dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);

  src.connect(f).connect(g).connect(out);
  src.start(t);
  src.stop(t + o.dur + 0.05);
}

/* ── The cues ────────────────────────────────────────────────── */

export const cue = {
  /** Boot log line lands. Tiny, dry, mechanical. */
  bootTick() {
    const c = gate('bootTick', 40);
    if (!c) return;
    tone(c, { freq: 2100 * vary(0.1), dur: 0.035, type: 'square', gain: 0.035, lp: 3200 });
  },

  /** ACCESS GRANTED. A clean two-note confirm, not a fanfare. */
  accessGranted() {
    const c = gate('accessGranted', 500);
    if (!c) return;
    duckAmbience(0.3, 0.5);
    tone(c, { freq: 520, dur: 0.16, type: 'sine', gain: 0.14 });
    tone(c, { freq: 780, dur: 0.4, type: 'sine', gain: 0.12, delay: 0.09 });
    noise(c, { dur: 0.5, f0: 1800, f1: 400, gain: 0.04, delay: 0.05 });
  },

  /** Pointer crosses something interactive. Must be nearly subliminal. */
  hover() {
    // 70ms floor: below that a fast sweep across a nav becomes a rattle.
    const c = gate('hover', 70);
    if (!c) return;
    tone(c, { freq: 1650 * vary(0.14), dur: 0.045, type: 'triangle', gain: 0.045, lp: 4000 });
  },

  /** Generic commit. A shade lower and shorter than hover, so it reads as an answer. */
  click() {
    const c = gate('click', 50);
    if (!c) return;
    tone(c, { freq: 880 * vary(0.08), to: 520, dur: 0.075, type: 'triangle', gain: 0.1 });
    noise(c, { dur: 0.05, f0: 2600, gain: 0.05, q: 0.8 });
  },

  /** Hovering a CHARACTER — the x-ray lens opening. Airy, scanner-ish. */
  scanOpen() {
    const c = gate('scanOpen', 260);
    if (!c) return;
    noise(c, { dur: 0.34, f0: 700, f1: 2600, gain: 0.05, q: 2.4 });
    tone(c, { freq: 1200 * vary(0.05), dur: 0.2, type: 'sine', gain: 0.035 });
  },

  /** Dossier panel arrives. A soft pressurized swell. */
  panelOpen() {
    const c = gate('panelOpen', 180);
    if (!c) return;
    duckAmbience(0.28, 0.4);
    noise(c, { dur: 0.5, f0: 300, f1: 1500, gain: 0.075, q: 1.1 });
    tone(c, { freq: 220, to: 440, dur: 0.42, type: 'sine', gain: 0.09 });
  },

  /** Panel leaves. The swell reversed and shortened — exits are quicker. */
  panelClose() {
    const c = gate('panelClose', 180);
    if (!c) return;
    noise(c, { dur: 0.26, f0: 1400, f1: 260, gain: 0.055, q: 1.1 });
    tone(c, { freq: 420, to: 190, dur: 0.22, type: 'sine', gain: 0.07 });
  },

  menuOpen() {
    const c = gate('menuOpen', 180);
    if (!c) return;
    noise(c, { dur: 0.42, f0: 420, f1: 2100, gain: 0.07, q: 1.4 });
    tone(c, { freq: 300, to: 600, dur: 0.3, type: 'triangle', gain: 0.06 });
  },

  menuClose() {
    const c = gate('menuClose', 180);
    if (!c) return;
    noise(c, { dur: 0.24, f0: 1900, f1: 380, gain: 0.055, q: 1.4 });
  },

  /** INITIATE PROTOCOL. The single biggest moment on the site. */
  initiate() {
    const c = gate('initiate', 900);
    if (!c) return;
    duckAmbience(0.65, 1.4);
    // Sub impact.
    tone(c, { freq: 150, to: 38, dur: 1.1, type: 'sine', gain: 0.42, attack: 0.006 });
    // The strike itself.
    noise(c, { dur: 0.5, f0: 3000, f1: 180, gain: 0.16, q: 0.7 });
    // And a riser that hands over to the ceremony.
    noise(c, { dur: 1.7, f0: 260, f1: 3600, gain: 0.075, q: 2.6, delay: 0.18 });
    tone(c, { freq: 110, to: 440, dur: 1.6, type: 'triangle', gain: 0.06, delay: 0.2, lp: 1800 });
  },

  /** The head-to-toe merge sweep. Long, moving, unmistakably a scanner. */
  scanSweep(duration = 3.2) {
    const c = gate('scanSweep', 1200);
    if (!c) return;
    duckAmbience(0.35, duration);
    noise(c, { dur: duration, f0: 4200, f1: 320, gain: 0.06, q: 3.4 });
    tone(c, { freq: 900, to: 200, dur: duration, type: 'sine', gain: 0.035, lp: 2200 });
  },

  /** 25 / 50 / 75%. A quiet mechanical notch, not a chime. */
  milestone() {
    const c = gate('milestone', 400);
    if (!c) return;
    tone(c, { freq: 1400 * vary(0.05), dur: 0.06, type: 'square', gain: 0.045, lp: 2600 });
  },

  /** PROTOCOL COMPLETE. Resolves — the only cue allowed to feel like an arrival. */
  complete() {
    const c = gate('complete', 1500);
    if (!c) return;
    duckAmbience(0.5, 2.2);
    tone(c, { freq: 196, dur: 1.9, type: 'sine', gain: 0.16 });
    tone(c, { freq: 294, dur: 1.7, type: 'sine', gain: 0.11, delay: 0.07 });
    tone(c, { freq: 392, dur: 1.5, type: 'sine', gain: 0.09, delay: 0.14 });
    tone(c, { freq: 588, dur: 1.3, type: 'sine', gain: 0.05, delay: 0.22 });
    noise(c, { dur: 1.8, f0: 900, f1: 5200, gain: 0.03, q: 0.9, delay: 0.1 });
  },

  /** Aborted. Falls, and deliberately does not resolve. */
  cancel() {
    const c = gate('cancel', 700);
    if (!c) return;
    duckAmbience(0.4, 0.8);
    tone(c, { freq: 320, to: 70, dur: 0.75, type: 'triangle', gain: 0.14, lp: 1200 });
    noise(c, { dur: 0.5, f0: 1400, f1: 200, gain: 0.05, q: 1.0 });
  },

  /** Manifesto reached — the page opening up. */
  unlock() {
    const c = gate('unlock', 900);
    if (!c) return;
    noise(c, { dur: 0.9, f0: 200, f1: 1800, gain: 0.05, q: 1.6 });
    tone(c, { freq: 261, dur: 0.8, type: 'sine', gain: 0.07 });
  },
};

export type CueName = keyof typeof cue;
