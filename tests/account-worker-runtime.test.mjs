import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';

test('production authentication executes in workerd, not just Node',async()=>{
  const {outputFiles}=await build({entryPoints:['tests/fixtures/account-worker.mjs'],bundle:true,write:false,format:'esm',platform:'node',external:['node:*'],logLevel:'silent'});
  const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:outputFiles[0].text,compatibilityDate:'2026-07-30',compatibilityFlags:['nodejs_compat'],d1Databases:['ACCOUNTS_DB'],bindings:{ACCOUNTS_ENABLED:'true',AUTH_SECRET:'workerd-test-secret-0000000000000000000000000000',RESEND_API_KEY:'local-only',AUTH_FROM:'konto@pollframe.com'}}));
  try{
    const db=await mf.getD1Database('ACCOUNTS_DB');
    const schema=await readFile(new URL('../migrations/accounts/0001_accounts.sql',import.meta.url),'utf8');
    await db.batch(schema.split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
    await db.prepare('CREATE TABLE test_mail(payload TEXT)').run();
    const request=(path,body)=>mf.dispatchFetch('https://pollframe.com'+path,{method:body?'POST':'GET',headers:{origin:'https://pollframe.com','content-type':'application/json','cf-connecting-ip':'192.0.2.10'},...(body?{body:JSON.stringify(body)}:{})});
    const password='Worker runtime test passphrase 2026';
    let r=await request('/api/auth/sign-up/email',{name:'Runtime',email:'worker@example.test',password,callbackURL:'https://pollframe.com/?view=studio'});
    assert.equal(r.status,200,await r.clone().text());
    const mail=JSON.parse((await db.prepare('SELECT payload FROM test_mail').first()).payload);
    const link=new URL(mail.text.match(/https:\/\/\S+/)[0]);
    r=await mf.dispatchFetch(link,{redirect:'manual',headers:{'sec-fetch-site':'cross-site','sec-fetch-mode':'navigate','cf-connecting-ip':'192.0.2.10'}});
    assert.equal(r.status,302,await r.clone().text());
    r=await request('/api/auth/sign-in/email',{email:'worker@example.test',password});
    assert.equal(r.status,200,await r.clone().text());
    assert.ok(r.headers.get('set-cookie')?.includes('HttpOnly'));
  }finally{await mf.dispose();}
});
