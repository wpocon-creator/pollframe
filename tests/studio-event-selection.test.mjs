import test from "node:test";
import assert from "node:assert/strict";
import { selectStudioEvents } from "../src/studio-event-selection.js";
import { eventLayout } from "../src/studio-event-layout.js";
const snapshot = { start:"2026-01-01", end:"2026-09-19", eventCatalogue:[
  {id:"early",date:"2026-01-01",category:"germany",label:"Early",priority:0},
  {id:"last-day",date:"2026-09-19",category:"global",label:"Last day",priority:0},
  {id:"omitted",date:"2026-02-01",category:"germany",label:"Manual candidate",editorialOmit:true},
  {id:"outside",date:"2025-01-01",category:"germany",label:"Outside",priority:0},
  {id:"election",date:"2026-03-01",category:"national",election:true},
] };
const defaults={events:null,historyEventIds:null,historyCustomEvents:"[]"};
test("editor includes both date boundaries and all catalogue entries, not outside events",()=>{
  const out=selectStudioEvents(snapshot,defaults);
  assert.deepEqual(new Set(out.candidates.map(e=>e.id)),new Set(["early","last-day","omitted"]));
  assert.equal(out.elections.length,1);
});
test("pin overrides editorial omission, exclusion and category switches are respected",()=>{
  const out=selectStudioEvents(snapshot,{...defaults,historyEventPinned:"omitted",historyEventExcluded:"early",events:"germany"});
  assert.deepEqual(out.candidates.map(e=>e.id),["omitted"]);
  assert.equal(out.candidates[0].forced,true);
  assert.equal(out.elections.length,0);
});
test("manual selection is exact; custom annotations are forced and stay at their date",()=>{
  const out=selectStudioEvents(snapshot,{...defaults,historyEventIds:"omitted",historyCustomEvents:JSON.stringify([{id:"custom-test",label:"Editorial annotation",date:"2026-06-01"}])});
  assert.deepEqual(out.candidates.map(e=>e.id),["omitted","custom-test"]);
  assert.ok(out.candidates.every(e=>e.forced));
});
test("pins pack before automatic events, bypass density but never overlap",()=>{
  const events=[{id:"auto",date:100},{id:"pin",date:100,forced:true},{id:"other",date:100,forced:true}];
  const result=eventLayout(events,{x:d=>d,left:0,right:800,layers:2,limit:0});
  assert.deepEqual(result.visible.map(e=>e.id),["pin","other"]);
  assert.deepEqual(result.visible.map(e=>e.lane),[0,1]);
  const blocked=eventLayout(events,{x:d=>d,left:0,right:800,layers:1,limit:0});
  assert.equal(blocked.hidden.find(e=>e.id==="other").reason,"space");
});
