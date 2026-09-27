import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationSources, readableSourceColour} from '../src/studio-publication-policy.js';
import {publicationPackage} from '../src/studio-publication-package.js';
import {snapshotCsv} from '../src/studio-editor-files.js';
import {unzipSync,strFromU8} from 'fflate';

test('attribution distinguishes database, geometry and their separate licences',()=>{
  const sources=publicationSources({source:'dawum.de',kind:'map'});
  assert.equal(sources.length,4);
  assert.ok(sources.some(s=>s.url.includes('/odbl/1-0/')));
  assert.ok(sources.some(s=>s.label.includes('Victor Cazanave')));
  assert.ok(sources.some(s=>s.url.includes('/by/4.0/')));
  assert.deepEqual(publicationSources({source:'Unrelated dataset'}),[]);
});
test('source styling cannot turn white on white or black on black',()=>{
  assert.equal(readableSourceColour('#ffffff','#ffffff'),'#172130');
  assert.equal(readableSourceColour('#000','#000'),'#f4f7fb');
  assert.equal(readableSourceColour('#526173','#ffffff'),'#526173');
  assert.equal(readableSourceColour('url(https://example.com)','#ffffff'),null);
});
test('standalone package carries licence URLs and database modification notice',async()=>{
  const snapshot={source:'dawum.de',sourceUrl:'https://dawum.de/API/',license:'ODbL 1.0',date:'2026-09-01',region:'Berlin',rows:[]};
  const result=await publicationPackage({snapshot,state:{region:'berlin'},note:'sources',render:async()=>({blob:new Blob(['test'])})});
  const files=unzipSync(new Uint8Array(await result.arrayBuffer()));
  assert.match(strFromU8(files['LICENCES.txt']),/opendatacommons.org\/licenses\/odbl\/1-0/);
  assert.match(strFromU8(files['LICENCES.txt']),/Pollframe changes/);
  assert.ok(JSON.parse(strFromU8(files['manifest.json'])).files['LICENCES.txt']);
});
test('withdrawn recipes cannot bypass publication via the downloadable package',async()=>{
  for(const [state,snapshot] of [[{template:'approval-original'},{}],[{}, {kind:'approval'}],[{}, {reuse:{status:'permission-unconfirmed'}}]]) {
    let rendered=false;
    await assert.rejects(publicationPackage({snapshot,state,render:async()=>{rendered=true;return{blob:new Blob(['test'])};}}),/withheld/);
    assert.equal(rendered,false);
  }
});
test('CSV preserves region and row-specific reuse information',()=>{
  const csv=snapshotCsv({regionSlug:'berlin',source:'dawum.de',license:'ODbL',date:'2026-09-01'},[{name:'Example',value:20,license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'}]);
  assert.match(csv,/license_url/);assert.match(csv,/berlin/);assert.match(csv,/CC BY-SA 4.0/);
  assert.match(csv,/creativecommons.org/);
});
