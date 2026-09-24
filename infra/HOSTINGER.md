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

The domain is registered at GoDaddy and **its DNS is served by GoDaddy**, so
every DNS change happens there. Pointing the nameservers at Hostinger was tried
first and does not work for this domain: Hostinger's zone editor only manages
domains registered with Hostinger, so `nova`/`cosmos.dns-parking.com` answered
for the domain while every write — the domain portfolio editor, the email
"Connect automatically" button — failed with *Domain not found*, leaving the
zone empty and the site unreachable. Hostinger's supported route for an
externally registered domain is **Connect via DNS records**, which is what is in
use: an A record at GoDaddy pointing to the app's IP.

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

### The live DNS zone

All of these live at **GoDaddy → appukaju.com → DNS Records**. Hostinger cannot
edit them.

| Type | Name | Value | Why |
|---|---|---|---|
| A | `@` | `82.112.239.13` | the Hostinger app; from Connect via DNS records |
| CNAME | `www` | `appukaju.com` | GoDaddy's default, already correct |
| TXT | `resend._domainkey` | the DKIM key from Resend → Domains → `appukaju.com` | signs order email |
| CNAME | `send` | `send.forge.rmta.net` | Resend's return path |
| CNAME | `rsend` | `rsend-apne1.forge.rmta.net` | Resend's return path |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:appukajuwala@gmail.com` | monitor-only while the setup beds in |

GoDaddy's own `NS`, `SOA` and `_domainconnect` records stay as they are.

The A record is pinned to an IP, which is the one cost of this route: if
Hostinger ever moves the account to another server the site goes dark until
this is updated. The IP is shown in the website dashboard under **Connect
domain → Connect via DNS records**.

**`_dmarc` started as `p=quarantine` with reports going to a GoDaddy address.**
It was lowered to `p=none` so a mistyped DKIM key could not silently send every
order confirmation to spam. Once order email has been landing in inboxes for a
few weeks, raise it back to `p=quarantine`.

### Mail to @appukaju.com

There is none, by choice. The domain move deleted the old mailboxes; the
Emails section now holds a fresh **Free Business Email** plan (to 2027-09-23)
with zero mailboxes, and no MX or SPF record exists. Nothing is broken by this:
the site publishes two Gmail addresses and order alerts go to
`appukajuwala@gmail.com`. hPanel will keep showing *"Your domain setup isn't
complete"* — that nag is expected.

To give the shop a real `@appukaju.com` address later, create the mailbox and
add at GoDaddy: `MX @ mx1.hostinger.in` (5), `MX @ mx2.hostinger.in` (10),
`TXT @ v=spf1 include:_spf.mail.hostinger.com ~all`, and CNAMEs `autodiscover`
and `autoconfig` to `autodiscover.mail.hostinger.com` / `autoconfig.mail.hostinger.com`.
Only one `v=spf1` record may exist at the root.

## The Razorpay webhook

Razorpay keeps **separate webhook lists for test and live mode**. Both point at
the same URL; switching modes means creating the webhook again in the other
list, with a new secret.

| Mode | URL | Secret |
|---|---|---|
| Test | `https://appukaju.com/api/webhook` | goes in `RAZORPAY_WEBHOOK_SECRET` while on test keys |
| Live | `https://appukaju.com/api/webhook` | replaces it when switching to live keys |

Events: **`payment.captured`** and **`order.paid`** — the two in `HANDLED`
(`api/webhook.js`). Anything else is answered 200 and ignored.

A quick way to tell whether the secret reached the server, without making a
payment: `POST /api/webhook` with a junk signature. **400** means the variable
is set and the signature check ran; **500** means `RAZORPAY_WEBHOOK_SECRET` is
missing, which is deliberately retryable so Razorpay redelivers once it is
fixed.

## Logs and restarts

Website dashboard → the Node.js app: deployment history and build logs, runtime
logs, CPU / RAM / I/O graphs, and a **Restart** button that restarts the process
without a rebuild.
