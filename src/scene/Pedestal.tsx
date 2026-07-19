import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { AdditiveBlending, Mesh, MeshStandardMaterial, ShaderMaterial } from 'three';
import { PLANE_VERT, RING_FRAG } from './shaders';
import { lightProxy, fxProxy } from '../motion/proxies';
import { CHAR_X } from '../config/cameraPoses';

const PLATFORM_URL = `${import.meta.env.BASE_URL}models/platform.glb`;
useGLTF.preload(PLATFORM_URL);

/**
 * The pedestal: a real platform model, plus the emissive floor halo whose
 * color carries the state story — cool white at rest, protocol green when its
 * character is recognized or the sequence runs.
 */
export function Pedestal({ side }: { side: 'left' | 'right' }) {
  const material = useRef<ShaderMaterial>(null!);
  const x = side === 'left' ? -CHAR_X : CHAR_X;
  const { scene } = useGLTF(PLATFORM_URL);

  // Two pedestals share one GLB — each side renders its own clone.
  const platform = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (!(obj as Mesh).isMesh) return;
      const mesh = obj as Mesh;
      mesh.raycast = () => {};
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        const std = mat as MeshStandardMaterial;
        if (!std.color) continue;
        std.transparent = false;
        std.depthWrite = true;
      }
    });
    return clone;
  }, [scene]);

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
      <primitive object={platform} />
      {/* State-glow halo on the floor, just outside the platform edge. */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
        <planeGeometry args={[3.1, 3.1]} />
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
