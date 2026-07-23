import type { Material } from 'three';
import { lensUniforms } from './lensUniforms';

type Mode = 'body' | 'anatomy';

/**
 * Cut a rectangular scan window through a material, in screen space.
 *
 * DELIBERATELY OPAQUE + DISCARD — there is no alpha blending anywhere:
 *   - body:    discarded INSIDE the rect  → the shell is cut away there
 *   - anatomy: discarded OUTSIDE the rect → it exists only inside the window
 *
 * Because both materials stay opaque and depth-tested, what you see is decided
 * by DEPTH alone — never by draw order, blend state, or per-texture alpha. That
 * is what makes the guarantee absolute: inside the rect the anatomy shows
 * exactly, outside it the body shows exactly, with nothing in between.
 *
 * This replaced an alpha-blended version that kept failing in three separate
 * ways, all of which are now structurally impossible:
 *   1. a wide feathered band crossfading shirt+anatomy into a muddy smear;
 *   2. the anatomy's ~56 sub-meshes not sorting against each other, so inner
 *      organs drew over outer muscle and gaps rendered as black voids;
 *   3. the Tripo materials' stray sub-1 texture alpha ghosting the whole shell.
 * With opaque geometry and a hard cut, none of those have anywhere to happen.
 *
 * The window is axis-aligned in gl_FragCoord space (framebuffer pixels, origin
 * bottom-left), sized from the shared lens uniforms so the DOM reticle and the
 * shader edge stay pixel-locked.
 */
export function patchXrayMaterial(mat: Material, mode: Mode): void {
  // Re-patching would run .replace() against an already-injected shader — the
  // first anchor is gone, so the string would silently not change while the
  // uniforms got appended twice on the next compile. Guard hard.
  if (mat.userData.xrayPatched) return;
  mat.userData.xrayPatched = true;

  mat.transparent = false;
  mat.depthWrite = true;

  // Body is cut away inside the window; anatomy only survives inside it.
  const cutTest = mode === 'body' ? '_revealed' : '!_revealed';

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLensCenter = lensUniforms.uLensCenter;
    shader.uniforms.uLensRadius = lensUniforms.uLensRadius;
    shader.uniforms.uScanY = lensUniforms.uScanY;
    shader.uniforms.uScanOn = lensUniforms.uScanOn;

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform vec2 uLensCenter;
        uniform float uLensRadius;
        uniform float uScanY;
        uniform float uScanOn;`
      )
      // ANCHORED AT THE TOP OF main(), NOT THE BOTTOM.
      //
      // This used to splice into <dithering_fragment>, the LAST include in the
      // physical shader — so every fragment of the ~400k-triangle underlay ran
      // the full map/normal/emissive/ao chain, lights_physical across 8 punctual
      // lights and the env IBL, and was only then thrown away. Nearly all of
      // that work was for pixels outside a 130x85px window.
      //
      // <clipping_planes_fragment> is the first chunk in main() and nothing
      // between the two anchors writes depth or feeds the decision (it depends
      // only on gl_FragCoord and the lens uniforms), so rejecting here is
      // identical output for a fraction of the shading cost.
      .replace(
        '#include <clipping_planes_fragment>',
        /* glsl */ `#include <clipping_planes_fragment>
        {
          // Rect half-size from the shared radius. Closed lens => radius 0 and
          // the centre parked far offscreen, so _d > 0 everywhere: the body
          // survives untouched and the anatomy is fully discarded.
          vec2 _half = vec2(uLensRadius * 1.30, uLensRadius * 0.85);
          vec2 _q = abs(gl_FragCoord.xy - uLensCenter) - _half;
          float _d = max(_q.x, _q.y); // < 0 inside the rect, > 0 outside

          // Revealed = inside the hover rect OR already passed by the merge
          // sweep. Widening this ONE predicate is the entire scan feature; the
          // cut itself is untouched, so it keeps every guarantee it had.
          // uScanOn is 0 outside the ceremony, which collapses this back to the
          // exact rect-only behaviour bit for bit.
          bool _revealed = (_d < 0.0) || (uScanOn > 0.5 && gl_FragCoord.y > uScanY);
          if (${cutTest}) discard;
        }`
      );

    // The sweep's leading edge, drawn on the ANATOMY only — the anatomy exists
    // exactly where the sweep has already passed, so its lowest surviving
    // fragments ARE the scan front. Injected late because it needs gl_FragColor,
    // unlike the discard above which is deliberately as early as possible.
    if (mode === 'anatomy') {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        /* glsl */ `#include <dithering_fragment>
        {
          float _e = gl_FragCoord.y - uScanY;
          if (uScanOn > 0.5 && _e >= 0.0 && _e < 6.0) {
            gl_FragColor.rgb += vec3(0.69, 0.96, 0.27) * (1.0 - _e / 6.0) * 1.7;
          }
        }`
      );
    }
  };

  // CRITICAL (spec §4): without a custom key, three can hand this material a
  // program cached for an unpatched material of the same type+params — one that
  // never saw onBeforeCompile, so uLens* are never uploaded and the surface
  // renders garbage or vanishes. Keyed per mode AND per cut-shape so a stale
  // program from the old blended build can never be reused.
  // The key MUST change whenever the injected GLSL or its anchor changes, or
  // three hands this material a program compiled against the old source.
  mat.customProgramCacheKey = () => `xray-scan-cut-${mode}`;

  mat.needsUpdate = true;
}
