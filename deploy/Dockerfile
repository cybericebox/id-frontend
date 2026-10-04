# id-frontend — static export, served by nginx.
#
# NEXT_PUBLIC_* are normally inlined at BUILD time. To allow RUNTIME config (no
# rebuild per env change), we build with placeholders equal to the variable
# names wrapped in double underscores (__NEXT_PUBLIC_X__), and an entrypoint substitutes the real values at container start
# (nginx:alpine runs /docker-entrypoint.d/*.sh before launching).
# Run with NEXT_PUBLIC_DOMAIN (every host derives from it: main = DOMAIN, api./id./admin./exercises.DOMAIN, events <tag>.DOMAIN, cookies DOMAIN),
# NEXT_PUBLIC_SUPPORT_EMAIL and NEXT_PUBLIC_CAPTCHA_PROVIDER (+ NEXT_PUBLIC_CAPTCHA_SITE_KEY unless none). The rest is optional
# (NEXT_PUBLIC_GOOGLE_ANALYTICS_ID, NEXT_PUBLIC_SHOW_PARTNERS, NEXT_PUBLIC_RECAPTCHA_PROJECT).
FROM --platform=$BUILDPLATFORM node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ENV NEXT_PUBLIC_DOMAIN="__NEXT_PUBLIC_DOMAIN__" \
    NEXT_PUBLIC_SUPPORT_EMAIL="__NEXT_PUBLIC_SUPPORT_EMAIL__" \
    NEXT_PUBLIC_SHOW_PARTNERS="__NEXT_PUBLIC_SHOW_PARTNERS__" \
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID="__NEXT_PUBLIC_GOOGLE_ANALYTICS_ID__" \
    NEXT_PUBLIC_CAPTCHA_PROVIDER="__NEXT_PUBLIC_CAPTCHA_PROVIDER__" \
    NEXT_PUBLIC_CAPTCHA_SITE_KEY="__NEXT_PUBLIC_CAPTCHA_SITE_KEY__" \
    NEXT_PUBLIC_RECAPTCHA_PROJECT="__NEXT_PUBLIC_RECAPTCHA_PROJECT__"
RUN npm run build && node scripts/csp-inline.mjs

FROM nginx:1.30.5-alpine-slim@sha256:32463212baf0e7d91aded2e9b843a4f2b9e017804b8c9d5bae7b51dcef64389c AS runner
COPY --from=build /app/out /usr/share/nginx/html
COPY deploy/nginx/nginx.conf deploy/nginx/server.conf /etc/nginx/
COPY deploy/nginx/listen-http.conf deploy/nginx/listen-https.conf deploy/nginx/client-auth.conf deploy/nginx/health.conf /etc/nginx/snippets/
COPY deploy/docker-entrypoint.sh /docker-entrypoint.d/40-next-public-env.sh
# The base-domain derivation (NEXT_PUBLIC_DOMAIN check, the API host for the CSP), sourced by 40-next-public-env.sh and 50-csp.sh.
COPY deploy/base-domain.sh /usr/local/lib/base-domain.sh
# 50-csp.sh runs after the env substitution: it hashes the inline scripts and writes the CSP header
# snippet that server.conf includes (see the header comment in deploy/csp.sh).
COPY deploy/csp.sh /docker-entrypoint.d/50-csp.sh
# 60-nginx-config.sh renders the listener snippets from the TLS_* / HTTP_PORT / HEALTH_PORT env and runs nginx -t.
COPY deploy/nginx-entrypoint.sh /docker-entrypoint.d/60-nginx-config.sh
RUN chmod +x /docker-entrypoint.d/40-next-public-env.sh /docker-entrypoint.d/50-csp.sh /docker-entrypoint.d/60-nginx-config.sh
# Listener defaults (HTTP 8080, TLS 8443 on /tls/tls.crt + /tls/tls.key when present, client CA /aop/ca.crt = require, health 8081)
# are applied by 60-nginx-config.sh; every one is overridable by env.
EXPOSE 8080 8443 8081
