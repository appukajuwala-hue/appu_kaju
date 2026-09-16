#!/usr/bin/env bash
# Stages everything Hostinger (or any Node host) needs, ready to upload.
#
# Mirrors infra/package-lambda.sh, and for the same reason: the api/_lib files
# import ../../src/constants/index.js — the price list — so that relative path
# has to still resolve on the host. Getting the layout wrong fails at import
# time with a module-not-found, long after the upload looks like it worked.
#
# The result is a complete, self-contained app directory:
#
#   dist/                 the built site, served by server.js
#   api/                  the endpoint handlers
#   src/constants/        the catalogue they price from
#   infra/node/server.js  the HTTP adapter (the startup file)
#   package.json          "type": "module", or every import fails
#
# No node_modules: the endpoints use only fetch and node:crypto, and server.js
# uses only node:http and node:fs. Nothing to install on the host.
#
# Usage: infra/package-hostinger.sh [output-dir]   (default: build/hostinger)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/build/hostinger}"

cd "$ROOT"

if [ ! -d dist ] || [ ! -f dist/index.html ]; then
  echo "dist/ is missing or empty — run 'npm run build' first." >&2
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT/infra/node" "$OUT/src/constants"

cp -r dist "$OUT/"
cp -r api "$OUT/"
cp infra/node/server.js "$OUT/infra/node/"
cp src/constants/index.js "$OUT/src/constants/"

# Without "type": "module" Node treats these .js files as CommonJS and every
# import in api/ throws at startup.
printf '{\n  "name": "appu-kaju",\n  "private": true,\n  "type": "module",\n  "scripts": {\n    "start": "node infra/node/server.js"\n  }\n}\n' > "$OUT/package.json"

# .env is NOT copied. Secrets belong in the host's own environment-variable
# settings, never in an uploaded file sitting under a web root.
cat > "$OUT/README-DEPLOY.txt" <<'TXT'
Appu Kaju — Node deployment

Startup file : infra/node/server.js
Start command: node infra/node/server.js
Node version : 18 or newer

Required environment variables (set these in the host's control panel,
NOT in a file in this directory):

  RAZORPAY_KEY_ID
  RAZORPAY_KEY_SECRET
  RAZORPAY_WEBHOOK_SECRET
  RESEND_API_KEY
  ORDER_EMAIL_FROM
  ORDER_EMAIL_TO

PORT is supplied by the host; the server falls back to 3000 if unset.

Check it is alive:  curl -i https://<domain>/api/config
Expect: 200 and {"testMode":...,"configured":true}
TXT

FILES=$(find "$OUT" -type f | wc -l | tr -d ' ')
SIZE=$(du -sh "$OUT" | cut -f1)
echo "staged $OUT ($FILES files, $SIZE)"
echo "upload the CONTENTS of that directory to the app root on the host"
