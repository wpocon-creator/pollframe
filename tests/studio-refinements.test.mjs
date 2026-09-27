import test from "node:test";
import assert from "node:assert/strict";
import { STUDIO_TEMPLATES, normalizeStudioState } from "../src/studio-model.js";
import { searchTemplates } from "../src/studio-search.js";
import { searchDescription } from "../src/studio-search-descriptions.js";
import { searchEvents } from "../src/studio-event-search.js";
import { studioCatalogue } from "../src/studio-event-catalogue.js";
import { selectStudioEvents } from "../src/studio-event-selection.js";
import { eventLayout } from "../src/studio-event-layout.js";
import { styleDocument, parseStyle } from "../src/studio-editor-files.js";
import { normalizeTextStyles } from "../src/studio-text-style.js";
import { resetStylePatch, stylePatch } from "../src/studio-style-model.js";

test("misspelled combined intent selects historical AND modern graphics", () => {
  for (const query of [
    "moden, history",
    "modern historie",
    "moderno historia",
  ]) {
    const result = searchTemplates(STUDIO_TEMPLATES, query);
    assert.ok(result.items.length >= 3, query);
    assert.equal(result.fallback, false);
    assert.ok(result.items.every((i) => i.topic === "history"));
    assert.ok(searchDescription(result.items[0]).concepts.includes("modern"));
  }
});
test("event semantics find wars across languages, not every event", () => {
  const events = studioCatalogue("de");
  for (const query of ["war", "guerra", "Krieg", "waer"]) {
    const result = searchEvents(events, query);
    assert.ok(
      result.some((e) => e.id === "studio-gaza-ceasefire-2025"),
      query,
    );
    assert.ok(!result.some((e) => e.id === "studio-budget-2026"), query);
  }
});
test("recent Studio-only events have primary sources and fill multiple positions per layer", () => {
  const state = normalizeStudioState({
    country: "de",
    events: "germany,europe,global",
  });
  const snapshot = {
    start: "2025-09-08",
    end: "2026-09-08",
    eventCatalogue: [],
  };
  const events = selectStudioEvents(snapshot, state).candidates;
  assert.ok(events.length >= 6);
  assert.ok(
    events.every(
      (e) => e.studioOnly && e.source.startsWith("https://") && e.label,
    ),
  );
  const from = Date.parse(snapshot.start),
    span = Date.parse(snapshot.end) - from;
  const packed = eventLayout(events, {
    x: (d) => 72 + ((Date.parse(d) - from) / span) * 780,
    left: 72,
    right: 852,
    layers: 2,
    limit: 12,
  });
  assert.ok(packed.visible.length >= 4);
  assert.ok(packed.visible.filter((e) => e.lane === 0).length >= 2);
  assert.equal(
    selectStudioEvents(snapshot, { ...state, country: "uk" }).candidates.length,
    0,
  );
});
test("portable styles round-trip typography but never data, source wording or executable content", () => {
  const raw = {
    font: "lora",
    subtitleSize: 25,
    textStyles: JSON.stringify({
      sources: { font: "newsreader", italic: true, color: "#123456" },
      values: { scale: 1.2 },
      headline: { weight: 700 },
    }),
    background: "#224466",
    source: "fake",
    results: { afd: 100 },
    editorNote: "private editorial copy",
    events: "fake",
  };
  const file = JSON.stringify(styleDocument(raw));
  assert.ok(file.length < 5000);
  const imported = parseStyle(file);
  assert.equal(imported.subtitleSize, 25);
  assert.deepEqual(normalizeTextStyles(imported.textStyles).sources, {
    font: "newsreader",
    italic: true,
    color: "#123456",
    scale: 1,
    weight: 0,
  });
  for (const key of ["source", "results", "editorNote", "events"])
    assert.equal(imported[key], undefined);
  assert.equal(
    parseStyle(
      JSON.stringify({
        type: "pollframe-style",
        version: 1,
        style: {
          background: "url(https://evil.test)",
          textStyles:
            '{"sources":{"color":"url(evil)","font":"javascript:evil","scale":999}}',
        },
      }),
    ).background,
    "",
  );
  assert.throws(() =>
    parseStyle('{"type":"pollframe-style","version":99,"style":{}}'),
  );
  assert.throws(() => parseStyle(" ".repeat(20001)));
  assert.throws(() =>
    parseStyle('{"type":"pollframe-style","version":1,"style":[]}'),
  );
});
test("reset style preserves content, periods and events; applying style is type-aware", () => {
  const state = normalizeStudioState({
    headline: "Keep this title",
    range: "five",
    historyEventPinned: "ukraine",
    subtitle: "Keep this subtitle",
    font: "lora",
  });
  const reset = normalizeStudioState({ ...state, ...resetStylePatch() });
  for (const key of ["headline", "subtitle", "range", "historyEventPinned"])
    assert.equal(reset[key], state[key]);
  const patch = stylePatch(
    { barScale: 1.6, historyLineWidth: 6 },
    STUDIO_TEMPLATES.find((t) => t.id === "history-original"),
  );
  assert.equal(patch.barScale, undefined);
  assert.equal(patch.historyLineWidth, 6);
});
test("portable files replace device-only fonts with documented defaults", () => {
  const local = "custom-12345678-1234-1234-1234-123456789abc";
  const file = styleDocument({
    font: local,
    textStyles: JSON.stringify({ sources: { font: local } }),
  });
  assert.equal(file.style.font, "auto");
  assert.equal(JSON.parse(file.style.textStyles).sources.font, "auto");
  assert.ok(!JSON.stringify(file).includes(local));
});
