// Comparable local cold-load probe. No production analytics or visitor traffic.
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const label=(process.argv[2]||'sample').replace(/[^a-z0-9_-]/gi,'');
const runs=Number(process.env.POLLFRAME_SPEED_RUNS||5);
const base=process.env.POLLFRAME_TEST_BASE_URL||'http://127.0.0.1:4174';
const routes={gallery:'/?view=studio&lang=en-GB',current:'/?view=studio&lang=en-GB&template=poll-classic&editor=1',history:'/?view=studio&lang=en-GB&template=history-original&editor=1',editor:'/?view=studio&lang=en-GB&template=history-original&editor=1&workspace=edit'};
const browser=await chromium.launch(),results=[];
try {
 for(let run=0;run<runs;run++)for(const [name,path] of Object.entries(routes)){
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  await context.addInitScript(()=>{
   localStorage.setItem('pollframe-analytics-off','1');
   localStorage.setItem('pollframe-notice-dismissed:studio-guide-v1','yes');
   window.__longTasks=[];
   new PerformanceObserver(list=>window.__longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});
  });
  const page=await context.newPage(),cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  const requests=[];page.on('request',r=>requests.push(new URL(r.url()).pathname));
  const start=performance.now();
  await page.goto(base+path,{waitUntil:'domcontentloaded'});
  await page.locator(name==='gallery'?'.studio-template-canvas svg':'.studio-current-preview-image > svg').first().waitFor({timeout:30000});
  if(name==='editor')await page.locator('.studio-tools').waitFor();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const row={run,name,readyMs:Math.round(performance.now()-start),...await page.evaluate(()=>({
   longTaskMs:Math.round(window.__longTasks.reduce((a,b)=>a+b,0)),
   resources:performance.getEntriesByType('resource').length,
   decodedBytes:performance.getEntriesByType('resource').reduce((n,e)=>n+e.decodedBodySize,0),
   svgCount:document.querySelectorAll('svg.studio-current-art').length,
  })),requests:requests.length,dataRequests:requests.filter(p=>p.startsWith('/data/')||p.endsWith('summary.json')).length};
  results.push(row);console.log(JSON.stringify(row));await context.close();
 }
}finally{await browser.close();}
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const summary=Object.fromEntries(Object.keys(routes).map(name=>[name,Object.fromEntries(['readyMs','longTaskMs','requests','dataRequests','decodedBytes'].map(key=>[key,median(results.filter(r=>r.name===name).map(r=>r[key]))]))]));
await mkdir('test-results/speed',{recursive:true});
await writeFile(`test-results/speed/${label}.json`,JSON.stringify({conditions:'Chromium, cold browser context, 1440×1000, 4× CPU slowdown, local server',results,summary},null,2));
console.log(JSON.stringify({summary},null,2));
