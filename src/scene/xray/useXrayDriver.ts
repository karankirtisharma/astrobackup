import { useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { setLensPointer, setScan, updateLensFrame } from './lensUniforms';
import { fxProxy } from '../../motion/proxies';
import { STAND_Y } from '../../config/cameraPoses';
import { DEBUG_FLAGS } from '../../debugFlags';

/** The sweep's travel, in world Y. Both figures normalize to height 1.8 with
 *  soles at STAND_Y, so ONE pair of world points drives the line on both — and
 *  because a perspective projection's screen Y is independent of world X, a
 *  probe on the centre line lands at the same height as one on either figure.
 *  Small margins so the line starts clear of the crown and finishes clear of
 *  the soles rather than stopping mid-skull or mid-boot. */
const SCAN_TOP_Y = STAND_Y.cypherpunk + 1.95;
const SCAN_BOTTOM_Y = STAND_Y.cypherpunk - 0.12;

/**
 * Drives the shared lens each frame: tracks the pointer in canvas-CSS pixels,
 * then advances the eased center + radius against the renderer's real pixel
 * ratio so gl_FragCoord math stays exact across DPR and quality tiers.
 *
 * One instance only (the cypherpunk character mounts it).
 */
export function useXrayDriver() {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      setLensPointer(e.clientX - rect.left, e.clientY - rect.top);
    };
    // On window, not the canvas: the DOM HUD sits above the canvas and would
    // otherwise swallow the moves.
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [gl]);

  // Reused across frames — projecting allocates nothing this way.
  const probe = useMemo(() => new Vector3(), []);

  useFrame((state, dt) => {
    const ratio = gl.getPixelRatio();
    updateLensFrame(
      Math.min(dt, 0.05),
      state.size.width,
      state.size.height,
      ratio,
      DEBUG_FLAGS.xray === 'full'
    );

    // ——— merge sweep ———
    // Projected fresh every frame on purpose: the camera dollies hard through
    // the ceremony, so a line computed once would slide off the bodies as the
    // shot moves. Costs two project() calls, and only while sweeping.
    const p = fxProxy.uScan;
    if (p <= 0.0001) {
      setScan(false, 0);
      return;
    }
    const worldY = SCAN_TOP_Y + (SCAN_BOTTOM_Y - SCAN_TOP_Y) * Math.min(p, 1);
    probe.set(0, worldY, 0).project(state.camera);
    // NDC (-1 bottom .. 1 top) → framebuffer pixels, which share that origin,
    // so this needs no vertical flip — unlike the CSS-space lens centre above.
    const y = ((probe.y + 1) / 2) * state.size.height * ratio;
    setScan(true, y);
  });
}

/** Component wrapper so the driver hook is mounted conditionally (once), not
 *  called behind a runtime branch. Renders nothing. */
export function XrayDriver() {
  useXrayDriver();
  return null;
}
