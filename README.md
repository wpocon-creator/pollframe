# Pollframe

Production: **https://pollframe.com**. The old workers.dev address remains for
permanent public-page redirects, existing embeds and installed-app compatibility.
See [DOMAIN_MIGRATION.md](DOMAIN_MIGRATION.md) for the launch checklist, Search
Console/AdSense account steps and `scripts/verify-domain-release.mjs` for live checks.

A responsive, static-first polling dashboard for Germany, the United Kingdom
and Spain, including German states, UK constituencies and Spanish autonomous
communities. The default polling view shows a smoothed equal-pollster trend: at
each date, the latest poll from each selected institute within the previous 45
days receives one equal share.

## Data

Individual polls come from [dawum.de](https://dawum.de/API/) under the
[ODC Open Database License](https://opendatacommons.org/licenses/odbl/1-0/).
The included subset covers 3,154 federal and state polls from January 2017
onwards from Allensbach, Forsa, Forschungsgruppe Wahlen, INSA, Infratest
dimap, Verian and YouGov. Official federal election results are shown
for 2017, 2021 and 2025.

Every chart can be shared as an exact, restorable view or embedded without
analytics. A disclosure below each chart lists the newest individual polls,
links to their DAWUM detail pages and exports the selected pollsters as CSV.

Earlier polling archives exist, but they are not imported because their
database reuse terms are not clear enough for a potentially commercial
publication.

## Events and tendencies

The chart defaults to federal elections and a small set of clearly dated,
nationwide major events. Optional categories add government and parliamentary
turning points as well as selected European and state elections. Every event
links to an official or primary source. Event markers provide context only;
the dashboard does not claim that an event caused a polling movement.

Party tendencies compare the current equal-pollster average with the same
calculation 90 days earlier. Labels are generated from fixed numerical
thresholds and do not contain political interpretation.

The overview map uses a lightweight generated snapshot rather than downloading
all 16 archives in the browser. Its current view applies the same 45-day,
equal-pollster rule independently to each state. The optional movement view
shows a linear estimate across polls published in the 180 days ending on each
state's latest poll; it is labelled as an estimate and is not a forecast.

Refresh the checked-in data snapshot with:

```sh
npm run data:update
```

## Automatic data updates

`.github/workflows/update-poll-data.yml` checks all configured sources daily at
06:17 UTC. A read-only job validates the German, UK, Spanish and approval
archives, pauses on unapproved large single-source movements and builds the
site. A separate minimal publishing job receives write access and only commits
the validated public JSON files. It creates no commit when the selected data did
not change. A successful data commit triggers the normal production deployment.

The workflow can also be run manually from GitHub's **Actions** tab. It needs
the repository setting **Workflow permissions → Read and write permissions**;
no API secret is required.

## Run locally

Double-click `Pollframe` on the desktop, or run:

```sh
npm install
npm run dev
```

Use Node 22.12.0 (recorded in `.nvmrc` and `.node-version`) for release work
and the browser suite.

## Installable web app

Pollframe is a progressive web app (PWA). Supporting browsers offer the app in
the header once their own installability checks pass; the same action and the
iPhone/iPad Safari instructions remain available in Settings. When launched
from the home screen, the single app identity is simply “Pollframe”. It uses a
compact app header and a fixed, country-aware bottom navigation, opens on the
Watchlist and restores the country used most recently.

The service worker caches the complete interface and compact core
Germany/UK/Spain summaries. When Pollframe runs as an installed app, it prepares
the national archives, German state series, Spanish regions, UK constituencies
and approval data in the background; the tested offline package remains below
10 MB. Ordinary browser use stays lighter and caches detailed pages as they are
opened. If a live request fails, the UI clearly labels the saved-data fallback;
the embedded journalist views are not cached by the app worker. Once a new app
shell has been cached successfully, the new worker activates and an already-open
controlled page reloads once. This prevents installed phone apps from remaining
on an old release.

When the cache strategy or pre-cached files change, bump `VERSION` in
`public/sw.js`. Validate installability, installed navigation and offline
fallbacks with `tests/pwa.spec.mjs` before deployment.

## Cloudflare Workers with Static Assets

- Build command: `npm run build`
- Deploy command: `npm run deploy`
- Node version: 22

`npm run deploy` deliberately rebuilds and runs the release validations before
Wrangler uploads `dist`. Do not deploy the directory directly: an old `dist`
folder can otherwise replace a newer public release.

`wrangler.jsonc` publishes the generated `dist` directory as static assets and
runs the Worker for APIs, live polling data and public HTML metadata/redirects.
Both .com custom domains are recorded there so later deploys retain them.
Bug reports are kept in the private
`BugReportStore` Durable Object. Before the first production deployment, create
the dashboard password as a Worker secret:

```sh
npx wrangler secret put BUG_REPORT_ADMIN_KEY
```

The internal report dashboard is available at `/?page=bug-reports`; its key is
kept only in the current browser tab through `sessionStorage`.

The production Worker is connected to the GitHub repository through Cloudflare
Workers Builds. A merge or direct push to `main` automatically runs the build
and deploys the result; routine releases therefore require no interactive
Cloudflare or Wrangler login. The build script validates every polling dataset
before Vite runs and validates the generated security policy and output after
the bundle is written. Cloudflare publishes nothing when one of these steps
fails.

For a normal release: run `npm run check` and the relevant browser tests, commit
the reviewed files, and push or merge them into `main`. Cloudflare reports the
result back to GitHub as the **Workers Builds: de** check. Interactive
`wrangler login` is reserved for account-level recovery or configuration
changes, not ordinary Pollframe versions.

## Security

Run `npm run check` before every deployment. It includes data validation, a
production build, security-policy/output checks and compressed-asset budgets.
Normal PRs and main pushes additionally run full core regressions in Chromium,
Firefox and WebKit plus dedicated phone/tablet geometry, PWA and visual checks
in `.github/workflows/quality.yml`. The threat model is in
[`SECURITY.md`](SECURITY.md); reuse status is tracked in
[`DATA_SOURCE_REGISTER.md`](DATA_SOURCE_REGISTER.md).
