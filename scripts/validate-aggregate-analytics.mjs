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

const allowedEvents = [
  "install_prompt_accepted", "install_completed", "ios_install_instructions_opened", "app_opened_standalone", "engaged_60_seconds",
  "country_switch_de", "country_switch_uk", "country_switch_es", "country_switch_all",
  "view_country_de", "view_country_uk", "view_country_es", "view_country_all",
  "view_history_de", "view_history_uk", "view_history_es", "view_map_de", "view_map_uk", "view_map_es",
  "view_issues_uk", "view_issues_es", "view_approval_de", "view_watchlist",
  "png_dialog_opened", "png_export_downloaded", "png_export_shared", "share_dialog_opened",
  "share_link_copied", "embed_code_copied", "source_note_copied", "csv_downloaded",
];

for (const event of [...allowedEvents, "install_completed"]) {
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
const expectedTotals = Object.fromEntries(allowedEvents.map((event) => [event, event === "install_completed" ? 2 : 1]));
assert.deepEqual(report.totals, expectedTotals);
assert.deepEqual(Object.keys(report.definitions).sort(), [...allowedEvents].sort(), "analytics definitions do not cover the exact event allowlist");
assert.equal(report.days["2020-01-01"], undefined, "expired daily aggregate was not deleted");
assert.equal(JSON.stringify(report).includes("must-not-be-stored"), false);
assert.equal([...storage.values.keys()].every((key) => /^day:\d{4}-\d{2}-\d{2}$/.test(key)), true);

console.log("Aggregate analytics validation passed: whitelisted counters, retention and data minimisation");
