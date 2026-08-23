# Pollframe launch runbook

Status: **No-Go until the external gates below are complete.** Repository checks
are green as of 16 August 2026, but the live `workers.dev` deployment is an
older static version and does not contain the current Worker API or approval
dataset.

## 1. Responsibility and rights

- The responsible adult confirms the Impressum, privacy notice, hosting/domain
  ownership and whether Cloudflare Web Analytics will remain enabled.
- Resolve every “review required” row in `DATA_SOURCE_REGISTER.md`. For the
  Forschungsgruppe Wahlen and Ipsos historical approval tables, obtain written
  permission or a qualified reuse assessment before broad promotion. Do the
  same for current Ipsos/CIS issue snapshots where no open-database permission
  is recorded.
- Store permission correspondence privately. Record its date, scope,
  attribution requirement and reviewer in the register without publishing
  private correspondence.

## 2. Accounts and repository

- Enable passkey/hardware-key 2FA and test recovery for GitHub, Cloudflare,
  registrar and Proton Mail; keep recovery codes offline with the responsible
  adult.
- Merge only the intentionally reviewed changes to `main`. The current working
  tree contains a large feature branch and must not be deployed wholesale
  without a scoped diff review.
- Protect `main`: block force pushes and require both jobs from **Quality gate**
  plus the Cloudflare deployment check. Enable failed-workflow notifications.

## 3. Bug-report service

- Set a unique long random `BUG_REPORT_ADMIN_KEY` as a Cloudflare Worker secret.
  Do not store it in git or an issue.
- Deploy the current `wrangler.jsonc`, Worker, Durable Object migration and
  `dist` assets together.
- Production acceptance:
  - unauthenticated `GET /api/bug-reports` returns JSON `401`;
  - a same-origin report returns JSON `201` and appears once in
    `/?page=bug-reports`;
  - wrong keys fail, status changes persist and **Export JSON** downloads the
    current private report set;
  - an oversized body fails with `413`, a cross-origin POST with `403`, and the
    sixth report from one address within an hour with `429`.
- Export JSON monthly to encrypted offline storage and remove exports when no
  longer needed.

## 4. Release verification

Run with Node 22.12 or newer:

```sh
npm ci --ignore-scripts
npm audit --audit-level=low
npm run check
npm run test:browser
npx wrangler deploy --dry-run
```

For the real upload use `npm run deploy`, which repeats the production build and
validation immediately before deployment. Do not run a direct `wrangler deploy`
against an existing `dist` directory.

Then verify the live root, `/embed.html`, representative JSON, robots/sitemap,
offline app, PNG exports and share embeds. The dedicated embed must be
frameable/noindex; ordinary pages must deny framing; JSON must return JSON rather
than the SPA HTML fallback.

## 5. Human checks

- One independent numbers/source spot-check in each public country.
- A German and English language pass; Spanish/Catalan public text by a fluent
  reader where promoted.
- Physical low-end Android and iPhone/iPad checks with large text, reduced
  motion, dark mode, keyboard/screen reader where available and a slow network.
- Do not announce the launch until the live API/data checks and rights gate pass.
