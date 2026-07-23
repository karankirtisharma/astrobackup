import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useStore, send } from '../../state/store';
import { protocolStartedAt } from '../../motion/conductor';
import { SYNC_DURATION } from '../../state/syncSim';
import { COMPLETE_CHECKLIST, SIDE_STATUS } from '../../config/content';
import { md } from '../../motion/motionConfig';
import { MergePanel } from './MergePanel';

type HeaderMode = 'initiated' | 'merging' | 'complete';

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/**
 * The ceremony overlay: PROTOCOL INITIATED → MERGING IDENTITIES →
 * PROTOCOL COMPLETE. All per-frame numbers flow through transient zustand
 * subscriptions writing textContent/transform directly — React only ever
 * re-renders on discrete phase changes.
 */
export function SyncOverlay() {
  const scene = useStore((s) => s.scene);
  const phase = useStore((s) => s.phase);
  const root = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLElement>(null);
  const etaRef = useRef<HTMLElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(performance.now());
  const lastPct = useRef(-1);
  const lastMilestone = useRef(0);
  const stampedRun = useRef(0);
  const [header, setHeader] = useState<HeaderMode>('initiated');
  const [elapsed, setElapsed] = useState('00:00:00:00');

  // Stays mounted through scrollStory so returning from the manifesto never
  // replays the staged entrance — it merely fades back in.
  const mounted =
    scene === 'protocolInitiated' ||
    scene === 'synchronization' ||
    scene === 'protocolComplete' ||
    scene === 'scrollStory';
  const ceremony =
    scene === 'protocolInitiated' || scene === 'synchronization' || scene === 'protocolComplete';
  const complete = scene === 'protocolComplete' || scene === 'scrollStory';
  const syncing = scene === 'synchronization';
  const inStory = scene === 'scrollStory';

  // ——— per-frame readouts, zero React churn ———
  // CONTRACT: every node written here is rendered EMPTY by React — imperative
  // text must never share a node with React-rendered text (removeChild crash).
  useEffect(() => {
    if (!mounted) return;
    startedAt.current = performance.now();
    lastPct.current = -1;
    lastMilestone.current = 0;

    const apply = (m: number) => {
      // The meter advances EVERY frame, not just on whole-percent ticks — it is
      // a continuous mark and would visibly step at 1% granularity. Transform
      // only, so a per-frame write costs no layout.
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${m})`;

      const pct = Math.floor(m * 100);
      if (pct !== lastPct.current) {
        lastPct.current = pct;
        if (pctRef.current) pctRef.current.textContent = pad(pct);
        if (etaRef.current) {
          // A clock rather than "12.4 SECS": the slab reads as an instrument,
          // and fixed-width MM:SS:CS never reflows the centred column as the
          // digits change.
          const rem = Math.max((1 - m) * SYNC_DURATION, 0);
          etaRef.current.textContent = `${pad(Math.floor(rem / 60))}:${pad(
            Math.floor(rem % 60)
          )}:${pad(Math.floor((rem % 1) * 100))}`;
        }
        // milestone announcements for screen readers
        if (pct >= lastMilestone.current + 25 && liveRef.current) {
          lastMilestone.current = Math.floor(pct / 25) * 25;
          liveRef.current.textContent = `Synchronization ${lastMilestone.current} percent`;
        }
      }
      if (m >= 0.25) setHeader((h) => (h === 'initiated' ? 'merging' : h));
    };

    apply(useStore.getState().syncMaster);
    return useStore.subscribe((s) => s.syncMaster, apply);
  }, [mounted]);

  // Each new ceremony resets the header ratchet.
  useEffect(() => {
    if (scene === 'protocolInitiated') setHeader('initiated');
  }, [scene]);

  // completion stamp + header — the stamp is frozen once per protocol run,
  // so revisiting from the manifesto never rewrites the record.
  useEffect(() => {
    if (!complete) return;
    setHeader('complete');
    if (stampedRun.current !== protocolStartedAt) {
      stampedRun.current = protocolStartedAt;
      const ms = performance.now() - (protocolStartedAt || startedAt.current);
      const cs = Math.floor((ms % 1000) / 10);
      const s = Math.floor(ms / 1000) % 60;
      const min = Math.floor(ms / 60000) % 60;
      const h = Math.floor(ms / 3600000);
      setElapsed(`${pad(h)}:${pad(min)}:${pad(s)}:${pad(cs)}`);
      if (liveRef.current) {
        liveRef.current.textContent = 'Protocol complete. Scroll to continue.';
      }
    }
  }, [complete]);

  // ——— entrances, coordinated with the conductor's protocol timeline ———
  useGSAP(
    () => {
      if (!mounted || !root.current) return;
      const q = gsap.utils.selector(root.current);
      gsap.set(root.current, { autoAlpha: 1 });
      gsap.fromTo(
        q('.cy-sync__header > *'),
        { opacity: 0, clipPath: 'inset(0 0 100% 0)', y: 8 },
        {
          opacity: 1,
          clipPath: 'inset(0 0 -10% 0)',
          y: 0,
          duration: md(0.6),
          ease: 'expo.out',
          stagger: 0.12,
          delay: md(0.8),
        }
      );
      // The slab arrives as one object, then fills. Exponential ease-out, not
      // the previous back.out overshoot — a 1180px instrument panel that
      // bounces reads as a toy.
      gsap.fromTo(
        q('.cy-sync__panel, .cy-merge__frame'),
        { opacity: 0, scale: 0.97, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: md(0.7), ease: 'expo.out', delay: md(1.15) }
      );
      gsap.fromTo(
        q('.cy-merge__plate, .cy-merge__readout'),
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: md(0.55), ease: 'expo.out', stagger: 0.08, delay: md(1.4) }
      );
      gsap.fromTo(
        q('.cy-sync__corner'),
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: md(0.4), ease: 'expo.out', stagger: 0.08, delay: md(1.35) }
      );
      gsap.fromTo(
        q('.cy-sync__cancel'),
        { opacity: 0 },
        { opacity: 1, duration: md(0.4), delay: md(1.9) }
      );
    },
    { dependencies: [mounted], scope: root, revertOnUpdate: true }
  );

  // task list + side columns appear when synchronization begins
  useGSAP(
    () => {
      if (!syncing || !root.current) return;
      const q = gsap.utils.selector(root.current);
      // The scale draws itself in as the merge actually starts, so the meter
      // reads as arming rather than simply existing.
      gsap.fromTo(
        q('.cy-merge__ticks i'),
        { opacity: 0, scaleY: 0.3 },
        { opacity: 1, scaleY: 1, duration: md(0.35), ease: 'expo.out', stagger: 0.025 }
      );
      gsap.fromTo(
        q('.cy-merge__cross'),
        { opacity: 0 },
        { opacity: 0.55, duration: md(0.4), ease: 'power2.out', stagger: 0.05 }
      );
    },
    { dependencies: [syncing], scope: root, revertOnUpdate: true }
  );

  // Header swaps crossfade — hard React text swaps must still enter softly.
  useGSAP(
    () => {
      if (!mounted || !root.current) return;
      const q = gsap.utils.selector(root.current);
      gsap.fromTo(
        q('.cy-sync__header > *'),
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: md(0.5), ease: 'expo.out', stagger: 0.08, overwrite: 'auto' }
      );
    },
    { dependencies: [header], scope: root, revertOnUpdate: true }
  );

  // The manifesto slides over the hero — the ceremony chrome bows out and
  // returns without replaying its entrance.
  useGSAP(
    () => {
      if (!mounted || !root.current) return;
      if (inStory) {
        gsap.to(root.current, { autoAlpha: 0, duration: md(0.5), ease: 'power2.inOut', overwrite: 'auto' });
      } else if (complete) {
        gsap.to(root.current, { autoAlpha: 1, duration: md(0.5), ease: 'power2.out', overwrite: 'auto' });
      }
    },
    { dependencies: [inStory, mounted], scope: root }
  );

  // completion choreography
  useGSAP(
    () => {
      if (!complete || !root.current) return;
      const q = gsap.utils.selector(root.current);
      gsap.fromTo(
        q('.cy-sync__ok, .cy-sync__stamp'),
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: md(0.5), ease: 'expo.out', stagger: 0.08, delay: md(0.3) }
      );
      const chevrons = q('.cy-sync__glyph path');
      gsap.set(chevrons, { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.to(chevrons, {
        strokeDashoffset: 0,
        duration: md(0.8),
        ease: 'expo.out',
        stagger: 0.1,
        delay: md(0.35),
      });
      gsap.fromTo(
        q('.cy-sync__glyph'),
        { opacity: 0, scale: 0.85 },
        { opacity: 1, scale: 1, duration: md(0.7), ease: 'expo.out', delay: md(0.3) }
      );
      gsap.fromTo(
        q('.cy-checklist .cy-task'),
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: md(0.4), ease: 'power2.out', stagger: 0.06, delay: md(0.45) }
      );
      gsap.fromTo(
        q('.cy-checklist .t-bar i'),
        { scaleX: 0 },
        { scaleX: 1, duration: md(0.5), ease: 'power2.out', stagger: 0.06, delay: md(0.55) }
      );
      gsap.fromTo(
        q('.cy-sync__ready'),
        { opacity: 0 },
        { opacity: 1, duration: md(0.5), delay: md(1.3) }
      );
    },
    { dependencies: [complete], scope: root, revertOnUpdate: true }
  );

  // cancel wind-down: the overlay bows out while the conductor unwinds the world
  useGSAP(
    () => {
      if (mounted && phase === 'exiting' && root.current) {
        gsap.to(root.current, { autoAlpha: 0, duration: md(0.5), ease: 'power2.in' });
      }
    },
    { dependencies: [phase, mounted], scope: root }
  );

  if (!mounted) return null;

  return (
    <div className="cy-sync" ref={root} style={{ opacity: 0 }}>
      <div className="visually-hidden" aria-live="polite" ref={liveRef} />

      {/* Only the completion header survives as a standalone stack. During the
          ceremony the merge slab states the phase itself, and repeating
          "MERGING IDENTITIES" above a panel that already says it was the old
          overlay's core problem: the same fact announced three times. */}
      <div className="cy-sync__header" aria-hidden="true">
        {header === 'complete' && (
          <>
            <div className="cy-sync__title cy-sync__title--green">PROTOCOL COMPLETE</div>
            <div className="cy-sync__ver" style={{ color: 'var(--text-hi)', fontSize: 11 }}>
              CYPHERNAUT IDENTITY SYNCHRONIZED
            </div>
          </>
        )}
      </div>

      {/* the merged-identity glyph over the core */}
      {complete && (
        <svg
          className="cy-sync__glyph"
          width="72"
          height="52"
          viewBox="0 0 72 52"
          fill="none"
          aria-hidden="true"
        >
          <path d="M 26 6 L 8 26 L 26 46" stroke="currentColor" strokeWidth="5" pathLength={1} />
          <path d="M 46 6 L 64 26 L 46 46" stroke="currentColor" strokeWidth="5" pathLength={1} />
        </svg>
      )}

      <div
        className={`cy-sync__center${complete ? '' : ' cy-sync__center--merge'}`}
        aria-hidden="true"
      >
        {!complete ? (
          <MergePanel pctRef={pctRef} etaRef={etaRef} fillRef={fillRef} syncing={syncing} />
        ) : (
          <>
            <div className="cy-sync__panel cy-checklist">
              <div className="cy-sync__ok">ALL SYSTEMS OPERATIONAL</div>
              {COMPLETE_CHECKLIST.map((t) => (
                <div className="cy-task" key={t}>
                  <span className="t-label">{t}</span>
                  <span className="t-bar">
                    <i style={{ transform: 'scaleX(1)' }} />
                  </span>
                  <span className="t-pct num">100%</span>
                </div>
              ))}
              <div className="cy-sync__stamp">
                <span>COMPLETION TIME</span>
                <b className="num">{elapsed}</b>
              </div>
            </div>
            <div className="cy-sync__ready">
              <div className="r1">READY TO PROCEED</div>
              <div className="r2">SCROLL TO CONTINUE</div>
            </div>
          </>
        )}
      </div>

      {/* Side identity columns — completion only. During the merge the slab's
          own plates name both identities; a second set of identity columns
          flanking it was pure redundancy. */}
      {complete && (
        <>
          <div className="cy-sync__side cy-sync__side--left" aria-hidden="true">
            <div className="s-title">
              CYPHERPUNK <span>{complete ? '// STATUS: SYNCHRONIZED' : '// ORIGIN: UNKNOWN'}</span>
            </div>
            {SIDE_STATUS.cypherpunk.map((f) => (
              <div className="s-field" key={f.label}>
                <span className="s-label">{f.label}</span>
                <span className={`s-value${f.accent ? ' green' : ''}`}>{f.value}</span>
              </div>
            ))}
          </div>
          <div className="cy-sync__side cy-sync__side--right" aria-hidden="true">
            <div className="s-title">
              ASTRONAUT <span>{complete ? '// STATUS: SYNCHRONIZED' : '// ORIGIN: EARTH'}</span>
            </div>
            {SIDE_STATUS.astronaut.map((f) => (
              <div className="s-field" key={f.label}>
                <span className="s-label">{f.label}</span>
                <span className={`s-value${f.accent ? ' green' : ''}`}>{f.value}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* corner HUD */}
      <div className="cy-sync__corner cy-sync__corner--bl" aria-hidden="true">
        <span>DATA STREAM</span>
        <b>ENCRYPTED</b>
        <span className="bars">
          {Array.from({ length: 18 }, (_, i) => (
            <i key={i} style={{ height: `${3 + ((i * 7) % 6)}px` }} />
          ))}
        </span>
        <span>
          THROUGHPUT <b className="num">2.7 GB/S</b>
        </span>
      </div>
      <div className="cy-sync__corner cy-sync__corner--br" aria-hidden="true">
        <span>CONNECTION STABILITY</span>
        <b className="num">100%</b>
        <span className="bars">
          {Array.from({ length: 18 }, (_, i) => (
            <i key={i} style={{ height: `${4 + ((i * 5) % 5)}px` }} />
          ))}
        </span>
        <span>
          LATENCY <b className="num">0.3 MS</b>
        </span>
      </div>

      {!complete && (
        <button
          className="cy-sync__cancel ia"
          disabled={phase === 'exiting'}
          onClick={() => send({ type: 'CANCEL_PROTOCOL' })}
        >
          CANCEL PROTOCOL
        </button>
      )}
      {complete && <div />}
    </div>
  );
}
