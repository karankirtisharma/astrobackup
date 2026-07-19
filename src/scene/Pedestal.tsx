import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, ShaderMaterial } from 'three';
import { PLANE_VERT, RING_FRAG } from './shaders';
import { lightProxy, fxProxy } from '../motion/proxies';
import { CHAR_X } from '../config/cameraPoses';

/**
 * A pedestal is a quiet machine: dark metal disc + an emissive ring whose
 * color tells the story — cool white at rest, protocol green when its
 * character is recognized or the sequence runs.
 */
export function Pedestal({ side }: { side: 'left' | 'right' }) {
  const material = useRef<ShaderMaterial>(null!);
  const x = side === 'left' ? -CHAR_X : CHAR_X;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGlow: { value: 0.5 },
      uMix: { value: 0 },
    }),
    []
  );

  useFrame(({ clock }) => {
    const u = material.current.uniforms;
    u.uTime.value = clock.elapsedTime;
    const glow = side === 'left' ? lightProxy.glowL : lightProxy.glowR;
    u.uGlow.value = glow * (1 + fxProxy.uEnergy * 0.5);
    // Left ring greens on cypherpunk emphasis; both green during the protocol.
    const greenness =
      side === 'left'
        ? Math.max(Math.min((lightProxy.rimL - 0.5) / 1.6, 1), fxProxy.uEnergy)
        : Math.min(fxProxy.uEnergy * 1.4, 1);
    u.uMix.value = greenness;
  });

  return (
    <group position={[x, 0, 0]}>
      <mesh position-y={0.05}>
        <cylinderGeometry args={[0.98, 1.06, 0.1, 48]} />
        <meshStandardMaterial color="#0d0f0e" roughness={0.35} metalness={0.85} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.104}>
        <planeGeometry args={[2.6, 2.6]} />
        <shaderMaterial
          ref={material}
          vertexShader={PLANE_VERT}
          fragmentShader={RING_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
