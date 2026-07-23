import type { RefObject } from 'react';
import cypherpunkPlate from '../../assets/merge/cypherpunk.webp';
import astronautPlate from '../../assets/merge/astronaut.webp';

/**
 * MERGE SEQUENCE — the ceremony's instrument panel.
 *
 * A single wide glass slab: an identity plate on each side, the live merge
 * readout down the middle. It replaces the old stacked
 * SYNCHRONIZATION / percentage / task-bar panel, which stated the same thing
 * four times over and never showed WHAT was merging.
 *
 * Glass here is not decoration — it is the established surface of this product
 * (see .cy-dossier) and it is load-bearing: the two characters are converging
 * in the scene directly behind this panel, so the blur separates the readout
 * from the world while keeping that world visible through it. An opaque panel
 * would hide the very thing the number is describing.
 *
 * CONTRACT (CLAUDE.md): `pctRef` and `etaRef` are written imperatively at frame
 * rate by SyncOverlay's store subscription, so React MUST render them empty.
 * Never put text in those nodes.
 */

/** Even tick marks along the meter. Rendered, not decorative CSS — they are the
 *  scale the fill is read against. */
const TICKS = Array.from({ length: 11 }, (_, i) => i);

interface MergePanelProps {
  pctRef: RefObject<HTMLElement | null>;
  etaRef: RefObject<HTMLElement | null>;
  /** Meter fill — driven by transform, so it never triggers layout. */
  fillRef: RefObject<HTMLDivElement | null>;
  /** Pre-sync the slab is armed but idle; the copy reflects that. */
  syncing: boolean;
}

export function MergePanel({ pctRef, etaRef, fillRef, syncing }: MergePanelProps) {
  return (
    <div className="cy-merge" aria-hidden="true">
      <div className="cy-merge__frame">
        <header className="cy-merge__head">
          <span className="cy-merge__head-title">MERGE SEQUENCE // CYPHERNAUT PROTOCOL</span>
          <span className="cy-merge__head-dots">
            {Array.from({ length: 14 }, (_, i) => (
              <i key={i} />
            ))}
          </span>
        </header>

        <div className="cy-merge__body">
          <figure className="cy-merge__plate">
            <div className="cy-merge__plate-img">
              <img src={cypherpunkPlate} alt="" decoding="async" />
            </div>
            <figcaption>
              <b>CYPHERPUNK</b>
              <span>v2.4</span>
            </figcaption>
          </figure>

          <section className="cy-merge__readout">
            {/* Crosshairs pin the readout to the frame — the reference's
                registration marks, drawn rather than imported. */}
            <i className="cy-merge__cross cy-merge__cross--tl" />
            <i className="cy-merge__cross cy-merge__cross--tr" />
            <i className="cy-merge__cross cy-merge__cross--bl" />
            <i className="cy-merge__cross cy-merge__cross--br" />

            <div className="cy-merge__label">
              {syncing ? 'MERGING IDENTITIES' : 'ESTABLISHING LINK'}
            </div>

            <div className="cy-merge__pct num">
              {/* imperative node — rendered empty on purpose */}
              <span ref={pctRef} />
              <small>%</small>
            </div>

            <div className="cy-merge__meter">
              <div className="cy-merge__ticks">
                {TICKS.map((t) => (
                  <i key={t} />
                ))}
              </div>
              <div className="cy-merge__track">
                <div className="cy-merge__fill" ref={fillRef} />
              </div>
            </div>

            <div className="cy-merge__eta">
              <span>EST. COMPLETION</span>
              {/* imperative node — rendered empty on purpose */}
              <b className="num" ref={etaRef} />
            </div>
          </section>

          <figure className="cy-merge__plate">
            <div className="cy-merge__plate-img">
              <img src={astronautPlate} alt="" decoding="async" />
            </div>
            <figcaption>
              <b>ASTRONAUT</b>
              <span>v2.4</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}
