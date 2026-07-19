import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useStore, send } from '../state/store';
import { MANIFESTO_LINES } from '../config/content';
import { Logo } from '../ui/chrome/Logo';

/**
 * The editorial reward. Inert and unreachable until the protocol completes;
 * then the page unlocks and the manifesto slides over the sticky hero.
 */
export function ManifestoSection() {
  const unlocked = useStore((s) => s.scrollUnlocked);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (unlocked) document.documentElement.classList.add('is-unlocked');
  }, [unlocked]);

  useGSAP(
    () => {
      if (!unlocked || !root.current) return;
      const reduced = useStore.getState().reducedMotion;
      const blocks = root.current.querySelectorAll<HTMLElement>('[data-reveal]');
      blocks.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: reduced ? 0 : 40 },
          {
            opacity: 1,
            y: 0,
            duration: reduced ? 0.3 : 1.0,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 84%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      });
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top 70%',
        onEnter: () => send({ type: 'ENTER_STORY' }),
        onLeaveBack: () => send({ type: 'EXIT_STORY' }),
      });
    },
    { dependencies: [unlocked], scope: root }
  );

  return (
    <section
      ref={root}
      className="cy-manifesto"
      aria-label="Cyphernaut manifesto"
      inert={!unlocked}
      aria-hidden={!unlocked}
    >
      <div className="cy-manifesto__inner">
        <h2 className="cy-manifesto__kicker" data-reveal>
          CORE DECLARATION v2.4
        </h2>
        {MANIFESTO_LINES.map((line, i) => {
          const isSeal = i === MANIFESTO_LINES.length - 1;
          return (
            <p
              key={i}
              data-reveal
              className={`cy-manifesto__line${isSeal ? ' cy-manifesto__line--seal' : ''}`}
            >
              {isSeal ? <strong>{line}</strong> : line}
            </p>
          );
        })}
        <div className="cy-manifesto__glyph" data-reveal>
          <Logo size={56} />
        </div>
        <div className="cy-manifesto__foot" data-reveal>
          <span>CYPHERNAUT // SECURE CHANNEL // END-TO-END ENCRYPTED</span>
          <span>PROTOCOL VER. 3.7.2 — IDENTITY SYNCHRONIZED</span>
        </div>
      </div>
    </section>
  );
}
