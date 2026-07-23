import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Mesh, type Group, type Material, type MeshStandardMaterial } from 'three';
import { patchXrayMaterial } from './patchXrayMaterial';
import { lensState } from './lensUniforms';
import { DEBUG_FLAGS } from '../../debugFlags';
import type { Side } from '../../state/transitions';

/** One underlay per figure. Both are normalized to height 1.8 / feet y=0 by
 *  `npm run optimize:models`, so each registers with its own body model. */
const ANATOMY_URL: Record<Side, string> = {
  cypherpunk: `${import.meta.env.BASE_URL}models/anatomy.glb`,
  astronaut: `${import.meta.env.BASE_URL}models/astroanatomy.glb`,
};
useGLTF.preload(ANATOMY_URL.cypherpunk);
useGLTF.preload(ANATOMY_URL.astronaut);

/**
 * Malformed sub-meshes to hide by name (spec §7). AI-generated anatomy models
 * routinely ship a few broken nodes — most often the hands — that read as
 * garbage geometry when revealed. Found by inspecting at `?xray=full`, then
 * listed here rather than attempting to repair the geometry.
 *
 * Matched case-insensitively as substrings against node names.
 */
const HIDDEN_MESH_PATTERNS: Record<Side, string[]> = {
  cypherpunk: [
    // The hands. Crude mitten geometry, and the anatomy figure's proportions
    // drift from the body model's at the extremities, so the lens over a hand
    // showed a displaced grey blob — the classic AI-model hand failure.
    // Located via scripts/inspect-anatomy-parts.mjs (outermost |x| at wrist
    // height). Hidden, the lens over a hand opens onto a soft empty feather,
    // which reads as "nothing to scan here" rather than a glitch.
    'tripo_part_7',
    'tripo_part_24',
  ],
  // None identified yet — inspect at ?xray=full and add any broken nodes here.
  astronaut: [],
};

/**
 * Per-model authoring yaw correction.
 *
 * The underlay is nested inside the body's transform, so it inherits the body's
 * BASE_YAW (Character.tsx). astronaut.glb is modelled side-on and is rotated
 * +90° to face front — but astroanatomy.glb already ships front-facing, so it
 * inherits a rotation it doesn't need and reads in profile inside the suit.
 * Cancel it here. The cypherpunk pair share an orientation, so it needs none.
 */
const ANATOMY_YAW: Record<Side, number> = { cypherpunk: 0, astronaut: -Math.PI / 2 };

/**
 * The anatomy underlay. Loads once, patches every material to fade OUTSIDE the
 * lens, and draws before the body (renderOrder -1) so the body's own inside
 * fade reveals it. Nested by the caller inside the body's transform groups, so
 * it inherits identical position / rotation / breath / sway — perfect
 * registration, the lens can never slide off what it scans.
 */
export function Anatomy({ side }: { side: Side }) {
  const { scene } = useGLTF(ANATOMY_URL[side]);
  const group = useRef<Group>(null);

  // ~400k triangles the reveal only ever shows a peek of — skip the whole draw
  // while the lens is closed (the common, not-hovering case). With BOTH figures
  // carrying an underlay, also skip it when the lens is over the OTHER one:
  // it would render fully transparent for nothing. Fail-safe — if no side has
  // been recorded, draw rather than silently hide the reveal.
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const mine = lensState.side === null || lensState.side === side;
    g.visible = lensState.cssRadius > 0.3 && (DEBUG_FLAGS.xray === 'full' || mine);
  });

  const prepared = useMemo(() => {
    const hidden: string[] = [];
    scene.traverse((obj) => {
      if (!(obj as Mesh).isMesh) return;
      const mesh = obj as Mesh;

      const broken = HIDDEN_MESH_PATTERNS[side].some((p) =>
        mesh.name.toLowerCase().includes(p.toLowerCase())
      );
      if (broken) {
        mesh.visible = false;
        hidden.push(mesh.name);
        return;
      }

      mesh.raycast = () => {}; // never intersected; the capsule owns the pointer
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.renderOrder = -1; // draw beneath the body
      const mats: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        patchXrayMaterial(mat, 'anatomy');
        // Interior exposure. Under the studio relight the pale muscle tones
        // land at nearly the white shirt's luminance, and the reveal washes
        // out to nothing through a small window. A body cavity is occluded
        // from the key anyway — recess it: same hues, lower exposure, no
        // specular shine. (Guarded: useGLTF caches the scene, and repeating
        // the multiply on a remount would compound the darkening.)
        const std = mat as MeshStandardMaterial;
        if (std.color && !std.userData.xrayRecessed) {
          std.userData.xrayRecessed = true;
          // DECOUPLE from the scene lighting. This effect broke every time
          // the rig was retuned because the revealed muscle was lit by the
          // key + env like any surface — so a brighter rig washed it out, a
          // darker one buried it. Instead: light it from its OWN albedo as
          // emissive (a fixed floor), keep only a whisper of scene response
          // for 3D form, and kill env reflection. The reveal now looks the
          // same no matter what happens to the lights. Do NOT re-couple it.
          // Low albedo kills the lit response — including the green hover
          // accent light that was tinting the muscle. The look is carried by
          // a DESATURATED self-emissive (silver-muscle, no colour cast), so
          // it reads like a clean scan regardless of the rig or its accents.
          // THE detail lives in the TEXTURE, not the base-colour factor: every
          // Tripo part ships baseColor = pure white + a map. Deriving the
          // emissive from std.color therefore painted a FLAT WHITE glow across
          // the whole figure and drowned the texture — the "whitish blob".
          // Drive the emissive from the MAP instead, so the self-lit floor
          // carries the actual anatomical structure. Still fully decoupled from
          // scene lighting (that rule stands) — the map is its own light.
          if (std.map) std.emissiveMap = std.map;
          std.emissive.setRGB(1, 1, 1); // map supplies colour + detail
          std.emissiveIntensity = 0.7;
          std.color.multiplyScalar(0.32);
          std.roughness = 0.95;
          std.metalness = 0;
          std.envMapIntensity = 0.12;
          // Adding emissiveMap changes the shader permutation — force a rebuild.
          std.needsUpdate = true;
        }
      }
    });

    if (import.meta.env.DEV && DEBUG_FLAGS.xray === 'full') {
      // eslint-disable-next-line no-console
      console.log(
        `[xray] ${side} anatomy meshes:`,
        (() => {
          const names: string[] = [];
          scene.traverse((o) => {
            if ((o as Mesh).isMesh) names.push(o.name);
          });
          return names;
        })()
      );
      if (hidden.length) console.log(`[xray] ${side} hidden:`, hidden);
    }
    return scene;
  }, [scene, side]);

  return (
    <group ref={group} visible={false} rotation-y={ANATOMY_YAW[side]}>
      <primitive object={prepared} />
    </group>
  );
}
