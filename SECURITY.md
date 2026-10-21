# Security and maintenance

Reviewed 21 October 2026. Accounts are now public. This current section
supersedes the historical September review below.

## Maintenance cadence

- Cloudflare patches the Workers platform; Pollframe remains responsible for
  application dependencies, account settings and tested releases.
- Dependabot checks npm and pinned GitHub Actions daily. Vulnerability alerts
  and security-update proposals are enabled. No automatic merge or deployment.
- `Daily security maintenance` runs at 06:43 UTC, subject to GitHub scheduling
  delays. It audits both main and the exact published dependency lockfile,
  verifies public security headers/private-route boundaries, and runs isolated
  account/security tests. It has no production credentials or deployment rights.
- `/release.json` identifies the published Git commit, dependency lockfile hash
  and application source digest. Poll snapshots are excluded from this digest
  so normal four-hour data updates do not produce false source-drift alarms.
- A separate issue-write-only job maintains one owner-mentioned alert when
  checks fail, updates it only when findings change, and closes it on recovery.
  It uses free GitHub notifications, not Resend or paid services. Personal
  GitHub notification preferences determine actual email delivery.
- Missing advisory responses or unverifiable release identity fail the check;
  they are never reported as zero vulnerabilities. This is daily monitoring,
  not continuous intrusion detection or a guaranteed response service.

## Release discipline

Keep application source, lockfiles, migrations and tests in the repository
before deployment. Build from the tested commit and publish its release
identity. Keep automatic Cloudflare Git builds disabled: an unreviewed branch
must not overwrite a manually verified release.

Run the dependency audit, security unit tests, production build, isolated
account browser workflows and `npm run accounts:preflight -- --remote --ready`.
Record the previous Worker version for rollback. Dependency releases must not
automatically migrate the database. Deploy only after checks pass; then run
`node scripts/security-monitor.mjs` and read-only live browser tests. Run the
daily workflow manually after the first release.

Review relevant actively exploited vulnerabilities urgently; aim to patch or
disable the affected feature the same day when feasible. Review other updates
at least weekly. These are maintenance targets, not an automatic response SLA.

## Current account protections

Password-first login, verified-email registration, optional authenticator 2FA,
secure HttpOnly cookies, same-origin request checks, per-owner data access,
step-up for sensitive settings, and atomic email/network attempt budgets.
Political-result storage needs separate consent and application-layer
encryption. Test mail/outboxes/databases are isolated from production.

The daily public probes are unauthenticated GET requests: no registrations,
emails, feedback writes or user-record reads. Request-log capture remains off.
Neither an audit nor these tests prove the absence of unpublished flaws or
custom logic bugs. Independent reviews remain useful after account changes.
Vulnerabilities should be reported privately to william@pollframe.com, without
passwords, recovery codes or other people's personal information.

## Historical September review (superseded where noted above)

Current review: [13 September 2026 security changes](SECURITY_REVIEW_2026-09-13.md).
The API now has shared response headers, strict routing, streaming body limits,
transactional report/admin throttling and a Cloudflare burst-limit binding.
Treat the dashboard URL as discoverable, never as an authentication mechanism.

Pollframe is a mostly static, public-data application delivered by a narrowly
scoped Cloudflare Worker. It now has visitor accounts, but no payments, advertising,
comment system or server-side contact form. Public write APIs accept anonymous
bug reports and predefined aggregate analytics events; reports are stored in a private
Cloudflare Durable Object. The contact assistant remains local and only creates
a `mailto:` link.

## Implemented controls

- The normal site uses a default-deny Content Security Policy, Trusted Types,
  no production source maps, restrictive browser permissions and no external
  fonts. Only Cloudflare Web Analytics and the voluntary Postcodes.io lookup
  are allowed third-party browser connections.
- The normal site cannot be framed. Journalist embeds use a separate noindex,
  no-referrer entry and generated iframes are sandboxed.
- The Worker runs before API, public-data and selected document routes. Bug-report writes
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
  Chromium, Firefox, WebKit, phone and tablet regression matrix. Daily checks
  are separate and do not run that full visual matrix.
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
be sent privately to `william@pollframe.com`; sensitive personal data
should not be included.
