// Destructive ONLY inside the explicitly empty QA database; never production.
// It uses a fictional row to exercise recovery + reconciliation of a deletion.
import {readFile} from "node:fs/promises";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {randomUUID} from "node:crypto";

const account="01c29a77a387ffb473bd403bf08ed0f5";
const database="27b47f20-c612-4f73-b3e4-7645345c2720";
const root=`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}`;
const token=(await readFile("/home/william/.config/.wrangler/config/default.toml","utf8")).match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if(!token)throw Error("Cloudflare login required");
async function api(path,options={}) {
  const r=await fetch(root+path,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers},signal:AbortSignal.timeout(30_000)});
  const b=await r.json();if(!r.ok||!b.success)throw Error(`Staging backup check failed (${r.status})`);return b.result;
}
async function query(sql,params=[]) {
  const r=await api("/query",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sql,params})});
  if(r.some(x=>x.success===false))throw Error("Staging backup query failed");return r[0].results;
}
const meta=await api("");
if(meta.name!=="pollframe-accounts-staging"||meta.jurisdiction!=="eu")throw Error("Refusing to target an unexpected database");
async function counts(){return (await query("SELECT (SELECT COUNT(*) FROM user) AS users,(SELECT COUNT(*) FROM account) AS credentials,(SELECT COUNT(*) FROM session) AS sessions,(SELECT COUNT(*) FROM studio_document) AS documents,(SELECT COUNT(*) FROM verification) AS verifications,(SELECT COUNT(*) FROM private_result) AS politicalResults"))[0];}
const before=await counts();
if(Object.values(before).some(x=>x!==0))throw Error("Staging is not empty; refusing an in-place restore test");
console.log(JSON.stringify({stagingEmpty:true,productionTouched:false}));
if(!process.argv.includes("--run"))process.exit(0);
const run=promisify(execFile);
async function wrangler(operation,extra=[]) {
  const {stdout}=await run(process.execPath,["node_modules/wrangler/bin/wrangler.js","d1","time-travel",operation,"ACCOUNTS_STAGING_DB","--config","wrangler.accounts.jsonc","--json",...extra],{cwd:process.cwd(),timeout:60_000,maxBuffer:500_000});
  return JSON.parse(stdout);
}
const id="restore-qa-"+randomUUID();
try {
  await query('INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,0,?,?)',[id,"Fictional recovery probe",id+"@example.test",Date.now(),Date.now()]);
  const saved=await wrangler("info");
  if(!/^[a-f0-9-]+$/i.test(saved.bookmark||""))throw Error("Backup bookmark unavailable");
  await query('DELETE FROM user WHERE id=?',[id]);
  const boundary=await counts();
  if(Object.values(boundary).some(x=>x!==0))throw Error("Unexpected staging records; stopping before restore");
  await wrangler("restore",["--bookmark",saved.bookmark]);
  const restored=(await query('SELECT COUNT(*) AS n FROM user WHERE id=?',[id]))[0].n;
  if(restored!==1)throw Error("Fictional row did not restore");
  // The current live boundary was empty. Never reactivate the restored account
  // before applying this deletion reconciliation and clearing restored sessions.
  await query('DELETE FROM user WHERE id=?',[id]);
  const after=await counts();
  if(Object.values(after).some(x=>x!==0))throw Error("Staging cleanup incomplete");
  if((await query("PRAGMA foreign_key_check")).length)throw Error("Foreign key check failed");
  console.log(JSON.stringify({restoreWorked:true,deletedFixtureReconciled:true,stagingEmpty:true,foreignKeysValid:true,productionTouched:false}));
} finally {
  await query('DELETE FROM user WHERE id=?',[id]);
}
