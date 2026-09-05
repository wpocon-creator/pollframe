import assert from "node:assert/strict";
import test from "node:test";
import { parseUkSupplement, assertFreshUkPolls } from "../scripts/lib/uk-supplement.mjs";

const now = new Date("2026-09-05T12:00:00Z");
const headers = ["Date(s)conducted", "Pollster", "Client", "Area", "Samplesize", "Lab", "Con", "Ref", "LD", "Grn", "SNP", "PC", "RB", "Others", "Lead"];
function fixture({ pollster = "YouGov", area = "GB", source = true, label = "31 Aug – 1 Sep", end = "2026-09-01" } = {}) {
  const values = [`<td data-sort-value="${end}">${label}</td>`, `<td>${pollster}<a href="#cite_note-1">[1]</a></td>`, ...["The Times", area, "2,244", "23%", "20%", "23%", "12%", "13%", "3%", "1%", "3%", "<style>bad 99%</style>1%<div class='hidden-content'>Other 1%</div>", "Tie"].map((value) => `<td>${value}</td>`)];
  return `<table class="wikitable"><tr>${headers.map((value) => `<th>${value}</th>`).join("")}</tr><tr>${values.join("")}</tr></table><li id="cite_note-1"><cite>${source ? '<a class="external" href="https://yougov.co.uk/poll">Voting intention</a>' : "No reference"}. 2 September 2026.</cite></li>`;
}
test("supplement keeps publication distinct from cross-month fieldwork and preserves the source", () => {
  const rows = parseUkSupplement(fixture(), "2026-07-02", now);
  assert.equal(rows.length, 8);
  assert.equal(rows[0].start_date, "2026-08-31");
  assert.equal(rows[0].end_date, "2026-09-01");
  assert.equal(rows[0].published, "2026-09-02");
  assert.equal(rows[0].sourceUrl, "https://yougov.co.uk/poll");
  assert.equal(rows.find((row) => row.party_name === "Other").voting_intention, "4");
});
test("UK-wide, withheld, unreferenced, old and future rows are excluded", () => {
  for (const options of [{ area: "UK" }, { pollster: "Ipsos" }, { source: false }, { end: "2026-01-01" }, { end: "2026-09-10" }]) {
    assert.equal(parseUkSupplement(fixture(options), "2026-07-02", now).length, 0);
  }
});
test("a successful fetch containing old polling fails freshness validation", () => {
  assert.throws(() => assertFreshUkPolls([{ date: "2026-07-02" }], now), /stale/);
  assert.throws(() => assertFreshUkPolls([], now), /invalid/);
  assert.doesNotThrow(() => assertFreshUkPolls([{ date: "2026-09-03" }], now));
});

test("later hypothetical scenario tables cannot be imported as national polling", () => {
  assert.equal(parseUkSupplement(fixture() + fixture({pollster: "Alternative leadership"}), "2026-07-02", now).length, 8);
});
