import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {unzipSync,strFromU8} from 'fflate';
import {makeTrend,makeAverageSeries,POLL_CALCULATOR_VERSION} from '../src/poll-history-calculator.js';
import {publicationPackage} from '../src/studio-publication-package.js';

test('same-day ties, missing parties and the inclusive 45-day cutoff are preserved',()=>{
  const polls=[
    {date:'2026-01-01',pollster:'a',results:{x:10,y:30}},
    {date:'2026-01-01',pollster:'a',results:{x:20}},
    {date:'2026-01-02',pollster:'b',results:{x:40,y:10}},
  ];
  const points=makeAverageSeries(polls,['a','b'],['2026-02-15','2026-02-16'],['x','y']);
  assert.deepEqual(points.map(p=>p.results),[{x:30,y:10},{x:40,y:10}]);
});

test('full five-year archive replays offline and every file matches its SHA-256 manifest',async t=>{
  const data=JSON.parse(await readFile('public/data/bundestag.json','utf8'));
  const end=data.polls.at(-1).date,start='2021-09-08',parties=Object.keys(data.polls.at(-1).results).map(id=>({id}));
  const polls=data.polls.filter(p=>Date.parse(p.date)>=Date.parse(start)-45*86400000);
  const selectedPollsters=Object.keys(data.pollsters),averageDates=[...new Set(polls.filter(p=>p.date>=start).map(p=>p.date))];
  const inputs={version:POLL_CALCULATOR_VERSION,start,end,parties,polls,selectedPollsters,averageDates,smoothingDays:84};
  const snapshot={kind:'history',calculationInputs:inputs,
    trend:makeTrend(polls,selectedPollsters,start,end,parties,84),
    averages:makeAverageSeries(polls,selectedPollsters,averageDates,parties.map(p=>p.id))};
  const blob=await publicationPackage({snapshot,state:{template:'history-original',lang:'de'},note:'DAWUM · ODbL 1.0',render:async()=>({blob:new Blob(['test'])}),loadCalculator:()=>readFile('src/poll-history-calculator.js','utf8')});
  const files=unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const manifest=JSON.parse(strFromU8(files['manifest.json']));
  for(const [name,digest] of Object.entries(manifest.files))assert.equal(createHash('sha256').update(files[name]).digest('hex'),digest);
  const dir=await mkdtemp(join(tmpdir(),'pollframe-replay-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  for(const [name,bytes] of Object.entries(files))await writeFile(join(dir,name),bytes);
  assert.match(execFileSync(process.execPath,[join(dir,'verify.mjs')],{encoding:'utf8'}),/Verified every/);
  const altered=JSON.parse(strFromU8(files['data.json']));altered.snapshot.trend[0].results[parties[0].id]+=1;
  await writeFile(join(dir,'data.json'),JSON.stringify(altered));
  assert.throws(()=>execFileSync(process.execPath,[join(dir,'verify.mjs')],{stdio:'pipe'}));
});
