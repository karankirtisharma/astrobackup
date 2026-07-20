import type { ReactNode } from 'react';

/**
 * Cutout art is resolved at BUILD time from src/assets/dossier/. Anything
 * absent falls back to the procedural SVG without ever issuing a request —
 * a runtime <img onError> probe would 404 on every panel open.
 *
 * To use photography: drop `<name>.png` (transparent, monochrome-friendly)
 * into src/assets/dossier/ and it appears automatically.
 */
const ART = import.meta.glob('../../assets/dossier/*.{png,webp,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function artUrl(name: string): string | null {
  const hit = Object.entries(ART).find(([path]) => path.split('/').pop()?.startsWith(`${name}.`));
  return hit ? hit[1] : null;
}

/**
 * Shared card chrome for both bento dossiers: bracketed corners, a title bar,
 * and the ArtSlot used for cutout imagery.
 *
 * Same contract as the rest of the panel — FINAL-state DOM annotated with
 * data-anim, so panelTimeline.ts still owns the one master timeline.
 */

export function Card({
  title,
  className = '',
  mark = false,
  ticks = false,
  children,
}: {
  title?: string;
  className?: string;
  /** Decorative window-chrome tick — part of the fictional OS, not a control. */
  mark?: boolean;
  /** Decorative dash/tick run in the title bar's right edge. */
  ticks?: boolean;
  children: ReactNode;
}) {
  return (
    <article className={`cy-card ${className}`} data-anim="fade">
      {title && (
        <div className="cy-card__bar">
          <span className="cy-card__title" data-anim="mask">
            {title}
          </span>
          {ticks && <span className="cy-card__ticks" aria-hidden="true" />}
          {mark && (
            <span className="cy-card__mark" aria-hidden="true">
              ✕
            </span>
          )}
        </div>
      )}
      <div className="cy-card__body">{children}</div>
    </article>
  );
}

/**
 * The identity chip. Purely a label now — the board carries no close
 * control; dismissal is click-anywhere-off-a-card, plus Escape (see
 * DossierPanel).
 */
export function IdentityChip() {
  return (
    <div className="cy-chip" data-anim="fade">
      <span className="cy-chip__label">IDENTITY CARD</span>
    </div>
  );
}

/**
 * A cutout-image slot: renders src/assets/dossier/<name>.png when present,
 * otherwise the procedural SVG art. Decorative either way — every module
 * states its data in text, so the imagery carries no unique information.
 */
export function ArtSlot({
  name,
  fallback,
  className = '',
}: {
  name: string;
  fallback: ReactNode;
  className?: string;
}) {
  const url = artUrl(name);
  return (
    <div className={`cy-art ${className}`} data-anim="fade">
      {url ? <img className="cy-art__img" src={url} alt="" aria-hidden="true" /> : fallback}
    </div>
  );
}
