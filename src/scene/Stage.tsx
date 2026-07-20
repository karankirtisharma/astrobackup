import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, ShaderMaterial } from 'three';
import { DUST_VERT, DUST_FRAG } from './shaders';
import { useStore } from '../state/store';
import { DEBUG_FLAGS } from '../debugFlags';

/**
 * The architectural void: a reflective slab, a fogged backdrop cylinder with
 * faint vertical slits, and drifting dust. The environment frames the
 * protagonists — it never competes with them.
 */
export function Stage() {
  const tier = useStore((s) => s.tier);

  return (
    <>
      <Floor tier={tier} />
      <Backdrop />
      <Dust />
    </>
  );
}

function Floor({ tier }: { tier: 'high' | 'mid' | 'low' }) {
  // The reflector renders the whole scene into an offscreen FBO each frame —
  // reserved for the high tier, at a resolution the blur makes equivalent.
  // Known cost: drei's internal render targets are not disposed if the
  // reflector unmounts on a tier downgrade (~8MB GPU, at most once per
  // session) — accepted over reaching into drei internals.
  if (tier !== 'high' || DEBUG_FLAGS.noReflect) {
    return (
      <mesh rotation-x={-Math.PI / 2} position-y={0}>
        <planeGeometry args={[44, 44]} />
        <meshStandardMaterial color="#0a0c0b" roughness={0.85} metalness={0.4} />
      </mesh>
    );
  }
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0}>
      <planeGeometry args={[44, 44]} />
      <MeshReflectorMaterial
        resolution={512}
        blur={[260, 80]}
        mixBlur={1}
        mixStrength={2.2}
        depthScale={0.7}
        minDepthThreshold={0.35}
        maxDepthThreshold={1.2}
        roughness={0.85}
        color="#0a0c0b"
        metalness={0.45}
        mirror={0.55}
      />
    </mesh>
  );
}

function Backdrop() {
  const slits = useMemo(() => {
    const items: { pos: [number, number, number]; h: number }[] = [];
    for (let i = 0; i < 9; i++) {
      const ang = Math.PI * (0.65 + (i / 8) * 1.7); // back half arc
      const r = 11 + (i % 3) * 1.6;
      items.push({
        pos: [Math.cos(ang) * r, 2.6 + (i % 2) * 0.9, Math.sin(ang) * r - 2],
        h: 4.5 + (i % 3) * 1.4,
      });
    }
    return items;
  }, []);

  return (
    <>
      {/* The void itself — fog does the compositional work. */}
      <mesh position={[0, 5, -2]}>
        <cylinderGeometry args={[15, 15, 16, 40, 1, true]} />
        <meshStandardMaterial color="#070908" roughness={1} metalness={0} side={1} />
      </mesh>
      {/* Faint vertical slits, eaten by fog at varying depths. */}
      {slits.map((s, i) => (
        <mesh key={i} position={s.pos}>
          <boxGeometry args={[0.045, s.h, 0.045]} />
          <meshStandardMaterial
            color="#0c110e"
            emissive="#243528"
            emissiveIntensity={0.7}
            roughness={1}
          />
        </mesh>
      ))}
    </>
  );
}

const DUST_COUNT = 300;

function Dust() {
  const material = useRef<ShaderMaterial>(null!);

  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    const pos = new Float32Array(DUST_COUNT * 3);
    const seed = new Float32Array(DUST_COUNT);
    for (let i = 0; i < DUST_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      seed[i] = Math.random();
    }
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new Float32BufferAttribute(seed, 1));
    return geo;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    }),
    []
  );

  useFrame(({ clock, gl }) => {
    material.current.uniforms.uTime.value = clock.elapsedTime;
    material.current.uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={DUST_VERT}
        fragmentShader={DUST_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
