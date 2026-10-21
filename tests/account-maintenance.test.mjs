import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {Miniflare,convertV4MiniflareOptions} from "miniflare";
import {cleanupAccounts} from "../server/account-maintenance.mjs";

test("daily account cleanup respects live sessions, full throttle windows and verified accounts",async()=>{
  const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:["DB"],compatibilityDate:"2026-07-30"}));
  try {
    const db=await mf.getD1Database("DB");
    const schema=await readFile(new URL("../migrations/accounts/0001_accounts.sql",import.meta.url),"utf8");
    await db.batch(schema.split(";").map(x=>x.trim()).filter(Boolean).map(x=>db.prepare(x)));
    const now=Date.parse("2026-10-19T12:00:00Z"),day=86_400_000;
    for(const [id,verified,created] of [["verified",1,now-30*day],["old-unverified",0,now-8*day],["new-unverified",0,now-day]])
      await db.prepare("INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,?,?,?)").bind(id,id,id+"@example.test",verified,new Date(created).toISOString(),new Date(now).toISOString()).run();
    for(const [id,expiry]of [["live",new Date(now+day).toISOString()],["expired-iso",new Date(now-day).toISOString()],["expired-number",now-day],["unknown","invalid-date"]])
      await db.prepare("INSERT INTO session(id,token,userId,expiresAt,createdAt,updatedAt) VALUES(?,?,'verified',?,?,?)").bind(id,id,expiry,now,now).run();
    for(const [id,expiry]of [["live-code",new Date(now+600_000).toISOString()],["old-code",new Date(now-day).toISOString()]])
      await db.prepare("INSERT INTO verification(id,identifier,value,expiresAt,createdAt,updatedAt) VALUES(?,?,?,?,?,?)").bind(id,"test","hashed-test",expiry,new Date(now).toISOString(),new Date(now).toISOString()).run();
    for(const [id,last]of [["active-throttle",now-3_500_000],["old-throttle",now-2*day]])
      await db.prepare("INSERT INTO rateLimit(id,key,count,lastRequest) VALUES(?,?,2,?)").bind(id,id,last).run();
    for(const period of ["2026-10","2026-10-19","2026-01","2026-01-01"])
      await db.prepare("INSERT INTO mail_budget(period,n) VALUES(?,4)").bind(period).run();
    await db.prepare("INSERT INTO studio_document(id,owner,kind,name,payload,updated_at) VALUES('design','verified','design','Test','{}',?)").bind(new Date(now).toISOString()).run();
    assert.deepEqual(await cleanupAccounts(db,now),{expiredSessions:2,expiredVerifications:1,oldRateLimits:1,oldBudgets:2,unverifiedAccounts:1});
    assert.deepEqual((await db.prepare("SELECT id FROM user ORDER BY id").all()).results.map(x=>x.id),["new-unverified","verified"]);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM studio_document").first()).n,1);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM session").first()).n,2);
    assert.equal((await db.prepare("PRAGMA foreign_key_check").all()).results.length,0);
    await assert.rejects(()=>cleanupAccounts(db,NaN));
  } finally {await mf.dispose();}
});
