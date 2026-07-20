import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ChromaticAberrationEffect } from 'postprocessing';
import { Vector2 } from 'three';
import { fxProxy } from '../motion/proxies';
import { useStore } from '../state/store';
import { DEBUG_FLAGS } from '../debugFlags';

/**
 * Threshold bloom does selective bloom for free in a scene this dark — only
 * pedestal rings, rims, core and bridge push past 0.68 luminance.
 * Chromatic aberration idles subliminal and breathes up with protocol energy.
 */
export function PostFX() {
  if (DEBUG_FLAGS.noPostFx) return null;
  return <PostFXInner />;
}

function PostFXInner() {
  const tier = useStore((s) => s.tier);
  // Constructed imperatively: the declarative wrapper JSON-serializes props
  // for memoization, and the frameloop must NEVER meet a throwing callback.
  const caEffect = useMemo(
    () =>
      new ChromaticAberrationEffect({
        offset: new Vector2(0.0004, 0.00024),
        radialModulation: false,
        modulationOffset: 0,
      }),
    []
  );

  useFrame(() => {
    const off = caEffect.offset as Vector2 | undefined;
    if (off && typeof off.set === 'function') {
      const amt = 0.0004 + fxProxy.uPulse * 0.002 + fxProxy.uEnergy * 0.0008;
      off.set(amt, amt * 0.6);
    }
  });

  if (tier === 'low') {
    return (
      <EffectComposer multisampling={0} resolutionScale={0.6}>
        <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.7} luminanceSmoothing={0.3} />
        <Vignette offset={0.28} darkness={0.82} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.68} luminanceSmoothing={0.3} />
      <primitive object={caEffect} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.07} />
      <Vignette offset={0.28} darkness={0.82} />
    </EffectComposer>
  );
}
