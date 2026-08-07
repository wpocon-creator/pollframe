# Pollframe

A responsive, static-first polling dashboard for Germany and all 16 federal
states. The overview links to one shared dashboard per region; no state site is
copied or maintained separately. The default view shows the full archive as a
smoothed equal-pollster trend: at each date, the latest poll from each selected
institute within the previous 45 days receives one equal share.

## Data

Individual polls come from [dawum.de](https://dawum.de/API/) under the
[ODC Open Database License](https://opendatacommons.org/licenses/odbl/1-0/).
The included subset covers 3,154 federal and state polls from January 2017
onwards from Allensbach, Forsa, Forschungsgruppe Wahlen, INSA, Infratest
dimap, Ipsos, Verian and YouGov. Official federal election results are shown
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

`.github/workflows/update-poll-data.yml` checks DAWUM every Tuesday and Friday
at 06:17 UTC. A read-only job validates Germany and all 16 state archives and
builds the site. A separate minimal publishing job receives write access and
only commits the validated public JSON files. It creates no commit when the
selected data did not change. When Cloudflare Workers Builds is connected to the
repository, a successful data commit triggers the normal production
deployment.

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

The service worker caches the app shell and the core Germany/UK polling views.
Pages opened later are cached as they are used. If a live request fails, the UI
clearly labels the saved-data fallback; the embedded journalist views are not
cached by the app worker. A newly deployed worker waits until the reader accepts
the in-app update prompt, avoiding a mid-session reload.

When the cache strategy or pre-cached files change, bump `VERSION` in
`public/sw.js`. Validate installability, installed navigation and offline
fallbacks with `tests/pwa.spec.mjs` before deployment.

## Cloudflare Workers with Static Assets

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Node version: 22

`wrangler.jsonc` publishes the generated `dist` directory as static assets. No
server runtime or environment variables are required.

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

Run `npm run check` before every deployment. It now includes data validation, a
production build and security-policy/output checks. The full threat model,
implemented controls and required GitHub/Cloudflare account settings are in
[`SECURITY.md`](SECURITY.md).
