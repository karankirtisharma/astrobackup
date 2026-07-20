import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, PointLight, SpotLight } from 'three';
import { lightProxy, fxProxy } from '../motion/proxies';
import { COLORS } from '../config/lightingPresets';
import { CHAR_X } from '../config/cameraPoses';

/**
 * Fixed six-light rig, read from lightProxy every frame.
 * Green is the cypherpunk's rim and the protocol's voice; the astronaut rims
 * cool white — the two philosophies are lit differently on purpose.
 */
export function LightingRig() {
  const keyL = useRef<SpotLight>(null!);
  const keyR = useRef<SpotLight>(null!);
  const rimL = useRef<SpotLight>(null!);
  const rimR = useRef<SpotLight>(null!);
  const core = useRef<PointLight>(null!);
  const flood = useRef<PointLight>(null!);

  const targets = useMemo(() => {
    const l = new Object3D();
    l.position.set(-CHAR_X, 1.0, 0);
    const r = new Object3D();
    r.position.set(CHAR_X, 1.0, 0);
    return { l, r };
  }, []);

  useFrame(() => {
    keyL.current.intensity = lightProxy.keyL * 34;
    keyR.current.intensity = lightProxy.keyR * 34;
    rimL.current.intensity = lightProxy.rimL * 40;
    rimR.current.intensity = lightProxy.rimR * 40;
    core.current.intensity = (lightProxy.core + fxProxy.uEnergy * 2.2) * 4;
    flood.current.intensity = lightProxy.flood * 30;
  });

  return (
    <>
      <primitive object={targets.l} />
      <primitive object={targets.r} />
      {/* A white room bounces light from every surface: ambient does most of
          the modelling now, and the floor bounces back up. */}
      <hemisphereLight args={['#ffffff', '#c8cec8', 2.4]} />

      {/* Keys: upper-front quarter, slightly warm. The look is shadowless by
          design — pedestal glow and rim separation do the grounding. */}
      <spotLight
        ref={keyL}
        position={[-4.4, 3.6, 3.2]}
        angle={0.5}
        penumbra={0.85}
        color={COLORS.keyWarm}
        target={targets.l}
      />
      <spotLight
        ref={keyR}
        position={[4.4, 3.6, 3.2]}
        angle={0.5}
        penumbra={0.85}
        color={COLORS.keyWarm}
        target={targets.r}
      />

      {/* Rims: behind-above. Left is protocol green, right is cool white. */}
      <spotLight
        ref={rimL}
        position={[-3.6, 2.9, -2.6]}
        angle={0.55}
        penumbra={0.9}
        color={COLORS.green}
        target={targets.l}
      />
      <spotLight
        ref={rimR}
        position={[3.6, 2.9, -2.6]}
        angle={0.55}
        penumbra={0.9}
        color={COLORS.rimCool}
        target={targets.r}
      />

      {/* The protocol core's light — ignites with the sequence. */}
      <pointLight ref={core} position={[0, 1.25, 0.2]} color={COLORS.green} distance={7} decay={1.8} />

      {/* Completion flood — the room accepts the protocol. */}
      <pointLight ref={flood} position={[0, 4.5, 1.5]} color={COLORS.greenDeep} distance={14} decay={1.6} />
    </>
  );
}
