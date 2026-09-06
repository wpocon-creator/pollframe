import { test } from "node:test";
import assert from "node:assert/strict";
import { columnPlan } from "../src/publishing-column-plan.js";

test("a six-party portrait is not forced into the old five-column limit", () => {
  assert.deepEqual(columnPlan(6, 920), { columns: 6, rows: 1 });
  assert.deepEqual(columnPlan(7, 920), { columns: 7, rows: 1 });
  assert.deepEqual(columnPlan(8, 920), { columns: 4, rows: 2 });
  assert.deepEqual(columnPlan(8, 1100), { columns: 8, rows: 1 });
});

test("odd and even rankings remain balanced, ordered and complete", () => {
  for (let count = 1; count <= 24; count++) {
    for (const width of [280, 360, 600, 920, 1400]) {
      const { columns, rows } = columnPlan(count, width);
      assert.ok(rows === 1 || rows === 2);
      if (rows === 2) assert.ok(columns - (count - columns) <= 1);
      else assert.equal(columns, count);
    }
  }
});

test("fit boundary is exact and longer issue labels reserve more width", () => {
  assert.equal(columnPlan(6, 708).rows, 1);
  assert.equal(columnPlan(6, 707).rows, 2);
  assert.equal(columnPlan(6, 920, 148).rows, 2);
  assert.deepEqual(columnPlan(0, 0), { columns: 1, rows: 1 });
});
