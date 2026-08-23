import { readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(".");
const errors = [];
const requireCondition = (condition, message) => {
  if (!condition) errors.push(message);
};
const read = (path) => readFile(resolve(root, path), "utf8");

async function listFiles(directory) {
  const output = [];
  for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) output.push(...await listFiles(relative));
    else if (entry.isFile()) output.push(relative);
  }
  return output;
}

const [
  source,
  headers,
  workflow,
  qualityWorkflow,
  packageJson,
  packageLock,
  viteConfig,
  wranglerConfig,
  mainHtml,
  embedHtml,
  robots,
  sitemap,
  manifest,
  manifestContext,
  serviceWorker,
  workerSource,
] = await Promise.all([
  read("src/main.jsx"),
  read("public/_headers"),
  read(".github/workflows/update-poll-data.yml"),
  read(".github/workflows/quality.yml"),
  read("package.json").then(JSON.parse),
  read("package-lock.json").then(JSON.parse),
  read("vite.config.js"),
  read("wrangler.jsonc").then(JSON.parse),
  read("index.html"),
  read("embed.html"),
  read("public/robots.txt"),
  read("public/sitemap.xml"),
  read("public/manifest.webmanifest").then(JSON.parse),
  read("public/manifest-context.js"),
  read("public/sw.js"),
  read("worker/index.js"),
]);
const frontendFiles = (await listFiles("src")).filter((path) => /\.(?:js|jsx)$/.test(path));
const frontendSource = (await Promise.all(frontendFiles.map(async (path) => `\n/* ${path} */\n${await read(path)}`))).join("\n");

const forbiddenBrowserSinks = [
  ["dangerouslySetInnerHTML", /\bdangerouslySetInnerHTML\b/],
  ["innerHTML", /\.innerHTML\b/],
  ["outerHTML", /\.outerHTML\b/],
  ["insertAdjacentHTML", /\binsertAdjacentHTML\b/],
  ["eval", /(^|[^\w])eval\s*\(/m],
  ["Function constructor", /\bnew\s+Function\s*\(/],
  ["document.write", /\bdocument\.write\s*\(/],
];

const spainSummary = JSON.parse(await read("public/spain-summary.json"));
const spainRegions = JSON.parse(await read("public/data/spain-regions.json"));
requireCondition(spainSummary.issues?.items?.length >= 10, "Spain concerns updater exposes fewer than ten national concerns");
requireCondition(spainSummary.issues?.personal?.length >= 5, "Spain concerns updater exposes fewer than five personal concerns");
requireCondition(Object.keys(spainSummary.issues?.economy?.personal ?? {}).length === 7, "Spain economy display does not retain all seven answer options");
requireCondition(spainRegions.regions?.length === 19, "Spain regional updater does not cover all 19 communities and autonomous cities");
requireCondition(new Set(spainRegions.regions?.map((region) => region.slug)).size === 19, "Spain regional data contains duplicate or missing slugs");
for (const region of spainRegions.regions ?? []) {
  requireCondition(region.lastElection?.date && Object.keys(region.lastElection?.results ?? {}).length >= 2, `Spain region ${region.slug} is missing its last election result`);
  requireCondition(Object.values(region.lastElection?.seats ?? {}).reduce((sum, value) => sum + value, 0) > 0, `Spain region ${region.slug} is missing last-election seats`);
  requireCondition(!region.parties.some((party) => /^(question|x-mark|other-none)/.test(party.id)), `Spain region ${region.slug} contains a non-party answer column`);
  const pollKeys = region.polls.map((poll) => `${poll.date}|${poll.pollster}`);
  requireCondition(new Set(pollKeys).size === pollKeys.length, `Spain region ${region.slug} contains duplicated vote-intention rows`);
  if (region.coverage?.trendEligible) {
    requireCondition(region.coverage.postElectionPolls >= 8, `Spain region ${region.slug} trend has fewer than eight post-election polls`);
    requireCondition(region.coverage.activeMonthsLast12Months >= 4, `Spain region ${region.slug} trend lacks four active months`);
    requireCondition(region.coverage.maxRecentGapDays <= 120, `Spain region ${region.slug} trend contains a gap longer than four months`);
  }
}
for (const [label, pattern] of forbiddenBrowserSinks) {
  requireCondition(!pattern.test(frontendSource), `frontend uses forbidden injection sink: ${label}`);
}

for (const anchor of frontendSource.match(/<a\b[\s\S]*?>/g) ?? []) {
  if (/target="_blank"/.test(anchor)) {
    requireCondition(/rel="noreferrer"/.test(anchor), "external target=_blank link is missing rel=noreferrer");
  }
}

requireCondition(
  !/\bhttp:\/\/(?!www\.w3\.org\/2000\/svg)/.test(frontendSource),
  "frontend contains a non-HTTPS external URL",
);
requireCondition(source.includes('const EMBED_PATH = "/embed.html"'), "dedicated embed entry is not enforced");
requireCondition(source.includes('sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"'), "generated embeds are not sandboxed");
requireCondition(source.includes('referrerpolicy="no-referrer"'), "generated embeds do not suppress referrers");
requireCondition(!/sandbox="[^"]*allow-(?:forms|top-navigation|downloads)[^"]*"/.test(frontendSource), "generated embed sandbox grants an unnecessary high-risk capability");

const requiredCspDirectives = [
  "default-src 'none'",
  "base-uri 'none'",
  "connect-src 'self'",
  "object-src 'none'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src-elem 'self'",
  "style-src-attr 'unsafe-inline'",
  "worker-src 'self'",
  "form-action 'none'",
  "require-trusted-types-for 'script'",
  "trusted-types pollframe-sw",
];
for (const directive of requiredCspDirectives) {
  requireCondition(headers.includes(directive), `CSP is missing: ${directive}`);
}
requireCondition(!/script-src[^;\n]*'unsafe-(?:inline|eval)'/.test(headers), "CSP permits unsafe inline/eval scripts");
requireCondition(!headers.includes("worker-src 'none'"), "CSP blocks the Pollframe service worker");
requireCondition(frontendSource.includes('createPolicy("pollframe-sw"'), "service worker does not use the CSP-approved Trusted Types policy");
requireCondition(frontendSource.includes('register(trustedServiceWorkerUrl("/sw.js")'), "service worker registration bypasses the TrustedScriptURL helper");
requireCondition(headers.includes("X-Frame-Options: DENY"), "main pages are not protected by X-Frame-Options");
requireCondition(headers.includes("! X-Frame-Options"), "embed page does not detach X-Frame-Options");
requireCondition(headers.includes("Content-Security-Policy: frame-ancestors 'none'"), "main entry lacks frame-ancestors 'none'");
requireCondition(headers.includes("Content-Security-Policy: frame-ancestors *"), "embed entry does not allow journalist framing");
requireCondition(headers.includes("Strict-Transport-Security: max-age=31536000"), "HSTS is missing");
for (const line of headers.split("\n")) {
  requireCondition(line.length <= 2_000, "_headers contains a line above Cloudflare's 2,000-character limit");
}

const workflows = `${workflow}\n${qualityWorkflow}`;
const actionReferences = [...workflows.matchAll(/\buses:\s*[^@\s]+@([^\s#]+)/g)];
requireCondition(actionReferences.length > 0, "workflow contains no pinned action references");
for (const reference of actionReferences) {
  requireCondition(/^[a-f0-9]{40}$/.test(reference[1]), `workflow action is not pinned to a full SHA: ${reference[1]}`);
}
requireCondition(workflows.includes("npm ci --ignore-scripts"), "workflow install scripts are not disabled");
requireCondition(workflows.includes("npm audit --audit-level=low"), "workflow dependency audit is missing");
requireCondition(workflows.includes("set -euo pipefail"), "workflow shell hardening is missing");
requireCondition(qualityWorkflow.includes("tests/accessibility.spec.mjs") && qualityWorkflow.includes("tests/integration.spec.mjs") && qualityWorkflow.includes("tests/mobile-layout.spec.mjs"), "pull requests do not run accessibility, core and mobile regression gates");
requireCondition(qualityWorkflow.includes("chromium firefox webkit"), "quality gate does not install all supported browser engines");
requireCondition(workflow.includes("npm run data:review"), "scheduled updates do not pause on unapproved large data movements");

requireCondition(packageJson.private === true, "package must remain private to prevent accidental npm publication");
requireCondition(packageJson.scripts?.preview === "vite preview --host 127.0.0.1", "preview server is exposed beyond localhost");
requireCondition(packageJson.engines?.node === ">=22.12", "supported Node security baseline is not declared");
for (const [name, version] of Object.entries({
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
})) {
  requireCondition(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version), `${name} is not pinned to an exact version`);
  requireCondition(packageLock.packages?.[""]?.dependencies?.[name] === version
    || packageLock.packages?.[""]?.devDependencies?.[name] === version, `${name} differs between package.json and lockfile`);
}
for (const [path, entry] of Object.entries(packageLock.packages ?? {})) {
  if (!path || entry.link) continue;
  requireCondition(
    typeof entry.integrity === "string" && entry.integrity.startsWith("sha512-"),
    `${path} lacks a SHA-512 lockfile integrity value`,
  );
  requireCondition(
    typeof entry.resolved !== "string" || entry.resolved.startsWith("https://registry.npmjs.org/"),
    `${path} resolves outside the official npm registry`,
  );
}
requireCondition(viteConfig.includes('host: "127.0.0.1"'), "Vite server is not restricted to localhost");
requireCondition(viteConfig.includes("sourcemap: false"), "production source maps are not explicitly disabled");
requireCondition(wranglerConfig.assets?.directory === "./dist", "Cloudflare does not deploy the checked production directory");
requireCondition(wranglerConfig.assets?.html_handling === "none", "Cloudflare HTML rewriting would break the dedicated embed path");
requireCondition(wranglerConfig.assets?.not_found_handling === "single-page-application", "Cloudflare does not serve the app shell at the site root");
requireCondition(wranglerConfig.preview_urls === false, "Cloudflare version preview URLs are publicly enabled");
requireCondition(wranglerConfig.main === "worker/index.js", "Cloudflare API Worker entry point is missing or unexpected");
requireCondition(wranglerConfig.assets?.binding === "ASSETS", "Cloudflare static-assets binding is missing");
requireCondition(
  Array.isArray(wranglerConfig.assets?.run_worker_first)
    && ["/api/*", "/poll-data.json", "/regions.json", "/state-map-data.json", "/uk-summary.json", "/spain-summary.json", "/data/*"]
      .every((route) => wranglerConfig.assets.run_worker_first.includes(route)),
  "Cloudflare Worker must run before the API and public polling-data routes",
);
requireCondition(workerSource.includes('const LIVE_DATA_BASE = "https://raw.githubusercontent.com/wpocon-creator/pollframe/main/public"'), "live polling data is not pinned to Pollframe's own public main branch");
requireCondition(workerSource.includes("LIVE_DATA_MAX_BYTES") && workerSource.includes("x-pollframe-data-release") && workerSource.includes('headers.set("x-robots-tag", "noindex, noarchive")'), "live polling-data proxy lacks size, release or search-index safeguards");
requireCondition(
  wranglerConfig.durable_objects?.bindings?.some((binding) => binding.name === "BUG_REPORT_STORE" && binding.class_name === "BugReportStore"),
  "private bug-report Durable Object binding is missing",
);
requireCondition(
  wranglerConfig.migrations?.some((migration) => migration.new_sqlite_classes?.includes("BugReportStore")),
  "bug-report Durable Object migration is missing",
);
requireCondition(wranglerConfig.name === "de", "Cloudflare Worker name does not match de.pollframe.workers.dev");
requireCondition(mainHtml.includes('name="referrer" content="no-referrer"'), "main HTML lacks a no-referrer fallback");
requireCondition(mainHtml.includes('rel="canonical" href="https://de.pollframe.workers.dev/"'), "main HTML lacks the production canonical URL");
requireCondition(mainHtml.includes('<script src="/manifest-context.js"></script>'), "main HTML lacks the app manifest loader");
requireCondition(mainHtml.includes('rel="apple-touch-icon" href="/apple-touch-icon.png"'), "main HTML lacks the iOS app icon");
requireCondition(mainHtml.includes('name="apple-mobile-web-app-capable" content="yes"'), "main HTML lacks iOS standalone support");
requireCondition(mainHtml.includes("<noscript>") && mainHtml.includes("/?region=bundestag") && mainHtml.includes("/?region=uk-westminster") && mainHtml.includes("/?region=spain-congress"), "main HTML lacks a crawlable no-JavaScript navigation fallback");
requireCondition(mainHtml.includes('property="og:title"'), "main HTML lacks Open Graph metadata");
requireCondition(
  mainHtml.includes('property="og:image" content="https://de.pollframe.workers.dev/pollframe-social.png"')
    && mainHtml.includes('property="og:image:width" content="1200"')
    && mainHtml.includes('property="og:image:height" content="630"')
    && mainHtml.includes('name="twitter:card" content="summary_large_image"'),
  "main HTML lacks the production social-preview metadata",
);
requireCondition(
  mainHtml.includes("https://static.cloudflareinsights.com/beacon.min.js")
    && mainHtml.includes('4e1831c7e0754afa811e25e2a7a07943'),
  "main HTML lacks the configured Cloudflare Web Analytics beacon",
);
requireCondition(embedHtml.includes('name="robots" content="noindex, nofollow, noarchive"'), "embed HTML lacks noindex");
requireCondition(!embedHtml.includes("cloudflareinsights.com"), "journalist embed unexpectedly contains analytics");
requireCondition(
  headers.includes("script-src 'self' https://static.cloudflareinsights.com"),
  "CSP does not permit the Cloudflare Web Analytics beacon",
);
requireCondition(
  headers.includes("connect-src 'self' https://cloudflareinsights.com"),
  "CSP does not permit Cloudflare Web Analytics reports",
);
requireCondition(robots.includes("Disallow: /embed.html"), "robots.txt does not exclude the embed entry");
requireCondition(robots.includes("Disallow: /api/"), "robots.txt does not exclude private and transactional API routes");
requireCondition(
  robots.includes("Sitemap: https://de.pollframe.workers.dev/sitemap.xml"),
  "robots.txt does not advertise the production sitemap",
);
requireCondition(headers.includes("X-Robots-Tag: noindex, noarchive"), "raw JSON responses are not marked noindex");
requireCondition(headers.includes("/sw.js") && headers.includes("Cache-Control: no-cache, no-store, must-revalidate"), "service worker is not served with a no-store update policy");
requireCondition(manifestContext.includes("/manifest.webmanifest") && !manifestContext.includes("manifest-uk.webmanifest") && !manifestContext.includes("manifest-de.webmanifest"), "manifest loader does not use the unified Pollframe app identity");
requireCondition(manifest.id === "/" && manifest.name === "Pollframe" && manifest.start_url === "/?view=watchlist&source=app" && manifest.scope === "/", "Pollframe app identity, name, start URL or scope is invalid");
requireCondition(manifest.display === "standalone", "Pollframe app manifest does not request standalone display");
requireCondition(manifest.icons?.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"), "Pollframe app manifest lacks a maskable 512px icon");
requireCondition(!/importScripts\s*\(/.test(serviceWorker), "service worker imports uncontrolled scripts");
requireCondition(
  /addEventListener\("install"[\s\S]*?installAppShell\(\)\.then\(\(\) => self\.skipWaiting\(\)\)/.test(serviceWorker),
  "service worker updates can remain stuck waiting behind an old mobile app shell",
);
requireCondition(serviceWorker.includes("PREFETCH_OFFLINE_APP") && serviceWorker.includes("__pollframe-offline-ready__"), "installed app does not prepare its national sections for offline use");
requireCondition(serviceWorker.includes('url.origin !== self.location.origin'), "service worker does not restrict interception to the Pollframe origin");
requireCondition(serviceWorker.includes('url.pathname === "/embed.html"'), "service worker does not exclude journalist embeds");
requireCondition(serviceWorker.includes("POLLFRAME_CACHED_DATA"), "service worker does not disclose cached-data fallback to the UI");

const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
requireCondition(sitemapUrls.length === 29, `sitemap contains ${sitemapUrls.length} URLs instead of 29`);
requireCondition(sitemapUrls.includes("https://de.pollframe.workers.dev/?view=approval&amp;country=de"), "sitemap omits the German government and leader evaluation page");
requireCondition(!sitemapUrls.includes("https://de.pollframe.workers.dev/?view=approval&amp;country=uk"), "sitemap still exposes the withheld UK approval page");
requireCondition(sitemapUrls.includes("https://de.pollframe.workers.dev/?page=redaktion"), "sitemap omits the public editorial standards and correction log");
requireCondition(!sitemapUrls.some((url) => url.includes("view=spain-region")), "sitemap exposes Spanish regional compilations before per-source rights review");
requireCondition((sitemap.match(/<lastmod>2026-08-22<\/lastmod>/g) ?? []).length === sitemapUrls.length, "sitemap last-modified dates are incomplete");
requireCondition(new Set(sitemapUrls).size === sitemapUrls.length, "sitemap contains duplicate URLs");
requireCondition(
  sitemapUrls.every((url) => url.startsWith("https://de.pollframe.workers.dev/")),
  "sitemap contains a URL outside the production origin",
);
requireCondition(!sitemap.includes("/embed.html"), "sitemap exposes the noindex embed entry");
requireCondition(
  !sitemapUrls.some((url) => url.includes("?view=europe")),
  "sitemap exposes the paused Europe overview",
);
requireCondition(
  sitemapUrls.includes("https://de.pollframe.workers.dev/"),
  "sitemap is missing the German overview root",
);
requireCondition(
  sitemapUrls.includes("https://de.pollframe.workers.dev/?view=countries"),
  "sitemap is missing the country selector",
);
requireCondition(
  !sitemapUrls.some((url) => url.includes("?region=europawahl-deutschland")),
  "sitemap exposes the paused German European-election archive",
);
requireCondition(
  sitemapUrls.filter((url) => url.includes("?country=")).every((url) => [
    "https://de.pollframe.workers.dev/?country=uk",
    "https://de.pollframe.workers.dev/?country=es",
    "https://de.pollframe.workers.dev/?country=es&amp;view=spain-issues",
  ].includes(url) || /^https:\/\/de\.pollframe\.workers\.dev\/\?country=es&amp;view=spain-region&amp;area=[a-z-]+$/.test(url)),
  "sitemap exposes an unfinished country route",
);
requireCondition(
  sitemapUrls.includes("https://de.pollframe.workers.dev/?region=spain-congress"),
  "sitemap is missing the Spanish Congress archive",
);

const distInfo = await stat(resolve(root, "dist")).catch(() => null);
requireCondition(distInfo?.isDirectory(), "dist is missing; build before running the security check");
if (distInfo?.isDirectory()) {
  const distFiles = await listFiles("dist");
  requireCondition(distFiles.includes("dist/index.html"), "production index entry is missing");
  requireCondition(distFiles.includes("dist/embed.html"), "production embed entry is missing");
  requireCondition(distFiles.includes("dist/_headers"), "Cloudflare headers are missing from the production output");
  requireCondition(distFiles.includes("dist/robots.txt"), "production robots.txt is missing");
  requireCondition(distFiles.includes("dist/sitemap.xml"), "production sitemap.xml is missing");
  requireCondition(distFiles.includes("dist/pollframe-social.png"), "production social-preview image is missing");
  for (const appFile of [
    "dist/manifest.webmanifest",
    "dist/manifest-context.js",
    "dist/sw.js",
    "dist/apple-touch-icon.png",
    "dist/pollframe-app-192.png",
    "dist/pollframe-app-512.png",
    "dist/pollframe-maskable-512.png",
  ]) requireCondition(distFiles.includes(appFile), `production app asset is missing: ${appFile}`);
  requireCondition(
    !distFiles.some((path) => /(?:country-region-map-(?:at|fr|pl)|europawahl-deutschland)/.test(path)),
    "production output still contains paused Europe-expansion data",
  );
  requireCondition(!distFiles.some((path) => path.endsWith(".map")), "production output contains source maps");
  requireCondition(
    !distFiles.some((path) => /(?:^|\/)(?:\.env|.*\.(?:pem|key|p12|pfx))$/i.test(path)),
    "production output contains a potentially sensitive file",
  );
  const builtEntries = await Promise.all([
    read("dist/index.html"),
    read("dist/embed.html"),
  ]);
  for (const [index, html] of builtEntries.entries()) {
    requireCondition(!html.includes("/src/"), `${index ? "embed" : "main"} production HTML references source files`);
  }
  requireCondition(
    builtEntries[0].includes("https://static.cloudflareinsights.com/beacon.min.js"),
    "main production HTML lacks Web Analytics",
  );
  requireCondition(!builtEntries[1].includes("cloudflareinsights.com"), "production embed contains Web Analytics");
  const socialPng = await readFile(resolve(root, "dist/pollframe-social.png"));
  requireCondition(
    socialPng.length > 24
      && socialPng.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      && socialPng.readUInt32BE(16) === 1200
      && socialPng.readUInt32BE(20) === 630,
    "production social-preview image is not a valid 1200×630 PNG",
  );
}

if (errors.length) {
  throw new Error(`Security validation failed:\n- ${errors.join("\n- ")}`);
}
console.log("Security validation passed: browser policy, embed isolation, Cloudflare routing, workflow pins, and build output");
