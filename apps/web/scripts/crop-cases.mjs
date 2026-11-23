// Crops the clinic's real before/after patient photos to the mouth only (no eyes, nose, hair, ears or jewellery)
// and writes them to public/img/results/ as WebP. sharp drops all metadata (EXIF, GPS) by default.
//
// The originals show faces and must never be committed. They are kept outside the repo:
//   node apps/web/scripts/crop-cases.mjs D:/Projects/Roha_dent_private/patient-photos
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) throw new Error('Pass the private folder that holds the original patient photos.');
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'img', 'results');
mkdirSync(out, { recursive: true });

const W = 900;
const H = 600; // 3:2, the same for every before and after

// output name → [original file, crop box in source pixels (3:2)]
const crops = {
  'case-a-before': ['photo_2026-11-23_15-42-11.jpg', { left: 310, top: 625, width: 405, height: 270 }],
  'case-a-after': ['photo_2026-11-23_15-42-12.jpg', { left: 145, top: 595, width: 315, height: 210 }],
  // one photo holding both: left half before, right half after
  'case-b-before': ['photo_2026-11-23_15-42-15.jpg', { left: 80, top: 575, width: 360, height: 240 }],
  'case-b-after': ['photo_2026-11-23_15-42-15.jpg', { left: 640, top: 560, width: 360, height: 240 }],
  'case-c-before': ['photo_2026-11-23_15-42-25.jpg', { left: 190, top: 160, width: 900, height: 600 }],
  'case-c-after': ['photo_2026-11-23_15-42-33.jpg', { left: 180, top: 57, width: 900, height: 600 }],
  'case-d-before': ['photo_2026-11-23_15-42-05.jpg', { left: 275, top: 590, width: 405, height: 270 }],
  'case-d-after': ['photo_2026-11-23_15-42-08.jpg', { left: 290, top: 360, width: 420, height: 280 }],
  // one designed image: top half before, bottom half after (cropped clear of the BEFORE/AFTER banners and the nose)
  'case-e-before': ['photo_2026-11-23_15-42-38.jpg', { left: 265, top: 160, width: 495, height: 330 }],
  'case-e-after': ['photo_2026-11-23_15-42-38.jpg', { left: 300, top: 700, width: 435, height: 290 }],
};

// Light clean-up, NOT an edit of the result: small white flecks of dental material on the lips, skin and
// tongue are healed like dust on a photo. The teeth and gums are never touched. Spots are [x, y, radius] in
// output pixels (900×600); each is filled from a blurred copy of its surroundings with a soft edge.
const cleanUp = {
  'case-d-after': [
    [400, 128, 9], [270, 160, 8], [232, 236, 10], [246, 253, 8], [652, 151, 13], [705, 191, 8], // lips
    [634, 154, 8], [668, 162, 8], [722, 202, 8], [742, 218, 7], [300, 455, 7], // lip corners and lower lip
    [162, 382, 8], [330, 575, 11], [855, 281, 6], [93, 10, 7], [832, 535, 14], // skin
    [345, 405, 8], // tongue
  ],
};

/** Heals each spot with the median colour around it, feathered over 3px so no edge shows. */
async function healSpots(input, spots) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const med = await sharp(input).removeAlpha().median(25).raw().toBuffer();
  const { width: w, height: h, channels: ch } = info;
  for (const [cx, cy, r] of spots) {
    const R = r + 3;
    for (let y = Math.max(0, cy - R); y <= Math.min(h - 1, cy + R); y++)
      for (let x = Math.max(0, cx - R); x <= Math.min(w - 1, cx + R); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > R) continue;
        const a = d <= r ? 1 : 1 - (d - r) / 3;
        const i = (y * w + x) * ch;
        for (let k = 0; k < 3; k++) data[i + k] = Math.round(data[i + k] * (1 - a) + med[i + k] * a);
      }
  }
  return sharp(data, { raw: { width: w, height: h, channels: ch } }).png().toBuffer();
}

for (const [name, [file, box]] of Object.entries(crops)) {
  let img = await sharp(join(src, file)).rotate().extract(box).resize(W, H, { fit: 'cover' }).png().toBuffer();
  if (cleanUp[name]) img = await healSpots(img, cleanUp[name]);
  const full = await sharp(img).webp({ quality: 82 }).toBuffer();
  await sharp(full).toFile(join(out, `${name}.webp`));
  await sharp(full).resize(W / 2).webp({ quality: 78 }).toFile(join(out, `${name}-sm.webp`));
  console.log('wrote', name);
}
