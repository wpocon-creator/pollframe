// Private QA helpers: no credentials, codes, cookies or reset links are logged.
import {readFile} from "node:fs/promises";
import {randomBytes} from "node:crypto";
import {ACCOUNT_PREVIEW_ORIGIN} from "../server/account-origin.mjs";

const root="https://api.cloudflare.com/client/v4/accounts/01c29a77a387ffb473bd403bf08ed0f5";
const database="27b47f20-c612-4f73-b3e4-7645345c2720";
async function cloud(path, options={}) {
  const config=await readFile("/home/william/.config/.wrangler/config/default.toml","utf8");
  const token=config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
  if(!token)throw Error("Cloudflare login required");
  const r=await fetch(root+path,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers},signal:AbortSignal.timeout(30_000)});
  const body=await r.json();
  if(!r.ok||!body.success)throw Error(`Private QA metadata request failed (${r.status})`);
  return body.result;
}
export async function previewDatabaseStatus() {
  const result=await cloud(`/d1/database/${database}/query`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sql:"SELECT (SELECT COUNT(*) FROM user) AS users,(SELECT COUNT(*) FROM session) AS sessions,(SELECT COUNT(*) FROM studio_document) AS documents,(SELECT COUNT(*) FROM account) AS credentials,(SELECT COUNT(*) FROM verification) AS verification_tokens;"})});
  return result[0].results[0];
}
export async function startPreviewRun(accessFile) {
  if(!/^\/tmp\/pollframe-private-account-[A-Za-z0-9]+\/access\.json$/.test(accessFile))throw Error("Unexpected private-access file");
  const {baseURL,guard,expiresAt}=JSON.parse(await readFile(accessFile,"utf8"));
  if(baseURL!==ACCOUNT_PREVIEW_ORIGIN||guard?.length<40||Date.now()>expiresAt)throw Error("Private preview access unavailable");
  let cookie="",oldCookie="",password=randomBytes(24).toString("base64url");
  const evidence=[];
  async function call(path,body,{method=body?"POST":"GET",origin=baseURL,jar=cookie,guarded=true}={}) {
    if(!/^\/(?:api\/(?:auth|account)\/|preview-ready)/.test(path))throw Error("Unexpected preview test route");
    const r=await fetch(baseURL+path,{method,headers:{origin,"content-type":"application/json","accept-language":"en-GB",...(guarded?{authorization:`Bearer ${guard}`} :{}),...(jar?{cookie:jar}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:"manual",signal:AbortSignal.timeout(25_000)});
    const cookies=r.headers.getSetCookie();
    let result;try{result=await r.json();}catch{result=null;}
    return {status:r.status,body:result,cookies,headers:r.headers};
  }
  function expect(condition,label){if(!condition)throw Error("Preview check failed: "+label);evidence.push(label);}
  function capture(response){cookie=response.cookies.map(value=>value.split(";")[0]).join("; ");}
  return {
    async preflight(){
      let r=await call("/preview-ready");expect(r.status===200&&r.body.privatePreview,"guarded preview reachable");
      r=await call("/api/account/capabilities",null,{guarded:false});expect(r.status===404,"anonymous preview hidden");
      r=await call("/api/account/capabilities");expect(r.status===200&&r.body.enabled&&r.body.privateResults===false,"account runtime ready; political results disabled");
      r=await call("/api/auth/email-otp/send-verification-otp",{email:"william@pollframe.com",type:"sign-in"},{origin:"https://evil.test"});expect(r.status===403,"cross-origin mail request blocked");
      r=await call("/api/account/test-outbox");expect(r.status===404,"test outbox absent from edge runtime");
      return {checks:[...evidence]};
    },
    async sendCode(){
      const r=await call("/api/auth/email-otp/send-verification-otp",{email:"william@pollframe.com",type:"sign-in"});
      expect(r.status===200,"real code accepted by mail provider");return {accepted:true};
    },
    async acceptCodeFromText(text){
      const code=text.match(/\b\d{6}\b/)?.[0];if(!code)throw Error("No code found in the selected test message");
      let r=await call("/api/auth/sign-in/email-otp",{email:"william@pollframe.com",otp:code,name:"Private account acceptance test"});
      expect(r.status===200&&r.body?.user?.emailVerified===true,"inbox proof creates verified staging account");capture(r);
      expect(r.cookies.some(c=>/HttpOnly/i.test(c)&&/Secure/i.test(c)&&/SameSite=Lax/i.test(c)),"session cookie security attributes");
      r=await call("/api/auth/sign-in/email-otp",{email:"william@pollframe.com",otp:code});expect(r.status===400,"used code cannot be replayed");
      r=await call("/api/account/initial-password",{password});expect(r.status===200,"secure password setup on actual edge runtime");
      r=await call("/api/account/initial-password",{password:password+"again"});expect(r.status===409,"initial setup cannot replace an existing password");
      r=await call("/api/account/documents/qa-design",{kind:"design",name:"Private QA design",payload:{template:"poll-wide",headline:"Private acceptance test",results:{fake:100}}},{method:"PUT"});
      expect(r.status===200&&!Object.hasOwn(r.body?.payload||{},"results"),"design saved; arbitrary polling values discarded");
      r=await call("/api/account/documents/qa-style",{kind:"style",name:"Private QA style",payload:{theme:"dark"}},{method:"PUT"});expect(r.status===200,"style saved");
      r=await call("/api/account/documents",null,{jar:""});expect(r.status===401,"documents unavailable without a session");
      r=await call("/api/auth/sign-in/email",{email:"william@pollframe.com",password},{jar:""});expect(r.status===200,"password sign-in on actual edge runtime");
      oldCookie=cookie;capture(r);
      r=await call("/api/account/documents");expect(r.body?.items?.length===2,"second session retrieves saved designs and styles");
      return {checks:[...evidence]};
    },
    async requestReset(){
      const r=await call("/api/auth/request-password-reset",{email:"william@pollframe.com",redirectTo:baseURL+"/?account=reset"});expect(r.status===200,"real password-reset email requested");return {accepted:true};
    },
    async resetFromText(text){
      const matched=text.match(/https:\/\/pollframe-accounts-preview\.pollframe\.workers\.dev\/api\/auth\/reset-password\/[^\s<>"']+/)?.[0];
      if(!matched)throw Error("No preview reset link in the selected test message");
      const link=new URL(matched.replaceAll("&amp;","&"));
      const token=link.pathname.split("/").at(-1);
      let r=await call(link.pathname+link.search);expect([302,307].includes(r.status),"reset link validated by actual edge runtime");
      const newPassword=randomBytes(24).toString("base64url");
      r=await call("/api/auth/reset-password",{token,newPassword});expect(r.status===200,"password reset completed");password=newPassword;
      r=await call("/api/auth/reset-password",{token,newPassword});expect(r.status===400,"password-reset link is single use");
      r=await call("/api/account/documents",null,{jar:oldCookie});expect(r.status===401,"reset revokes first session");
      r=await call("/api/account/documents");expect(r.status===401,"reset revokes second session");
      r=await call("/api/auth/sign-in/email",{email:"william@pollframe.com",password},{jar:""});expect(r.status===200,"new password signs in");capture(r);
      r=await call("/api/account/documents");expect(r.body?.items?.length===2,"saved documents survive password reset");
      return {checks:[...evidence]};
    },
    async finish(){
      const r=await call("/api/auth/delete-user",{password});expect(r.status===200,"staging account deleted by authenticated user");
      const absent=await call("/api/account/documents");expect(absent.status===401,"deleted session cannot access documents");
      return {checks:[...evidence]};
    },
  };
}
