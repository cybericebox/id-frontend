#!/bin/sh
# Runtime env substitution for the static export. The build baked each
# NEXT_PUBLIC_* value as a placeholder equal to its variable name wrapped in double
# underscores (__NEXT_PUBLIC_X__); here we replace those placeholders with the actual
# runtime env values so the same image works across environments without a rebuild.
set -e

ROOT=/usr/share/nginx/html

# NEXT_PUBLIC_DOMAIN is the only host input (deploy/base-domain.sh, the same file in every frontend): every host derives from it in the code.
# The other operator values are required.
. /usr/local/lib/base-domain.sh
base_domain_check || exit 1
for name in NEXT_PUBLIC_SUPPORT_EMAIL NEXT_PUBLIC_CAPTCHA_PROVIDER; do
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    echo "$name is required." >&2
    exit 1
  fi
done
# Optional values: NEXT_PUBLIC_GOOGLE_ANALYTICS_ID (empty → analytics off) and NEXT_PUBLIC_SHOW_PARTNERS (default true; "false" hides the
# partner links). The build folded their placeholders, so they are exported to be substituted.
export NEXT_PUBLIC_GOOGLE_ANALYTICS_ID="${NEXT_PUBLIC_GOOGLE_ANALYTICS_ID:-}"
export NEXT_PUBLIC_SHOW_PARTNERS="${NEXT_PUBLIC_SHOW_PARTNERS:-true}"

# Bot check: the provider is turnstile, recaptcha or none (local development).
case "$NEXT_PUBLIC_CAPTCHA_PROVIDER" in turnstile | recaptcha | none) ;; *)
  echo "NEXT_PUBLIC_CAPTCHA_PROVIDER must be turnstile, recaptcha or none." >&2
  exit 1
  ;;
esac
# The site key is required unless the provider is none; the reCAPTCHA project id (optional, non-empty = Enterprise) only matters for recaptcha.
if [ "$NEXT_PUBLIC_CAPTCHA_PROVIDER" != "none" ] && [ -z "${NEXT_PUBLIC_CAPTCHA_SITE_KEY:-}" ]; then
  echo "NEXT_PUBLIC_CAPTCHA_SITE_KEY is required when NEXT_PUBLIC_CAPTCHA_PROVIDER is $NEXT_PUBLIC_CAPTCHA_PROVIDER." >&2
  exit 1
fi
export NEXT_PUBLIC_CAPTCHA_SITE_KEY="${NEXT_PUBLIC_CAPTCHA_SITE_KEY:-}"
export NEXT_PUBLIC_RECAPTCHA_PROJECT="${NEXT_PUBLIC_RECAPTCHA_PROJECT:-}"

# One pass: a single sed script with an expression per NEXT_PUBLIC_* variable, run once over each
# file that holds a placeholder (in parallel: busybox sed is slow on the minified bundles). Only the
# wrapped token is replaced; the bare name is also an object key and plain text in the bundle.
# Files without a placeholder are never rewritten.
script=$(mktemp)
trap 'rm -f "$script"' EXIT
printenv | grep '^NEXT_PUBLIC_' | while IFS='=' read -r key value; do
  # Escape sed-special chars in the replacement (| delimiter, & match-ref, \).
  esc=$(printf '%s' "$value" | sed -e 's/[\\&|]/\\&/g')
  printf 's|__%s__|%s|g\n' "$key" "$esc"
done > "$script"

grep -rlIE '__NEXT_PUBLIC_[A-Z0-9_]+__' "$ROOT" | xargs -r -n 1 -P "$(nproc)" sed -i -f "$script"

# A placeholder that is still there means its variable is missing: fail the start, not the page.
left=
# The cheap fixed-string scan first; the token names are only collected when something is left.
if grep -rqIF '__NEXT_PUBLIC_' "$ROOT"; then
  left=$(grep -rhoIE '__NEXT_PUBLIC_[A-Z0-9_]+__' "$ROOT" | sort -u | tr '\n' ' ')
fi
if [ -n "$left" ]; then
  echo "No value for: $left(set the variable, an empty one is fine for an optional value)." >&2
  exit 1
fi
