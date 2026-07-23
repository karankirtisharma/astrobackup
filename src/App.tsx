import { Component, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import { Leva } from 'leva';
import { Experience } from './scene/Experience';
import { Hud } from './ui/Hud';
import { BootLoader } from './ui/chrome/BootLoader';
import { Fallback } from './ui/Fallback';
import { ManifestoSection } from './scroll/ManifestoSection';
import { initConductor } from './motion/conductor';
import { detectCapabilities } from './hooks/useCapabilities';
import { useStore } from './state/store';
import { DEBUG_FLAGS } from './debugFlags';

/** Loader/shader/context crashes route to the static record, never a blank page. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error('[cyphernaut] scene failure — switching to static record:', error);
    useStore.getState().setFallback();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Never create a WebGL context in a PRERENDERING document — some environments
 * prerender a second copy of the page, and two 550k-triangle scenes compiling
 * at once is how contexts get killed. Merely-hidden documents still mount:
 * embedded panes can report "hidden" while visibly displayed, and rAF simply
 * resumes when they surface.
 */
function useDocumentVisible(): boolean {
  const [ready, setReady] = useState(
    () => !(document as Document & { prerendering?: boolean }).prerendering
  );
  useEffect(() => {
    if (ready) return;
    const check = () => {
      if (!(document as Document & { prerendering?: boolean }).prerendering) setReady(true);
    };
    document.addEventListener('prerenderingchange', check);
    return () => document.removeEventListener('prerenderingchange', check);
  }, [ready]);
  return ready;
}

export default function App() {
  const fallback = useStore((s) => s.fallbackMode);
  const visible = useDocumentVisible();

  useEffect(() => {
    const caps = detectCapabilities();
    if (caps.mode === 'fallback') useStore.getState().setFallback();
    else useStore.getState().setTier(DEBUG_FLAGS.tierOverride ?? caps.tier);

    // FULL MOTION IS THE DEFAULT — a deliberate product decision.
    //
    // This used to read prefers-reduced-motion and collapse every animation in
    // the experience when the OS asked for it. That is the accessible default,
    // and it is why the site looked completely static on machines with Windows'
    // "Animation effects" turned off while ?motion=full appeared to "fix" it —
    // the flag was not adding anything, it was overriding the OS.
    //
    // The site is a motion piece, so it now animates by default and reduced
    // motion is opt-IN via ?motion=reduced. The whole reduced-motion code path
    // is still intact and exercised by that flag — md()/me() still collapse
    // durations, the lens still snaps, the manifesto still fades — so restoring
    // the accessible behaviour is a one-line revert: delete the branch below
    // and put back the matchMedia listener.
    //
    // TRADE-OFF, stated plainly: visitors with vestibular disorders who have
    // asked their OS for reduced motion will now get the full camera dolly,
    // parallax and scroll choreography anyway.
    useStore.getState().setReducedMotion(DEBUG_FLAGS.motionOverride === 'reduced');
  }, []);

  useGSAP(() => {
    const dispose = initConductor();
    return dispose;
  }, []);

  if (fallback) return <Fallback />;

  return (
    <>
      {/* Live render-tuning panel — invisible unless ?debug=1 is on the URL. */}
      <Leva hidden={!DEBUG_FLAGS.debug} collapsed />
      <div className="cy-hero">
        <div className="cy-canvas-holder">
          {visible && (
            <SceneBoundary>
              <Experience />
            </SceneBoundary>
          )}
        </div>
        <SceneBoundary>
          <Hud />
        </SceneBoundary>
      </div>
      <ManifestoSection />
      <BootLoader />
    </>
  );
}
