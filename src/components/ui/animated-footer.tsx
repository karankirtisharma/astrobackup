import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { cn } from '../../lib/utils';

/**
 * Animated Footer
 *
 * A cinematic, reveal-on-scroll footer: two source images are re-drawn as
 * live ASCII art on <canvas>, light up in little clusters around the cursor,
 * and drift with a soft parallax. When the footer scrolls into view the
 * display headings unmask character-by-character and the ASCII "hands" glide
 * in from the edges.
 *
 * Ported from the vanilla "LukeBaffait Animated Footer" (GSAP + canvas) into a
 * single, self-contained, prop-driven React component. No global smooth-scroll
 * or SplitText plugin required — the reveal is driven by an IntersectionObserver
 * and text is split in JSX.
 *
 * VENDORED, with three deliberate changes from the upstream Next.js/Tailwind
 * source. Kept in components/ui/ (not this repo's src/ui/) to mark it as
 * third-party: restyle it via props, not by editing it.
 *
 *  1. No `"use client"` — this is Vite, not Next's App Router.
 *  2. No `next-themes`. Upstream reads `resolvedTheme` for one thing: picking
 *     light-vs-dark DEFAULTS for charColor / hoverCharColor. This app has no
 *     ThemeProvider and is permanently dark, and outside a provider useTheme()
 *     returns undefined -> it would silently choose the LIGHT defaults. The
 *     dark values are inlined below instead. Every one of them is overridable
 *     by prop, so no capability is lost.
 *  3. Tailwind utilities are replaced by real classes in styles/animated-footer.css.
 *     They are not cosmetic — `absolute inset-0`, `w-2/5` and above all the
 *     headings' `overflow-hidden` (which is what CLIPS the character reveal)
 *     are load-bearing. Change one, change the other; they are a pair.
 */

export interface AnimatedFooterProps {
  /** The large display words along the bottom edge. */
  headingLines?: string[];
  /** Left image URL, sampled into ASCII art. Must be same-origin or CORS-enabled. */
  leftImage?: string;
  /** Right image URL, sampled into ASCII art. Must be same-origin or CORS-enabled. */
  rightImage?: string;

  /** Footer background color. */
  background?: string;
  /** Text color for headings. Defaults to the stylesheet's white. */
  textColor?: string;

  /** Character ramp, ordered dark -> light, used to render the ASCII art. */
  asciiChars?: string;
  /** Color of the ASCII glyphs. Defaults to "#803500". */
  charColor?: string;
  /** Fill color of a highlighted (hovered) cell. Defaults to "#ff6a00". */
  hoverColor?: string;
  /** Glyph color inside a highlighted cell. Defaults to "#0f0f0f". */
  hoverCharColor?: string;
  /** Number of columns each image is sampled to. Defaults to 80. */
  columns?: number;
  /** Pixel size of each ASCII cell. Defaults to 20. */
  cellSize?: number;
  /** Font size (px) of the ASCII glyphs. Defaults to 18. */
  fontSize?: number;

  /** Pointer parallax strength in px; set to 0 to disable. Defaults to 20. */
  parallaxStrength?: number;
  /** Cursor influence radius, in cells, for the hover highlight. Defaults to 8. */
  hoverRadius?: number;

  /** Play the reveal when the footer scrolls into view (else show immediately). */
  revealOnScroll?: boolean;
  /** Controlled reveal — drive it from your own scroll state. */
  revealed?: boolean;

  /** Extra class names for the root element. */
  className?: string;
}

const DEFAULT_ASCII_CHARS = '........:::=+xX#0369';

const HIGHLIGHT_LIFETIME = 300; // ms a hovered cell stays lit
const CLUSTER_SIZE = 10; // max cells a hover ripple spreads across
const PARALLAX_EASE = 0.05;

/* ── Heading glitch (ADDED, not upstream) ──────────────────────────────
   The same character-scramble ripple the site uses on its nav and HUD labels
   (ui/fx/AsciiGlitchRipple), applied to the display word so the wordmark
   belongs to the ASCII art beside it instead of sitting on top of it.

   It drives the EXISTING [data-af-char] spans rather than owning a text node
   of its own — so it composes with the reveal (which tweens those same spans'
   yPercent) instead of fighting it, and it only ever swaps textContent, never
   layout. The accessible name is unaffected: the spans are aria-hidden and the
   real word lives on the h2's aria-label. */
const GLITCH_CHARS = '.,·-─~+:;=*π┐┌┘┴┬╗╔╝╚╬╠╣╩╦║░▒▓█▄▀▌▐■!?&#$@0123456789*';
const GLITCH_DUR = 900; // ms lifetime of one wave
const GLITCH_EDGE = 3; // only this many cells behind the wavefront scramble
const GLITCH_BUF = 5;

interface Cell {
  col: number;
  row: number;
  char: string;
  highlightEndTime: number;
}

interface Hand {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cells: Map<string, Cell>;
  cellList: Cell[];
  rows: number;
  columns: number;
  cellSize: number;
  baselineOffset: number;
}

/** Build the ASCII cell grid for one image by sampling its brightness. */
function buildHandCells(
  image: HTMLImageElement,
  columns: number,
  asciiChars: string
): { rows: number; cells: Map<string, Cell> } {
  const rows = Math.max(
    1,
    Math.round(columns / (image.naturalWidth / image.naturalHeight || 1))
  );

  const sampler = document.createElement('canvas');
  sampler.width = columns;
  sampler.height = rows;
  const sampleCtx = sampler.getContext('2d', { willReadFrequently: true });
  const cells = new Map<string, Cell>();
  if (!sampleCtx) return { rows, cells };

  sampleCtx.drawImage(image, 0, 0, columns, rows);
  const pixels = sampleCtx.getImageData(0, 0, columns, rows).data;
  const backgroundCharIndex = asciiChars.lastIndexOf('.');

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const offset = (row * columns + col) * 4;
      const brightness =
        (pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114) / 255;
      const charIndex = Math.min(
        asciiChars.length - 1,
        Math.floor((1 - brightness) * asciiChars.length)
      );
      if (charIndex <= backgroundCharIndex) continue;

      cells.set(`${col},${row}`, { col, row, char: asciiChars[charIndex], highlightEndTime: 0 });
    }
  }

  return { rows, cells };
}

/** Light up a wandering cluster of cells starting from `startCell`. */
function highlightCluster(cells: Map<string, Cell>, startCell: Cell) {
  const now = Date.now();
  startCell.highlightEndTime = now + HIGHLIGHT_LIFETIME;

  const steps = Math.floor(Math.random() * CLUSTER_SIZE) + 1;
  const litCells = [startCell];
  let current = startCell;

  for (let step = 0; step < steps; step++) {
    const neighbours: Cell[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const neighbour = cells.get(`${current.col + dx},${current.row + dy}`);
        if (neighbour && !litCells.includes(neighbour)) neighbours.push(neighbour);
      }
    }
    if (neighbours.length === 0) break;

    const next = neighbours[Math.floor(Math.random() * neighbours.length)];
    next.highlightEndTime = now + HIGHLIGHT_LIFETIME + step * 10;
    litCells.push(next);
    current = next;
  }
}

/** Nearest scrollable ancestor — used as the reveal's IntersectionObserver root. */
function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  let el = node?.parentElement ?? null;
  while (el) {
    const overflowY = getComputedStyle(el).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return el;
    el = el.parentElement;
  }
  return null;
}

export function AnimatedFooter({
  headingLines = ['VengeanceUI'],
  leftImage = '/animated-footer/hand-left.jpg',
  rightImage = '/animated-footer/hand-right.jpg',
  background,
  textColor,
  charColor,
  hoverColor,
  hoverCharColor,
  asciiChars = DEFAULT_ASCII_CHARS,
  columns = 80,
  cellSize = 20,
  fontSize = 18,
  parallaxStrength = 20,
  hoverRadius = 8,
  revealOnScroll = true,
  revealed,
  className,
}: AnimatedFooterProps) {
  const rootRef = useRef<HTMLElement>(null);
  const leftWrapRef = useRef<HTMLDivElement>(null);
  const rightWrapRef = useRef<HTMLDivElement>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);

  // Reveal animations, published by the main effect so the controlled-`revealed`
  // effect below can play them without rebuilding the ASCII scene.
  const animateInRef = useRef<() => void>(() => {});
  const animateOutRef = useRef<() => void>(() => {});

  // Upstream's dark-theme defaults, inlined — see note 2 in the header.
  const cc = charColor ?? '#803500';
  const hc = hoverColor ?? '#ff6a00';
  const hcc = hoverCharColor ?? '#0f0f0f';

  // Live-tunable values read inside the animation loop, so tweaking a color or
  // the parallax strength never tears down and rebuilds the ASCII scene.
  const liveRef = useRef({
    charColor: cc,
    hoverColor: hc,
    hoverCharColor: hcc,
    parallaxStrength,
    hoverRadius,
  });
  useEffect(() => {
    liveRef.current = {
      charColor: cc,
      hoverColor: hc,
      hoverCharColor: hcc,
      parallaxStrength,
      hoverRadius,
    };
  }, [cc, hc, hcc, parallaxStrength, hoverRadius]);

  // A signature of the structural inputs — the scene rebuilds only when one of
  // these changes (images, grid resolution, content, reveal mode).
  const sig = useMemo(
    () =>
      JSON.stringify({
        leftImage,
        rightImage,
        columns,
        cellSize,
        fontSize,
        asciiChars,
        revealOnScroll,
        headingLines,
      }),
    [leftImage, rightImage, columns, cellSize, fontSize, asciiChars, revealOnScroll, headingLines]
  );

  useEffect(() => {
    const root = rootRef.current;
    const leftWrap = leftWrapRef.current;
    const rightWrap = rightWrapRef.current;
    if (!root || !leftWrap || !rightWrap) return;

    const hands: Hand[] = [];
    const wrappers = [leftWrap, rightWrap];

    // ── ASCII hands ──────────────────────────────────────────────────────
    const setupHand = (image: HTMLImageElement, canvas: HTMLCanvasElement) => {
      const { rows, cells } = buildHandCells(image, columns, asciiChars);
      if (cells.size === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = columns * cellSize * dpr;
      canvas.height = rows * cellSize * dpr;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      const metrics = ctx.measureText('X');
      const glyphHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      const baselineOffset = cellSize / 2 + glyphHeight / 2 - metrics.actualBoundingBoxDescent;

      hands.push({
        canvas,
        ctx,
        cells,
        cellList: [...cells.values()],
        rows,
        columns,
        cellSize,
        baselineOffset,
      });
    };

    const loadHand = (src: string, canvas: HTMLCanvasElement) => {
      if (!src) return;
      const image = new Image();
      image.crossOrigin = 'anonymous';
      let initialized = false;
      const init = () => {
        if (initialized) return;
        initialized = true;
        setupHand(image, canvas);
      };
      image.onload = init;
      image.src = src;
      if (image.complete && image.naturalWidth) init();
    };
    loadHand(leftImage, leftCanvasRef.current!);
    loadHand(rightImage, rightCanvasRef.current!);

    const renderHand = (hand: Hand, now: number) => {
      const { ctx, cellList, cellSize: cs, baselineOffset, columns: cols, rows } = hand;
      const { charColor: lcc, hoverColor: lhc, hoverCharColor: lhcc } = liveRef.current;
      ctx.clearRect(0, 0, cols * cs, rows * cs);

      for (const cell of cellList) {
        const x = cell.col * cs;
        const y = cell.row * cs;
        const isHighlighted = cell.highlightEndTime > now;

        if (isHighlighted) {
          ctx.fillStyle = lhc;
          ctx.fillRect(x, y, cs, cs);
        }
        ctx.fillStyle = isHighlighted ? lhcc : lcc;
        ctx.fillText(cell.char, x + cs / 2, y + baselineOffset);
      }
    };

    // ── Pointer: hover highlight + parallax target ───────────────────────
    const pointer = { x: 0, y: 0 };
    const drift = { x: 0, y: 0 };
    // Reveal "curtain": hands start pushed off the edges and slide to 0.
    const curtain = { offset: revealOnScroll ? 125 : 0 };

    // ADDED (not upstream): this footer sits below a full-screen WebGL hero
    // that owns the frame budget. Upstream runs its canvas loop and a
    // per-mousemove O(cells) nearest-cell scan for the entire session, even
    // parked far below the fold. This flag suspends both while the footer is
    // nowhere near the viewport. The margin is generous so the loop is already
    // running well before the reveal's 0.35 threshold fires — the reveal is
    // applied BY this loop, so gating it too tightly would eat the animation.
    let onScreen = false;
    const proximity = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) onScreen = entry.isIntersecting;
      },
      { root: getScrollParent(root), rootMargin: '300px', threshold: 0 }
    );
    proximity.observe(root);

    const hoverHand = (hand: Hand, clientX: number, clientY: number) => {
      const rect = hand.canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const mouseCol = ((clientX - rect.left) / rect.width) * hand.columns;
      const mouseRow = ((clientY - rect.top) / rect.height) * hand.rows;

      let closest: Cell | null = null;
      let closestDist = Infinity;
      for (const cell of hand.cellList) {
        const dx = mouseCol - cell.col;
        const dy = mouseRow - cell.row;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closest = cell;
        }
      }
      if (closest && closestDist <= liveRef.current.hoverRadius) {
        highlightCluster(hand.cells, closest);
      }
    };

    // ── Heading glitch ───────────────────────────────────────────────────
    // Drives the reveal's own spans (see GLITCH_CHARS note above).
    const glyphSpans = Array.from(root.querySelectorAll<HTMLElement>('[data-af-char]'));
    const glyphOriginals = glyphSpans.map((el) => el.textContent ?? '');
    const glitchWaves: Array<{ start: number; at: number }> = [];
    let glitchCursor = -1;
    let glitchDirty = false;

    /** Spawn a wave from whichever character the cursor is nearest. */
    const glitchAt = (clientX: number, clientY: number) => {
      let nearest = -1;
      let best = Infinity;
      for (let i = 0; i < glyphSpans.length; i++) {
        const r = glyphSpans[i].getBoundingClientRect();
        if (r.width === 0) continue;
        const dx = clientX - (r.left + r.width / 2);
        const dy = clientY - (r.top + r.height / 2);
        const d = dx * dx + dy * dy;
        if (d < best) {
          best = d;
          nearest = i;
        }
      }
      // One wave per character crossed, not one per mousemove event.
      if (nearest < 0 || nearest === glitchCursor) return;
      glitchCursor = nearest;
      glitchWaves.push({ start: nearest, at: performance.now() });
    };

    /** Advance every live wave and write the scrambled glyphs. */
    const renderGlitch = (now: number) => {
      for (let i = glitchWaves.length - 1; i >= 0; i--) {
        if (now - glitchWaves[i].at >= GLITCH_DUR) glitchWaves.splice(i, 1);
      }
      if (glitchWaves.length === 0) {
        // Restore exactly once, not every frame.
        if (glitchDirty) {
          for (let i = 0; i < glyphSpans.length; i++) {
            glyphSpans[i].textContent = glyphOriginals[i];
          }
          glitchDirty = false;
        }
        return;
      }
      glitchDirty = true;
      for (let i = 0; i < glyphSpans.length; i++) {
        let ch = glyphOriginals[i];
        for (const w of glitchWaves) {
          const age = now - w.at;
          const dist = Math.abs(i - w.start);
          const maxDist = Math.max(w.start, glyphSpans.length - w.start - 1);
          // Only the leading EDGE scrambles; everything the wave has passed
          // settles back — that is what reads as a travelling ripple.
          const intens = (age / GLITCH_DUR) * (maxDist + GLITCH_BUF) - dist;
          if (intens > 0 && intens <= GLITCH_EDGE) {
            ch = GLITCH_CHARS[(dist * 3 + Math.floor(age / 40)) % GLITCH_CHARS.length];
          }
        }
        if (glyphSpans[i].textContent !== ch) glyphSpans[i].textContent = ch;
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!onScreen) return;
      glitchAt(event.clientX, event.clientY);
      const strength = liveRef.current.parallaxStrength;
      const rect = root.getBoundingClientRect();
      const w = rect.width || 1;
      const h = rect.height || 1;
      pointer.x = ((event.clientX - rect.left) / w - 0.5) * strength * 2;
      pointer.y = ((event.clientY - rect.top) / h - 0.5) * strength * 2;
      for (const hand of hands) hoverHand(hand, event.clientX, event.clientY);
    };
    window.addEventListener('mousemove', onMouseMove);

    // ── Unified render loop: ASCII + parallax + reveal curtain ───────────
    let rafId = 0;
    const frame = () => {
      rafId = requestAnimationFrame(frame);
      if (!onScreen) return;

      const now = Date.now();
      for (const hand of hands) renderHand(hand, now);
      renderGlitch(performance.now());

      drift.x += (pointer.x - drift.x) * PARALLAX_EASE;
      drift.y += (pointer.y - drift.y) * PARALLAX_EASE;
      const strength = liveRef.current.parallaxStrength;
      const scale = 1 + (strength * 2) / 200;

      wrappers.forEach((wrapper, i) => {
        const dir = i === 0 ? 1 : -1;
        const revealX = i === 0 ? -curtain.offset : curtain.offset;
        const x = drift.x * dir || 0;
        const y = -drift.y || 0;
        // Reveal via translateX, then parallax via translate — avoids
        // calc() mixed-unit bugs.
        wrapper.style.transform = `translateX(${revealX}%) translate(${x}px, ${y}px) scale(${scale})`;
      });
    };
    rafId = requestAnimationFrame(frame);

    // ── Reveal (chars + curtain) ─────────────────────────────────────────
    const chars = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('[data-af-char]'));

    const animateIn = () => {
      gsap.to(curtain, { offset: 0, duration: 1, ease: 'power3.out', overwrite: true });
      gsap.to(chars, {
        yPercent: 0,
        duration: 1,
        ease: 'power3.out',
        stagger: { each: 0.04, from: 'center' },
        overwrite: true,
      });
    };

    const animateOut = () => {
      gsap.to(curtain, { offset: 125, duration: 0.4, ease: 'power2.in', overwrite: true });
      gsap.to(chars, {
        yPercent: 125,
        duration: 0.4,
        ease: 'power2.in',
        stagger: { each: 0.01, from: 'center' },
        overwrite: true,
      });
    };

    // Publish for the controlled-`revealed` effect.
    animateInRef.current = animateIn;
    animateOutRef.current = animateOut;

    const maskAll = () => gsap.set(chars, { yPercent: 125 });
    const showAll = () => gsap.set(chars, { yPercent: 0 });

    let observer: IntersectionObserver | null = null;

    if (revealed !== undefined) {
      // Controlled: the `revealed` effect below drives the reveal.
      curtain.offset = revealed ? 0 : 125;
      if (revealed) showAll();
      else maskAll();
    } else if (revealOnScroll) {
      maskAll();
      let isRevealed = false;
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && !isRevealed) {
              isRevealed = true;
              animateIn();
            } else if (!entry.isIntersecting && isRevealed) {
              isRevealed = false;
              animateOut();
            }
          }
        },
        { root: getScrollParent(root), threshold: 0.35 }
      );
      observer.observe(root);
    } else {
      showAll();
    }

    // ── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      observer?.disconnect();
      proximity.disconnect();
      gsap.killTweensOf([curtain, ...chars]);
    };
    // Rebuild only when a structural input changes; live values flow via liveRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // Controlled reveal: play in/out to match the `revealed` prop without
  // rebuilding the scene. Ignored entirely when `revealed` is undefined.
  useEffect(() => {
    if (revealed === undefined) return;
    if (revealed) animateInRef.current();
    else animateOutRef.current();
  }, [revealed]);

  // Whether the content starts masked on first paint (avoids a flash before the
  // effect runs): hidden unless it's meant to be shown immediately.
  const startsHidden = revealed !== undefined ? !revealed : revealOnScroll;
  const offEdge = startsHidden ? 125 : 0;

  return (
    <footer
      ref={rootRef}
      className={cn('cy-af', className)}
      style={{ backgroundColor: background, color: textColor, containerType: 'inline-size' }}
    >
      {/* ASCII hands */}
      <div className="cy-af__hands">
        <div
          ref={leftWrapRef}
          className="cy-af__hand"
          style={{ transform: `translateX(-${offEdge}%)` }}
        >
          <canvas ref={leftCanvasRef} className="cy-af__canvas" />
        </div>
        <div
          ref={rightWrapRef}
          className="cy-af__hand"
          style={{ transform: `translateX(${offEdge}%)` }}
        >
          <canvas ref={rightCanvasRef} className="cy-af__canvas" />
        </div>
      </div>

      {/* Display headings */}
      <div className="cy-af__headings">
        {headingLines.map((word, wi) => (
          <h2 key={`${word}-${wi}`} aria-label={word} className="cy-af__heading">
            {Array.from(word).map((ch, ci) => (
              <span key={ci} data-af-char aria-hidden="true" className="cy-af__char">
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </h2>
        ))}
      </div>
    </footer>
  );
}

export default AnimatedFooter;
