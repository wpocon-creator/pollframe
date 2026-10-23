import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { mock } from "node:test";
import { load } from "cheerio";
import worker from "../worker/index.js";

const publisher = "ca-pub-3017326793000170";
const shell = await readFile(new URL("../index.html", import.meta.url), "utf8");
const adsTxt = await readFile(new URL("../public/ads.txt", import.meta.url), "utf8");
mock.method(globalThis, "fetch", async () => new Response("", { status: 503 }));
const env = { ASSETS: { fetch: async request => {
  const path = new URL(request.url).pathname;
  if (path === "/index.html") return new Response(shell, { headers: { "content-type": "text/html" } });
  if (path === "/ads.txt") return new Response(adsTxt, { headers: { "content-type": "text/plain" } });
  return new Response("Not found", { status: 404 });
} } };

test("AdSense ownership is verifiable in original HTML without running advertising code", async () => {
  for (const path of ["/", "/studio", "/de/bundestag/umfragen", "/uk?lang=de", "/es?lang=en-US"]) {
    const response = await worker.fetch(new Request(`https://pollframe.com${path}`), env);
    assert.equal(response.status, 200);
    const $ = load(await response.text());
    assert.equal($('head meta[name="google-adsense-account"]').length, 1);
    assert.equal($('head meta[name="google-adsense-account"]').attr("content"), publisher);
    assert.equal($('script[src*="googlesyndication"], script[src*="doubleclick"], script[src*="googleadservices"]').length, 0);
    assert.doesNotMatch(response.headers.get("content-security-policy") || "", /googlesyndication|doubleclick|googleadservices/);
  }
});

test("ads.txt authorizes only the publisher supplied by the account holder", async () => {
  assert.equal(adsTxt.trim(), "google.com, pub-3017326793000170, DIRECT, f08c47fec0942fa0");
  const response = await worker.fetch(new Request("https://pollframe.com/ads.txt"), env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/plain/);
  assert.equal(await response.text(), adsTxt);
});

test("journalist embeds remain free of ad verification and advertising scripts", async () => {
  const embed = await readFile(new URL("../embed.html", import.meta.url), "utf8");
  assert.doesNotMatch(embed, /google-adsense-account|adsbygoogle|googlesyndication|doubleclick/);
});
