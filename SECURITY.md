# Security model

Pollframe is a mostly static, public-data application delivered by a narrowly
scoped Cloudflare Worker. It has no visitor accounts, payments, advertising,
comment system or server-side contact form. The only write API is the anonymous
bug-report route under `/api/bug-reports`; reports are stored in a private
Cloudflare Durable Object. The contact assistant remains local and only creates
a `mailto:` link.

## Implemented controls

- The normal site uses a default-deny Content Security Policy, Trusted Types,
  no production source maps, restrictive browser permissions and no external
  fonts. Only Cloudflare Web Analytics and the voluntary Postcodes.io lookup
  are allowed third-party browser connections.
- The normal site cannot be framed. Journalist embeds use a separate noindex,
  no-referrer entry and generated iframes are sandboxed.
- The Worker runs before static assets only for `/api/*`. Bug-report writes
  require same-origin POST requests, bounded JSON, an allowlisted category,
  a honeypot check and a secret-salted one-hour rate limit. Reports contain no
  requested name or email, are automatically deleted within twelve months and
  the dashboard requires a server-side secret.
- Data updaters allowlist their sources, reject malformed responses and run
  schema/range checks before publication. Large new single-source movements
  stop the update until their deterministic review id is explicitly approved.
- Update builds have read-only repository access. A separate publishing job can
  write only the validated public data snapshot.
- Dependencies and GitHub Actions are exactly pinned. Pull requests and main
  pushes run a production build, low-severity npm audit and the full configured
  Chromium, Firefox, WebKit, phone and tablet regression matrix.
- `npm run check` validates datasets, policies, workflow pins, production
  output and compressed-asset budgets.

## Required account and hosting settings

Before public promotion:

1. Set `BUG_REPORT_ADMIN_KEY` as a unique randomly generated Worker secret and
   test submit, dashboard access, status update and export in production.
2. Enable passkeys or hardware-key 2FA on GitHub, Cloudflare, the registrar and
   editorial email; store recovery codes offline with the responsible adult.
3. Protect the production branch: require the `Quality gate`, block force
   pushes and restrict Actions to trusted, SHA-pinned workflows.
4. Enable failed-workflow alerts, review Dependabot changes and export the bug
   report JSON to encrypted offline storage at least monthly.
5. Keep Cloudflare preview URLs disabled and limit deployment/DNS access.

HSTS preloading and `includeSubDomains` remain deliberately disabled until a
final custom domain and every subdomain are permanently HTTPS.

## Verification

```sh
npm ci --ignore-scripts
npm audit --audit-level=low
npm run check
npm run test:browser
npm run data:update -- --check-only
```

No security claim is absolute. The principal residual risks are compromised
hosting or source accounts, upstream data errors, vulnerable dependencies or
browsers, and deliberate public framing of `/embed.html`. Security reports can
be sent privately to `opinionpoll.redaktion@proton.me`; sensitive personal data
should not be included.
