import test from 'node:test';
import assert from 'node:assert/strict';
import {STUDIO_TEMPLATES,isPausedStudioRequest} from '../src/studio-model.js';
import {searchTemplates} from '../src/studio-search.js';
test('no approval recipes are offered or returned by search while data is withdrawn',()=>{
  assert.ok(STUDIO_TEMPLATES.length>30);
  assert.ok(STUDIO_TEMPLATES.every(t=>!isPausedStudioRequest(t)));
  for(const query of ['approval','current government satisfaction','Kanzlerzufriedenheit','valoración'])
    assert.ok(searchTemplates(STUDIO_TEMPLATES,query).items.every(t=>!isPausedStudioRequest(t)));
});
test('legacy links and saved approval recipes can be identified without deleting them',()=>{
  for(const input of [{template:'approval-original'},{template:'approval-aligned'},{profile:'approval-current'},{topic:'approval'},{topic:'approval-current'}])assert.equal(isPausedStudioRequest(input),true);
  for(const input of [{},{template:'poll-classic'},{profile:'chart'},{topic:'history'}])assert.equal(isPausedStudioRequest(input),false);
});
