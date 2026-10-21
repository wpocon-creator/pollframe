import test from "node:test";
import assert from "node:assert/strict";
import { MATCH_QUESTIONS, MATCH_PARTIES } from "../src/party-match-data.js";
import {
  calculateMatches,
  compareOnSharedEvidence,
  topicMatches,
  MATCH_TOPICS,
} from "../src/party-match-model.js";
import {
  resultDocument,
  validateResultDocument,
  normalizeMatchDesign,
  matchDesignSvg,
} from "../src/party-match-design.js";
import {
  MATCH_RESEARCH,
  researchForQuestion,
} from "../src/party-match-research.js";
import { savePrivateResult } from "../src/party-match-storage.js";
const answers = Object.fromEntries(
  MATCH_QUESTIONS.map((q) => [
    q.id,
    { value: 1, important: q.id === "wealth" },
  ]),
);
const result = calculateMatches(answers);

test("a separate denominator per party, while pairwise comparison uses identical questions and weights", () => {
  for (const p of result.results) {
    const rows = p.comparisons.filter((r) => r.counted),
      sum = rows.reduce((s, r) => s + r.weight, 0);
    assert.equal(
      p.score,
      (100 * rows.reduce((s, r) => s + r.agreement * r.weight, 0)) / sum,
    );
    assert.equal(p.coverage, sum / result.totalWeight);
  }
  for (const a of MATCH_PARTIES)
    for (const b of MATCH_PARTIES.filter((b) => b !== a)) {
      const shared = compareOnSharedEvidence(answers, MATCH_QUESTIONS, [a, b]);
      assert.equal(
        shared.results[0].knownWeight,
        shared.results[1].knownWeight,
      );
      assert.equal(shared.results[0].known, shared.sharedCount);
      assert.equal(shared.results[1].known, shared.sharedCount);
    }
  const ids = MATCH_TOPICS.flatMap((t) => t.ids);
  assert.equal(new Set(ids).size, 30);
  assert.deepEqual([...ids].sort(), MATCH_QUESTIONS.map((q) => q.id).sort());
  for (const p of result.results)
    assert.equal(
      topicMatches(p).reduce((sum, t) => sum + t.known, 0),
      p.known,
    );
});
test("result document is whitelisted, not raw answers, and enforces scores, coverage, rank and edition", () => {
  const doc = resultDocument(result, 30, "de");
  assert.ok(JSON.stringify(doc).length < 1500);
  assert.equal(doc.answers, undefined);
  assert.equal(doc.rows[0].comparisons, undefined);
  assert.deepEqual(
    validateResultDocument({
      ...doc,
      answers,
      rows: doc.rows.map((row) => ({ ...row, answer: 1, html: "<script>" })),
    }),
    doc,
  );
  for (const change of [
    (d) => (d.rows[0].score = 101),
    (d) => (d.rows[0].rank = 7),
    (d) => (d.rows[0].missing = 30),
    (d) => (d.rows[0].score = null),
    (d) => (d.rows[1].slug = d.rows[0].slug),
    (d) => (d.edition.reviewed = "anything"),
    (d) => (d.edition.version = -1),
  ]) {
    const copy = structuredClone(doc);
    change(copy);
    assert.throws(() => validateResultDocument(copy));
  }
});
test("free text is escaped, fixed attribution survives every template, and nothing is fetched by SVG", () => {
  const doc = resultDocument(result, 30, "es");
  for (const style of ["pollframe", "editorial", "social"]) {
    const { svg } = matchDesignSvg(doc, {
      style,
      title: "<script>alert(1)</script>",
      subtitle: '<image href="https://evil.invalid"/>',
      font: "url(evil)",
    });
    assert.doesNotMatch(svg, /<script|<image|<foreignObject|\shref="|url\(/);
    assert.match(svg, /&lt;script&gt;/);
    assert.match(svg, /2025/);
    assert.match(svg, /pollframe.com/);
  }
  const d = normalizeMatchDesign({
    textScale: 999,
    rounding: -1,
    style: "bad",
    format: "bad",
    foo: "bad",
  });
  assert.equal(d.textScale, 1.2);
  assert.equal(d.rounding, 0);
  assert.equal(d.style, "pollframe");
  assert.equal(d.foo, undefined);
});
test("no silent political-result persistence: storage consent is mandatory before touching IndexedDB", async () => {
  await assert.rejects(
    () => savePrivateResult("test", resultDocument(result, 30, "de"), {}),
    /consent/,
  );
});
test("research has original links, explicit limitations and translations, and cannot add party positions", () => {
  assert.equal(MATCH_RESEARCH.length, 10);
  for (const study of MATCH_RESEARCH) {
    assert.match(study.url, /^https:\/\//);
    assert.ok(
      study.questions.every((id) => MATCH_QUESTIONS.some((q) => q.id === id)),
    );
    for (const lang of ["de", "en", "es"]) {
      assert.ok(study.finding[lang].length > 50);
      assert.ok(study.limits[lang].length > 50);
    }
  }
  assert.equal(researchForQuestion("benefit-sanctions").length, 2);
  assert.equal(researchForQuestion("not-a-question").length, 0);
  const p = MATCH_QUESTIONS.find((q) => q.id === "missiles").positions.afd;
  assert.equal(p.value, -1);
  assert.equal(p.page, 92);
});
