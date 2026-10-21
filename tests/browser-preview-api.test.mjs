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
  assert.deepEqual(anonymousBrowserResponse("/api/account/capabilities", "GET"), { enabled: true, localOnly: true, privateResults: false });
  for (const path of ["/api/auth/sign-in/email", "/api/account/documents", "/api/bug-reports"])
    for (const method of ["GET", "POST", "DELETE"]) assert.ok(anonymousBrowserResponse(path, method) == null);
});
test("only Playwright uses the UI fixture; normal previews and deployments do not", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(pkg.scripts.preview, "vite preview --host 127.0.0.1");
  assert.ok(!pkg.scripts.deploy.includes("run-browser-preview"));
  const config = await readFile("playwright.config.mjs", "utf8");
  assert.match(config, /externalBaseUrl \? undefined/);
  assert.match(config, /reuseExistingServer: false/);
});
