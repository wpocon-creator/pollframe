# Security model

Pollframe is intentionally static. It has no login, cookies, database,
server-side contact endpoint, advertising or server-side application code. Its
contact assistant only builds a local `mailto:` link. Published poll JSON is
public by design. The normal site uses Cloudflare Web Analytics for aggregate
reach and performance measurement; the dedicated journalist embed does not
load the beacon. This removes authentication, session, CSRF, SQL and server-side
request surfaces from the production site.

## Implemented controls

- A restrictive Content Security Policy allows scripts, styles, frames and
  network requests only from Pollframe itself, plus the explicitly configured
  Cloudflare Web Analytics script and reporting endpoint on the normal site.
  Inline/eval scripts, objects, workers, forms and DOM injection sinks are
  blocked. Trusted Types is enforced in supporting browsers.
- The normal site cannot be framed. Journalist embeds use the separate
  `/embed.html` entry, are marked `noindex`, use a no-referrer policy and the
  generated iframe is sandboxed.
- External links use HTTPS, suppress referrers and prevent opener access.
- Vite development and preview servers bind only to `127.0.0.1`. Production
  source maps are disabled.
- The DAWUM updater only accepts the allowlisted HTTPS endpoint, rejects
  redirects and unexpected content types, limits response size and validates
  all data before writing.
- The updater's build job has read-only repository access. A separate minimal
  publishing job receives write access and only installs validated public JSON.
- GitHub Actions are pinned to full commit SHAs. npm lifecycle scripts are
  disabled in CI, the exact lockfile is used, and every run performs an npm
  vulnerability audit.
- `npm run check` validates all poll data, builds both HTML entry points and
  checks browser policy, action pins, secrets/source-map exclusions and output.

## Required hosting and account settings

Use Cloudflare Workers Builds with `npm run build`, `npx wrangler deploy`, and
Node 22. `wrangler.jsonc` publishes the generated `dist` directory as static
assets. The generated `dist/_headers` file must be deployed unchanged. Worker
runtime code is not used; if it is added later, Cloudflare requires the headers
to be applied in generated responses instead.

Before publication:

1. Enable passkeys or hardware-key 2FA on GitHub, Cloudflare, the domain
   registrar and the editorial email account. Do not use SMS as the only
   recovery method.
2. Protect the production branch, require a successful `npm run check`, block
   force pushes and require Actions to be pinned to full-length SHAs.
3. Allow only GitHub-authored actions plus the actions already pinned in the
   workflow. Review Dependabot pull requests before merging.
4. Keep Cloudflare preview deployments non-indexed and restrict who can change
   DNS, Pages settings and deployment tokens.
5. Enable notifications for failed updater/deployment workflows. Periodically
   run `npm audit` and review CSP/browser console violations.
6. Do not add further third-party analytics, fonts, ads or scripts without a new
   privacy and security review. The current CSP permits only the reviewed
   Cloudflare Web Analytics endpoints.

HSTS preloading and `includeSubDomains` are deliberately not enabled until the
final domain and every subdomain are permanently HTTPS. Enabling them too early
can make unrelated subdomains unreachable.

## Verification

```sh
npm ci --ignore-scripts
npm audit --audit-level=low
npm run check
npm run data:update -- --check-only
```

No security claim is absolute. Remaining risks are primarily compromised
hosting/GitHub/domain accounts, a malicious browser extension, a previously
unknown dependency or browser vulnerability, and intentionally public iframe
embedding of `/embed.html`.

Report suspected vulnerabilities privately to
`opinionpoll.redaktion@proton.me`. Do not include sensitive personal data in a
report.
