import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { mock } from "node:test";
import { load } from "cheerio";
import worker from "../worker/index.js";
import { localizedCanonical, pageLocale, languageAlternates } from "../src/seo-locale.js";

const shell = await readFile(new URL("../index.html", import.meta.url), "utf8");
const data = JSON.parse(await readFile(new URL("../public/data/seo-polls.json", import.meta.url), "utf8"));
const sitemap = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");
const fetchMock = mock.method(globalThis, "fetch", async () => Response.json(data));
const env = { ASSETS: { fetch: async (request) => {
  const path = new URL(request.url).pathname;
  if (path === "/data/seo-polls.json") return Response.json(data);
  if (path === "/index.html") return new Response(shell, { headers: { "content-type": "text/html" } });
  return new Response("Not found", { status: 404 });
} } };

test("all 29 sitemap pages serve reciprocal language links and matching initial HTML in all four languages", async () => {
  for (const [, address] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const path = new URL(address).pathname;
    for (const locale of ["de", "en-GB", "en-US", "es"]) {
      const response = await worker.fetch(new Request(`${address}?lang=${locale}&range=year`), env);
      assert.equal(response.status, 200);
      const $ = load(await response.text());
      assert.equal($("html").attr("lang"), locale);
      assert.equal(response.headers.get("content-language"), locale);
      assert.equal($('link[rel="canonical"]').attr("href"), localizedCanonical(path, locale));
      for (const variant of languageAlternates(path)) assert.equal($(`link[hreflang="${variant.locale}"]`).attr("href"), variant.href);
      assert.equal($('link[hreflang="x-default"]').length, 1);
      assert.equal($("#root main h1").length, 1);
      assert.equal($("noscript").length, 0, "do not publish different hidden SEO text");
      assert.equal($("#root main nav a").length, 4);
    }
  }
});

test("unrendered HTML contains the original latest poll, dates, sample, party values and licences", async () => {
  for (const [path, slug, locale] of [["/de/bundestag/umfragen", "bundestag", "de"], ["/uk", "uk-westminster", "en-GB"], ["/es/encuestas", "spain-congress", "es"], ["/de/landtagswahl/berlin/umfragen", "berlin", "de"]]) {
    const response = await worker.fetch(new Request(`https://pollframe.com${path}`), env);
    const $ = load(await response.text());
    const snapshot = data.snapshots[slug];
    assert.equal($("time").attr("datetime"), snapshot.date);
    assert.ok($("main").text().includes(snapshot.pollster));
    assert.equal($("tbody tr").length, snapshot.results.length);
    const expected = snapshot.results.map(({ value }) => `${new Intl.NumberFormat(locale === "de" ? "de-DE" : locale, { maximumFractionDigits: 2 }).format(value)}%`);
    assert.deepEqual($("tbody td").map((_, el) => $(el).text()).get(), expected);
    assert.ok($("main a").toArray().some((el) => $(el).attr("href") === snapshot.licenseUrl));
  }
});

test("the projection selects original polls rather than synthetic averages and keeps source metadata", async () => {
  assert.equal(Object.keys(data.snapshots).length, 19);
  for (const [slug, snapshot] of Object.entries(data.snapshots)) {
    const archive = JSON.parse(await readFile(new URL(`../public/data/${slug}.json`, import.meta.url), "utf8"));
    const latest = archive.polls.filter((poll) => !poll.synthetic && poll.pollster !== "9000").reduce((a, b) => b.date >= a.date ? b : a);
    assert.equal(snapshot.date, latest.date);
    assert.equal(snapshot.pollster, archive.pollsters[latest.pollster]);
    assert.deepEqual(Object.fromEntries(snapshot.results.map(({ id, value }) => [id, value])), latest.results);
    assert.equal(snapshot.sample, latest.sample ?? null);
    assert.ok(snapshot.license && snapshot.licenseUrl);
  }
});

test("GitHub failure falls back to the deployed projection, not an invented current date", async () => {
  fetchMock.mock.mockImplementation(async () => { throw new Error("upstream offline"); });
  try {
    const response = await worker.fetch(new Request("https://pollframe.com/de/bundestag/umfragen"), env);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes(`datetime="${data.snapshots.bundestag.date}"`));
  } finally { fetchMock.mock.mockImplementation(async () => Response.json(data)); }
});

test("no-JavaScript legal, Watchlist and private dashboard requests are not promoted as polling landing pages", async () => {
  for (const path of ["/?page=datenschutz", "/?view=watchlist", "/pf-ops/3f592c524cff69071b258ce63776e793/reports"]) {
    const response = await worker.fetch(new Request(`https://pollframe.com${path}`), env);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("x-robots-tag"), /noindex/);
    assert.ok(!(await response.text()).includes("<tbody>"));
  }
});

test("unknown paths, unknown states and missing files remain 404 without breaking known country pages", async () => {
  for (const path of ["/not-a-page", "/uk/no-such-page", "/de/landtagswahl/nowhere/umfragen", "/missing.png"]) {
    assert.equal((await worker.fetch(new Request(`https://pollframe.com${path}`), env)).status, 404);
  }
  const config = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  assert.equal(config.assets.not_found_handling, "404-page");
  assert.ok(config.assets.run_worker_first.includes("/pf-ops/*"));
});

test("search favicon is a real square raster image and conventional ICO, with stable site identity", async () => {
  const $ = load(shell);
  assert.equal($('link[rel="icon"][type="image/png"]').attr("sizes"), "192x192");
  const image = await readFile(new URL("../public/pollframe-app-v2-192.png", import.meta.url));
  assert.equal(image.readUInt32BE(16), 192);
  assert.equal(image.readUInt32BE(20), 192);
  const ico = await readFile(new URL("../public/favicon.ico", import.meta.url));
  assert.equal(ico.readUInt16LE(2), 1);
  assert.ok(ico.subarray(22).equals(image));
  assert.deepEqual(JSON.parse($('script[type="application/ld+json"]').text()), {
    "@context": "https://schema.org", "@type": "WebSite", name: "Pollframe", alternateName: "pollframe.com", url: "https://pollframe.com/",
  });
});

test("unsupported languages and hostile query text cannot enter metadata", async () => {
  assert.equal(pageLocale(new URL("https://pollframe.com/es?lang=fr")), "es");
  const response = await worker.fetch(new Request("https://pollframe.com/uk?lang=%22%3E%3Cscript%3Ebad"), env);
  const html = await response.text();
  assert.ok(!html.includes("<script>bad"));
  assert.equal(load(html)("html").attr("lang"), "en-GB");
});
