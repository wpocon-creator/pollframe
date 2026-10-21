// Read-only publication evidence audit. No answers, accounts or provider text
// are stored. Network checks are explicit; ordinary tests stay deterministic.
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  MATCH_PARTIES,
  MATCH_QUESTIONS,
  MATCH_EDITION,
} from "../src/party-match-data.js";
import { TOPIC_ROUNDS, questionsForRound } from "../src/party-match-rounds.js";
import { MATCH_SOURCES } from "../src/party-match-sources.js";
const qs = [
  ...new Map(
    [
      ...MATCH_QUESTIONS,
      ...TOPIC_ROUNDS.flatMap((r) => questionsForRound(r.id)),
    ].map((q) => [q.id, q]),
  ).values(),
];
const sourceDirectory = process.argv
  .find((a) => a.startsWith("--pdf-directory="))
  ?.split("=")
  .slice(1)
  .join("=");
const report = {
  edition: MATCH_EDITION,
  questions: qs.length,
  documented: 0,
  unknown: 0,
  programmes: [],
  supplementary: [],
  issues: [],
};
for (const party of MATCH_PARTIES) {
  const rows = qs.map((q) => ({ q, p: q.positions[party.slug] }));
  report.documented += rows.filter((r) => r.p.value !== null).length;
  report.unknown += rows.filter((r) => r.p.value === null).length;
  let pages = null,
    sha256 = null;
  if (sourceDirectory) {
    const pdf = await readFile(`${sourceDirectory}/${party.slug}.pdf`),
      plain = await readFile(`${sourceDirectory}/${party.slug}.txt`, "utf8");
    if (pdf.subarray(0, 5).toString() !== "%PDF-")
      throw Error("Expected programme PDF");
    sha256 = createHash("sha256").update(pdf).digest("hex");
    const split = plain.split("\f");
    pages = split.length - (!split.at(-1).trim() ? 1 : 0);
    for (const { q, p } of rows.filter(
      (r) => r.p.value !== null && !r.p.source,
    ))
      if (!Number.isInteger(p.page) || p.page < 1 || p.page > pages)
        report.issues.push(`${party.slug}/${q.id}: invalid PDF-viewer page`);
  }
  report.programmes.push({
    party: party.slug,
    url: party.source,
    pages,
    sha256,
    documented: rows.filter((r) => r.p.value !== null).length,
  });
}
for (const [id, source] of Object.entries(MATCH_SOURCES)) {
  if (source.date && source.date >= MATCH_EDITION.positionCutoff)
    report.issues.push(`${id}: later than edition cutoff`);
  report.supplementary.push({ id, url: source.url, date: source.date || null });
}
if (process.argv.includes("--network")) {
  for (const source of [...report.programmes, ...report.supplementary]) {
    try {
      const response = await fetch(source.url, {
        headers: { "user-agent": "Pollframe source verification (read-only)" },
        signal: AbortSignal.timeout(20000),
      });
      source.status = response.status;
      source.finalUrl = response.url;
      source.contentType = response.headers.get("content-type");
      // Fully consume/cancel rather than retain entire documents in memory.
      await response.body?.cancel();
      if (!response.ok)
        report.issues.push(
          `${source.id || source.party}: source returned ${response.status}`,
        );
      if (
        source.finalUrl !== source.url &&
        !source.finalUrl.startsWith("https://")
      )
        report.issues.push(`${source.id || source.party}: insecure redirect`);
    } catch (error) {
      source.status = "unavailable";
      report.issues.push(`${source.id || source.party}: request unavailable`);
    }
  }
}
console.log(JSON.stringify(report, null, 2));
if (report.issues.length) process.exitCode = 1;
