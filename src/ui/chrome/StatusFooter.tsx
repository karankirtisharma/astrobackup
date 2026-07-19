import { useEffect, useRef } from 'react';
import { useStore } from '../../state/store';
import type { SceneState } from '../../state/transitions';

const SEGMENTS = 24;

function footerLines(scene: SceneState): Array<[string, string, boolean]> {
  switch (scene) {
    case 'hoverCypherpunk':
    case 'cypherpunkPanel':
      return [
        ['IDENTITY MATCH:', 'CONFIRMED', true],
        ['PROTOCOL:', 'STANDBY', false],
      ];
    case 'hoverAstronaut':
    case 'astronautPanel':
      return [
        ['IDENTITY MATCH:', 'PENDING', false],
        ['PROTOCOL:', 'STANDBY', false],
      ];
    case 'protocolInitiated':
    case 'synchronization':
      return [
        ['CHANNEL STATUS:', 'SECURE', true],
        ['PROTOCOL:', 'ACTIVE', true],
      ];
    case 'protocolComplete':
    case 'scrollStory':
      return [
        ['CHANNEL STATUS:', 'SECURE', true],
        ['PROTOCOL:', 'COMPLETE', true],
      ];
    default:
      return [
        ['CHANNEL STATUS:', 'SECURE', true],
        ['PROTOCOL:', 'STANDBY', false],
      ];
  }
}

function baseFill(scene: SceneState): number {
  if (scene === 'protocolComplete' || scene === 'scrollStory') return 1;
  if (scene === 'cypherpunkPanel' || scene === 'astronautPanel') return 0.42;
  if (scene === 'hoverCypherpunk' || scene === 'hoverAstronaut' || scene === 'hoverProtocol')
    return 0.25;
  return 0.14;
}

/**
 * Bottom status chrome: left status lines, right "CORE DECLARATION v2.4" with
 * a segmented progress strip. Segments fill stepped, never smooth — and track
 * the live sync clock during the protocol.
 */
export function StatusFooter() {
  const scene = useStore((s) => s.scene);
  const segsRef = useRef<HTMLDivElement>(null);

  // Segment fill: transient subscription, integer-stepped writes only.
  useEffect(() => {
    const apply = (fill: number) => {
      const el = segsRef.current;
      if (!el) return;
      const on = Math.round(fill * SEGMENTS);
      el.querySelectorAll('i').forEach((seg, i) => {
        seg.classList.toggle('on', i < on);
      });
    };
    apply(baseFill(useStore.getState().scene));

    const unsubScene = useStore.subscribe(
      (s) => s.scene,
      (sc) => {
        if (sc !== 'synchronization' && sc !== 'protocolInitiated') apply(baseFill(sc));
      }
    );
    const unsubSync = useStore.subscribe(
      (s) => s.syncMaster,
      (m) => {
        const sc = useStore.getState().scene;
        if (sc === 'synchronization' || sc === 'protocolInitiated') apply(m);
      }
    );
    return () => {
      unsubScene();
      unsubSync();
    };
  }, []);

  const lines = footerLines(scene);

  return (
    <div className="cy-footer" aria-hidden="true">
      <div className="cy-footer__left">
        {lines.map(([label, value, green]) => (
          <div key={label}>
            {label} <span className={green ? 'v' : 'v v--dim'}>{value}</span>
          </div>
        ))}
      </div>
      <div className="cy-footer__right">
        <div>CORE DECLARATION v2.4</div>
        <div className="cy-seg" ref={segsRef}>
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <i key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
