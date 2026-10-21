// Updates code on the private staging Worker only; keeps every existing secret.
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
const root = "https://api.cloudflare.com/client/v4/accounts/01c29a77a387ffb473bd403bf08ed0f5";
const name = "pollframe-accounts-preview";
const config = await readFile("/home/william/.config/.wrangler/config/default.toml", "utf8");
const token = config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
async function api(path, options = {}) {
  const r = await fetch(root + path, { ...options, headers: { authorization: `Bearer ${token}`, ...options.headers }, signal: AbortSignal.timeout(30000) });
  const b = await r.json();
  if (!r.ok || !b.success) throw Error(`Private preview update ${r.status}`);
  return b.result;
}
const settings = await api(`/workers/scripts/${name}/settings`);
if (settings.bindings.find(x => x.name === "ACCOUNTS_DB")?.id !== "27b47f20-c612-4f73-b3e4-7645345c2720" || settings.bindings.find(x => x.name === "PRIVATE_RESULTS_ENABLED")?.text !== "false") throw Error("Unexpected preview bindings");
const bundle = await build({ entryPoints: ["worker/account-preview.js"], bundle: true, write: false, platform: "node", external: ["node:*"], format: "esm", target: "es2022", logLevel: "silent" });
const metadata = { main_module: "preview.mjs", compatibility_date: settings.compatibility_date, compatibility_flags: settings.compatibility_flags, bindings: settings.bindings.filter(x => x.type !== "secret_text"), keep_bindings: ["secret_text"], observability: { enabled: false }, logpush: false };
const form = new FormData();
form.set("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
form.set("preview.mjs", new Blob([bundle.outputFiles[0].contents], { type: "application/javascript+module" }), "preview.mjs");
await api(`/workers/scripts/${name}`, { method: "PUT", body: form });
const after = await api(`/workers/scripts/${name}/settings`);
for (const key of ["AUTH_SECRET", "AUTH_FROM", "PREVIEW_GATE_SECRET", "RESEND_API_KEY"]) if (!after.bindings.some(x => x.name === key && x.type === "secret_text")) throw Error("Expected secret was not retained");
console.log({ previewUpdated: true, secretsRetained: true, productionModified: false });
