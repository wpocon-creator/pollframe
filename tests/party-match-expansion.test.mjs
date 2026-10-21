import test from "node:test";
import assert from "node:assert/strict";
import {
  MATCH_PARTIES,
  MATCH_QUESTIONS,
  questionsForLength,
} from "../src/party-match-data.js";
import { calculateMatches } from "../src/party-match-model.js";
import { MATCH_AXES, politicalProfile } from "../src/party-match-spectrum.js";
import {
  resultDocument,
  validateResultDocument,
  matchDesignSvg,
  normalizeMatchDesign,
} from "../src/party-match-design.js";
import {
  MATCH_DESIGNS,
  searchMatchDesigns,
} from "../src/party-match-templates.js";

test("each nested question set distinguishes every party pair using genuine, known differences", () => {
  for (const length of [8, 16, 30]) {
    const questions = questionsForLength(length);
    assert.equal(questions.length, length);
    for (let i = 0; i < MATCH_PARTIES.length; i++)
      for (let j = i + 1; j < MATCH_PARTIES.length; j++) {
        const a = MATCH_PARTIES[i].slug,
          b = MATCH_PARTIES[j].slug;
        assert.ok(
          questions.some(
            (q) =>
              q.positions[a]?.value != null &&
              q.positions[b]?.value != null &&
              q.positions[a].value !== q.positions[b].value,
          ),
          `${length}: ${a}/${b}`,
        );
      }
  }
  assert.deepEqual(questionsForLength(16).slice(0, 8), questionsForLength(8));
  assert.equal(questionsForLength(8)[5].id, "ip-retention");
  assert.equal(questionsForLength(8)[5].positions.greens.value, -1);
  assert.equal(questionsForLength(8)[5].positions.spd.value, 1);
});
test("editorial scales disclose direction, require three answers, and use shared evidence", () => {
  assert.equal(
    new Set(MATCH_AXES.flatMap((a) => Object.keys(a.items))).size,
    MATCH_AXES.flatMap((a) => Object.keys(a.items)).length,
  );
  for (const a of MATCH_AXES)
    for (const id of Object.keys(a.items))
      assert.ok(MATCH_QUESTIONS.some((q) => q.id === id));
  const answers = {
    wealth: { value: 1 },
    "debt-abolition": { value: 1 },
    wage: {value:1},
    asylum: { value: 1 },
    "ip-retention": { value: 1 },
    cannabis: {value:1},
  };
  const profile = politicalProfile(answers, MATCH_QUESTIONS);
  assert.equal(profile.axes[0].user, 0);
  assert.equal(profile.axes[1].user, 100);
  assert.equal(profile.axes[2].user, null);
  const neutral = politicalProfile(
    Object.fromEntries(Object.keys(answers).map((id) => [id, { value: 0 }])),
    MATCH_QUESTIONS,
  );
  assert.equal(neutral.axes[0].user, 50);
  assert.equal(neutral.axes[1].user, 50);
  const missing = politicalProfile(
    { pensions: { value: 1 }, wealth: { value: 1 } },
    MATCH_QUESTIONS,
    "union",
  );
  assert.equal(missing.axes[0].count, 1);
  assert.equal(missing.axes[0].user, null);
  assert.equal(missing.axes[0].partyScore, null);
  assert.throws(() => politicalProfile(answers, MATCH_QUESTIONS, "bogus"));
});
test("scope questions and equal issue-family weighting prevent mechanically cornering moderate policy bundles", () => {
  for (const length of [8, 16, 30])
    for (const party of ["spd", "union"]) {
      const questions = questionsForLength(length),
        answers = Object.fromEntries(
          questions.map((q) => [q.id, { value: q.positions[party].value }]),
        );
      const profile = politicalProfile(answers, questions, party);
      for (const axis of profile.axes.slice(0, 2))
        assert.ok(
          axis.partyScore > 0 && axis.partyScore < 100,
          `${length}/${party}/${axis.id}`,
        );
    }
  // Two tax statements cannot outweigh a whole budget family by their count.
  const answers = {
    wealth: { value: 1 },
    inheritance: { value: -1 },
    "debt-abolition": { value: -1 },
  };
  assert.equal(politicalProfile(answers, MATCH_QUESTIONS).axes[0].user, 50);
  for (const axis of MATCH_AXES) {
    const ids = Object.values(axis.groups).flat();
    assert.deepEqual([...ids].sort(), Object.keys(axis.items).sort());
    assert.equal(new Set(ids).size, ids.length);
  }
});
test("personal chart summaries are whitelisted, finite, small, backwards compatible, and never contain answers", () => {
  const answers = Object.fromEntries(
    MATCH_QUESTIONS.map((q, i) => [
      q.id,
      { value: (i % 3) - 1, important: i % 4 === 0 },
    ]),
  );
  const result = calculateMatches(answers);
  const doc = resultDocument(result, 30, "de", {
    answers,
    questions: MATCH_QUESTIONS,
  });
  assert.ok(JSON.stringify(doc).length < 16000);
  assert.equal(doc.insights.profiles.length, 8);
  assert.equal(doc.insights.pairs.length, 21);
  const dirty = structuredClone(doc);
  dirty.answers = answers;
  dirty.insights.answers = answers;
  dirty.insights.profiles[0].axes[0].answers = answers;
  assert.deepEqual(validateResultDocument(dirty), doc);
  const bad = structuredClone(doc);
  bad.insights.profiles[0].axes[0].user = 999;
  assert.throws(() => validateResultDocument(bad));
  const old = resultDocument(result, 30, "en-GB");
  assert.equal(validateResultDocument(old).insights, undefined);
  for (const style of MATCH_DESIGNS) {
    const svg = matchDesignSvg(doc, {
      style: style.id,
      note: "<script>bad</script>",
    }).svg;
    assert.doesNotMatch(svg, /<script|<foreignObject|<image|NaN|Infinity/);
    assert.match(svg, /pollframe.com/);
    assert.match(svg, /2025/);
  }
});
test("templates are indexed by purpose and style; controls normalise safely", () => {
  assert.equal(MATCH_DESIGNS.length, 18);
  assert.equal(searchMatchDesigns("", "topics").length, 4);
  assert.ok(searchMatchDesigns("moden").length > 2);
  assert.equal(searchMatchDesigns("kompass")[0].graphic, "spectrum");
  const x = normalizeMatchDesign({
    graphic: "topics",
    style: "social",
    background: "#ffffff",
    dark: true,
  });
  assert.equal(x.style, "topics-bars");
  assert.equal(x.dark, false);
  assert.equal(normalizeMatchDesign({ background: "#000000" }).dark, true);
  const doc = resultDocument(
    calculateMatches(
      Object.fromEntries(MATCH_QUESTIONS.map((q) => [q.id, { value: 1 }])),
    ),
    30,
    "de",
  );
  assert.doesNotMatch(
    matchDesignSvg(doc, { style: "editorial", font: "Verdana" }).svg,
    /font-family="Georgia/,
  );
  assert.equal(
    normalizeMatchDesign({ accent: "url(x)", barThickness: 1e8 }).accent,
    "#2558c5",
  );
});
