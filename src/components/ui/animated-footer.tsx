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
  dpr: number;
  /** The resting art, rasterised ONCE. See renderHand. */
  base: HTMLCanvasElement;
  /** Colour `base` was painted in, so it is only repainted if that changes. */
  baseColor: string;
  /** Date.now() past which no cell is lit — an O(1) "is anything happening". */
  litUntil: number;
  /** True when the visible canvas already matches the resting art. */
  clean: boolean;
  /** Cached bounds; refreshed on scroll/resize, not per pointer event. */
  rect: DOMRect | null;
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
    // Every getBoundingClientRect() forces layout. Upstream called one per hand
    // on EVERY mousemove, which is a reflow storm during a cursor sweep. Bounds
    // only actually change on scroll/resize, so they are cached and refreshed
    // at most once a frame, and only when something moved.
    let rectsDirty = true;

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

      // Offscreen twin holding the resting art (see renderHand).
      const base = document.createElement('canvas');
      base.width = canvas.width;
      base.height = canvas.height;

      hands.push({
        canvas,
        ctx,
        cells,
        cellList: [...cells.values()],
        rows,
        columns,
        cellSize,
        baselineOffset,
        dpr,
        base,
        baseColor: '',
        litUntil: 0,
        clean: false,
        rect: null,
      });
      rectsDirty = true;
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

    /** Rasterise the resting art once into the offscreen twin. */
    const paintBase = (hand: Hand, color: string) => {
      const { base, cellSize: cs, baselineOffset, columns: cols, rows, cellList, dpr } = hand;
      const bctx = base.getContext('2d');
      if (!bctx) return;
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, cols * cs, rows * cs);
      bctx.font = `${fontSize}px monospace`;
      bctx.textAlign = 'center';
      bctx.textBaseline = 'alphabetic';
      bctx.fillStyle = color;
      for (const cell of cellList) {
        bctx.fillText(cell.char, cell.col * cs + cs / 2, cell.row * cs + baselineOffset);
      }
      hand.baseColor = color;
    };

    /**
     * PERFORMANCE: upstream re-issued a fillText for EVERY cell EVERY frame —
     * ~4000 text draws per hand, ~8000 per frame, forever, on canvases that are
     * 3200px wide. That is the footer's entire cost and it is almost all waste:
     * the art never changes. Only the handful of cursor-lit cells do.
     *
     * So the resting art is rasterised once into an offscreen canvas, and a
     * frame is now either
     *   - nothing at all (no cell lit and the canvas already correct), or
     *   - one blit of the cached art plus a redraw of the <=11 lit cells.
     *
     * Identical output, and the idle cost drops to zero. No feature is lost:
     * the hover clusters, the ramp and the parallax all behave exactly as before.
     */
    const renderHand = (hand: Hand, now: number) => {
      const { charColor: lcc, hoverColor: lhc, hoverCharColor: lhcc } = liveRef.current;
      if (hand.baseColor !== lcc) {
        paintBase(hand, lcc);
        hand.clean = false;
      }

      const lit = now <= hand.litUntil;
      // Resting, and the canvas already shows the resting art — draw nothing.
      if (!lit && hand.clean) return;

      const { ctx, cellSize: cs, baselineOffset, columns: cols, rows } = hand;
      ctx.clearRect(0, 0, cols * cs, rows * cs);
      ctx.drawImage(hand.base, 0, 0, cols * cs, rows * cs);

      if (lit) {
        for (const cell of hand.cellList) {
          if (cell.highlightEndTime <= now) continue;
          const x = cell.col * cs;
          const y = cell.row * cs;
          ctx.fillStyle = lhc;
          ctx.fillRect(x, y, cs, cs);
          ctx.fillStyle = lhcc;
          ctx.fillText(cell.char, x + cs / 2, y + baselineOffset);
        }
      }
      // One final clean-up pass runs after the last highlight expires, then the
      // canvas is left untouched until the cursor returns.
      hand.clean = !lit;
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

    /**
     * PERFORMANCE: upstream scanned ALL ~4000 cells with a Math.sqrt each, per
     * hand, on every single mousemove. The cells sit on a regular grid, so the
     * cursor's cell can be indexed directly — only the neighbourhood within
     * hoverRadius can possibly win, and anything outside it was going to be
     * rejected by the radius test anyway. ~289 map lookups instead of ~8000
     * distance computations, with identical results.
     */
    const hoverHand = (hand: Hand, clientX: number, clientY: number) => {
      const rect = hand.rect;
      if (!rect || rect.width === 0 || rect.height === 0) return;
      const mouseCol = ((clientX - rect.left) / rect.width) * hand.columns;
      const mouseRow = ((clientY - rect.top) / rect.height) * hand.rows;

      const radius = liveRef.current.hoverRadius;
      const r = Math.ceil(radius);
      const c0 = Math.round(mouseCol);
      const r0 = Math.round(mouseRow);

      let closest: Cell | null = null;
      let closestSq = Infinity;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const cell = hand.cells.get(`${c0 + dx},${r0 + dy}`);
          if (!cell) continue;
          const ex = mouseCol - cell.col;
          const ey = mouseRow - cell.row;
          const sq = ex * ex + ey * ey;
          if (sq < closestSq) {
            closestSq = sq;
            closest = cell;
          }
        }
      }

      if (closest && closestSq <= radius * radius) {
        highlightCluster(hand.cells, closest);
        // O(1) "something is lit until" marker so renderHand can skip whole
        // frames without inspecting every cell.
        hand.litUntil = Date.now() + HIGHLIGHT_LIFETIME + CLUSTER_SIZE * 10;
      }
    };

    // ── Heading glitch ───────────────────────────────────────────────────
    // Drives the reveal's own spans (see GLITCH_CHARS note above).
    const glyphSpans = Array.from(root.querySelectorAll<HTMLElement>('[data-af-char]'));
    const glyphOriginals = glyphSpans.map((el) => el.textContent ?? '');
    const glitchWaves: Array<{ start: number; at: number }> = [];
    let glitchCursor = -1;
    let glitchDirty = false;

    // Cached alongside the hand bounds — same reflow argument.
    let glyphRects: DOMRect[] = [];

    /** Spawn a wave from whichever character the cursor is nearest. */
    const glitchAt = (clientX: number, clientY: number) => {
      let nearest = -1;
      let best = Infinity;
      for (let i = 0; i < glyphRects.length; i++) {
        const r = glyphRects[i];
        if (!r || r.width === 0) continue;
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
    // Bounds move only when the page scrolls or the window resizes; both are
    // passive and merely flag, so no layout is read inside the event itself.
    const invalidateRects = () => {
      rectsDirty = true;
    };
    window.addEventListener('scroll', invalidateRects, { passive: true });
    window.addEventListener('resize', invalidateRects);

    let rafId = 0;
    const frame = () => {
      rafId = requestAnimationFrame(frame);
      if (!onScreen) return;

      // At most one batched layout read per frame, instead of one per hand per
      // pointer event.
      if (rectsDirty) {
        rectsDirty = false;
        for (const hand of hands) hand.rect = hand.canvas.getBoundingClientRect();
        glyphRects = glyphSpans.map((el) => el.getBoundingClientRect());
      }

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
      window.removeEventListener('scroll', invalidateRects);
      window.removeEventListener('resize', invalidateRects);
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
