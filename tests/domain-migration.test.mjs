import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import worker, { domainRedirect } from "../worker/index.js";
import { SITE_ORIGIN, LEGACY_SITE_ORIGIN, publicShareOrigin } from "../src/site-origin.js";

const shell = await readFile(new URL("../index.html", import.meta.url), "utf8");
const env = { ASSETS: { fetch: async () => new Response(shell, { headers: { "content-type": "text/html", etag: "original-shell" } }) } };

test("old and www public links move in one hop, keeping chart settings and fragments", async () => {
  for (const origin of [LEGACY_SITE_ORIGIN, "https://www.pollframe.com", "http://pollframe.com"]) {
    const response = await worker.fetch(new Request(`${origin}/?region=bundestag&range=year&lang=en-GB&party=spd#history`), env);
    assert.equal(response.status, 308);
    // The browser preserves fragments on real redirects; the URL helper must not discard them either.
    assert.equal(response.headers.get("location"), `${SITE_ORIGIN}/de/bundestag/umfragen?range=year&lang=en-GB&party=spd`);
    assert.match(response.headers.get("cache-control"), /no-store/);
    const target = await worker.fetch(new Request(response.headers.get("location")), env);
    assert.equal(target.status, 200);
  }
  assert.equal(domainRedirect(new Request(`${LEGACY_SITE_ORIGIN}/uk?lang=de#history`)).href, `${SITE_ORIGIN}/uk?lang=de#history`);
});

test("canonical pages do not loop; development and staging are not redirected", () => {
  for (const url of [`${SITE_ORIGIN}/uk`, "http://localhost:4174/uk", "https://pollframe-test.pollframe.workers.dev/es"]) {
    assert.equal(domainRedirect(new Request(url)), null);
  }
  assert.equal(domainRedirect(new Request(`${SITE_ORIGIN}/?next=https://evil.example`)), null);
  assert.equal(domainRedirect(new Request(`${LEGACY_SITE_ORIGIN}/?next=https://evil.example`)).origin, SITE_ORIGIN);
});

test("old app launches, shortcuts and service-worker navigation stay in their storage origin", async () => {
  for (const [path, headers] of [
    ["/?view=watchlist", {}], ["/?source=app", {}], ["/?source=shortcut&region=bundestag", {}],
    ["/", { "X-Pollframe-App": "1" }], ["/uk", { "Service-Worker-Navigation-Preload": "true" }],
  ]) {
    const request = new Request(`${LEGACY_SITE_ORIGIN}${path}`, { headers });
    assert.equal(domainRedirect(request), null);
    const response = await worker.fetch(request, env);
    if (response.status === 308) assert.equal(new URL(response.headers.get("location")).origin, LEGACY_SITE_ORIGIN);
    else assert.equal(response.status, 200);
  }
});

test("assets, old published embeds, polling downloads and API POSTs are not moved across origins", () => {
  for (const path of ["/embed.html?party=spd", "/sw.js", "/manifest.webmanifest", "/assets/main.js", "/data/bundestag.json", "/api/analytics", "/api/bug-reports"]) {
    assert.equal(domainRedirect(new Request(`${LEGACY_SITE_ORIGIN}${path}`)), null);
  }
  assert.equal(domainRedirect(new Request(`${LEGACY_SITE_ORIGIN}/`, { method: "POST" })), null);
  assert.equal(domainRedirect(new Request("https://www.pollframe.com/embed.html?party=spd")).href, `${SITE_ORIGIN}/embed.html?party=spd`);
});

test("server metadata points to .com and never exposes the old domain as canonical", async () => {
  for (const path of ["/", "/uk", "/es/encuestas", "/de/bundestag/umfragen"]) {
    const response = await worker.fetch(new Request(`${SITE_ORIGIN}${path}`), env);
    const html = await response.text();
    assert.ok(html.includes(`rel="canonical" href="${SITE_ORIGIN}${path}"`));
    assert.ok(html.includes(`property="og:image" content="${SITE_ORIGIN}/pollframe-social.png"`));
    assert.equal(response.headers.has("etag"), false, "rewritten HTML must not retain the source ETag");
  }
});

test("analytics uses only the correct domain token, and waits for configuration on .com", async () => {
  const newToken = "a".repeat(32);
  for (const [url, settings, expected] of [
    [`${LEGACY_SITE_ORIGIN}/?source=app`, {}, "4e1831c7e0754afa811e25e2a7a07943"],
    [`${SITE_ORIGIN}/`, {}, null],
    [`${SITE_ORIGIN}/`, { WEB_ANALYTICS_TOKEN: newToken }, newToken],
    [`${SITE_ORIGIN}/uk`, { WEB_ANALYTICS_TOKEN: '<script>bad</script>' }, null],
    ["http://localhost:4174/", { WEB_ANALYTICS_TOKEN: newToken }, null],
  ]) {
    const response = await worker.fetch(new Request(url), { ...env, ...settings });
    const html = await response.text();
    assert.equal(html.includes("beacon.min.js"), Boolean(expected));
    if (expected) assert.ok(html.includes(expected));
  }
  const embed = await readFile(new URL("../embed.html", import.meta.url), "utf8");
  assert.ok(!embed.includes("pollframe-web-analytics"));
});

test("same-origin protection on private APIs is still enforced on the new domain", async () => {
  for (const path of ["/api/analytics", "/api/bug-reports"]) {
    const response = await worker.fetch(new Request(`${SITE_ORIGIN}${path}`, {
      method: "POST", headers: { origin: "https://evil.example" }, body: "{}",
    }), { ...env, BUG_REPORT_ADMIN_KEY: "test-key" });
    assert.equal(response.status, 403);
  }
});

test("newly shared production links use .com; local previews remain local", () => {
  assert.equal(publicShareOrigin(LEGACY_SITE_ORIGIN), SITE_ORIGIN);
  assert.equal(publicShareOrigin("https://www.pollframe.com"), SITE_ORIGIN);
  assert.equal(publicShareOrigin("http://localhost:4174"), "http://localhost:4174");
});

test("all indexed routes and both domain bindings survive future deployments", async () => {
  const sitemap = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");
  for (const [, url] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    assert.equal(new URL(url).origin, SITE_ORIGIN);
    assert.equal((await worker.fetch(new Request(url), env)).status, 200);
  }
  const config = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  assert.equal(config.name, "de", "never rename the existing worker/storage during the migration");
  assert.equal(config.workers_dev, true);
  assert.deepEqual(config.routes.map((route) => route.pattern).sort(), ["pollframe.com", "www.pollframe.com"]);
});

test("the offline manifest helper has a cache read path, not just an install-time write", async () => {
  const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  const { runInNewContext } = await import("node:vm");
  const helpers = runInNewContext(`${source}; ({ isStaticAsset })`, {
    URL, self: { location: { origin: SITE_ORIGIN }, addEventListener() {} },
  });
  assert.equal(helpers.isStaticAsset(new URL(`${SITE_ORIGIN}/manifest-context.js`)), true);
  assert.equal(helpers.isStaticAsset(new URL(`${SITE_ORIGIN}/api/analytics`)), false);
});
