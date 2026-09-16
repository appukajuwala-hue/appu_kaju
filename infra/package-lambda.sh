#!/usr/bin/env bash
# Builds the deployment zip for the api Lambda.
#
# Used by .github/workflows/deploy.yml and by the one-time setup in README.md,
# so the two cannot drift apart.
#
# The zip mirrors the repository layout because api/_lib/*.js import
# ../../src/constants/index.js — the price list — and that relative path has to
# still resolve inside the function. That constants file has no imports of its
# own, so it is the only thing needed from src/.
#
# Nothing here has npm dependencies: the endpoints use fetch and node:crypto.
# So there is no install step and no node_modules in the zip.
#
# Usage: infra/package-lambda.sh [output-path]   (default: build/fn.zip)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/build/fn.zip}"
STAGE="$ROOT/build/fn"

cd "$ROOT"

rm -rf "$STAGE"
rm -f "$OUT"
mkdir -p "$STAGE/infra/lambda" "$STAGE/src/constants" "$(dirname "$OUT")"

cp -r api "$STAGE/"
cp infra/lambda/handler.js "$STAGE/infra/lambda/"
cp src/constants/index.js "$STAGE/src/constants/"

# Without "type": "module" Node treats the .js files as CommonJS and every
# import in api/ fails at load time.
printf '{"type":"module"}\n' > "$STAGE/package.json"

# `zip` on CI and most Unix boxes; bsdtar is the Windows fallback, since it
# ships with Windows 10+ and writes forward-slash entry names, which Lambda
# requires. PowerShell's Compress-Archive is deliberately not used: some
# versions write backslash separators and Lambda rejects the result.
cd "$STAGE"
if command -v zip >/dev/null 2>&1; then
  zip -qr "$OUT" .
elif [ -x /c/Windows/System32/tar.exe ]; then
  /c/Windows/System32/tar.exe -a -c -f "$OUT" *
elif command -v bsdtar >/dev/null 2>&1; then
  bsdtar -a -c -f "$OUT" *
else
  echo "need either zip or bsdtar to build the deployment package" >&2
  exit 1
fi
cd "$ROOT"

echo "built $OUT ($(du -h "$OUT" | cut -f1))"
