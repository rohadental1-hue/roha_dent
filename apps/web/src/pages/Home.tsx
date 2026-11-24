import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Seo } from '../lib/seo';
import { organizationLd, dentistLd, websiteLd } from '../lib/schema';
import { locations } from '../content/locations';
import { featuredServices } from '../content/services';
import { dentists } from '../content/dentists';
import { faqGroups } from '../content/faq';
import { LocationPanel } from '../components/LocationPanel';
import { TreatmentGrid } from '../components/TreatmentGrid';
import { ResultsSection } from '../components/results/ResultsSection';
import { beforeAfterCases } from '../content/beforeAfter';
import { ArrowRight, ArrowUpRight, MapPin } from 'lucide-react';
import { DentistAvatar } from '../components/DentistAvatar';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { stagger } from '../lib/useReveal';
import { CtaBand } from '../components/CtaBand';
import { srcSet } from '../lib/img';

const HERO_TITLE = 'Your smile starts here.';
/** Unsplash photo (see public/img/CREDITS.md). */
const HERO_IMG = '/img/hero/hero-chair.webp';
/** A short preview of the technology section on the About page. */
const TECH = [
  { title: '3D CBCT scans', body: 'Safe planning for implants and surgery.', img: '/img/tech/cbct.webp', alt: 'Dentist pointing at a 3D dental scan on a tablet' },
  { title: 'Digital X-ray', body: 'Panoramic and dental X-rays, low dose.', img: '/img/tech/xray.webp', alt: 'Panoramic X-ray of a full set of teeth' },
  { title: 'Intraoral scanner', body: 'A 3D scan instead of impression trays.', img: '/img/tech/scanner.webp', alt: 'Intraoral scanner wand on a dental workstation', pos: '35% 15%' },
  { title: 'CAD/CAM crowns', body: 'Designed on the computer for a precise fit.', img: '/img/tech/cadcam.webp', alt: 'Milling machine shaping a ceramic crown' },
] as const;

function SectionHead({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <div data-reveal className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <h2 id={id} className="text-h2 max-w-[18ch]">{title}</h2>
      {children}
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const faqPreview = faqGroups[0].items.slice(0, 3);

  return (
    <>
      <Seo
        title="Roha Dental | Dentist in Addis Ababa & Gonder"
        description="Dental implants, braces and clear aligners, veneers, crowns, root canal treatment and whitening, with 3D CBCT and digital X-ray, in Addis Ababa and Gonder. Book online or call."
        path="/"
        jsonLd={[websiteLd(), organizationLd(), ...locations.map(dentistLd)]}
      />

      {/* Hero: a rounded photo panel. Headline and booking pill top-left, clinics card bottom-left,
          treatment chips bottom-right, and a thin footer row. On phones the photo sits on top and fades into the panel. */}
      <section id="top" className="hero wrap pt-[clamp(0.25rem,1.5vw,1rem)]">
        <div className="on-blue relative isolate flex flex-col overflow-hidden rounded-panel bg-roha-900 text-white lg:min-h-[min(44rem,calc(100svh-6.5rem))]">
          <div data-intro="photo" className="relative -z-10 aspect-[4/3] max-lg:-mb-24 sm:aspect-[16/9] lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[78%]">
            <img src={HERO_IMG} srcSet={srcSet(HERO_IMG, 1920)} sizes="(min-width: 1024px) 56rem, 100vw"
              alt="Modern dental treatment chair and unit in a bright clinic room" width={1920} height={1280}
              fetchPriority="high" decoding="async"
              className="hero-photo size-full object-cover object-[70%_55%]" />
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-roha-900/90 to-transparent max-lg:hidden" aria-hidden="true" />
          </div>

          <div className="relative grid gap-6 p-[clamp(1.25rem,4vw,3rem)] max-lg:pt-0 lg:max-w-[38rem]">
            <h1 className="text-[clamp(2.5rem,5.6vw,4.75rem)] leading-[0.98] text-white">
              {HERO_TITLE.split(' ').map((w, i) => (
                <Fragment key={i}>{i > 0 && ' '}<span data-intro style={{ '--i': i } as CSSProperties}>{w}</span></Fragment>
              ))}
            </h1>
            <p data-intro="fade" style={{ '--i': 0 } as CSSProperties} className="max-w-[36ch] text-[0.9375rem] text-white/85">
              Specialist dental care with advanced digital technology, at our clinics in Addis Ababa and Gonder.
            </p>
            <div data-intro="fade" style={{ '--i': 1 } as CSSProperties}>
              <Link to="/book" className="btn group min-h-12 bg-white pr-1.5 pl-6 text-[0.9375rem] text-roha-900 hover:bg-roha-50">
                {t('cta.book')}
                <span className="grid size-9 place-items-center rounded-full bg-sky text-white transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </Link>
            </div>
          </div>

          {/* clinics card (hidden on small phones, where the panel is already tall) */}
          <div className="relative mt-auto px-[clamp(1.25rem,4vw,3rem)] pt-8 pb-[clamp(1.25rem,4vw,3rem)] max-sm:hidden">
            <a href="#clinics" data-intro="fade" style={{ '--i': 2 } as CSSProperties}
              className="glass group flex w-fit items-center gap-3 rounded-card p-2 pr-4">
              <img src="/img/branches/addis-ababa-sm.webp" alt="" width={800} height={500} loading="lazy"
                className="h-16 w-20 shrink-0 rounded-[10px] object-cover" />
              <span className="min-w-0 text-sm leading-snug">
                <span className="block font-medium">Find your clinic</span>
                <span className="block text-white/75">Addis Ababa and Gonder</span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-white/80 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
          </div>

        </div>
      </section>

      {/* About: an open, light section (not a second panel), so the hero stays the only dark box */}
      <section id="about" aria-labelledby="about-h" className="wrap pt-[clamp(3.5rem,7vw,6rem)]">
        <div className="grid items-center gap-[clamp(2rem,5vw,4.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <h2 id="about-h" data-reveal className="text-h2 max-w-[15ch]">Two clinics, one way of caring for you</h2>
            <p data-reveal style={stagger(2)} className="mt-5 max-w-[46ch]">
              Roha Speciality Dental Center cares for families in Addis Ababa and Gonder. Every visit starts with an examination, so your dentist can explain what is needed, your options and what to expect before treatment begins.
            </p>
            <div data-reveal style={stagger(3)}><Button asChild variant="outline" className="mt-7"><Link to="/about">About Roha</Link></Button></div>
          </div>
          <img data-reveal style={stagger(2)} src="/img/clinic-hallway.webp" alt="Hallway and treatment rooms at a Roha clinic" width={1284} height={856} loading="lazy" decoding="async"
            className="aspect-[4/3] w-full rounded-panel object-cover" />
        </div>
      </section>

      {/* Technology: a preview of the About page's technology section */}
      {/* compact: one row of photo tiles (a swipeable row on phones) */}
      <section id="technology" aria-labelledby="tech-h" className="wrap pt-[clamp(3.5rem,7vw,6rem)]">
        <div data-reveal className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 id="tech-h" className="text-[clamp(1.5rem,2.6vw,2rem)] leading-tight">Advanced digital dentistry</h2>
          <Link to="/about#technology" className="link text-sm">Our technology</Link>
        </div>
        <ul className="-mx-4 mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          {TECH.map((x, i) => (
            <li key={x.title} data-reveal style={stagger(i + 1)}
              className="flex w-[72%] shrink-0 snap-start items-center gap-4 rounded-card bg-white p-3 pr-5 ring-1 ring-line sm:w-auto">
              <img src={x.img} srcSet={srcSet(x.img, 800)} sizes="6rem" alt={x.alt} width={800} height={600} loading="lazy" decoding="async"
                style={'pos' in x ? { objectPosition: x.pos } : undefined}
                className="aspect-square w-20 shrink-0 rounded-[calc(var(--radius-card)-0.5rem)] object-cover" />
              <div className="min-w-0">
                <h3 className="font-display text-base leading-tight text-ink">{x.title}</h3>
                <p className="mt-1.5 text-sm leading-snug">{x.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Clinics */}
      <section id="clinics" aria-labelledby="clinics-h" className="wrap section-y">
        <SectionHead id="clinics-h" title="Choose your clinic" />
        <p data-reveal style={stagger(1)} className="mt-4 max-w-2xl">
          Both clinics are open Monday to Saturday, 8:30 – 17:30.
        </p>
        <div className="mt-[clamp(1.75rem,4vw,3rem)] grid gap-4 md:grid-cols-2">
          {locations.map((l, i) => (
            <div key={l.slug} data-reveal style={stagger(i + 2)} className="grid">
              <LocationPanel location={l} compact />
            </div>
          ))}
        </div>
      </section>

      {/* Treatments */}
      <section id="treatments" aria-labelledby="services-h" className="section-y bg-page">
        <div className="wrap">
          <SectionHead id="services-h" title="Treatments" />
          <p data-reveal style={stagger(1)} className="mt-4 max-w-2xl">
            Our main treatments. Every treatment starts with an examination. The dentist explains what your teeth need and the price before anything is done.
          </p>
          <div className="mt-[clamp(1.75rem,4vw,3rem)]">
            <TreatmentGrid items={featuredServices} showAllLink />
          </div>
        </div>
      </section>

      {/* Real results: consented patient cases, cropped to the mouth */}
      {beforeAfterCases.length > 0 && (
        <div className="wrap section-y">
          <ResultsSection cases={beforeAfterCases} id="before-and-after" />
        </div>
      )}

      {/* Dentists */}
      <section id="dentists" aria-labelledby="team-h" className="wrap">
        <SectionHead id="team-h" title="Your dentists">
          <Link to="/doctors" className="link">Meet the team</Link>
        </SectionHead>
        <ul className="mt-[clamp(1.75rem,4vw,3rem)] grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {dentists.map((d, i) => (
            <li key={d.slug} data-reveal style={stagger(i + 1)} className="grid">
              <Link to={`/doctors#${d.slug}`}
                className="group flex flex-col rounded-card bg-white p-6 ring-1 ring-line transition-[box-shadow,transform] duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgb(15_35_80/0.45)] hover:ring-roha-300">
                <DentistAvatar dentist={d} shape="tile" className="aspect-[4/5] w-full text-3xl" />
                <span className="mt-5 font-display text-xl leading-tight text-ink">{d.name}</span>
                <span className="mt-1.5 text-[0.9375rem]">{d.title}</span>
                <span className="mt-4 flex items-center gap-1.5 text-sm text-roha-600">
                  <MapPin className="size-4" aria-hidden="true" />
                  {d.locations.map((s) => locations.find((l) => l.slug === s)!.city).join(' and ')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ preview */}
      <section id="faq" aria-labelledby="faq-h" className="wrap grid gap-8 pt-[clamp(4rem,9vw,7.5rem)] lg:grid-cols-[1fr_2fr] lg:gap-14">
        <div data-reveal>
          <h2 id="faq-h" className="text-h2">Before you book</h2>
          <Link to="/faq" className="link mt-5 inline-block">All questions</Link>
        </div>
        <Accordion data-reveal style={stagger(1)} type="single" collapsible className="border-t border-line">
          {faqPreview.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <CtaBand />
    </>
  );
}
