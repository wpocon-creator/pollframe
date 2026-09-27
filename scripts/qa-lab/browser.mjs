import {chromium,firefox} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const base=process.env.POLLFRAME_TEST_BASE_URL||'http://127.0.0.1:4173';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local only');
const output=path.resolve('test-results/qa-lab');await mkdir(output,{recursive:true});
const mode=process.argv[2]||'matrix';
const routes={overview:'/',history:'/?region=bundestag',studio:'/?view=studio&template=history-original&range=five&editor=1',current:'/?view=studio&template=poll-classic&editor=1',seats:'/?view=studio&template=seats-ring&editor=1',watchlist:'/?view=watchlist&source=app'};
const sizes={phone:{width:390,height:844},tablet:{width:820,height:1180},desktop:{width:1440,height:900}};

// A real pair covering array, measured rather than simply called "pairwise".
function pairs(row){const entries=Object.entries(row);return entries.flatMap((a,i)=>entries.slice(i+1).map(b=>JSON.stringify([a,b])));}
function cover(factors){
 let all=[{}];for(const[key,values]of Object.entries(factors))all=all.flatMap(r=>values.map(value=>({...r,[key]:value})));
 const uncovered=new Set(all.flatMap(pairs)),total=uncovered.size,rows=[];
 while(uncovered.size){let best,score=-1;for(const row of all){const n=pairs(row).filter(p=>uncovered.has(p)).length;if(n>score){best=row;score=n;}}if(!score)throw Error('Uncovered pairs');rows.push(best);pairs(best).forEach(p=>uncovered.delete(p));all=all.filter(r=>r!==best);}
 return {rows,totalPairs:total,uncovered:uncovered.size};
}

export function inspectLayout(){
 const issues=[];const visible=n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden],[inert],dialog:not([open])');};
 const describe=n=>({tag:n.tagName,text:(n.textContent||'').trim().replace(/\s+/g,' ').slice(0,100),target:n.closest('[data-editor-target]')?.getAttribute('data-editor-target')||null});
 const rect=r=>({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)});
 if(document.documentElement.scrollWidth>innerWidth+2)issues.push({kind:'page-overflow',extra:document.documentElement.scrollWidth-innerWidth});
 for(const n of document.querySelectorAll('h1,h2,h3,p,button,summary,label')){
  if(!visible(n))continue;const s=getComputedStyle(n);
  if((['hidden','clip'].includes(s.overflowX)&&n.scrollWidth>n.clientWidth+3||['hidden','clip'].includes(s.overflowY)&&n.scrollHeight>n.clientHeight+3)&&s.textOverflow!=='ellipsis')issues.push({kind:'clipped-text',...describe(n),rect:rect(n.getBoundingClientRect())});
 }
 for(const svg of document.querySelectorAll('svg')){
  const area=svg.getBoundingClientRect();if(!visible(svg)||area.width<200||area.height<100)continue;
  const texts=[...svg.querySelectorAll('text')].filter(visible).map(n=>({n,r:n.getBoundingClientRect()}));
  for(const{n,r}of texts){if(r.left<area.left-3||r.right>area.right+3||r.top<area.top-3||r.bottom>area.bottom+3)issues.push({kind:'svg-text-outside',...describe(n),rect:rect(r)});}
  for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){
   const a=texts[i],b=texts[j];if(a.n.contains(b.n)||b.n.contains(a.n))continue;
   const dx=Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left),dy=Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top);
   if(dx>3&&dy>3)issues.push({kind:'svg-text-collision',first:describe(a.n),second:describe(b.n),overlap:[Math.round(dx),Math.round(dy)]});
  }
 }
 return issues.slice(0,100);
}

async function prepare(browser,row){
 const context=await browser.newContext({viewport:sizes[row.viewport||'desktop'],hasTouch:row.viewport==='phone',serviceWorkers:'block',reducedMotion:'reduce'});
 // Playwright routing disables HTTP cache. Never install it for timing runs.
 if(mode!=='performance')await context.route(/cloudflareinsights|\/api\/analytics\/event|\/api\/studio\/popular/,(r)=>r.abort());
 await context.addInitScript(({theme,text,route})=>{
  localStorage.setItem('opinion-poll-theme',theme);localStorage.setItem('opinion-poll-text-size',text);
  localStorage.setItem('pollframe-notice-dismissed:studio-guide-v1','yes');
  localStorage.setItem('pollframe-analytics-off','1');
  if(route==='watchlist'){
   const original=window.matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:true,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}:original(q);
   localStorage.setItem('pollframe-watchlist-de-v2',JSON.stringify(['4','1','2'].map((party,i)=>({id:'qa-'+i,country:'de',regionSlug:'bundestag',type:'party',partyIds:[party],label:['Grüne · Bundestag','CDU/CSU · Bundestag','SPD · Bundestag'][i],layout:'wide',createdAt:'2026-08-01T10:00:00Z',lastSnapshot:{date:'2026-07-01',value:10}}))));
  }
 },row);
 const page=await context.newPage();return{context,page};
}
async function ready(page){await page.waitForSelector('main',{timeout:20000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(400);}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
if(mode==='matrix'){
 const design=cover({route:Object.keys(routes),browser:['chromium','firefox'],viewport:Object.keys(sizes),lang:['de','en-GB','en-US','es'],theme:['light','dark'],text:['standard','large']});
 await writeFile(path.join(output,'matrix-plan.json'),JSON.stringify(design,null,2));
 const browsers={chromium:await chromium.launch(),firefox:await firefox.launch()},results=[];const started=performance.now();
 try{for(const[i,row]of design.rows.entries()){
  const{context,page}=await prepare(browsers[row.browser],row),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push({status:r.status(),path:new URL(r.url()).pathname});});
  const t=performance.now();let record={id:i,...row};
  try{
   const url=new URL(routes[row.route],base);url.searchParams.set('lang',row.lang);url.searchParams.set('theme',row.theme);
   await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:25000});await ready(page);
   if(['studio','current','seats'].includes(row.route))await page.waitForSelector('.studio-current-preview-image svg',{timeout:10000});
   if(row.route==='watchlist')await page.waitForSelector('.watch-card-party',{timeout:10000});
   record.issues=await page.evaluate(inspectLayout);record.errors=errors;record.failedResponses=failed;
   record.applied=await page.evaluate(()=>({theme:document.documentElement.dataset.theme,text:document.documentElement.dataset.text,lang:document.documentElement.lang,charts:document.querySelectorAll('svg').length}));
   await page.screenshot({path:path.join(output,`matrix-${i}.png`)});
  }catch(e){record.error=e.message;await page.screenshot({path:path.join(output,`matrix-${i}-error.png`)}).catch(()=>{});}
  record.seconds=Number(((performance.now()-t)/1000).toFixed(2));results.push(record);await context.close();console.log(JSON.stringify({id:i,...row,issues:record.issues?.length,error:record.error?.slice(0,120),seconds:record.seconds}));
  await writeFile(path.join(output,'matrix-results.json'),JSON.stringify({totalPairs:design.totalPairs,uncovered:design.uncovered,seconds:(performance.now()-started)/1000,results},null,2));
 }}finally{await Promise.all(Object.values(browsers).map(b=>b.close()));}
 process.exitCode=results.some(row=>row.error||row.issues?.length||row.errors?.length||row.failedResponses?.length)?1:0;
}else if(mode==='sensitivity'){
 const browser=await chromium.launch(),results=[];const t=performance.now();
 try{const{context,page}=await prepare(browser,{theme:'light',text:'standard'});
  // Known clean specimen makes false positives measurable. Never touches app source.
  const clean='<main><h1>Polling</h1><svg width="600" height="300"><text id="a" x="40" y="80">Party A</text><text id="b" x="40" y="140">Party B</text><path class="series" d="M160 80H400M160 140H300" stroke="blue" stroke-width="12"/></svg></main>';
  for(const fault of ['clean','wide-page','clipped-heading','escaped-chart-label','colliding-chart-label','missing-series']){
   await page.setContent(clean);
   await page.evaluate(fault=>{
    if(fault==='wide-page')document.body.style.width='2200px';
    if(fault==='clipped-heading')document.querySelector('h1').style.cssText='width:15px;white-space:nowrap;overflow:hidden';
    if(fault==='escaped-chart-label')document.querySelector('#a').setAttribute('x','900');
    if(fault==='colliding-chart-label')document.querySelector('#b').setAttribute('y','80');
    if(fault==='missing-series')document.querySelector('.series').remove();
   },fault);
   const issues=await page.evaluate(inspectLayout);
   const smoke=await page.locator('svg').isVisible();
   const semantic=await page.locator('path.series').count()===1;
   results.push({fault,smokeDetected:!smoke,geometryDetected:issues.length>0,semanticDetected:!semantic,issues});
  }await context.close();
 }finally{await browser.close();}
 await writeFile(path.join(output,'sensitivity.json'),JSON.stringify({seconds:(performance.now()-t)/1000,results},null,2));console.log(JSON.stringify(results.map(({issues,...r})=>r)));
 process.exitCode=results.some(row=>row.fault==='clean'?(row.smokeDetected||row.geometryDetected||row.semanticDetected):!(row.geometryDetected||row.semanticDetected))?1:0;
}else if(mode==='performance'){
 const browser=await chromium.launch(),results=[];
 try{for(const route of ['overview','history','studio'])for(let repeat=0;repeat<3;repeat++){
  const{context,page}=await prepare(browser,{theme:'light',text:'standard'});
  for(const cache of ['cold','warm']){
   const t=performance.now();await page.goto(new URL(routes[route],base).href);await ready(page);
   if(route==='studio')await page.waitForSelector('.studio-current-preview-image svg');
   results.push({route,repeat,cache,readyMs:Math.round(performance.now()-t),...await page.evaluate(()=>({requests:performance.getEntriesByType('resource').length,transferredBytes:performance.getEntriesByType('resource').reduce((s,r)=>s+r.transferSize,0)}))});
  }await context.close();
 }}finally{await browser.close();}
 await writeFile(path.join(output,'performance.json'),JSON.stringify({environment:'local browser readiness, not production Core Web Vitals; 400ms settling included',results},null,2));console.log(JSON.stringify(results));
}else throw Error('Unknown mode');
}
