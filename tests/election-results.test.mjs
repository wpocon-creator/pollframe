import test from "node:test";
import assert from "node:assert/strict";
import {
  parseElectionResults,
  parseElectionSeats,
  publicElection,
  FIVE_DAYS,
  ElectionResultsStore,
} from "../worker/election-results.js";
import { readFileSync } from "node:fs";
const now = Date.parse("2026-09-06T20:00:00Z");
test("official 2026 table fixture: prior election, turnout and actual seats; corrupt seats rejected", () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL("./fixtures/election-st2026-tables.json", import.meta.url),
    ),
  );
  const html = (table) =>
    `Landtagswahl Sachsen-Anhalt 2026<div id="zeitstempel" data-value="${fixture.stamp}"></div><div id="statusXY">2661 von 2661 Wahlbezirken</div><script data-for="ergtable">${JSON.stringify({ x: { tag: { attribs: table } } })}</script>`;
  const result = parseElectionResults(
    html(fixture.results),
    fixture.stamp + 1000,
  );
  assert.equal(
    result.rows.find((row) => row.name === "CDU").previousShare,
    37.1,
  );
  assert.ok(Math.abs(result.turnout - 77.81646) < 0.0001);
  assert.equal(result.invalidVotes, 12896);
  const seats = parseElectionSeats(html(fixture.seats), fixture.stamp + 1000);
  assert.equal(seats.total, 83);
  assert.equal(seats.rows.find((row) => row.name === "AfD").seats, 39);
  fixture.seats.data.anzahl_sitze_wj[0]++;
  assert.throws(() =>
    parseElectionSeats(html(fixture.seats), fixture.stamp + 1000),
  );
});
function fixture({
  counted = 100,
  total = 2660,
  stamp = now - 60000,
  firstVotes = false,
  missing = false,
} = {}) {
  const data = {
    id: Array(6).fill("15"),
    merkmal: ["Gültig", "A", "B", "C", "D", "E"],
    partei_pos: [0, 1, 2, 3, 4, 5],
    "anzahl.wj.x": [1000, 400, 300, 150, 100, 50],
    "prozent.wj.x": [100, 40, 30, 15, 10, 5],
  };
  if (missing) data["anzahl.wj.x"][2] = 200;
  const table = {
    x: {
      tag: {
        attribs: {
          data,
          columnGroups: [
            {
              name: firstVotes ? "Erststimmen" : "Zweitstimmen",
              columns: ["anzahl.wj.x", "prozent.wj.x"],
            },
          ],
        },
      },
    },
  };
  return `Landtagswahl Sachsen-Anhalt 2026<div id="zeitstempel" data-value="${stamp}"></div><div id="statusXY">${counted} von ${total} Wahlbezirken</div><script data-for="ergtable">${JSON.stringify(table)}</script>`;
}
test("no result before votes; rejects future timestamps and wrong vote type", () => {
  assert.equal(parseElectionResults(fixture({ counted: 0 }), now), null);
  assert.equal(
    parseElectionResults(fixture({ stamp: now + 900000 }), now),
    null,
  );
  assert.throws(() => parseElectionResults(fixture({ firstVotes: true }), now));
  assert.throws(() => parseElectionResults(fixture({ missing: true }), now));
  assert.throws(() =>
    parseElectionResults(fixture().replace("2026", "2021"), now),
  );
});
test("partial and complete counts remain distinct; second-vote totals checked", () => {
  const result = parseElectionResults(fixture(), now);
  assert.equal(result.status, "partial");
  assert.equal(result.rows[0].share, 40);
  assert.equal(
    parseElectionResults(fixture({ counted: 2660 }), now).status,
    "provisional",
  );
});
test("five days is measured once, not from the latest count or visitor", () => {
  const state = {
    result: parseElectionResults(fixture(), now),
    firstSeenAt: now,
    checkedAt: now + 1000,
  };
  assert.ok(publicElection(state, now + FIVE_DAYS - 1));
  assert.equal(publicElection(state, now + FIVE_DAYS), null);
  state.result.publishedAt = new Date(now + FIVE_DAYS).toISOString();
  assert.equal(publicElection(state, now + FIVE_DAYS), null);
});
test("persisted import keeps initial expiry and retains verified data on source failure", async () => {
  const originalFetch = globalThis.fetch,
    originalNow = Date.now;
  let clock = now,
    requests = 0,
    fail = false;
  const values = new Map(),
    alarms = [];
  const storage = {
    get: async (k) => values.get(k),
    put: async (k, v) => values.set(k, structuredClone(v)),
    setAlarm: async (n) => alarms.push(n),
    deleteAlarm: async () => {},
  };
  try {
    Date.now = () => clock;
    globalThis.fetch = async (url, options) => {
      assert.equal(options.redirect, "manual");
      requests++;
      if (fail) throw new Error("offline");
      return new Response(fixture({ stamp: clock - 60000 }));
    };
    const store = new ElectionResultsStore({ storage });
    await store.refresh();
    await store.refresh();
    assert.equal(requests, 1);
    clock += 300001;
    await store.refresh();
    assert.equal(values.get("result").firstSeenAt, now);
    fail = true;
    clock += 300001;
    await store.alarm();
    assert.ok(publicElection(values.get("result"), clock).stale);
    clock = now + FIVE_DAYS;
    await store.alarm();
    assert.equal(publicElection(values.get("result"), clock), null);
    assert.equal(alarms.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
});

test("closed election never fetches again, clears alarms and preserves its archive", async () => {
  const originalFetch = globalThis.fetch, originalNow = Date.now;
  const archived = { result: parseElectionResults(fixture(), now), firstSeenAt: now };
  try {
    Date.now = () => Date.parse("2026-09-13T12:00:00Z");
    globalThis.fetch = async () => { assert.fail("Closed election must not contact the source"); };
    for (const state of [undefined, archived]) {
      let cleared = 0;
      const store = new ElectionResultsStore({ storage: {
        get: async () => state,
        deleteAlarm: async () => { cleared++; },
        setAlarm: async () => assert.fail("Closed election must not schedule another check"),
        put: async () => assert.fail("Archived result must not be changed"),
      } });
      assert.deepEqual(await store.refresh(), state || {});
      await store.alarm();
      assert.equal(cleared, 2);
    }
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
});
