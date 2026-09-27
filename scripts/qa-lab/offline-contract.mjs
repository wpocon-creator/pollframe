// Checks the real Worker response against the real service-worker cache policy.
// Unit mocks with generic public headers missed this cross-component conflict.
import vm from 'node:vm';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const base=process.env.POLLFRAME_TEST_BASE_URL||'http://127.0.0.1:4177';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local only');
const start=performance.now();
const scope=vm.createContext({URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,self:{location:{origin:new URL(base).origin},addEventListener(){}}});
vm.runInContext(await readFile('public/sw.js','utf8'),scope);
const paths=vm.runInContext('[...CORE_DATA]',scope),results=[];
for(const path of paths){
 const request=new Request(new URL(path,base));
 const response=await fetch(request,{signal:AbortSignal.timeout(15000)});
 scope.request=request;scope.response=response;
 const cacheable=vm.runInContext('canCacheResponse(request,response)',scope);
 results.push({path,status:response.status,cacheControl:response.headers.get('cache-control'),vary:response.headers.get('vary'),cacheable});
 await response.body?.cancel();
}
const result={seconds:(performance.now()-start)/1000,results,ok:results.every(r=>r.cacheable)};
await mkdir('test-results/qa-lab',{recursive:true});
await writeFile('test-results/qa-lab/offline-contract.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
process.exitCode=result.ok?0:1;
