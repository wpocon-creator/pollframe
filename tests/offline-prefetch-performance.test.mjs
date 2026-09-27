import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
test('overlapping offline preparations share requests and keep concurrency bounded',async()=>{
  let active=0,peak=0;const calls=new Map(),puts=[];
  const scope=vm.createContext({URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,
    self:{location:{origin:'https://pollframe.com'},addEventListener(){}},
    caches:{open:async()=>({put:async url=>puts.push(url)})},
    fetch:async path=>{calls.set(path,(calls.get(path)||0)+1);peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,5));active--;return new Response('{}',{headers:{'content-type':'application/json'}});}});
  vm.runInContext(source,scope);
  scope.paths=Array.from({length:12},(_,i)=>`/data/test-${i}.json`);
  const results=await vm.runInContext('Promise.all([cacheDataPaths(paths),cacheDataPaths(paths)])',scope);
  assert.deepEqual([...results],[true,true]);assert.equal(peak,3);assert.equal(puts.length,12);
  for(const count of calls.values())assert.equal(count,1);
  await vm.runInContext('cacheDataPaths(paths.slice(0,1))',scope);
  assert.equal(calls.get('/data/test-0.json'),2,'later refreshes still check the network');
});
