import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useStore, send } from '../../state/store';
import { DOSSIERS } from '../../config/content';
import { DUR } from '../../motion/motionConfig';
import { buildPanelTimeline } from './panelTimeline';
import { BentoBody } from './BentoBody';
import { AstronautBody } from './AstronautBody';

/**
 * The classified dossier. Mounted for the whole panel lifecycle; the FSM's
 * phase drives it: entering/active → build, exiting → wind-down, and
 * PANEL_CLOSED on its completion returns the world to idle.
 *
 * Both sides render as instrument boards (BentoBody / AstronautBody). The
 * board carries no close button: dismissal is a click anywhere off a card,
 * or Escape.
 */
export function DossierPanel() {
  const scene = useStore((s) => s.scene);
  const phase = useStore((s) => s.phase);
  const side = useStore((s) => s.panelSide);
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const exiting = useRef(false);

  const open = scene === 'cypherpunkPanel' || scene === 'astronautPanel';

  useGSAP(
    () => {
      // Defensive kill FIRST: with a dependency array, @gsap/react defers all
      // context cleanup to unmount — and this component never unmounts, so
      // without this every open/close would leak a timeline + detached DOM.
      tl.current?.kill();
      tl.current = null;
      if (!open || !root.current) return;
      tl.current = buildPanelTimeline(root.current);
      tl.current.play();
    },
    { dependencies: [open, side], scope: root, revertOnUpdate: true }
  );

  // Focus discipline: closing a dossier returns focus to its trigger.
  useEffect(() => {
    if (!open || !side) return;
    const which = side;
    return () => {
      document.getElementById(`cy-open-${which}`)?.focus();
    };
  }, [open, side]);

  /**
   * Dismissal is NOT a reversed construction, and deliberately NOT driven by
   * an effect.
   *
   * Reversing the build un-staggers dozens of nodes and measured ~2.4s — an
   * age once the visitor has decided to leave, and unacceptable now that a
   * stray click off a card is the dismissal. Same policy the conductor
   * applies to CANCEL_PROTOCOL: kill the long timeline, play a short
   * purpose-built wind-down.
   *
   * Running it imperatively rather than from a `phase === 'exiting'` effect
   * matters: that effect re-entered on unrelated re-renders and its cleanup
   * killed the in-flight tween, so the close landed anywhere between 45ms and
   * a full second depending on render timing. One call, one wind-down.
   */
  const dismiss = useCallback(() => {
    const el = root.current;
    if (!el || exiting.current) return;
    exiting.current = true;

    send({ type: 'CLOSE_PANEL' });
    tl.current?.kill();
    tl.current = null;

    const reduced = useStore.getState().reducedMotion;
    const done = () => {
      exiting.current = false;
      send({ type: 'PANEL_CLOSED' });
    };

    if (reduced) {
      gsap.to(el, { autoAlpha: 0, duration: 0.1, overwrite: 'auto', onComplete: done });
      return;
    }

    // Rollback: the board retracts in the order it was built, last pane
    // first. A compressed echo of the construction rather than a replay of
    // it — the whole retraction lands inside DUR.panelExit's budget.
    const out = gsap.timeline({ onComplete: done });
    out.to(el.querySelectorAll('.cy-card'), {
      autoAlpha: 0,
      y: -10,
      scale: 0.985,
      duration: DUR.panelExit,
      ease: 'power2.in',
      overwrite: 'auto',
      stagger: { each: 0.028, from: 'end' },
    });
    out.to(el, { autoAlpha: 0, duration: 0.1, overwrite: 'auto' }, '>-0.06');
  }, []);

  // The board has no close button, so Escape is the keyboard route out.
  // Click-anywhere-off-a-card alone would strand keyboard-only users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismiss]);

  if (!open || !side) return null;

  const d = DOSSIERS[side];
  const isLeft = side === 'cypherpunk';

  /** Anything that isn't a card is dead space — dismiss. */
  const dismissOffCard = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('.cy-card')) return;
    dismiss();
  };

  return (
    <>
      {/* Catches clicks outside the board. Sits below the panel and below the
          nav, so the nav stays usable while a dossier is open. Transparent —
          the dimming is the panel's job, not this layer's. */}
      <div className="cy-dossier__dismiss" onClick={dismissOffCard} aria-hidden="true" />
      <section
        ref={root}
        onClick={dismissOffCard}
        className={`cy-dossier cy-dossier--bento ia ${
          isLeft ? 'cy-dossier--left' : 'cy-dossier--right'
        }`}
        role="region"
        aria-label={`${d.title} dossier`}
        style={{ opacity: 0 }}
      >
        <div className="cy-dossier__body">
          <button
            className="cy-back ia"
            data-anim="fade"
            aria-label="Close dossier"
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path
                d="M8 1.5 L3 6.5 L8 11.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>BACK</span>
          </button>
          {isLeft ? <BentoBody /> : <AstronautBody />}
        </div>
      </section>
    </>
  );
}
