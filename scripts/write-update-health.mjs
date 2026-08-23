import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sources = ["germany", "uk", "spain", "spain_regions", "approval"];
const outcomes = Object.fromEntries(sources.map((source) => [source, process.env[`${source.toUpperCase()}_OUTCOME`] ?? "missing"]));
const report = {
  checkedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA ?? null,
  outcomes,
  failed: Object.entries(outcomes).filter(([, outcome]) => outcome !== "success").map(([source]) => source),
};
await writeFile(resolve(process.argv[2] ?? "data-update-health.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(report.failed.length ? `Source failures recorded: ${report.failed.join(", ")}` : "All polling sources completed successfully");
