import test from 'node:test';import assert from 'node:assert/strict';
import {searchTemplates} from '../src/studio-search.js';
import {STUDIO_TEMPLATES} from '../src/studio-model.js';
import {searchDescription} from '../src/studio-search-descriptions.js';
import {swipeDirection} from '../src/studio-swipe.js';
test('stylistic vocabulary finds actual matching designs, including misspellings and combined topics',()=>{
 for(const [query,mood] of [['luftig','airy'],['filigran','airy'],['luxurious','refined'],['retro','retro'],['futuristish','futuristic'],['spielerisch','playful'],['geometrisch','geometric'],['nüchtern','sober'],['sobria','sober'],['delicado','airy'],['history futuristic','futuristic']]){
  const result=searchTemplates(STUDIO_TEMPLATES,query);assert.equal(result.fallback,false,query);
  assert.ok(searchDescription(result.items[0]).concepts.includes(mood),`${query}: ${result.items[0].id}`);
  if(query.startsWith('history'))assert.ok(result.items.every(t=>t.topic==='history'));
 }
});
test('swipe threshold rejects scrolling, slow movement and small accidental touches',()=>{
 const start={x:200,y:200,time:0};
 for(const [x,y,time,wanted]of[[80,205,200,1],[320,210,200,-1],[190,320,200,0],[180,203,100,0],[60,205,1200,0]])assert.equal(swipeDirection(start,{x,y,time},390),wanted);
});
