import test from "node:test";
import assert from "node:assert/strict";
import { MATCH_PARTIES, MATCH_QUESTIONS } from "../src/party-match-data.js";
import {
  TOPIC_ROUNDS,
  questionsForRound,
  roundScope,
} from "../src/party-match-rounds.js";
import { calculateMatches, topicMatches } from "../src/party-match-model.js";
import { politicalProfile } from "../src/party-match-spectrum.js";
import {
  resultDocument,
  validateResultDocument,
  matchDesignSvg,
} from "../src/party-match-design.js";
import { MATCH_DESIGNS } from "../src/party-match-templates.js";
import { matchEvidenceReceipt } from "../src/party-match-receipt.js";
import { policyTextParts } from "../src/party-match-glossary.js";

const answersFor = (qs) =>
  Object.fromEntries(qs.map((q, i) => [q.id, { value: [1, 0, -1][i % 3] }]));
test("three distinct topic rounds have exactly 15 unique, translated propositions and page-specific evidence", () => {
  assert.equal(TOPIC_ROUNDS.length, 3);
  for (const r of TOPIC_ROUNDS) {
    const qs = questionsForRound(r.id);
    assert.equal(qs.length, 15);
    assert.equal(new Set(qs.map((q) => q.id)).size, 15);
    assert.deepEqual(
      qs.map((q) => q.id),
      r.groups.flatMap((g) => g.ids),
    );
    for (const q of qs) {
      for (const lang of ["de", "en", "es"]) {
        assert.ok(q.title[lang].length > 20);
        assert.ok(q.context[lang].length > 20);
        assert.equal(
          policyTextParts(q.title[lang], lang, q.id)
            .map((p) => p.text)
            .join(""),
          q.title[lang],
        );
      }
      for (const party of MATCH_PARTIES) {
        const p = q.positions[party.slug];
        assert.ok(p);
        assert.ok([null, -1, 0, 1].includes(p.value));
        for (const lang of ["de", "en", "es"])
          assert.ok(p.note[lang].length > 15);
        if (p.value !== null)
          assert.ok(
            (Number.isInteger(p.page) && p.page > 0) || p.source,
            q.id + "/" + party.slug,
          );
      }
    }
    // Sparse evidence is explicit, but no party gets a topic ranking from only
    // one or two known positions when the full round has been answered.
    for (const p of MATCH_PARTIES)
      assert.ok(
        qs.filter((q) => q.positions[p.slug].value !== null).length >= 7,
        r.id + "/" + p.slug,
      );
  }
});
test("zero, one and two answers never produce a profile position; three do, on shared evidence only", () => {
  const economy = ["wealth", "debt-abolition", "wage"];
  for (let n = 0; n <= 3; n++) {
    const answers = Object.fromEntries(
      economy.slice(0, n).map((id) => [id, { value: 1 }]),
    );
    const a = politicalProfile(answers, MATCH_QUESTIONS).axes.find(
      (a) => a.id === "economy",
    );
    assert.equal(a.count, n);
    assert.equal(a.user === null, n < 3);
  }
  const qs = structuredClone(MATCH_QUESTIONS);
  qs.find((q) => q.id === "wage").positions.spd.value = null;
  const a = politicalProfile(
    Object.fromEntries(economy.map((id) => [id, { value: 0 }])),
    qs,
    "spd",
  ).axes[0];
  assert.equal(a.count, 2);
  assert.equal(a.user, null);
  assert.equal(a.partyScore, null);
});
test("topic bars need three answered, documented questions, not three weights or three total answers", () => {
  const qs = questionsForRound("economy"),
    group = TOPIC_ROUNDS[0].groups[0];
  for (let n = 1; n <= 3; n++) {
    const answers = Object.fromEntries(
      group.ids.slice(0, n).map((id) => [id, { value: 0, important: true }]),
    );
    const p = calculateMatches(answers, qs).results.find(
      (p) => p.slug === "left",
    );
    assert.equal(
      topicMatches(p, TOPIC_ROUNDS[0].groups).length,
      n === 3 ? 1 : 0,
    );
  }
});
test("round identity and scope survive validation, every suitable template and evidence receipt; no overall compass is offered", () => {
  for (const round of TOPIC_ROUNDS) {
    const qs = questionsForRound(round.id),
      answers = answersFor(qs);
    const result = calculateMatches({ ...answers, asylum: { value: 1 } }, qs);
    assert.equal(result.answered, 15);
    const doc = resultDocument(result, 15, "de", {
      answers,
      questions: qs,
      round: round.id,
    });
    assert.equal(doc.round, round.id);
    assert.equal(validateResultDocument(doc).round, round.id);
    assert.equal(doc.answers, undefined);
    assert.doesNotMatch(JSON.stringify(doc), /questionIds|comparisons/);
    for (const style of MATCH_DESIGNS) {
      if (style.graphic === "spectrum") {
        assert.throws(() => matchDesignSvg(doc, { style: style.id }));
        continue;
      }
      for (const dark of [false, true]) {
        const svg = matchDesignSvg(doc, {
          style: style.id,
          dark,
          title: "Custom headline",
          subtitle: "Custom subtitle",
        }).svg;
        assert.ok(
          svg.includes(roundScope(round.id, "de").replaceAll("&", "&amp;")),
        );
        assert.doesNotMatch(svg, /NaN|Infinity|undefined|<script/);
      }
    }
    const receipt = matchEvidenceReceipt("de", qs, roundScope(round.id, "de"));
    assert.equal(receipt.questions.length, 15);
    assert.equal(receipt.scope, roundScope(round.id, "de"));
    assert.throws(() => validateResultDocument({ ...doc, round: "bogus" }));
    assert.throws(() => validateResultDocument({ ...doc, length: 30 }));
  }
});
test("legacy two-answer profiles remain readable as documents, but no position is drawn in exports", () => {
  const qs = MATCH_QUESTIONS,
    answers = answersFor(qs),
    result = calculateMatches(answers, qs);
  const doc = resultDocument(result, 30, "en-GB", { answers, questions: qs });
  doc.edition.version = 7;
  for (const p of doc.insights.profiles)
    for (const a of p.axes) {
      a.count = 2;
      a.user = 42;
      a.partyScore = p.party === null ? null : 58;
    }
  const safe = validateResultDocument(doc);
  const svg = matchDesignSvg(safe, {
    style: "spectrum-profile",
    party: "spd",
  }).svg;
  assert.match(svg, /At least three answers needed/);
  assert.doesNotMatch(svg, />42<|>58<|<circle/);
});
test("GDP is consistently named and explained; neighbouring policies are not silently treated as answers", () => {
  const defence = MATCH_QUESTIONS.find((q) => q.id === "defence");
  assert.match(defence.title.de, /Bruttoinlandsprodukts \(BIP\)/);
  assert.ok(
    policyTextParts(defence.title.de, "de", "defence").some(
      (p) => p.term === "gdp",
    ),
  );
  const social = questionsForRound("social"),
    energy = questionsForRound("climate-energy");
  assert.equal(
    social.find((q) => q.id === "pension-investment").positions.greens.value,
    1,
  );
  assert.match(
    social.find((q) => q.id === "pension-investment").positions.greens.note.de,
    /keine Anlage von Rentenbeiträgen/,
  );
  assert.equal(
    social.find((q) => q.id === "care-full").positions.spd.value,
    null,
  );
  assert.equal(
    energy.find((q) => q.id === "nord-stream").positions.greens.value,
    null,
  );
  const economy = questionsForRound("economy");
  assert.match(
    economy.find((q) => q.id === "overtime-tax").title.de,
    /Überstundenzuschläge/,
  );
  assert.equal(
    economy.find((q) => q.id === "capital-income-tax").positions.greens.value,
    null,
  );
});
