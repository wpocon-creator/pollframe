// Configuration only. Never uploads code, assets, or enables public accounts.
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const account = "01c29a77a387ffb473bd403bf08ed0f5";
const root = `https://api.cloudflare.com/client/v4/accounts/${account}`;
const config = await readFile(join(homedir(), ".config/.wrangler/config/default.toml"), "utf8");
const token = config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw Error("Cloudflare login is required");
async function api(path, options = {}) {
  const response = await fetch(root + path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  // Never log response bodies, tokens, mail credentials, or secret values.
  if (!response.ok || result.success === false) throw Error(`Cloudflare request failed (${response.status})`);
  return result.result;
}
const worker = "/workers/scripts/de";
const domains = await api("/workers/domains");
if (!domains.some(d => d.hostname === "pollframe.com" && d.service === "de"))
  throw Error("The expected production Worker is not serving pollframe.com");
const before = await api(worker + "/settings");
if (!before.bindings?.some(b => b.name === "ASSETS" && b.type === "assets"))
  throw Error("Published assets binding missing; aborting");
if (before.bindings.some(b => ["ACCOUNTS_ENABLED", "PRIVATE_RESULTS_ENABLED"].includes(b.name) && b.text === "true"))
  throw Error("An account feature is already enabled; inspect its configuration first");
async function entryAssets() {
  const response = await fetch("https://pollframe.com/", {signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw Error("Published website is unavailable");
  const entries = [...(await response.text()).matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(m => m[1]).sort();
  if (!entries.length) throw Error("Cannot verify published asset references");
  return JSON.stringify(entries);
}
const beforeAssets = await entryAssets();
for (const name of ["AUTH_SECRET", "AUTH_FROM"]) {
  if (before.bindings.some(b => b.name === name)) {
    console.log(`${name}: already present; not modified`);
    continue;
  }
  if (!process.argv.includes("--apply")) {
    console.log(`${name}: would add a runtime secret`);
    continue;
  }
  // Generate only in RAM. Never persist or print the authentication secret.
  const text = name === "AUTH_SECRET" ? randomBytes(48).toString("base64url") : "william@pollframe.com";
  await api(worker + "/secrets", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, text, type: "secret_text" }),
  });
  console.log(`${name}: added`);
}
const after = await api(worker + "/settings");
const accountFlagsEnabled = (bindings) => bindings?.some(b => ["ACCOUNTS_ENABLED", "PRIVATE_RESULTS_ENABLED"].includes(b.name) && b.text === "true");
if (accountFlagsEnabled(after.bindings)) throw Error("Account visibility changed during configuration; inspect deployment");
if (process.argv.includes("--apply") && ["AUTH_SECRET", "AUTH_FROM"].some(name => !after.bindings.some(b => b.name === name && b.type === "secret_text")))
  throw Error("A supporting runtime secret is still missing after preparation");
for (const binding of before.bindings) {
  const retained = after.bindings.find(b => b.name === binding.name);
  if (!retained || retained.type !== binding.type) throw Error(`An existing binding changed: ${binding.name}`);
  for (const key of ["namespace_id", "class_name", "id", "text"])
    if (binding[key] !== undefined && retained[key] !== binding[key]) throw Error(`Existing binding configuration changed: ${binding.name}`);
}
if (JSON.stringify(after.compatibility_flags) !== JSON.stringify(before.compatibility_flags))
  throw Error("Compatibility flags changed unexpectedly");
if (await entryAssets() !== beforeAssets) throw Error("Published frontend references changed; inspect deployment");
const deployments = await api(worker + "/deployments");
const active = deployments.deployments?.[0]?.versions || [];
if (!active.length) throw Error("Cannot verify the active runtime configuration");
const names = ["AUTH_SECRET", "AUTH_FROM", "RESEND_API_KEY"];
const activeVersions = [];
for (const {version_id} of active) {
  const version = await api(worker + "/versions/" + version_id);
  if (accountFlagsEnabled(version.resources?.bindings)) throw Error("Public account activation detected; inspect deployment");
  activeVersions.push(version.resources?.bindings || []);
}
console.log(JSON.stringify({
  runtimeSecrets: names.map(name => ({name,present:after.bindings.some(b=>b.name===name&&b.type==="secret_text"),active:activeVersions.every(bindings=>bindings.some(b=>b.name===name&&b.type==="secret_text"))})),
  publishedFrontendUnchanged: true,
  publicAccountsEnabled: accountFlagsEnabled(after.bindings),
}));
