import gsap from 'gsap';
import { useStore } from '../../state/store';

/**
 * Builds the single master timeline for a dossier panel from its data-anim
 * annotations, in DOM order. The classified OS retrieves information in
 * stages: settle → grid draws itself → scanline → titles mask-reveal → rows
 * type themselves → bars flow → fingerprint scans → visuals resolve.
 *
 * Build only. Dismissal is owned by DossierPanel, which kills this timeline
 * and plays a short wind-down rather than reversing the construction.
 */
export function buildPanelTimeline(root: HTMLElement): gsap.core.Timeline {
  const reduced = useStore.getState().reducedMotion;

  const tl = gsap.timeline({ paused: true });

  if (reduced) {
    // Counter nodes are rendered EMPTY — the timeline normally fills them.
    // With the timeline skipped, write the final values directly or they stay
    // blank to sighted users (the value would survive only for AT).
    root.querySelectorAll<HTMLElement>('[data-anim="count"]').forEach((el) => {
      const target = el.querySelector<HTMLElement>('.count-anim');
      if (!target) return;
      const to = parseFloat(el.dataset.to ?? '0');
      const decimals = parseInt(el.dataset.decimals ?? '0', 10);
      target.textContent = to.toFixed(decimals) + (el.dataset.suffix ?? '');
    });
    tl.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.22, ease: 'power1.out' });
    return tl;
  }

  // Stage 1 — the panel surface materializes.
  tl.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' }, 0);

  const grid = root.querySelectorAll<SVGPathElement>('.cy-dossier__grid line, .cy-dossier__grid path');
  if (grid.length) {
    gsap.set(grid, { strokeDasharray: 1, strokeDashoffset: 1 });
    tl.to(grid, { strokeDashoffset: 0, duration: 0.55, ease: 'power1.inOut', stagger: 0.045 }, 0.25);
  }

  const scan = root.querySelector<HTMLElement>('.cy-dossier__scan');
  if (scan) {
    tl.fromTo(
      scan,
      { top: '0%', opacity: 1 },
      { top: '96%', duration: 0.8, ease: 'none' },
      0.5
    );
    tl.to(scan, { opacity: 0, duration: 0.18 }, 1.28);
  }

  const head = root.querySelector<HTMLElement>('.cy-dossier__head');
  if (head) {
    tl.fromTo(
      head,
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)', duration: 0.5, ease: 'expo.out' },
      0.35
    );
  }

  // Stage 2 — content constructs itself in DOM order.
  let pos = 0.85;
  const items = root.querySelectorAll<HTMLElement>('.cy-dossier__body [data-anim]');

  // Density compensation: the boards differ in module count, and a fixed
  // per-item stagger would make the dense one crawl (and its reversed close
  // outlast the visitor's patience). Tighten the step as the count grows so
  // total construction time stays bounded — pacing, not choreography, changes.
  const density = Math.min(1, 30 / Math.max(items.length, 1));
  /** Advance the playhead by a density-scaled step. */
  const step = (n: number) => {
    pos += n * density;
  };

  items.forEach((el) => {
    const kind = el.dataset.anim;
    switch (kind) {
      case 'mask': {
        tl.fromTo(
          el,
          { clipPath: 'inset(0 0 100% 0)', y: 6, opacity: 0 },
          { clipPath: 'inset(0 0 -8% 0)', y: 0, opacity: 1, duration: 0.42, ease: 'expo.out' },
          pos
        );
        step(0.09);
        break;
      }
      case 'type': {
        const chars = el.querySelectorAll<HTMLElement>('.char');
        if (!chars.length) break;
        tl.fromTo(
          chars,
          { opacity: 0 },
          { opacity: 1, duration: 0.012, stagger: 0.016, ease: 'none' },
          pos
        );
        step(Math.min(0.02 + chars.length * 0.006, 0.14));
        break;
      }
      case 'count': {
        const to = parseFloat(el.dataset.to ?? '0');
        const decimals = parseInt(el.dataset.decimals ?? '0', 10);
        const suffix = el.dataset.suffix ?? '';
        // Write into the dedicated aria-hidden node — never the span root,
        // which also carries the visually-hidden real value for AT.
        const target = el.querySelector<HTMLElement>('.count-anim') ?? el;
        const proxy = { v: 0 };
        tl.fromTo(
          proxy,
          { v: 0 },
          {
            v: to,
            duration: 1.0,
            ease: 'power1.inOut',
            onUpdate: () => {
              target.textContent = proxy.v.toFixed(decimals) + suffix;
            },
          },
          pos
        );
        step(0.1);
        break;
      }
      case 'bar': {
        const value = parseFloat(el.dataset.value ?? '1');
        const fill = el.querySelector('i') ?? el;
        tl.fromTo(
          fill,
          { scaleX: 0 },
          { scaleX: el.querySelector('i') ? value : 1, duration: 0.6, ease: 'power2.out' },
          pos
        );
        step(0.05);
        break;
      }
      case 'draw': {
        const paths = el.querySelectorAll<SVGPathElement>('path, ellipse, circle');
        if (!paths.length) break;
        gsap.set(paths, { strokeDasharray: 1, strokeDashoffset: 1, opacity: 1 });
        tl.to(paths, { strokeDashoffset: 0, duration: 1.1, ease: 'power1.inOut', stagger: 0.05 }, pos);
        step(0.16);
        break;
      }
      case 'scanline': {
        tl.fromTo(
          el,
          { top: '2%', opacity: 0.9 },
          { top: '96%', opacity: 0.9, duration: 1.1, ease: 'sine.inOut' },
          pos
        );
        tl.to(el, { opacity: 0, duration: 0.2 }, pos + 1.12);
        break; // rides alongside the fingerprint draw — no pos advance
      }
      case 'fade':
      default: {
        tl.fromTo(
          el,
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' },
          pos
        );
        step(0.055);
        break;
      }
    }
  });

  return tl;
}
