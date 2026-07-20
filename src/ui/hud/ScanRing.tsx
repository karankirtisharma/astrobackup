import { useStore } from '../../state/store';

/**
 * The aperture. The cut itself happens in the shader; this is the
 * instrument's rim drawn over it — crisp, in CSS pixels, reading the same
 * --scan-* variables the lens publishes each frame, so the two can never
 * drift apart.
 */
export function ScanRing() {
  const scene = useStore((s) => s.scene);
  const reduced = useStore((s) => s.reducedMotion);
  if (scene !== 'hoverCypherpunk' || reduced) return null;

  return (
    <div className="cy-scan" aria-hidden="true">
      <span className="cy-scan__ring" />
      <span className="cy-scan__label">ANATOMY // SCAN</span>
    </div>
  );
}
