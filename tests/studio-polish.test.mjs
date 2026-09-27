import test from "node:test";
import assert from "node:assert/strict";
import { STUDIO_TEMPLATES, normalizeStudioState } from "../src/studio-model.js";
import { styleDocument, parseStyle } from "../src/studio-editor-files.js";
import { wrapText } from "../src/studio-text-layout.js";
test("every Studio topic has an original website-style composition", () => {
  for (const topic of new Set(STUDIO_TEMPLATES.map((t) => t.topic))) {
    assert.ok(
      STUDIO_TEMPLATES.some(
        (t) => t.topic === topic && t.name.some((n) => n.includes("Original")),
      ),
      topic,
    );
  }
  assert.ok(!STUDIO_TEMPLATES.some((t) => t.topic.startsWith("approval")));
});
test("rounding is bounded, backward compatible and survives style files", () => {
  for (const radius of [0, 2, 24, 58, 80]) {
    const state = normalizeStudioState({ cornerRadius: radius });
    assert.equal(state.cornerRadius, radius);
    assert.equal(
      parseStyle(JSON.stringify(styleDocument(state))).cornerRadius,
      radius,
    );
  }
  assert.equal(normalizeStudioState({ edges: "rounded" }).cornerRadius, 24);
  assert.equal(
    normalizeStudioState({ cornerRadius: Infinity }).cornerRadius,
    0,
  );
  assert.equal(normalizeStudioState({ cornerRadius: 999 }).cornerRadius, 80);
  assert.equal(normalizeStudioState({ cornerRadius: -3 }).cornerRadius, 0);
});
test("long unbroken text wraps without blank first line or lost characters", () => {
  const word = "Bundestagswahlumfragen".repeat(8);
  const lines = wrapText(word, 200, 24, "monospace");
  assert.ok(lines.every((l) => l.length > 0 && l.length <= 12));
  assert.equal(lines.join(""), word);
});
