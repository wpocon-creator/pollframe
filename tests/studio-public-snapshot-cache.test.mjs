import test from "node:test";
import assert from "node:assert/strict";
import {
  recentSnapshots,
  rememberSnapshot,
} from "../src/studio-public-snapshot-cache.js";
test("public snapshot RAM reuse is short-lived, bounded and separated by kind/data key", () => {
  const data = { rows: [{ id: "spd", value: 20 }] };
  rememberSnapshot("current", "de:berlin:de", data, 1000);
  assert.equal(recentSnapshots("current", 1001).get("de:berlin:de"), data);
  assert.equal(recentSnapshots("history", 1001).size, 0);
  assert.throws(()=>rememberSnapshot('private-results','owner',data),/Only public/);
  assert.equal(recentSnapshots('private-results').size,0);
  assert.equal(recentSnapshots("current", 31000).size, 0);
  for (let i = 0; i < 12; i++)
    rememberSnapshot("current", String(i), data, 50000);
  assert.equal(recentSnapshots("current", 50001).size, 4);
  assert.deepEqual(
    [...recentSnapshots("current", 50001).keys()],
    ["8", "9", "10", "11"],
  );
});
