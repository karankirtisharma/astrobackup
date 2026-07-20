/**
 * Procedural technical art — the fallback layer beneath every ArtSlot.
 * Anatomical/instrument line drawings, never illustration. Each root SVG
 * carries data-anim="draw" so the panel timeline strokes it on.
 */

/** Anatomical torso, three-quarter — the bio-metrics subject. */
export function BodyArt() {
  return (
    <svg viewBox="0 0 150 210" fill="none" data-anim="draw" aria-hidden="true">
      {/* head + neck */}
      <path d="M 74 12 C 62 12 55 21 55 33 C 55 42 58 47 62 50 C 64 52 64 56 62 59 L 58 63" stroke="currentColor" strokeWidth="0.8" pathLength={1} />
      <path d="M 74 12 C 86 12 93 21 93 33 C 93 42 90 47 86 50 C 84 52 84 56 86 59 L 90 63" stroke="currentColor" strokeWidth="0.8" pathLength={1} />
      <path d="M 66 46 C 70 49 78 49 82 46" stroke="currentColor" strokeWidth="0.5" pathLength={1} />
      {/* shoulders + arms */}
      <path d="M 58 63 C 44 66 32 72 27 80 C 21 90 17 108 15 126 C 14 136 12 146 9 154" stroke="currentColor" strokeWidth="0.8" pathLength={1} />
      <path d="M 90 63 C 104 66 116 72 121 80 C 127 90 131 108 133 126 C 134 136 136 146 139 154" stroke="currentColor" strokeWidth="0.8" pathLength={1} />
      {/* torso */}
      <path d="M 45 74 C 42 96 42 122 46 150 C 48 166 50 182 50 198" stroke="currentColor" strokeWidth="0.7" pathLength={1} />
      <path d="M 103 74 C 106 96 106 122 102 150 C 100 166 98 182 98 198" stroke="currentColor" strokeWidth="0.7" pathLength={1} />
      {/* pectoral + rib structure */}
      <path d="M 52 88 C 62 84 70 84 74 88 C 78 84 86 84 96 88" stroke="currentColor" strokeWidth="0.5" pathLength={1} />
      <path d="M 51 98 C 62 94 70 94 74 98 C 78 94 86 94 97 98" stroke="currentColor" strokeWidth="0.45" pathLength={1} />
      <path d="M 74 88 L 74 132" stroke="currentColor" strokeWidth="0.45" pathLength={1} />
      <path d="M 50 108 C 60 105 68 105 74 108 C 80 105 88 105 98 108" stroke="currentColor" strokeWidth="0.4" pathLength={1} />
      <path d="M 51 118 C 60 115 68 115 74 118 C 80 115 88 115 97 118" stroke="currentColor" strokeWidth="0.4" pathLength={1} />
      {/* abdominal mass */}
      <path d="M 56 134 C 62 130 86 130 92 134 C 96 142 96 158 92 166 C 84 172 64 172 56 166 C 52 158 52 142 56 134" stroke="currentColor" strokeWidth="0.5" pathLength={1} />
      <path d="M 60 146 C 70 142 78 142 88 146" stroke="currentColor" strokeWidth="0.35" pathLength={1} />
      <path d="M 60 156 C 70 152 78 152 88 156" stroke="currentColor" strokeWidth="0.35" pathLength={1} />
      {/* hands */}
      <path d="M 9 154 C 6 160 5 168 8 172 C 11 176 16 174 17 169" stroke="currentColor" strokeWidth="0.6" pathLength={1} />
      <path d="M 139 154 C 142 160 143 168 140 172 C 137 176 132 174 131 169" stroke="currentColor" strokeWidth="0.6" pathLength={1} />
      {/* registration ticks */}
      <path d="M 4 40 L 10 40 M 4 100 L 10 100 M 4 160 L 10 160" stroke="currentColor" strokeWidth="0.5" pathLength={1} />
      <path d="M 140 40 L 146 40 M 140 100 L 146 100 M 140 160 L 146 160" stroke="currentColor" strokeWidth="0.5" pathLength={1} />
    </svg>
  );
}

/** Cranial x-ray for the astronaut vitals module. */
export function SkullArt() {
  return (
    <svg viewBox="0 0 110 130" fill="none" data-anim="draw" aria-hidden="true">
      <path d="M 55 14 C 33 14 20 30 20 50 C 20 62 24 70 30 76 C 34 80 35 86 34 92 C 33 100 38 105 46 105 L 46 116" stroke="currentColor" strokeWidth="0.8" pathLength={1} />
      <path d="M 55 14 C 77 14 90 30 90 50 C 90 62 86 70 80 76 C 76 80 75 86 76 92 C 77 100 72 105 64 105 L 64 116" stroke="currentColor" strokeWidth="0.8" pathLength={1} />
      {/* cranial shells */}
      <path d="M 26 52 C 28 34 40 23 55 23 C 70 23 82 34 84 52" stroke="currentColor" strokeWidth="0.45" pathLength={1} />
      <path d="M 32 55 C 34 42 43 33 55 33 C 67 33 76 42 78 55" stroke="currentColor" strokeWidth="0.35" pathLength={1} />
      {/* orbits */}
      <ellipse cx="40" cy="63" rx="9" ry="8" stroke="currentColor" strokeWidth="0.6" pathLength={1} />
      <ellipse cx="70" cy="63" rx="9" ry="8" stroke="currentColor" strokeWidth="0.6" pathLength={1} />
      {/* nasal + maxilla + mandible */}
      <path d="M 55 70 L 51 82 C 51 85 59 85 59 82 L 55 70" stroke="currentColor" strokeWidth="0.5" pathLength={1} />
      <path d="M 40 90 C 48 87 62 87 70 90" stroke="currentColor" strokeWidth="0.5" pathLength={1} />
      <path d="M 40 96 C 48 93 62 93 70 96" stroke="currentColor" strokeWidth="0.4" pathLength={1} />
      {/* cervical column */}
      <path d="M 46 116 C 46 122 64 122 64 116" stroke="currentColor" strokeWidth="0.5" pathLength={1} />
      <path d="M 50 108 L 50 122 M 60 108 L 60 122" stroke="currentColor" strokeWidth="0.35" pathLength={1} />
    </svg>
  );
}

/** Suited figure — diagnostics + x-ray modules share it. */
export function SuitArt({ wire = false }: { wire?: boolean }) {
  const w = wire ? 0.4 : 0.7;
  return (
    <svg viewBox="0 0 110 200" fill="none" data-anim="draw" aria-hidden="true">
      {/* helmet */}
      <path d="M 55 10 C 39 10 30 21 30 35 C 30 47 39 56 55 56 C 71 56 80 47 80 35 C 80 21 71 10 55 10" stroke="currentColor" strokeWidth="0.8" pathLength={1} />
      <path d="M 37 33 C 38 23 45 17 55 17 C 65 17 72 23 73 33 C 74 43 66 49 55 49 C 44 49 36 43 37 33" stroke="currentColor" strokeWidth="0.5" pathLength={1} />
      {/* life-support pack + shoulders */}
      <path d="M 32 56 C 24 60 20 68 20 78 L 20 120 C 20 128 24 132 30 132" stroke="currentColor" strokeWidth={0.8} pathLength={1} />
      <path d="M 78 56 C 86 60 90 68 90 78 L 90 120 C 90 128 86 132 80 132" stroke="currentColor" strokeWidth={0.8} pathLength={1} />
      {/* torso plate */}
      <path d="M 34 62 C 32 78 32 100 34 118 C 44 124 66 124 76 118 C 78 100 78 78 76 62 C 66 57 44 57 34 62" stroke="currentColor" strokeWidth="0.6" pathLength={1} />
      <path d="M 44 74 L 66 74 M 44 84 L 66 84 M 44 94 L 60 94" stroke="currentColor" strokeWidth={w} pathLength={1} />
      <rect x="42" y="102" width="26" height="12" stroke="currentColor" strokeWidth={w} pathLength={1} />
      {/* arms */}
      <path d="M 20 82 C 14 90 12 104 13 118 C 14 126 16 132 19 136" stroke="currentColor" strokeWidth="0.6" pathLength={1} />
      <path d="M 90 82 C 96 90 98 104 97 118 C 96 126 94 132 91 136" stroke="currentColor" strokeWidth="0.6" pathLength={1} />
      <path d="M 13 136 C 10 142 11 150 16 152 C 20 153 23 149 23 144" stroke="currentColor" strokeWidth="0.55" pathLength={1} />
      <path d="M 97 136 C 100 142 99 150 94 152 C 90 153 87 149 87 144" stroke="currentColor" strokeWidth="0.55" pathLength={1} />
      {/* legs */}
      <path d="M 34 122 C 32 140 31 160 32 178 C 32 186 33 191 34 194" stroke="currentColor" strokeWidth="0.7" pathLength={1} />
      <path d="M 53 124 C 52 142 52 162 52 180 C 52 187 52 191 52 194" stroke="currentColor" strokeWidth="0.6" pathLength={1} />
      <path d="M 76 122 C 78 140 79 160 78 178 C 78 186 77 191 76 194" stroke="currentColor" strokeWidth="0.7" pathLength={1} />
      <path d="M 34 194 C 38 197 46 197 50 194" stroke="currentColor" strokeWidth="0.7" pathLength={1} />
      <path d="M 60 194 C 64 197 72 197 76 194" stroke="currentColor" strokeWidth="0.7" pathLength={1} />
      {/* knee joints */}
      <path d="M 34 152 C 40 149 46 149 51 152" stroke="currentColor" strokeWidth={w} pathLength={1} />
      <path d="M 59 152 C 64 149 70 149 76 152" stroke="currentColor" strokeWidth={w} pathLength={1} />
      {wire && (
        <>
          <path d="M 55 56 L 55 122" stroke="currentColor" strokeWidth="0.3" pathLength={1} />
          <path d="M 34 90 L 76 90" stroke="currentColor" strokeWidth="0.3" pathLength={1} />
          <path d="M 40 132 L 70 132" stroke="currentColor" strokeWidth="0.3" pathLength={1} />
        </>
      )}
    </svg>
  );
}

/** Cratered sphere for the mission-profile module. */
export function PlanetArt() {
  return (
    <svg viewBox="0 0 100 100" fill="none" data-anim="draw" aria-hidden="true">
      <circle cx="50" cy="50" r="36" stroke="currentColor" strokeWidth="0.8" pathLength={1} />
      <path d="M 16 42 C 30 36 70 36 84 42" stroke="currentColor" strokeWidth="0.4" pathLength={1} />
      <path d="M 14 56 C 30 62 70 62 86 56" stroke="currentColor" strokeWidth="0.4" pathLength={1} />
      <path d="M 50 14 C 40 30 40 70 50 86" stroke="currentColor" strokeWidth="0.35" pathLength={1} />
      <path d="M 50 14 C 60 30 60 70 50 86" stroke="currentColor" strokeWidth="0.35" pathLength={1} />
      <circle cx="38" cy="38" r="6" stroke="currentColor" strokeWidth="0.4" pathLength={1} />
      <circle cx="62" cy="58" r="8" stroke="currentColor" strokeWidth="0.4" pathLength={1} />
      <circle cx="66" cy="34" r="3.5" stroke="currentColor" strokeWidth="0.4" pathLength={1} />
      <circle cx="34" cy="64" r="4" stroke="currentColor" strokeWidth="0.4" pathLength={1} />
    </svg>
  );
}

/** Radar sweep + monogram for the codename module. */
export function RadarArt() {
  const rings = [14, 22, 30, 38];
  const spokes = Array.from({ length: 12 }, (_, i) => (i * Math.PI * 2) / 12);
  return (
    <svg viewBox="0 0 100 100" fill="none" data-anim="draw" aria-hidden="true">
      {rings.map((r) => (
        <circle key={r} cx="50" cy="50" r={r} stroke="currentColor" strokeWidth="0.35" pathLength={1} />
      ))}
      {spokes.map((a, i) => (
        <path
          key={i}
          d={`M ${(50 + 14 * Math.cos(a)).toFixed(1)} ${(50 + 14 * Math.sin(a)).toFixed(1)} L ${(50 + 40 * Math.cos(a)).toFixed(1)} ${(50 + 40 * Math.sin(a)).toFixed(1)}`}
          stroke="currentColor"
          strokeWidth="0.25"
          pathLength={1}
        />
      ))}
      {[
        [70, 32],
        [28, 40],
        [64, 70],
        [40, 74],
        [78, 54],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.4" stroke="currentColor" strokeWidth="0.6" pathLength={1} />
      ))}
      {/* monogram */}
      <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="0.7" pathLength={1} />
      <path d="M 54 45 C 48 45 46 47 46 50 C 46 53 48 55 54 55" stroke="currentColor" strokeWidth="1.1" pathLength={1} />
    </svg>
  );
}
