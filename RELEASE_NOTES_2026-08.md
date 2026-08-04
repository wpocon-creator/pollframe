# Pollframe Deutschland beta — release scope

Prepared on 2026-08-03 for the next Germany-only beta deployment.

## Public scope

- Bundestag polling and all 16 state archives
- Germany overview and customisable state-comparison map
- Historical trends, average points, events, party details and seat models
- Exact share links and sandboxed, tracking-free journalist embeds
- Published-poll table with direct DAWUM links and CSV export
- German, UK English and US English; light, dark and large-text modes

## Deliberately excluded

- EU-level and France, Austria and Poland prototypes
- German European-election archive

The excluded prototype work is preserved outside the repository at
`/home/william/Pollframe-Europe-Archive/2026-08-03/`; none of its data or map
assets is included in the production build.

## Release gate

Deploy only after `npm run check`, `npm audit --audit-level=low` and the full
Playwright browser/device matrix pass under Node 22.12.0. After deployment,
verify the live URL, response headers, social preview and one chart embed.

Release preparation result: data/build/security checks passed, npm reported
zero known vulnerabilities, and all 90 final browser/device scenarios passed.
