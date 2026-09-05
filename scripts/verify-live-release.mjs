import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const files = [
  "poll-data.json",
  "regions.json",
  "state-map-data.json",
  "uk-summary.json",
  "spain-summary.json",
  "data/bundestag.json",
  "data/uk-westminster.json",
  "data/spain-congress.json",
  "data/approval.json",
];

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

export async function verifyLiveRelease(origin = "https://pollframe.com") {
const baseUrl = origin.replace(/\/$/, "");
const differences = [];
for (const file of files) {
  const local = JSON.parse(await readFile(resolve("public", file), "utf8"));
  const response = await fetch(`${baseUrl}/${file}`, {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    differences.push(`${file}: live HTTP ${response.status}`);
    continue;
  }
  const live = await response.json();
  if (JSON.stringify(stable(local)) !== JSON.stringify(stable(live))) differences.push(`${file}: live snapshot differs from the released repository snapshot`);
}
if (differences.length) throw new Error(`Live release verification failed:\n- ${differences.join("\n- ")}`);
console.log(`Live release matches ${files.length} critical data files at ${baseUrl}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await verifyLiveRelease(process.argv[2]);
}
