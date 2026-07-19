/**
 * The Cyphernaut mark: three concentric broken arcs whose gaps step around
 * the circle — reads as both a "C" and an inward spiral. Square linecaps:
 * technical, not friendly.
 */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M 5.87 32.45 A 20 20 0 1 1 22.26 43.92"
        stroke="currentColor"
        strokeWidth="2.5"
        pathLength={100}
      />
      <path
        d="M 10.10 25.71 A 14 14 0 1 1 24.49 37.99"
        stroke="currentColor"
        strokeWidth="2.5"
        pathLength={100}
      />
      <path
        d="M 16.15 22.47 A 8 8 0 1 1 25.25 31.90"
        stroke="currentColor"
        strokeWidth="3"
        pathLength={100}
      />
    </svg>
  );
}
