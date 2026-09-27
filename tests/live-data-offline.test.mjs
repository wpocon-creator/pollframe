import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import worker from '../worker/index.js';

test('public data revalidation saves transfer without hiding a newer release',async(t)=>{
  let tag='"release-one"';
  t.mock.method(globalThis,'fetch',async()=>new Response('{"public":true}',{headers:{'content-type':'application/json',etag:tag}}));
  const env={ASSETS:{fetch(){throw Error('Unexpected fallback');}}};
  const get=condition=>worker.fetch(new Request('https://pollframe.com/data/bundestag.json',{headers:{'if-none-match':condition}}),env);
  for(const condition of ['"release-one"','W/"release-one"','"old", "release-one"']){
    const response=await get(condition);
    assert.equal(response.status,304);assert.equal(await response.text(),'');
    assert.equal(response.headers.get('etag'),tag);
    assert.equal(response.headers.get('content-length'),null);
  }
  tag='"release-two"';
  const changed=await get('"release-one"');
  assert.equal(changed.status,200);assert.equal(await changed.text(),'{"public":true}');
  assert.equal(changed.headers.get('etag'),tag);
});

test('anonymous public proxy responses remain eligible for the real offline cache',async(t)=>{
  const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
  const scope=vm.createContext({URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,
    self:{location:{origin:'https://pollframe.com'},addEventListener(){}}});
  vm.runInContext(source,scope);
  const calls=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    calls.push({url,headers:new Headers(options.headers)});
    return new Response('{"public":true}',{headers:{
      'content-type':'text/plain',vary:'Authorization, Cookie, Accept-Encoding',
      'set-cookie':'upstream=value',etag:'"test-version"',
    }});
  });
  const env={ASSETS:{fetch(){throw Error('Unexpected asset fallback');}}};
  for(const path of ['/regions.json','/state-map-data.json','/uk-summary.json','/spain-summary.json','/data/bundestag.json']){
    const request=new Request('https://pollframe.com'+path);
    const response=await worker.fetch(request,env);
    assert.equal(response.status,200);
    scope.request=request;scope.response=response;
    assert.equal(vm.runInContext('canCacheResponse(request,response)',scope),true,path);
    assert.equal(response.headers.get('etag'),'"test-version"');
    assert.equal(response.headers.get('set-cookie'),null);
    assert.equal(await response.text(),'{"public":true}');
  }
  // Even a signed-in client's public-data request never forwards credentials.
  const signed=new Request('https://pollframe.com/data/bundestag.json',{headers:{authorization:'Bearer private',cookie:'session=private'}});
  const response=await worker.fetch(signed,env);
  scope.request=signed;scope.response=response;
  assert.equal(vm.runInContext('canCacheResponse(request,response)',scope),false,'private requests still excluded');
  for(const call of calls){
    assert.equal(call.headers.has('authorization'),false);
    assert.equal(call.headers.has('cookie'),false);
  }
});
