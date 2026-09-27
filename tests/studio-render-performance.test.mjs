import test from 'node:test';
import assert from 'node:assert/strict';
import {studioNumber,studioDate} from '../src/studio-format.js';
for(const locale of ['de','en-GB','en-US','es'])test(`cached formatting preserves exact ${locale} values and dates`,()=>{
  for(const value of [0,-0,0.04,-12.35,100,1234.56,NaN])for(const precision of [0,1,2]){
    const options={minimumFractionDigits:precision,maximumFractionDigits:precision};
    assert.equal(studioNumber(value,locale,options),value.toLocaleString(locale,options));
  }
  for(const input of ['2017-01-01','2026-09-27'])for(const options of [{dateStyle:'medium',timeZone:'UTC'},{year:'numeric',month:'short',timeZone:'UTC'}]){
    const date=new Date(input);
    assert.equal(studioDate(date,locale,options),new Intl.DateTimeFormat(locale,options).format(date));
  }
});
test('text measurement caches metrics but invalidates after a font loads',async()=>{
  let measurements=0,factor=1; const listeners={};
  const oldDocument=globalThis.document,oldWindow=globalThis.window;
  globalThis.window={addEventListener:(name,fn)=>listeners[name]=fn};
  globalThis.document={createElement:()=>({getContext:()=>({measureText:text=>{measurements++;return {width:text.length*factor};}})}),fonts:{addEventListener:(name,fn)=>listeners[name]=fn}};
  try {
    const {textWidth}=await import('../src/studio-text-layout.js?cache-test');
    assert.equal(textWidth('Pollframe'),9);assert.equal(textWidth('Pollframe'),9);assert.equal(measurements,1);
    textWidth('Pollframe',24);assert.equal(measurements,2);
    factor=2;listeners['studio-font-ready']();assert.equal(textWidth('Pollframe'),18);
    factor=3;listeners.loadingdone();assert.equal(textWidth('Pollframe'),27);
    for(let i=0;i<4200;i++)textWidth(String(i));
    const before=measurements;textWidth('Pollframe');assert.equal(measurements,before+1,'old entries are evicted');
  }finally{globalThis.document=oldDocument;globalThis.window=oldWindow;}
});
