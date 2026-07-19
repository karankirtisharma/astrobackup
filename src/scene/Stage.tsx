import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import {
  AdditiveBlending,
  BufferGeometry,
  ClampToEdgeWrapping,
  Float32BufferAttribute,
  MathUtils,
  Mesh,
  MirroredRepeatWrapping,
  PerspectiveCamera,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { DUST_VERT, DUST_FRAG } from './shaders';

const CHAMBER_URL = `${import.meta.env.BASE_URL}env/chamber.webp`;
useTexture.preload(CHAMBER_URL);

const CHAMBER_ASPECT = 1857 / 847;
/**
 * Where the chamber's back wall meets its floor, as a fraction down the
 * image (measured from its luminance ramp). The backplate anchors this line
 * to the scene's true horizon, so the painted floor and the 3D ground plane
 * share one vanishing line — the platforms sit on the render's own floor.
 */
const FLOOR_LINE = 0.6;
/** Camera-space distance of the backplate. Inside the far plane (60). */
const PLATE_DIST = 34;
/** Oversize so horizon anchoring never exposes an edge. */
const PLATE_OVERSCAN = 1.08;

/**
 * The chamber is the render itself: a camera-locked backplate that always
 * covers the frame (never cropped, never letterboxed), with its floor line
 * pinned to the 3D horizon so world-space objects composite onto its floor.
 * There is no 3D floor slab — nothing can cut the plate.
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
  // Cover-fit crops rather than stretches; mirrored sideways so an extreme
  // aspect extends the chamber instead of exposing an edge, clamped
  // vertically so the ceiling/floor rows carry on.
  chamber.wrapS = MirroredRepeatWrapping;
  chamber.wrapT = ClampToEdgeWrapping;
  chamber.needsUpdate = true;

  const mesh = useRef<Mesh>(null!);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const dir = useMemo(() => new Vector3(), []);
  const offset = useMemo(() => new Vector3(), []);

  // Placed in camera space every frame (rather than parented — R3F's default
  // camera is not in the scene graph, so its children never render). The
  // plate is a backplate, not scenery: it holds the frame wherever the dolly
  // goes.
  useFrame(({ size }) => {
    const fovHalf = MathUtils.degToRad(camera.fov) / 2;
    const viewH = 2 * PLATE_DIST * Math.tan(fovHalf);
    const viewW = viewH * (size.width / Math.max(size.height, 1));

    // Cover: fill the frame, preserve the render's aspect, crop the excess.
    let w: number;
    let h: number;
    if (viewW / viewH > CHAMBER_ASPECT) {
      w = viewW;
      h = viewW / CHAMBER_ASPECT;
    } else {
      h = viewH;
      w = viewH * CHAMBER_ASPECT;
    }
    w *= PLATE_OVERSCAN;
    h *= PLATE_OVERSCAN;
    mesh.current.scale.set(w, h, 1);

    // Pin the render's floor line to the scene's true horizon. Everything
    // standing on y=0 then meets the painted floor at the same vanishing
    // line, and it tracks automatically as the camera pitches.
    camera.getWorldDirection(dir);
    const pitchDown = Math.asin(MathUtils.clamp(-dir.y, -1, 1));
    const horizonY = Math.tan(pitchDown) * PLATE_DIST;
    const y = horizonY - h * (0.5 - FLOOR_LINE);
    // Never let the anchor pull an edge into frame.
    const limit = (h - viewH) / 2;

    mesh.current.quaternion.copy(camera.quaternion);
    offset.set(0, MathUtils.clamp(y, -limit, limit), -PLATE_DIST).applyQuaternion(camera.quaternion);
    mesh.current.position.copy(camera.position).add(offset);
  });

  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={-1000}>
      <planeGeometry args={[1, 1]} />
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
