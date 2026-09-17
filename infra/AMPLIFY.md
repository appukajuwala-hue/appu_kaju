# Hosting on AWS Amplify

How the live site is hosted. Everything here is done in the AWS web console —
no CLI, no IAM users, no CloudFormation.

For the alternative self-managed setup (S3 + CloudFront + Lambda, deployed by
GitHub Actions), see `infra/README.md`. Its workflow is dormant.

## The shape of it

```
 visitor ──▶ Amplify Hosting  (the pages; rebuilds on every push)
    │
    └──────▶ Lambda Function URL  (the four API endpoints, CORS-restricted)
                   ▲
 Razorpay ─────────┘  (webhook, server to server)
```

Two pieces, because Amplify builds and serves static sites but does not run
this project's `api/` folder.

**Why the browser calls the Lambda directly.** The obvious alternative — an
Amplify rewrite that proxies `/api/*` to the Function URL — does not work.
Amplify's rewrites keep the visitor's `Host` header, and a Lambda Function URL
rejects any request whose `Host` is not its own `*.lambda-url.*.on.aws`. So the
site is built with `VITE_API_BASE` set to the Function URL (see
`src/lib/api.js`), and the Function URL's CORS settings decide which sites may
call it.

## ⚠️ The rule that matters

**Amplify redeploys the pages on every push. It never touches the Lambda.**

The price list, `src/constants/index.js`, is bundled into *both*. Change a
price, push, and the site shows the new price within minutes — while the
Lambda keeps charging the old one until someone uploads a new zip.

That fails safe rather than silently: `src/cart/payment.js` compares the two
totals and stops checkout with *"Prices have changed since you added these"*.
Nobody is overcharged. But checkout is broken for everyone until the Lambda
catches up.

**So: whenever a commit changes anything under `api/` or `src/constants/`,
upload a new Lambda zip.** The CI run for that commit attaches it — Actions →
the run → Artifacts → `lambda-fn`. Or build it locally with
`infra/package-lambda.sh`, which writes `build/fn.zip`.

## 1. The Lambda

Console region, top right: **Asia Pacific (Mumbai) `ap-south-1`**. Set it
before creating anything; a function created in another region is invisible
from Mumbai.

**Lambda → Create function → Author from scratch**

| Setting | Value |
|---|---|
| Function name | `appukaju-api` |
| Runtime | Node.js 22.x |
| Architecture | x86_64 |
| Execution role | Create a new role with basic Lambda permissions |

Then:

- **Code → Upload from → .zip file** → `build/fn.zip`
- **Code → Runtime settings → Edit → Handler:** `infra/lambda/handler.handler`
  The default `index.handler` does not exist in this zip, and every request
  fails with `Runtime.HandlerNotFound` until it is changed.
- **Configuration → General configuration → Edit:** timeout **15 sec**, memory **256 MB**.
  `/api/verify` makes up to three calls to Razorpay; the default 3 seconds is
  not enough.
- **Configuration → Environment variables → Edit:**

| Key | Value |
|---|---|
| `RAZORPAY_KEY_ID` | `rzp_test_…` until go-live |
| `RAZORPAY_KEY_SECRET` | the matching secret |
| `RAZORPAY_WEBHOOK_SECRET` | from step 3 — add once it exists |
| `RESEND_API_KEY` | `re_…` |
| `ORDER_EMAIL_FROM` | `Appu Kaju <orders@appukaju.com>` |
| `ORDER_EMAIL_TO` | `appukajuwala@gmail.com` |

### The Function URL

**Configuration → Function URL → Create function URL**

| Setting | Value |
|---|---|
| Auth type | `NONE` |
| Configure cross-origin resource sharing (CORS) | ✓ |
| Allow origin | `https://appukaju.com`, `https://www.appukaju.com`, and the Amplify address from step 2 |
| Allow headers | `content-type` |
| Allow methods | `GET`, `POST` |
| Max age | `86400` |
| Allow credentials | off |

Auth type `NONE` is correct: the endpoints are public by design, and their
security comes from server-side pricing and signature verification, not from
restricting who can reach them. CORS only stops *other websites* driving a
visitor's browser against the API; it is not an access control.

Test it: open `https://<function-url>/api/config` in a browser. Expect
`{"testMode":true,"configured":true}`.

## 2. Amplify

**Amplify → Create new app → GitHub** → authorise → pick the repository and
branch.

**Before the first build**, under **Advanced settings → Environment variables**:

| Key | Value |
|---|---|
| `VITE_API_BASE` | the Function URL, **no trailing slash** |

Vite bakes this in when it builds. Set it after the first build and that build
calls a relative `/api/…` that does not exist — so redeploy after setting it.

`amplify.yml` in the repository root supplies the build commands, including
lint and the full test suite; nothing else to configure.

### The rewrite rule

**Hosting → Rewrites and redirects → Manage redirects → Open text editor**:

```json
[
  {
    "source": "</^[^.]+$|\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|mp4|xml)$)([^.]+$)/>",
    "status": "200",
    "target": "/index.html",
    "condition": null
  }
]
```

This is AWS's documented single-page-app rule **with `jpeg`, `mp4` and `xml`
added**. AWS's version omits them, and tested against this build it rewrites
four real files to the home page — `sitemap.xml` and all three videos — while
reporting no error. With the additions, all 35 built files are served as files
and every client-side route returns the app.

Without any rule, a hard refresh on `/shop` or `/checkout` is a 404.

After the first deploy, copy the app's address — `https://<branch>.<id>.amplifyapp.com` —
into the Function URL's allowed origins.

## 3. The Razorpay webhook

Razorpay → **Accounts & Settings → Webhooks → Add New Webhook**, pointing at the
**Function URL directly** — not the Amplify domain, which cannot forward it:

| Field | Value |
|---|---|
| Webhook URL | `https://<function-url>/api/webhook` |
| Secret | a long random value; also set as `RAZORPAY_WEBHOOK_SECRET` |
| Active events | `payment.captured` |

Test mode and live mode keep separate webhook lists. Create it again, with its
own secret, after switching to live keys.

## 4. The domain

**Amplify → Hosting → Custom domains → Add domain** → `appukaju.com`.
Amplify requests and renews the certificate itself.

DNS for this domain is served by **Hostinger**, not GoDaddy (the registrar), so
every record goes into Hostinger's DNS zone editor. Amplify shows the exact
records; add them there. Enter record names without the trailing
`.appukaju.com` — Hostinger appends it.

Before changing the root and `www` records at cutover, **turn off Hostinger
CDN** for the site. Hostinger CDN creates and manages the root ALIAS record,
and Hostinger advises disabling it before editing the domain's records. The
root can hold an ALIAS or `A`/`AAAA` records, never both.

**Never change:** the two `MX` records, the root `TXT` SPF, `autodiscover`,
`autoconfig`, `ftp`, `resend._domainkey`, `rsend`, `send`. They carry the
client's mailboxes and the order emails.

## Logs

- Pages and builds: Amplify → the app → the branch → build history
- API: CloudWatch → Log groups → `/aws/lambda/appukaju-api`
