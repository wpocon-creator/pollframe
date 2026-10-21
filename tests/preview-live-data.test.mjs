import test from "node:test";
import assert from "node:assert/strict";
import {
  createPreviewLiveData,
  isPreviewLivePath,
  previewLiveDataPlugin,
} from "../scripts/lib/preview-live-data.mjs";
import { needsFreshnessFailure } from "../scripts/lib/update-health.mjs";
test("only allowlisted public polling data is proxied, never accounts or withdrawn approval", () => {
  for (const path of [
    "/data/bundestag.json",
    "/data/berlin.json",
    "/data/uk-westminster.json",
    "/data/spain-regions.json",
  ])
    assert.ok(isPreviewLivePath(path));
  for (const path of [
    "/api/account/documents",
    "/data/approval.json",
    "/data/../api/auth/get-session",
    "//evil.test/x",
    "/data/bundestag.json?token=x",
  ])
    assert.equal(isPreviewLivePath(path), false);
  assert.equal(previewLiveDataPlugin({ enabled: false }), null);
});
test("deduplicates requests, revalidates after TTL, and never forwards user credentials", async () => {
  let calls = 0,
    clock = 0;
  const store = createPreviewLiveData({
    now: () => clock,
    ttlMs: 100,
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, "https://pollframe.com/data/bundestag.json");
      assert.deepEqual(options.headers, { accept: "application/json" });
      assert.equal(options.redirect, "error");
      return Response.json({ polls: [{ date: "2026-10-17" }] });
    },
  });
  const rows = await Promise.all([
    store.load("/data/bundestag.json"),
    store.load("/data/bundestag.json"),
  ]);
  assert.equal(calls, 1);
  assert.match(rows[0].body, /2026-10-17/);
  await store.load("/data/bundestag.json");
  assert.equal(calls, 1);
  clock = 101;
  await store.load("/data/bundestag.json");
  assert.equal(calls, 2);
  await assert.rejects(() => store.load("/api/account/documents"));
});
test("offline or invalid upstream uses a validated cache, otherwise the local snapshot", async () => {
  let calls = 0;
  const store = createPreviewLiveData({
    ttlMs: 0,
    fetchImpl: async () => {
      calls++;
      return calls === 1
        ? Response.json({ polls: [] })
        : new Response("upstream failed", { status: 503 });
    },
  });
  await store.load("/poll-data.json");
  assert.equal(
    (await store.load("/poll-data.json")).source,
    "offline-live-cache",
  );
  assert.equal(await store.load("/regions.json"), null);
  const huge = createPreviewLiveData({
    maxBytes: 4,
    fetchImpl: async () => Response.json({ polls: [] }),
  });
  assert.equal(await huge.load("/poll-data.json"), null);
  const html = createPreviewLiveData({
    fetchImpl: async () =>
      new Response("<html>error</html>", {
        headers: { "content-type": "text/html" },
      }),
  });
  assert.equal(await html.load("/poll-data.json"), null);
});
test("frozen national datasets fail health checks without falsely treating sparse regions as broken", () => {
  for (const id of ["de", "uk", "es", "es/issues"])
    assert.ok(needsFreshnessFailure({ id, status: "stale" }));
  for (const status of ["archive", "current", "withheld-pending-permission"])
    assert.equal(needsFreshnessFailure({ id: "de", status }), false);
  assert.equal(
    needsFreshnessFailure({ id: "de/saarland", status: "stale" }),
    false,
  );
  assert.equal(
    needsFreshnessFailure({ id: "es/aragon", status: "archive" }),
    false,
  );
  assert.equal(
    needsFreshnessFailure({ id: "de/berlin", status: "missing" }),
    true,
  );
});
