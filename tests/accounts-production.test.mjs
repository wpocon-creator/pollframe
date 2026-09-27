import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {createAccountService,accountReady} from '../worker/accounts.js';

test('production gate remains shut without mail and database prerequisites',async()=>{
  assert.equal(accountReady({ACCOUNTS_ENABLED:'true'}),false);
  const response=await createAccountService({})(new Request('https://pollframe.com/api/account/capabilities'));
  assert.equal(response.status,503);
});
test('real D1: verify, secure session, owner isolation, reset, CSRF and private outbox',async()=>{
  const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['ACCOUNTS_DB'],compatibilityDate:'2026-07-30'}));
  try {
    const db=await mf.getD1Database('ACCOUNTS_DB');
    const sql=await readFile(new URL('../migrations/accounts/0001_accounts.sql',import.meta.url),'utf8');
    await db.batch(sql.split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
    const mails=[];
    const env={ACCOUNTS_ENABLED:'true',ACCOUNTS_DB:db,AUTH_SECRET:'local-integration-secret-only-do-not-deploy-00000',RESEND_API_KEY:'local-test',AUTH_FROM:'konto@pollframe.com'};
    const handle=createAccountService(env,{fetchMail:async(_url,options)=>{mails.push(JSON.parse(options.body));return Response.json({id:'fake'});}});
    const call=(path,body,{cookie='',method=body?'POST':'GET',origin='https://pollframe.com',ip='192.0.2.1'}={})=>handle(new Request('https://pollframe.com'+path,{method,headers:{origin,'content-type':'application/json','cf-connecting-ip':ip,...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}));
    const password='A strong test passphrase only 2026';
    assert.equal((await call('/api/account/test-outbox')).status,404);
    assert.equal((await call('/api/auth/sign-up/email',{name:'A',email:'one@example.test',password},{origin:'https://evil.test'})).status,403);
    let r=await call('/api/auth/sign-up/email',{name:'A',email:'one@example.test',password,callbackURL:'https://pollframe.com/?view=studio'});
    assert.equal(r.status,200,await r.text());assert.equal(mails.length,1);
    assert.equal((await call('/api/auth/sign-in/email',{email:'one@example.test',password})).status,403);
    const link=new URL(mails[0].text.match(/https:\/\/\S+/)[0]);
    r=await handle(new Request(link,{headers:{'sec-fetch-site':'cross-site','sec-fetch-mode':'navigate'}}));assert.ok([200,302].includes(r.status),await r.clone().text());
    r=await call('/api/auth/sign-in/email',{email:'one@example.test',password});assert.equal(r.status,200,await r.clone().text());
    const cookies=r.headers.getSetCookie();assert.ok(cookies.some(c=>/HttpOnly/i.test(c)&&/Secure/i.test(c)&&/SameSite=Lax/i.test(c)));
    const cookie=cookies.map(c=>c.split(';')[0]).join('; ');
    r=await call('/api/account/documents/paused',{kind:'design',name:'Approval',payload:{template:'approval-original'}},{cookie,method:'PUT'});
    assert.equal(r.status,409,'Do not silently save a withdrawn approval recipe as a voting-intention poll');
    r=await call('/api/account/documents/shared',{kind:'design',name:'Newsroom',payload:{template:'poll-classic',headline:'Test',results:{'7':100}}},{cookie,method:'PUT'});assert.equal(r.status,200,await r.clone().text());
    assert.equal(Object.hasOwn((await r.json()).payload,'results'),false);
    assert.equal((await call('/api/account/documents')).status,401);
    assert.equal((await (await call('/api/account/documents',null,{cookie})).json()).items.length,1);
    // A second verified account cannot read or delete the first account's ID.
    await call('/api/auth/sign-up/email',{name:'B',email:'two@example.test',password},{ip:'192.0.2.2'});
    const second=new URL(mails.at(-1).text.match(/https:\/\/\S+/)[0]);await call(second.pathname+second.search);
    r=await call('/api/auth/sign-in/email',{email:'two@example.test',password},{ip:'192.0.2.2'});
    const other=r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
    assert.equal((await (await call('/api/account/documents',null,{cookie:other})).json()).items.length,0);
    assert.equal((await call('/api/account/documents/shared',null,{method:'DELETE',cookie:other})).status,404);
    assert.equal((await call('/api/account/test-outbox',null,{cookie})).status,404);
    // Reset mail delivery is real production code, intercepted only at transport.
    await call('/api/auth/request-password-reset',{email:'one@example.test',redirectTo:'https://pollframe.com/?view=studio&account=reset'});
    const reset=new URL(mails.at(-1).text.match(/https:\/\/\S+/)[0]);
    const token=reset.pathname.split('/').at(-1);
    r=await handle(new Request(reset,{headers:{'sec-fetch-site':'cross-site','sec-fetch-mode':'navigate'}}));assert.ok([302,307].includes(r.status));
    r=await call('/api/auth/reset-password',{token,newPassword:password+' new'});assert.equal(r.status,200,await r.clone().text());
    assert.equal((await call('/api/account/documents',null,{cookie})).status,401);
    assert.equal((await call('/api/auth/reset-password',{token,newPassword:password+' again'})).status,400);
    assert.equal((await db.prepare('SELECT n FROM mail_budget WHERE length(period)=10').first()).n,3);
    await call('/api/account/documents/b',{kind:'style',name:'B style',payload:{theme:'dark'}},{cookie:other,method:'PUT'});
    r=await call('/api/auth/delete-user',{password},{cookie:other});assert.equal(r.status,200,await r.clone().text());
    assert.equal((await db.prepare("SELECT count(*) as n FROM studio_document WHERE id='b'").first()).n,0);
    // Exhaust the budget explicitly: provider is never called again.
    await db.prepare('UPDATE mail_budget SET n=95 WHERE length(period)=10').run();
    const sent=mails.length;
    await call('/api/auth/request-password-reset',{email:'one@example.test',redirectTo:'https://pollframe.com/?view=studio&account=reset'},{ip:'192.0.2.3'});
    assert.equal(mails.length,sent);
  } finally {await mf.dispose();}
});
