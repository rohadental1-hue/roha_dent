// Patient results shown on the home page (Results section) and on each treatment page.
//
// HOW TO ADD A CASE: add an entry below. Put the two photos in apps/web/public/img/results/ as
//   <name>-before.webp and <name>-after.webp (900×600, 3:2), each with a half-size <name>-before-sm.webp /
//   <name>-after-sm.webp next to it. For real patients, crop to the mouth only with scripts/crop-cases.mjs
//   (it also strips GPS/EXIF data) and keep the original photos OUT of the repo.
// HOW TO REMOVE A CASE: delete its entry (and its image files). The layout works for 3 to 8 cases.
//
// These are real Roha Dental patients, shared with their permission.
// TODO (confirm with clinic): titles and descriptions are read from the photos, not from the patients' records.
export type BeforeAfterCase = {
  id: string;
  /** Slug of the treatment page this case belongs to (content/services.ts). */
  treatment: string;
  title: string;
  /** One line. */
  description: string;
  beforeImage: string;
  afterImage: string;
};

const img = (name: string, k: 'before' | 'after') => `/img/results/${name}-${k}.webp`;

export const beforeAfterCases: BeforeAfterCase[] = [
  {
    id: 'upper-smile-rebuilt', treatment: 'zirconia-crowns-bridges',
    title: 'Upper smile rebuilt', description: 'Broken and decayed upper teeth restored with new crowns.',
    beforeImage: img('case-b', 'before'), afterImage: img('case-b', 'after'),
  },
  {
    id: 'smile-makeover', treatment: 'porcelain-veneers',
    title: 'Smile makeover', description: 'Stained, worn teeth turned into a bright, even smile.',
    beforeImage: img('case-a', 'before'), afterImage: img('case-a', 'after'),
  },
  {
    id: 'missing-teeth-replaced', treatment: 'removable-denture',
    title: 'Missing teeth replaced', description: 'Missing and broken front teeth replaced with natural-looking teeth.',
    beforeImage: img('case-d', 'before'), afterImage: img('case-d', 'after'),
  },
  {
    id: 'stained-teeth-restored', treatment: 'porcelain-veneers',
    title: 'Stained teeth restored', description: 'Heavily stained front teeth brought back to a clean, natural colour.',
    beforeImage: img('case-c', 'before'), afterImage: img('case-c', 'after'),
  },
  {
    id: 'front-teeth-aligned', treatment: 'zirconia-crowns-bridges',
    title: 'Front teeth aligned', description: 'Uneven front teeth rebuilt with crowns for a straighter line.',
    beforeImage: img('case-e', 'before'), afterImage: img('case-e', 'after'),
  },
];

export const casesFor = (treatment: string) => beforeAfterCases.filter((c) => c.treatment === treatment);
