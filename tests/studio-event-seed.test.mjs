import test from 'node:test';
import assert from 'node:assert/strict';
import {selectStudioEvents} from '../src/studio-event-selection.js';
import {normalizeStudioState} from '../src/studio-model.js';
import {eventLayout} from '../src/studio-event-layout.js';

test('all eligible editor catalogue entries remain candidates, regardless of public omission',()=>{
  const eventCatalogue=Array.from({length:20},(_,i)=>({id:`item-${i}`,date:`2024-01-${String(i+1).padStart(2,'0')}`,category:'germany',label:`Item ${i}`,priority:2,editorialOmit:i%2===0}));
  const snapshot={start:'2024-01-01',end:'2024-01-31',eventCatalogue};
  const select=seed=>selectStudioEvents(snapshot,normalizeStudioState({events:'germany',historyEventSeed:seed})).candidates.map(e=>e.id);
  assert.equal(select(0).length,20);assert.deepEqual(select(7),select(7));assert.notDeepEqual(select(7),select(8));
  assert.equal(normalizeStudioState({historyEventSeed:7}).historyEventSeed,7);
  assert.equal(normalizeStudioState({historyEventSeed:-Infinity}).historyEventSeed,0);
});
test('seed cannot outrank important events or move an explicitly placed event',()=>{
  const snapshot={start:'2024-01-01',end:'2024-12-31',eventCatalogue:[
    {id:'major',label:'Important',date:'2024-06-01',category:'germany',priority:0},
    {id:'minor',label:'Minor',date:'2024-06-01',category:'germany',priority:3}]};
  for(let seed=0;seed<100;seed++){
    const state=normalizeStudioState({events:'germany',historyEventSeed:seed});
    const selected=selectStudioEvents(snapshot,state).candidates;
    assert.equal(selected[0].id,'major');
    const layout=eventLayout(selected,{x:()=>400,left:0,right:800,layers:2,limit:8,lanes:{major:1}});
    assert.equal(layout.visible.find(e=>e.id==='major').lane,1);
    assert.equal(layout.visible.length,2);
  }
});
