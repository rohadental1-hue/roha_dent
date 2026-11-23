// Service pages. Slugs match the live rohadent.com URLs. Durations mirror supabase/seed.sql.

export type Service = {
  slug: string;
  name: string;
  shortName: string;
  summary: string;
  durationMinutes: number;
  intro: string[];
  goodFor: string[];
  visit: { title: string; body: string }[]; // a real sequence → rendered as numbered steps
  aftercare: string[];
  faq: { q: string; a: string }[];
  related: string[];
  /** Card and header photo (1200×800), under public/. */
  image: string;
  /** Describes what the photo shows (image search, screen readers). */
  imageAlt: string;
  /** Shown in the short treatment list on the home page, in this order (1 = first). */
  featured?: number;
  /**
   * false = not in the online booking list (the list comes from the database). The page's
   * book button then opens the booking form with a check-up selected instead.
   */
  bookable?: boolean;
};

export const services: Service[] = [
  {
    slug: 'scaling',
    image: '/img/services/scaling.webp',
    imageAlt: 'Dentist cleaning teeth with a scaler and mouth mirror',
    name: 'Scaling (Teeth Cleaning)',
    shortName: 'Teeth cleaning',
    summary: 'Removes hardened tartar and stains so your gums can heal and stay healthy.',
    durationMinutes: 45,
    intro: [
      'Even with careful brushing, plaque hardens into tartar along the gumline. Tartar can only be removed with professional instruments, and when it stays it causes bleeding gums, bad breath and, over time, loose teeth.',
      'Scaling uses an ultrasonic cleaner and fine hand instruments to remove it, followed by polishing to leave the surface smooth.',
    ],
    goodFor: ['Bleeding or swollen gums', 'Bad breath that does not go away', 'Visible tartar or tea and coffee stains', 'A routine check every six months'],
    visit: [
      { title: 'Check-up', body: 'The dentist examines your teeth and gums and points out any problem areas.' },
      { title: 'Scaling', body: 'Tartar is removed above and just below the gumline with an ultrasonic scaler.' },
      { title: 'Polishing', body: 'Teeth are polished to remove stains and make it harder for plaque to stick.' },
      { title: 'Advice', body: 'You get brushing and flossing tips for the areas that need extra care.' },
    ],
    aftercare: ['Gums may feel tender for a day or two. This is normal.', 'Avoid very hot or cold drinks for the rest of the day if your teeth feel sensitive.', 'Book your next cleaning in six months.'],
    faq: [
      { q: 'Does scaling damage the enamel?', a: 'No. Scaling removes tartar that sits on top of the tooth. The enamel itself is not removed.' },
      { q: 'Why do my gums bleed during cleaning?', a: 'Inflamed gums bleed easily. Once the tartar is gone and you keep the area clean, the bleeding usually stops within one to two weeks.' },
    ],
    related: ['teeth-whitening', 'root-canal'],
  },
  {
    slug: 'teeth-whitening',
    featured: 6,
    image: '/img/services/teeth-whitening.webp',
    imageAlt: 'Close-up of a bright, white smile',
    name: 'Tooth Whitening',
    shortName: 'Whitening',
    summary: 'A supervised whitening treatment that lightens your teeth by several shades in one visit.',
    durationMinutes: 60,
    intro: [
      'Coffee, tea, smoking and age gradually darken teeth. In-clinic whitening uses a professional gel applied under the dentist’s supervision, with your gums protected throughout.',
      'We record your shade before and after so you can see the difference.',
    ],
    goodFor: ['Yellowing from tea, coffee or smoking', 'A brighter smile before a wedding or event', 'Evening out colour after braces'],
    visit: [
      { title: 'Shade check', body: 'We record your current shade and confirm whitening is suitable for you.' },
      { title: 'Protection', body: 'A protective barrier is placed over your gums.' },
      { title: 'Whitening', body: 'The whitening gel is applied in short rounds.' },
      { title: 'Result', body: 'We compare your new shade and explain how to keep it.' },
    ],
    aftercare: ['For 48 hours, avoid tea, coffee, red sauces and smoking.', 'Mild sensitivity can occur for a day. A sensitive toothpaste helps.'],
    faq: [
      { q: 'Will whitening work on crowns or fillings?', a: 'No. Whitening only changes natural teeth. If you have visible crowns or fillings, we will discuss matching them afterwards.' },
      { q: 'How long does the result last?', a: 'Usually one to two years, depending on diet and smoking. Regular cleanings help it last longer.' },
    ],
    related: ['scaling', 'emax-crown'],
  },
  {
    slug: 'braces-invisible',
    featured: 2,
    image: '/img/services/braces-invisible.webp',
    imageAlt: 'Person fitting a clear aligner over their teeth',
    name: 'Braces (Invisible / Clear Aligners)',
    shortName: 'Braces and aligners',
    summary: 'Straighten crowded or gapped teeth with clear aligners or modern braces.',
    durationMinutes: 45,
    intro: [
      'Clear aligners are a series of thin, transparent trays that move your teeth step by step. They are removable and hard to notice. For some bites, fixed braces are the better choice.',
      'Treatment starts with an orthodontic consultation, where we examine your bite and explain which option suits you, how long it will take and what it costs. A digital intraoral scanner records your teeth in 3D, so there are no messy impression trays.',
    ],
    goodFor: ['Crowded or overlapping teeth', 'Gaps between teeth', 'Overbite, underbite or crossbite', 'Teeth that moved after earlier braces'],
    visit: [
      { title: 'Consultation', body: 'The orthodontist examines your teeth and bite and discusses your goals.' },
      { title: 'Records', body: 'Photos, X-rays and a digital 3D scan of your teeth are taken to plan your treatment.' },
      { title: 'Treatment plan', body: 'You receive a written plan with the expected duration and cost.' },
      { title: 'Fitting', body: 'Your first aligners or braces are fitted and you learn how to care for them.' },
    ],
    aftercare: ['Wear aligners about 22 hours a day and remove them only to eat and brush.', 'Come to each check-up so we can confirm your teeth are moving as planned.', 'Wear your retainer after treatment to keep the result.'],
    faq: [
      { q: 'Am I too old for braces?', a: 'No. Adults of any age with healthy gums can straighten their teeth.' },
      { q: 'How long does treatment take?', a: 'Most cases take between 6 and 18 months. You will know the estimate for your case after the consultation.' },
    ],
    related: ['scaling', 'teeth-whitening'],
  },
  {
    slug: 'root-canal',
    featured: 4,
    image: '/img/services/root-canal.webp',
    imageAlt: 'Model of a tooth cut open to show the root canals',
    name: 'Root Canal Treatment',
    shortName: 'Root canal',
    summary: 'Treats infection inside the tooth, relieves pain and lets you keep your natural tooth.',
    durationMinutes: 90,
    intro: [
      'When decay or a crack reaches the nerve of a tooth, it becomes inflamed or infected. This causes throbbing pain, sensitivity that lingers, or swelling.',
      'Root canal treatment removes the infected tissue, cleans and shapes the canals and seals them. It is done under local anaesthetic and feels much like a normal filling.',
    ],
    goodFor: ['Strong or throbbing toothache', 'Pain with hot or cold that lasts', 'Swelling or a pimple on the gum', 'A darkened tooth after an injury'],
    visit: [
      { title: 'Diagnosis', body: 'An examination and X-ray show how far the infection has spread.' },
      { title: 'Anaesthetic', body: 'The tooth is numbed so you feel no pain during treatment.' },
      { title: 'Cleaning', body: 'Infected tissue is removed and the canals are cleaned and disinfected.' },
      { title: 'Sealing', body: 'The canals are filled and sealed. A crown is often recommended to protect the tooth.' },
    ],
    aftercare: ['The tooth may be tender for a few days. Normal painkillers help.', 'Avoid chewing hard food on that side until the final filling or crown is placed.'],
    faq: [
      { q: 'Is a root canal painful?', a: 'The treatment itself is done under anaesthetic. Most patients say it relieves the pain they came in with.' },
      { q: 'Why do I need a crown afterwards?', a: 'A treated back tooth becomes more brittle. A crown protects it from cracking.' },
    ],
    related: ['emax-crown', 'ceramic-crown'],
  },
  {
    slug: 'emax-crown',
    image: '/img/services/emax-crown.webp',
    imageAlt: 'All-ceramic restoration being placed on a front tooth',
    name: 'E.max Crown',
    shortName: 'E.max crown',
    summary: 'An all-ceramic crown that is strong and looks very close to a natural tooth.',
    durationMinutes: 60,
    intro: [
      'E.max crowns are made from lithium disilicate ceramic. They let light pass through like natural enamel, so they are a popular choice for front teeth, and they are strong enough for back teeth too.',
      'A crown covers a tooth that is broken, heavily filled, worn or treated with a root canal. Crowns can be designed on the computer from a digital scan of your teeth (CAD/CAM) for a precise fit.',
    ],
    goodFor: ['Broken or cracked teeth', 'Teeth after root canal treatment', 'Front teeth with large fillings or discolouration'],
    visit: [
      { title: 'Preparation', body: 'The tooth is numbed and shaped to make room for the crown.' },
      { title: 'Impression', body: 'An impression is taken and the shade is matched to your teeth.' },
      { title: 'Temporary crown', body: 'A temporary crown protects the tooth while yours is made.' },
      { title: 'Fitting', body: 'At the second visit the E.max crown is checked, adjusted and bonded in place.' },
    ],
    aftercare: ['Brush and floss around the crown as you would a natural tooth.', 'Avoid biting very hard objects such as bones or bottle caps.'],
    faq: [
      { q: 'How many visits does a crown take?', a: 'Usually two: one to prepare the tooth and one to fit the crown, about a week apart.' },
      { q: 'E.max or ceramic crown?', a: 'E.max looks more natural and is often preferred for visible teeth. Your dentist will recommend the best option for each tooth.' },
    ],
    related: ['ceramic-crown', 'root-canal'],
  },
  {
    slug: 'ceramic-crown',
    image: '/img/services/ceramic-crown.webp',
    imageAlt: 'Ceramic crown on a dental model',
    name: 'Ceramic Crown',
    shortName: 'Ceramic crown',
    summary: 'A durable, tooth-coloured crown that restores the shape and strength of a damaged tooth.',
    durationMinutes: 60,
    intro: [
      'Ceramic crowns restore teeth that are too damaged for a filling. They are tooth-coloured and strong, and a reliable choice for back teeth that take heavy chewing forces.',
    ],
    goodFor: ['Back teeth with large fillings', 'Teeth after root canal treatment', 'Replacing old metal crowns'],
    visit: [
      { title: 'Preparation', body: 'The tooth is numbed and shaped.' },
      { title: 'Impression', body: 'An impression and shade match are taken.' },
      { title: 'Temporary crown', body: 'A temporary crown is placed.' },
      { title: 'Fitting', body: 'The final crown is fitted and cemented at the second visit.' },
    ],
    aftercare: ['Keep the gumline around the crown clean to prevent new decay.', 'Come for regular check-ups so we can check the fit.'],
    faq: [{ q: 'How long does a ceramic crown last?', a: 'With good care, most crowns last 10 to 15 years or longer.' }],
    related: ['emax-crown', 'root-canal'],
  },
  {
    slug: 'removable-denture',
    image: '/img/services/removable-denture.webp',
    imageAlt: 'Hand holding a removable partial denture',
    name: 'Full and Partial Dentures',
    shortName: 'Dentures',
    summary: 'Custom full or partial dentures that let you eat and smile with confidence again.',
    durationMinutes: 45,
    intro: [
      'A removable denture replaces several or all missing teeth. Partial dentures clip onto your remaining teeth. Full dentures rest on the gums.',
      'Each denture is made to fit your mouth, and we adjust it until it is comfortable.',
    ],
    goodFor: ['Several missing teeth', 'All teeth missing in one or both jaws', 'Replacing an old, loose denture'],
    visit: [
      { title: 'Assessment', body: 'We examine your gums and remaining teeth and discuss the options.' },
      { title: 'Impressions', body: 'Detailed impressions and bite records are taken.' },
      { title: 'Try-in', body: 'You try a wax version to check the fit, bite and appearance.' },
      { title: 'Fitting and adjustment', body: 'Your denture is fitted, and follow-up visits fine-tune the comfort.' },
    ],
    aftercare: ['Take the denture out at night and clean it daily.', 'Expect a few weeks to get used to eating and speaking with it.', 'Come back for an adjustment if anything rubs or feels loose.'],
    faq: [{ q: 'How many visits are needed?', a: 'Usually three to five visits over two to four weeks, depending on whether extractions are needed first.' }],
    related: ['ceramic-crown', 'scaling'],
  },

  // ---- Added from the clinic's service list (2026-11). Not in the online booking list (bookable: false).
  // TODO: replace the reused photos with photos for these treatments (see public/img/CREDITS.md).
  {
    slug: 'dental-implants',
    featured: 1,
    bookable: false,
    image: '/img/services/ceramic-crown.webp',
    imageAlt: 'Ceramic crown on a dental model',
    name: 'Dental Implants',
    shortName: 'Dental implants',
    summary: 'A fixed, natural-looking replacement for a missing tooth, anchored in the jawbone.',
    durationMinutes: 60,
    intro: [
      'A dental implant is a small titanium post placed in the jawbone where a tooth is missing. Once it has joined with the bone, it holds a crown, a bridge or a denture firmly in place, so you can chew and smile without anything moving.',
      'Implants are planned with a 3D CBCT scan, which shows the height and width of the bone and the position of nerves and sinuses before treatment starts.',
    ],
    goodFor: ['One or more missing teeth', 'A loose denture that needs more support', 'Avoiding grinding down healthy teeth for a bridge', 'Replacing a tooth that cannot be saved'],
    visit: [
      { title: 'Consultation and 3D scan', body: 'The dentist examines your mouth and takes a CBCT scan to check the bone and plan the implant position.' },
      { title: 'Treatment plan', body: 'You receive a plan with the number of visits, the healing time and the cost.' },
      { title: 'Implant placement', body: 'Under local anaesthetic, the implant is placed in the jawbone. Most patients compare it to having a tooth removed.' },
      { title: 'Healing', body: 'Over about two to four months the implant joins with the bone. A temporary tooth can often be worn in the meantime.' },
      { title: 'Crown fitting', body: 'A crown is made to match your teeth and fixed onto the implant.' },
    ],
    aftercare: ['Expect some swelling and tenderness for a few days after placement. Cold packs and normal painkillers help.', 'Eat soft food and avoid smoking while the implant heals.', 'Brush and clean around the implant every day, and come for regular check-ups.'],
    faq: [
      { q: 'Am I suitable for an implant?', a: 'Most adults with healthy gums and enough bone are. The 3D scan at your consultation shows whether extra bone support is needed.' },
      { q: 'How long does an implant last?', a: 'With good cleaning and regular check-ups, implants can last for many years, often for life. The crown on top may need replacing after 10 to 15 years.' },
    ],
    related: ['zirconia-crowns-bridges', 'removable-denture', 'oral-surgery'],
  },
  {
    slug: 'porcelain-veneers',
    featured: 3,
    bookable: false,
    image: '/img/services/porcelain-veneers.webp',
    imageAlt: 'Close-up of even, white front teeth',
    name: 'Porcelain Veneers and Smile Makeovers',
    shortName: 'Veneers and smile design',
    summary: 'Thin porcelain shells that change the colour, shape and size of front teeth, planned with digital smile design.',
    durationMinutes: 60,
    intro: [
      'Veneers are thin layers of porcelain bonded to the front of the teeth. They can close small gaps, cover stains that whitening cannot remove, and even out teeth that are chipped, worn or uneven in size.',
      'With digital smile design we plan your new smile on photos and scans first, so you can see the proposed result and discuss it before any tooth is prepared. A full smile makeover may combine veneers with whitening, crowns or aligners.',
    ],
    goodFor: ['Stains that whitening does not remove', 'Chipped or worn front teeth', 'Small gaps or uneven tooth sizes', 'A complete smile makeover'],
    visit: [
      { title: 'Smile design', body: 'Photos and a digital scan are taken, and your new smile is designed with you.' },
      { title: 'Preparation', body: 'A thin layer of enamel is removed so the veneers sit naturally. Temporary veneers can be worn.' },
      { title: 'Making the veneers', body: 'The veneers are made to the agreed shape and shade.' },
      { title: 'Bonding', body: 'The veneers are checked, adjusted and bonded firmly in place.' },
    ],
    aftercare: ['Brush and floss as usual. Veneers do not need special products.', 'Avoid biting hard objects, such as nails, pens or bottle caps, with your front teeth.', 'If you grind your teeth at night, a night guard protects the veneers.'],
    faq: [
      { q: 'Do veneers look natural?', a: 'Yes. Porcelain reflects light much like enamel, and the shade and shape are chosen to suit your face.' },
      { q: 'How long do veneers last?', a: 'With good care, porcelain veneers usually last 10 to 15 years.' },
    ],
    related: ['teeth-whitening', 'emax-crown', 'braces-invisible'],
  },
  {
    slug: 'zirconia-crowns-bridges',
    featured: 5,
    bookable: false,
    image: '/img/services/emax-crown.webp',
    imageAlt: 'All-ceramic restoration being placed on a front tooth',
    name: 'Zirconia Crowns and Bridges',
    shortName: 'Zirconia crowns and bridges',
    summary: 'Very strong, metal-free crowns and bridges that restore damaged teeth or replace missing ones.',
    durationMinutes: 60,
    intro: [
      'Zirconia is a tooth-coloured ceramic known for its strength. A zirconia crown covers and protects a damaged tooth. A bridge replaces a missing tooth by attaching a false tooth to crowns on the teeth either side.',
      'Using a digital scan and computer-aided design and manufacturing (CAD/CAM), crowns and bridges are designed precisely to your bite.',
    ],
    goodFor: ['Back teeth that take heavy chewing forces', 'Teeth after root canal treatment', 'Replacing one or two missing teeth with a bridge', 'Replacing old metal-ceramic crowns'],
    visit: [
      { title: 'Examination', body: 'The dentist checks the teeth and takes X-rays to confirm they are healthy enough to support a crown or bridge.' },
      { title: 'Preparation and scan', body: 'The teeth are numbed and shaped, then scanned or an impression is taken.' },
      { title: 'Temporary', body: 'A temporary crown or bridge protects the teeth while yours is made.' },
      { title: 'Fitting', body: 'The zirconia crown or bridge is checked, adjusted and cemented in place.' },
    ],
    aftercare: ['Clean under a bridge every day with floss threaders or small brushes.', 'Come for regular check-ups so we can check the gums around it.'],
    faq: [
      { q: 'Zirconia or E.max?', a: 'Zirconia is the strongest option and suits back teeth and bridges. E.max often looks slightly more natural on front teeth. The dentist recommends the best option for each tooth.' },
      { q: 'Bridge or implant?', a: 'A bridge needs the neighbouring teeth to be shaped, while an implant does not. At your consultation we explain the pros, cons and costs of both.' },
    ],
    related: ['emax-crown', 'dental-implants', 'root-canal'],
  },
  {
    slug: 'oral-surgery',
    bookable: false,
    image: '/img/services/root-canal.webp',
    imageAlt: 'Model of a tooth cut open to show the root canals',
    name: 'Oral Surgery and Wisdom Tooth Extraction',
    shortName: 'Oral surgery',
    summary: 'Safe removal of wisdom teeth and teeth that cannot be saved, and other minor surgery in the mouth.',
    durationMinutes: 60,
    intro: [
      'Wisdom teeth often do not have enough room to come through properly. They can get stuck in the bone, cause repeated gum infections, or push on the teeth in front. Removing them early prevents these problems.',
      'Before surgery, a digital panoramic X-ray or 3D CBCT scan shows the exact position of the roots and nerves, so the procedure can be planned safely. Oral surgery also covers removing broken teeth and preparing the mouth for implants or dentures.',
    ],
    goodFor: ['Painful or swollen wisdom teeth', 'Wisdom teeth that are stuck in the bone', 'Broken teeth that cannot be repaired', 'Preparing for implants or dentures'],
    visit: [
      { title: 'Assessment', body: 'The dentist examines the area and takes an X-ray or 3D scan.' },
      { title: 'Anaesthetic', body: 'The area is fully numbed so you feel pressure but no pain.' },
      { title: 'Surgery', body: 'The tooth is removed, sometimes in sections to protect the surrounding bone, and stitches are placed if needed.' },
      { title: 'Instructions', body: 'You get written aftercare advice and a follow-up appointment if stitches need removing.' },
    ],
    aftercare: ['Bite on the gauze for 30 to 60 minutes, and do not rinse, spit or smoke for the first 24 hours.', 'Eat soft, cool food for a few days and chew on the other side.', 'Swelling usually peaks after two days. Call the clinic if pain gets worse after day three.'],
    faq: [
      { q: 'Do all wisdom teeth need to come out?', a: 'No. Wisdom teeth that have come through fully and can be cleaned can stay. We recommend removal when they cause pain, infection or damage to other teeth.' },
      { q: 'How long is the recovery?', a: 'Most people return to normal activities within two to three days. The gum heals fully over a few weeks.' },
    ],
    related: ['dental-implants', 'gum-treatment', 'removable-denture'],
  },
  {
    slug: 'gum-treatment',
    bookable: false,
    image: '/img/services/scaling.webp',
    imageAlt: 'Dentist cleaning teeth with a scaler and mouth mirror',
    name: 'Gum (Periodontal) Treatment',
    shortName: 'Gum treatment',
    summary: 'Treatment for gum disease, from deep cleaning below the gumline to gum surgery, to keep your teeth firm.',
    durationMinutes: 60,
    intro: [
      'Gum disease starts as bleeding, swollen gums. Without treatment, the infection moves below the gumline, the bone around the teeth shrinks, and teeth can become loose. It is the most common reason adults lose teeth.',
      'Periodontal treatment cleans deep pockets around the roots and helps the gums reattach. In advanced cases, gum surgery can reduce deep pockets or cover exposed roots.',
    ],
    goodFor: ['Gums that bleed when you brush', 'Receding gums or teeth that look longer', 'Loose or moving teeth', 'Bad breath that does not go away'],
    visit: [
      { title: 'Gum assessment', body: 'The dentist measures the pockets around each tooth and takes X-rays to check the bone.' },
      { title: 'Deep cleaning', body: 'Under local anaesthetic, plaque and tartar are removed from the root surfaces below the gumline.' },
      { title: 'Review', body: 'After a few weeks we measure the gums again to see how they have healed.' },
      { title: 'Gum surgery if needed', body: 'If deep pockets remain, or roots are exposed, gum surgery is discussed with you.' },
    ],
    aftercare: ['Teeth may feel sensitive for a week or two as the gums tighten.', 'Brush gently but thoroughly, and clean between the teeth every day.', 'Regular maintenance cleanings keep the disease from coming back.'],
    faq: [
      { q: 'Can gum disease be cured?', a: 'Early gum disease can be fully reversed. Advanced gum disease can be controlled so it stops getting worse, with regular care.' },
      { q: 'Does it hurt?', a: 'Deep cleaning is done under local anaesthetic. The gums may feel tender for a day or two afterwards.' },
    ],
    related: ['scaling', 'oral-surgery', 'dental-implants'],
  },
  {
    slug: 'childrens-dentistry',
    bookable: false,
    image: '/img/services/scaling.webp',
    imageAlt: 'Dentist cleaning teeth with a scaler and mouth mirror',
    name: "Children's Dentistry",
    shortName: "Children's dentistry",
    summary: 'Gentle check-ups, cleaning, fillings and prevention for babies, children and teenagers.',
    durationMinutes: 30,
    intro: [
      'Healthy baby teeth matter. They help children eat, speak and smile, and they hold space for the adult teeth. Our team takes time to make visits calm and friendly, so children grow up without a fear of the dentist.',
      'We check how teeth and jaws are developing, treat decay early, and give parents practical advice on brushing, diet and habits such as thumb sucking.',
    ],
    goodFor: ["A child's first dental visit, from the first tooth or by age one", 'Toothache or visible holes in teeth', 'Protecting new back teeth with fissure sealants', 'Checking crowded or crooked teeth early'],
    visit: [
      { title: 'Getting comfortable', body: 'Your child meets the dentist and sees the chair and instruments first.' },
      { title: 'Check-up', body: 'Teeth, gums and jaw development are checked gently.' },
      { title: 'Prevention', body: 'Cleaning, fluoride or fissure sealants are applied where helpful.' },
      { title: 'Advice for parents', body: 'You get brushing tips and a plan for any treatment needed.' },
    ],
    aftercare: ["Help with brushing twice a day until your child is about eight.", 'Keep sweet drinks and snacks to mealtimes.', 'Book a check-up every six months.'],
    faq: [
      { q: 'When should my child first see a dentist?', a: 'When the first tooth appears, or by the first birthday. Early visits help children feel at home in the dental chair.' },
      { q: 'Do baby teeth with holes need treatment?', a: 'Yes. Decay in baby teeth can cause pain and infection and affect the adult teeth underneath.' },
    ],
    related: ['scaling', 'braces-invisible', 'gum-treatment'],
  },
];

/** The home page's short list: the main treatments, in their `featured` order. */
export const featuredServices = services.filter((s) => s.featured).sort((a, b) => a.featured! - b.featured!);

/** Whether a treatment is in the online booking list (false for the newer service pages). */
export const isBookable = (s: Service) => s.bookable !== false;

export const getService = (slug: string) => services.find((s) => s.slug === slug);
