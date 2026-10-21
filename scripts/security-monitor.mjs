// Small daily check. No login attempts, personal data, paid services or writes
// to production. Audit both main and the exact published dependency lockfile.
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sourceDigest } from "./release-provenance.mjs";

export const ORIGIN = "https://pollframe.com";
export function validManifest(value) {
  return value?.schema === 1 && /^[a-f0-9]{40}$/.test(value.sourceRevision)
    && /^[a-f0-9]{64}$/.test(value.sourceDigest) && /^[a-f0-9]{64}$/.test(value.lockDigest);
}
export function headerProblems(headers, embed = false, document = true) {
  const problems = [];
  const csp = headers.get("content-security-policy") || "";
  for (const directive of ["default-src 'none'", "base-uri 'none'", ...(document ? ["object-src 'none'", "script-src 'self'"] : [])])
    if (!csp.includes(directive)) problems.push(`missing ${directive}`);
  if (/script-src[^;]*'unsafe-(?:eval|inline)'/.test(csp)) problems.push("unsafe script policy");
  if (!embed && !csp.includes("frame-ancestors 'none'")) problems.push("page framing allowed");
  if (embed && !csp.includes("frame-ancestors *")) problems.push("journalist embeds blocked");
  if (Number((headers.get("strict-transport-security") || "").match(/max-age=(\d+)/)?.[1] || 0) < 31536000) problems.push("HSTS missing or shortened");
  if (headers.get("x-content-type-options") !== "nosniff") problems.push("nosniff missing");
  if (!headers.has("referrer-policy") || !headers.has("permissions-policy")) problems.push("privacy headers missing");
  if (!embed && headers.get("x-frame-options") !== "DENY") problems.push("frame protection missing");
  if (embed && headers.has("x-frame-options")) problems.push("embed frame header blocks publication");
  return problems;
}
export function auditProblems(report) {
  if (report?.error || !report?.metadata?.vulnerabilities) throw Error("Advisory service did not return a valid audit");
  return Object.entries(report.vulnerabilities || {}).map(([name, item]) => {
    const safeName = /^[a-zA-Z0-9@/_.-]{1,120}$/.test(name) ? name : "dependency";
    return `${safeName}: ${["low", "moderate", "high", "critical"].includes(item.severity) ? item.severity : "review"}`;
  }).sort();
}
function audit(directory) {
  let output;
  try {
    output = execFileSync("npm", ["audit", "--json", "--package-lock-only", "--ignore-scripts"], { cwd: directory, encoding: "utf8", timeout: 90_000, stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    if (!error.stdout) throw Error("Dependency advisory lookup unavailable");
    output = error.stdout;
  }
  return auditProblems(JSON.parse(output));
}
export async function checkLive({ fetcher = fetch, root = "." } = {}) {
  const problems = [];
  async function get(path) {
    const response = await fetcher(ORIGIN + path, {
      redirect: "manual", signal: AbortSignal.timeout(20_000),
      headers: { "user-agent": "PollframeInternalAudit/1.0", "cache-control": "no-cache" },
    });
    return response;
  }
  for (const [path, status, embed] of [["/", 200, false], ["/embed.html", 200, true], ["/api/account/capabilities", 200, false], ["/api/account/documents", 401, false], ["/api/test/outbox", 404, false], ["/wp-config.php", 404, false]]) {
    const response = await get(path);
    const edgeBlocked = path === "/wp-config.php" && response.status === 403;
    if (response.status !== status && !edgeBlocked) problems.push(`${path}: expected HTTP ${status}, received ${response.status}`);
    // Cloudflare may deny a WordPress scanner URL before it reaches our
    // Worker. Its block page does not inherit our application headers.
    if (!edgeBlocked) for (const problem of headerProblems(response.headers, embed, path === "/" || embed)) problems.push(`${path}: ${problem}`);
    // Do not inspect private responses or put response bodies in alert logs.
    await response.body?.cancel();
  }
  const response = await get("/release.json");
  if (response.status !== 200) throw Error("Published release identity unavailable");
  const manifest = await response.json();
  if (!validManifest(manifest)) throw Error("Invalid published release identity");
  if (!/no-store/.test(response.headers.get("cache-control") || "")) problems.push("Release identity may be cached");
  if (manifest.sourceDigest !== await sourceDigest(root)) problems.push("Repository application source differs from published source; review and deploy the tested changes");
  return { manifest, problems };
}
export async function monitor() {
  const problems = [];
  try { for (const issue of audit(".")) problems.push(`Repository dependency ${issue}`); }
  catch { problems.push("Repository dependency advisory check unavailable; not a clean bill of health"); }
  try {
    const { manifest, problems: liveProblems } = await checkLive();
    problems.push(...liveProblems);
    // Only accept a real commit already in this checked-out repository's main
    // ancestry. Never run code or install scripts supplied by the website.
    execFileSync("git", ["merge-base", "--is-ancestor", manifest.sourceRevision, "HEAD"], { stdio: "pipe" });
    const lock = execFileSync("git", ["show", `${manifest.sourceRevision}:package-lock.json`], { encoding: "utf8", maxBuffer: 8_000_000 });
    if (createHash("sha256").update(lock).digest("hex") !== manifest.lockDigest) throw Error("Published lockfile identity does not match source");
    const current = await readFile("package-lock.json", "utf8");
    if (lock !== current) {
      const directory = await mkdtemp(join(tmpdir(), "pollframe-published-audit-"));
      try {
        await writeFile(join(directory, "package-lock.json"), lock);
        await writeFile(join(directory, "package.json"), execFileSync("git", ["show", `${manifest.sourceRevision}:package.json`], { encoding: "utf8" }));
        for (const issue of audit(directory)) problems.push(`Published dependency ${issue}`);
      } finally { await rm(directory, { recursive: true, force: true }); }
    }
  } catch {
    problems.push("Published release verification incomplete: source identity, availability or advisory check failed");
  }
  const unique = [...new Set(problems)].sort();
  return { ok: unique.length === 0, problems: unique, fingerprint: createHash("sha256").update(JSON.stringify(unique)).digest("hex") };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = await monitor();
  if (process.env.POLLFRAME_SECURITY_TEST_ALERT === "true") {
    report.ok = false;
    report.problems.push("Requested alert-delivery test only; this item is not a vulnerability or production failure");
  }
  console.log(JSON.stringify(report, null, 2));
  if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT, `report=${Buffer.from(JSON.stringify(report)).toString("base64")}\n`, { flag: "a" });
  process.exitCode = report.ok ? 0 : 1;
}
