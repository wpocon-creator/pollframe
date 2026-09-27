import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {approvalSnapshot} from '../src/studio-approval-model.js';
import {STUDIO_TEMPLATES,normalizeStudioState} from '../src/studio-model.js';
import {historySegments} from '../src/studio-history-model.js';
import {validateElectionHistory} from '../scripts/lib/election-history.mjs';
import {syntheticApproval as data} from './fixtures/synthetic-approval.mjs';
test('all catalogue ids are unique; removed historical design has a safe archive-compatible fallback',()=>{
  assert.equal(new Set(STUDIO_TEMPLATES.map(t=>t.id)).size,STUDIO_TEMPLATES.length);
  assert.equal(STUDIO_TEMPLATES.some(t=>t.id==='history-change'),false);
  assert.equal(normalizeStudioState({template:'history-change'}).template,'history-original');
  for(const topic of ['seats','majority','party','tendencies','map'])assert.ok(STUDIO_TEMPLATES.filter(t=>t.topic===topic).length>=3);
  assert.equal(STUDIO_TEMPLATES.some(t=>t.topic.startsWith('approval')),false);
});
test('approval net is signed original difference; terms do not connect and terminal smoothing does not fabricate a new reading',()=>{
  const state=normalizeStudioState({template:'approval-original',range:'all',answer:'net'}),snapshot=approvalSnapshot(data,state);
  const last=data.countries.de.series.leader.at(-1),end=snapshot.trend.at(-1);
  assert.equal(Object.values(end.results)[0],last.positive-last.negative);
  assert.equal(snapshot.unit,'pp');
  for(const row of snapshot.rows){const segments=historySegments(snapshot.trend,row.id);assert.equal(segments.length,1);const names=data.countries.de.series.leader.filter(p=>p.date>=segments[0][0].date&&p.date<=segments[0].at(-1).date).map(p=>p.leader);assert.equal(new Set(names).size,1);}
});
test('current approval retains the original denominator and actual publication date',()=>{
  const s=approvalSnapshot(data,{...normalizeStudioState({metric:'government'}),template:'approval-current-bars'});
  assert.equal(s.rows.reduce((n,r)=>n+r.value,0),100);
  assert.equal(s.date,data.countries.de.series.government.at(-1).date);
  assert.notEqual(s.source,'DAWUM');
});
test('official election snapshot rejects invented shares, altered sources and incomplete counts',async()=>{
  const value=JSON.parse(await readFile(new URL('../public/data/election-st2026.json',import.meta.url)));
  assert.equal(validateElectionHistory(value),value);
  assert.throws(()=>validateElectionHistory({...value,status:'partial'}));
  assert.throws(()=>validateElectionHistory({...value,sourceUrl:'https://example.com'}));
  assert.throws(()=>validateElectionHistory({...value,results:{...value.results,7:120}}));
});
