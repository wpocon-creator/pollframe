# Security audit — 2026-07-28

## Scope

Reviewed the complete Pollframe application and deployment surface:

- React rendering, URL/query handling, SVG/chart output, external links,
  clipboard fallback, local storage and iframe generation
- Vite production/dev configuration and generated files
- Cloudflare Pages headers, caching, CORS and framing rules
- DAWUM ingestion, generated JSON schemas and atomic writes
- npm dependency tree and lockfile integrity
- GitHub Actions permissions, supply-chain references and update publishing
- accidental secret, source-map and sensitive-file exposure

The production site is static. There are no accounts, cookies, forms, database
queries, server functions or private APIs to audit.

## Findings and remediation

| Severity | Finding | Status |
| --- | --- | --- |
| High | The updater performed npm builds while holding a repository write token. A compromised dependency could potentially push code. | Fixed: read-only build job and isolated write-only JSON publishing job. |
| Medium | `frame-ancestors *` allowed the complete site to be framed, not only journalist embeds. | Fixed: normal entry denied by CSP/X-Frame-Options; only `/embed.html` is frameable. |
| Medium | CSP did not restrict script, connection, object, form or base sources. | Fixed: default-deny CSP, Trusted Types, no inline/eval scripts and restricted browser capabilities. |
| Medium | The data updater accepted arbitrary HTTP URLs, followed redirects and had no response-size limit. | Fixed: exact HTTPS allowlist, redirects rejected, JSON content type required, 25 MiB streaming limit. |
| Medium | Remote metadata supplied URLs later rendered as links. A compromised source could replace a license link. | Fixed: source and license destinations are hardcoded trusted HTTPS URLs. |
| Low | `vite preview` listened on `0.0.0.0`, unnecessarily exposing a local server to the LAN. | Fixed: development and preview bind to `127.0.0.1`. |
| Low | Embed query lists accepted unlimited duplicate input. | Fixed: 512-character bound, allowlists, de-duplication and item limits. |
| Low | GitHub Actions used mutable major tags and package ranges were not exact. | Fixed: full verified action SHAs, exact package versions, lockfile SHA-512 checks and Dependabot. |
| Low | Generated iframes lacked sandbox/referrer restrictions. | Fixed: sandboxed iframe with no-referrer and a dedicated noindex entry. |
| Defense in depth | Security assumptions could regress silently. | Fixed: `npm run check` now validates policies, pins, sinks, link protections, source maps, sensitive output and both builds. |

No unresolved high- or medium-severity application finding was identified after
the fixes.

## Verification evidence

- `npm audit --audit-level=low`: **0 known vulnerabilities**
- Data validation: **17 regions and 3,148 polls**
- Live DAWUM `--check-only`: trusted source validated; **no files written**
- Production build: main and embed entries built without source maps
- CSP browser smoke tests: main page, chart embed and map embed rendered
- Trusted Types browser enforcement: rendered without injection-policy errors
- Negative updater test: non-allowlisted remote URL rejected before fetching
- GitHub workflow and Dependabot YAML parsed successfully
- Secret-pattern scan: no credential/private-key material found

`npm audit signatures` could not produce a clean provenance result because the
npm registry signature on `source-map-js@1.2.1` references a registry key that
expired on 2025-01-29. This is not a reported vulnerability or an integrity
mismatch. The installed package remains protected by the exact lockfile
SHA-512 integrity value; the full advisory audit reports zero vulnerabilities.

## Remaining operational risks

- Account takeover of GitHub, Cloudflare, the domain registrar or email remains
  possible unless strong 2FA/passkeys and recovery controls are enabled.
- `/embed.html` is intentionally frameable by any publisher. It contains no
  sensitive actions and generated embeds add a sandbox.
- Poll JSON is deliberately public and CORS-enabled.
- Browser extensions, compromised visitor devices, zero-day browser/dependency
  vulnerabilities and upstream data mistakes cannot be eliminated by site
  code.
- Cloudflare's deployed response headers must be externally verified after the
  first real deployment. Local and build tests cannot prove an undeployed
  platform configuration.
- The current local machine uses Node 18, which is end-of-life. Production and
  CI are declared for Node 22.12 or newer; local tooling should also be upgraded
  before doing release work.
