import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {eventLayout} from '../../src/studio-event-layout.js';
import {normalizeStudioState,STUDIO_TEMPLATES} from '../../src/studio-model.js';
import {normalizeStyle,stylePatch} from '../../src/studio-style-model.js';
import {verticalEdgeScrollSpeed} from '../../src/watchlistReorder.js';

const seed=260926;let state=seed;
const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2**32;};
const pick=a=>a[Math.floor(random()*a.length)];
const failures=[],counts={events:0,style:0,normalization:0,edgeScroll:0,data:0};const start=performance.now();
function check(kind,input,run){counts[kind]++;try{run();}catch(e){if(failures.filter(f=>f.kind===kind).length<5)failures.push({kind,input,error:e.message.slice(0,1200)});}}
for(let i=0;i<1000;i++){
 const left=32,right=left+Math.floor(200+random()*1200),layers=pick([0,1,2,3,4]);
 const events=Array.from({length:Math.floor(random()*45)},(_,j)=>({id:'e'+j,date:left+Math.floor(random()*(right-left)),labelWidth:60+Math.floor(random()*240),forced:random()<.12}));
 const options={x:d=>d,left,right,layers,limit:pick([0,1,3,8,20]),limits:{0:pick([0,1,5,20])},lanes:{e0:pick([0,1,2,3])}};
 check('events',{events,options:{...options,x:'identity'}},()=>{
  const a=eventLayout(events,options);assert.deepEqual(a,eventLayout(events,options));
  assert.equal(new Set([...a.visible,...a.hidden].map(e=>e.id)).size,events.length);
  for(const e of a.visible){assert.equal(e.markerX,e.date);assert.ok(e.lane>=0&&e.lane<layers);assert.ok(e.center-e.labelWidth/2>=left-.001&&e.center+e.labelWidth/2<=right+.001);assert.ok(Math.abs(e.markerX-e.center)<=e.labelWidth/2+.001);
   for(const other of a.visible)if(other!==e&&other.lane===e.lane)assert.ok(Math.abs(e.center-other.center)>=(e.labelWidth+other.labelWidth)/2+3.999);
  }
  for(let lane=0;lane<layers;lane++)assert.ok(a.visible.filter(e=>e.lane===lane&&!e.forced).length<=(options.limits[lane]??options.limit));
 });
 const input={template:pick(STUDIO_TEMPLATES).id,theme:pick(['dark','light']),titleSize:pick([0,12,36,64,999,NaN]),cornerRadius:pick([0,8,60,999]),headline:'Åß 📊 headline '+i,background:pick(['#001122','#ffffff','transparent','url(javascript:alert(1))']),textStyles:JSON.stringify({labels:{scale:pick([.5,1,1.35,99]),italic:true}}),source:'forged',results:{union:100},region:'bundestag',range:pick(['year','five','custom']),start:'2021-01-01',end:'2026-09-26'};
 check('normalization',input,()=>{const a=normalizeStudioState(input);assert.deepEqual(a,normalizeStudioState(a));assert.equal(a.source,undefined);assert.equal(a.results,undefined);const params=new URLSearchParams(Object.entries(a).filter(([,v])=>v!==null&&v!==undefined));const restored=normalizeStudioState(Object.fromEntries(params));for(const key of ['template','theme','titleSize','cornerRadius','headline'])assert.deepEqual(restored[key],a[key],key);});
 check('style',input,()=>{const a=normalizeStyle(input);assert.deepEqual(a,normalizeStyle(a));for(const key of ['source','results','headline','start','end','region'])assert.equal(a[key],undefined,key);const patch=stylePatch(a,input.template);assert.ok(!('results' in patch));});
 const height=320+Math.floor(random()*1400),y=random()*height,offset=Math.floor(random()*200);
 check('edgeScroll',{height,y,offset},()=>{const a=verticalEdgeScrollSpeed(y,height);assert.ok(Number.isFinite(a)&&Math.abs(a)<=1100);assert.ok(Math.abs(a+verticalEdgeScrollSpeed(height-y,height))<1e-8);assert.ok(Math.abs(a-verticalEdgeScrollSpeed(y+offset,height,offset))<1e-8);});
}
for(const file of ['bundestag','berlin','bayern','schleswig-holstein']){
 const d=JSON.parse(await readFile(`public/data/${file}.json`,'utf8'));
 for(const p of d.polls)check('data',{file,date:p.date,pollster:p.pollster},()=>{
  assert.ok(d.pollsters[p.pollster]);assert.ok(p.date>=p.fieldwork[1]);assert.ok(p.fieldwork[0]<=p.fieldwork[1]);assert.ok(p.sample>0);
  assert.ok(Object.values(p.results).every(v=>Number.isFinite(v)&&v>=0&&v<=100));
  const total=Object.values(p.results).reduce((s,v)=>s+v,0);assert.ok(total>=95&&total<=105,`answer total ${total}`);
 });
}
const report={seed,seconds:(performance.now()-start)/1000,counts,failures};
await mkdir('test-results/qa-lab',{recursive:true});await writeFile('test-results/qa-lab/properties.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,failures:failures.map(f=>({kind:f.kind,error:f.error.slice(0,160)}))}));process.exitCode=failures.length?1:0;
