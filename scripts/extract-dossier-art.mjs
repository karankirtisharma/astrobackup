/**
 * Crops the module artwork out of the two reference boards.
 *
 * Put the full board images here:
 *   assets-src/boards/cypherpunk.png
 *   assets-src/boards/astronaut.png
 *
 * Then:  npm run art:extract
 *
 * Output lands in src/assets/dossier/, where ArtSlot picks it up at build
 * time with no code change.
 *
 * Boxes are FRACTIONS of the source image (0..1), so they survive whatever
 * resolution the boards are exported at. Tweak a box and re-run — the script
 * is idempotent.
 */
import { mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'assets-src/boards');
const OUT = resolve(ROOT, 'src/assets/dossier');

/**
 * [left, top, right, bottom] as fractions of the source image, with an
 * optional [gain, bias] alpha curve appended.
 *
 * The default curve suits art that sits on a near-black field. Panel
 * screenshots (the MRI slices) carry their own mid-grey scan background,
 * which the default curve leaves faintly opaque — a ghost rectangle on the
 * glass. Those need a higher black point.
 */
const DEFAULT_KEY = [1.35, -20];

const CROPS = {
  cypherpunk: {
    // right edge stops just short of the HRV/CORT/FOCUS readouts
    anatomy: [0.437, 0.062, 0.824, 0.434],
    fingerprint: [0.462, 0.522, 0.702, 0.668],
    // inset past the source viewport frame + its tick labels, and keyed hard
    // so the scan field drops out instead of reading as a box
    'mri-coronal': [0.047, 0.733, 0.263, 0.879, 2.1, -74],
    'mri-axial': [0.291, 0.733, 0.503, 0.879, 2.1, -74],
    radar: [0.772, 0.735, 0.992, 0.862],
    signature: [0.545, 0.912, 0.735, 0.962],
  },
  astronaut: {
    skull: [0.05, 0.344, 0.29, 0.462],
    planet: [0.05, 0.676, 0.29, 0.772],
    suit: [0.567, 0.478, 0.732, 0.632],
    'suit-xray': [0.567, 0.753, 0.732, 0.898],
  },
};

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function run() {
  await mkdir(OUT, { recursive: true });
  let wrote = 0;
  let skipped = 0;

  for (const [board, regions] of Object.entries(CROPS)) {
    const src = resolve(SRC, `${board}.png`);
    if (!(await exists(src))) {
      console.warn(`· skip ${board}: ${src} not found`);
      skipped += Object.keys(regions).length;
      continue;
    }

    const img = sharp(src);
    const { width, height } = await img.metadata();
    console.log(`\n${board}.png — ${width}×${height}`);

    for (const [name, [l, t, r, b, gain, bias]] of Object.entries(regions)) {
      const [kGain, kBias] = gain === undefined ? DEFAULT_KEY : [gain, bias];
      const left = Math.round(l * width);
      const top = Math.round(t * height);
      const w = Math.round((r - l) * width);
      const h = Math.round((b - t) * height);
      const dest = resolve(OUT, `${name}.png`);

      // ——— luminance → alpha ———
      // The boards are white-on-black, so brightness IS coverage. Keying the
      // black field to transparent (rather than relying on mix-blend-mode)
      // is what lets these sit on a translucent glass surface: a blend mode
      // composites against whatever shows through the blur and the black
      // rectangle lifts back into view.
      //
      // RGB is flattened to white and all tonal detail carried in alpha —
      // un-premultiplied, so compositing over black reproduces the source
      // exactly while over glass it reads as a lit HUD overlay.
      const alpha = await sharp(src)
        .extract({ left, top, width: w, height: h })
        .greyscale()
        .linear(kGain, kBias) // crush the background field to zero
        .raw()
        .toBuffer();

      await sharp(Buffer.alloc(w * h * 3, 255), { raw: { width: w, height: h, channels: 3 } })
        .joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } })
        .png({ compressionLevel: 9 })
        .toFile(dest);

      console.log(`  ✓ ${name}.png  ${w}×${h}  (alpha-keyed)`);
      wrote += 1;
    }
  }

  console.log(`\n${wrote} written, ${skipped} skipped → src/assets/dossier/`);
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
