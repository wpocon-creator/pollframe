import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const report = JSON.parse(await readFile(resolve(process.argv[2] ?? "data-update-health.json"), "utf8"));
if (!report.checkedAt || !report.outcomes || !Array.isArray(report.failed)) throw new Error("Invalid data update health report");
if (report.failed.length) {
  throw new Error(`Polling data was published where possible, but these source updates failed: ${report.failed.join(", ")}`);
}
console.log(`All ${Object.keys(report.outcomes).length} polling source groups passed at ${report.checkedAt}`);
