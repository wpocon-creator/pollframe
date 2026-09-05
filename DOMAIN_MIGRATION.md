# Pollframe.com — migration and next steps

Updated 5 September 2026. Main address: **https://pollframe.com**.

## Technical work completed

- Connected the existing `de` Cloudflare Worker to `pollframe.com` and `www.pollframe.com`. Kept its Durable Objects, secrets and daily data pipeline; no new paid hosting plan was selected.
- Public documents on `www` and the previous `de.pollframe.workers.dev` address permanently redirect to the matching HTTPS .com page. Country, chart and language settings are preserved. Existing clean paths remain unchanged.
- Updated canonical/social metadata, the 29-entry sitemap, robots.txt, newly copied share/embed links, PNG credits and the social-preview image. Did not add new data sources, remove licence attribution or republish withheld Ipsos data.
- Retained same-origin access to old embeds, APIs, assets and installed apps. Their watchlists remain on their original origin; they are not silently copied to a new domain. Old service-worker-controlled sessions may intentionally stay on the old origin. New installations use .com.
- Installed the owner-provided .com Cloudflare Web Analytics token server-side only in public page shells. The old token stays confined to the old origin. Embeds contain neither beacon. The existing first-party aggregate store is shared, with no new identifiers or cross-domain tracking.
- Added migration regression tests and live-release checks for redirects, all sitemap routes, HTML metadata, analytics isolation, API protection, asset versions and polling snapshots. Added explicit public-DNS verification for temporarily stale local DNS caches; HTTPS verification remains enabled.

## William — the short list

### 1. Secure the domain and save the receipt

In Cloudflare, check domain renewal, the renewal payment method and the registration contact email. Enable two-factor authentication/passkeys if not already active and store recovery codes safely. Save the domain invoice with your existing expense receipts and record the payment once in your existing finances document. No second accounting system is needed for this migration.

### 2. Add Google Search Console

Open https://search.google.com/search-console → add property → **Domain** → `pollframe.com` (without `https://`). Follow Google's ownership verification. If Cloudflare authorization is offered, review and approve it yourself; otherwise add Google's exact TXT record in Cloudflare DNS. Never replace unrelated DNS records. I can help install a verification record once you have it and the necessary access.

Then submit `https://pollframe.com/sitemap.xml` under Sitemaps. Inspect the homepage, `/uk`, `/es` and one historical chart. If the previous site is already verified, submit its Change of Address to .com. For the old workers.dev address use its exact URL-prefix property, not ownership of workers.dev. If Google requires an HTML verification tag/file, give me that public verification value. I cannot perform Google account ownership actions from the deployment login.

Keep the old redirects indefinitely if practical, and at least a year for the move. Google notes that indexing/rankings can fluctuate during migrations; neither the domain nor a sitemap guarantees a ranking increase.

### 3. Update links you control

Use `https://pollframe.com` in Bluesky, email signatures and future journalist messages. Country links are `https://pollframe.com/uk` and `https://pollframe.com/es`; Germany remains the existing homepage. Old article links still work, so an urgent correction request to LN is unnecessary. Ask for a link update when convenient. No purchased backlinks or SEO subscription is needed.

Optionally add the site in Bing Webmaster Tools, using its Search Console import if offered. This is separate from Google; a browser such as Safari is not itself a search engine.

### 4. Check your actual phone once

Open .com in Safari and try a country switch, a PNG and one shared chart. Existing installed apps remain supported. If you install a second app from .com, browser storage and notification permission are separate: it will not automatically inherit the old watchlist or permissions. Do not delete the old app expecting automatic transfer.

### 5. AdSense is the next separate step — not enabled by this release

The new domain removes the workers.dev address hurdle, not Google's site review. First confirm who legally operates Pollframe and holds the AdSense account; the account holder must meet Google's age requirement. Do not assume the domain purchase means ELSTER/tax registration is complete.

When ready, add `pollframe.com` in AdSense under the correct account. Give me its public publisher/verification identifiers, not your password. I can then implement verification/ads.txt, consent-aware ad loading, appropriate placements and the matching privacy text. You handle identity, tax/payment details and contract acceptance. Before ads go live, configure the required consent solution for the selected ad modes/regions; for personalized EEA/UK/Swiss ads Google requires a certified CMP. Keep rejecting/withdrawing consent usable and keep journalist embeds ad- and analytics-free. Check the existing data-source register before enabling monetization; this domain change is not a fresh legal clearance of every source.

No paid adviser, extra domain, premium DNS or paid hosting upgrade was commissioned by this migration. Future costs depend on what you choose and actual usage; this is not a guarantee that running a business has no other obligations.

## After 7–14 days

Check .com Web Analytics, Search Console coverage and Pollframe's own aggregate report together. The old and new Cloudflare analytics properties have separate histories; Pollframe's first-party event totals continue in the same store. Counts of app openings/install events are not unique people or reliable total installations on every platform. Do not judge growth by adding incomparable request, visit and event counters.

Prioritize: indexed country/chart pages → useful journalist feedback and repeat use → modest ad experiment after setup. No automatic outreach or advertising purchase is included.

## Operator checks / rollback

Release verified: `626b1bd3-e8dc-454c-af6d-744fa73509df`, service worker `pollframe-app-v37`. Build/security/performance/data checks passed; 13 domain/SEO checks passed; five live Chromium browser cases passed (desktop and phone-sized PNG/dialog cases plus desktop offline). The desktop-only offline case is intentionally skipped in the phone project. Additional browser smoke checks covered all three countries, legacy-origin storage and successful HTTP 204 RUM responses. Physical iPhone/Safari testing is still the owner's check, not claimed here.

At verification time, public DNS and HTTPS worked but this laptop's resolver still cached the domain's earlier NXDOMAIN response. Live verification used the published public DNS addresses with normal TLS/SNI verification. DNS caches on other networks can settle at different times.

Build: `npm run build`. Migration tests: `node --test tests/domain-migration.test.mjs tests/seo-routes.test.mjs`. Live checks: `node scripts/verify-domain-release.mjs` (or `--public-dns` while a local resolver negatively caches the new domain). These also compare nine live polling files with the checked-out release; fetch fresh automated data commits before deployment if they differ.

Do not rename the `de` Worker or replace its storage bindings. Do not turn off workers.dev: installed legacy apps and old embeds deliberately still use it. If redirects require rollback, change `domainRedirect` while leaving the two custom-domain bindings and data stores intact. The regression suite describes the compatibility contract.

## Official references

- Cloudflare custom domains and managed DNS/certificates: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Cloudflare analytics tokens are domain-specific: https://developers.cloudflare.com/web-analytics/faq/
- Google site migration and redirect duration: https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- Search Console ownership verification: https://support.google.com/webmasters/answer/9008080
- AdSense account age: https://support.google.com/adsense/answer/14230
- Google's publisher consent requirements: https://support.google.com/adsense/answer/13554116
