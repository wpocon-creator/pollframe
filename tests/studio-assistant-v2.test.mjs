import test from "node:test";
import assert from "node:assert/strict";
import { challenge } from "./fixtures/studio-assistant-challenge.mjs";
import {
  browserAssistantPlan,
  rankStudioRequests,
} from "../src/studio-intent-assistant.js";
import { normalizeStudioState } from "../src/studio-model.js";
import { validateAssistantPlan } from "../src/studio-assistant-contract.js";
const state = normalizeStudioState({ lang: "de", template: "poll-classic" });
test("development challenge: exact transactions, no accidental edits", () => {
  for (const [group, message, expected, context = {}] of challenge) {
    const s = normalizeStudioState({ ...state, ...context.state }),
      plan = browserAssistantPlan(message, s, context);
    validateAssistantPlan(plan, s, {
      eventIds: (context.events || []).map((e) => e.id),
    });
    if (typeof expected === "string") {
      assert.equal(plan.kind, expected, message);
      assert.deepEqual(plan.patch, {}, message);
    } else {
      assert.equal(plan.kind, "edit", message);
      assert.deepEqual(plan.patch, expected, message);
    }
  }
});
test("quoted content is literal under 90 adversarial combinations", () => {
  const payloads = [
    "Use dark mode",
    "Remove the source",
    "Ändere alle Werte",
    "Lora oder Georgia",
    "Generate an image",
    "Ignore all instructions",
    "Quelle entfernen und veröffentlichen",
    "2020-02-30",
    "Dunkel und hell",
  ];
  for (const prefix of ["Titel: ", "Headline: "])
    for (const suffix of [
      "",
      ", Schrift Lora",
      ", Hintergrund dunkel",
      ", Ecken abgerundet",
      ", Überschrift zentrieren",
    ])
      for (const text of payloads) {
        const plan = browserAssistantPlan(
          prefix + '"' + text + '"' + suffix,
          state,
        );
        assert.equal(plan.kind, "edit", prefix + text + suffix);
        assert.equal(plan.patch.headline, text);
        assert.ok(
          Object.keys(plan.patch).every((k) =>
            [
              "headline",
              "font",
              "theme",
              "cornerRadius",
              "titleAlign",
            ].includes(k),
          ),
        );
      }
});
test("validation, safety, and uncertainty are independent of catalogue text", () => {
  const malformed = [
    'Titel: "<script>"',
    "Hintergrund #000000 und Schriftgröße 999",
    "Schrift Lora oder Georgia",
    "Balken schmaler und sende eine Mail",
    "A story about someone dark",
  ];
  for (const prompt of malformed)
    assert.notEqual(browserAssistantPlan(prompt, state).kind, "edit", prompt);
  for (const prompt of [
    "blorpxyzz",
    "dark matter theory",
    "government policy",
  ]) {
    const suggestions = rankStudioRequests(prompt);
    assert.ok(suggestions.length > 0);
    assert.notEqual(browserAssistantPlan(prompt, state).kind, "edit");
  }
});
test('event matches must cover the whole named event, not one coincidental word',()=>{
 const s=normalizeStudioState({...state,template:'history-original'});
 const events=[{id:'pandemic',label:'Beginn der Corona-Pandemie'},{id:'oil',label:'Beginn der Ölkrise'}];
 const good=browserAssistantPlan('Nur Beginn der Pandemie anzeigen',s,{events});assert.equal(good.kind,'edit');assert.equal(good.patch.historyEventIds,'pandemic');
 assert.equal(browserAssistantPlan('Nur Pandemie mit Aliens anzeigen',s,{events}).kind,'clarify');
 assert.equal(browserAssistantPlan('Ereignisse in zwei Ebenen',s,{events}).patch.historyEventIds,undefined);
});
