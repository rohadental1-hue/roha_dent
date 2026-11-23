// Everything the clinic offers (from the clinic's own service list), grouped for the /services page.
// `to` is the page that explains it: a treatment page, or /book for a check-up where there is no page.

export type OfferItem = { name: string; to: string };
export type OfferCategory = { title: string; items: OfferItem[] };

export const serviceCategories: OfferCategory[] = [
  {
    title: 'Preventive care and gums',
    items: [
      { name: 'Scaling (teeth cleaning)', to: '/services/scaling' },
      { name: 'Periodontal treatment', to: '/services/gum-treatment' },
      { name: 'Gum surgery', to: '/services/gum-treatment' },
    ],
  },
  {
    title: 'Cosmetic dentistry',
    items: [
      { name: 'Teeth whitening', to: '/services/teeth-whitening' },
      { name: 'Porcelain veneers', to: '/services/porcelain-veneers' },
      { name: 'Smile makeovers', to: '/services/porcelain-veneers' },
      { name: 'Digital smile design', to: '/services/porcelain-veneers' },
    ],
  },
  {
    title: 'Orthodontics',
    items: [
      { name: 'Braces', to: '/services/braces-invisible' },
      { name: 'Clear aligners', to: '/services/braces-invisible' },
    ],
  },
  {
    title: 'Restorative dentistry',
    items: [
      { name: 'Root canal treatment', to: '/services/root-canal' },
      { name: 'Zirconia crowns and bridges', to: '/services/zirconia-crowns-bridges' },
      { name: 'E.max crowns', to: '/services/emax-crown' },
      { name: 'Ceramic crowns', to: '/services/ceramic-crown' },
    ],
  },
  {
    title: 'Implants and dentures',
    items: [
      { name: 'Dental implants', to: '/services/dental-implants' },
      { name: 'Full and partial dentures', to: '/services/removable-denture' },
      { name: 'Full-mouth rehabilitation', to: '/book?service=checkup' },
    ],
  },
  {
    title: 'Oral surgery',
    items: [
      { name: 'Wisdom tooth extraction', to: '/services/oral-surgery' },
      { name: 'Oral surgery', to: '/services/oral-surgery' },
    ],
  },
  {
    title: 'Children',
    items: [{ name: "Children's dentistry", to: '/services/childrens-dentistry' }],
  },
];
