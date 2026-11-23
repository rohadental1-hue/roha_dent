import { Link } from 'react-router';
import { Seo } from '../lib/seo';
import { breadcrumbLd } from '../lib/schema';
import { stagger } from '../lib/useReveal';
import { IntroPhoto, PageIntro } from '../components/PageIntro';
import { Button } from '@/components/ui/button';

// Content from the clinic's own description (2026-11). The client should check the wording.

const technology = [
  ['3D Cone Beam CT (CBCT)', 'A 3D image of the jaw, teeth and nerves, used to plan implants and surgery safely.'],
  ['Digital panoramic X-ray', 'One image of all teeth and both jaws, for a complete overview at the first visit.'],
  ['Digital dental X-ray', 'Sharp close-up images with a much lower radiation dose than film.'],
  ['Intraoral camera', 'A small camera that shows you on screen exactly what the dentist sees.'],
  ['Digital intraoral scanner', 'A precise 3D scan of your teeth instead of messy impression trays.'],
  ['CAD/CAM', 'Crowns, bridges and veneers designed and made with computer-aided design and manufacturing.'],
  ['Digital smile design', 'Your new smile planned on photos and scans, so you can see it before treatment.'],
  ['Digital treatment planning', 'Scans and images combined into one plan, explained to you step by step.'],
] as const;

const excellence = [
  ['Specialist-led care', 'Experienced dentists and specialists in implants, orthodontics, root canal treatment and surgery.'],
  ['A plan made for you', 'A full oral diagnosis first, then an evidence-based treatment plan with the options and costs explained.'],
  ['Strict infection control', 'Modern sterilisation systems, and single-use needles, gloves and suction tips.'],
  ['Centred on you', 'Treatment starts only when you understand it and agree. Your comfort and safety come first.'],
] as const;

const facilities = [
  'Several fully equipped treatment rooms, so more patients are seen on time',
  'A spacious, comfortable reception',
  'Advanced diagnostic imaging on site',
  'Comprehensive dental care under one roof',
  'International treatment standards at affordable prices',
  'Natural-looking aesthetic results',
] as const;

export default function About() {
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }];
  return (
    <>
      <Seo
        title="About Us"
        description="Roha Speciality Dental Center combines advanced digital dentistry, 3D CBCT imaging and specialist care in Addis Ababa and Gonder, Ethiopia. We make you shine."
        path="/about"
        jsonLd={[breadcrumbLd(crumbs)]}
      />
      <PageIntro
        crumbs={crumbs}
        title="About Roha"
        lede="A modern dental center in Addis Ababa and Gonder, bringing advanced technology, experienced specialists and patient-centred care together. We make you shine."
        media={<IntroPhoto src="/img/clinic-room.webp" alt="A Roha treatment room with a blue and white dental chair" width={667} height={889} />}
      />

      <section id="our-story" aria-labelledby="story-h" className="wrap mt-[clamp(3rem,7vw,6rem)] grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <h2 id="story-h" data-reveal className="text-h2 max-w-[10ch]">Who we are</h2>
        <div data-reveal style={stagger(1)} className="flex max-w-[40rem] flex-col gap-5 text-lg leading-relaxed text-ink">
          <p>
            Roha Speciality Dental Center is a modern dental healthcare institution committed to comprehensive, high-quality
            dental care through advanced technology, experienced professionals and patient-centred service.
          </p>
          <p>
            We combine modern digital dentistry, advanced diagnostic imaging and specialised clinical expertise. From a routine
            check-up to implants, orthodontics and full-mouth rehabilitation, every treatment starts with a careful diagnosis
            and a plan made for you, so the results are healthy, lasting and natural-looking.
          </p>
        </div>
      </section>

      <section id="technology" aria-labelledby="tech-h" className="wrap mt-[clamp(4rem,9vw,7.5rem)] scroll-mt-24">
        <div data-reveal className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <h2 id="tech-h" className="text-h2 max-w-[16ch]">Advanced dental technology</h2>
          <p className="max-w-md">Digital imaging and design help us find problems early, plan precisely and show you every step.</p>
        </div>
        <ul className="mt-[clamp(1.75rem,4vw,3rem)] grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {technology.map(([title, body], i) => (
            <li key={title} data-reveal style={stagger(i % 4)} className="rounded-card bg-white p-6 ring-1 ring-line">
              <h3 className="text-h3">{title}</h3>
              <p className="mt-2 text-[0.9375rem]">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="our-commitments" aria-labelledby="commit-h" className="wrap mt-[clamp(4rem,9vw,7.5rem)]">
        <div className="on-blue rounded-panel bg-roha-700 p-[clamp(1.5rem,5vw,4rem)] text-white">
          <h2 id="commit-h" data-reveal className="text-h2 max-w-[14ch] text-white">Clinical excellence</h2>
          <dl className="mt-[clamp(2rem,4vw,3rem)] grid sm:grid-cols-2 lg:grid-cols-4">
            {excellence.map(([title, body], i) => (
              <div key={title} data-reveal style={stagger(i + 1)}
                className="border-t border-white/25 py-6 lg:border-t-0 lg:border-l lg:px-6 lg:py-1 lg:first:border-l-0 lg:first:pl-0">
                <dt className="font-display text-xl leading-tight text-white">{title}</dt>
                <dd className="mt-3 text-[0.9375rem] text-white/85">{body}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="inverse"><Link to="/book">Book appointment</Link></Button>
            <Button asChild variant="inverse-outline"><Link to="/doctors">Meet the dentists</Link></Button>
          </div>
        </div>
      </section>

      <section id="facilities" aria-labelledby="fac-h" className="wrap mt-[clamp(4rem,9vw,7.5rem)] grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div data-reveal>
          <h2 id="fac-h" className="text-h2 max-w-[12ch]">Our facilities</h2>
          <p className="mt-5 max-w-sm">
            Live far from a clinic? Start with a digital consultation. <Link to="/contact" className="link">Message us on WhatsApp</Link> with
            your questions or photos.
          </p>
        </div>
        <ul data-reveal style={stagger(1)} className="grid border-t border-line sm:grid-cols-2 sm:gap-x-10">
          {facilities.map((f) => (
            <li key={f} className="border-b border-line py-4 text-ink">{f}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
