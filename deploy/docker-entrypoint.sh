#!/bin/sh
# Runtime env substitution for the static export. The build baked each
# NEXT_PUBLIC_* value as a placeholder equal to its variable name; here we
# replace those placeholders with the actual runtime env values so the same
# image works across environments without a rebuild.
set -e

ROOT=/usr/share/nginx/html

if [ -z "${NEXT_PUBLIC_DOMAIN:-}" ]; then
  echo "NEXT_PUBLIC_DOMAIN is required." >&2
  exit 1
fi
# The backend rejects sign-in/sign-up without a reCAPTCHA token, so the site key is
# required too; the Enterprise flag must match the backend mode (RECAPTCHA_PROJECT set).
if [ -z "${NEXT_PUBLIC_RECAPTCHA_SITE_KEY:-}" ]; then
  echo "NEXT_PUBLIC_RECAPTCHA_SITE_KEY is required (the backend enforces reCAPTCHA)." >&2
  exit 1
fi
# Optional values get their defaults here (the build folded the placeholder, so the
# code-side fallback is gone): the API host derives from the domain.
: "${NEXT_PUBLIC_API_DOMAIN:=api.$NEXT_PUBLIC_DOMAIN}"
: "${NEXT_PUBLIC_RECAPTCHA_ENTERPRISE:=false}"
export NEXT_PUBLIC_API_DOMAIN NEXT_PUBLIC_RECAPTCHA_ENTERPRISE

printenv | grep '^NEXT_PUBLIC_' | while IFS='=' read -r key value; do
  # Escape sed-special chars in the replacement (| delimiter, & match-ref, \).
  esc=$(printf '%s' "$value" | sed -e 's/[\\&|]/\\&/g')
  find "$ROOT" -type f \( -name '*.js' -o -name '*.html' -o -name '*.css' -o -name '*.txt' \) \
    -exec sed -i "s|${key}|${esc}|g" {} +
done
