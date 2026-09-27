import test from "node:test";
import assert from "node:assert/strict";
import worker, { BugReportStore, AnalyticsStore } from "../worker/index.js";
import { ADMIN_ATTEMPTS, ADMIN_WINDOW_MS, reserveAdminAttempt, readBoundedBody, secureResponse, rateAddress } from "../worker/security.js";

function storage() {
  const data = new Map();
  let queue = Promise.resolve(), alarm = null;
  const store = {
    get: async key => structuredClone(data.get(key)),
    put: async (key, value) => { data.set(key, structuredClone(value)); },
    delete: async keys => { for (const key of Array.isArray(keys) ? keys : [keys]) data.delete(key); },
    list: async ({ prefix = "", startAfter = "", limit = 1000 } = {}) => new Map([...data].filter(([key]) => key.startsWith(prefix) && key > startAfter).sort(([a], [b]) => a.localeCompare(b)).slice(0, limit)),
    getAlarm: async () => alarm,
    setAlarm: async value => { alarm = value; },
    transaction: callback => {
      const next = queue.then(() => callback(store));
      queue = next.catch(() => {});
      return next;
    },
  };
  return store;
}
function environment() {
  const bugStorage = storage(), analyticsStorage = storage();
  const bug = new BugReportStore({ storage: bugStorage });
  const analytics = new AnalyticsStore({ storage: analyticsStorage });
  return {
    BUG_REPORT_ADMIN_KEY: "a-secure-test-key-" + "x".repeat(40),
    BUG_REPORT_STORE: { idFromName: x => x, get: () => bug },
    ANALYTICS_STORE: { idFromName: x => x, get: () => analytics },
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    bugStorage,
  };
}
test('analytics keeps at most 400 calendar days including today',async()=>{
 const data=storage(),store=new AnalyticsStore({storage:data}),now=Date.UTC(2026,8,27);
 const day=age=>'day:'+new Date(now-age*86400000).toISOString().slice(0,10);
 await data.put(day(400),{page:1});await data.put(day(399),{page:1});
 await store.cleanup(now);
 assert.equal(await data.get(day(400)),undefined);assert.deepEqual(await data.get(day(399)),{page:1});
});
test('daily analytics retention is enforced by alarms even without further traffic',async()=>{
  const store=storage(),analytics=new AnalyticsStore({storage:store});
  await store.put('day:2020-01-01',{png_export_downloaded:1});
  await store.put('day:'+new Date().toISOString().slice(0,10),{png_export_downloaded:1});
  await analytics.alarm();
  assert.equal(await store.get('day:2020-01-01'),undefined);
  assert.ok(await store.getAlarm());
});
test('security identifiers are cleaned at their actual expiry without waiting for another visit',async()=>{
 const data=storage(),store=new BugReportStore({storage:data}),now=Date.now();
 await data.put('auth:expired',{until:now-1,count:1});
 await data.put('auth:pending',{until:now+2500,count:1});
 await data.put('rate:expired',[now-3600001]);
 await data.put('report:old',{createdAt:new Date(now-31536000001).toISOString()});
 await store.alarm();
 assert.equal(await data.get('auth:expired'),undefined);
 assert.equal(await data.get('rate:expired'),undefined);
 assert.equal(await data.get('report:old'),undefined);
 assert.equal(await data.getAlarm(),now+2500);
});
function request(path, options = {}) {
  return new Request("https://pollframe.com" + path, {
    ...options,
    headers: { "cf-connecting-ip": "192.0.2.1", ...options.headers },
  });
}
function headersPresent(response) {
  for (const header of ["strict-transport-security", "content-security-policy", "referrer-policy", "permissions-policy", "x-content-type-options", "x-frame-options"]) assert.ok(response.headers.has(header), header);
}

test("excluded analytics submissions do not reach counters or storage", async () => {
  for (const path of ["/api/analytics", "/api/studio-popular"]) {
    for (const byIp of [false, true]) {
      const env = environment();
      if (byIp) env.ANALYTICS_EXCLUDED_IPS = "192.0.2.1";
      const unavailable = { idFromName() { throw Error("Excluded requests must not reach storage"); } };
      env.ANALYTICS_STORE = unavailable;
      const response = await worker.fetch(request(path, {
        method: "POST",
        headers: { origin: "https://pollframe.com", "user-agent": byIp ? "Mozilla/5.0" : "PollframeInternalAudit/1.0" },
        body: JSON.stringify({ event: "qualified_read_60_seconds", template: "poll-classic" }),
      }), env);
      assert.equal(response.status, 204);
      headersPresent(response);
      assert.equal((await env.bugStorage.list()).size, 0);
    }
  }
});

test("IPv6 spelling and privacy-address rotation cannot reset the network limit", () => {
  assert.equal(rateAddress("2001:db8:1:2::abcd"), rateAddress("2001:0DB8:0001:0002:ffff:ffff:ffff:ffff"));
  assert.notEqual(rateAddress("2001:db8:1:2::1"), rateAddress("2001:db8:1:3::1"));
  assert.equal(rateAddress("::ffff:192.0.2.1"), "192.0.2.1");
  assert.equal(rateAddress("192.0.2.1"), "192.0.2.1");
});

test("HTTP API requests redirect to HTTPS before any authentication or storage", async () => {
  const env = environment();
  for (const host of ["pollframe.com", "www.pollframe.com", "de.pollframe.workers.dev"]) {
    for (const method of ["GET", "POST"]) {
      const response = await worker.fetch(new Request(`http://${host}/api/bug-reports`, { method }), env);
      assert.equal(response.status, 308);
      assert.equal(response.headers.get("location"), `https://${host}/api/bug-reports`);
      headersPresent(response);
    }
  }
  assert.equal((await env.bugStorage.list()).size, 0);
});

test("all API errors, redirects and failures have security headers without leaking details", async () => {
  const env = environment();
  for (const [path, status, options] of [
    ["/api/bug-reports", 401], ["/api/analytics", 401],
    ["/api/bug-reports/anything", 404], ["/api/admin", 404],
    ["/pf-ops/guessed/reports", 404],
    ["/api/bug-reports", 405, { method: "DELETE" }],
    ["/api/analytics", 405, { method: "PATCH" }],
    ["/api/bug-reports", 403, { method: "POST", headers: { origin: "https://evil.example" }, body: "{}" }],
    ["/api/bug-reports", 403, { method: "POST", headers: { origin: "http://pollframe.com" }, body: "{}" }],
  ]) {
    const response = await worker.fetch(request(path, options), env);
    assert.equal(response.status, status, path);
    headersPresent(response);
  }
  const redirect = await worker.fetch(new Request("https://www.pollframe.com/"), env);
  assert.equal(redirect.status, 308); headersPresent(redirect);
  const failed = await worker.fetch(request("/api/bug-reports"), { ...env, BUG_REPORT_STORE: { idFromName() { throw Error("SECRET credentials internal path"); } } });
  assert.equal(failed.status, 503); headersPresent(failed);
  assert.doesNotMatch(await failed.text(), /SECRET|credentials|path/);
});

test("admin brute-force budget is shared between private endpoints and expires", async () => {
  const env = environment();
  for (let i = 0; i < ADMIN_ATTEMPTS; i++) {
    const response = await worker.fetch(request(i % 2 ? "/api/analytics" : "/api/bug-reports", { headers: { "x-pollframe-admin-key": "wrong" } }), env);
    assert.equal(response.status, 401);
  }
  const blocked = await worker.fetch(request("/api/bug-reports"), env);
  assert.equal(blocked.status, 429); assert.ok(Number(blocked.headers.get("retry-after")) > 0); headersPresent(blocked);
  const records = await env.bugStorage.list({ prefix: "auth:" });
  assert.equal(records.size, 1);
  const [key, record] = [...records][0];
  assert.doesNotMatch(key, /192\.0\.2|wrong|secure-test/);
  await env.bugStorage.put(key, { ...record, until: Date.now() - 1 });
  assert.equal((await worker.fetch(request("/api/bug-reports", { headers: { "x-pollframe-admin-key": env.BUG_REPORT_ADMIN_KEY } }), env)).status, 200);
  assert.equal((await env.bugStorage.list({ prefix: "auth:" })).size, 0);
});

test("parallel requests cannot bypass the durable attempt reservation", async () => {
  const store = storage();
  const results = await Promise.all(Array.from({ length: 50 }, () => reserveAdminAttempt(store, "client", 1000)));
  assert.equal(results.filter(result => result.allowed).length, ADMIN_ATTEMPTS);
  assert.equal((await reserveAdminAttempt(store, "client", 1000 + ADMIN_WINDOW_MS)).allowed, true);
});

test("correct keys work repeatedly and oversized or modified keys never authenticate", async () => {
  const env = environment();
  for (let i = 0; i < 16; i++) assert.equal((await worker.fetch(request("/api/analytics", { headers: { "x-pollframe-admin-key": env.BUG_REPORT_ADMIN_KEY } }), env)).status, 200);
  for (const key of [env.BUG_REPORT_ADMIN_KEY + "x", "x".repeat(257)]) assert.equal((await worker.fetch(request("/api/analytics", { headers: { "x-pollframe-admin-key": key } }), env)).status, 401);
});

test("streamed and falsely declared oversized bodies stop before forwarding", async () => {
  const env = environment();
  for (const path of ["/api/bug-reports", "/api/analytics", "/api/studio-popular"]) {
    const response = await worker.fetch(request(path, { method: "POST", headers: { origin: "https://pollframe.com" }, body: "x".repeat(12001) }), env);
    assert.equal(response.status, 413); headersPresent(response);
  }
  let cancelled = false;
  const stream = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(32)); }, cancel() { cancelled = true; } });
  await assert.rejects(readBoundedBody(new Request("https://pollframe.com/", { method: "POST", body: stream, duplex: "half", headers: { "content-length": "1" } }), 16), error => error.status === 413);
  assert.equal(cancelled, true);
});

test("JSON null, arrays and malformed JSON return 400, never an unhandled exception", async () => {
  for (const body of ["null", "[]", "{"]) {
    const env = environment();
    for (const path of ["/api/bug-reports", "/api/analytics", "/api/studio-popular"]) assert.equal((await worker.fetch(request(path, { method: "POST", headers: { origin: "https://pollframe.com" }, body }), env)).status, 400);
  }
});
test("invalid streamed UTF-8 stops the unread body immediately",async()=>{
 let cancelled=false;
 const body=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array([255]));},cancel(){cancelled=true;}});
 await assert.rejects(readBoundedBody(new Request('https://pollframe.com/api/analytics',{method:'POST',body,duplex:'half'}),256),error=>error.status===400);
 assert.equal(cancelled,true);
});

test("parallel report spam is limited without dropping valid single submissions", async () => {
  const env = environment();
  const options = { method: "POST", headers: { origin: "https://pollframe.com" }, body: JSON.stringify({ type: "visual", page: "https://pollframe.com/", message: "Example" }) };
  const responses = await Promise.all(Array.from({ length: 14 }, () => worker.fetch(request("/api/bug-reports", options), env)));
  assert.equal(responses.filter(r => r.status === 201).length, 5);
  assert.equal(responses.filter(r => r.status === 429).length, 9);
});

test("embeds remain frameable and private pages are never cached", () => {
  const embed = secureResponse(new Response("", { headers: { "content-security-policy": "script-src 'self'; frame-ancestors *", "x-frame-options": "DENY" } }), request("/embed.html"));
  assert.equal(embed.headers.has("x-frame-options"), false);
  assert.match(embed.headers.get("content-security-policy"), /frame-ancestors \*/);
  const admin = secureResponse(new Response("", { headers: { "cache-control": "public, max-age=300" } }), request("/pf-ops/test/reports"));
  assert.equal(admin.headers.get("cache-control"), "no-store");
});

test("Cloudflare burst protection short-circuits requests before storage work", async () => {
  let calls = 0;
  const env = { ...environment(), SECURITY_BURST_LIMITER: { limit: async ({ key }) => { calls++; assert.match(key, /^[a-f0-9]{24}$/); return { success: false }; } } };
  const response = await worker.fetch(request("/api/bug-reports"), env);
  assert.equal(response.status, 429); headersPresent(response);
  assert.equal((await env.bugStorage.list()).size, 0); assert.equal(calls, 1);
});
test("unlaunched account routes are inert for every request method",async()=>{
 const env=environment();
 for(const path of ['/api/auth/sign-up/email','/api/auth/reset-password','/api/account/documents','/api/account/test-outbox'])for(const method of ['GET','POST','PUT','DELETE']){
  const response=await worker.fetch(request(path,{method}),env);
  assert.equal(response.status,404);headersPresent(response);
 }
 assert.equal((await env.bugStorage.list()).size,0);
});
