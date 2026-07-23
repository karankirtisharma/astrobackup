import { useStore } from '../state/store';
import type { SceneState } from '../state/transitions';
import { cue } from './cues';
import { unlockAudio } from './engine';

/**
 * The single integration point for audio.
 *
 * This codebase already routes EVERY legal state change through one place —
 * `resolve()` feeding the zustand store, which the conductor subscribes to for
 * choreography. Audio subscribes to exactly the same signal, so a cue can never
 * disagree with what the world is doing, and no component has to remember to
 * play anything. Pointer-level sounds (hover / click) are not state changes and
 * are fired at their handlers instead.
 *
 * Deliberately NOT inside the conductor: that file's job is tweens, and mixing
 * an audio side-channel into its timeline building is how the two drift apart.
 */

const PANELS: SceneState[] = ['cypherpunkPanel', 'astronautPanel'];
const CEREMONY: SceneState[] = ['protocolInitiated', 'synchronization', 'protocolComplete'];

export function initAudio(): () => void {
  // Browsers refuse to start audio without a gesture, so the context is built
  // on the first one of any kind. Capture phase + once: it must not depend on
  // the click landing on any particular element.
  const onGesture = () => unlockAudio();
  window.addEventListener('pointerdown', onGesture, { capture: true });
  window.addEventListener('keydown', onGesture, { capture: true });

  let prev = useStore.getState().scene;
  let prevPhase = useStore.getState().phase;

  const unsub = useStore.subscribe(
    (s) => ({ scene: s.scene, phase: s.phase }),
    ({ scene, phase }) => {
      const from = prev;
      const fromPhase = prevPhase;
      prev = scene;
      prevPhase = phase;

      // A ceremony that starts exiting is an abort — the FSM keeps the scene
      // name and only flips phase, so this has to be read off phase, not scene.
      if (CEREMONY.includes(scene) && phase === 'exiting' && fromPhase !== 'exiting') {
        cue.cancel();
        return;
      }
      if (scene === from) return;

      switch (scene) {
        case 'hoverCypherpunk':
        case 'hoverAstronaut':
          // Only when arriving from a non-hover state; sweeping between the two
          // figures should not re-trigger the scanner.
          if (from !== 'hoverCypherpunk' && from !== 'hoverAstronaut') cue.scanOpen();
          break;
        case 'cypherpunkPanel':
        case 'astronautPanel':
          cue.panelOpen();
          break;
        case 'protocolInitiated':
          cue.initiate();
          break;
        case 'synchronization':
          // The conductor starts the head-to-toe sweep a beat into this state;
          // the cue's own length is matched to that tween.
          cue.scanSweep();
          break;
        case 'protocolComplete':
          cue.complete();
          break;
        case 'scrollStory':
          cue.unlock();
          break;
        case 'idle':
        case 'hoverProtocol':
          if (PANELS.includes(from)) cue.panelClose();
          break;
        default:
          break;
      }
    }
  );

  return () => {
    window.removeEventListener('pointerdown', onGesture, { capture: true });
    window.removeEventListener('keydown', onGesture, { capture: true });
    unsub();
  };
}
