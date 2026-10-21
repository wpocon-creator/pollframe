import test from "node:test";
import assert from "node:assert/strict";
import {
  MATCH_QUESTIONS,
  MATCH_PARTIES,
  questionsForLength,
} from "../src/party-match-data.js";
import {
  calculateMatches,
  comparePositions,
  scoreLabel,
  rankLabel,
} from "../src/party-match-model.js";
const parties = [
  { slug: "a", name: "A" },
  { slug: "b", name: "B" },
  { slug: "c", name: "C" },
];
const q = (id, values) => ({
  id,
  positions: Object.fromEntries(
    values.map((value, i) => [parties[i].slug, { value }]),
  ),
});
const answersFor = (qs, value = 1) =>
  Object.fromEntries(qs.map((q) => [q.id, { value }]));
const byId = (r, id) => r.results.find((p) => p.slug === id);

test("unknown is not neutral and never discards another party's documented comparison", () => {
  const qs = Array.from({ length: 5 }, (_, i) =>
    q(`${i}`, [1, i === 4 ? null : -1, -1]),
  );
  const a = answersFor(qs);
  a["0"].important = true;
  const before = calculateMatches(a, qs, parties);
  assert.equal(before.totalWeight, 6);
  assert.equal(before.counted, 5);
  assert.equal(byId(before, "a").lower, 100);
  assert.equal(byId(before, "a").upper, 100);
  assert.equal(byId(before, "b").lower, 0);
  assert.equal(byId(before, "b").upper, 100 / 6);
  assert.equal(scoreLabel(byId(before, "b")), "0%");
  assert.equal(byId(before, "b").coverage, 5 / 6);
  a["4"].value = -1;
  const after = calculateMatches(a, qs, parties);
  assert.equal(byId(after, "a").earned, 5);
  assert.equal(byId(after, "c").earned, 1);
  assert.equal(byId(after, "b").earned, 0);
  assert.equal(byId(after, "b").upper, byId(before, "b").upper);
});
test("19 documented answers, 14 agreements: available-case score is 14/19, not a guessed missing answer", () => {
  const qs = Array.from({ length: 20 }, (_, i) =>
    q(`${i}`, [i < 14 ? 1 : i < 19 ? -1 : null, 1, 0]),
  );
  const p = byId(calculateMatches(answersFor(qs), qs, parties), "a");
  assert.equal(p.lower, 70);
  assert.equal(p.upper, 75);
  assert.equal(p.known, 19);
  assert.equal(scoreLabel(p), "74%");
  assert.equal(p.score, (100 * 14) / 19);
  assert.equal(p.coverage, 19 / 20);
});
test("mixed answers, weights, skipped important questions and complete evidence", () => {
  const qs = Array.from({ length: 4 }, (_, i) =>
    q(`${i}`, [i === 3 ? null : 0, 0, 1]),
  );
  const a = answersFor(qs, 0);
  a["3"].important = true;
  let r = calculateMatches(a, qs, parties),
    p = byId(r, "a");
  assert.equal(p.lower, 80);
  assert.equal(p.upper, 100);
  assert.equal(p.knownWeight, 3);
  assert.equal(byId(r, "b").lower, 100);
  a["3"].value = null;
  r = calculateMatches(a, qs, parties);
  assert.equal(r.totalWeight, 3);
  assert.equal(r.ready, false);
  assert.ok(
    r.results.every(
      (p) => p.lower === null && p.rankMin === null && scoreLabel(p) === "—",
    ),
  );
});
test("missing evidence widens an interval; it cannot improve a guaranteed score or punish known parties", () => {
  const qs = Array.from({ length: 5 }, (_, i) =>
    q(`${i}`, [i % 2 ? -1 : 1, 1, -1]),
  );
  const a = answersFor(qs),
    before = calculateMatches(a, qs, parties);
  qs[0].positions.a.value = null;
  const after = calculateMatches(a, qs, parties);
  assert.ok(byId(after, "a").lower <= byId(before, "a").lower);
  assert.ok(byId(after, "a").upper >= byId(before, "a").upper);
  for (const id of ["b", "c"])
    assert.equal(byId(before, id).lower, byId(after, id).lower);
});
test("exact ties share a place, interval overlap is not a tie, and no-evidence parties stay unknown", () => {
  const qs = Array.from({ length: 4 }, (_, i) =>
    q(`${i}`, [i < 2 ? 1 : -1, i < 2 ? 1 : -1, null]),
  );
  const r = calculateMatches(answersFor(qs), qs, parties);
  assert.equal(rankLabel(byId(r, "a")), "1");
  assert.equal(rankLabel(byId(r, "b")), "1");
  assert.equal(scoreLabel(byId(r, "c")), "—");
  assert.equal(byId(r, "c").known, 0);
  const only = calculateMatches(answersFor(qs), qs, parties.slice(0, 2));
  assert.ok(only.results.every((p) => rankLabel(p) === "1"));
  assert.equal(calculateMatches({}, qs, parties).ready, false);
});
test("bounds and possible ranks equal exhaustive completion of missing values, including mixed answers", () => {
  const qs = [
    q("1", [null, 1, 0]),
    q("2", [-1, null, 1]),
    q("3", [0, 1, null]),
    q("4", [1, 0, -1]),
  ];
  for (const user of [-1, 0, 1])
    for (const doubled of [false, true]) {
      const answers = answersFor(qs, user);
      answers["1"].important = doubled;
      const r = calculateMatches(answers, qs, parties);
      const observed = Object.fromEntries(
        parties.map((p) => [
          p.slug,
          { lo: Infinity, hi: -Infinity, best: Infinity, worst: -Infinity },
        ]),
      );
      for (const a of [-1, 0, 1])
        for (const b of [-1, 0, 1])
          for (const c of [-1, 0, 1]) {
            const values = [a, b, c];
            // Independent oracle: sum direct comparison points, no interval helpers.
            const scores = parties.map(
              (p, j) =>
                (qs.reduce(
                  (sum, question, i) =>
                    sum +
                    (i === 0 && doubled ? 2 : 1) *
                      (1 -
                        Math.abs(
                          user -
                            (question.positions[p.slug].value ?? values[j]),
                        ) /
                          2),
                  0,
                ) /
                  (doubled ? 5 : 4)) *
                100,
            );
            parties.forEach((p, j) => {
              const o = observed[p.slug],
                rank = 1 + scores.filter((v) => v > scores[j] + 1e-9).length;
              o.lo = Math.min(o.lo, scores[j]);
              o.hi = Math.max(o.hi, scores[j]);
              o.best = Math.min(o.best, rank);
              o.worst = Math.max(o.worst, rank);
            });
          }
      for (const p of r.results) {
        const o = observed[p.slug];
        assert.deepEqual(
          [p.lower, p.upper, p.rankMin, p.rankMax],
          [o.lo, o.hi, o.best, o.worst],
        );
      }
    }
});
test("512 deterministic scenarios: permutation invariance, interval containment, nesting, all known questions count", () => {
  let x = 123;
  for (let run = 0; run < 512; run++) {
    const answers = Object.fromEntries(
      MATCH_QUESTIONS.map((q) => {
        x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
        return [
          q.id,
          {
            value: [-1, 0, 1, null][(x >>> 16) % 4],
            important: (x & 16) !== 0,
          },
        ];
      }),
    );
    const r = calculateMatches(answers),
      s = calculateMatches(
        answers,
        [...MATCH_QUESTIONS].reverse(),
        [...MATCH_PARTIES].reverse(),
      );
    assert.equal(r.ready, r.answered >= 4);
    assert.deepEqual(
      r.results.map((p) => [p.slug, p.lower, p.upper, p.rankMin, p.rankMax]),
      s.results.map((p) => [p.slug, p.lower, p.upper, p.rankMin, p.rankMax]),
    );
    for (const p of r.results) {
      assert.ok(p.lower >= 0 && p.upper <= 100 && p.lower <= p.upper);
      let known = 0,
        weight = 0;
      for (const row of p.comparisons)
        if (row.counted) {
          known++;
          weight += row.weight;
          assert.notEqual(
            comparePositions(row.answer.value, row.position.value),
            null,
          );
        }
      assert.equal(p.known, known);
      assert.equal(p.knownWeight, weight);
      assert.equal(p.known + p.missing, r.answered);
      assert.ok(p.rankMin <= p.rankMax && p.rankMin >= 1 && p.rankMax <= 7);
    }
    const first = questionsForLength(8);
    assert.deepEqual(
      calculateMatches(answers, first),
      calculateMatches(
        Object.fromEntries(first.map((q) => [q.id, answers[q.id]])),
        first,
      ),
    );
  }
});
test("new meanings have new IDs; stale answers cannot silently affect new questions", () => {
  const changed = MATCH_QUESTIONS.filter((q) => q.replaces);
  assert.equal(changed.length, 6);
  const answers = Object.fromEntries(
    changed
      .filter(
        (q) => !MATCH_QUESTIONS.some((current) => current.id === q.replaces),
      )
      .map((q) => [q.replaces, { value: 1 }]),
  );
  assert.equal(calculateMatches(answers).answered, 0);
  // The original cash proposition was intentionally retained as its own
  // question. Answering it must never answer the replacement car proposition.
  const cash = calculateMatches({ cash: { value: 1 } });
  assert.equal(cash.answered, 1);
  assert.equal(
    cash.results[0].comparisons.find((r) => r.question.id === "cars-2035")
      .included,
    false,
  );
});

test("display puts a certain first place ahead of an alphabetical but uncertain first-to-last place", () => {
  const qs = Array.from({ length: 4 }, (_, i) => q(`${i}`, [null, 1, 0]));
  const r = calculateMatches(answersFor(qs), qs, parties);
  assert.equal(rankLabel(byId(r, "a")), "—");
  assert.equal(rankLabel(byId(r, "b")), "1");
  assert.equal(r.results[0].slug, "b");
});
