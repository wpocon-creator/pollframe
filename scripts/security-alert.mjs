// Runs in a separate, issue-write-only job. No deployment or account secrets.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
export const TITLE = "Security maintenance: action required";
export function alertPlan(report, result, existing) {
  const ok = result === "success" && report?.ok === true;
  const problems = ok ? [] : [...(report?.problems || []), ...(result !== "success" ? ["One or more daily checks failed or could not finish; review the linked run."] : [])];
  const fingerprint = createHash("sha256").update(JSON.stringify(problems)).digest("hex");
  if (ok) return existing?.state === "open" ? { action: "close", fingerprint, problems } : { action: "none" };
  if (!existing) return { action: "create", fingerprint, problems };
  if (existing.state === "open" && existing.body?.includes(`<!-- health:${fingerprint} -->`)) return { action: "none" };
  return { action: "update", fingerprint, problems };
}
function api(path, body, method = body ? "POST" : "GET") {
  return JSON.parse(execFileSync("gh", ["api", "--method", method, path, ...(body ? ["--input", "-"] : [])], {
    encoding: "utf8", input: body ? JSON.stringify(body) : undefined,
  }) || "null");
}
export function sendAlert() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo || "")) throw Error("Invalid repository");
  let report;
  try { report = JSON.parse(Buffer.from(process.env.SECURITY_REPORT || "", "base64").toString()); } catch { /* failed install/check is still alerted */ }
  const issues = api(`/repos/${repo}/issues?state=all&per_page=100&creator=github-actions%5Bbot%5D`);
  const existing = issues.find(x => x.title === TITLE && !x.pull_request && x.body?.includes("<!-- pollframe-security-monitor -->"));
  const plan = alertPlan(report, process.env.CHECK_RESULT, existing);
  if (plan.action === "none") { console.log("No changed security alert; no repeat notification."); return; }
  const run = `https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  const body = `<!-- pollframe-security-monitor -->\n<!-- health:${plan.fingerprint} -->\n@${repo.split("/")[0]}\n\n${plan.action === "close" ? "All daily checks are passing again." : "The daily security check needs attention. This is not itself evidence of a breach."}\n\n${plan.problems.map(x => `- ${x}`).join("\n")}\n\n[Review the check results](${run}).\n\nNo automatic deployment was performed. No account data, credentials or raw request logs are included in this issue.`;
  if (plan.action === "create") api(`/repos/${repo}/issues`, { title: TITLE, body });
  else {
    api(`/repos/${repo}/issues/${existing.number}`, { body, state: plan.action === "close" ? "closed" : "open" }, "PATCH");
    api(`/repos/${repo}/issues/${existing.number}/comments`, { body: plan.action === "close" ? `Daily security checks recovered. [Run](${run}).` : `Security-check findings changed. @${repo.split("/")[0]} please review the updated issue. [Run](${run}).` });
  }
  console.log(`Security alert: ${plan.action}.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) sendAlert();
