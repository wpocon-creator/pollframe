import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { loadSpanishLocale, spanishEvent, spanishSection, spanishText } from "../src/spanish-locale.js";

const source = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const events = JSON.parse(readFileSync(new URL("../public/data/spanish-events.json", import.meta.url)));
const ui = JSON.parse(readFileSync(new URL("../public/data/spanish-ui.json", import.meta.url)));

test("Spanish resources load together and remain cached", async () => {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(url);
    return { ok: true, json: async () => url.includes("spanish-events") ? events : ui };
  };
  try {
    await Promise.all([loadSpanishLocale(), loadSpanishLocale()]);
    await loadSpanishLocale();
    assert.deepEqual(requests.sort(), ["/data/spanish-events.json", "/data/spanish-ui.json"]);
    assert.equal(spanishText("es", "Seats"), "Escaños");
    assert.equal(spanishText("en-GB", "Seats"), "Seats");
    assert.equal(spanishText("es", "DAWUM"), "DAWUM");
    assert.equal(spanishSection("_countries").de.sinceElection, "Desde las elecciones de 2025");
  } finally { globalThis.fetch = original; }
});

test("Spanish shared interface has every English key without relying on English strings", () => {
  const start = source.indexOf("const copy =");
  const end = source.indexOf("function stateLocaleOverrides", start);
  const copy = vm.runInNewContext(`${source.slice(start, end)}; copy`, { spanishSection });
  for (const [key, value] of Object.entries(copy["en-GB"])) {
    assert.equal(typeof copy.es[key], typeof value, key);
    if (typeof value === "string") assert.equal(typeof events._copy[key], "string", `Missing Spanish key: ${key}`);
  }
  assert.equal(copy.es.yearToDateShort, "Año");
  assert.equal(copy.es.seats, "Escaños");
  assert.match(copy.es.seatsOutOf(100), /100 de 630/);
});

test("every German and UK catalog event has Spanish labels and detail", () => {
  const deStart = source.indexOf("const POLITICAL_EVENTS =");
  const deEnd = source.indexOf("\n];", deStart) + 3;
  const de = vm.runInNewContext(`${source.slice(deStart, deEnd)};POLITICAL_EVENTS`);
  const ukStart = source.indexOf("const UK_ELECTION_DATES =");
  const ukEnd = source.indexOf("\nfunction ", ukStart);
  const uk = vm.runInNewContext(`${source.slice(ukStart, ukEnd)};UK_POLITICAL_EVENTS`);
  for (const event of [...de, ...uk]) {
    const translated = spanishEvent(event);
    assert.ok(translated.es?.length, `${event.id}: label`);
    assert.ok(translated.shortEs?.length, `${event.id}: short label`);
    assert.ok(translated.detailEs?.length, `${event.id}: explanation`);
    assert.equal(translated.date, event.date);
    assert.equal(translated.source, event.source);
  }
});

test("translated map overview covers every original label", () => {
  const start = source.indexOf("const overviewLanguage =");
  const end = source.indexOf("function overviewText", start);
  const original = vm.runInNewContext(`${source.slice(start, end)};overviewLanguage`)["en-GB"];
  for (const [key, value] of Object.entries(original)) {
    if (typeof value === "string") assert.ok(events._overview[key], key);
  }
});

test("every dictionary lookup has a Spanish translation and offline caching", () => {
  for (const match of source.matchAll(/spanishText\(locale, ("(?:[^"\\]|\\.)*")\)/g)) {
    const key = JSON.parse(match[1]);
    assert.ok(ui[key], key);
  }
  const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.ok(sw.includes('"/data/spanish-events.json"'));
  assert.ok(sw.includes('"/data/spanish-ui.json"'));
});
