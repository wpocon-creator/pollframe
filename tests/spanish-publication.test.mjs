import test from 'node:test';
import assert from 'node:assert/strict';
import {ACCOUNT_COPY,accountText} from '../src/account-copy.js';
import {pollMethodLabel} from '../src/poll-method-label.js';
import {publicationPackage} from '../src/studio-publication-package.js';
import {unzipSync,strFromU8} from 'fflate';

test('all account messages have English and Spanish translations',()=>{
  for(const [de,[en,es]] of Object.entries(ACCOUNT_COPY)) {
    assert.ok(en?.length,de); assert.ok(es?.length,de);
    assert.equal(accountText((a,b,c)=>c,de),es);
  }
});
test('method translations do not alter source-specific unknown descriptions',()=>{
  assert.equal(pollMethodLabel('Telefon & Online','es'),'Telefónica y en línea');
  assert.equal(pollMethodLabel('Persönlich','es'),'Presencial');
  assert.equal(pollMethodLabel('Telefonisch','en-US'),'Telephone');
  assert.equal(pollMethodLabel('Special source methodology','es'),'Special source methodology');
});
test('publication archive preserves language, statistic, period, pollsters, events and exact snapshot',async()=>{
  const snapshot={date:'2026-09-08',rows:[{id:'7',value:29}]};
  const state={template:'history-original',lang:'es',country:'de',region:'bundestag',headline:'La intención de voto',range:'custom',start:'2023-01-01',end:'2026-09-08',mode:'linear',pollsters:'1,5',events:'global',theme:'dark',historyLayers:3,historyEventSeed:17};
  const blob=await publicationPackage({snapshot,state,note:'Fuentes',render:async()=>({blob:new Blob(['test image'])})});
  const files=unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const settings=JSON.parse(strFromU8(files['settings.json'])).settings;
  for(const [key,value] of Object.entries(state)) assert.equal(settings[key],value,key);
  assert.deepEqual(JSON.parse(strFromU8(files['data.json'])).snapshot,snapshot);
  assert.match(strFromU8(files['README.txt']),/Registro de publicación/);
});
