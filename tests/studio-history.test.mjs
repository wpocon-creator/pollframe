import test from 'node:test';
import assert from 'node:assert/strict';
import {HISTORY_DESIGNS,historyScale,historySegments,historyCsv} from '../src/studio-history-model.js';
import {normalizeStudioState,STUDIO_TEMPLATES} from '../src/studio-model.js';
import {searchTemplates} from '../src/studio-search.js';
test('seven retained historical recipes, protected settings and missing-data gaps',()=>{
  assert.equal(HISTORY_DESIGNS.length,7);assert.equal(new Set(HISTORY_DESIGNS.map(t=>t.design)).size,7);
  assert.ok(!HISTORY_DESIGNS.some(t=>['history-wide','history-rail'].includes(t.id)));
  const p=[{date:'2026-01-01',results:{1:10}},{date:'2026-01-02',results:{}},{date:'2026-01-03',results:{1:12}}];
  assert.equal(historySegments(p,'1').length,2);
  assert.deepEqual(historyScale([-7,4],{difference:true}),[-10,10]);
  const s=normalizeStudioState({template:'history-original',parties:'',events:'',historyLineWidth:999,historyLegend:'false',historyHeight:-1});
  assert.equal(s.historyLineWidth,7);assert.equal(s.historyHeight,280);assert.equal(s.historyLegend,false);assert.equal(s.parties,'');assert.equal(s.events,'');
  assert.match(historyCsv({trend:p,averages:p,sourceUrl:'https://dawum.de',license:'ODbL'},[{id:'1',name:'CDU'}],{mode:'trend'}),/share_percent/);
  const delta=historyCsv({trend:[...p].reverse(),averages:p},[{id:'1',name:'=Unsafe'}],{mode:'trend',template:'history-change'});
  assert.match(delta,/change_pp/);assert.match(delta,/"-2","2026-01-03"/);assert.match(delta,/"'=Unsafe"/);
});
test('search identifies history styles and common multi-language requests',()=>{
  for(const [q,design] of [['small multiples','panels'],['leuchtlienien','neon'],['Zeitungsgrafik','print'],['primer enfoque','focus']]) {
    const result=searchTemplates(HISTORY_DESIGNS,q);assert.equal(result.items[0].design,design,q);
  }
  for(const t of STUDIO_TEMPLATES)for(const name of t.name)assert.ok(searchTemplates(STUDIO_TEMPLATES,name).items.slice(0,3).some(item=>item.id===t.id),name);
  assert.equal(searchTemplates(HISTORY_DESIGNS,'qxyznotfound').fallback,true);
  assert.equal(searchTemplates(STUDIO_TEMPLATES,'grafico temporal').items[0].topic,'history');
  assert.equal(searchTemplates(STUDIO_TEMPLATES,'parteienverlauf').fallback,false);
});
