import type { QualityTier } from '../state/store';

export interface Capabilities {
  mode: 'webgl' | 'fallback';
  tier: QualityTier;
}

/**
 * Boot-time capability gate. Strict WebGL2 probe with
 * failIfMajorPerformanceCaveat catches software rasterizers (SwiftShader) —
 * those get the static record, not a slideshow.
 */
export function detectCapabilities(): Capabilities {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!gl) return { mode: 'fallback', tier: 'low' };
    gl.getExtension('WEBGL_lose_context')?.loseContext();

    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    if (coarse && mem !== undefined && mem <= 2) return { mode: 'fallback', tier: 'low' };

    return { mode: 'webgl', tier: coarse ? 'mid' : 'high' };
  } catch {
    return { mode: 'fallback', tier: 'low' };
  }
}

/** Set once by the first rendered frame — part of the boot gate. */
export const bootFlags = { firstFrame: false };
