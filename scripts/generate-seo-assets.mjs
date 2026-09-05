import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

// A small, deterministic projection of the already vetted public archives.
// The normal data workflow builds and publishes public/data, so this is updated
// alongside the polls, not on an independent editorial schedule.
const regions = JSON.parse(await readFile("public/regions.json", "utf8")).regions;
const snapshots = {};
const fingerprints = {};
for (const slug of [...regions.map((region) => region.slug), "uk-westminster", "spain-congress"]) {
  const file = `data/${slug}.json`;
  const raw = await readFile(`public/${file}`, "utf8");
  const data = JSON.parse(raw);
  fingerprints[file] = createHash("sha256").update(raw).digest("hex");
  // Last row wins ties, matching the app's latest-poll selection. Synthetic
  // averages are not described as individual surveys.
  let latest;
  for (const poll of data.polls) {
    if (poll.synthetic || poll.pollster === "9000") continue;
    if (!latest || poll.date >= latest.date) latest = poll;
  }
  if (!latest) continue;
  assert.match(latest.date, /^\d{4}-\d{2}-\d{2}$/);
  const pollster = data.pollsters[latest.pollster];
  assert.ok(pollster && !/\b(?:ipsos|mori)\b/i.test(pollster));
  const results = Object.entries(latest.results).map(([id, value]) => {
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 100);
    return { id, name: data.parties[id] ?? id, value };
  }).sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
  snapshots[slug] = {
    date: latest.date, dateType: latest.dateType ?? "published", pollster,
    fieldwork: latest.fieldwork ?? null, sample: latest.sample ?? null, results,
    sourceUrl: latest.sourceUrl ?? data.metadata.sourceUrl,
    source: data.metadata.source, compilationUrl: latest.compilationUrl ?? data.metadata.sourceUrl,
    license: latest.license ?? data.metadata.license,
    licenseUrl: latest.license === "CC BY-SA 4.0" ? "https://creativecommons.org/licenses/by-sa/4.0/" : data.metadata.licenseUrl,
    changes: data.metadata.changes,
  };
}
const output = `${JSON.stringify({ version: 1, fingerprints, snapshots })}\n`;
assert.ok(Buffer.byteLength(output) < 60_000, "SEO summary must stay compact");
if (process.argv.includes("--check")) {
  assert.equal(await readFile("public/data/seo-polls.json", "utf8"), output, "SEO snapshot is stale; rebuild it with the polling data");
} else {
  await writeFile("public/data/seo-polls.json", output);
  // ICO supports embedded PNGs. Reuse the approved app mark without redesigning
  // it or depending on a platform-specific image converter.
  const png = await readFile("public/pollframe-app-v2-192.png");
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  header[6] = 192; header[7] = 192;
  header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
  await writeFile("public/favicon.ico", Buffer.concat([header, png]));
}
console.log(`SEO projection verified: ${Object.keys(snapshots).length} parliaments, ${Buffer.byteLength(output)} bytes; source dates and licences preserved`);
