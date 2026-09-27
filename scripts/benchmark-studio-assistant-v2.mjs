import { browserAssistantPlan as before } from "../tests/fixtures/studio-intent-v1.js";
import { browserAssistantPlan as after } from "../src/studio-intent-assistant.js";
import { challenge } from "../tests/fixtures/studio-assistant-challenge.mjs";
import { normalizeStudioState } from "../src/studio-model.js";
import { validateAssistantPlan } from "../src/studio-assistant-contract.js";
import { fileURLToPath } from "node:url";
export function evaluate(planner, cases = challenge) {
  return cases.map(([group, message, expected, context = {}]) => {
    const state = normalizeStudioState({
      lang: "de",
      template: "poll-classic",
      ...context.state,
    });
    const start = performance.now();
    let actual, error;
    try {
      actual = planner(message, state, context);
      validateAssistantPlan(actual, state, {
        eventIds: (context.events || []).map((e) => e.id),
      });
    } catch (e) {
      error = e.message;
    }
    const pass =
      !error &&
      (typeof expected === "string"
        ? actual.kind === expected && Object.keys(actual.patch).length === 0
        : actual.kind === "edit" &&
          Object.keys(actual.patch).every((k) => k in expected) &&
          Object.entries(expected).every(([k, v]) => actual.patch[k] === v));
    return {
      group,
      message,
      expected,
      actual,
      error,
      pass,
      ms: performance.now() - start,
    };
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const results = {};
  for (const [name, planner] of Object.entries({ before, after })) {
    const rows = evaluate(planner);
    results[name] = {
      passed: rows.filter((r) => r.pass).length,
      total: rows.length,
      meanMs: rows.reduce((n, r) => n + r.ms, 0) / rows.length,
      unsafeEdits: rows.filter(
        (r) => typeof r.expected === "string" && r.actual?.kind === "edit",
      ).length,
      rows,
    };
  }
  console.log(JSON.stringify(results, null, 2));
}
