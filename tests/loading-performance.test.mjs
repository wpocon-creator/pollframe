import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { initialDataHints } from "../worker/seo-response.js";
import { pollingSnapshot, SPAIN_COMPARISON_GROUPS } from "../src/spain-data.js";
import { PARTY_PROFILE_KEYS } from "../src/party-profile-index.js";

test("offline asset walk includes Vite dependency-map CSS and relative imports exactly once", async () => {
  const worker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  const code = worker.slice(worker.indexOf("async function cacheBuiltAssetGraph"), worker.indexOf("async function cacheDataPaths"));
  const origin = "https://pollframe.com";
  const bodies = new Map([
    ["/assets/main.js", 'const dependencies=["assets/approval.css","assets/spain.js"]; import("./spain.js");'],
    ["/assets/spain.js", 'import("./main.js");'],
    ["/assets/approval.css", "body { color: black; }"],
  ]);
  const fetched = [];
  const cached = [];
  const fetch = async (url) => {
    const path = new URL(url).pathname;
    fetched.push(path);
    return new Response(bodies.get(path) ?? "missing", { status: bodies.has(path) ? 200 : 404 });
  };
  const walk = new Function("fetch", "self", `${code}; return cacheBuiltAssetGraph;`)(fetch, { location: { origin } });
  await walk({ put: async (url) => cached.push(new URL(url).pathname) }, ["/assets/main.js"]);
  assert.deepEqual(fetched.sort(), [...bodies.keys()].sort());
  assert.deepEqual(cached.sort(), [...bodies.keys()].sort());
});

test("initial data hints follow canonical and query routes without unrelated downloads", () => {
  const hints = (path) => initialDataHints(new URL(path, "https://pollframe.com"), { berlin: "Berlin" });
  for (const path of ["/?region=bundestag", "/de/bundestag/umfragen"]) assert.deepEqual(hints(path), ["/data/bundestag.json"]);
  assert.deepEqual(hints("/uk/westminster/polls"), ["/data/uk-westminster.json"]);
  assert.deepEqual(hints("/es/encuestas"), ["/data/spain-congress.json"]);
  assert.deepEqual(hints("/de/landtagswahl/berlin/umfragen"), ["/data/berlin.json"]);
  assert.deepEqual(hints("/"), ["/regions.json", "/data/bundestag.json"]);
  assert.deepEqual(hints("/es/preocupaciones"), ["/spain-summary.json"]);
  assert.deepEqual(hints("/?view=approval&country=de"), ["/data/approval.json"]);
  for (const path of ["/sources", "/?page=kontakt", "/?view=watchlist", "/?region=unknown", "/?region=%22%3E%3Cscript%3E"]) assert.deepEqual(hints(path), []);
});

test("lightweight party availability index exactly matches all full portraits", async () => {
  const source = await readFile(new URL("../src/party-profile-content.jsx", import.meta.url), "utf8");
  const block = source.slice(source.indexOf("export const PARTY_PROFILES"), source.indexOf("function language"));
  const found = {};
  let country;
  for (const line of block.split("\n")) {
    const group = line.match(/^  (de|uk|es):/);
    if (group) { country = group[1]; found[country] = []; }
    const party = line.match(/^    (?:"([^"]+)"|([\w-]+)): p\(/);
    if (party) found[country].push(party[1] || party[2]);
  }
  assert.deepEqual(PARTY_PROFILE_KEYS, found);
});

test("indexed Spanish snapshots exactly preserve the old 45-day calculation", async () => {
  const { polls, pollsters } = JSON.parse(await readFile(new URL("../public/data/spain-congress.json", import.meta.url), "utf8"));
  const ids = Object.keys(pollsters);
  const oldSnapshot = (selected, date) => {
    const end = Date.parse(`${date}T12:00:00Z`);
    const latest = new Map();
    for (const poll of polls) {
      const time = Date.parse(`${poll.date}T12:00:00Z`);
      if (time > end) break;
      if (time >= end - 45 * 86400000 && selected.includes(poll.pollster)) latest.set(poll.pollster, poll);
    }
    const results = {};
    for (const group of SPAIN_COMPARISON_GROUPS) {
      const values = [...latest.values()].map((poll) => {
        const shares = group.partyIds.map((id) => poll.results[id]).filter(Number.isFinite);
        return shares.length ? shares.reduce((sum, value) => sum + value, 0) : null;
      }).filter(Number.isFinite);
      if (values.length) results[group.id] = values.reduce((sum, value) => sum + value, 0) / values.length;
    }
    return { results, pollsterCount: latest.size, polls: [...latest.values()] };
  };
  const dates = ["1990-01-01", polls[0].date, ...polls.filter((_, i) => i % 61 === 0).map((poll) => poll.date), polls.at(-1).date, "2030-01-01"];
  for (const selected of [ids, ids.slice(0, 3), []]) for (const date of dates) assert.deepEqual(pollingSnapshot(polls, selected, date), oldSnapshot(selected, date), date);
});
