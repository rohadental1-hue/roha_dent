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

for (const [name, [file, box]] of Object.entries(crops)) {
  const full = await sharp(join(src, file)).rotate().extract(box).resize(W, H, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
  await sharp(full).toFile(join(out, `${name}.webp`));
  await sharp(full).resize(W / 2).webp({ quality: 78 }).toFile(join(out, `${name}-sm.webp`));
  console.log('wrote', name);
}
