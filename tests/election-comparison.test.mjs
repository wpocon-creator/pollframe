import test from "node:test";
import assert from "node:assert/strict";
import {
  lastPreElectionPolls,
  comparisonRows,
  electionMajorities,
  coalitionRestriction,
} from "../src/election-comparison.js";
test("no blanket party penalty; only documented CDU exclusions and proximity affect ordering", () => {
  const p = (...names) => names.map(name => ({ name }));
  assert.equal(coalitionRestriction(p("AfD", "BSW")), null);
  for (const name of ["SPD", "GRÜNE", "Die Linke", "FDP", "FREIE WÄHLER"]) {
    assert.equal(coalitionRestriction(p("AfD", name)), null);
    assert.equal(coalitionRestriction(p("AfD", "BSW", name)), null);
  }
  assert.equal(coalitionRestriction(p("AfD", "CDU")), "cdu");
  const rows = electionMajorities(p("AfD", "BSW", "SPD", "CDU").map(row => ({...row, seats:25})),100);
  assert.ok(rows.every((row,i) => !i || rows[i-1].score <= row.score));
});
test("last poll is strictly pre-election, publication-based, retains same-day alternatives", () => {
  const entry = (date, pollster, fieldwork) => ({
    date,
    pollster,
    fieldwork,
    results: { 101: 20 },
  });
  const rows = lastPreElectionPolls({
    polls: [
      entry("2026-09-02", "1"),
      entry("2026-09-03", "5"),
      entry("2026-09-06", "1"),
      entry("2026-09-07", "1"),
      entry("2026-09-03", "6"),
      entry("2026-09-04", "1", ["2026-09-01", "2026-09-06"]),
    ],
  });
  assert.deepEqual(
    rows.map((row) => row.pollster),
    ["5", "6"],
  );
});
test("missing means missing, zero is zero, and deltas are percentage points", () => {
  const result = {
    rows: [
      { name: "CDU", share: 17.2, previousShare: 37.1 },
      { name: "BSW", share: 5.3, previousShare: null },
      { name: "FDP", share: 2.6, previousShare: 6.4 },
    ],
  };
  assert.equal(comparisonRows(result, null, "election")[0].delta, -19.9);
  assert.equal(comparisonRows(result, null, "election")[1].delta, null);
  const rows = comparisonRows(result, { results: { 101: 23, 3: 0 } }, "poll");
  assert.equal(rows[0].delta, -5.8);
  assert.equal(rows[1].delta, null);
  assert.equal(rows[2].delta, 2.6);
});
test("official seats, all minimal majorities including four-party options, exclusions ordered last", () => {
  const parties = [
    ["AfD", 39],
    ["CDU", 15],
    ["SPD", 8],
    ["GRÜNE", 8],
    ["Die Linke", 8],
    ["BSW", 5],
  ].map(([name, seats]) => ({ name, seats }));
  const combinations = electionMajorities(parties, 83);
  assert.ok(combinations.some((row) => row.parties.length === 5));
  for (const row of combinations) {
    assert.ok(row.seats >= 42);
    assert.ok(row.parties.every((party) => row.seats - party.seats < 42));
  }
  const simple = electionMajorities(
    [
      { name: "CDU", seats: 40 },
      { name: "SPD", seats: 20 },
      { name: "AfD", seats: 40 },
    ],
    100,
  );
  assert.equal(simple[0].restriction, null);
  assert.deepEqual(
    simple[0].parties.map((row) => row.name),
    ["CDU", "SPD"],
  );
  assert.equal(
    electionMajorities(
      [
        { name: "A", seats: 51 },
        { name: "B", seats: 49 },
      ],
      100,
    )[0].parties.length,
    1,
  );
});
