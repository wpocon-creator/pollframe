import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {initialDataHints} from '../worker/seo-response.js';
const script=await readFile(new URL('../public/manifest-context.js',import.meta.url),'utf8');
for(const [query,expected] of [
 ['view=studio',['/data/bundestag.json']],
 ['view=studio&region=berlin&editor=1',['/data/berlin.json']],
 ['view=studio&region=berlin&template=map-original',['/state-map-data.json']],
 ['view=studio&topic=map',['/state-map-data.json']],
 ['view=studio&country=uk',[]],
 ['view=studio&region=bad-name',[]],
])test(`initial Studio hints match the requested dataset: ${query}`,()=>{
 const added=[];
 vm.runInNewContext(script,{URLSearchParams,window:{location:{search:'?'+query}},document:{createElement:()=>({}),head:{appendChild:node=>added.push(node)}}});
 assert.deepEqual(added.filter(n=>n.rel==='preload').map(n=>n.href),expected);
 assert.deepEqual(initialDataHints(new URL('https://pollframe.com/?'+query),{berlin:'Berlin'}),expected);
});
