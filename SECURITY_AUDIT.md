# Security audit — 16 August 2026

## Scope and result

Reviewed the React application, URL handling, export/embed paths, local PWA
storage, service worker, public datasets, update pipeline, GitHub Actions,
Cloudflare headers and the Worker/Durable Object bug-report API.

No unresolved high-severity code finding was found. The site must not yet be
described as independently audited or absolutely secure. Account configuration,
the production bug-report secret and external rights/privacy review cannot be
verified from this repository.

## Findings

| Severity | Finding | Status |
| --- | --- | --- |
| High | Data build previously held repository write permission. | Fixed: isolated read-only update and minimal publishing jobs. |
| Medium | Normal pages were frameable and CSP was permissive. | Fixed: main pages deny framing; only sandboxed `/embed.html` is frameable. |
| Medium | Upstream values could be structurally valid but anomalous. | Fixed: deterministic large-movement review gate added before automated publication. |
| Medium | Normal code changes had no mandatory multi-browser CI workflow. | Fixed in repository: quality workflow covers build, audit and all configured browser/device profiles; branch protection still must require it. |
| Medium | Security documents incorrectly claimed there was no backend or private API. | Fixed: Worker, Durable Object, dashboard, retention and rate limiting are now in scope. |
| Low | Dev/preview servers could be exposed to the LAN. | Fixed: loopback-only. |
| Low | Actions and npm versions could float. | Fixed: full action SHAs, exact npm versions and lockfile integrity checks. |
| Defence in depth | Performance or policy regressions had no hard budget. | Fixed: production check now enforces CSP/build controls and gzip budgets. |

## Current evidence

- `npm audit --audit-level=low`: zero known advisories at the checked snapshot.
- Dataset validator covers 17 German regions, 8,082 UK records, 3,278 Spanish
  polls, approval series, regional election data, dates, totals and sources.
- Live root response checked on 16 August 2026: HTTPS 200, HSTS, default-deny
  CSP, `frame-ancestors 'none'`, DENY framing, no-referrer, nosniff, COOP and
  restrictive Permissions Policy were present.
- The dedicated embed is built separately, noindexed, excluded from analytics
  and deliberately frameable.
- The API uses bounded same-origin JSON writes, no CORS opt-in, secret-salted
  rate identifiers, a private dashboard key and automatic retention cleanup.

## Residual and operational risks

- GitHub, Cloudflare, registrar and email passkeys/recovery cannot be checked
  from code. Branch protection and failure notifications also require dashboard
  changes.
- The live bug-report secret and backup/export routine require an authorised
  production test.
- Cloudflare Web Analytics and non-open-licensed source reuse require a final
  responsible-adult or qualified privacy/rights review before promotion.
- The current `workers.dev` address is technically valid but is not a durable
  final editorial domain. HSTS preload should wait for that domain.
- A real low-end Android and physical iPhone/iPad check remains necessary even
  after emulated Chromium/WebKit tests.
