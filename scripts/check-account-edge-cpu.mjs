// Opt-in, short-lived runtime probe. Never deploys the application or real keys.
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { hashPassword as referenceHash } from "better-auth/crypto";
import { setTimeout as pause } from "node:timers/promises";

const account = "01c29a77a387ffb473bd403bf08ed0f5";
const root = `https://api.cloudflare.com/client/v4/accounts/${account}/workers`;
const name = `pollframe-auth-probe-${randomBytes(8).toString("hex")}`;
const guard = randomBytes(32).toString("hex");
const expires = Date.now() + 5 * 60_000;
const password = "Fictional runtime benchmark passphrase, not a user credential";
const knownHash = await referenceHash(password);
const entry = `
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { passwordStrength } from "./src/password-policy.js";
const guard = ${JSON.stringify(guard)};
const expires = ${expires};
const password = ${JSON.stringify(password)};
const knownHash = ${JSON.stringify(knownHash)};
export default {
  async fetch(request) {
    const headers = {"cache-control":"no-store", "x-robots-tag":"noindex, nofollow", "content-security-policy":"default-src 'none'"};
    if (Date.now() > expires || request.method !== "POST" || request.headers.get("authorization") !== "Bearer " + guard)
      return new Response("Not found", {status:404, headers});
    try {
      const operation = new URL(request.url).pathname;
      if (operation === "/ready") return Response.json({ready:true}, {headers});
      if (operation === "/strength") {
        const results = [password, "passwortpasswort", "qwertyqwertyqwerty", "a".repeat(128)].map(p => passwordStrength(p).accepted);
        return Response.json({strength:results[0] && results.slice(1).every(v => !v)}, {headers});
      }
      if (operation === "/hash") {
        const hash = await hashPassword(password);
        return Response.json({hashed:typeof hash === "string" && hash.includes(":")}, {headers});
      }
      if (operation === "/verify") {
        const verified = await verifyPassword({hash:knownHash, password});
        return Response.json({verified}, {headers});
      }
      return new Response("Not found", {status:404,headers});
    } catch {
      return Response.json({hashed:false, error:"Hashing failed in edge runtime"}, {status:500,headers});
    }
  }
};`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), sourcefile: "account-cpu-probe.mjs" },
  bundle: true, write: false, platform: "browser", format: "esm", target: "es2022",
  sourcemap: false, logLevel: "silent",
});
console.log(JSON.stringify({prepared:true, bytes:bundle.outputFiles[0].contents.length, realData:false, applicationDeployment:false}));
if (!process.argv.includes("--run")) process.exit(0);

const config = await readFile("/home/william/.config/.wrangler/config/default.toml", "utf8");
const token = config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw Error("Cloudflare login is required");
async function api(path, options={}) {
  const response = await fetch(root + path, {...options, headers:{Authorization:`Bearer ${token}`, ...options.headers},signal:AbortSignal.timeout(30_000)});
  const result = await response.json();
  if (!response.ok || result.success === false) throw Error(`Probe metadata request failed (${response.status})`);
  return result.result;
}
const script = `/scripts/${name}`;
// A new random target only: never touch an existing Worker or any domain route.
const existing = await api("/scripts");
if (existing.some(worker => worker.id === name)) throw Error("Probe target already exists");
const subdomain = (await api("/subdomain")).subdomain;
let created = false;
try {
  const form = new FormData();
  form.set("metadata",new Blob([JSON.stringify({main_module:"probe.mjs",compatibility_date:"2026-07-30",compatibility_flags:["nodejs_compat"],bindings:[],observability:{enabled:false},annotations:{"workers/message":"Temporary guarded password-runtime probe; no app, users, mail, data bindings or paid plan changes"}})],{type:"application/json"}));
  form.set("probe.mjs",new Blob([bundle.outputFiles[0].contents],{type:"application/javascript+module"}),"probe.mjs");
  // Set before awaiting PUT so an uncertain network outcome still triggers cleanup.
  created = true;
  await api(script,{method:"PUT",body:form});
  await api(script+"/subdomain",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({enabled:true,previews_enabled:false})});
  const url = `https://${name}.${subdomain}.workers.dev/`;
  let ready = false;
  for (let attempt=0;attempt<12;attempt++) {
    const response = await fetch(new URL("ready",url),{method:"POST",headers:{authorization:`Bearer ${guard}`},signal:AbortSignal.timeout(10_000)});
    if (response.ok && (await response.json()).ready === true) { ready = true; break; }
    await pause(3000);
  }
  if (!ready) throw Error("Temporary probe route did not become ready; no hashing conclusion can be drawn");
  const anonymous = await fetch(url,{signal:AbortSignal.timeout(15_000)});
  console.log(JSON.stringify({anonymousStatus:anonymous.status}));
  for (const operation of ["strength", "hash", "verify"]) for (let sample=1;sample<=2;sample++) {
    const response = await fetch(new URL(operation,url),{method:"POST",headers:{authorization:`Bearer ${guard}`},signal:AbortSignal.timeout(25_000)});
    const body = await response.text();
    let result;
    try { result = JSON.parse(body); } catch { result = null; }
    console.log(JSON.stringify({operation,sample,status:response.status,strength:result?.strength===true,hashed:result?.hashed===true,verified:result?.verified===true,cpuLimitError:/1102|CPU time limit|exceeded resource limits/i.test(body)}));
    if (!response.ok || (operation === "hash" ? !result?.hashed : operation === "strength" ? !result?.strength : !result?.verified)) process.exitCode = 1;
  }
} finally {
  if (created) {
    try {
      await api(script,{method:"DELETE"});
      console.log(JSON.stringify({temporaryWorkerRemoved:true}));
    } catch {
      console.error(`Temporary probe cleanup needs attention: ${name}. Guard expires after five minutes.`);
      process.exitCode = 1;
    }
  }
}
