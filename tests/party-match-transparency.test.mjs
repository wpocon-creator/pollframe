import test from "node:test";
import assert from "node:assert/strict";
import { matchEvidenceReceipt } from "../src/party-match-receipt.js";
import {
  MATCH_QUESTIONS,
  MATCH_PARTIES,
  localText,
} from "../src/party-match-data.js";
import { matchSourceHref } from "../src/party-match-sources.js";

test("source receipt preserves every documented and unknown position, exact citations and translations without personal answers", () => {
  for (const locale of ["de", "en-GB", "en-US", "es"]) {
    const receipt = JSON.parse(JSON.stringify(matchEvidenceReceipt(locale)));
    assert.equal(receipt.questions.length, 30);
    assert.equal(receipt.edition.positionCutoff, "2025-02-23");
    assert.ok(receipt.calculation.length > 200);
    assert.ok(receipt.editorialStatus.length > 50);
    assert.ok(JSON.stringify(receipt).length < 250_000);
    assert.equal(receipt.answers, undefined);
    assert.equal(receipt.results, undefined);
    for (const [i, q] of MATCH_QUESTIONS.entries()) {
      assert.equal(receipt.questions[i].statement, localText(q.title, locale));
      assert.equal(receipt.questions[i].context, localText(q.context, locale));
      for (const [j, p] of MATCH_PARTIES.entries()) {
        const position = q.positions[p.slug],
          exported = receipt.questions[i].parties[j];
        assert.equal(exported.position, position.value);
        assert.equal(exported.conclusive, position.value !== null);
        assert.equal(exported.source, matchSourceHref(position, p));
        assert.equal(exported.pdfPage, position.page ?? null);
        assert.equal(exported.sourceDate, position.source?.date ?? null);
      }
    }
  }
});
