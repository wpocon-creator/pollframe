import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { discoverFgwCurrentDownloads, fetchWithRetry } from "../scripts/lib/approval-sources.mjs";
import { fetchTextWithRetry, settleWithConcurrency } from "../scripts/lib/resilient-source.mjs";
import { isLiveDataPath } from "../worker/index.js";
import { previousMeasurement } from "../scripts/lib/data-review.mjs";

test("anomaly checks use the latest eligible poll even when source rows are unordered", () => {
  const rows = [{date:"2026-09-06",pollster:"1"}, {date:"2026-09-01",pollster:"1"}, {date:"2026-09-02",pollster:"2"}, {date:"2024-01-01",pollster:"1"}];
  assert.equal(previousMeasurement(rows,"2026-09-03",(row)=>row.pollster==="1").date,"2026-09-01");
  assert.equal(previousMeasurement(rows.toReversed ? rows.toReversed() : [...rows].reverse(),"2026-09-03",(row)=>row.pollster==="1").date,"2026-09-01");
  assert.equal(previousMeasurement([],"2026-09-03"),null);
});

test("official FGW download discovery survives versioned filename changes", () => {
  const html = '<a href="/Umfragen/Politbarometer/Langzeitentwicklung_-_Themen_im_Ueberblick/Politik_II/4_Arbeit_Reg.xlsx">Regierung</a><a href="/Umfragen/Politbarometer/Langzeitentwicklung_-_Themen_im_Ueberblick/Politik_II/11_Arbeit_Merz_27.xlsx">Kanzler</a>';
  assert.deepEqual(discoverFgwCurrentDownloads(html, "https://www.forschungsgruppe.de/current/"), {
    government: "https://www.forschungsgruppe.de/Umfragen/Politbarometer/Langzeitentwicklung_-_Themen_im_Ueberblick/Politik_II/4_Arbeit_Reg.xlsx",
    leader: "https://www.forschungsgruppe.de/Umfragen/Politbarometer/Langzeitentwicklung_-_Themen_im_Ueberblick/Politik_II/11_Arbeit_Merz_27.xlsx",
  });
});

test("official downloads reject an untrusted host", () => {
  assert.throws(() => discoverFgwCurrentDownloads('<a href="https://example.com/4_Arbeit_Reg.xlsx">x</a><a href="https://example.com/11_Arbeit_Merz.xlsx">y</a>', "https://www.forschungsgruppe.de/current/"));
});

test("temporary source errors are retried", async () => {
  let calls = 0;
  const response = await fetchWithRetry("https://www.forschungsgruppe.de/file.xlsx", {
    attempts: 3,
    timeoutMs: 1000,
    sleep: async () => {},
    fetchImpl: async () => {
      calls += 1;
      return new Response("", { status: calls === 1 ? 404 : 200 });
    },
  });
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});

test("a hanging regional source times out, falls back, and cannot block the rest", async () => {
  let primaryCalls = 0;
  // AbortSignal.timeout deliberately uses an unref'ed timer. Keep this test's
  // event loop alive long enough to model an actually hung network request.
  const keepAlive = setTimeout(() => {}, 100);
  const text = await fetchTextWithRetry("https://primary.invalid", {
    attempts: 2,
    fallbackUrl: "https://fallback.invalid",
    sleep: async () => {},
    timeoutMs: 5,
    fetchImpl: async (url, { signal }) => {
      if (url.includes("fallback")) return new Response("last validated source", { status: 200 });
      primaryCalls += 1;
      return new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
    },
  }).finally(() => clearTimeout(keepAlive));
  assert.equal(primaryCalls, 2);
  assert.equal(text, "last validated source");
});

test("regional work is bounded and one rejection does not cancel its neighbours", async () => {
  let active = 0;
  let peak = 0;
  const results = await settleWithConcurrency([1, 2, 3, 4, 5, 6], async (value) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active -= 1;
    if (value === 2) throw new Error("temporary source failure");
    return value * 2;
  }, 3);
  assert.equal(peak, 3);
  assert.equal(results[1].status, "rejected");
  assert.deepEqual(results.filter((result) => result.status === "fulfilled").map((result) => result.value), [2, 6, 8, 10, 12]);
});

test("Wikipedia rate limiting is retried instead of aborting Spain updates", async () => {
  let calls = 0;
  const text = await fetchTextWithRetry("https://en.wikipedia.org/w/api.php", {
    attempts: 3,
    sleep: async () => {},
    fetchImpl: async () => {
      calls += 1;
      return new Response(calls === 1 ? "rate limited" : "fresh polling data", { status: calls === 1 ? 429 : 200 });
    },
  });
  assert.equal(calls, 2);
  assert.equal(text, "fresh polling data");
});

test("the update workflow cannot be blocked by dependency audit or one source", async () => {
  const workflow = await readFile(new URL("../.github/workflows/update-poll-data.yml", import.meta.url), "utf8");
  assert.doesNotMatch(workflow, /npm audit/);
  assert.match(workflow, /cron:\s*["']17 \*\/4 \* \* \*["']/);
  for (const id of ["germany", "uk", "spain", "spain_regions", "approval"]) {
    const sourceStep = workflow.match(new RegExp(`id: ${id}[\\s\\S]{0,320}?(?=\\n\\s+- name:|$)`))?.[0] ?? "";
    assert.match(sourceStep, /continue-on-error: true/, `${id} must not block other sources`);
    assert.match(sourceStep, /timeout-minutes: [3-8]/, `${id} needs its own timeout`);
  }
  assert.match(workflow, /jobs:[\s\S]*?update:[\s\S]*?timeout-minutes: 20/);
  assert.match(workflow, /needs:\s*\[update, publish\]/);
  assert.match(workflow, /validate-update-health\.mjs/);
  assert.match(workflow, /cp incoming-poll-data\/public\/poll-data\.json public\/poll-data\.json/);
  assert.match(workflow, /cp -R incoming-poll-data\/public\/data\/\. public\/data\//);
  assert.doesNotMatch(workflow, /incoming-poll-data\/poll-data\.json/);
});

test("all public polling data paths use the fast live-data route", () => {
  for (const path of ["/poll-data.json", "/regions.json", "/state-map-data.json", "/uk-summary.json", "/spain-summary.json", "/data/bundestag.json", "/data/spain-autonomies.geojson"]) {
    assert.equal(isLiveDataPath(path), true, path);
  }
  for (const path of ["/", "/assets/app.js", "/api/analytics", "/data/not-json.txt", "/data/../index.html"]) {
    assert.equal(isLiveDataPath(path), false, path);
  }
});
