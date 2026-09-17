# Hosting on Hostinger

**This is how the live site is hosted.** The other two setups in `infra/` — AWS
Amplify (`AMPLIFY.md`) and S3 + CloudFront (`README.md`) — were built and tested
as alternatives and are not in use.

## The shape of it

```
 visitor ─┐
          ├──▶ Hostinger Node.js web app ── server.js ─┬─▶ dist/    the pages
 Razorpay ┘    (Business / "Unlimited" plan)          └─▶ api/     the 4 endpoints
```

One process serves the pages and the API from the same origin, so the browser
calls plain `/api/…` — no CORS, and `VITE_API_BASE` stays **unset**.

Pushing to the connected branch redeploys everything: Hostinger pulls the
commit, installs, builds and restarts. Unlike the Amplify setup, there is no
separate Lambda to keep in step, so a price change is just a push.

Hostinger's DNS zone, the client's mailboxes and the Resend records for order
email all stay where they are. The domain is registered at GoDaddy, but its
nameservers point at Hostinger, so every DNS change happens in Hostinger.

## App settings

Websites → Add Website → **Node.js web app** → Import Git repository.

| Setting | Value |
|---|---|
| Framework | **Other** — this is a build plus a custom server, which no preset matches |
| Branch | `main` |
| Node version | **22** |
| Build command | `npm run build` |
| Output directory | **leave empty** — Hostinger treats it as a static site if set; `server.js` serves `dist/` itself |
| Entry file | `server.js` |

**The first check after any deploy:** open `/api/config`. JSON —
`{"testMode":…,"configured":true}` — means `server.js` is running. The
website, or a 404, means Hostinger is serving `dist/` as static files and the
API is not running: revisit the settings above.

## Environment variables

Website dashboard → **Environment variables**. Hostinger injects them into both
the build and the running app, keeps them across deploys, and redeploys when
they are saved.

| Key | Value |
|---|---|
| `RAZORPAY_KEY_ID` | `rzp_test_…` until go-live, then `rzp_live_…` |
| `RAZORPAY_KEY_SECRET` | the matching secret |
| `RAZORPAY_WEBHOOK_SECRET` | the secret set on the Razorpay webhook for that mode |
| `RESEND_API_KEY` | `re_…` |
| `ORDER_EMAIL_FROM` | `Appu Kaju <orders@appukaju.com>` |
| `ORDER_EMAIL_TO` | `appukajuwala@gmail.com` |

**Do not set `VITE_API_BASE`.** It is only for hosts that put the API on a
different origin.

## What server.js does that a CDN would otherwise do

Nothing sits in front of the app, so `infra/node/server.js` handles:

- **Byte ranges** — without 206 Partial Content, Safari and iPhones do not play
  the videos at all.
- **Brotli and gzip**, precompressed once at startup — the main bundle goes out
  at ~120 KB instead of ~400 KB.
- **ETags and 304s** — `index.html` is `no-cache`, so it revalidates cheaply.
- **Dotfiles never served** — the build contains a `.htaccess`.
- **Path traversal refused** — nothing outside `dist/` is reachable.

`node infra/node/server.test.js` checks all of it against a real process, and
CI runs it on every push.

## ⚠️ The domain switch deletes email

Hostinger will not attach `appukaju.com` to the new app while another website
on the plan uses it, and freeing it from the old website is destructive.
Hostinger's own wording, for switching a website to a temporary domain:

> All email accounts created with the current domain will be deleted.
> Existing backups for the current domain will no longer be accessible.

Before the switch:

1. **Export the old WordPress database** (`u977804155_appukaju`, phpMyAdmin →
   Export → SQL). A file backup does not contain it, and Hostinger's own
   backups for the domain become inaccessible afterwards.
2. **Check hPanel → Emails** for any `@appukaju.com` mailboxes, and export their
   mail if they exist. The shop's published addresses are Gmail, so there may be
   none.
3. **Record the DNS zone.** Custom records may not survive the domain moving.

### Records to confirm after the switch

These carry mail and order email. Hostinger re-adds its own defaults when a
domain is attached; the custom ones below may need adding back.

| Type | Name | Value |
|---|---|---|
| MX | `@` | `mx1.hostinger.in` (5), `mx2.hostinger.in` (10) |
| TXT | `@` | `v=spf1 include:_spf.mail.hostinger.com ~all` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:appukajuwala@gmail.com` |
| TXT | `resend._domainkey` | the DKIM key — copy it from Resend → Domains → `appukaju.com` |
| CNAME | `rsend` | `rsend-apne1.forge.rmta.net` |
| CNAME | `send` | `send.forge.rmta.net` |
| CNAME | `autodiscover` | `autodiscover.mail.hostinger.com` |
| CNAME | `autoconfig` | `autoconfig.mail.hostinger.com` |

Afterwards, Resend → Domains should still show `appukaju.com` as **verified**.

## The Razorpay webhook

Razorpay keeps **separate webhook lists for test and live mode**.

| Mode | URL | Secret |
|---|---|---|
| Test | `https://<temporary-domain>/api/webhook` | goes in `RAZORPAY_WEBHOOK_SECRET` while on test keys |
| Live | `https://appukaju.com/api/webhook` | replaces it when switching to live keys |

Event: `payment.captured`.

## Logs and restarts

Website dashboard → the Node.js app: deployment history and build logs, runtime
logs, CPU / RAM / I/O graphs, and a **Restart** button that restarts the process
without a rebuild.
