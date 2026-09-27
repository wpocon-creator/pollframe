import test from 'node:test';
import assert from 'node:assert/strict';
import {styleDocument,parseStyle,snapshotCsv} from '../src/studio-editor-files.js';
import {normalizeStudioState} from '../src/studio-model.js';
test('styles exclude stories, data and sources and validate unsafe imports',()=>{
  const state=normalizeStudioState({headline:'Private',subtitle:'Story',titleWeight:400,reference:5,order:'name',imageOverlay:.7});
  const doc=styleDocument(state);assert.equal(doc.style.headline,undefined);assert.equal(doc.style.parties,undefined);
  const parsed=parseStyle(JSON.stringify({...doc,style:{...doc.style,titleSize:999,value:123,source:'fake',headline:'bad',reference:-10}}));
  assert.equal(parsed.titleSize,64);assert.equal(parsed.value,undefined);assert.equal(parsed.headline,undefined);assert.equal(parsed.source,undefined);assert.equal(parsed.reference,undefined);
  assert.throws(()=>parseStyle('{"version":9}'));assert.throws(()=>parseStyle('x'.repeat(21000)));
});
test('CSV carries precise numbers, dates and credits and escapes formulas',()=>{
  const csv=snapshotCsv({date:'2026-09-01',source:'Example',sourceUrl:'https://example.com',license:'ODbL'},[{name:'=DANGEROUS()',value:12.34},{name:'Party "A"',value:3}]);
  assert.ok(csv.includes("'=DANGEROUS()"));assert.ok(csv.includes('12.34'));assert.ok(csv.includes('2026-09-01'));assert.ok(csv.includes('ODbL'));assert.ok(csv.includes('Party ""A""'));
});
test('map CSV retains per-state dates and growth units; corner styles round-trip',()=>{
  const csv=snapshotCsv({kind:'map',mode:'growth',date:'2026-09-11'},[{name:'Hessen',value:-2.3,date:'2026-04-29'}]);
  assert.ok(csv.includes('change_pp'));assert.ok(csv.includes('2026-04-29'));assert.ok(!csv.includes('share_percent'));
  assert.equal(parseStyle(JSON.stringify(styleDocument({...normalizeStudioState({}),edges:'rounded',cornerRadius:20}))).edges,'rounded');
  assert.equal(parseStyle(JSON.stringify(styleDocument({...normalizeStudioState({}),edges:'rounded',cornerRadius:0}))).edges,'sharp');
});
