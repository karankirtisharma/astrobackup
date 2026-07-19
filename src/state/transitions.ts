/**
 * The Cyphernaut experience is a strict finite state machine.
 * Storyboard frames are STATES, not scenes in a movie — nothing progresses
 * without user intent, and every transition is resolved here, nowhere else.
 */

export type Side = 'cypherpunk' | 'astronaut';

export type SceneState =
  | 'idle'
  | 'hoverCypherpunk'
  | 'hoverAstronaut'
  | 'hoverProtocol'
  | 'cypherpunkPanel'
  | 'astronautPanel'
  | 'protocolInitiated'
  | 'synchronization'
  | 'protocolComplete'
  | 'scrollStory';

/** Sub-lifecycle within a scene state (drives two-step close/cancel). */
export type Phase = 'entering' | 'active' | 'exiting';

export type AppEvent =
  // user-originated
  | { type: 'HOVER_CHAR'; side: Side }
  | { type: 'UNHOVER_CHAR' }
  | { type: 'CLICK_CHAR'; side: Side }
  | { type: 'HOVER_PROTOCOL' }
  | { type: 'UNHOVER_PROTOCOL' }
  | { type: 'CLICK_PROTOCOL' }
  | { type: 'CLOSE_PANEL' }
  | { type: 'CANCEL_PROTOCOL' }
  | { type: 'ENTER_STORY' }
  | { type: 'EXIT_STORY' }
  // conductor-originated (fired from timeline callbacks)
  | { type: 'PANEL_CLOSED' }
  | { type: 'SYNC_STARTED' }
  | { type: 'SYNC_COMPLETE' }
  | { type: 'SETTLE_COMPLETE' }
  | { type: 'CANCEL_FINISHED' };

export interface Transition {
  scene: SceneState;
  phase: Phase;
  panelSide?: Side | null;
}

const panelFor = (side: Side): SceneState =>
  side === 'cypherpunk' ? 'cypherpunkPanel' : 'astronautPanel';

const hoverFor = (side: Side): SceneState =>
  side === 'cypherpunk' ? 'hoverCypherpunk' : 'hoverAstronaut';

/**
 * Resolve an event against the current state. Returns null when the event is
 * illegal in this state (it is silently dropped — the environment simply does
 * not respond to intents it has not been offered).
 */
export function resolve(
  scene: SceneState,
  phase: Phase,
  event: AppEvent
): Transition | null {
  const explorable =
    scene === 'idle' ||
    scene === 'hoverCypherpunk' ||
    scene === 'hoverAstronaut' ||
    scene === 'hoverProtocol';

  if (explorable) {
    switch (event.type) {
      case 'HOVER_CHAR':
        // Hover-to-hover sweeps crossfade directly, never via idle.
        if (scene === hoverFor(event.side)) return null;
        return { scene: hoverFor(event.side), phase: 'active' };
      case 'UNHOVER_CHAR':
        if (scene === 'hoverCypherpunk' || scene === 'hoverAstronaut')
          return { scene: 'idle', phase: 'active' };
        return null;
      case 'CLICK_CHAR':
        // Click — and only click — opens a dossier.
        return { scene: panelFor(event.side), phase: 'entering', panelSide: event.side };
      case 'HOVER_PROTOCOL':
        if (scene === 'hoverProtocol') return null;
        return { scene: 'hoverProtocol', phase: 'active' };
      case 'UNHOVER_PROTOCOL':
        if (scene === 'hoverProtocol') return { scene: 'idle', phase: 'active' };
        return null;
      case 'CLICK_PROTOCOL':
        // The one ceremonial act. From here the sequence is uninterruptible
        // except by CANCEL_PROTOCOL.
        return { scene: 'protocolInitiated', phase: 'entering' };
      default:
        return null;
    }
  }

  if (scene === 'cypherpunkPanel' || scene === 'astronautPanel') {
    switch (event.type) {
      case 'CLOSE_PANEL':
        // Legal while entering too — the construction reverses from its
        // current playhead. Ignored if already exiting.
        if (phase === 'exiting') return null;
        return { scene, phase: 'exiting' };
      case 'PANEL_CLOSED':
        if (phase !== 'exiting') return null;
        return { scene: 'idle', phase: 'active', panelSide: null };
      default:
        // Never auto-switch dossiers; hover is inert while a panel is open.
        return null;
    }
  }

  if (scene === 'protocolInitiated' || scene === 'synchronization') {
    switch (event.type) {
      case 'SYNC_STARTED':
        if (scene !== 'protocolInitiated' || phase === 'exiting') return null;
        return { scene: 'synchronization', phase: 'active' };
      case 'SYNC_COMPLETE':
        if (scene !== 'synchronization' || phase === 'exiting') return null;
        return { scene: 'protocolComplete', phase: 'entering' };
      case 'CANCEL_PROTOCOL':
        if (phase === 'exiting') return null;
        return { scene, phase: 'exiting' };
      case 'CANCEL_FINISHED':
        if (phase !== 'exiting') return null;
        return { scene: 'idle', phase: 'active' };
      default:
        return null;
    }
  }

  if (scene === 'protocolComplete') {
    switch (event.type) {
      case 'SETTLE_COMPLETE':
        if (phase !== 'entering') return null;
        return { scene, phase: 'active' };
      case 'ENTER_STORY':
        if (phase !== 'active') return null;
        return { scene: 'scrollStory', phase: 'active' };
      default:
        return null;
    }
  }

  if (scene === 'scrollStory') {
    if (event.type === 'EXIT_STORY') return { scene: 'protocolComplete', phase: 'active' };
    return null;
  }

  return null;
}
