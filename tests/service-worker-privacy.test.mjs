import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";
const source=await readFile(new URL("../public/sw.js",import.meta.url),"utf8");
function fixture(header="public, max-age=60") {
  const listeners={}, puts=[], deletes=[];
  const cache={put:async(...args)=>puts.push(args),delete:async key=>deletes.push(key),match:async()=>null};
  const context=vm.createContext({URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,
    self:{location:{origin:"https://pollframe.test"},addEventListener:(k,v)=>listeners[k]=v},
    caches:{open:async()=>cache,delete:async key=>deletes.push(key)},
    fetch:async()=>new Response("private profile",{headers:{"cache-control":header}})});
  vm.runInContext(source,context);
  return {context,listeners,puts,deletes};
}
test("private/no-store pages never enter offline caches, ordinary public pages still do",async()=>{
  for(const header of ["private, no-store","no-store","private, max-age=30","public, max-age=60"]){
    const f=fixture(header);f.context.request=new Request("https://pollframe.test/");
    await vm.runInContext('networkFirst(request,"test")',f.context);
    assert.equal(f.puts.length,header.startsWith("public")?1:0);
  }
});
test("private routes, API navigations and verification tokens bypass the worker",()=>{
  const f=fixture();
  for(const path of ["/account","/auth/reset","/api/analytics","/pf-ops/internal/reports","/?view=login","/?token=secret"]){
    let intercepted=false;
    f.listeners.fetch({request:{url:`https://pollframe.test${path}`,method:"GET",mode:"navigate",headers:new Headers()},respondWith:()=>intercepted=true});
    assert.equal(intercepted,false,path);
  }
});
test("authorization headers and Vary star prevent offline reuse",()=>{
  const f=fixture();
  f.context.request=new Request('https://pollframe.test/',{headers:{'x-pollframe-admin-key':'private'}});
  f.context.response=new Response('private');
  assert.equal(vm.runInContext('canCacheResponse(request,response)',f.context),false);
  f.context.request=new Request('https://pollframe.test/');
  for(const vary of ['*','Cookie','Accept-Encoding, Authorization']){
    f.context.response=new Response('private',{headers:{vary}});
    assert.equal(vm.runInContext('canCacheResponse(request,response)',f.context),false);
  }
});
test("navigation preload also respects no-store",async()=>{
  const f=fixture(); f.context.event={request:new Request("https://pollframe.test/"),preloadResponse:Promise.resolve(new Response("private",{headers:{"cache-control":"no-store"}}))};
  await vm.runInContext("navigationResponse(event)",f.context);assert.equal(f.puts.length,0);
});
test("offline static JSON handles preload headers without ignoring private variants",async()=>{
 const f=fixture();
 for(const [vary,allowed] of [['Origin',true],['Accept-Encoding',true],['Origin, Accept-Encoding',true],['Cookie',false],['Authorization',false],['*',false],['X-User',false]]){
  f.context.request=new Request('https://pollframe.test/data/berlin.json');
  f.context.cache={match:async(_request,options)=>options?.ignoreVary?new Response('{}',{headers:{vary}}):undefined};
  assert.equal(Boolean(await vm.runInContext('cachedPublicData(cache,request)',f.context)),allowed,vary);
 }
 f.context.request=new Request('https://pollframe.test/data/berlin.json',{headers:{authorization:'private'}});
 f.context.cache={match:async(_request,options)=>options?.ignoreVary?new Response('{}',{headers:{vary:'Origin'}}):undefined};
 assert.equal(await vm.runInContext('cachedPublicData(cache,request)',f.context),undefined);
 f.context.request=new Request('https://pollframe.test/data/berlin.json');
 f.context.cache={match:async(_request,options)=>options?.ignoreVary?new Response('{}',{headers:{vary:'Origin','cache-control':'private'}}):undefined};
 assert.equal(await vm.runInContext('cachedPublicData(cache,request)',f.context),undefined);
});
