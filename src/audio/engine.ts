/**
 * CYPHERNAUT audio engine — every sound is SYNTHESIZED, nothing is loaded.
 *
 * Why no files: this palette is filtered clicks, sub drones, risers and noise
 * sweeps. Those ARE oscillators and shaped noise; a recorded sample of one is
 * a worse, heavier copy of what the browser can generate exactly. So:
 *   - 0 bytes of audio in the bundle, 0 network requests, 0 decode cost
 *   - nothing to license, nothing that can 404 on a subpath deploy
 *   - every cue can be detuned per trigger, so repeats never sound identical
 *     (the usual reason UI hover sound becomes unbearable)
 *
 * The AudioContext is created LAZILY on the first real user gesture. Browsers
 * refuse to start audio before one, and constructing it earlier just yields a
 * suspended context that silently swallows the opening cues.
 */

const STORAGE_KEY = 'cy-sound';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let ambienceStop: (() => void) | null = null;
let unlocked = false;

/** User preference. Persisted, so a visitor who mutes stays muted. */
let enabled = ((): boolean => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === 'on';
  } catch {
    return true;
  }
})();

const listeners = new Set<(on: boolean) => void>();

export function isSoundOn(): boolean {
  return enabled;
}

export function onSoundChange(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setSoundOn(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    /* private mode — preference just won't persist */
  }
  if (master && ctx) {
    // Ramped, never stepped: an instant gain change on a running drone is an
    // audible click.
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.05);
  }
  if (on) startAmbience();
  listeners.forEach((fn) => fn(on));
}

/** The three buses. sfx sits above music so cues cut through the bed. */
function build(): void {
  if (ctx) return;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = enabled ? 1 : 0;
  master.connect(ctx.destination);

  musicBus = ctx.createGain();
  musicBus.gain.value = 0; // faded in by startAmbience
  musicBus.connect(master);

  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(master);
}

export function audio(): AudioContext | null {
  return ctx;
}

export function sfxOut(): GainNode | null {
  return sfxBus;
}

/**
 * Call from a real user gesture. Safe to call repeatedly.
 * Also re-resumes: iOS suspends the context when the tab backgrounds, and a
 * context that is never resumed produces silence with no error anywhere.
 */
export function unlockAudio(): void {
  build();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  if (!unlocked) {
    unlocked = true;
    if (enabled) startAmbience();
  }
}

export function isUnlocked(): boolean {
  return unlocked;
}

/* ────────────────────────────────────────────────────────────
   Ambience — the room the whole site sits in.

   A near-black void lit by one green source: a slow sub drone, a fifth above
   it slightly detuned so the two beat against each other, and a whisper of
   band-passed noise that drifts. No melody, no rhythm — the moment ambience
   has a pulse it becomes music the visitor has to tolerate.
   ──────────────────────────────────────────────────────────── */

function startAmbience(): void {
  build();
  if (!ctx || !musicBus || ambienceStop || !unlocked) return;
  const c = ctx;

  const bed = c.createGain();
  bed.gain.value = 1;
  bed.connect(musicBus);

  // Sub + detuned fifth.
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 320;
  lp.Q.value = 0.6;
  lp.connect(bed);

  const oscA = c.createOscillator();
  oscA.type = 'sine';
  oscA.frequency.value = 47; // low G-ish; felt more than heard
  const gA = c.createGain();
  gA.gain.value = 0.5;
  oscA.connect(gA).connect(lp);

  const oscB = c.createOscillator();
  oscB.type = 'triangle';
  oscB.frequency.value = 70.6; // ~fifth, deliberately not exact
  const gB = c.createGain();
  gB.gain.value = 0.18;
  oscB.connect(gB).connect(lp);

  // Air: looping noise through a wandering band-pass.
  const noise = c.createBufferSource();
  noise.buffer = noiseBuffer(c, 4);
  noise.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 620;
  bp.Q.value = 0.8;
  const nG = c.createGain();
  nG.gain.value = 0.055;
  noise.connect(bp).connect(nG).connect(bed);

  // Two slow LFOs, deliberately non-harmonic periods so the bed never
  // repeats audibly.
  const lfo1 = c.createOscillator();
  lfo1.frequency.value = 0.037;
  const lfo1G = c.createGain();
  lfo1G.gain.value = 260;
  lfo1.connect(lfo1G).connect(bp.frequency);

  const lfo2 = c.createOscillator();
  lfo2.frequency.value = 0.011;
  const lfo2G = c.createGain();
  lfo2G.gain.value = 0.02;
  lfo2.connect(lfo2G).connect(nG.gain);

  [oscA, oscB, lfo1, lfo2].forEach((o) => o.start());
  noise.start();

  // Long fade-in: ambience should arrive without anyone noticing it did.
  musicBus.gain.cancelScheduledValues(c.currentTime);
  musicBus.gain.setValueAtTime(musicBus.gain.value, c.currentTime);
  musicBus.gain.linearRampToValueAtTime(AMBIENCE_GAIN, c.currentTime + 6);

  ambienceStop = () => {
    [oscA, oscB, lfo1, lfo2].forEach((o) => {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    });
    try {
      noise.stop();
    } catch {
      /* already stopped */
    }
    bed.disconnect();
  };
}

/** Resting level of the bed. Low on purpose — it is a floor, not a track. */
const AMBIENCE_GAIN = 0.16;

/**
 * Duck the bed under an important cue, then let it back up. Without this the
 * drone and a big cue fight for the same low end and the cue loses.
 */
export function duckAmbience(amount = 0.45, hold = 0.6): void {
  if (!ctx || !musicBus) return;
  const c = ctx;
  const g = musicBus.gain;
  g.cancelScheduledValues(c.currentTime);
  g.setValueAtTime(g.value, c.currentTime);
  g.linearRampToValueAtTime(AMBIENCE_GAIN * (1 - amount), c.currentTime + 0.08);
  g.linearRampToValueAtTime(AMBIENCE_GAIN, c.currentTime + 0.08 + hold);
}

/** White noise, generated once per length and reused by every cue that needs it. */
const noiseCache = new Map<number, AudioBuffer>();
export function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const cached = noiseCache.get(seconds);
  if (cached) return cached;
  const len = Math.max(1, Math.floor(c.sampleRate * seconds));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseCache.set(seconds, buf);
  return buf;
}

/** Release everything (HMR / unmount). */
export function disposeAudio(): void {
  ambienceStop?.();
  ambienceStop = null;
  void ctx?.close();
  ctx = null;
  master = null;
  musicBus = null;
  sfxBus = null;
  unlocked = false;
}
