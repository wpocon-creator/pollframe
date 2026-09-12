import { writeFile, appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { collectDataFreshness } from "./lib/data-freshness.mjs";

const sources = ["election", "germany", "uk", "spain", "spain_issues", "spain_regions", "approval"];
const outcomes = Object.fromEntries(sources.map((source) => [source, process.env[`${source.toUpperCase()}_OUTCOME`] ?? "missing"]));
const report = {
  checkedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA ?? null,
  outcomes,
  freshness: await collectDataFreshness(),
  failed: Object.entries(outcomes).filter(([, outcome]) => outcome !== "success").map(([source]) => source),
};
report.attention = report.freshness.filter(row => !['current', 'archive'].includes(row.status));
// Stale regional polling often reflects sparse publication, not a broken job.
// Missing/future data and an accidentally frozen curated snapshot are failures.
for (const row of report.attention) {
  if (['missing', 'future', 'manual-snapshot'].includes(row.status)) report.failed.push(`data:${row.id}`);
  console.warn(`::warning::${row.id}: ${row.status}; latest observation ${row.date || 'missing'}; age ${row.ageDays ?? '?'} days. Fetch time is not a new measurement.`);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, '\n## Data freshness\n\nA successful download does not mean a new survey was published. Ages refer to observations, not fetch times.\n\n| Series | Latest observation | Age (days) | Status |\n|---|---|---:|---|\n' + report.freshness.map(row => `| ${row.id} | ${row.date || '—'} | ${row.ageDays ?? '—'} | ${row.status} |`).join('\n') + '\n');
}
await writeFile(resolve(process.argv[2] ?? "data-update-health.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(report.failed.length ? `Source failures recorded: ${report.failed.join(", ")}` : "All polling sources completed successfully");
