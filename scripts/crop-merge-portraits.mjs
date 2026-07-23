/**
 * Crop the two identity portraits out of the merge-sequence board.
 *
 * assets-src/boards/merging.png is a full design board; only the two portrait
 * plates inside its left/right cards are wanted as real assets — the frame,
 * labels, progress column and header are all rebuilt as live DOM so they can
 * carry real values. Run: node scripts/crop-merge-portraits.mjs
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'assets-src/boards/merging.png');
const OUT = resolve(root, 'src/assets/merge');

// Measured against the 2172x724 source.
const PLATES = [
  { name: 'cypherpunk', left: 109, top: 132, width: 384, height: 415 },
  { name: 'astronaut', left: 1678, top: 132, width: 384, height: 415 },
];

mkdirSync(OUT, { recursive: true });

const meta = await sharp(SRC).metadata();
console.log(`source ${meta.width}x${meta.height}`);

for (const p of PLATES) {
  const out = resolve(OUT, `${p.name}.webp`);
  await sharp(SRC)
    .extract({ left: p.left, top: p.top, width: p.width, height: p.height })
    .webp({ quality: 90 })
    .toFile(out);
  console.log(`  ${p.name}.webp  ${p.width}x${p.height}`);
}
