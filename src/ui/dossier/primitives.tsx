import { useMemo } from 'react';
import type { ReactNode } from 'react';

/**
 * Panel primitives render FINAL-state DOM annotated with data-anim attributes;
 * panelTimeline.ts queries them and composes ONE master timeline. One owner is
 * what makes pixel-perfect .reverse() close possible — counters count down,
 * text un-types, exactly as the brief demands.
 */

export function TypeLabel({ text, className = '' }: { text: string; className?: string }) {
  const chars = useMemo(() => text.split(''), [text]);
  return (
    <span data-anim="type" className={className}>
      <span className="visually-hidden">{text}</span>
      <span aria-hidden="true">
        {chars.map((c, i) => (
          <span key={i} className="char">
            {c === ' ' ? ' ' : c}
          </span>
        ))}
      </span>
    </span>
  );
}

export function CountUp({
  to,
  decimals = 0,
  suffix = '',
  className = '',
}: {
  to: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  // The animated node is rendered EMPTY (the panel timeline owns its text —
  // React text + imperative text in one node is a removeChild crash); the
  // real value for assistive tech lives in a visually-hidden sibling.
  return (
    <span
      data-anim="count"
      data-to={to}
      data-decimals={decimals}
      data-suffix={suffix}
      className={`num ${className}`}
    >
      <span className="visually-hidden">{`${to.toFixed(decimals)}${suffix}`}</span>
      <span className="count-anim" aria-hidden="true" />
    </span>
  );
}

export function Bar({ value }: { value: number }) {
  return (
    <span className="cy-bar" data-anim="bar" data-value={value} style={{ display: 'block' }}>
      <i />
    </span>
  );
}

export function MaskReveal({ children }: { children: ReactNode }) {
  return <div data-anim="mask">{children}</div>;
}

export function Fade({ children }: { children: ReactNode }) {
  return <div data-anim="fade">{children}</div>;
}

export function FieldRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="cy-field" data-anim="fade">
      <span className="cy-field__label">{label}</span>
      <span className={`cy-field__value${accent ? ' cy-field__value--accent' : ''}`}>
        <TypeLabel text={value} />
      </span>
    </div>
  );
}

export function SectionTitle({ text, plain = false }: { text: string; plain?: boolean }) {
  return (
    <>
      <MaskReveal>
        <div className={`cy-section__title${plain ? ' cy-section__title--plain' : ''}`}>{text}</div>
      </MaskReveal>
      <div className="cy-section__rule" data-anim="bar" data-value={1} />
    </>
  );
}

/* ————— Fingerprint: procedurally generated, seeded, committed at module scope ————— */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildFingerprintPaths(seed: number): string[] {
  const rng = mulberry32(seed);
  const paths: string[] = [];
  const cx = 40;
  const cy = 48;
  for (let ring = 0; ring < 9; ring++) {
    const rx = 5 + ring * 3.6;
    const ry = 6.4 + ring * 4.2;
    const w1 = 2 + rng() * 4;
    const w2 = 5 + rng() * 5;
    const p1 = rng() * Math.PI * 2;
    const p2 = rng() * Math.PI * 2;
    // 1–2 gaps per ring at deterministic angles
    const gapA = rng() * Math.PI * 2;
    const gapB = gapA + Math.PI * (0.6 + rng() * 0.9);
    const gapW = 0.28 + rng() * 0.3;
    let d = '';
    let pen = false;
    for (let i = 0; i <= 72; i++) {
      const th = (i / 72) * Math.PI * 2;
      const inGap =
        Math.abs(Math.atan2(Math.sin(th - gapA), Math.cos(th - gapA))) < gapW ||
        Math.abs(Math.atan2(Math.sin(th - gapB), Math.cos(th - gapB))) < gapW * 0.7;
      if (inGap) {
        pen = false;
        continue;
      }
      const noise = Math.sin(th * w1 + p1) * 1.1 + Math.sin(th * w2 + p2) * 0.5;
      const x = (cx + (rx + noise) * Math.cos(th)).toFixed(1);
      const y = (cy + (ry + noise * 1.15) * Math.sin(th)).toFixed(1);
      d += pen ? ` L ${x} ${y}` : ` M ${x} ${y}`;
      pen = true;
    }
    if (d) paths.push(d.trim());
  }
  return paths;
}

const PRINT_PATHS: Record<'left' | 'right', string[]> = {
  left: buildFingerprintPaths(0xa11ce),
  right: buildFingerprintPaths(0xbee5),
};

export function FingerprintArt({ variant }: { variant: 'left' | 'right' }) {
  return (
    <svg width="80" height="96" viewBox="0 0 80 96" fill="none" data-anim="draw" aria-hidden="true">
      {PRINT_PATHS[variant].map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth={i % 4 === 0 ? 1.1 : 0.7} pathLength={1} />
      ))}
    </svg>
  );
}

/* ————— Bio-metric head: anatomical profile, contour lines only ————— */

export function HeadArt() {
  return (
    <svg width="92" height="112" viewBox="0 0 92 112" fill="none" data-anim="draw" aria-hidden="true">
      {/* skull + jaw profile, facing right */}
      <path
        d="M 30 104 C 28 92 26 86 20 79 C 12 69 10 58 13 47 C 17 31 30 20 46 20 C 62 20 74 31 76 46 C 77 55 74 60 70 62 C 67 63 66 65 67 68 C 68 72 66 74 62 74 C 60 74 59 76 59 79 C 60 86 56 90 50 90 C 47 90 46 92 46 95 L 46 104"
        stroke="currentColor"
        strokeWidth="0.9"
        pathLength={1}
      />
      {/* cranial contour shells */}
      <path d="M 18 52 C 22 36 33 27 46 27 C 59 27 69 36 71 49" stroke="currentColor" strokeWidth="0.5" pathLength={1} />
      <path d="M 23 55 C 26 42 35 34 46 34 C 57 34 65 42 66 52" stroke="currentColor" strokeWidth="0.4" pathLength={1} />
      {/* brow, orbit, nasal, mouth */}
      <path d="M 56 55 C 60 53 65 54 68 57" stroke="currentColor" strokeWidth="0.5" pathLength={1} />
      <path d="M 60 63 C 63 62 66 63 67 65" stroke="currentColor" strokeWidth="0.4" pathLength={1} />
      <path d="M 55 80 C 58 79 61 80 62 81" stroke="currentColor" strokeWidth="0.4" pathLength={1} />
      {/* cervical column */}
      <path d="M 34 90 C 33 96 33 100 34 104" stroke="currentColor" strokeWidth="0.4" pathLength={1} />
      {/* measurement ticks */}
      <path d="M 8 40 L 12 40 M 8 62 L 12 62 M 8 84 L 12 84" stroke="currentColor" strokeWidth="0.5" pathLength={1} />
    </svg>
  );
}

/* ————— Signature: a single hand-drawn stroke ————— */

export function SignatureArt() {
  return (
    <svg width="96" height="30" viewBox="0 0 96 30" fill="none" data-anim="draw" aria-hidden="true">
      <path
        d="M 4 22 C 10 8 14 4 17 6 C 20 8 16 18 14 22 C 12 26 15 27 19 23 C 23 19 26 10 29 8 C 32 6 32 14 30 19 C 29 23 32 24 36 20 C 40 16 43 9 47 9 C 50 9 49 16 47 20 C 45 24 48 25 53 21 C 58 17 62 8 67 9 C 71 10 68 18 66 21 C 64 25 68 25 73 20 C 78 15 84 12 90 13"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        pathLength={1}
      />
      <path d="M 20 27 C 38 25 68 25 84 27" stroke="currentColor" strokeWidth="0.5" pathLength={1} />
    </svg>
  );
}

/* ————— Neural map placeholder art (contours, not kitsch) ————— */

export function BrainArt({ variant }: { variant: 0 | 1 }) {
  return (
    <svg width="64" height="54" viewBox="0 0 64 54" fill="none" data-anim="draw" aria-hidden="true">
      <ellipse cx="32" cy="27" rx="24" ry="19" stroke="currentColor" strokeWidth="0.8" pathLength={1} />
      {variant === 0 ? (
        <>
          <path d="M 32 8 C 22 12 20 22 24 30 C 27 36 30 40 32 46" stroke="currentColor" strokeWidth="0.7" pathLength={1} />
          <path d="M 32 8 C 42 12 44 22 40 30 C 37 36 34 40 32 46" stroke="currentColor" strokeWidth="0.7" pathLength={1} />
          <path d="M 14 24 C 22 20 42 20 50 24" stroke="currentColor" strokeWidth="0.6" pathLength={1} />
          <path d="M 15 32 C 24 28 40 28 49 32" stroke="currentColor" strokeWidth="0.6" pathLength={1} />
        </>
      ) : (
        <>
          <path d="M 12 27 C 20 14 44 14 52 27" stroke="currentColor" strokeWidth="0.7" pathLength={1} />
          <path d="M 12 27 C 20 40 44 40 52 27" stroke="currentColor" strokeWidth="0.7" pathLength={1} />
          <path d="M 22 15 C 26 24 26 30 22 39" stroke="currentColor" strokeWidth="0.6" pathLength={1} />
          <path d="M 42 15 C 38 24 38 30 42 39" stroke="currentColor" strokeWidth="0.6" pathLength={1} />
          <circle cx="32" cy="27" r="4.5" stroke="currentColor" strokeWidth="0.7" pathLength={1} />
        </>
      )}
    </svg>
  );
}
