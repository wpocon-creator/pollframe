import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import preview, {
  previewHtml,
  previewMail,
} from "../worker/browser-preview.js";
import {
  checkedAccountOrigin,
  ACCOUNT_ORIGIN,
} from "../server/account-origin.mjs";
import { TEST_SITE_ORIGIN } from "../src/site-origin.js";
import { accountOptions } from "../server/account-options.mjs";
test("only exact configured test origin is trusted and cookies do not share the production prefix", () => {
  assert.equal(checkedAccountOrigin(TEST_SITE_ORIGIN), TEST_SITE_ORIGIN);
  for (const bad of [
    "http://test.pollframe.com",
    "https://test.pollframe.com.evil.test",
    "https://other.pollframe.com",
  ])
    assert.throws(() => checkedAccountOrigin(bad));
  const options = (baseURL) =>
    accountOptions({
      database: {},
      secret: "x".repeat(48),
      send: () => async () => {},
      baseURL,
    });
  assert.notEqual(
    options(TEST_SITE_ORIGIN).advanced.cookiePrefix,
    options(ACCOUNT_ORIGIN).advanced.cookiePrefix,
  );
  assert.deepEqual(options(TEST_SITE_ORIGIN).trustedOrigins, [
    TEST_SITE_ORIGIN,
  ]);
  assert.equal(options(ACCOUNT_ORIGIN).advanced.database.validateSchema, false,
    "request-owned Workers use explicit release-time schema validation, not background introspection");
});
test("preview deploy cannot bind production data or replace main routes", async () => {
  const config = JSON.parse(
    await readFile(
      new URL("../wrangler.preview.jsonc", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(config.name, "pollframe-accounts-preview");
  assert.deepEqual(config.routes, [
    { pattern: "test.pollframe.com", custom_domain: true },
  ]);
  assert.equal(
    config.d1_databases[0].database_id,
    "27b47f20-c612-4f73-b3e4-7645345c2720",
  );
  assert.equal(config.assets.run_worker_first, true);
  assert.equal(config.observability.enabled, false);
  assert.equal(config.workers_dev, false);
});
test("preview noindex is on HTML, assets, APIs and errors; unavailable and wrong-host routes fail closed", async () => {
  const env = { BROWSER_PREVIEW_ENABLED: "true" };
  for (const path of [
    "/robots.txt",
    "/sitemap.xml",
    "/pf-ops/secret",
    "/api/analytics",
    "/api/bug-reports",
    "/api/studio-popular",
  ]) {
    const r = await preview.fetch(new Request(TEST_SITE_ORIGIN + path), env);
    assert.match(r.headers.get("x-robots-tag"), /noindex/);
    assert.equal(r.headers.get("x-pollframe-environment"), "test");
    assert.ok(r.headers.get("content-security-policy"));
  }
  assert.equal(
    (await preview.fetch(new Request(ACCOUNT_ORIGIN), env)).status,
    404,
  );
  assert.equal(
    (await preview.fetch(new Request(TEST_SITE_ORIGIN), {})).status,
    404,
  );
  assert.equal(
    (await preview.fetch(new Request("http://test.pollframe.com/"), env))
      .status,
    308,
  );
  assert.equal(
    (
      await preview.fetch(new Request(TEST_SITE_ORIGIN + "/wahlframe"), env)
    ).headers.get("location"),
    TEST_SITE_ORIGIN + "/?view=party-match&lang=de",
  );
  const asset = await preview.fetch(
    new Request(TEST_SITE_ORIGIN + "/assets/example.js"),
    {
      ...env,
      ASSETS: {
        fetch: async () =>
          new Response("export const test=true", {
            headers: { "content-type": "text/javascript" },
          }),
      },
    },
  );
  assert.match(asset.headers.get("x-robots-tag"), /noindex/);
});
test("preview pages and mail clearly distinguish the test, with no doubled hostname or indexable canonical", () => {
  const html = previewHtml(
    '<html><head><meta name="robots" content="index, follow"><link rel="canonical" href="https://pollframe.com/"></head><body><div id="root"></div></body></html>',
    "es",
  );
  assert.match(html, /Versión de prueba/);
  assert.match(html, /noindex/);
  assert.doesNotMatch(html, /rel="canonical"/);
  const mail = previewMail({
    subject: "Code",
    from: "Pollframe <william@pollframe.com>",
    text: "Enter it only on pollframe.com https://test.pollframe.com/?account=reset",
  });
  assert.match(mail.subject, /^\[Test\]/);
  assert.match(mail.text, /only on test.pollframe.com/);
  assert.doesNotMatch(mail.text, /test\.test/);
});
