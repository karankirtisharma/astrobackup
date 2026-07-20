import type { Material, WebGLProgramParametersWithUniforms } from 'three';
import { Vector3 } from 'three';

/**
 * Patches a standard material so it participates in the scan lens.
 *
 * `mode: 'cutaway'` — the outer body. Fragments INSIDE the lens are
 * discarded, punching a clean hole through to whatever is behind.
 * `mode: 'reveal'`  — the anatomy. Fragments OUTSIDE the lens are discarded,
 * so it exists only within the circle.
 *
 * The test runs on gl_FragCoord, so it is exact in screen space regardless
 * of how the model is transformed — no projection maths in the vertex stage,
 * and it survives the breathing/sway/spin the characters are already under.
 */
export type ScanMode = 'cutaway' | 'reveal';

export interface ScanUniforms {
  uScanCenter: { value: Vector3 };
  uScanRadius: { value: number };
}

/** One shared uniform object per mode keeps every patched material in sync. */
export function createScanUniforms(): ScanUniforms {
  return {
    // xy = centre in drawing-buffer px, z unused (Vector3 for cheap .set)
    uScanCenter: { value: new Vector3(-9999, -9999, 0) },
    uScanRadius: { value: 0 },
  };
}

const COMMON_HEAD = /* glsl */ `
  uniform vec3 uScanCenter;
  uniform float uScanRadius;
`;

export function patchScanMaterial(material: Material, mode: ScanMode, uniforms: ScanUniforms) {
  // Without this, a patched material can be handed a program compiled for an
  // identical *unpatched* material — the discard is there but uScan* never
  // gets uploaded, so the shader reads uninitialised memory and can cull the
  // whole mesh. The cache key must reflect the injection.
  material.customProgramCacheKey = () => `cy-scan-${mode}`;

  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uScanCenter = uniforms.uScanCenter;
    shader.uniforms.uScanRadius = uniforms.uScanRadius;

    shader.fragmentShader = COMMON_HEAD + shader.fragmentShader;

    if (mode === 'cutaway') {
      // Cut the body away inside the lens. A hard edge here is correct: the
      // ring is drawn separately and reads as the instrument's aperture.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        if (uScanRadius > 0.5 && distance(gl_FragCoord.xy, uScanCenter.xy) < uScanRadius) discard;`
      );
    } else {
      // The anatomy exists only inside the lens.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        float scanD = distance(gl_FragCoord.xy, uScanCenter.xy);
        if (uScanRadius <= 0.5 || scanD > uScanRadius) discard;`
      );
      // Grade the revealed tissue toward the protocol green and lay scan
      // lines over it, so it reads as instrumentation rather than a second
      // model peeking through.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        {
          float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
          vec3 tint = mix(vec3(0.16, 0.26, 0.05), vec3(0.62, 0.82, 0.36), lum);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, tint, 0.82);
          // Scan lines, plus a brightening lip just inside the aperture.
          float lines = 0.92 + 0.08 * sin(gl_FragCoord.y * 0.55);
          float lip = smoothstep(uScanRadius, uScanRadius * 0.86, scanD);
          gl_FragColor.rgb *= lines;
          gl_FragColor.rgb += vec3(0.10, 0.16, 0.03) * (1.0 - lip);
        }`
      );
    }
  };
  // Force a recompile if the material was already used.
  material.needsUpdate = true;
}
