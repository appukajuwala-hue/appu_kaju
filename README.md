# Appu Kaju 2.0

A multi-page marketing site for Appu Kaju — cashew specialists operating since 1998,
with a factory in Andhra Pradesh and a shop in Lucknow.

Built with React 19, Vite 6, Tailwind CSS 4 and GSAP 3. The scroll-animation
techniques (pinned horizontal scroll, clip-path wipes, SplitText intros,
scrub-driven colour fills) are modelled on the `Spylt-awward-clone-main`
reference sitting next to this folder, rebuilt from scratch around Appu Kaju's
own content and brand colours.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run preview
npm run lint
```

Node 18+ required. On npm 10+ the native postinstall scripts for `esbuild` and
`@tailwindcss/oxide` are blocked by default; this project's `package.json`
already allows them via `allowScripts`.

## Structure

```
src/
├─ constants/index.js   All site content — products, prices, process steps,
│                       health copy, contact details, SITE_URL. Edit here.
├─ cart/                Cart state, order records, the Razorpay payment flow
├─ lib/gsap.js          Single GSAP registration point + reduced-motion hook
├─ lib/structuredData.js  Schema.org JSON-LD, built from the constants
├─ components/          NavBar, Footer, CartDrawer, Seo, JsonLd, LazyVideo,
│                       PolicyPage, PageHeader, ClipPathTitle, ProcessCard
├─ sections/            Home-page sections
└─ pages/               Home, About, Shop, Process, Health, Contact, Checkout,
                        OrderConfirmation, four legal pages, NotFound

api/                    Serverless handlers — create-order, verify, webhook.
                        _lib/ holds the shared pricing, email and fulfilment code.
infra/                  AWS hosting: the Lambda adapter for api/, CloudFront and
                        IAM definitions, and the packaging script.
source-images/          Untouched pack photography. Not published.
```

`src/constants/index.js` is the single source of truth. Changing a price or a
phone number there updates every page that shows it.

## Design notes

**Palette** comes from the real packaging rather than a generic "premium nuts"
scheme. The three sub-brands are a blue family — Kuber aqua `#7FD0E0`, Appu
royal `#1B6CB5`, Rimmee navy `#12386E` — and the master logo supplies the
yellow `#F2B705`, red `#D32027` and green `#3F7A3B` highlights, over a cashew
cream ground `#F6EFE2`.

**Typography is self-hosted.** Antonio and Inter used to arrive via an
`@import` from fonts.googleapis.com. That was render-blocking, added two DNS
lookups and TLS handshakes to the critical path, and disclosed every visitor's
IP to Google — which made the privacy policy's "no third-party trackers" line
untrue. Both faces are OFL-licensed, so `public/fonts/` now serves them.

Google's own subsets and `unicode-range` declarations are kept unaltered, and
the latin/latin-ext split is load-bearing: **the rupee sign is U+20B9, which
lives in latin-ext, not latin.** Ship only the latin files and every price on
the site loses its ₹.

Note that Antonio has no ₹ glyph in any subset, so the symbol falls back to the
generic `sans-serif` wherever Antonio is the active face — which includes the
large price on each shop card, since `body` is Antonio. Adding `"Inter"` to the
`--font-sans` stack would make that fallback deliberate rather than whatever the
OS picks.

**Product photography** was shot on opaque white. The four pack PNGs in
`public/images` have had that background cut to transparency with an edge-seeded
flood fill, so they sit correctly on any colour — no blend mode required. The
untouched originals live in `source-images/`, deliberately outside `public/` —
everything under `public/` is copied verbatim into every build, and these are
1.3 MB of studio-white source art no visitor needs. Re-run `scripts/cutout.ps1`
if the thresholds ever need retuning; it reads from `source-images/` and writes
into `public/images/`.

On dark cards a `.pack-spotlight` radial gradient sits behind the pack so a dark
pouch (Rimmee navy on a navy card) keeps its silhouette.

**Video posters.** The three clips are ~7 MB between them and none of them is
fetched until it is nearly on screen — see `src/components/LazyVideo.jsx`. Each
has a `*-poster.jpg` beside it that paints while the video streams.

The timestamps are chosen, not arbitrary: `harvest.mp4` fades up from black over
its first two seconds, so frame zero is a black rectangle. Mean luminance at
t=0 is 16/255, reaching its steady ~110 only after t=2. To regenerate:

```bash
ffmpeg -ss 1 -i public/videos/hero-kaju.mp4 -frames:v 1 -vf scale=960:-2 -q:v 6 public/videos/hero-kaju-poster.jpg
ffmpeg -ss 3 -i public/videos/harvest.mp4   -frames:v 1 -vf scale=960:-2 -q:v 6 public/videos/harvest-poster.jpg
ffmpeg -ss 5 -i public/videos/pour.mp4      -frames:v 1 -vf scale=960:-2 -q:v 6 public/videos/pour-poster.jpg
```

Check a new frame is not black before committing it:

```bash
ffmpeg -v info -i <poster>.jpg -vf "signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null -
```

`pour-poster.jpg` is *meant* to be dark — that clip is shot on black and
composited with `mix-blend-mode: lighten`, which drops the background out.

**Animation safety.** Initial hidden states are applied with `gsap.set()` inside
`useGSAP` (which runs in `useLayoutEffect`, before paint) rather than being
baked into the markup. If JS fails or GSAP never ticks, every page still renders
its content instead of going blank. Every scroll animation is also guarded by
`usePrefersReducedMotion()`.

**Routing.** `ScrollToTop` jumps to the top and calls `ScrollTrigger.refresh()`
on every navigation — without it, pinned sections measure against the previous
route's scroll position.

**Horizontal sliders.** The brand slider, the home process teaser and the
`/process` page all share `src/lib/useHorizontalPin.js`. It measures the scroll
distance against **the track's own overflow container, never `window.innerWidth`**
— the brand track sits beside a 34%-wide title panel, and measuring against the
window left the last card permanently stranded off the right edge. Below 1024px
the hook no-ops and the tracks stack vertically, so there is never a native
horizontal scrollbar.

## Deploying

**The live site runs on Hostinger** as a Node.js web app — see
[`infra/HOSTINGER.md`](infra/HOSTINGER.md). `npm start` runs `server.js`, which
serves the built pages and the API together. Pushing to `main` redeploys it.

`infra/` also holds two fully built alternatives that are **not in use**: AWS
Amplify ([`infra/AMPLIFY.md`](infra/AMPLIFY.md)) and S3 + CloudFront + Lambda
([`infra/README.md`](infra/README.md)).

The notes below apply only if the site is ever moved to a plain static host,
which cannot run the payment API on its own.

This is a client-side-routed SPA. Any static host must rewrite unknown paths to
`index.html`, or `/shop` and friends will 404 on a hard refresh:

- **Netlify** — add `public/_redirects` containing `/*  /index.html  200`
- **Vercel** — handled automatically for Vite SPAs
- **Apache/nginx** — add a fallback rewrite to `/index.html`
- **GitHub Pages** — no rewrite support; either copy `dist/index.html` to
  `dist/404.html` or switch `BrowserRouter` to `HashRouter` in `src/main.jsx`

If the site is served from a sub-path, set `base` in `vite.config.js` to match.

## Payments

Checkout runs on Razorpay. The browser never names a price: it POSTs ids and
quantities to `/api/create-order`, which prices the cart from
`src/constants/index.js` and creates the order. `priceCart` in
`api/_lib/orders.js` is the security core of the whole shop.

`/api/verify` then decides whether a sale happened, and it trusts nothing the
browser says — it checks the HMAC signature against the account secret, fetches
the payment from Razorpay to confirm the money actually moved, and matches the
amount. `/api/webhook` does the same job from Razorpay's side, for the very
common case where the customer closes the tab before the callback lands.

Card details are typed into Razorpay's own iframe and never touch this origin,
which is what keeps the site out of PCI scope.

Environment variables: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`, and optionally `RESEND_API_KEY`,
`ORDER_EMAIL_FROM`, `ORDER_EMAIL_TO` for order emails. Without the Resend three,
payments still work and `sendOrderEmails` reports `{sent: false}`.

## Known gaps

- **Contact form and newsletter have no backend.** Both open the visitor's mail
  client with the message prefilled. Swap the marked block in
  `src/pages/Contact.jsx` for Formspree / EmailJS / an API call when you pick one.
- **No order database.** The Razorpay dashboard is the order book, with the
  delivery address carried in each payment's notes. `/order/:id` is a
  localStorage convenience and will not open on another device.
- **No inventory.** Every pack is always purchasable, so the site can oversell.
- **No analytics.** Nothing measures traffic or conversion.
