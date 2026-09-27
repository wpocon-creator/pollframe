import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

const lane=process.argv[2]||'baseline';
const base=process.env.POLLFRAME_TEST_BASE_URL||'http://127.0.0.1:4173';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('QA benchmark must use localhost');
const output=path.resolve('test-results/qa-lab');await mkdir(output,{recursive:true});
const nodeTests=files=>[process.execPath,['--test','--test-reporter=tap',...files]];
const groups={
 baseline:[
  ['unit-regressions',...nodeTests(['tests/studio-event-layout.test.mjs','tests/studio-event-selection.test.mjs','tests/studio-event-seed.test.mjs','tests/studio-custom-events.test.mjs','tests/studio-model.test.mjs','tests/studio-style-library.test.mjs','tests/poll-calculation-receipt.test.mjs','tests/watchlist-reorder.test.mjs','tests/watchlist-alerts.test.mjs','tests/data-freshness.test.mjs','tests/spanish-locale.test.mjs','tests/studio-editor-files.test.mjs','tests/studio-history-footer.test.mjs'])],
  ['static-security',process.execPath,['scripts/validate-security.mjs']],
  ['static-performance',process.execPath,['scripts/validate-performance.mjs']],
 ],
 security:[['worker-security',...nodeTests(['tests/worker-security.test.mjs','tests/accounts-production.test.mjs','tests/account-worker-runtime.test.mjs','tests/service-worker-privacy.test.mjs','tests/live-data-offline.test.mjs'])]],
 workflow:[['stateful-workflows',process.execPath,['node_modules/@playwright/test/cli.js','test','tests/studio-events-outcomes.spec.mjs','tests/studio-font-export.spec.mjs','tests/journalist-transparency-review.spec.mjs','--project=chromium-desktop','--workers=1','--reporter=json']]],
 media:[['media-contract',...nodeTests(['tests/studio-guide-media.test.mjs'])],['delivered-media','/home/william/.local/share/pollframe-video-lab/venv/bin/python',['production/studio-film/natural/check.py']]],
 offline:[['offline-workflows',process.execPath,['node_modules/@playwright/test/cli.js','test','tests/pwa.spec.mjs','--grep','app shell and core polling view usable offline|installed Watchlist and its session change visible offline','--project=chromium-desktop','--project=pixel-5','--workers=1','--reporter=json']]],
};
if(!groups[lane])throw Error('Unknown lane');
const results=[];
for(const[id,command,args]of groups[lane]){
 if(args.includes('node_modules/@playwright/test/cli.js'))args.push('--output='+path.join(output,id+'-artifacts'));
 const start=performance.now();let log='';
 const child=spawn(command,args,{env:{...process.env,POLLFRAME_TEST_BASE_URL:base},stdio:['ignore','pipe','pipe'],detached:true});
 child.stdout.on('data',chunk=>log+=chunk);child.stderr.on('data',chunk=>log+=chunk);
 let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;try{process.kill(-child.pid,'SIGTERM')}catch{}},420000);
 const result=await new Promise(resolve=>{child.once('error',e=>resolve({exitCode:null,error:e.message}));child.once('close',(exitCode,signal)=>resolve({exitCode,signal}));});clearTimeout(timeout);
 const row={id,...result,timedOut,seconds:Number(((performance.now()-start)/1000).toFixed(2)),logCharacters:log.length,textOutputTokenProxy:Math.ceil(log.length/4)};
 await writeFile(path.join(output,id+'.log'),log);results.push(row);
 console.log(JSON.stringify(row));
}
await writeFile(path.join(output,lane+'-summary.json'),JSON.stringify({createdAt:new Date().toISOString(),node:process.version,results},null,2));
process.exitCode=results.some(r=>r.exitCode!==0)?1:0;
