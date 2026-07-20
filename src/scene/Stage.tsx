import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import {
  AdditiveBlending,
  BufferGeometry,
  ClampToEdgeWrapping,
  Float32BufferAttribute,
  MathUtils,
  ShaderMaterial,
  SRGBColorSpace,
} from 'three';
import { DUST_VERT, DUST_FRAG } from './shaders';

const CHAMBER_URL = `${import.meta.env.BASE_URL}env/chamber.webp`;
useTexture.preload(CHAMBER_URL);

const CHAMBER_ASPECT = 1857 / 847;
/**
 * Where the chamber's back wall meets its floor, as a fraction down the
 * image (measured from its luminance ramp). Placed at world y=0, so the
 * render's floor line IS the ground plane and its painted floor recedes to
 * the same horizon the platforms stand on.
 */
const FLOOR_LINE = 0.6;
/** How far behind the stage the chamber stands. Drives parallax strength. */
const PLATE_Z = 11;

/** Envelope of the authored camera poses, for sizing that always covers. */
const POSE_MAX_Z = 6.4;
const POSE_MAX_FOV = 42;
/**
 * Lateral/vertical camera excursion the plate must still cover: pose spread
 * (±0.5) + mouse parallax (±0.3) + idle drift (±0.11). Kept tight, because
 * every unit of margin is a unit of the render cropped away.
 */
const CAM_MARGIN = 1;

/**
 * Size the plate so every authored camera pose stays inside it at this
 * aspect — coverage is guaranteed up front, so the plate can then sit still
 * in world space and simply be looked at. Depends only on the aspect ratio,
 * so it never breathes while the camera moves.
 */
function plateSize(aspect: number) {
  const fit = MathUtils.clamp(1.45 / aspect, 1, 1.9);
  const fovDeg = POSE_MAX_FOV + (fit - 1) * 14;
  const dist = PLATE_Z + POSE_MAX_Z * fit;
  const halfH = dist * Math.tan(MathUtils.degToRad(fovDeg) / 2) + CAM_MARGIN;
  const halfW = halfH * aspect + CAM_MARGIN;
  return halfW / halfH > CHAMBER_ASPECT
    ? { w: halfW * 2, h: (halfW * 2) / CHAMBER_ASPECT }
    : { w: halfH * 2 * CHAMBER_ASPECT, h: halfH * 2 };
}

/**
 * The chamber is the render itself, standing in world space: the camera
 * moves against it, so dollies and hover shifts produce real parallax
 * instead of a backdrop glued to the lens. There is no 3D floor slab — the
 * render's own floor is the ground.
 */
export function Stage() {
  return (
    <>
      <Backplate />
      <Dust />
    </>
  );
}

function Backplate() {
  const chamber = useTexture(CHAMBER_URL);
  chamber.colorSpace = SRGBColorSpace;
  chamber.wrapS = ClampToEdgeWrapping;
  chamber.wrapT = ClampToEdgeWrapping;
  chamber.needsUpdate = true;

  // Aspect-driven only — the plate holds still while the camera moves, which
  // is what makes the parallax read.
  const { width, height } = useThree((s) => s.size);
  const { w, h } = useMemo(() => plateSize(width / Math.max(height, 1)), [width, height]);

  return (
    <mesh position={[0, h * (FLOOR_LINE - 0.5), -PLATE_Z]} frustumCulled={false} renderOrder={-1000}>
      <planeGeometry args={[w, h]} />
      {/* Unlit and unfogged: the render carries its own light and depth. */}
      <meshBasicMaterial map={chamber} fog={false} depthWrite={false} depthTest={false} toneMapped />
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
