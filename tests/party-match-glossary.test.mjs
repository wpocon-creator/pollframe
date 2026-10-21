import test from "node:test";
import assert from "node:assert/strict";
import {
  POLICY_TERMS,
  POLICY_TERM_BY_ID,
  policyTextParts,
  termTitle,
} from "../src/party-match-glossary.js";
import { questionsForLength } from "../src/party-match-data.js";

test("glossary has complete translations, valid sources and unambiguous aliases", () => {
  assert.equal(POLICY_TERM_BY_ID.size, POLICY_TERMS.length);
  for (const locale of ["de", "en", "es"]) {
    const aliases = new Map();
    for (const item of POLICY_TERMS) {
      assert.ok(item.body[locale].length > 80, `${item.id}: ${locale}`);
      assert.ok(termTitle(item, locale).length > 1);
      for (const alias of item.aliases[locale].split("|")) {
        const key = alias.toLowerCase();
        const previous = aliases.get(key);
        assert.ok(
          !previous ||
            previous.id === item.id ||
            (previous.scope &&
              item.scope &&
              !previous.scope.some((q) => item.scope.includes(q))),
          `${key}: ambiguous definition`,
        );
        aliases.set(key, item);
        const parts = policyTextParts(alias, locale, item.scope?.[0]);
        assert.equal(parts.length, 1, alias);
        assert.equal(parts[0].term, item.id, alias);
      }
      if (item.source) assert.equal(new URL(item.source[1]).protocol, "https:");
    }
  }
});

test("rendering preserves all original question and evidence text in every language", () => {
  for (const q of questionsForLength(30)) {
    for (const locale of ["de", "en", "es"]) {
      for (const translated of [
        q.title,
        q.context,
        ...Object.values(q.positions).map((p) => p.note),
      ]) {
        const value = translated[locale];
        const parts = policyTextParts(value, locale, q.id);
        assert.equal(parts.map((p) => p.text).join(""), value);
        for (const part of parts.filter((p) => p.term))
          assert.ok(POLICY_TERM_BY_ID.has(part.term));
      }
    }
  }
});

test("longest aliases win and Unicode boundaries protect longer words", () => {
  assert.deepEqual(
    policyTextParts("Mindestlohnkommission, Mindestlohn.", "de", "wage")
      .filter((p) => p.term)
      .map((p) => p.term),
    ["wage-commission", "minimum-wage"],
  );
  assert.equal(
    policyTextParts("Teillegalisierung von Cannabis", "de", "cannabis")[0].term,
    "partial-legalisation",
  );
  for (const value of [
    "Mindestlohnpolitik",
    "PIBextra",
    "éGDP",
    "GDPñ",
    "notNATO",
    "xTaurus",
    "_Soli",
  ]) {
    assert.ok(!policyTextParts(value, "de", "soli").some((p) => p.term), value);
  }
  assert.equal(policyTextParts("¿PIB?", "es", "defence")[1].term, "gdp");
  assert.equal(
    policyTextParts("CO₂-Preis und CO2-Preis", "de", "carbon").filter(
      (p) => p.term,
    ).length,
    2,
  );
});

test("foreign-policy sanctions and tax exemptions do not leak into other contexts", () => {
  for (const [locale, value] of [
    ["de", "Sanktionen"],
    ["en", "sanctions"],
    ["es", "sanciones"],
  ]) {
    assert.equal(
      policyTextParts(value, locale, "russia")[0].term,
      "economic-sanctions",
    );
    assert.ok(!policyTextParts(value, locale, "welfare").some((p) => p.term));
  }
  assert.ok(!policyTextParts("Ausnahmen", "de", "rent").some((p) => p.term));
  assert.equal(
    policyTextParts("Bürgerversicherung", "de", "health")[0].term,
    "citizens-insurance",
  );
  assert.equal(
    policyTextParts("Bürgerversicherung", "de", "pensions")[0].term,
    "pension",
  );
  assert.ok(
    !policyTextParts("freiwilliger Wehrdienst", "de", "conscription").some(
      (p) => p.term === "conscription",
    ),
  );
  assert.equal(
    policyTextParts("Ausnahmen", "de", "inheritance")[0].term,
    "tax-exemption",
  );
});

test("all technical question topics have explanations in each language", () => {
  for (const q of questionsForLength(30).filter(
    (q) => !["cash", "speed"].includes(q.id),
  )) {
    for (const locale of ["de", "en", "es"]) {
      assert.ok(
        policyTextParts(
          `${q.title[locale]} ${q.context[locale]}`,
          locale,
          q.id,
        ).some((p) => p.term),
        `${q.id}: ${locale}`,
      );
    }
  }
  assert.deepEqual(
    policyTextParts("wealth tax", "en-US", "wealth"),
    policyTextParts("wealth tax", "en-GB", "wealth"),
  );
  assert.deepEqual(policyTextParts("", "de", "wealth"), []);
  assert.deepEqual(
    policyTextParts("<script>alert('no')</script>", "en", "wealth"),
    [{ text: "<script>alert('no')</script>" }],
  );
});
