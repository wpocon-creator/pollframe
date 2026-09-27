import test from 'node:test';
import assert from 'node:assert/strict';
import {searchTemplates} from '../src/studio-search.js';
import {STUDIO_TEMPLATES,normalizeStudioState,studioHref} from '../src/studio-model.js';
import {searchDescription} from '../src/studio-search-descriptions.js';
test('every design has substantive descriptions and selective visual vocabulary',()=>{
  for(const item of STUDIO_TEMPLATES){const meta=searchDescription(item);assert.ok(meta.description.length>70,item.id);assert.ok(meta.vocabulary.length>100,item.id);}
  for(const query of ['modern','simple','detailed','traditional']){
    const result=searchTemplates(STUDIO_TEMPLATES,query);assert.equal(result.fallback,false,query);
    assert.ok(result.items.length>2,query);assert.ok(result.items.length<STUDIO_TEMPLATES.length,query);
  }
});
test('style, topic and purpose combine to rank useful designs first',()=>{
  for(const [query,expected] of [
    ['simple modern',['poll-wide','poll-lollipop','poll-dotplot']],
    ['detailed change',['tendencies-table']],
    ['traditional seats',['seats-original','seats-wide','seats-bars','seats-columns','seats-portrait']],
    ['modern detailed map',['map-poster']],
    ['minimalistisch',['poll-classic','poll-wide','poll-lollipop']],
    ['detallado',['seats-portrait','tendencies-table','poll-table']],
    ['tradicional',['poll-classic','poll-paper','poll-pie']],
    ['modren',['poll-material','poll-wide']],
    ['simpel',['poll-classic','poll-wide','poll-lollipop']],
  ]){const result=searchTemplates(STUDIO_TEMPLATES,query);assert.equal(result.fallback,false,query);assert.ok(expected.includes(result.items[0]?.id),`${query}: ${result.items.slice(0,4).map(i=>i.id)}`);}
});
test('style searches keep the selected topic and exact template names still win',()=>{
  const candidates=STUDIO_TEMPLATES.filter(item=>item.topic==='majority');
  assert.equal(searchTemplates(candidates,'detailed').items[0].id,'majority-table');
  for(const q of ['modern','change','simple'])assert.ok(searchTemplates(candidates,q).items.every(item=>item.topic==='majority'));
  for(const item of STUDIO_TEMPLATES)assert.ok(searchTemplates(STUDIO_TEMPLATES,item.name[1]).items.slice(0,3).some(result=>result.id===item.id),item.id);
});
test('search finds synonyms, accents and spelling mistakes in all supported languages',()=>{
  for(const [query,id] of [['skulpturr','poll-material'],['tridimensional','poll-material'],['Kuchendiagramm','poll-pie'],['tarta','poll-pie'],['zeitung','poll-paper'],['sonntagsfrge','poll-classic']]) {
    const result=searchTemplates(STUDIO_TEMPLATES,query);
    assert.equal(result.fallback,false,query);
    assert.ok(result.items.some(item=>item.id===id),`${query}: ${result.items.map(item=>item.id)}`);
  }
});
test('fallback is honest and does not escape caller context',()=>{
  const candidates=STUDIO_TEMPLATES.filter(item=>item.topic==='current');
  assert.deepEqual(searchTemplates(candidates,'unbekanntes marsraumschiff'),{items:candidates,fallback:true});
  assert.deepEqual(searchTemplates(candidates,''),{items:candidates,fallback:false});
});
test('editor recipes validate, protect data and round-trip',()=>{
  const state=normalizeStudioState({font:'serif',titleSize:100,barScale:10,axisMax:-40,background:'url(evil)',palette:'1:#123456,2:javascript:evil',value:99,source:'fake',template:'poll-classic'});
  assert.equal(state.titleSize,64);assert.equal(state.barScale,1.6);assert.equal(state.axisMax,0);
  assert.equal(state.background,'');assert.equal(state.palette,'1:#123456');assert.equal(state.value,undefined);assert.equal(state.source,undefined);
  const params=new URL(studioHref({context:state}),'https://pollframe.com').searchParams;
  assert.deepEqual(normalizeStudioState(Object.fromEntries(params)),state);
});
