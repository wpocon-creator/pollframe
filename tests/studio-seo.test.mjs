import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {load} from 'cheerio';
import worker from '../worker/index.js';
import {STUDIO_TEMPLATES} from '../src/studio-model.js';
import {studioPublicCatalog} from '../src/studio-public-routes.js';
import {routeQueryForLocation} from '../src/public-routes.js';
const shell=await readFile(new URL('../index.html',import.meta.url),'utf8');
mock.method(globalThis,'fetch',async()=>new Response('',{status:503}));
const env={ASSETS:{fetch:async r=>new URL(r.url).pathname==='/index.html'?new Response(shell,{headers:{'content-type':'text/html'}}):new Response('Not found',{status:404})}};
test('Studio public catalog stays in sync, with no withdrawn approval designs',()=>{
 assert.deepEqual(studioPublicCatalog,STUDIO_TEMPLATES.map(({id,name,topic})=>({id,name,topic})));
 assert.ok(studioPublicCatalog.every(t=>t.topic!=='approval'));
});
test('Studio is indexable without JS and links every template with real anchors',async()=>{
 const r=await worker.fetch(new Request('https://pollframe.com/studio'),env);
 assert.equal(r.status,200);assert.ok(!r.headers.get('x-robots-tag')?.includes('noindex'));
 const $=load(await r.text());
 assert.ok(!$('meta[name="robots"]').attr('content').includes('noindex'));
 assert.equal($('link[rel="canonical"]').attr('href'),'https://pollframe.com/studio');
 for(const t of studioPublicCatalog)assert.equal($(`a[href="https://pollframe.com/studio/${t.id}"]`).length,1);
});
test('Clean template URLs initialize the right preview; unknown templates 404; editors stay noindex',async()=>{
 for(const template of ['seats-grid','poll-classic','history-original']){
  const path='/studio/'+template,q=routeQueryForLocation({pathname:path});
  assert.equal(q.get('view'),'studio');assert.equal(q.get('template'),template);assert.equal(q.get('editor'),'1');
  const r=await worker.fetch(new Request('https://pollframe.com'+path),env);assert.equal(r.status,200);
  assert.ok((await r.text()).includes('Quellen'));
 }
 assert.equal((await worker.fetch(new Request('https://pollframe.com/studio/not-a-template'),env)).status,404);
 const edit=await worker.fetch(new Request('https://pollframe.com/studio/poll-classic?workspace=edit'),env);
 assert.match(edit.headers.get('x-robots-tag'),/noindex/);
});
test('Legacy Studio URLs do not accidentally redirect to the Bundestag chart',async()=>{
 const r=await worker.fetch(new Request('https://pollframe.com/?view=studio&region=berlin&template=seats-grid&editor=1'),env);
 const dest=new URL(r.headers.get('location'));assert.equal(dest.pathname,'/studio');assert.equal(dest.searchParams.get('region'),'berlin');assert.equal(dest.searchParams.get('template'),'seats-grid');
});
