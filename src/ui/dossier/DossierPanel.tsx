import { useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { useStore, send } from '../../state/store';
import { DOSSIERS } from '../../config/content';
import { DUR } from '../../motion/motionConfig';
import { Logo } from '../chrome/Logo';
import {
  TypeLabel,
  CountUp,
  Bar,
  FieldRow,
  SectionTitle,
  Fade,
  FingerprintArt,
  BrainArt,
} from './primitives';
import { buildPanelTimeline } from './panelTimeline';

/**
 * The classified dossier. Mounted for the whole panel lifecycle; the FSM's
 * phase drives it: entering/active → play, exiting → reversed construction,
 * PANEL_CLOSED on reverse completion returns the world to idle.
 */
export function DossierPanel() {
  const scene = useStore((s) => s.scene);
  const phase = useStore((s) => s.phase);
  const side = useStore((s) => s.panelSide);
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  const open = scene === 'cypherpunkPanel' || scene === 'astronautPanel';

  useGSAP(
    () => {
      // Defensive kill FIRST: with a dependency array, @gsap/react defers all
      // context cleanup to unmount — and this component never unmounts, so
      // without this every open/close would leak a timeline + detached DOM.
      tl.current?.kill();
      tl.current = null;
      if (!open || !root.current) return;
      tl.current = buildPanelTimeline(root.current, () => send({ type: 'PANEL_CLOSED' }));
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

  useEffect(() => {
    if (open && phase === 'exiting' && tl.current) {
      // Closing mid-open reverses from the current playhead — by design.
      tl.current.timeScale(DUR.closeSpeedup).reverse();
    }
  }, [open, phase]);

  if (!open || !side) return null;

  const d = DOSSIERS[side];
  const isLeft = side === 'cypherpunk';

  return (
    <section
      ref={root}
      className={`cy-dossier ia ${isLeft ? 'cy-dossier--left' : 'cy-dossier--right'}`}
      role="region"
      aria-label={`${d.title} dossier`}
      style={{ opacity: 0 }}
    >
      {/* construction grid */}
      <svg className="cy-dossier__grid" width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden="true">
        <line x1="0" y1="18" x2="100" y2="18" stroke="currentColor" strokeWidth="0.2" pathLength={1} />
        <line x1="0" y1="52" x2="100" y2="52" stroke="currentColor" strokeWidth="0.2" pathLength={1} />
        <line x1="0" y1="80" x2="100" y2="80" stroke="currentColor" strokeWidth="0.2" pathLength={1} />
        <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.2" pathLength={1} />
      </svg>
      <div className="cy-dossier__scan" aria-hidden="true" />

      <header className="cy-dossier__head">
        <span style={{ color: 'var(--grey-1)' }}>
          <Logo size={18} />
        </span>
        <h2 className="cy-dossier__title">
          {d.title}
          <span>{d.subtitle}</span>
        </h2>
        <button
          className="cy-dossier__close"
          aria-label="Close dossier"
          disabled={phase === 'exiting'}
          onClick={() => send({ type: 'CLOSE_PANEL' })}
        >
          ✕
        </button>
      </header>

      <div className="cy-dossier__body">
        <div className="cy-dossier__cols">
          <div className="cy-section">
            <SectionTitle text="IDENTITY CARD" />
            {d.identity.map((f) => (
              <FieldRow key={f.label} {...f} />
            ))}
          </div>
          <div className="cy-section">
            <SectionTitle text={d.attributesTitle} plain />
            {d.attributes.map((f) => (
              <FieldRow key={f.label} {...f} />
            ))}
            {d.toolkitTitle && (
              <>
                <SectionTitle text={d.toolkitTitle} plain />
                <ul className="cy-toolkit">
                  {d.toolkit.map((t) => (
                    <li key={t} data-anim="fade">
                      <TypeLabel text={t} />
                    </li>
                  ))}
                </ul>
              </>
            )}
            {d.extra.map((f) => (
              <FieldRow key={f.label} {...f} />
            ))}
          </div>
        </div>

        <div className="cy-section">
          <SectionTitle text={d.thumbprint.sideLabel} plain />
          <div className="cy-print">
            <Fade>
              <div className="cy-print__art">
                <FingerprintArt variant={isLeft ? 'left' : 'right'} />
                <span className="cy-print__scanline" data-anim="scanline" />
              </div>
            </Fade>
            <div className="cy-print__meta">
              <div className="cy-field" data-anim="fade">
                <span className="cy-field__label">HASH</span>
                <span className="cy-field__value num">
                  <TypeLabel text={d.thumbprint.hash} />
                </span>
              </div>
              <div className="cy-field" data-anim="fade">
                <span className="cy-field__label">MATCH</span>
                <span className="cy-field__value cy-field__value--accent num">
                  <CountUp to={d.thumbprint.match} decimals={1} suffix="%" />
                </span>
              </div>
              <Bar value={d.thumbprint.match / 100} />
            </div>
          </div>
        </div>

        <div className="cy-section">
          <SectionTitle text={d.moduleTitle} plain />
          {d.visual === 'neural' ? (
            <>
              <div className="cy-visual">
                <Fade>
                  <div className="cy-visual__cell">
                    <BrainArt variant={0} />
                  </div>
                </Fade>
                <Fade>
                  <div className="cy-visual__cell">
                    <BrainArt variant={1} />
                  </div>
                </Fade>
              </div>
              <div className="cy-meta-rows">
                {d.moduleRows.map((r) => (
                  <div className="row" key={r.label} data-anim="fade">
                    <span>{r.label}</span>
                    <b>{r.value}</b>
                  </div>
                ))}
              </div>
              {d.moduleNote && (
                <Fade>
                  <div className="cy-note">{d.moduleNote}</div>
                </Fade>
              )}
            </>
          ) : (
            <>
              <div className="cy-mission">
                <div className="cy-mission__statement" data-anim="fade">
                  <TypeLabel text={d.missionStatement ?? ''} />
                </div>
                <Fade>
                  <div className="cy-mission__moon" />
                </Fade>
              </div>
              <div className="cy-meta-rows">
                {d.moduleRows.map((r) => (
                  <div className="row" key={r.label} data-anim="fade">
                    <span>{r.label}</span>
                    <b>{r.value}</b>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
