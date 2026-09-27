import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationCaption} from '../src/studio-caption.js';
const l=(de,en)=>en;
test('captions preserve different institutes, reference dates and map limitations',()=>{
  const caption=publicationCaption({date:'2026-09-08',baselineDate:'2026-08-31',baselineInstitute:'Forsa',institutesDiffer:true,source:'DAWUM',license:'ODbL 1.0'}, {}, {topic:'current'},l);
  assert.match(caption,/2026-08-31 · Forsa/);assert.match(caption,/different institute/);assert.match(caption,/ODbL 1.0/);
  assert.match(publicationCaption({kind:'map',date:'2026-09-08'}, {}, {topic:'map'},l),/dates differ between states/);
});
test('latest individual poll is distinct from line and never relabelled as its value',()=>{
  const caption=publicationCaption({latestIndividual:{institute:'INSA',date:'2026-09-08'}}, {}, {topic:'history'},l);
  assert.match(caption,/Line: Pollframe polling average/);assert.match(caption,/Outlined dot: individual poll · INSA/);
});
test('points-only captions describe averages, not nonexistent lines or individual polls',()=>{
  const text=publicationCaption({}, {mode:'polls'}, {topic:'history'},l);
  assert.match(text,/Dots: Pollframe polling averages/);assert.doesNotMatch(text,/Line:/);
});
