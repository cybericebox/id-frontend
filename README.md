# id-frontend

The sign-in and account site of the Cyber&nbsp;ICE&nbsp;Box platform. People create an account, sign in, reset a
password and manage their profile here. The other platform sites send visitors here to authenticate.

## Where it sits

| Question | Answer |
|---|---|
| Who uses it | Every person with a platform account |
| Backend | The platform API at `api.<DOMAIN>` (accounts, sessions, profile) |
| Build output | Static export in `out/`, served by nginx. No Node server at runtime |
| Dev port | 3001 |

## What it does

| Route | Page |
|---|---|
| `/` | Redirects a signed-in visitor to the profile and everyone else to sign-in |
| `/sign-in` | Sign in with email and password, a passkey or Google |
| `/sign-up` | Create an account (email or Google) |
| `/confirm-email` | Confirm an email address from the link in the message |
| `/forgot-password`, `/reset-password` | Ask for and complete a password reset |
| `/google-link` | Confirm the account when signing in with Google |
| `/setup` | Finish sign-up from a token link |
| `/profile` | Profile and photo, email, password, passkeys, linked Google account, privacy |
| `/sign-out` | End the session |

Sign-up and sign-in forms are protected by a captcha (reCAPTCHA v3 or Cloudflare Turnstile, chosen in the config).
Text is Ukrainian by default, with English available.

## Run it locally

Node.js 26 or newer (see `.nvmrc`). You need a running platform backend; the site derives its API host from the base
domain.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3001
```

## Configure

`NEXT_PUBLIC_*` values are inlined at build time. The container image substitutes them at start, so one image serves
any environment. A missing required value fails the build or the container start; there are no fallbacks.

- `.env.example` is the template; it lists every value with a comment.
- `NEXT_PUBLIC_DOMAIN` is the only host input. The API, the other sites and the shared cookies derive from it.
- `npm run check:cfg` builds the way the Dockerfile does and checks that every placeholder survives in the bundle.
- An optional value left empty hides what needs it. Installation and captcha values:

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_MAIN_SITE_URL` | no | `https://` URL of the main site. Set: the logo leads there. Empty: the logo leads to `/` of this site. |
| `NEXT_PUBLIC_TERMS_URL` | no | `https://` URL of the Terms. Empty: no link. |
| `NEXT_PUBLIC_PRIVACY_URL` | no | `https://` URL of the Privacy Policy. Empty: no link. |
| `NEXT_PUBLIC_COOKIES_URL` | no | `https://` URL of the Cookie Policy. Empty: no link in the cookie banner. |
| `NEXT_PUBLIC_SHOW_ICE_DEPARTMENT_SUPPORT` | no | `true` shows the department support line in the sign-in panel footer. Default `false`. |
| `NEXT_PUBLIC_CAPTCHA_PROVIDER` | yes | `turnstile`, `recaptcha` or `none` (local development). Must match the backend. |
| `NEXT_PUBLIC_CAPTCHA_SITE_KEY` | unless provider is `none` | Public site key of the provider. |
| `NEXT_PUBLIC_RECAPTCHA_PROJECT` | no | Google Cloud project id. Non-empty switches `recaptcha` to Enterprise; must match the backend mode. |

## Development commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build, static export to `out/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Playwright tests in `e2e/` |
| `npm run check:cfg` | Checks that config placeholders survive the build |
| `npm run check:ds` | Fails if a copied design-system file was edited by hand |
| `npm run sync:errors` | Adds new backend error codes to `messages/errors.*.json` (needs a `daemon` checkout at `../daemon`) |

`scripts/test-nginx-tls.sh` checks the container's TLS and client-certificate modes (needs Docker).

## Rules for changes

- Every user-visible string goes through `messages/uk.json` and `messages/en.json` and `t("key", { vars })`. Add each
  key to both files.
- Loading states use the crest loader, never a generic spinner.
- Field errors appear next to their field.

## Container

The image serves the export with nginx: plain HTTP on 8080, a health listener on 8081 (`/healthz` only), and TLS on
8443 when `/tls/tls.crt` and `/tls/tls.key` are mounted. Client certificates are required when `/aop/ca.crt` is
mounted. The config is in `deploy/nginx/`; `deploy/nginx-entrypoint.sh` validates the environment and fails the start
on a bad combination. At start, `deploy/csp.sh` hashes the inline scripts and writes the Content Security Policy
header.

## Releases and contributing

Branches, pull requests and releases: see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache License 2.0. See [LICENSE](LICENSE).
