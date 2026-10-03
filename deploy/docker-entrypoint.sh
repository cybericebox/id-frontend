#!/bin/sh
# Runtime env substitution for the static export. The build baked each
# NEXT_PUBLIC_* value as a placeholder equal to its variable name; here we
# replace those placeholders with the actual runtime env values so the same
# image works across environments without a rebuild.
set -e

ROOT=/usr/share/nginx/html

# Every operator value comes from env; there are no fallbacks.
for name in NEXT_PUBLIC_MAIN_HOST NEXT_PUBLIC_API_HOST NEXT_PUBLIC_ID_HOST NEXT_PUBLIC_ADMIN_HOST NEXT_PUBLIC_EXERCISES_HOST NEXT_PUBLIC_EVENT_DOMAIN NEXT_PUBLIC_COOKIE_DOMAIN NEXT_PUBLIC_SUPPORT_EMAIL NEXT_PUBLIC_PARTNER_URL NEXT_PUBLIC_PARTNER_SITE_URL NEXT_PUBLIC_CAPTCHA_PROVIDER; do
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    echo "$name is required." >&2
    exit 1
  fi
done
# NEXT_PUBLIC_GOOGLE_ANALYTICS_ID is the only optional value (empty → analytics off); the build
# folded its placeholder, so it is exported (possibly empty) to be substituted.
export NEXT_PUBLIC_GOOGLE_ANALYTICS_ID="${NEXT_PUBLIC_GOOGLE_ANALYTICS_ID:-}"

# Bot check: the provider is turnstile, recaptcha or none (local development).
case "$NEXT_PUBLIC_CAPTCHA_PROVIDER" in turnstile | recaptcha | none) ;; *)
  echo "NEXT_PUBLIC_CAPTCHA_PROVIDER must be turnstile, recaptcha or none." >&2
  exit 1
  ;;
esac
# The site key is required unless the provider is none; the enterprise flag only matters for recaptcha.
if [ "$NEXT_PUBLIC_CAPTCHA_PROVIDER" != "none" ] && [ -z "${NEXT_PUBLIC_CAPTCHA_SITE_KEY:-}" ]; then
  echo "NEXT_PUBLIC_CAPTCHA_SITE_KEY is required when NEXT_PUBLIC_CAPTCHA_PROVIDER is $NEXT_PUBLIC_CAPTCHA_PROVIDER." >&2
  exit 1
fi
export NEXT_PUBLIC_CAPTCHA_SITE_KEY="${NEXT_PUBLIC_CAPTCHA_SITE_KEY:-}"
export NEXT_PUBLIC_RECAPTCHA_ENTERPRISE="${NEXT_PUBLIC_RECAPTCHA_ENTERPRISE:-false}"

printenv | grep '^NEXT_PUBLIC_' | while IFS='=' read -r key value; do
  # Escape sed-special chars in the replacement (| delimiter, & match-ref, \).
  esc=$(printf '%s' "$value" | sed -e 's/[\\&|]/\\&/g')
  find "$ROOT" -type f \( -name '*.js' -o -name '*.html' -o -name '*.css' -o -name '*.txt' \) \
    -exec sed -i "s|${key}|${esc}|g" {} +
done
