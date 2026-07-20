import type { SceneState } from '../state/transitions';

/**
 * The whole lighting story in one table.
 * Green is life — it is spent, not decorated with: the cypherpunk's rim is
 * protocol green, the astronaut's is cool white, and the flood only exists
 * after synchronization completes.
 */
export interface LightingPreset {
  /** Key spotlight intensities per character. */
  keyL: number;
  keyR: number;
  /** Rim lights — L is green, R is cool white. */
  rimL: number;
  rimR: number;
  /** Core point light between the characters. */
  core: number;
  /** Pedestal ring glow multipliers. */
  glowL: number;
  glowR: number;
  /** Character material de-emphasis 0 (full) → 1 (receded). */
  dimL: number;
  dimR: number;
  /** Green environmental flood — protocol-complete only. */
  flood: number;
}

export const LIGHTING_PRESETS: Record<SceneState, LightingPreset> = {
  idle: {
    keyL: 1.0, keyR: 1.05, rimL: 0.14, rimR: 0.3, core: 0.15,
    glowL: 0.5, glowR: 0.5, dimL: 0, dimR: 0, flood: 0,
  },
  hoverCypherpunk: {
    keyL: 1.5, keyR: 0.75, rimL: 2.4, rimR: 0.3, core: 0.3,
    glowL: 1.05, glowR: 0.32, dimL: 0, dimR: 0.5, flood: 0,
  },
  hoverAstronaut: {
    keyL: 0.75, keyR: 1.5, rimL: 0.3, rimR: 2.6, core: 0.3,
    glowL: 0.32, glowR: 1.05, dimL: 0.5, dimR: 0, flood: 0,
  },
  hoverProtocol: {
    keyL: 1.05, keyR: 1.05, rimL: 0.85, rimR: 0.9, core: 1.4,
    glowL: 0.8, glowR: 0.8, dimL: 0, dimR: 0, flood: 0,
  },
  cypherpunkPanel: {
    keyL: 1.65, keyR: 0.55, rimL: 2.1, rimR: 0.22, core: 0.2,
    glowL: 1.1, glowR: 0.25, dimL: 0, dimR: 0.68, flood: 0,
  },
  astronautPanel: {
    keyL: 0.55, keyR: 1.65, rimL: 0.22, rimR: 2.3, core: 0.2,
    glowL: 0.25, glowR: 1.1, dimL: 0.68, dimR: 0, flood: 0,
  },
  protocolInitiated: {
    keyL: 0.95, keyR: 0.95, rimL: 1.5, rimR: 1.5, core: 2.6,
    glowL: 1.2, glowR: 1.2, dimL: 0, dimR: 0, flood: 0.08,
  },
  synchronization: {
    keyL: 0.85, keyR: 0.85, rimL: 2.4, rimR: 2.4, core: 3.6,
    glowL: 1.5, glowR: 1.5, dimL: 0, dimR: 0, flood: 0.2,
  },
  protocolComplete: {
    keyL: 1.15, keyR: 1.15, rimL: 1.7, rimR: 1.7, core: 2.2,
    glowL: 1.15, glowR: 1.15, dimL: 0, dimR: 0, flood: 0.55,
  },
  scrollStory: {
    keyL: 1.0, keyR: 1.0, rimL: 1.2, rimR: 1.2, core: 1.6,
    glowL: 0.9, glowR: 0.9, dimL: 0, dimR: 0, flood: 0.4,
  },
};

/** Scene palette. */
export const COLORS = {
  bg: '#eef0ec',
  green: '#4d7c0f',
  greenDeep: '#3f6b0c',
  rimCool: '#dbe9f5',
  keyWarm: '#fffaf2',
  /* A lit room bounces: ambient fill carries most of the modelling now. */
  fill: '#dfe3de',
} as const;
