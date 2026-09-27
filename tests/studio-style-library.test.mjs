import test from "node:test";
import assert from "node:assert/strict";
import { normalizeStyle, stylePatch } from "../src/studio-style-model.js";
import { normalizeStudioState, STUDIO_TEMPLATES } from "../src/studio-model.js";
import { styleDocument, parseStyle } from "../src/studio-editor-files.js";
import { transparencyText, safeSourceUrl } from "../src/studio-transparency.js";

test("styles never transfer data, editorial content, scales, palette or event selection", () => {
  const unsafe = {
    headline: "False claim",
    subtitle: "Another",
    source: "fake",
    values: [100],
    axisMax: 10,
    historyZero: true,
    historyCustomEvents: "[]",
    historyEventIds: "oil",
    historyLayers: 4,
    elementStyles: "{}",
    palette: "1:#123456",
    parties: "1",
    range: "all",
    metric: "government",
    precision: 0,
    reference: 80,
    theme: "dark",
    titleSize: 50,
  };
  const result = parseStyle(
    JSON.stringify({ type: "pollframe-style", version: 1, style: unsafe }),
  );
  for (const key of Object.keys(unsafe).filter(
    (k) => !["theme", "titleSize"].includes(k),
  ))
    assert.equal(result[key], undefined, key);
  assert.equal(result.titleSize, 50);
  assert.equal(result.theme, "dark");
});
test("every Studio template accepts a style without changing its data settings", () => {
  for (const template of STUDIO_TEMPLATES) {
    const state = normalizeStudioState({
      template: template.id,
      range: "custom",
      start: "2025-01-01",
      end: "2026-01-01",
      headline: "Editorial",
      party: "union",
    });
    const after = normalizeStudioState({
      ...state,
      ...stylePatch(
        {
          font: "serif",
          titleSize: 48,
          barScale: 1.4,
          historyLineWidth: 5,
          theme: "dark",
          cornerRadius: 24,
        },
        template,
      ),
    });
    for (const key of [
      "template",
      "range",
      "start",
      "end",
      "party",
      "parties",
      "metric",
      "answer",
      "headline",
      "source",
      "historyEventIds",
      "historyCustomEvents",
      "axisMax",
      "historyZero",
      "precision",
    ])
      assert.deepEqual(after[key], state[key], `${template.id}: ${key}`);
    assert.equal(after.theme, "dark");
    assert.equal(after.font, "serif");
    assert.equal(after.cornerRadius, 24);
  }
});
test("style roundtrip clamps values and derives sharp corners from zero", () => {
  const style = normalizeStyle({
    cornerRadius: 0,
    edges: "rounded",
    titleSize: 999,
    background: "url(evil)",
  });
  assert.equal(style.edges, "sharp");
  assert.equal(style.titleSize, 64);
  assert.equal(style.background, "");
  assert.deepEqual(parseStyle(JSON.stringify(styleDocument(style))), style);
  assert.equal(
    stylePatch({ barScale: 1.5 }, { topic: "map" }).barScale,
    undefined,
  );
});
test("source note states missing metadata, baseline, map date spread and archival limits", () => {
  const l = (de, en) => en;
  const current = transparencyText(
    { date: "2026-09-08", baselineDate: "2026-08-31", source: "DAWUM" },
    {},
    { topic: "current" },
    l,
  ).join(" ");
  assert.match(current, /2026-08-31/);
  assert.match(current, /sample size/);
  assert.match(current, /not an immutable data archive/);
  const map = transparencyText(
    {
      kind: "map",
      date: "2026-09-08",
      rows: [{ date: "2026-02-01" }, { date: "2026-09-08" }],
    },
    {},
    { topic: "map" },
    l,
  ).join(" ");
  assert.match(map, /2026-02-01 – 2026-09-08/);
  assert.match(map, /does not apply to every region/);
  assert.equal(safeSourceUrl("javascript:alert(1)"), null);
  assert.equal(safeSourceUrl("http://example.com"), null);
  assert.equal(safeSourceUrl("https://dawum.de/API/"), "https://dawum.de/API/");
});
test("known survey metadata and smoothing boundaries are explicit, unsafe links stay out",()=>{
  const text=transparencyText({date:"2026-09-08",sample:2010,fieldwork:["2026-09-04","2026-09-07"],method:"Online",commissioner:"A newsroom",source:"DAWUM",calculationInputs:{polls:[]},latestCalculation:{institutes:3}}, {mode:"trend",lang:"en-GB"},{topic:"history"},(de,en)=>en).join(" ");
  assert.match(text,/Sample: n = 2,010/);assert.match(text,/Fieldwork: 2026-09-04 – 2026-09-07/);assert.match(text,/Commissioner: A newsroom/);assert.match(text,/before time smoothing/);
  assert.equal(safeSourceUrl("https://user:secret@example.com/"),null);
});
