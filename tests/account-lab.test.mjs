import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAccountLab} from '../server/account-lab.mjs';

test('verified accounts, private ownership, CSRF and reset revocation',async()=>{
  const lab=await createAccountLab();
  const base='http://127.0.0.1:4173';
  const password='An independently chosen passphrase 2026!';
  let cookie='';
  const call=async(path,body,method=body?'POST':'GET',extra={})=>{
    const response=await lab.handle(new Request(base+path,{method,headers:{origin:base,'content-type':'application/json',cookie,...extra},...(body?{body:JSON.stringify(body)}:{})}));
    return response;
  };
  async function create(email){
    let response=await call('/api/auth/sign-up/email',{email,password,name:'Test user',callbackURL:base+'/?view=studio'});
    assert.equal(response.status,200,await response.text());
    response=await call('/api/auth/sign-in/email',{email,password});assert.equal(response.status,403);
    const mail=lab.outbox.findLast(m=>m.to===email && m.kind==='verify');assert.ok(mail);
    response=await lab.handle(new Request(mail.url,{headers:{origin:base}}));assert.ok([200,302].includes(response.status));
    response=await call('/api/auth/sign-in/email',{email,password});assert.equal(response.status,200,await response.clone().text());
    const cookies=response.headers.getSetCookie();
    assert.ok(cookies.some(c=>c.includes('HttpOnly')&&c.includes('SameSite=Lax')));
    cookie=cookies.map(c=>c.split(';')[0]).join('; ');assert.ok(cookie);
    return cookie;
  }
  try {
    assert.equal((await call('/api/account/documents')).status,401);
    assert.equal((await call('/api/auth/sign-up/email',{email:'real@example.com',password,name:'No real addresses'})).status,400);
    const alice=await create('alice@example.test');
    const payload={kind:'design',name:'Private test',payload:{template:'poll-classic',headline:'Original',values:[999],source:'fake'}};
    let response=await call('/api/account/documents/shared-id',payload,'PUT');assert.equal(response.status,200);
    const stored=await response.json();assert.equal(stored.payload.source,undefined);assert.equal(stored.payload.values,undefined);
    const bob=await create('bob@example.test');
    assert.equal((await (await call('/api/account/documents')).json()).items.length,0);
    assert.equal((await call('/api/account/documents/shared-id')).status,404);
    assert.equal((await call('/api/account/documents/shared-id',null,'DELETE')).status,404);
    assert.equal((await call('/api/account/documents/shared-id',{...payload,name:'Bob copy'},'PUT')).status,200);
    cookie=alice;assert.equal((await (await call('/api/account/documents/shared-id')).json()).name,'Private test');
    assert.equal((await call('/api/account/documents/shared-id',payload,'PUT',{origin:'https://evil.example'})).status,403);
    assert.equal((await call('/api/account/documents/shared-id',payload,'PUT',{'sec-fetch-site':'cross-site'})).status,403);
    assert.equal((await lab.handle(new Request('http://evil.example/api/account/documents'))).status,403);
    assert.equal((await call('/api/auth/request-password-reset',{email:'alice@example.test',redirectTo:base+'/?view=studio'})).status,200);
    const reset=lab.outbox.findLast(m=>m.kind==='reset');
    const token=new URL(reset.url).pathname.split('/').at(-1);
    response=await call('/api/auth/reset-password',{token,newPassword:password+' changed'});assert.equal(response.status,200,await response.clone().text());
    assert.equal((await call('/api/account/documents')).status,401);
    cookie=bob;
    response=await call('/api/account/documents');assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
    assert.match(response.headers.get('content-security-policy'),/default-src 'none'/);
    await call('/api/auth/sign-out',{});
    assert.equal((await call('/api/account/documents')).status,401);
  } finally {lab.close();}
});

test('login brute force is limited even with forged forwarded-IP headers',async()=>{
  const lab=await createAccountLab();
  try {
    let response;
    for(let i=0;i<6;i++) response=await lab.handle(new Request('http://127.0.0.1:4173/api/auth/sign-in/email',{method:'POST',headers:{origin:'http://127.0.0.1:4173','content-type':'application/json','x-forwarded-for':`192.0.2.${i}`,'x-lab-peer':`192.0.2.${i}`},body:JSON.stringify({email:'missing@example.test',password:'A very long wrong password'})}));
    assert.equal(response.status,429);
  }finally{lab.close();}
});
