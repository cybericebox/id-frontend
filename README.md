# id-frontend

The identity app of Cyber ICE Box, served on `id.<domain>`. Every other app sends people here to sign in, and they come back to where they started.

## What you can do

- Sign in with email and password or with Google.
- Sign up, confirm your email and finish the account setup.
- Reset a forgotten password.
- Edit your profile and change your password.
- Sign out of the platform.

## Environment variables

Static builds (`npm run build`, GitHub Pages) read these at build time. The Docker image reads them at container start.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_DOMAIN` | yes | — | Platform apex domain, e.g. `cybericebox.com`. |
| `NEXT_PUBLIC_API_DOMAIN` | no | `api.<domain>` | API host (bare host, no scheme). |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | yes | — | reCAPTCHA site key; the backend checks reCAPTCHA on sign-in, sign-up and password reset. |
| `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE` | no | `false` | `true` for reCAPTCHA Enterprise; must match the backend mode. |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | no | analytics off | Google Analytics 4 measurement id (`G-…`). |

## Commands

```bash
npm install
npm run dev          # http://localhost:3001
npm run build        # static export → out/
npm run lint
npm run typecheck
npm run test:e2e     # Playwright

docker build -f deploy/Dockerfile -t cybericebox/id-frontend .
docker run --rm -p 3000:3000 -e NEXT_PUBLIC_DOMAIN=cybericebox.local -e NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<site key> cybericebox/id-frontend
```

## Deployment

- **GitHub Pages** — publishing a release runs `.github/workflows/pages.yml`, which builds the static export and deploys it. Set the variables above (and secrets) on the `github-pages` environment (Settings → Environments); the custom domain is set in Settings → Pages.
- **Docker images** — a push to `develop` builds `cybericebox/id-frontend:<commit sha>` (`develop-image.yml`); a published release builds `cybericebox/id-frontend:latest` and `:<release tag>` (`publish-image.yml`).
- **Kubernetes** — manifests are in `deploy/manifests`. Put the values in `config.yaml`; an empty key uses the default.
