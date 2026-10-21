import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { anonymousBrowserResponse, assertBrowserBuildCurrent } from "../scripts/run-browser-preview.mjs";
test("browser gate rejects stale built source rather than silently testing an old version", () => {
  assert.doesNotThrow(() => assertBrowserBuildCurrent({ schema: 1, sourceDigest: "current" }, "current"));
  assert.throws(() => assertBrowserBuildCurrent({ schema: 1, sourceDigest: "old" }, "current"), /dist does not match/);
  assert.throws(() => assertBrowserBuildCurrent(null, "current"), /dist does not match/);
});
test("UI fixture supplies anonymous reads but cannot fake authentication, account writes or private data", () => {
  assert.equal(anonymousBrowserResponse("/api/auth/get-session", "GET").fixtureBody, "null");
  assert.equal(anonymousBrowserResponse("/api/account/capabilities", "GET").enabled, true);
  for (const path of ["/api/auth/sign-in/email", "/api/account/documents", "/api/bug-reports"])
    for (const method of ["GET", "POST", "DELETE"]) assert.ok(anonymousBrowserResponse(path, method) == null);
});
test("anonymous UI fixture retains all production capability flags and matches real Worker reads without D1 or mail", async () => {
  const { createAccountService } = await import("../worker/accounts.js");
  const service = createAccountService({
    ACCOUNTS_ENABLED: "true", AUTH_SECRET: "anonymous-fixture-contract-not-a-production-secret",
    RESEND_API_KEY: "test-only-never-sent", AUTH_FROM: "konto@pollframe.com",
    PRIVATE_RESULTS_ENABLED: "true", PRIVATE_RESULTS_KEY: Buffer.alloc(32, 7).toString("base64"),
    ACCOUNTS_DB: new Proxy({}, { get() { throw Error("Anonymous fixture contract must not access D1"); } }),
  }, { fetchMail() { throw Error("Anonymous fixture contract must not send mail"); } });
  const capabilities = await service(new Request("https://pollframe.com/api/account/capabilities"));
  assert.equal(capabilities.status, 200);
  assert.deepEqual(anonymousBrowserResponse("/api/account/capabilities", "GET"), await capabilities.json());
  assert.equal(await (await service(new Request("https://pollframe.com/api/auth/get-session"))).json(), null);
});
test("only Playwright uses the UI fixture; normal previews and deployments do not", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(pkg.scripts.preview, "vite preview --host 127.0.0.1");
  assert.ok(!pkg.scripts.deploy.includes("run-browser-preview"));
  const config = await readFile("playwright.config.mjs", "utf8");
  assert.match(config, /externalBaseUrl \? undefined/);
  assert.match(config, /reuseExistingServer: false/);
});
