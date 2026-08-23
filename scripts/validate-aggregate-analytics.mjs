import assert from "node:assert/strict";
import { AnalyticsStore } from "../worker/index.js";

class MemoryStorage {
  constructor() { this.values = new Map(); }
  async get(key) { return structuredClone(this.values.get(key)); }
  async put(key, value) { this.values.set(key, structuredClone(value)); }
  async delete(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) this.values.delete(key); }
  async list({ prefix = "" } = {}) { return new Map([...this.values].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key, structuredClone(value)])); }
  async transaction(callback) { return callback(this); }
}

const storage = new MemoryStorage();
await storage.put("day:2020-01-01", { install_completed: 99 });
const store = new AnalyticsStore({ storage });

for (const event of ["install_completed", "install_completed", "install_prompt_accepted", "ios_install_instructions_opened", "country_switch_de", "country_switch_uk", "country_switch_es", "country_switch_all"]) {
  const response = await store.fetch(new Request("https://analytics-store/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event, ip: "must-not-be-stored", userAgent: "must-not-be-stored" }),
  }));
  assert.equal(response.status, 204);
}

const invalid = await store.fetch(new Request("https://analytics-store/", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ event: "page_view" }),
}));
assert.equal(invalid.status, 400);

const report = await (await store.fetch(new Request("https://analytics-store/"))).json();
assert.deepEqual(report.totals, {
  install_completed: 2,
  install_prompt_accepted: 1,
  ios_install_instructions_opened: 1,
  country_switch_de: 1,
  country_switch_uk: 1,
  country_switch_es: 1,
  country_switch_all: 1,
});
assert.equal(report.days["2020-01-01"], undefined, "expired daily aggregate was not deleted");
assert.equal(JSON.stringify(report).includes("must-not-be-stored"), false);
assert.equal([...storage.values.keys()].every((key) => /^day:\d{4}-\d{2}-\d{2}$/.test(key)), true);

console.log("Aggregate analytics validation passed: whitelisted counters, retention and data minimisation");
