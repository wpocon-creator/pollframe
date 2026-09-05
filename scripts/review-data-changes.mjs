import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { previousMeasurement } from "./lib/data-review.mjs";

const approvals = new Set(JSON.parse(await readFile("data/anomaly-approvals.json", "utf8")).approved ?? []);
const findings = [];
const targets = [
  "public/poll-data.json",
  "public/data/uk-westminster-polls.json",
  "public/data/spain-congress.json",
];

function baseline(path) {
  const ref = process.env.POLLFRAME_REVIEW_BASE_REF || "HEAD";
  return JSON.parse(execFileSync("git", ["show", `${ref}:${path}`], { encoding: "utf8", maxBuffer: 12 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }));
}

function fingerprint(parts) {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

function record(kind, parts, explanation) {
  const id = fingerprint([kind, ...parts]);
  if (!approvals.has(id)) findings.push({ id, explanation });
}

function pollKey(poll) {
  return [poll.date, poll.pollster, ...(poll.fieldwork ?? []), poll.sourceUrl ?? ""].join("|");
}

for (const path of targets) {
  const before = baseline(path);
  const after = JSON.parse(await readFile(path, "utf8"));
  if (!before?.polls || !after?.polls) continue;
  const oldKeys = new Set(before.polls.map(pollKey));
  for (const poll of after.polls.filter((candidate) => !oldKeys.has(pollKey(candidate)))) {
    const previous = previousMeasurement(before.polls, poll.date, (candidate) => candidate.pollster === poll.pollster);
    if (!previous) continue;
    for (const [party, value] of Object.entries(poll.results ?? {})) {
      if (party === "0" || !Number.isFinite(previous.results?.[party])) continue;
      const delta = Math.abs(value - previous.results[party]);
      if (delta >= 15) record("poll-jump", [path, pollKey(poll), party, previous.results[party], value], `${path}: new ${poll.date} poll moves party ${party} by ${delta.toFixed(1)} points versus that pollster's previous measurement`);
    }
  }
}

const approvalPath = "public/data/approval.json";
const oldApproval = baseline(approvalPath);
const newApproval = JSON.parse(await readFile(approvalPath, "utf8"));
for (const country of ["de", "uk"]) {
  for (const metric of ["government", "leader"]) {
    const oldSeries = oldApproval?.countries?.[country]?.series?.[metric] ?? [];
    const newSeries = newApproval?.countries?.[country]?.series?.[metric] ?? [];
    const oldDates = new Set(oldSeries.map((point) => point.date));
    for (const point of newSeries.filter((candidate) => !oldDates.has(candidate.date))) {
      const previous = previousMeasurement(oldSeries, point.date);
      if (!previous) continue;
      for (const answer of ["positive", "negative"]) {
        if (!Number.isFinite(point[answer]) || !Number.isFinite(previous[answer])) continue;
        const delta = Math.abs(point[answer] - previous[answer]);
        if (delta >= 20) record("approval-jump", [country, metric, point.date, answer, previous[answer], point[answer]], `${country}/${metric}: new ${point.date} ${answer} value moves by ${delta.toFixed(1)} points`);
      }
    }
  }
}

if (findings.length) {
  const lines = findings.map(({ id, explanation }) => `- ${explanation}\n  approval id: ${id}`);
  throw new Error(`Unusual new data requires source review. Check the original publication, then add only confirmed ids to data/anomaly-approvals.json:\n${lines.join("\n")}`);
}

console.log("Data-change review passed: no unapproved large single-source movements");
