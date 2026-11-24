# Image credits

Stock photos are from Unsplash under the free **Unsplash License** (https://unsplash.com/license): commercial use is allowed and attribution is not required, but it is recorded here so each file can be traced and replaced.
Regenerate the resized files with `node apps/web/scripts/optimize-images.mjs <downloads folder>`.

> The dentist photos are **samples** of stock models, not Roha staff. The site tags them "Sample photo". Replace them with real headshots before launch.
> `results/` holds **real Roha patients** (the clinic has their consent), cropped to the mouth only by `scripts/crop-cases.mjs`. The originals show faces and are kept outside the repo; never commit them.

| File | Unsplash photo | Photographer |
|---|---|---|
| dentists/dr-selam-bekele.webp | https://unsplash.com/photos/32nW021dW4Q | SoyBreno |
| dentists/dr-dawit-alemu.webp | https://unsplash.com/photos/XqMo4OlBnh0 | Vitaly Gariev |
| dentists/dr-meron-tadesse.webp | https://unsplash.com/photos/_zbqco3m7dA | Vitaly Gariev |
| dentists/dr-yonas-girma.webp | https://unsplash.com/photos/VAvkPtF4HJI | Vitaly Gariev |
| branches/addis-ababa.webp, /og-default.png | https://unsplash.com/photos/Fdku_oMrDvk | Kari Bjorn Photography |
| branches/gonder.webp | https://unsplash.com/photos/e7MJLM5VGjY | Benyamin Bohlouli |
| services/scaling.webp | https://unsplash.com/photos/8BkF0sTC6Uo | Caroline LM |
| services/teeth-whitening.webp | https://unsplash.com/photos/KzmhiJJ041M | Kamal Hoseinianzade |
| services/braces-invisible.webp | https://unsplash.com/photos/uTUsnv_UCSQ | Harold Hisona |
| services/root-canal.webp | https://unsplash.com/photos/SU6EGDd-ySQ | Harold Hisona |
| services/emax-crown.webp | https://unsplash.com/photos/FCWGwXH55xo | Kamal Hoseinianzade |
| services/ceramic-crown.webp | https://unsplash.com/photos/q1KLbswF70Y | Bogdan Condr |
| services/removable-denture.webp | https://unsplash.com/photos/4nUZl0FZM3U | Diana Polekhina |
| hero/hero-chair.webp (home hero, mirrored) | https://unsplash.com/photos/aFqSRokmw2E | Ozkan Guner |

`deco-aligner.webp` and `deco-tooth.webp` are our own 3D renders (no third-party source). Regenerate them with `node apps/web/scripts/render-deco.mjs`.

> **Placeholder photos (2026-11).** The six newer treatment pages reuse existing photos until their own are added:
> dental-implants → ceramic-crown, porcelain-veneers → a closer crop of teeth-whitening (porcelain-veneers.webp), zirconia-crowns-bridges → emax-crown,
> oral-surgery → root-canal, gum-treatment and childrens-dentistry → scaling. Replace them in `src/content/services.ts`.

Technology photos on the home page (Unsplash License), `img/tech/` (+ `-sm`):

| File | Unsplash photo | Photographer |
|---|---|---|
| tech/cbct.webp | https://unsplash.com/photos/VckdJzo7ig0 | Quang Tri NGUYEN |
| tech/xray.webp | https://unsplash.com/photos/KeVKEs1_RDU | Umanoide |
| tech/scanner.webp | https://unsplash.com/photos/ER1vKAWRqns | Quang Tri NGUYEN |
| tech/cadcam.webp | https://unsplash.com/photos/WRv6Rl_nUes | Alexander Pütter (beuwy.com) |
