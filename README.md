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
│                       health copy, contact details. Edit content here.
├─ lib/gsap.js          Single GSAP registration point + reduced-motion hook.
├─ components/          NavBar, Footer, ScrollToTop, Seo, PageHeader,
│                       ClipPathTitle, ProcessCard
├─ sections/            Home-page sections
└─ pages/               Home, About, Shop, Process, Health, Contact, NotFound
```

`src/constants/index.js` is the single source of truth. Changing a price or a
phone number there updates every page that shows it.

## Design notes

**Palette** comes from the real packaging rather than a generic "premium nuts"
scheme. The three sub-brands are a blue family — Kuber aqua `#7FD0E0`, Appu
royal `#1B6CB5`, Rimmee navy `#12386E` — and the master logo supplies the
yellow `#F2B705`, red `#D32027` and green `#3F7A3B` highlights, over a cashew
cream ground `#F6EFE2`.

**Product photography** was shot on opaque white. The four pack PNGs in
`public/images` have had that background cut to transparency with an edge-seeded
flood fill, so they sit correctly on any colour — no blend mode required. The
untouched originals are kept beside them as `*-original.png`; re-run
`scripts/cutout.ps1` against those if the thresholds ever need retuning.

On dark cards a `.pack-spotlight` radial gradient sits behind the pack so a dark
pouch (Rimmee navy on a navy card) keeps its silhouette.

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

This is a client-side-routed SPA. Any static host must rewrite unknown paths to
`index.html`, or `/shop` and friends will 404 on a hard refresh:

- **Netlify** — add `public/_redirects` containing `/*  /index.html  200`
- **Vercel** — handled automatically for Vite SPAs
- **Apache/nginx** — add a fallback rewrite to `/index.html`
- **GitHub Pages** — no rewrite support; either copy `dist/index.html` to
  `dist/404.html` or switch `BrowserRouter` to `HashRouter` in `src/main.jsx`

If the site is served from a sub-path, set `base` in `vite.config.js` to match.

## Known gaps

- **Contact form has no backend.** It currently opens the visitor's mail client
  with the message prefilled. Swap the marked block in `src/pages/Contact.jsx`
  for Formspree / EmailJS / an API call when you pick one.
- **No cart or checkout.** Product cards link out to the live appukaju.com
  WooCommerce store.
- **Limited imagery.** Only four product shots and the logo exist. The hero
  atmosphere is built from CSS gradients; there is no lifestyle photography or
  video. Those slots are drop-in if photos are supplied later.
