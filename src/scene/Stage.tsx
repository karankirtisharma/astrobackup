import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial, useTexture } from '@react-three/drei';
import {
  AdditiveBlending,
  BufferGeometry,
  ClampToEdgeWrapping,
  Float32BufferAttribute,
  MirroredRepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
} from 'three';
import { DUST_VERT, DUST_FRAG, PLANE_VERT, CONTACT_FRAG } from './shaders';
import { useStore } from '../state/store';
import { DEBUG_FLAGS } from '../debugFlags';

const CHAMBER_URL = `${import.meta.env.BASE_URL}env/chamber.webp`;
useTexture.preload(CHAMBER_URL);

/** Plate geometry, derived from one measurement. */
const CHAMBER_ASPECT = 1857 / 847;
/** World width of one frame of the plate. */
const FRAME_W = 20;
const FRAME_H = FRAME_W / CHAMBER_ASPECT;
/**
 * Where the chamber's back wall meets its floor, as a fraction down the
 * image (measured from the luminance ramp). Aligning this line to world y=0
 * makes the plate meet the real floor at an architectural corner — the
 * junction is geometry, not a blend, so there is nothing left to seam.
 */
const FLOOR_LINE = 0.6;
const PLATE_Y = FRAME_H * (FLOOR_LINE - 0.5);
const PLATE_Z = -8.5;

/**
 * The chamber: one baked plate for the back wall, the real reflective slab
 * for every bit of ground the visitor actually stands near. The plate's own
 * light strips streak down into the reflector, so the near floor continues
 * the far floor by reflection rather than by patching.
 */
export function Stage() {
  const tier = useStore((s) => s.tier);

  return (
    <>
      <Floor tier={tier} />
      <ContactShadow />
      <Backdrop />
      <Dust />
    </>
  );
}

/** Occlusion pooling in the wall/floor corner — sells it as one room. */
function ContactShadow() {
  const uniforms = useMemo(() => ({ uStrength: { value: 0.9 } }), []);
  const depth = 5;
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, PLATE_Z + depth / 2]}>
      <planeGeometry args={[FRAME_W * 3, depth]} />
      <shaderMaterial
        vertexShader={PLANE_VERT}
        fragmentShader={CONTACT_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
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
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#101312" roughness={0.6} metalness={0.6} />
      </mesh>
    );
  }
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0}>
      <planeGeometry args={[60, 60]} />
      {/* Wet stone: sharp enough to carry the plate's light strips as
          streaks, so the near ground reads as the same floor. */}
      <MeshReflectorMaterial
        resolution={512}
        blur={[160, 55]}
        mixBlur={0.8}
        mixStrength={3.3}
        depthScale={0.6}
        minDepthThreshold={0.3}
        maxDepthThreshold={1.2}
        roughness={0.55}
        color="#1b201d"
        metalness={0.5}
        mirror={0.8}
      />
    </mesh>
  );
}

function Backdrop() {
  // Baked lighting, so an unlit material; scene fog recesses it and the
  // reflector floor mirrors it.
  const chamber = useTexture(CHAMBER_URL);
  chamber.colorSpace = SRGBColorSpace;
  // Sideways: mirrored repeat, so the wall continues past the view edge on
  // any aspect ratio with seamless joins and no stretch.
  // Vertically: clamp — above the frame the plate's dark ceiling row extends
  // upward (no mirrored door reappearing), below it the floor rows extend
  // down where our slab occludes them anyway.
  chamber.wrapS = MirroredRepeatWrapping;
  chamber.wrapT = ClampToEdgeWrapping;
  chamber.repeat.set(3, 3);
  chamber.offset.set(-1, -1);
  chamber.needsUpdate = true;

  return (
    // 3x the frame in each axis; the middle tile carries the original
    // mapping, so the vault door stays centered behind the protocol core
    // and FLOOR_LINE lands exactly on the real floor.
    <mesh position={[0, PLATE_Y, PLATE_Z]}>
      <planeGeometry args={[FRAME_W * 3, FRAME_H * 3]} />
      <meshBasicMaterial map={chamber} fog color="#e8ece8" toneMapped />
    </mesh>
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
