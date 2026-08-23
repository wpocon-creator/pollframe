import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { discoverFgwCurrentDownloads, fetchWithRetry } from "../scripts/lib/approval-sources.mjs";
import { isLiveDataPath } from "../worker/index.js";

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

test("the update workflow cannot be blocked by dependency audit or one source", async () => {
  const workflow = await readFile(new URL("../.github/workflows/update-poll-data.yml", import.meta.url), "utf8");
  assert.doesNotMatch(workflow, /npm audit/);
  assert.match(workflow, /cron:\s*["']17 \*\/4 \* \* \*["']/);
  for (const id of ["germany", "uk", "spain", "spain_regions", "approval"]) {
    assert.match(workflow, new RegExp(`id: ${id}[\\s\\S]{0,260}continue-on-error: true`));
  }
  assert.match(workflow, /needs:\s*\[update, publish\]/);
  assert.match(workflow, /validate-update-health\.mjs/);
});

test("all public polling data paths use the fast live-data route", () => {
  for (const path of ["/poll-data.json", "/regions.json", "/state-map-data.json", "/uk-summary.json", "/spain-summary.json", "/data/bundestag.json", "/data/spain-autonomies.geojson"]) {
    assert.equal(isLiveDataPath(path), true, path);
  }
  for (const path of ["/", "/assets/app.js", "/api/analytics", "/data/not-json.txt", "/data/../index.html"]) {
    assert.equal(isLiveDataPath(path), false, path);
  }
});
