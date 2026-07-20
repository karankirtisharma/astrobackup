import { CYPHERPUNK_BENTO as B } from '../../config/content';
import { TypeLabel, CountUp, Bar, FieldRow, FingerprintArt, SignatureArt } from './primitives';
import { Card, ArtSlot, IdentityChip } from './Card';
import { BodyArt, RadarArt } from './art';

/**
 * The cypherpunk dossier as a six-module instrument board.
 *
 * Two independent columns, not grid rows — cards stack to their own content
 * height. DOM order IS animation order: identity → skills → neural, then
 * bio → footprint → codename.
 *
 * Imagery routes through ArtSlot: drop a transparent cutout into
 * src/assets/dossier/ and it replaces the procedural SVG with no code change.
 */
export function BentoBody() {
  return (
    <div className="cy-bento">
      <div className="cy-bento__col">
        <Card className="cy-card--identity">
          <IdentityChip />
          {B.identity.map((f) => (
            <FieldRow key={f.label} {...f} />
          ))}
        </Card>

        <Card title="SKILL MATRIX" className="cy-card--skills" ticks>
          <div className="cy-skills">
            {B.skills.map((s) => (
              <div className="cy-skills__row" key={s.label}>
                <span className="cy-skills__label" data-anim="fade">
                  {s.label}
                </span>
                <span className="cy-skills__bar">
                  <Bar value={s.value / 100} />
                </span>
                <span className="cy-skills__pct num" data-anim="fade">
                  <CountUp to={s.value} suffix="%" />
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="NEURAL MAP // MRI" className="cy-card--neural">
          <div className="cy-visual">
            <ArtSlot
              name="mri-coronal"
              className="cy-visual__cell"
              fallback={<BrainSlice variant={0} />}
            />
            <ArtSlot
              name="mri-axial"
              className="cy-visual__cell"
              fallback={<BrainSlice variant={1} />}
            />
          </div>
          <div className="cy-meta-rows">
            {B.neuralRows.map((r) => (
              <div className="row" key={r.label} data-anim="fade">
                <span>{r.label}</span>
                <b>{r.value}</b>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="cy-bento__col">
        <Card title="BIO METRICS" className="cy-card--bio" ticks>
          <div className="cy-bio">
            <ArtSlot name="anatomy" className="cy-bio__art" fallback={<BodyArt />} />
            <div className="cy-bio__stats">
              {B.bio.map((m) => (
                <div className="cy-bio__row" key={m.label} data-anim="fade">
                  <span className="cy-field__label">{m.label}</span>
                  <span className="cy-bio__figure num">
                    <TypeLabel text={m.value} />
                  </span>
                  {m.unit && <span className="cy-bio__unit">{m.unit}</span>}
                  <span className="cy-bio__trace">
                    <PulseTrace />
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="cy-card__foot" data-anim="fade">
            <span className="cy-field__label">SCAN QUALITY</span>
            <span className="cy-field__value cy-field__value--accent num">
              <CountUp to={B.scanQuality} decimals={1} suffix="%" />
            </span>
          </div>
          <span className="cy-hatch" data-anim="bar" data-value={1} aria-hidden="true" />
        </Card>

        <Card title="DATA FOOTPRINT" className="cy-card--print" ticks>
          <div className="cy-print">
            <ArtSlot
              name="fingerprint"
              className="cy-print__art"
              fallback={<FingerprintArt variant="left" />}
            />
            <ul className="cy-tags">
              {B.footprint.map((t) => (
                <li key={t} data-anim="fade">
                  <span className="cy-tags__node" aria-hidden="true" />
                  <span className="cy-tags__text">
                    <TypeLabel text={t} />
                  </span>
                  <span className="cy-tags__check" aria-hidden="true">
                    ✓
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="cy-card--code">
          <div className="cy-code">
            <div className="cy-code__main">
              <div className="cy-code__block">
                <span className="cy-field__label" data-anim="fade">
                  CODENAME
                </span>
                <div className="cy-code__name" data-anim="mask">
                  {B.codename.name}
                </div>
              </div>
              <div className="cy-code__block">
                <span className="cy-field__label" data-anim="fade">
                  AFFILIATION
                </span>
                <div className="cy-code__value" data-anim="fade">
                  <TypeLabel text={B.codename.affiliation} />
                </div>
              </div>
              <div className="cy-code__block">
                <span className="cy-field__label" data-anim="fade">
                  BELIEFS
                </span>
                <ul className="cy-beliefs">
                  {B.codename.beliefs.map((b) => (
                    <li key={b} data-anim="fade">
                      <TypeLabel text={b} />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="cy-code__block">
                <span className="cy-field__label" data-anim="fade">
                  SIGNATURE
                </span>
                <ArtSlot
                  name="signature"
                  className="cy-code__signart"
                  fallback={<SignatureArt />}
                />
              </div>
            </div>
            <div className="cy-code__side">
              <ArtSlot name="radar" className="cy-code__radar" fallback={<RadarArt />} />
              <span className="cy-worldmap" data-anim="fade" aria-hidden="true" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/** Tiny HRV trace beside each figure. */
function PulseTrace() {
  return (
    <svg width="52" height="14" viewBox="0 0 52 14" fill="none" data-anim="draw" aria-hidden="true">
      <path
        d="M 1 8 L 9 8 L 12 3 L 15 12 L 18 8 L 27 8 L 30 4 L 33 11 L 36 8 L 51 8"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        pathLength={1}
      />
    </svg>
  );
}

/** MRI slice stand-in — sulcal contours, not illustration. */
function BrainSlice({ variant }: { variant: 0 | 1 }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" data-anim="draw" aria-hidden="true">
      {variant === 0 ? (
        <>
          <path d="M 32 6 C 18 6 10 18 10 32 C 10 46 18 58 32 58 C 46 58 54 46 54 32 C 54 18 46 6 32 6" stroke="currentColor" strokeWidth="0.8" pathLength={1} />
          <path d="M 32 8 L 32 56" stroke="currentColor" strokeWidth="0.5" pathLength={1} />
          <path d="M 24 14 C 18 20 18 30 24 36 C 27 40 27 46 24 50" stroke="currentColor" strokeWidth="0.45" pathLength={1} />
          <path d="M 40 14 C 46 20 46 30 40 36 C 37 40 37 46 40 50" stroke="currentColor" strokeWidth="0.45" pathLength={1} />
          <path d="M 14 28 C 20 25 26 25 30 28" stroke="currentColor" strokeWidth="0.35" pathLength={1} />
          <path d="M 34 28 C 38 25 44 25 50 28" stroke="currentColor" strokeWidth="0.35" pathLength={1} />
          <path d="M 22 44 C 28 42 36 42 42 44" stroke="currentColor" strokeWidth="0.35" pathLength={1} />
        </>
      ) : (
        <>
          <ellipse cx="32" cy="32" rx="24" ry="27" stroke="currentColor" strokeWidth="0.8" pathLength={1} />
          <path d="M 32 5 L 32 59" stroke="currentColor" strokeWidth="0.5" pathLength={1} />
          <path d="M 12 22 C 22 18 42 18 52 22" stroke="currentColor" strokeWidth="0.4" pathLength={1} />
          <path d="M 10 32 C 22 28 42 28 54 32" stroke="currentColor" strokeWidth="0.4" pathLength={1} />
          <path d="M 12 42 C 22 38 42 38 52 42" stroke="currentColor" strokeWidth="0.4" pathLength={1} />
          <path d="M 20 12 C 24 22 24 42 20 52" stroke="currentColor" strokeWidth="0.35" pathLength={1} />
          <path d="M 44 12 C 40 22 40 42 44 52" stroke="currentColor" strokeWidth="0.35" pathLength={1} />
          <circle cx="32" cy="32" r="5" stroke="currentColor" strokeWidth="0.5" pathLength={1} />
        </>
      )}
    </svg>
  );
}
