import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useStore } from '../../state/store';
import { md } from '../../motion/motionConfig';

/**
 * Edge telemetry columns shown while the protocol button holds attention —
 * both characters report ready.
 */
export function HudStats() {
  const scene = useStore((s) => s.scene);
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const visible = scene === 'hoverProtocol';

  useGSAP(
    () => {
      for (const [el, dir] of [
        [left.current, -1],
        [right.current, 1],
      ] as const) {
        if (!el) continue;
        const rows = el.querySelectorAll('.stat');
        if (visible) {
          gsap.set(el, { autoAlpha: 1 });
          gsap.fromTo(
            rows,
            { opacity: 0, x: 24 * dir },
            {
              opacity: 1,
              x: 0,
              duration: md(0.5),
              ease: 'expo.out',
              stagger: 0.08,
              delay: md(0.15),
              overwrite: 'auto',
            }
          );
          gsap.fromTo(
            el.querySelectorAll('.stat-bar i'),
            { scaleX: 0 },
            { scaleX: 1, duration: md(0.9), ease: 'power2.out', delay: md(0.35), overwrite: 'auto' }
          );
        } else {
          gsap.to(rows, { opacity: 0, x: 12 * dir, duration: md(0.3), ease: 'power2.in', overwrite: 'auto' });
          gsap.to(el, { autoAlpha: 0, duration: md(0.35), delay: md(0.15), overwrite: 'auto' });
        }
      }
    },
    { dependencies: [visible] }
  );

  const column = (side: 'left' | 'right') => (
    <div
      ref={side === 'left' ? left : right}
      className={`cy-sidestats cy-sidestats--${side}`}
      style={{ opacity: 0, visibility: 'hidden' }}
      aria-hidden="true"
    >
      <div className="stat">
        <div className="stat-label">STATUS</div>
        <div className="stat-value green">ONLINE</div>
      </div>
      <div className="stat">
        <div className="stat-label">CONNECTION</div>
        <div className="stat-value green">SECURE</div>
      </div>
      <div className="stat">
        <div className="stat-label">SIGNAL STRENGTH</div>
        <div className="stat-value num">{side === 'left' ? '98%' : '97%'}</div>
        <div className="stat-bar">
          <i style={{ transform: `scaleX(${side === 'left' ? 0.98 : 0.97})` }} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {column('left')}
      {column('right')}
    </>
  );
}
