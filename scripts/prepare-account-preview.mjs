// Provisions only the isolated preview. Never uploads application assets to de.
import {build} from "esbuild";
import {readFile,writeFile,mkdtemp} from "node:fs/promises";
import {randomBytes} from "node:crypto";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {ACCOUNT_PREVIEW_ORIGIN} from "../server/account-origin.mjs";

const account="01c29a77a387ffb473bd403bf08ed0f5";
const name="pollframe-accounts-preview";
const database="27b47f20-c612-4f73-b3e4-7645345c2720";
const config=await readFile("/home/william/.config/.wrangler/config/default.toml","utf8");
const token=config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if(!token)throw Error("Cloudflare login required");
const root=`https://api.cloudflare.com/client/v4/accounts/${account}`;
async function api(path,options={}){
  const r=await fetch(root+path,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers},signal:AbortSignal.timeout(30_000)});
  const b=await r.json();
  if(!r.ok||!b.success)throw Error(`Preview setup request failed (${r.status})`);
  return b.result;
}
const databases=await api(`/d1/database/${database}`);
if(databases.name!=="pollframe-accounts-staging"||databases.jurisdiction!=="eu")throw Error("Expected EU staging database missing");
const scripts=await api("/workers/scripts");
if(scripts.some(x=>x.id===name))throw Error("Preview already exists; inspect it instead of overwriting");
const subdomain=await api("/workers/subdomain");
if(subdomain.subdomain!=="pollframe")throw Error("Unexpected preview domain");
const bundle=await build({entryPoints:["worker/account-preview.js"],bundle:true,write:false,platform:"node",external:["node:*"],format:"esm",target:"es2022",sourcemap:false,logLevel:"silent"});
console.log(JSON.stringify({prepared:true,bytes:bundle.outputFiles[0].contents.length,productionModified:false}));
if(!process.argv.includes("--create"))process.exit(0);
const guard=randomBytes(48).toString("base64url");
const expiresAt=Date.now()+2*60*60_000;
const metadata={main_module:"preview.mjs",compatibility_date:"2026-07-30",compatibility_flags:["nodejs_compat"],bindings:[
  {type:"d1",name:"ACCOUNTS_DB",id:database},
  {type:"plain_text",name:"ACCOUNTS_ENABLED",text:"true"},
  {type:"plain_text",name:"PRIVATE_RESULTS_ENABLED",text:"false"},
  {type:"plain_text",name:"PREVIEW_EXPIRES",text:String(expiresAt)},
  {type:"secret_text",name:"PREVIEW_GATE_SECRET",text:guard},
  {type:"secret_text",name:"AUTH_SECRET",text:randomBytes(48).toString("base64url")},
  {type:"secret_text",name:"AUTH_FROM",text:"william@pollframe.com"},
],observability:{enabled:false},logpush:false,annotations:{"workers/message":"Temporary guarded account QA; staging EU DB only; no public app or production data"}};
const form=new FormData();
form.set("metadata",new Blob([JSON.stringify(metadata)],{type:"application/json"}));
form.set("preview.mjs",new Blob([bundle.outputFiles[0].contents],{type:"application/javascript+module"}),"preview.mjs");
await api(`/workers/scripts/${name}`,{method:"PUT",body:form});
await api(`/workers/scripts/${name}/subdomain`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({enabled:true,previews_enabled:false})});
const directory=await mkdtemp(join(tmpdir(),"pollframe-private-account-"));
const path=join(directory,"access.json");
await writeFile(path,JSON.stringify({baseURL:ACCOUNT_PREVIEW_ORIGIN,guard,expiresAt}),{mode:0o600});
console.log(JSON.stringify({created:true,privateAccessFile:path,expiresAt:new Date(expiresAt).toISOString(),mailKeyStillRequired:true,productionModified:false}));
