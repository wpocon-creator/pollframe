import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutHistoryFooter} from '../src/studio-history-footer.js';
import {textWidth} from '../src/studio-text-layout.js';

test('source layout preserves every character and grows instead of clipping enlarged text',()=>{
  const blocks=[{kind:'method',text:'Latest poll per institute, equally weighted.',fontSize:16},
    {kind:'institutes',text:'Pollsters: Institut für Demoskopie Allensbach · Forschungsgruppe Wahlen · Infratest dimap · INSA · Forsa · Verian (Emnid) · YouGov'},
    {kind:'source',text:'DAWUM · dawum.de · ODbL 1.0: odbl.dawum.de · 27 September 2026'}];
  const normal=layoutHistoryFooter(blocks,{font:'monospace'});
  const large=layoutHistoryFooter(blocks,{font:'monospace',scale:1.35,weight:800,italic:true});
  assert.ok(large.height>normal.height);
  for(const block of blocks){
    const join=large.lines.filter(row=>row.kind===block.kind).map(row=>row.text).join(' ');
    assert.equal(join.replace(/\s/g,''),block.text.replace(/\s/g,''));
  }
  for(const [i,row]of large.lines.entries()){
    assert.ok(textWidth(row.text,row.fontSize*1.35,'monospace',800,true)<=856);
    if(i)assert.ok(row.y-large.lines[i-1].y>=22);
  }
});
