import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { resolve } from './transitions';
import type { AppEvent, Phase, SceneState, Side } from './transitions';

export type QualityTier = 'high' | 'mid' | 'low';

interface CyphernautStore {
  scene: SceneState;
  phase: Phase;
  panelSide: Side | null;

  /** 0..1 master synchronization progress — written per frame by the conductor. */
  syncMaster: number;
  /** 0..1 per-task progress, same clock. */
  taskValues: number[];

  booted: boolean;
  scrollUnlocked: boolean;
  reducedMotion: boolean;
  tier: QualityTier;
  /** Static-record mode: no WebGL2, context death, or hopeless hardware. */
  fallbackMode: boolean;

  send: (event: AppEvent) => void;
  setSyncProgress: (master: number, tasks: number[]) => void;
  setBooted: () => void;
  setTier: (tier: QualityTier) => void;
  setReducedMotion: (reduced: boolean) => void;
  setFallback: () => void;
}

export const useStore = create<CyphernautStore>()(
  subscribeWithSelector((set, get) => ({
    scene: 'idle',
    phase: 'active',
    panelSide: null,

    syncMaster: 0,
    taskValues: [0, 0, 0, 0, 0],

    booted: false,
    scrollUnlocked: false,
    reducedMotion: false,
    tier: 'high',
    fallbackMode: false,

    send: (event) => {
      const { scene, phase, booted } = get();
      // The world does not respond before the boot sequence has yielded control.
      if (!booted) return;
      const next = resolve(scene, phase, event);
      if (!next) return;
      set({
        scene: next.scene,
        phase: next.phase,
        ...(next.panelSide !== undefined ? { panelSide: next.panelSide } : {}),
        ...(event.type === 'SETTLE_COMPLETE' ? { scrollUnlocked: true } : {}),
      });
    },

    setSyncProgress: (master, tasks) => set({ syncMaster: master, taskValues: tasks }),
    setBooted: () => set({ booted: true }),
    setTier: (tier) => set({ tier }),
    setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    setFallback: () => set({ fallbackMode: true }),
  }))
);

/** Convenience non-hook accessors for modules outside React. */
export const send = (event: AppEvent) => useStore.getState().send(event);
export const getScene = () => useStore.getState().scene;
