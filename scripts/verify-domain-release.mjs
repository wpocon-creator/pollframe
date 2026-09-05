import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Agent, setGlobalDispatcher } from "undici";

// Optional DNS-over-HTTPS resolution for machines whose local resolver still
// negatively caches the newly registered domain. TLS/SNI verification stays on.
if (process.argv.includes("--public-dns")) {
  const addresses = new Map();
  for (const hostname of ["pollframe.com", "www.pollframe.com"]) {
    const response = await fetch(`https://dns.google/resolve?name=${hostname}&type=A`, { signal: AbortSignal.timeout(15000) });
    assert.ok(response.ok);
    const dns = await response.json();
    const address = dns.Answer?.find((answer) => answer.type === 1)?.data;
    assert.match(address ?? "", /^\d+\.\d+\.\d+\.\d+$/);
    addresses.set(hostname, address);
  }
  const { lookup } = await import("node:dns");
  setGlobalDispatcher(new Agent({ connect: { lookup(hostname, options, callback) {
    if (!addresses.has(hostname)) return lookup(hostname, options, callback);
    const address = addresses.get(hostname);
    if (options.all) callback(null, [{ address, family: 4 }]);
    else callback(null, address, 4);
  } } }));
}

const origin = "https://pollframe.com";
const old = "https://de.pollframe.workers.dev";
const get = (url, options = {}) => fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20000), ...options });
const config = JSON.parse(await readFile("wrangler.jsonc", "utf8"));
const main = await readFile("dist/index.html", "utf8");
const assets = [...main.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map((match) => match[1]);

for (const path of ["/", "/uk", "/es", "/de/bundestag/umfragen", "/sources"]) {
  const response = await get(origin + path);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.ok(html.includes(`rel="canonical" href="${origin}${path}"`), `${path}: canonical`);
  assert.ok(html.includes(config.vars.WEB_ANALYTICS_TOKEN), `${path}: analytics token`);
  assert.equal((html.match(/beacon\.min\.js/g) ?? []).length, 1, `${path}: duplicate/missing analytics`);
  for (const asset of assets) assert.ok(html.includes(asset), `${path}: stale HTML`);
  assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'none'/);
}
for (const from of [old, "https://www.pollframe.com", "http://pollframe.com"]) {
  const response = await get(`${from}/?region=bundestag&range=year&lang=en-GB`);
  assert.equal(response.status, 308, from);
  assert.equal(response.headers.get("location"), `${origin}/de/bundestag/umfragen?range=year&lang=en-GB`);
}
for (const path of [...assets, "/sw.js", "/manifest.webmanifest", "/pollframe-social.png"]) {
  const response = await get(origin + path);
  assert.equal(response.status, 200, path);
  const live = Buffer.from(await response.arrayBuffer());
  assert.ok(live.equals(await readFile(`dist${path}`)), `${path}: published bytes differ`);
}
for (const host of [origin, old]) {
  const response = await get(`${host}/embed.html?region=bundestag`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(!html.includes("beacon.min.js"), "embeds must stay analytics-free");
  assert.ok(!response.headers.has("x-frame-options"));
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors \*/);
  assert.match(response.headers.get("x-robots-tag"), /noindex/);
  assert.equal((await get(`${host}/api/analytics`)).status, 401);
  assert.equal((await get(`${host}/api/bug-reports`)).status, 401);
}
for (const [path, headers] of [
  ["/?view=watchlist&source=app", {}], ["/uk", { "X-Pollframe-App": "1" }],
  ["/", { "Service-Worker-Navigation-Preload": "true" }],
]) {
  const response = await get(old + path, { headers });
  assert.equal(response.status, 200, `old app: ${path}`);
  assert.ok((await response.text()).includes("4e1831c7e0754afa811e25e2a7a07943"));
}
const robots = await (await get(`${origin}/robots.txt`)).text();
assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
const sitemap = await (await get(`${origin}/sitemap.xml`)).text();
assert.ok(!sitemap.includes("workers.dev"));
assert.equal((sitemap.match(/<loc>/g) ?? []).length, 29);
const { verifyLiveRelease } = await import("./verify-live-release.mjs");
await verifyLiveRelease(origin);
console.log("Domain release verified: HTTPS, redirects, metadata, asset bytes, analytics isolation, protected APIs, old apps/embeds and live polling data.");
