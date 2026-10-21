import test from "node:test";
import assert from "node:assert/strict";
import preview from "../worker/account-preview.js";
import {checkedAccountOrigin,ACCOUNT_ORIGIN,ACCOUNT_PREVIEW_ORIGIN} from "../server/account-origin.mjs";
import {accountOptions} from "../server/account-options.mjs";

test("production origin stays fixed; preview is explicit, never inferred from headers",()=>{
  assert.equal(checkedAccountOrigin(),ACCOUNT_ORIGIN);
  for(const origin of ["https://evil.test","https://pollframe.com.evil.test","http://pollframe.com",ACCOUNT_PREVIEW_ORIGIN+"/"])
    assert.throws(()=>checkedAccountOrigin(origin));
  const options=accountOptions({database:{},secret:"x".repeat(48),send:()=>async()=>{},baseURL:ACCOUNT_PREVIEW_ORIGIN});
  assert.deepEqual(options.trustedOrigins,[ACCOUNT_PREVIEW_ORIGIN]);
});
test("preview hides every endpoint without its guard, after expiry or on a wrong host",async()=>{
  const env={PREVIEW_GATE_SECRET:"x".repeat(48),PREVIEW_EXPIRES:Date.now()+60_000};
  for(const path of ["/preview-ready","/api/account/capabilities","/api/auth/sign-up/email"]){
    assert.equal((await preview.fetch(new Request(ACCOUNT_PREVIEW_ORIGIN+path),env)).status,404);
    assert.equal((await preview.fetch(new Request(ACCOUNT_PREVIEW_ORIGIN+path,{headers:{authorization:"Bearer wrong"}}),env)).status,404);
  }
  const headers={authorization:`Bearer ${env.PREVIEW_GATE_SECRET}`};
  assert.equal((await preview.fetch(new Request(ACCOUNT_PREVIEW_ORIGIN+"/preview-ready",{headers}),env)).status,200);
  assert.equal((await preview.fetch(new Request(ACCOUNT_ORIGIN+"/preview-ready",{headers}),env)).status,404);
  assert.equal((await preview.fetch(new Request(ACCOUNT_PREVIEW_ORIGIN+"/preview-ready",{headers}),{...env,PREVIEW_EXPIRES:Date.now()-1})).status,404);
  assert.equal((await preview.fetch(new Request(ACCOUNT_PREVIEW_ORIGIN+"/preview-ready",{headers}),{...env,PREVIEW_EXPIRES:"invalid"})).status,404);
  assert.equal((await preview.fetch(new Request(ACCOUNT_PREVIEW_ORIGIN+"/api/account/capabilities",{headers}),env)).status,503);
});
