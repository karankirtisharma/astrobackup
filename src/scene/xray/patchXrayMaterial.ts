import type { Material } from 'three';
import { lensUniforms } from './lensUniforms';

type Mode = 'body' | 'anatomy';

/**
 * Inject the lens test into a material's fragment shader.
 *
 * - body:    fragment alpha ×= t        → fades out INSIDE the lens (a hole)
 * - anatomy: fragment alpha ×= (1 − t)  → fades out OUTSIDE the lens
 *
 * t is a smoothstep across a feather band around the radius, so the two are
 * complementary and sum to 1 through the transition — a crossfade, not a
 * punched circle. Distance is in gl_FragCoord space (framebuffer px).
 */
export function patchXrayMaterial(mat: Material, mode: Mode): void {
  // Re-patching would run .replace() against an already-injected shader —
  // the first anchor is gone, so nothing changes on the string BUT the
  // uniforms would be appended twice on the next compile. Guard hard.
  if (mat.userData.xrayPatched) return;
  mat.userData.xrayPatched = true;

  mat.transparent = true;
  // BOTH modes write depth.
  //
  // Body: it is the outer, near-opaque shell, and its depth preserves the
  // scene's sort order against the platform and particles.
  //
  // Anatomy: it USED to skip depth writes so its invisible (alpha-0) area
  // outside the lens couldn't occlude the scene — but that also stopped its own
  // ~56 sub-meshes from sorting against each other, so inner organs drew OVER
  // outer muscle depending on draw order. That was invisible while the reveal
  // was flat white; the moment the texture showed through it read as a glitchy
  // blob with dark voids. Fix: DISCARD the invisible area (see below) instead
  // of blending it, which makes writing depth safe — nothing outside the lens
  // is ever rasterised, and inside the lens the layers sort correctly.
  mat.depthWrite = true;

  // SET, not multiply. These Tripo materials carry a stray sub-1 alpha in
  // their textures — the reason Character.tsx forces them opaque. Multiplying
  // (`a *= t`) re-exposed it: outside the lens the shirt went semi-transparent
  // and the anatomy ghosted through the whole body, which chromatic aberration
  // then split into a coloured fringe. Overwriting alpha discards that base
  // channel, so the surface is fully opaque everywhere except the lens hole.
  const alphaExpr = mode === 'body' ? '_t' : '(1.0 - _t)';
  // Anatomy throws away its fully-transparent area so writing depth is safe
  // (see the depthWrite note above) — that is what makes its own layers sort.
  // The body must NOT discard: it stays a blended shell whose depth anchors the
  // scene's sort order even where the lens has faded it to nothing.
  const discardLine = mode === 'anatomy' ? 'if (gl_FragColor.a < 0.02) discard;' : '';

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLensCenter = lensUniforms.uLensCenter;
    shader.uniforms.uLensRadius = lensUniforms.uLensRadius;
    shader.uniforms.uLensFeather = lensUniforms.uLensFeather;

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform vec2 uLensCenter;
        uniform float uLensRadius;
        uniform float uLensFeather;`
      )
      .replace(
        '#include <dithering_fragment>',
        /* glsl */ `#include <dithering_fragment>
        {
          // RECTANGULAR scan window, in screen space. Simple and absolute:
          // inside the rect the other model shows EXACTLY, outside it never
          // does. The edge is a hard few-pixel antialias rather than a wide
          // feathered band, so there is no muddy body/anatomy crossfade.
          vec2 _half = vec2(uLensRadius * 1.30, uLensRadius * 0.85);
          vec2 _q = abs(gl_FragCoord.xy - uLensCenter) - _half;
          float _d = max(_q.x, _q.y);          // < 0 inside the rect, > 0 outside
          float _e = max(1.0, uLensRadius * uLensFeather * 0.15); // ~1-2px edge
          float _t = smoothstep(-_e, _e, _d);  // 0 inside → 1 outside
          gl_FragColor.a = ${alphaExpr};
          ${discardLine}
        }`
      );
  };

  // CRITICAL (spec §4): without a custom key, three can hand this material a
  // program cached for an unpatched material of the same type+params — one
  // that never saw onBeforeCompile, so uLens* are never uploaded and the
  // surface renders garbage or vanishes. The key is APPENDED to three's
  // parameter-derived key, so a constant per-mode discriminator is enough;
  // map/vertexColor/etc. differences are still encoded by the base key.
  mat.customProgramCacheKey = () => `xray-${mode}`;

  mat.needsUpdate = true;
}
