import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import {
  MATCH_PARTIES,
  MATCH_QUESTIONS,
  questionsForLength,
  localText,
  MATCH_EDITION,
} from "../src/party-match-data.js";
import {
  MATCH_SOURCES,
  matchSourceHref,
  matchSourceDate,
} from "../src/party-match-sources.js";
import { MATCH_COPY } from "../src/party-match-copy.js";
import {
  calculateMatches,
  comparePositions,
  validAnswer,
  isComparable,
} from "../src/party-match-model.js";

test("30 original, translated questions and source-page evidence or explicit unknowns", () => {
  assert.equal(MATCH_QUESTIONS.length, 30);
  assert.equal(new Set(MATCH_QUESTIONS.map((q) => q.id)).size, 30);
  for (const p of MATCH_PARTIES)
    assert.match(p.source, /^https:\/\/[^?#]+\.pdf$/);
  for (const q of MATCH_QUESTIONS) {
    assert.deepEqual(
      Object.keys(q.positions).sort(),
      MATCH_PARTIES.map((p) => p.slug).sort(),
    );
    for (const position of Object.values(q.positions)) {
      assert.ok(position.value === null || validAnswer(position.value));
      if (position.value !== null) {
        if (position.source) {
          assert.ok(Object.values(MATCH_SOURCES).includes(position.source));
          assert.match(position.source.url, /^https:\/\//);
          if (position.source.url.endsWith(".pdf"))
            assert.ok(Number.isInteger(position.page) && position.page > 0);
          else
            assert.equal(
              position.page,
              null,
              "HTML sources must not inherit a programme PDF page",
            );
        } else assert.ok(Number.isInteger(position.page) && position.page > 0);
      }
      for (const lang of ["de", "en-GB", "en-US", "es"]) {
        assert.ok(localText(position.note, lang).length > 6);
        assert.ok(localText(q.title, lang).length > 20);
        assert.ok(localText(q.context, lang).length > 20);
      }
    }
  }
  for (const entry of Object.values(MATCH_COPY))
    for (const lang of ["de", "en-GB", "en-US", "es"])
      assert.ok(localText(entry, lang));
});
test("verified additions expand coverage without treating missing evidence as an answer", () => {
  assert.equal(MATCH_EDITION.version, 9);
  assert.deepEqual(
    [8, 16, 30].map(
      (n) => questionsForLength(n).filter((q) => isComparable(q)).length,
    ),
    [6, 10, 15],
  );
  assert.equal(
    MATCH_QUESTIONS.flatMap((q) => Object.values(q.positions)).filter(
      (p) => p.value !== null,
    ).length,
    187,
  );
  const additions = {
    selfdetermination: { fdp: -1 },
    climate: { spd: 1 },
    wage: { afd: -1 },
    health: { afd: -1 },
    citizenship: { fdp: 1, greens: 1 },
    missiles: { fdp: 1, afd: -1 },
    russia: { greens: -1, spd: -1 },
    rail: { bsw: -1 },
    "benefit-sanctions": { union: 1 },
    pensions: { fdp: -1 },
    "cars-2035": { greens: 1, spd: 1 },
    cash: { left: 1 },
    vote16: { fdp: 1 },
    ukraine: { afd: -1 },
  };
  for (const [id, positions] of Object.entries(additions))
    for (const [party, value] of Object.entries(positions))
      assert.equal(
        MATCH_QUESTIONS.find((q) => q.id === id).positions[party].value,
        value,
        `${id}/${party}`,
      );
  for (const [id, party] of [
    ["cannabis", "bsw"],
    ["speed", "bsw"],
    ["nuclear-restart", "bsw"],
    ["climate", "bsw"],
    ["abortion", "bsw"],
  ])
    assert.equal(
      MATCH_QUESTIONS.find((q) => q.id === id).positions[party].value,
      null,
      "Related policies or silence are not an answer",
    );
});
test("supplementary citations stay within the edition and keep accurate URLs, pages and date precision", () => {
  const primaryHosts = new Set([
    "www.gruene.de",
    "www.fdp.de",
    "olaf-scholz.spd.de",
    "afdbundestag.de",
    "dserver.bundestag.de",
    "www.spdfraktion.de",
    "www.bundestag.de",
    "www.spd-europa.de",
  ]);
  for (const s of Object.values(MATCH_SOURCES)) {
    assert.ok(primaryHosts.has(new URL(s.url).hostname));
    assert.ok(["party", "parliament", "programme"].includes(s.kind));
    if (s.date) {
      assert.match(s.date, /^\d{4}-\d{2}(?:-\d{2})?$/);
      assert.ok(s.date < MATCH_EDITION.positionCutoff);
      assert.ok(
        !Number.isNaN(
          Date.parse(
            `${s.date.length === 7 ? `${s.date}-01` : s.date}T12:00:00Z`,
          ),
        ),
      );
    } else assert.equal(s.edition, 2025);
    for (const lang of ["de", "en-GB", "en-US", "es"])
      assert.ok(localText(s.title, lang).length > 10);
  }
  const party = MATCH_PARTIES.find((p) => p.slug === "afd");
  const position = (id) =>
    MATCH_QUESTIONS.find((q) => q.id === id).positions.afd;
  assert.equal(
    matchSourceHref(position("health"), party),
    `${MATCH_SOURCES.afdHealth.url}#page=6`,
  );
  assert.equal(
    matchSourceHref(position("wage"), party),
    MATCH_SOURCES.afdWage.url,
  );
  assert.equal(
    matchSourceHref(position("wealth"), party),
    `${party.source}#page=61`,
  );
  assert.equal(matchSourceDate(MATCH_SOURCES.fdpSelf, "en-GB"), "April 2024");
  assert.equal(matchSourceDate(MATCH_SOURCES.fdpVote16, "de"), "");
  assert.match(
    matchSourceDate(MATCH_SOURCES.afdHealth, "de"),
    /7\. November 2024/,
  );
});

test("reworded propositions retain their reviewed scope and do not infer answers from neighbouring policies", () => {
  const question = (id) => MATCH_QUESTIONS.find((q) => q.id === id);
  // Against new reactors is not necessarily against reviewing a restart.
  assert.equal(question("nuclear-restart").positions.bsw.value, null);
  assert.equal(question("nuclear-restart").positions.union.value, 1);
  assert.equal(question("nuclear-restart").positions.union.page, 22);
  // Reform must not be recoded as support for outright abolition. The BSW's
  // investment exceptions alone do not settle this exact, broader statement.
  assert.equal(question("debt-abolition").positions.spd.value, -1);
  assert.equal(question("debt-abolition").positions.greens.value, -1);
  assert.equal(question("debt-abolition").positions.left.value, 1);
  assert.equal(question("debt-abolition").positions.bsw.value, null);
  assert.ok(
    Object.values(question("minimum-wage-abolition").positions).every(
      (p) => p.value === -1,
    ),
  );
  // Duties to cooperate/training conditions/minimum support do not by themselves
  // establish a position on this precise financial penalty.
  for (const party of ["bsw", "spd", "greens"])
    assert.equal(question("benefit-sanctions").positions[party].value, null);
  assert.equal(question("benefit-sanctions").positions.left.value, -1);
  // A free conscience vote is not evidence of a unified party position.
  assert.equal(question("abortion").positions.fdp.value, null);
  assert.equal(
    question("cars-2035").positions.spd.source,
    MATCH_SOURCES.spdCars,
  );
  assert.equal(
    question("ip-retention").positions.spd.source,
    MATCH_SOURCES.spdIp,
  );
  assert.equal(
    question("citizenship").positions.spd.source,
    MATCH_SOURCES.spdCitizenship,
  );
  for (const q of MATCH_QUESTIONS) {
    assert.ok(
      Object.values(q.positions).filter((p) => p.value !== null).length >= 3,
    );
    for (const p of Object.values(q.positions))
      if (p.argument)
        for (const lang of ["de", "en-GB", "en-US", "es"])
          assert.ok(localText(p.argument, lang).length > 30);
  }
});
test("lengths nest, preserve stable IDs and have enough evidenced questions", () => {
  for (const n of [8, 16, 30]) {
    const qs = questionsForLength(n);
    assert.equal(qs.length, n);
    assert.deepEqual(qs, questionsForLength(30).slice(0, n));
    assert.ok(qs.filter((q) => isComparable(q)).length >= 4);
  }
  assert.equal(questionsForLength(999).length, 16);
});
test("distance is symmetric; unknown/skipped never becomes a neutral answer", () => {
  for (const a of [-1, 0, 1])
    for (const b of [-1, 0, 1])
      assert.equal(comparePositions(a, b), comparePositions(b, a));
  assert.equal(comparePositions(-1, 1), 0);
  assert.equal(comparePositions(0, 1), 0.5);
  for (const v of [null, undefined, "", "1", 2, NaN, true]) {
    assert.equal(validAnswer(v), false);
    assert.equal(comparePositions(v, 1), null);
  }
});
test("individual answers have no persistence/transmission; explicit release flag and analytics guard", async () => {
  for (const file of [
    "party-match.jsx",
    "party-match-export.jsx",
    "party-match-arguments.jsx",
  ]) {
    const ui = await readFile(
      new URL(`../src/${file}`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(
      ui,
      /localStorage\.setItem|sessionStorage|fetch\(|sendBeacon|trackAggregate|dispatchEvent|searchParams\.set/,
    );
  }
  const main = await readFile(
    new URL("../src/main.jsx", import.meta.url),
    "utf8",
  );
  assert.ok(main.includes("const PartyMatch = WAHLFRAME_UI_ENABLED ? lazy"));
  const feature = await readFile(
    new URL("../src/wahlframe-feature.js", import.meta.url),
    "utf8",
  );
  assert.ok(feature.includes("import.meta.env?.DEV"));
  assert.ok(
    feature.includes('import.meta.env?.VITE_PUBLIC_WAHLFRAME === "true"'),
  );
  const guard = await readFile(
    new URL("../public/analytics-preference.js", import.meta.url),
    "utf8",
  );
  assert.match(
    guard,
    /\["party-match", "party-match-studio"\]\.includes\(accountQuery.get\("view"\)\)/,
  );
});
test("editorial corrections have exact passages, and absence remains absence", () => {
  assert.equal(
    MATCH_QUESTIONS.find((q) => q.id === "asylum").positions.spd.value,
    -1,
  );
  assert.equal(
    MATCH_QUESTIONS.find((q) => q.id === "asylum").positions.spd.page,
    56,
  );
  assert.equal(
    MATCH_QUESTIONS.find((q) => q.id === "rent").positions.union.value,
    1,
  );
  assert.equal(
    MATCH_QUESTIONS.find((q) => q.id === "defence").positions.fdp.value,
    1,
  );
  assert.equal(
    MATCH_QUESTIONS.find((q) => q.id === "cannabis").positions.bsw.value,
    null,
  );
  // A programme covering only previously uninsured self-employed workers
  // cannot prove the proposition that every worker must enter one scheme.
  assert.equal(
    MATCH_QUESTIONS.find((q) => q.id === "pensions").positions.greens.value,
    null,
  );
});
test("analytics are disabled before touching storage, even on a real production hostname", async () => {
  const source = (
    await readFile(
      new URL("../public/analytics-preference.js", import.meta.url),
      "utf8",
    )
  ).replace("export function", "function");
  const run = (search) =>
    vm.runInNewContext(`${source}; analyticsExcluded()`, {
      URLSearchParams,
      location: { search, pathname: "/", hostname: "pollframe.com" },
      navigator: { webdriver: false },
      localStorage: {
        getItem() {
          return null;
        },
        setItem() {
          throw new Error("Unexpected storage write");
        },
      },
    });
  assert.equal(run("?view=party-match&analytics=on"), true);
  assert.equal(run("?view=party-match"), true);
  assert.equal(run("?view=party-match-studio&analytics=on"), true);
  assert.equal(run("?view=studio&topic=personal&analytics=on"), true);
  assert.equal(run(""), false);
});
