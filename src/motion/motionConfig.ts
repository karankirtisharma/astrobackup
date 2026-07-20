/**
 * The motion vocabulary — one tunable table.
 * Every duration/ease in the experience routes through md()/me() so the
 * prefers-reduced-motion variant is a single code path, not a parallel build.
 */
import { useStore } from '../state/store';

export const EASE = {
  camera: 'power2.inOut',
  drift: 'power2.out',
  uiIn: 'expo.out',
  uiOut: 'power2.in',
  panelCam: 'power3.inOut',
} as const;

export const DUR = {
  hover: 0.7,
  hoverRelease: 0.6,
  labelStagger: 0.07,
  typeCharSec: 0.018,
  panelOpen: 2.5,
  /** Panel dismissal. A wind-down, not a reversed build — see DossierPanel. */
  panelExit: 0.2,
} as const;

/** Deliberate stillness after the protocol click, before anything responds. */
export const PROTOCOL_SILENCE = 0.3;

const reduced = () => useStore.getState().reducedMotion;

/** Motion-duration: collapses under reduced motion. */
export const md = (full: number): number => (reduced() ? Math.min(full * 0.3, 0.25) : full);

/** Motion-ease. */
export const me = (ease: string): string => (reduced() ? 'power1.out' : ease);

/** Sync runs shorter and linear under reduced motion — the wait is content,
 *  but nobody should be held hostage by it. */
export const syncDuration = (full: number): number => (reduced() ? 6 : full);
export const syncEase = (full: string): string => (reduced() ? 'none' : full);
