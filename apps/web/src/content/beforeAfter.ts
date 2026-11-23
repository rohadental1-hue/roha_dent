// Real Roha Dental patients, shared with their permission (the clinic holds their consent).
// The photos are cropped to the mouth only by scripts/crop-cases.mjs; the originals stay outside the repo.
// TODO (confirm with clinic): the captions and treatment links are read from the photos.
export type BeforeAfterCase = {
  slug: string;
  service: string; // treatment page it belongs to
  before: string;
  after: string;
  caption: string;
};

const pair = (id: string) => ({ before: `/img/results/case-${id}-before.webp`, after: `/img/results/case-${id}-after.webp` });

export const beforeAfterCases: BeforeAfterCase[] = [
  { slug: 'smile-makeover-crowns', service: 'zirconia-crowns-bridges', ...pair('b'), caption: 'Smile makeover with new crowns on the upper teeth' },
  { slug: 'smile-makeover', service: 'porcelain-veneers', ...pair('a'), caption: 'Stained, worn teeth to a bright, even smile' },
  { slug: 'missing-front-teeth', service: 'removable-denture', ...pair('d'), caption: 'Missing and broken front teeth replaced' },
  { slug: 'stained-front-teeth', service: 'porcelain-veneers', ...pair('c'), caption: 'Heavily stained front teeth restored' },
  { slug: 'front-teeth', service: 'zirconia-crowns-bridges', ...pair('e'), caption: 'Uneven front teeth rebuilt for a straighter line' },
];

export const casesFor = (service: string) => beforeAfterCases.filter((c) => c.service === service);
