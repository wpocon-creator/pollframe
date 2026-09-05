import assert from "node:assert/strict";
import test from "node:test";
import { eligibleWatchlistAlerts, processWatchlistAlerts } from "../src/watchlistAlerts.js";

const now = Date.parse("2026-09-05T12:00:00Z");
const signals = [{ id: "de:party:4:2026-09-04:move:15", date: "2026-09-04", text: "Grüne +1 Pp." }];
function setup() {
  const data = new Map();
  const calls = [];
  return {
    calls,
    options: { now, signals, country: "de", storage: { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) }, isVisible: () => false, canNotify: () => true, registration: async () => ({ showNotification: async (...args) => calls.push(args) }) },
  };
}

test("alerts survive app restarts and concurrent repeated effects without duplicate notifications", async () => {
  const { options, calls } = setup();
  await Promise.all([processWatchlistAlerts(options), processWatchlistAlerts(options), processWatchlistAlerts(options)]);
  await processWatchlistAlerts({ ...options });
  assert.equal(calls.length, 1);
});
test("changes already displayed do not become delayed system notifications", async () => {
  const { options, calls } = setup();
  await processWatchlistAlerts({ ...options, isVisible: () => true });
  await processWatchlistAlerts(options);
  assert.equal(calls.length, 0);
});
test("becoming visible while the worker is loading suppresses a delayed notification", async () => {
  const { options, calls } = setup();
  let visible = false;
  await processWatchlistAlerts({ ...options, isVisible: () => visible, registration: async () => { visible = true; return options.registration(); } });
  await processWatchlistAlerts(options);
  assert.equal(calls.length, 0);
});
test("failed delivery remains retryable", async () => {
  const { options, calls } = setup();
  await processWatchlistAlerts({ ...options, registration: async () => ({ showNotification: async () => { throw new Error("temporarily unavailable"); } }) });
  await processWatchlistAlerts(options);
  assert.equal(calls.length, 1);
});
test("old, future and duplicate source records cannot notify", () => {
  assert.deepEqual(eligibleWatchlistAlerts([...signals, ...signals, { id: "old", date: "2026-07-02" }, { id: "future", date: "2027-01-01" }, { id: "broken", date: "invalid" }], now), signals);
});
test("no persistent storage means no repeat-prone alerts", async () => {
  const { options, calls } = setup();
  await processWatchlistAlerts({ ...options, storage: { getItem: () => null, setItem: () => { throw new Error("quota"); } } });
  assert.equal(calls.length, 0);
});
test("new source value on the same date can still produce a distinct alert", async () => {
  const { options, calls } = setup();
  await processWatchlistAlerts(options);
  await processWatchlistAlerts({ ...options, signals: [{ ...signals[0], id: `${signals[0].id}:corrected` }] });
  assert.equal(calls.length, 2);
});
