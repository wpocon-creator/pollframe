import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../worker/index.js";
import { publicRegionPath, routeParamsForPath, routeQueryForLocation } from "../src/public-routes.js";

test("clean public paths map to the same application state as legacy query routes", () => {
  assert.deepEqual(routeParamsForPath("/de/bundestag/umfragen"), { region: "bundestag" });
  assert.deepEqual(routeParamsForPath("/de/landtagswahl/berlin/umfragen"), { region: "berlin" });
  assert.deepEqual(routeParamsForPath("/uk/westminster/polls"), { region: "uk-westminster" });
  assert.deepEqual(routeParamsForPath("/es/preocupaciones"), { country: "es", view: "spain-issues" });
  assert.equal(publicRegionPath("sachsen-anhalt"), "/de/landtagswahl/sachsen-anhalt/umfragen");
  const query = routeQueryForLocation({ pathname: "/uk/constituencies", search: "?seat=bristol-central" });
  assert.equal(query.get("view"), "uk-constituencies");
  assert.equal(query.get("country"), "uk");
  assert.equal(query.get("seat"), "bristol-central");
});

test("the Worker serves route-specific metadata and readable fallback copy", async () => {
  const shell = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const env = {
    ASSETS: {
      fetch: async () => new Response(shell, { headers: { "content-type": "text/html; charset=utf-8" } }),
    },
  };
  for (const [path, language, titleText, headingText] of [
    ["/de/bundestag/umfragen", "de", "Bundestagswahl-Umfragen", "Aktuelle Sonntagsfrage"],
    ["/uk/westminster/polls", "en", "UK Westminster polls", "UK Westminster voting-intention polls"],
    ["/es/encuestas", "es", "Encuestas electorales", "Encuestas electorales de España"],
    ["/de/landtagswahl/berlin/umfragen", "de", "Berlin", "Landtagswahl-Umfragen in Berlin"],
  ]) {
    const response = await worker.fetch(new Request(`https://pollframe.com${path}`), env);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-language"), language);
    assert.ok(html.includes(`<meta property="og:locale" content="${language === "es" ? "es_ES" : language === "en" ? "en_GB" : "de_DE"}"`));
    assert.match(html, new RegExp(`<title>[^<]*${titleText}`));
    assert.ok(html.includes(`<link rel="canonical" href="https://pollframe.com${path}"`));
    assert.ok(html.includes(`<h1>${headingText}`));
    assert.ok(html.includes("<noscript><main>"));
  }
});

test("legacy public query URLs redirect without losing shared chart settings", async () => {
  const env = { ASSETS: { fetch: async () => new Response("unused") } };
  const response = await worker.fetch(new Request("https://pollframe.com/?region=bundestag&range=year&lang=en-GB"), env);
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://pollframe.com/de/bundestag/umfragen?range=year&lang=en-GB");

  const countryResponse = await worker.fetch(new Request("https://pollframe.com/?country=es"), env);
  assert.equal(countryResponse.status, 308);
  assert.equal(countryResponse.headers.get("location"), "https://pollframe.com/es");
});
