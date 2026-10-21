import test from "node:test";
import assert from "node:assert/strict";
import { MATCH_COPY } from "../src/party-match-copy.js";
import { localText } from "../src/party-match-text.js";
import { readFile } from "node:fs/promises";

test("Wahlframe is the product name in every supported language", () => {
  for (const locale of ["de", "en-GB", "en-US", "es"])
    assert.equal(localText(MATCH_COPY.name, locale), "Wahlframe");
});
test("rename preserves private storage and route compatibility and is indexed in Studio", async () => {
  const storage = await readFile(new URL("../src/party-match-storage.js", import.meta.url), "utf8");
  const studio = await readFile(new URL("../src/graphic-studio.jsx", import.meta.url), "utf8");
  const library = await readFile(new URL("../src/party-match-library.jsx", import.meta.url), "utf8");
  assert.ok(storage.includes('indexedDB.open("pollframe-private-results", 1)'));
  assert.ok(storage.includes('|| "Wahlframe"'));
  assert.ok(storage.includes("view=party-match-studio"));
  assert.match(studio, /wahlframe\|parteifinder/);
  assert.match(library, /Wahlframe öffnen/);
});
