/**
 * The animation conductor.
 * Subscribes to the state machine and translates every transition into GSAP
 * tweens on the persistent proxies. The scene reacts because the visitor made
 * a decision — never on its own schedule.
 *
 * Interruption policy:
 *  - continuous values (camera/lights/fx/characters) tween proxies with
 *    overwrite:'auto' → replacements start from live values, nothing snaps;
 *  - structural sequences own a named slot; a new sequence kills its
 *    predecessor, the proxies carry the current values across;
 *  - the 12.4s sync timeline is never reversed — cancel builds a fresh,
 *    compressed wind-down instead.
 */
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { useStore, send } from '../state/store';
import type { SceneState } from '../state/transitions';
import { CAMERA_POSES, CAMERA_DURATIONS } from '../config/cameraPoses';
import { LIGHTING_PRESETS } from '../config/lightingPresets';
import {
  cameraProxy,
  characterProxy,
  lightProxy,
  fxProxy,
  syncProxy,
  CHAR_BASE_ROT,
} from './proxies';
import { computeTasks, SYNC_DURATION } from '../state/syncSim';
import { EASE, md, me, PROTOCOL_SILENCE, syncDuration, syncEase } from './motionConfig';

type Slot = 'protocol' | 'cancel';
const slots: Partial<Record<Slot, gsap.core.Timeline>> = {};

/** Wall-clock moment the visitor clicked "+" — the completion stamp's zero. */
export let protocolStartedAt = 0;

function setSlot(name: Slot, tl: gsap.core.Timeline) {
  slots[name]?.kill();
  slots[name] = tl;
}

function killSlot(name: Slot) {
  slots[name]?.kill();
  delete slots[name];
}

function tweenCamera(scene: SceneState, durMul = 1) {
  const p = CAMERA_POSES[scene];
  const d = md(CAMERA_DURATIONS[scene] * durMul);
  gsap.to(cameraProxy, {
    px: p.position[0], py: p.position[1], pz: p.position[2],
    duration: d, ease: me(EASE.camera), overwrite: 'auto',
  });
  // The target lags the dolly by ~8% — the operator catching up with the pan.
  gsap.to(cameraProxy, {
    tx: p.target[0], ty: p.target[1], tz: p.target[2],
    duration: d * 1.08, ease: me('power2.inOut'), overwrite: 'auto',
  });
  gsap.to(cameraProxy, { fov: p.fov, duration: d, ease: me(EASE.camera), overwrite: 'auto' });
}

function tweenLights(scene: SceneState, duration = 0.9) {
  gsap.to(lightProxy, {
    ...LIGHTING_PRESETS[scene],
    duration: md(duration),
    ease: me('power2.inOut'),
    overwrite: 'auto',
  });
}

function tweenParallax(amount: number, duration = 0.8) {
  gsap.to(cameraProxy, { parallax: amount, duration: md(duration), ease: 'power2.inOut', overwrite: 'auto' });
}

function returnCharactersToBase(duration = 1.0) {
  gsap.to(characterProxy, {
    rotL: CHAR_BASE_ROT.left,
    rotR: CHAR_BASE_ROT.right,
    agitation: 0,
    duration: md(duration),
    ease: me('power2.inOut'),
    overwrite: 'auto',
  });
}

function choreograph(next: SceneState, prev: SceneState) {
  switch (next) {
    case 'idle': {
      tweenCamera('idle');
      tweenLights('idle');
      tweenParallax(1);
      characterProxy.leanL = 0;
      characterProxy.leanR = 0;
      gsap.to(fxProxy, { uOrbit: 0, duration: md(0.5), ease: 'power2.out', overwrite: 'auto' });
      // Coming back from a cancelled protocol the wind-down owns the rest;
      // coming back from hover/panels this is the graceful interpolation home.
      if (prev === 'hoverProtocol' || prev === 'cypherpunkPanel' || prev === 'astronautPanel') {
        returnCharactersToBase(0.9);
      }
      break;
    }

    case 'hoverCypherpunk':
    case 'hoverAstronaut': {
      tweenCamera(next);
      tweenLights(next, 0.7);
      tweenParallax(0.8);
      characterProxy.leanL = next === 'hoverCypherpunk' ? 1 : 0;
      characterProxy.leanR = next === 'hoverAstronaut' ? 1 : 0;
      gsap.to(fxProxy, { uOrbit: 0, duration: md(0.5), ease: 'power2.out', overwrite: 'auto' });
      break;
    }

    case 'hoverProtocol': {
      tweenCamera('hoverProtocol');
      tweenLights('hoverProtocol', 0.7);
      characterProxy.leanL = 0;
      characterProxy.leanR = 0;
      // Both characters subtly acknowledge the energy source.
      gsap.to(characterProxy, {
        rotL: CHAR_BASE_ROT.left + 0.12,
        rotR: CHAR_BASE_ROT.right - 0.12,
        duration: md(0.9),
        ease: me('power2.inOut'),
        overwrite: 'auto',
      });
      gsap.to(fxProxy, { uOrbit: 1, duration: md(0.6), ease: 'power2.out', overwrite: 'auto' });
      break;
    }

    case 'cypherpunkPanel':
    case 'astronautPanel': {
      tweenCamera(next);
      tweenLights(next, 1.1);
      tweenParallax(0.2);
      characterProxy.leanL = 0;
      characterProxy.leanR = 0;
      break;
    }

    case 'protocolInitiated': {
      tweenCamera('protocolInitiated');
      tweenLights('protocolInitiated', 1.4);
      tweenParallax(0.15);
      characterProxy.leanL = 0;
      characterProxy.leanR = 0;
      buildProtocolTimeline();
      break;
    }

    case 'synchronization': {
      // The master timeline is already running; only the frame changes.
      tweenCamera('synchronization');
      tweenLights('synchronization', 2.0);
      break;
    }

    case 'protocolComplete': {
      tweenCamera('protocolComplete');
      tweenLights('protocolComplete', 1.8);
      tweenParallax(0.6);
      break;
    }

    case 'scrollStory': {
      tweenCamera('scrollStory');
      tweenLights('scrollStory', 1.4);
      break;
    }
  }
}

/**
 * The ceremonial mega-sequence: click → 300ms of deliberate silence → pulse →
 * bridge ignition → 12.4s synchronization → completion settle.
 * Structural milestones are reported back to the FSM via .call().
 */
function buildProtocolTimeline() {
  const tl = gsap.timeline();
  setSlot('protocol', tl);

  protocolStartedAt = performance.now();
  syncProxy.t = 0;
  fxProxy.uPulse = 0;

  const applySync = () => {
    const m = syncProxy.t;
    useStore.getState().setSyncProgress(m, computeTasks(m));
    fxProxy.uBridge = Math.max(fxProxy.uBridge, 0.25 + 0.75 * m);
    fxProxy.uTurbulence = 1.0 - 0.72 * m;
    fxProxy.uFlow = 0.06 + 0.3 * m;
  };

  // ——— Phase A: initiation ———
  // Deliberate stillness. Do not fill it.
  tl.to({}, { duration: md(PROTOCOL_SILENCE) });

  // The low-frequency pulse: shockwave + camera settle-thump + key-light dip.
  tl.to(fxProxy, { uPulse: 1, duration: md(1.4), ease: 'expo.out' });
  tl.to(cameraProxy, { shake: 1, duration: 0.07, ease: 'power2.out' }, '<');
  tl.to(cameraProxy, { shake: 0, duration: md(0.55), ease: 'power3.out' }, '<0.07');
  tl.to(lightProxy, { keyL: 0.55, keyR: 0.55, duration: 0.14, ease: 'power2.in' }, '<-0.05');
  tl.to(
    lightProxy,
    {
      keyL: LIGHTING_PRESETS.protocolInitiated.keyL,
      keyR: LIGHTING_PRESETS.protocolInitiated.keyR,
      duration: md(0.9),
      ease: 'power2.out',
    },
    '>'
  );

  // The bridge sputters to life — unstable, crawling, chaotic.
  tl.to(fxProxy, { uBridge: 0.25, uEnergy: 0.25, duration: md(1.5), ease: 'power1.inOut' }, md(0.9));
  tl.to(fxProxy, { uOrbit: 0.6, duration: md(0.8), ease: 'power2.out' }, md(0.9));

  // Pre-sync readout climbs to 08% while systems come online.
  tl.to(syncProxy, { t: 0.08, duration: md(1.1), ease: 'power1.inOut', onUpdate: applySync }, md(1.0));

  // ——— Phase B: synchronization ———
  const syncStart = md(2.2);
  tl.call(() => send({ type: 'SYNC_STARTED' }), undefined, syncStart);

  const dSync = syncDuration(SYNC_DURATION);
  tl.to(
    syncProxy,
    { t: 1, duration: dSync, ease: syncEase('syncCurve'), onUpdate: applySync },
    syncStart
  );

  // The two identities turn toward one another.
  tl.to(
    characterProxy,
    { rotL: 1.22, rotR: -1.22, duration: md(2.6), ease: me('power2.inOut') },
    syncStart + md(0.2)
  );
  tl.to(characterProxy, { agitation: 1, duration: md(4), ease: 'power1.in' }, syncStart + md(0.8));

  // Escalation → hold → calm before completion (the room accepts the protocol).
  tl.to(fxProxy, { uEnergy: 1, duration: dSync * 0.55, ease: 'power1.in' }, syncStart + md(0.4));
  tl.to(fxProxy, { uEnergy: 0.7, duration: dSync * 0.15, ease: 'power2.out' }, syncStart + dSync * 0.85);
  tl.to(characterProxy, { agitation: 0.2, duration: dSync * 0.15, ease: 'power2.out' }, syncStart + dSync * 0.85);

  // ——— Phase C: completion settle ———
  const tComplete = syncStart + dSync + 0.02;
  tl.call(() => send({ type: 'SYNC_COMPLETE' }), undefined, tComplete);

  // A beat of stillness at 100%, then everything stabilizes.
  tl.to(
    fxProxy,
    { uEnergy: 0.35, uFlow: 0.12, uTurbulence: 0.08, uOrbit: 0.5, duration: md(1.4), ease: 'power2.inOut' },
    tComplete + 0.25
  );
  tl.to(characterProxy, { agitation: 0, duration: md(1.0), ease: 'power2.out' }, tComplete + 0.25);

  tl.call(() => send({ type: 'SETTLE_COMPLETE' }), undefined, tComplete + md(1.9));
}

/**
 * Cancel: never reverse the 13-second timeline. Kill it and wind the world
 * down in a fresh compressed sequence — proxies guarantee it starts from
 * exactly where everything is.
 */
function runCancel() {
  killSlot('protocol');
  const tl = gsap.timeline({
    onComplete: () => send({ type: 'CANCEL_FINISHED' }),
  });
  setSlot('cancel', tl);

  const displayed = { t: syncProxy.t };
  tl.to(
    displayed,
    {
      t: 0,
      duration: md(0.7),
      ease: 'power2.in',
      onUpdate: () => {
        syncProxy.t = displayed.t;
        useStore.getState().setSyncProgress(displayed.t, computeTasks(displayed.t));
      },
    },
    0
  );
  tl.to(fxProxy, { uBridge: 0, uEnergy: 0, uPulse: 0, uOrbit: 0, duration: md(0.9), ease: 'power2.inOut' }, 0.1);
  tl.to(
    characterProxy,
    { rotL: CHAR_BASE_ROT.left, rotR: CHAR_BASE_ROT.right, agitation: 0, duration: md(1.0), ease: 'power2.inOut' },
    0.15
  );
  tl.to(lightProxy, { ...LIGHTING_PRESETS.idle, duration: md(0.9), ease: 'power2.inOut' }, 0.2);
  const idle = CAMERA_POSES.idle;
  tl.to(
    cameraProxy,
    {
      px: idle.position[0], py: idle.position[1], pz: idle.position[2],
      tx: idle.target[0], ty: idle.target[1], tz: idle.target[2],
      fov: idle.fov, parallax: 1,
      duration: md(1.2), ease: me('power2.inOut'),
    },
    0.3
  );
}

/** Boot handoff: the establishing shot settles into the idle pose. */
function runEstablishing() {
  const idle = CAMERA_POSES.idle;
  gsap.to(cameraProxy, {
    px: idle.position[0], py: idle.position[1], pz: idle.position[2],
    tx: idle.target[0], ty: idle.target[1], tz: idle.target[2],
    fov: idle.fov,
    duration: md(3.2),
    ease: me('power2.inOut'),
    overwrite: 'auto',
  });
}

let started = false;

export function initConductor(): () => void {
  if (started) return () => {};
  started = true;

  gsap.registerPlugin(CustomEase);
  // Hesitant start → confident mid acceleration → gentle final landing.
  CustomEase.create('syncCurve', 'M0,0 C0.25,0.04 0.35,0.35 0.55,0.62 0.72,0.84 0.88,0.97 1,1');

  const unsubScene = useStore.subscribe(
    (s) => s.scene,
    (next, prev) => choreograph(next, prev)
  );
  const unsubPhase = useStore.subscribe(
    (s) => s.phase,
    (phase) => {
      const { scene } = useStore.getState();
      if (phase === 'exiting' && (scene === 'protocolInitiated' || scene === 'synchronization')) {
        runCancel();
      }
    }
  );
  const unsubBoot = useStore.subscribe(
    (s) => s.booted,
    (booted) => {
      if (booted) runEstablishing();
    }
  );

  return () => {
    unsubScene();
    unsubPhase();
    unsubBoot();
    Object.keys(slots).forEach((k) => killSlot(k as Slot));
    started = false;
    // Killing a mid-flight ceremony strands the FSM (its milestone .call()s
    // die with the timeline) — reconcile back to idle. Dev/remount-scoped.
    const { scene, phase } = useStore.getState();
    if (scene === 'protocolInitiated' || scene === 'synchronization') {
      if (phase !== 'exiting') send({ type: 'CANCEL_PROTOCOL' });
      send({ type: 'CANCEL_FINISHED' });
    }
  };
}
