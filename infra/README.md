# AWS setup

One-time steps to stand up hosting. After this, every push to `main` deploys
itself via `.github/workflows/deploy.yml`.

> **These commands have not been run against a live AWS account.** The Lambda
> adapter and packaging are tested (see the bottom of this file); the AWS calls
> below are written from the documented APIs but not executed. Run them one at a
> time and read each response rather than pasting the whole file at once.

## What gets built, and why

```
            ┌─────────────┐
 visitor ──▶│ CloudFront  │──▶ /api/*  ──▶ Lambda Function URL ──▶ Razorpay
            │  (HTTPS,    │
            │   caching)  │──▶ everything else ──▶ S3 (private)
            └─────────────┘
```

Two choices carry the cost:

- **Lambda Function URL, not API Gateway.** API Gateway bills $1.00 per million
  requests. A Function URL costs nothing beyond the Lambda invocation. Nothing
  else about them differs for two JSON endpoints.
- **CloudFront in front of both**, so the site and the API share one origin.
  That means no CORS, no preflight, and the browser calls plain `/api/…` exactly
  as it does on Vercel — no client code changes.

Lambda's 1M requests/month and CloudFront's 1 TB/month free tiers are permanent,
not 12-month. S3's 5 GB is the only 12-month one, and this site is 11 MB.

## Before you start

Install the AWS CLI, then `aws configure` with an access key from an admin user:

```bash
winget install -e --id Amazon.AWSCLI     # Windows
aws --version                            # expect aws-cli/2.x
aws sts get-caller-identity              # should print your account id
```

## Variables used throughout

Set these once per shell. **Bucket names are globally unique** — if creation
fails with `BucketAlreadyExists`, add a suffix.

```bash
export REGION=ap-south-1                    # Mumbai: closest to your customers
export BUCKET=appukaju-site
export FN=appukaju-api
export ROLE_LAMBDA=appukaju-api-role
export ROLE_DEPLOY=appukaju-deploy
export GH_OWNER=appukajuwala-hue
export GH_REPO=appu_kaju
export ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
```

---

## 1. The bucket

Private. CloudFront reads it; the public never does.

```bash
aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION"

aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

## 2. The Lambda

```bash
aws iam create-role --role-name "$ROLE_LAMBDA" \
  --assume-role-policy-document file://infra/iam/lambda-trust.json

aws iam attach-role-policy --role-name "$ROLE_LAMBDA" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# IAM roles take a few seconds to propagate; if the next command fails with
# "cannot be assumed", wait 10 seconds and retry it.
infra/package-lambda.sh

aws lambda create-function \
  --function-name "$FN" \
  --runtime nodejs22.x \
  --role "arn:aws:iam::$ACCOUNT:role/$ROLE_LAMBDA" \
  --handler infra/lambda/handler.handler \
  --zip-file fileb://build/fn.zip \
  --timeout 15 \
  --memory-size 256 \
  --region "$REGION"
```

`--timeout 15` because `/api/verify` makes up to three outbound calls to
Razorpay. `--memory-size 256` buys proportionally faster CPU; at 256 MB the free
400,000 GB-seconds still covers about 1.6 million seconds of execution a month.

### The Razorpay keys

**Do this in the console, not the CLI** — a `--environment` flag puts your secret
into shell history. Lambda → `appukaju-api` → Configuration → Environment
variables → Edit, and add all six:

| Key | Value | Without it |
|---|---|---|
| `RAZORPAY_KEY_ID` | `rzp_test_…`, later `rzp_live_…` | no payments at all |
| `RAZORPAY_KEY_SECRET` | the matching secret | no payments at all |
| `RAZORPAY_WEBHOOK_SECRET` | the secret you type when creating the webhook in step 8 — **not** the API key secret | `/api/webhook` answers 500 and Razorpay retries |
| `RESEND_API_KEY` | `re_…`, Sending access | payments work, no order emails |
| `ORDER_EMAIL_FROM` | `Appu Kaju <orders@appukaju.com>` — must be on the domain verified in Resend | Resend rejects every send with a 403 |
| `ORDER_EMAIL_TO` | the shop's inbox, `appukajuwala@gmail.com` | the shop gets no copy |

`RAZORPAY_WEBHOOK_SECRET` can only be set once step 8 exists; until then the
webhook simply fails closed, which is safe. Everything else belongs here from the
start.

Lambda reads environment variables when a new instance starts, so a changed
value reaches requests within a few minutes rather than instantly.

Lambda environment variables are encrypted at rest and cost nothing. Secrets
Manager would bill $0.40 per secret per month for no benefit here.

### The function URL

```bash
aws lambda create-function-url-config \
  --function-name "$FN" --auth-type NONE --region "$REGION"

# Without this the URL exists but returns 403 to everyone.
aws lambda add-permission \
  --function-name "$FN" \
  --statement-id AllowPublicFunctionUrl \
  --action lambda:InvokeFunctionUrl \
  --principal '*' \
  --function-url-auth-type NONE \
  --region "$REGION"

export FN_HOST=$(aws lambda get-function-url-config --function-name "$FN" \
  --region "$REGION" --query FunctionUrl --output text | sed -E 's|https://||; s|/$||')
echo "$FN_HOST"
```

## 3. CloudFront

```bash
export OAC_ID=$(aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name":"appukaju-s3",
    "Description":"Lets CloudFront read the private site bucket",
    "SigningProtocol":"sigv4",
    "SigningBehavior":"always",
    "OriginAccessControlOriginType":"s3"
  }' --query 'OriginAccessControl.Id' --output text)

sed -e "s|__CALLER_REF__|appukaju-$(date +%s)|" \
    -e "s|__BUCKET__|$BUCKET|" \
    -e "s|__REGION__|$REGION|" \
    -e "s|__OAC_ID__|$OAC_ID|" \
    -e "s|__FUNCTION_URL_HOST__|$FN_HOST|" \
    infra/cloudfront-distribution.json > build/distribution.json

export DIST_ID=$(aws cloudfront create-distribution \
  --distribution-config file://build/distribution.json \
  --query 'Distribution.Id' --output text)

aws cloudfront get-distribution --id "$DIST_ID" \
  --query 'Distribution.DomainName' --output text
```

That last line prints the URL the site will live at. **Deployment takes about
15 minutes** to reach every edge location.

Three settings in `cloudfront-distribution.json` are load-bearing, and each
fails quietly if changed:

1. **`OriginRequestPolicyId` on `/api/*` is `AllViewerExceptHostHeader`.** A
   Lambda Function URL rejects a request carrying the viewer's `Host` header, so
   everything is forwarded *except* Host.
2. **`CachePolicyId` on `/api/*` is `CachingDisabled`.** Otherwise CloudFront
   would cache one customer's order response and serve it to the next.
3. **403 and 404 both map to `/index.html` with status 200.** This is the
   equivalent of the `vercel.json` SPA rewrite; without it, a hard refresh on
   `/checkout` or `/terms` returns an S3 error instead of the app.

## 4. Let CloudFront read the bucket

Only possible now, because the policy names the distribution.

```bash
sed -e "s|__BUCKET__|$BUCKET|" \
    -e "s|__ACCOUNT_ID__|$ACCOUNT|" \
    -e "s|__DISTRIBUTION_ID__|$DIST_ID|" \
    infra/iam/s3-bucket-policy.json > build/bucket-policy.json

aws s3api put-bucket-policy --bucket "$BUCKET" --policy file://build/bucket-policy.json
```

## 5. The GitHub deploy role

OIDC rather than stored access keys: GitHub mints a short-lived token per run,
so no long-lived AWS credential exists to leak. This repository is public, which
makes that worth the extra two commands.

```bash
# One per account. If it already exists, the error is safe to ignore.
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com

sed -e "s|__ACCOUNT_ID__|$ACCOUNT|" -e "s|__GH_OWNER__|$GH_OWNER|" -e "s|__GH_REPO__|$GH_REPO|" \
    infra/iam/github-oidc-trust.json > build/trust.json

aws iam create-role --role-name "$ROLE_DEPLOY" \
  --assume-role-policy-document file://build/trust.json

sed -e "s|__BUCKET__|$BUCKET|" \
    -e "s|__REGION__|$REGION|" \
    -e "s|__ACCOUNT_ID__|$ACCOUNT|" \
    -e "s|__LAMBDA_FUNCTION__|$FN|" \
    -e "s|__DISTRIBUTION_ID__|$DIST_ID|" \
    infra/iam/deploy-policy.json > build/deploy-policy.json

aws iam put-role-policy --role-name "$ROLE_DEPLOY" \
  --policy-name deploy --policy-document file://build/deploy-policy.json

echo "arn:aws:iam::$ACCOUNT:role/$ROLE_DEPLOY"
```

The trust policy is scoped to `repo:<owner>/<repo>:ref:refs/heads/main` — a
branch other than `main`, or a fork, cannot assume this role even with a valid
GitHub token.

## 6. Tell GitHub

Repository → Settings → Secrets and variables → Actions.

**Variables** (not secret): `AWS_REGION`, `S3_BUCKET`, `LAMBDA_FUNCTION`,
`CLOUDFRONT_DISTRIBUTION` — the values of `$REGION`, `$BUCKET`, `$FN`, `$DIST_ID`.

**Secret**: `AWS_ROLE_ARN` — the ARN printed above.

## 7. Deploy

Push to `main`, or Actions → *Deploy to AWS* → Run workflow.

---

## Verify, in this order

Against the CloudFront domain. `curl -i` so you see the status.

1. **`/` loads**, and a hard refresh on `/checkout` and `/terms` both render the
   app — proves the 403/404 mapping.
2. **`GET /api/config` → 200** with `{"testMode":true,"configured":true}`. The
   cheapest proof that the Lambda is reachable, routed, and can see its
   environment. `"configured":false` means the Razorpay variables are not set.
   A 403 here means step 2's `add-permission` was missed; a 502 usually means
   the Host header is being forwarded.
3. **`GET /api/create-order` → 405** with an `allow: POST` header.
4. **Server-side pricing holds:**
   ```bash
   curl -s -X POST https://<domain>/api/create-order \
     -H 'content-type: application/json' \
     -d '{"customer":{"name":"A","email":"a@b.com","phone":"9876543210",
          "address":"1 St","city":"Lucknow","state":"UP","pin":"226001"},
          "items":[{"id":"rimmee-250","qty":2}],"amount":1}'
   ```
   Must return `"amount":600`, not `1`.
5. **Forged signature rejected:**
   ```bash
   curl -s -X POST https://<domain>/api/verify -H 'content-type: application/json' \
     -d '{"razorpay_order_id":"order_X","razorpay_payment_id":"pay_X","razorpay_signature":"deadbeef"}'
   ```
   Must return `{"ok":false}` with status 400.
6. **A real test payment** — card `4111 1111 1111 1111`, any future expiry,
   CVV `123`, then **Success** on the simulated OTP screen. It should appear in
   the Razorpay dashboard with the delivery address in its notes, both emails
   should arrive, and the order's notes should gain `sent: browser`.
7. **Push a trivial commit** and confirm the Action deploys it.

Logs for anything that misbehaves: CloudWatch → Log groups → `/aws/lambda/appukaju-api`.

## 8. The Razorpay webhook

Only possible now — Razorpay needs a URL it can reach.

Razorpay Dashboard → **Accounts & Settings → Webhooks → Add New Webhook**:

| Field | Value |
|---|---|
| Webhook URL | `https://<domain>/api/webhook` |
| Secret | choose a long random value |
| Active events | `payment.captured` |

Put the same secret in the Lambda's `RAZORPAY_WEBHOOK_SECRET`.

**Test the one case that matters:** make a test payment and close the browser
tab the instant Razorpay's window disappears, before the confirmation page
loads. Both emails should still arrive, and the Razorpay order's notes should
read `sent: webhook` rather than `sent: browser`. That is the whole reason the
webhook exists, and it is the only failure mode you cannot test by behaving
normally.

Test and live mode have **separate** webhook lists in Razorpay. Create it again
after switching to live keys.

## What is already tested

`node infra/lambda/handler.test.js` runs 43 checks against the staged zip
contents, and CI runs it before every deploy:

- routing and the 405/404 guards, including `GET /api/config`
- base64 and malformed body decoding
- all ten cart and address validation rejections
- forged payment signatures rejected
- order notes round-tripping through `buildNotes` / `parseItemsNote` for the
  whole catalogue, including ids containing `x` and hand-edited whitespace
- order email HTML escaping against script and `onerror` injection
- the config endpoint never leaking the key secret
- webhook signatures: forged, missing, computed over a different body, a valid
  signature on an ignored event, base64 delivery, and a missing secret failing
  closed with a retryable 500

Beyond the suite, a live Razorpay test order proved an injected `amount: 1` is
ignored in favour of the catalogue price, and two real test payments produced
four delivered emails and a correctly written `sent` marker that stopped a
replay from sending duplicates.

## Adding appukaju.com

**Where things live.** The domain is *registered* at GoDaddy, but its nameservers
are delegated to Hostinger (`ns1/ns2.dns-parking.com`), so **every DNS change
happens in Hostinger's DNS zone editor, not GoDaddy's.** Records added at GoDaddy
do nothing. The same zone holds the client's email (MX records) and the Resend
records for order email — no step here touches either.

**No Route 53.** A bare domain cannot be a CNAME, but Hostinger supports ALIAS
records at the root, and an ALIAS may target any hostname — including a
`d….cloudfront.net` domain. The zone already uses one.

1. **Request a certificate in `us-east-1`.** CloudFront only reads certificates
   from that region, whatever region everything else is in:
   ```bash
   aws acm request-certificate --domain-name appukaju.com \
     --subject-alternative-names www.appukaju.com \
     --validation-method DNS --region us-east-1
   ```
2. **Validate it.** Add the two CNAME records ACM gives you in Hostinger's DNS
   zone. Enter the *name* without the trailing `.appukaju.com` — Hostinger
   appends the domain itself. Wait for the certificate status to read `ISSUED`.
   This can be done days ahead of the cutover; the old site is unaffected.
3. **Attach it.** Add `appukaju.com` and `www.appukaju.com` as `Aliases` on the
   distribution and select the certificate. The site is still served by
   Hostinger at this point; nothing public has changed.
4. **Test on the CloudFront domain** before touching DNS. Everything in *Verify*
   above should pass against `https://d….cloudfront.net`.

### The cutover

The only step customers can see. The existing WooCommerce site keeps serving
right up to this moment, and remains on Hostinger as a fallback afterwards.

5. **Disable Hostinger CDN** for the website first — hPanel → the website →
   Performance → CDN → off. Hostinger CDN *creates and manages* the root ALIAS
   record, and Hostinger's own guidance is to fully disable it before changing
   the domain's records, or the two conflict.
6. **Re-check the zone.** Disabling CDN may replace the root ALIAS with plain
   `A` / `AAAA` records. A root holds an ALIAS *or* address records, never
   both — remove any `@` `A` and `AAAA` records before the next step.
7. **Point the root at CloudFront:** `ALIAS` · `@` · `d….cloudfront.net`.
   Only one ALIAS is allowed at the root, so edit the existing one if present.
8. **Point `www` at CloudFront:** edit the existing `CNAME` · `www` from
   `www.appukaju.com.cdn.hstgr.net` to `d….cloudfront.net`.
9. **Leave every other row alone** — the two `MX` records, the root `TXT` SPF,
   `autodiscover`, `autoconfig`, `ftp`, `resend._domainkey`, `rsend` and `send`.

The root and `www` records carry a 300-second TTL, so most visitors see the new
site within minutes, though Hostinger advises allowing up to 24 hours. Rolling
back is steps 7 and 8 in reverse, then re-enabling CDN.

## Removing it all

```bash
aws cloudfront get-distribution-config --id "$DIST_ID"   # set Enabled=false, update, wait
aws cloudfront delete-distribution --id "$DIST_ID" --if-match <etag>
aws lambda delete-function --function-name "$FN" --region "$REGION"
aws s3 rm "s3://$BUCKET" --recursive && aws s3api delete-bucket --bucket "$BUCKET" --region "$REGION"
aws iam delete-role-policy --role-name "$ROLE_DEPLOY" --policy-name deploy
aws iam delete-role --role-name "$ROLE_DEPLOY"
```
