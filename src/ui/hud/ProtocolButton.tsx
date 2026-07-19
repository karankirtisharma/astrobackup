import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useStore, send } from '../../state/store';
import { md } from '../../motion/motionConfig';

const HOVERISH = new Set(['hoverCypherpunk', 'hoverAstronaut']);
const PROTOCOL = new Set(['protocolInitiated', 'synchronization', 'protocolComplete', 'scrollStory']);

/**
 * The "+" is a ritual, not a CTA. A real <button> — keyboard operable for
 * free — centered over the in-world energy core. Its pulse ring answers
 * hover states; the whole cluster yields to the sync overlay.
 */
export function ProtocolButton() {
  const scene = useStore((s) => s.scene);
  const root = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const loop = useRef<gsap.core.Tween | null>(null);
  const bob = useRef<gsap.core.Tween | null>(null);

  const { contextSafe } = useGSAP({ scope: root });

  // Ring pulse + levitation per state.
  useGSAP(
    () => {
      loop.current?.kill();
      loop.current = null;
      bob.current?.kill();
      bob.current = null;
      gsap.to(ring.current, { opacity: 0, scale: 1, duration: 0.25, overwrite: 'auto' });

      if (PROTOCOL.has(scene)) {
        gsap.to(root.current, {
          autoAlpha: 0,
          duration: md(0.4),
          ease: 'power2.in',
          overwrite: 'auto',
        });
        gsap.to(btn.current, { y: 0, duration: md(0.4), ease: 'power2.out', overwrite: 'auto' });
        return;
      }
      gsap.to(root.current, { autoAlpha: 1, duration: md(0.5), ease: 'power2.out', overwrite: 'auto' });
      gsap.to(btn.current, { y: 0, duration: md(0.4), ease: 'power2.out', overwrite: 'auto' });

      if (useStore.getState().reducedMotion) return;

      if (HOVERISH.has(scene)) {
        // Faint acknowledgment while a character holds attention.
        loop.current = gsap.fromTo(
          ring.current,
          { opacity: 0.35, scale: 1 },
          { opacity: 0, scale: 1.35, duration: 1.6, ease: 'sine.out', repeat: -1 }
        );
      } else if (scene === 'hoverProtocol') {
        loop.current = gsap.fromTo(
          ring.current,
          { opacity: 0.7, scale: 1 },
          { opacity: 0, scale: 1.5, duration: 1.1, ease: 'sine.out', repeat: -1 }
        );
        bob.current = gsap.to(btn.current, {
          y: -6,
          duration: 1.1,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
      }
    },
    { dependencies: [scene], scope: root }
  );

  // Idle "scroll" nudge → a single brighter ring flash.
  useEffect(() => {
    const onNudge = contextSafe(() => {
      const { reducedMotion, scene } = useStore.getState();
      // Only in true idle — during hover states a pulse loop already owns the
      // ring, and overwrite:'auto' would silently kill it.
      if (reducedMotion || scene !== 'idle') return;
      gsap.fromTo(
        ring.current,
        { opacity: 0.8, scale: 1 },
        { opacity: 0, scale: 1.6, duration: 0.8, ease: 'power2.out', overwrite: 'auto' }
      );
    });
    window.addEventListener('cy-nudge', onNudge);
    return () => window.removeEventListener('cy-nudge', onNudge);
  }, [contextSafe]);

  return (
    <div className="cy-protocol" ref={root}>
      <button
        ref={btn}
        className="cy-protocol__btn ia"
        aria-label="Initiate Cyphernaut Protocol"
        onPointerEnter={() => send({ type: 'HOVER_PROTOCOL' })}
        onPointerLeave={() => send({ type: 'UNHOVER_PROTOCOL' })}
        onClick={() => send({ type: 'CLICK_PROTOCOL' })}
      >
        <span className="cy-protocol__ring" ref={ring} aria-hidden="true" />
        <span className="cy-protocol__plus" aria-hidden="true">
          +
        </span>
      </button>
      <div className="cy-protocol__caption" aria-hidden="true">
        INITIATE
        <br />
        CYPHERNAUT <span className="green">PROTOCOL</span>
        <div className="cy-protocol__rule" />
      </div>
    </div>
  );
}
