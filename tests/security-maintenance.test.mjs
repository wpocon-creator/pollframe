import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { headerProblems, validManifest, auditProblems, checkLive } from "../scripts/security-monitor.mjs";
import { sourceDigest } from "../scripts/release-provenance.mjs";
import { alertPlan } from "../scripts/security-alert.mjs";
import { assertReleaseClean } from "../scripts/check-release-source.mjs";

test("production release refuses modified or untracked application source", () => {
  assert.doesNotThrow(() => assertReleaseClean(""));
  assert.throws(() => assertReleaseClean(" M server/account-options.mjs"));
  assert.throws(() => assertReleaseClean("?? src/account-feature.js"));
});

function headers(embed = false) {
  return new Headers({
    "content-security-policy": `default-src 'none'; object-src 'none'; base-uri 'none'; script-src 'self'; frame-ancestors ${embed ? "*" : "'none'"}`,
    "strict-transport-security": "max-age=31536000", "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer", "permissions-policy": "camera=()",
    ...(!embed ? { "x-frame-options": "DENY" } : {}),
  });
}
test("missing headers, weakened script rules and blocked embeds are detected", () => {
  assert.deepEqual(headerProblems(headers()), []);
  assert.deepEqual(headerProblems(headers(true), true), []);
  const jsonPolicy = headers();
  jsonPolicy.set("content-security-policy", "default-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  assert.deepEqual(headerProblems(jsonPolicy, false, false), [], "JSON APIs may safely block scripts entirely");
  assert.ok(headerProblems(jsonPolicy).length, "HTML still needs its explicit script policy");
  assert.ok(headerProblems(new Headers()).length >= 6);
  const weak = headers();
  weak.set("content-security-policy", weak.get("content-security-policy") + "; script-src 'unsafe-eval'");
  assert.ok(headerProblems(weak).includes("unsafe script policy"));
  assert.ok(headerProblems(headers(), true).includes("embed frame header blocks publication"));
});
test("a malformed advisory response cannot be mistaken for zero vulnerabilities", () => {
  assert.throws(() => auditProblems({ error: { code: "network" } }));
  assert.throws(() => auditProblems({ vulnerabilities: {} }));
  assert.deepEqual(auditProblems({ vulnerabilities: {}, metadata: { vulnerabilities: { total: 0 } } }), []);
  assert.deepEqual(auditProblems({ vulnerabilities: { vite: { severity: "high" } }, metadata: { vulnerabilities: {} } }), ["vite: high"]);
});
test("published revision accepts only fixed hashes, not a shell command or arbitrary ref", () => {
  const good = { schema: 1, sourceRevision: "a".repeat(40), sourceDigest: "b".repeat(64), lockDigest: "c".repeat(64) };
  assert.ok(validManifest(good));
  for (const sourceRevision of ["main", "--help", "a".repeat(40) + ":secrets", "$(echo bad)"])
    assert.ok(!validManifest({ ...good, sourceRevision }));
});
test("daily alerts are quiet when healthy and deduplicated until findings change", () => {
  assert.equal(alertPlan({ ok: true, problems: [] }, "success").action, "none");
  const report = { ok: false, problems: ["Dependency needs review"] };
  const first = alertPlan(report, "failure");
  assert.equal(first.action, "create");
  const issue = { state: "open", body: `<!-- health:${first.fingerprint} -->` };
  assert.equal(alertPlan(report, "failure", issue).action, "none");
  assert.equal(alertPlan({ ok: false, problems: ["Different problem"] }, "failure", issue).action, "update");
  assert.equal(alertPlan({ ok: true, problems: [] }, "success", issue).action, "close");
  assert.equal(alertPlan(undefined, "failure").action, "create", "broken install/runner must alert too");
  assert.equal(alertPlan(report, "failure", { ...issue, state: "closed" }).action, "update", "recurrence reopens the issue");
});
test("source identity changes for code and lockfiles, not automatic poll snapshots", async () => {
  const root = await mkdtemp(join(tmpdir(), "pollframe-provenance-test-"));
  try {
    for (const dir of ["src", "server", "worker", "migrations", "public/data"]) await mkdir(join(root, dir), { recursive: true });
    for (const file of ["package.json", "package-lock.json", "vite.config.js", "wrangler.jsonc", "index.html", "embed.html", "public/_headers", "public/sw.js", "src/test.js"])
      await writeFile(join(root, file), "fixture");
    const first = await sourceDigest(root);
    await writeFile(join(root, "public/data/bundestag.json"), "new poll");
    assert.equal(await sourceDigest(root), first);
    await writeFile(join(root, "src/test.js"), "new code");
    assert.notEqual(await sourceDigest(root), first);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("read-only live probes detect exposed private routes and release drift", async () => {
  const digest = await sourceDigest();
  const requested = [];
  async function fetcher(url, options) {
    assert.equal(options.redirect, "manual");
    assert.equal(options.method, undefined, "GET only, never registrations or email");
    assert.ok(!options.headers.authorization);
    const path = new URL(url).pathname;
    requested.push(path);
    if (path === "/release.json") return new Response(JSON.stringify({ schema: 1, sourceRevision: "a".repeat(40), sourceDigest: digest, lockDigest: "b".repeat(64) }), { headers: { "cache-control": "no-store" } });
    const status = path === "/api/test/outbox" || path === "/wp-config.php" ? 404 : path === "/api/account/documents" ? 401 : 200;
    return new Response("", { status, headers: headers(path === "/embed.html") });
  }
  assert.deepEqual((await checkLive({ fetcher })).problems, []);
  assert.deepEqual((await checkLive({ fetcher: async (url, options) => new URL(url).pathname === "/wp-config.php" ? new Response("", { status: 403 }) : fetcher(url, options) })).problems, [], "an edge-denied scanner URL is not a broken application header");
  assert.ok(requested.length >= 7);
  const exposed = await checkLive({ fetcher: async (url, options) => new URL(url).pathname === "/api/account/documents" ? new Response("", { headers: headers() }) : fetcher(url, options) });
  assert.ok(exposed.problems.some(x => x.includes("expected HTTP 401, received 200")));
});
test("daily monitoring is bounded, free-runner-only and cannot deploy", async () => {
  const workflow = await readFile(".github/workflows/security-daily.yml", "utf8");
  assert.match(workflow, /cron: '43 6 \* \* \*'/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /timeout-minutes: 12/);
  assert.doesNotMatch(workflow, /secrets\.|wrangler deploy|contents: write|self-hosted|ubuntu-latest-large/);
  for (const [, ref] of workflow.matchAll(/uses:\s*[^@\s]+@([^\s#]+)/g)) assert.match(ref, /^[a-f0-9]{40}$/);
});
