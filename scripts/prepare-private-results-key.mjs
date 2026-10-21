// Production provisioning, deliberately separate from deploy/build. Never
// rotates an existing encryption key or prints its value. A private recovery
// copy remains outside the repository and website, readable only by its owner.
import { readFile, mkdir, open, stat } from "node:fs/promises";
import { randomBytes } from "node:crypto";
const root = "https://api.cloudflare.com/client/v4/accounts/01c29a77a387ffb473bd403bf08ed0f5/workers/scripts/de";
const token = (await readFile("/home/william/.config/.wrangler/config/default.toml", "utf8")).match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw Error("Cloudflare login required");
async function api(path, options = {}) {
  const response = await fetch(root + path, { ...options, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  if (!response.ok || !result.success) throw Error(`Secret provisioning failed (${response.status})`);
  return result.result;
}
const settings = await api("/settings");
if (settings.bindings.some(b => b.name === "PRIVATE_RESULTS_KEY")) {
  console.log("Production result encryption key already present; not changed.");
} else {
  if (settings.bindings.some(b => b.name === "PRIVATE_RESULTS_ENABLED" && b.text === "true")) throw Error("Inspect active result storage before provisioning");
  if (!process.argv.includes("--apply")) {
    console.log("A separate production encryption key and private recovery copy are needed. No change made.");
  } else {
    const directory = "/home/william/.config/pollframe";
    const path = directory + "/production-private-results.key";
    await mkdir(directory, { recursive: true, mode: 0o700 });
    if ((await stat(directory)).mode & 0o077) throw Error("Recovery directory must be private");
    try {
      const file = await open(path, "wx", 0o600);
      try { await file.writeFile(randomBytes(32).toString("base64") + "\n"); await file.sync(); }
      finally { await file.close(); }
    } catch (error) { if (error.code !== "EEXIST") throw error; }
    if ((await stat(path)).mode & 0o077) throw Error("Recovery key must be private");
    const key = (await readFile(path, "utf8")).trim();
    if (!/^[A-Za-z0-9+/]{43}=$/.test(key)) throw Error("Invalid recovery key format");
    await api("/secrets", { method: "PUT", body: JSON.stringify({ name: "PRIVATE_RESULTS_KEY", text: key, type: "secret_text" }) });
    console.log("Separate production encryption key configured. Private recovery copy is outside the repository; value not displayed.");
  }
}
