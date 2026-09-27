// Backend-only release. Never upload dist/: Studio remains a local draft.
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";

const account = "01c29a77a387ffb473bd403bf08ed0f5";
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/de`;
const config = await readFile(join(homedir(), ".config/.wrangler/config/default.toml"), "utf8");
const token = config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw Error("Run wrangler login first");
const auth = { Authorization: `Bearer ${token}` };
async function api(path, options = {}) {
  const response = await fetch(endpoint + path, { ...options, headers: { ...auth, ...options.headers }, signal: AbortSignal.timeout(60_000) });
  const body = await response.json();
  if (!response.ok || body.success === false) throw Error(`Cloudflare HTTP ${response.status}: ${JSON.stringify(body.errors)}`);
  return body.result;
}
const settings = await api("/settings");
if (!settings.bindings?.some(b => b.type === "assets" && b.name === "ASSETS")) throw Error("Existing production assets binding missing; aborting");
const previous = await api("/deployments");
async function frontendEntries() {
  const response = await fetch("https://pollframe.com/index.html", { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw Error("Public entry could not be checked");
  const entries = [...(await response.text()).matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(match => match[1]).sort();
  if (!entries.length) throw Error("Public asset references missing");
  return entries;
}
const beforeEntries = await frontendEntries();
const bundle = await build({ entryPoints: ["worker/index.js"], bundle: true, write: false, platform: "browser", format: "esm", target: "es2022", sourcemap: false });
const metadata = {
  main_module: "security-worker.js",
  compatibility_date: settings.compatibility_date,
  compatibility_flags: settings.compatibility_flags || [],
  keep_assets: true,
  bindings: [
    ...settings.bindings.filter(b => b.name !== "SECURITY_BURST_LIMITER").map(b => ({ type: "inherit", name: b.name })),
    { type: "ratelimit", name: "SECURITY_BURST_LIMITER", namespace_id: "1001", simple: { limit: 120, period: 60 } },
  ],
  annotations: { "workers/message": "API security hardening; preserve published assets, secrets and data stores" },
};
for (const name of ["limits", "observability", "logpush", "tail_consumers", "placement"]) if (settings[name] !== undefined) metadata[name] = settings[name];
const directory = await mkdtemp(join(tmpdir(), "pollframe-security-release-"));
await writeFile(join(directory, "previous-deployments.json"), JSON.stringify(previous, null, 2), { mode: 0o600 });
await writeFile(join(directory, "settings.json"), JSON.stringify(settings, null, 2), { mode: 0o600 });
await writeFile(join(directory, "metadata.json"), JSON.stringify(metadata, null, 2), { mode: 0o600 });
await writeFile(join(directory, "security-worker.js"), bundle.outputFiles[0].contents, { mode: 0o600 });
console.log(`Prepared backend-only release: ${directory}; ${bundle.outputFiles[0].contents.length} bytes; existing assets retained`);
if (process.argv.includes("--deploy")) {
  const form = new FormData();
  form.set("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.set("security-worker.js", new Blob([bundle.outputFiles[0].contents], { type: "application/javascript+module" }), "security-worker.js");
  const result = await api("?bindings_inherit=strict", { method: "PUT", body: form });
  console.log(JSON.stringify({ deployed: true, id: result.id, startupTimeMs: result.startup_time_ms, assetsPreserved: true }));
  const after = await api("/settings");
  const names = after.bindings.map(b => b.name);
  for (const binding of metadata.bindings) if (!names.includes(binding.name)) throw Error(`Post-deploy binding missing: ${binding.name}`);
  console.log("All previous bindings retained; Cloudflare burst limiter present.");
  if (JSON.stringify(await frontendEntries()) !== JSON.stringify(beforeEntries)) throw Error("Public frontend asset references changed unexpectedly; inspect deployment before proceeding");
  console.log("Verified: published frontend asset references are unchanged.");
}
