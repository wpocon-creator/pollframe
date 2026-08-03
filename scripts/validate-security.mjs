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
  packageJson,
  packageLock,
  viteConfig,
  wranglerConfig,
  mainHtml,
  embedHtml,
  robots,
  sitemap,
] = await Promise.all([
  read("src/main.jsx"),
  read("public/_headers"),
  read(".github/workflows/update-poll-data.yml"),
  read("package.json").then(JSON.parse),
  read("package-lock.json").then(JSON.parse),
  read("vite.config.js"),
  read("wrangler.jsonc").then(JSON.parse),
  read("index.html"),
  read("embed.html"),
  read("public/robots.txt"),
  read("public/sitemap.xml"),
]);

const forbiddenBrowserSinks = [
  ["dangerouslySetInnerHTML", /\bdangerouslySetInnerHTML\b/],
  ["innerHTML", /\.innerHTML\b/],
  ["outerHTML", /\.outerHTML\b/],
  ["insertAdjacentHTML", /\binsertAdjacentHTML\b/],
  ["eval", /(^|[^\w])eval\s*\(/m],
  ["Function constructor", /\bnew\s+Function\s*\(/],
  ["document.write", /\bdocument\.write\s*\(/],
];
for (const [label, pattern] of forbiddenBrowserSinks) {
  requireCondition(!pattern.test(source), `frontend uses forbidden injection sink: ${label}`);
}

for (const anchor of source.match(/<a\b[\s\S]*?>/g) ?? []) {
  if (/target="_blank"/.test(anchor)) {
    requireCondition(/rel="noreferrer"/.test(anchor), "external target=_blank link is missing rel=noreferrer");
  }
}

requireCondition(!/\bhttp:\/\//.test(source), "frontend contains a non-HTTPS external URL");
requireCondition(source.includes('const EMBED_PATH = "/embed.html"'), "dedicated embed entry is not enforced");
requireCondition(source.includes('sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"'), "generated embeds are not sandboxed");
requireCondition(source.includes('referrerpolicy="no-referrer"'), "generated embeds do not suppress referrers");

const requiredCspDirectives = [
  "default-src 'none'",
  "base-uri 'none'",
  "connect-src 'self'",
  "object-src 'none'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src-elem 'self'",
  "style-src-attr 'unsafe-inline'",
  "form-action 'none'",
  "require-trusted-types-for 'script'",
  "trusted-types 'none'",
];
for (const directive of requiredCspDirectives) {
  requireCondition(headers.includes(directive), `CSP is missing: ${directive}`);
}
requireCondition(!/script-src[^;\n]*'unsafe-(?:inline|eval)'/.test(headers), "CSP permits unsafe inline/eval scripts");
requireCondition(headers.includes("X-Frame-Options: DENY"), "main pages are not protected by X-Frame-Options");
requireCondition(headers.includes("! X-Frame-Options"), "embed page does not detach X-Frame-Options");
requireCondition(headers.includes("Content-Security-Policy: frame-ancestors 'none'"), "main entry lacks frame-ancestors 'none'");
requireCondition(headers.includes("Content-Security-Policy: frame-ancestors *"), "embed entry does not allow journalist framing");
requireCondition(headers.includes("Strict-Transport-Security: max-age=31536000"), "HSTS is missing");
for (const line of headers.split("\n")) {
  requireCondition(line.length <= 2_000, "_headers contains a line above Cloudflare's 2,000-character limit");
}

const actionReferences = [...workflow.matchAll(/\buses:\s*[^@\s]+@([^\s#]+)/g)];
requireCondition(actionReferences.length > 0, "workflow contains no pinned action references");
for (const reference of actionReferences) {
  requireCondition(/^[a-f0-9]{40}$/.test(reference[1]), `workflow action is not pinned to a full SHA: ${reference[1]}`);
}
requireCondition(workflow.includes("npm ci --ignore-scripts"), "workflow install scripts are not disabled");
requireCondition(workflow.includes("npm audit --audit-level=low"), "workflow dependency audit is missing");
requireCondition(workflow.includes("set -euo pipefail"), "workflow shell hardening is missing");

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
requireCondition(!wranglerConfig.main, "unexpected Worker runtime code is configured");
requireCondition(wranglerConfig.name === "de", "Cloudflare Worker name does not match de.pollframe.workers.dev");
requireCondition(mainHtml.includes('name="referrer" content="no-referrer"'), "main HTML lacks a no-referrer fallback");
requireCondition(mainHtml.includes('rel="canonical" href="https://de.pollframe.workers.dev/"'), "main HTML lacks the production canonical URL");
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
requireCondition(
  robots.includes("Sitemap: https://de.pollframe.workers.dev/sitemap.xml"),
  "robots.txt does not advertise the production sitemap",
);
requireCondition(headers.includes("X-Robots-Tag: noindex, noarchive"), "raw JSON responses are not marked noindex");

const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
requireCondition(sitemapUrls.length === 21, `sitemap contains ${sitemapUrls.length} URLs instead of 21`);
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
  sitemapUrls.includes("https://de.pollframe.workers.dev/?country=de"),
  "sitemap is missing the German country overview",
);
requireCondition(
  !sitemapUrls.some((url) => url.includes("?region=europawahl-deutschland")),
  "sitemap exposes the paused German European-election archive",
);
requireCondition(
  !sitemapUrls.some((url) => url.includes("?country=") && !url.endsWith("?country=de")),
  "sitemap exposes an unfinished noindex country prototype",
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
