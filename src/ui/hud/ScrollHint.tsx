import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useStore } from '../../state/store';
import type { SceneState } from '../../state/transitions';
import { md } from '../../motion/motionConfig';

function hintFor(scene: SceneState): string | null {
  switch (scene) {
    case 'idle':
    case 'hoverCypherpunk':
    case 'hoverAstronaut':
      return 'SCROLL TO EXPLORE';
    case 'hoverProtocol':
      return 'CLICK TO INITIATE';
    default:
      return null; // panels + protocol states carry their own guidance
  }
}

export function ScrollHint() {
  const scene = useStore((s) => s.scene);
  const root = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const shown = useRef<string | null>('SCROLL TO EXPLORE');

  // The label node is rendered empty and only ever written imperatively —
  // sharing a text node with React is how removeChild crashes happen.
  useEffect(() => {
    if (label.current && !label.current.textContent) {
      label.current.textContent = shown.current ?? '';
    }
  }, []);

  useGSAP(
    () => {
      const next = hintFor(scene);
      if (next === shown.current) return;

      if (next === null) {
        gsap.to(root.current, { autoAlpha: 0, duration: md(0.3), ease: 'power2.in', overwrite: 'auto' });
        shown.current = null;
        return;
      }

      const swap = () => {
        if (label.current) label.current.textContent = next;
      };

      if (shown.current === null) {
        swap();
        gsap.to(root.current, { autoAlpha: 1, duration: md(0.4), ease: 'power2.out', overwrite: 'auto' });
      } else {
        gsap.to(label.current, {
          opacity: 0,
          letterSpacing: '0.32em',
          duration: md(0.22),
          ease: 'power2.in',
          overwrite: 'auto',
          onComplete: () => {
            swap();
            gsap.to(label.current, {
              opacity: 1,
              letterSpacing: '0.22em',
              duration: md(0.3),
              ease: 'expo.out',
            });
          },
        });
      }
      shown.current = next;
    },
    { dependencies: [scene], scope: root }
  );

  return (
    <div className="cy-hint" ref={root} aria-hidden="true">
      <svg className="cy-hint__mouse" width="16" height="24" viewBox="0 0 16 24" fill="none">
        <rect x="1" y="1" width="14" height="22" rx="7" stroke="currentColor" strokeWidth="1" />
        <rect className="cy-hint__wheel" x="7" y="5" width="2" height="5" rx="1" fill="currentColor" />
      </svg>
      <div className="cy-hint__label" ref={label} />
    </div>
  );
}
