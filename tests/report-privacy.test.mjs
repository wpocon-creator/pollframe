import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {reportPage} from '../worker/security.js';
test('report addresses preserve useful graph settings but exclude private URL content',()=>{
 const value=reportPage('https://user:password@pollframe.com/?view=studio&region=berlin&token=secret&headline=private&back=%2F%3Fkey%3Dsecret#password');
 assert.equal(value,'https://pollframe.com/?view=studio&region=berlin');
 assert.equal(reportPage('https://pollframe.com/pf-ops/secret/reports?key=x'),'https://pollframe.com/');
 for(const url of ['https://evil.test','https://pollframe.com.evil.test','http://pollframe.com','javascript:alert(1)'])assert.throws(()=>reportPage(url));
});
test('analytics stay off on internal pages and token-bearing links even after opt-in',async()=>{
 const script=(await readFile(new URL('../public/analytics-preference.js',import.meta.url),'utf8')).replace('export function','function');
 for(const path of ['/pf-ops/private/reports?analytics=on','/?token=x','/?code=x','/?key=x','/api/auth/verify','/?account=reset']){
  const url=new URL(path,'https://pollframe.com');
  const scope=vm.createContext({URLSearchParams,location:url,navigator:{webdriver:false},localStorage:{getItem:()=>null,removeItem(){},setItem(){}}});
  vm.runInContext(script,scope);assert.equal(vm.runInContext('analyticsExcluded()',scope),true,path);
 }
});
