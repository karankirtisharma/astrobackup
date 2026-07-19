import { send, getScene } from '../state/store';
import type { Side } from '../state/transitions';

/**
 * Tiny hover debouncer: enter dispatches immediately; leave waits 70ms and is
 * cancelled by a re-enter. Kills raycast edge-flicker and makes the sweep from
 * one character to the other read as a single motion.
 *
 * Gated on the explorable scenes — capsule raycasts still fire through the
 * HUD while a dossier or the ceremony is up, and the cursor must not promise
 * a click the FSM will drop.
 */
let leaveTimer: ReturnType<typeof setTimeout> | null = null;

const explorable = () => {
  const scene = getScene();
  return (
    scene === 'idle' ||
    scene === 'hoverCypherpunk' ||
    scene === 'hoverAstronaut' ||
    scene === 'hoverProtocol'
  );
};

export function hoverEnter(side: Side) {
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
  if (!explorable()) return;
  document.body.style.cursor = 'pointer';
  send({ type: 'HOVER_CHAR', side });
}

export function hoverLeave() {
  document.body.style.cursor = '';
  if (leaveTimer) clearTimeout(leaveTimer);
  leaveTimer = setTimeout(() => {
    leaveTimer = null;
    send({ type: 'UNHOVER_CHAR' });
  }, 70);
}
