import {betterAuth} from "better-auth";
import {accountOptions} from "../server/account-options.mjs";
import {normalizeStudioState,isPausedStudioRequest} from "../src/studio-model.js";
import {normalizeStyle} from "../src/studio-style-model.js";

const headers={"cache-control":"no-store, private","content-type":"application/json; charset=utf-8","x-content-type-options":"nosniff","referrer-policy":"no-referrer"};
const json=(body,status=200)=>Response.json(body,{status,headers});
export const accountReady=env=>env.ACCOUNTS_ENABLED === "true" && Boolean(env.ACCOUNTS_DB && env.AUTH_SECRET?.length>=40 && env.RESEND_API_KEY && /^[^\s@]+@pollframe\.com$/.test(env.AUTH_FROM || ""));

export function createAccountService(env,{fetchMail=fetch}={}) {
  if(!accountReady(env))return async()=>json({enabled:false,localOnly:false},503);
  const db=env.ACCOUNTS_DB;
  const send=kind=>async({user,url})=>{
    // Enforce our own hard free-tier ceilings, atomically. Failed sends also
    // consume the allowance. Never silently upgrade or log verification links.
    const day=new Date().toISOString().slice(0,10), month=day.slice(0,7);
    for(const [key,limit] of [[day,95],[month,2800]]) {
      const result=await db.prepare("INSERT INTO mail_budget(period,n) VALUES(?,1) ON CONFLICT(period) DO UPDATE SET n=n+1 WHERE n<? RETURNING n").bind(key,limit).first();
      if(!result)throw Error("Mail allowance exhausted");
    }
    const link=new URL(url);
    if(link.origin!=="https://pollframe.com")throw Error("Invalid mail origin");
    const response=await fetchMail("https://api.resend.com/emails",{method:"POST",
      headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json"},
      body:JSON.stringify({from:`Pollframe <${env.AUTH_FROM}>`,to:[user.email],
        subject:kind==="verify"?"Dein Pollframe-Konto bestätigen":"Pollframe-Passwort zurücksetzen",
        text:`Hallo,\n\n${kind==="verify"?"bitte bestätige deine E-Mail-Adresse für Pollframe":"über diesen Link kannst du ein neues Passwort für Pollframe festlegen"}:\n\n${url}\n\nWenn du diese Nachricht nicht angefordert hast, ignoriere sie.\n\nPollframe`}),
      signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error("Mail delivery unavailable");
  };
  const auth=betterAuth(accountOptions({database:db,secret:env.AUTH_SECRET,send}));
  return async request=>{
    const url=new URL(request.url),path=url.pathname;
    if(url.origin!=="https://pollframe.com")return json({error:"Untrusted host"},403);
    const origin=request.headers.get("origin");
    // Opening a signed email link is a cross-site top-level navigation. It
    // must work without granting cross-site access to sessions/documents.
    const emailLink=request.method==="GET" && (path==="/api/auth/verify-email" || /^\/api\/auth\/reset-password\/[^/]+$/.test(path));
    if(!emailLink && ((origin && origin!==url.origin)||request.headers.get("sec-fetch-site")==="cross-site"))return json({error:"Untrusted origin"},403);
    if(!["GET","POST","PUT","DELETE"].includes(request.method))return json({error:"Method not allowed"},405);
    if(request.method!=="GET" && origin!==url.origin)return json({error:"Origin required"},403);
    if(path==="/api/account/capabilities")return json({enabled:true,localOnly:false,emailDelivery:"verified-domain",subscriptions:false});
    // Explicitly absent in production, even for authenticated users.
    if(path.includes("test-outbox"))return json({error:"Not found"},404);
    let body;
    if(["POST","PUT"].includes(request.method)) {
      if(!request.headers.get("content-type")?.startsWith("application/json"))return json({error:"JSON required"},415);
      if(Number(request.headers.get("content-length"))>100000)return json({error:"Too large"},413);
      const reader=request.body?.getReader(),chunks=[];let size=0;
      if(reader)while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>100000){await reader.cancel();return json({error:"Too large"},413);}chunks.push(value);}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      const raw=new TextDecoder().decode(bytes);
      try{body=JSON.parse(raw);}catch{return json({error:"Invalid JSON"},400);}
      if(!body||typeof body!=="object"||Array.isArray(body))return json({error:"Object required"},400);
      request=new Request(request.url,{method:request.method,headers:request.headers,body:raw});
    }
    if(path.startsWith("/api/auth/")) {
      const result=await auth.handler(request), h=new Headers(result.headers);
      for(const [key,value] of Object.entries(headers))h.set(key,value);
      return new Response(result.body,{status:result.status,headers:h});
    }
    const session=await auth.api.getSession({headers:request.headers});
    if(!session?.user?.emailVerified)return json({error:"Sign in required"},401);
    const owner=session.user.id;
    if(path==="/api/account/documents" && request.method==="GET"){
      const {results}=await db.prepare("SELECT id,kind,name,payload,updated_at FROM studio_document WHERE owner=? ORDER BY updated_at DESC").bind(owner).all();
      return json({items:results.map(({payload,updated_at,...item})=>({...item,payload:JSON.parse(payload),updatedAt:updated_at}))});
    }
    const id=path.match(/^\/api\/account\/documents\/([a-zA-Z0-9_-]{1,80})$/)?.[1];
    if(!id)return json({error:"Not found"},404);
    if(request.method==="DELETE"){
      const result=await db.prepare("DELETE FROM studio_document WHERE owner=? AND id=?").bind(owner,id).run();
      return result.meta.changes?json({deleted:true}):json({error:"Not found"},404);
    }
    if(request.method==="PUT") {
      if(!["design","style"].includes(body.kind)||typeof body.name!=="string"||!body.name.trim()||!body.payload||typeof body.payload!=="object"||Array.isArray(body.payload))return json({error:"Invalid document"},400);
      if(body.kind==="design" && isPausedStudioRequest(body.payload))return json({error:"Approval designs are temporarily unavailable"},409);
      const payload=body.kind==="style"?normalizeStyle(body.payload):normalizeStudioState({...body.payload,workspace:"preview"});
      const name=body.name.trim().slice(0,80),updatedAt=new Date().toISOString();
      // Single statement enforces the per-user limit even under parallel writes.
      const result=await db.prepare("INSERT INTO studio_document(id,owner,kind,name,payload,updated_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM studio_document WHERE owner=?)<100 OR EXISTS(SELECT 1 FROM studio_document WHERE owner=? AND id=?) ON CONFLICT(owner,id) DO UPDATE SET kind=excluded.kind,name=excluded.name,payload=excluded.payload,updated_at=excluded.updated_at").bind(id,owner,body.kind,name,JSON.stringify(payload),updatedAt,owner,owner,id).run();
      return result.meta.changes?json({id,kind:body.kind,name,payload,updatedAt}):json({error:"Maximum 100 documents"},409);
    }
    return json({error:"Method not allowed"},405);
  };
}

const services=new WeakMap();
export async function handleAccounts(request,env) {
  if(!accountReady(env))return json({enabled:false,localOnly:false},503);
  let service=services.get(env);if(!service){service=createAccountService(env);services.set(env,service);}
  try{return await service(request);}catch{return json({error:"Kontodienst derzeit nicht verfügbar. Bitte später erneut versuchen."},503);}
}
