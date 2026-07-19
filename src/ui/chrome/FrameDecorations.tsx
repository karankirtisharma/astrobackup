import { useEffect, useRef } from 'react';
import { useStore } from '../../state/store';

/** Registration ticks at fixed percentage coordinates. */
const TICKS: Array<[number, number]> = [
  [6, 43], [14, 26], [35, 47], [50, 22], [65, 47], [86, 26], [94, 43],
  [24, 74], [76, 74],
];

/**
 * Environmental HUD: corner brackets, "+" registration ticks, and vertical
 * micro-text strips. Entirely decorative, aria-hidden. On every state change
 * exactly two ticks flash green for 150ms — never ambient.
 */
export function FrameDecorations() {
  const root = useRef<HTMLDivElement>(null);
  const flashIndex = useRef(0);

  useEffect(
    () =>
      useStore.subscribe(
        (s) => s.scene,
        () => {
          const el = root.current;
          if (!el || useStore.getState().reducedMotion) return;
          const ticks = el.querySelectorAll<HTMLElement>('.cy-frame__tick');
          if (!ticks.length) return;
          const a = ticks[flashIndex.current % ticks.length];
          const b = ticks[(flashIndex.current + 3) % ticks.length];
          flashIndex.current += 1;
          for (const t of [a, b]) {
            t.classList.add('is-flash');
            setTimeout(() => t.classList.remove('is-flash'), 150);
          }
        }
      ),
    []
  );

  return (
    <div className="cy-frame" ref={root} aria-hidden="true">
      <i className="cy-frame__corner cy-frame__corner--tl" />
      <i className="cy-frame__corner cy-frame__corner--tr" />
      <i className="cy-frame__corner cy-frame__corner--bl" />
      <i className="cy-frame__corner cy-frame__corner--br" />
      {TICKS.map(([x, y], i) => (
        <span key={i} className="cy-frame__tick" style={{ left: `${x}%`, top: `${y}%` }}>
          +
        </span>
      ))}
      <span className="cy-frame__vtext cy-frame__vtext--left">
        CYPH-OS v2.4 // SECURE RENDER PATH // 23:17:08Z
      </span>
      <span className="cy-frame__vtext cy-frame__vtext--right">
        SYS-SIG // IC-Ø-Δ-197 // SEGMENT 09 · ID—018
      </span>
    </div>
  );
}
