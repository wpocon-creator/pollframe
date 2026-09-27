import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  makeTrend,
  makeAverageSeries,
} from "../src/poll-history-calculator.js";
import {
  withHistorySmoothing,
  smoothingExplanation,
} from "../src/studio-smoothing.js";
import { normalizeStudioState } from "../src/studio-model.js";
import { editRecipe } from "../src/studio-edit-model.js";
import { approvalSnapshot } from "../src/studio-approval-model.js";
import { resetStylePatch, normalizeStyle } from "../src/studio-style-model.js";
import {syntheticApproval} from './fixtures/synthetic-approval.mjs';

test("smoothing is a saved calculation choice, not a reusable visual style", () => {
  for (const level of ["auto", "none", "light", "medium", "strong"]) {
    const state = normalizeStudioState({
      template: "history-original",
      historySmoothing: level,
    });
    assert.equal(
      normalizeStudioState(
        Object.fromEntries(new URLSearchParams(editRecipe(state))),
      ).historySmoothing,
      level,
    );
  }
  assert.equal(
    normalizeStudioState({ historySmoothing: "999999" }).historySmoothing,
    "auto",
  );
  assert.equal(
    normalizeStyle({ historySmoothing: "strong" }).historySmoothing,
    undefined,
  );
  assert.equal(resetStylePatch().historySmoothing, undefined);
});

test("every polling smoothing level changes only the trend and preserves reproducibility, endpoints and raw readings", async () => {
  const data = JSON.parse(await readFile("public/data/bundestag.json", "utf8"));
  const input = {
    polls: data.polls,
    selectedPollsters: Object.keys(data.pollsters),
    parties: [{ id: "1" }, { id: "2" }],
    start: "2021-01-01",
    end: data.polls.at(-1).date,
    smoothingDays: 84,
  };
  const trend = makeTrend(
    input.polls,
    input.selectedPollsters,
    input.start,
    input.end,
    input.parties,
    84,
  );
  const snapshot = {
    kind: "history",
    trend,
    smoothingDays: 84,
    averages: makeAverageSeries(
      input.polls,
      input.selectedPollsters,
      trend.map((p) => p.date),
      ["1", "2"],
    ),
    calculationInputs: input,
    latestIndividual: data.polls.at(-1),
    methodologyModes: { trend: ["purpose", "average", "automatic", "sources"] },
  };
  const before = JSON.stringify(snapshot);
  assert.equal(
    withHistorySmoothing(snapshot, { historySmoothing: "auto" }),
    snapshot,
  );
  for (const [level, days] of [
    ["none", 0],
    ["light", 35],
    ["medium", 56],
    ["strong", 112],
  ]) {
    const result = withHistorySmoothing(snapshot, {
      historySmoothing: level,
      lang: "en-GB",
    });
    assert.equal(result.smoothingDays, days);
    assert.notDeepEqual(result.trend, trend);
    assert.deepEqual(result.trend.at(-1), trend.at(-1));
    assert.equal(result.averages, snapshot.averages);
    assert.equal(result.latestIndividual, snapshot.latestIndividual);
    assert.equal(result.calculationInputs.polls, input.polls);
    assert.deepEqual(
      result.trend,
      makeTrend(
        input.polls,
        input.selectedPollsters,
        input.start,
        input.end,
        input.parties,
        result.calculationInputs.smoothingDays,
      ),
    );
    assert.equal(result.methodologyModes.trend[3], "sources");
    assert.match(
      result.methodologyModes.trend[2],
      days ? new RegExp(`±${days}`) : /No additional/,
    );
    if (!days) assert.deepEqual(result.trend, snapshot.averages);
  }
  assert.equal(JSON.stringify(snapshot), before);
});

test("approval smoothing cannot cross administrations or alter term endpoints, including aligned terms", async () => {
  const data = syntheticApproval;
  for (const template of ["approval-original", "approval-aligned"]) {
    const base = {...normalizeStudioState({ range: "all" }),template};
    for (const level of ["auto", "none", "light", "medium", "strong"]) {
      const snapshot = approvalSnapshot(data, {
        ...base,
        historySmoothing: level,
      });
      for (const row of snapshot.rows) {
        const raw = snapshot.averages.filter((p) =>
          Number.isFinite(p.results[row.id]),
        );
        const trend = snapshot.trend.filter((p) =>
          Number.isFinite(p.results[row.id]),
        );
        assert.equal(trend.length, raw.length);
        assert.deepEqual(trend[0], raw[0]);
        assert.deepEqual(trend.at(-1), raw.at(-1));
        if (level === "none") assert.deepEqual(trend, raw);
        for (const p of trend)
          assert.ok(p.results[row.id] >= 0 && p.results[row.id] <= 100);
      }
      assert.match(
        smoothingExplanation(snapshot, "en-GB"),
        level === "none" ? /No smoothing/ : /1:2:1/,
      );
      assert.match(
        snapshot.smoothingNote,
        level === "none" ? /Keine Glättung/ : /1:2:1/,
      );
    }
  }
});
