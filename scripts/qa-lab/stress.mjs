import {chromium} from 'playwright';
import {writeFile,mkdir} from 'node:fs/promises';
import {inspectLayout} from './browser.mjs';
const base=process.env.POLLFRAME_TEST_BASE_URL||'http://127.0.0.1:4173',out='test-results/qa-lab';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local only');
await mkdir(out,{recursive:true});
const cases=[
 {template:'poll-classic',width:820,lang:'de'},
 {template:'poll-columns',width:1440,lang:'es'},
 {template:'poll-pie',width:820,lang:'en-GB'},
 {template:'seats-ring',width:1440,lang:'de'},
 {template:'history-original',width:820,lang:'es'},
 {template:'history-original',width:1440,lang:'de',historyLayers:'4',historyLabelSize:'24',historyEventDensity:'20'},
 {template:'map-original',width:820,lang:'de'},
 {template:'party-original',width:1440,lang:'en-GB'},
];
const browser=await chromium.launch(),results=[],start=performance.now();
try{for(const[i,c]of cases.entries()){
 const context=await browser.newContext({viewport:{width:c.width,height:1000},serviceWorkers:'block',reducedMotion:'reduce'});
 const page=await context.newPage();await page.addInitScript(()=>{localStorage.setItem('opinion-poll-text-size','large');localStorage.setItem('opinion-poll-theme','dark');localStorage.setItem('pollframe-notice-dismissed:studio-guide-v1','yes');});
 const params=new URLSearchParams({view:'studio',editor:'1',workspace:'edit',theme:'dark',range:'five',titleSize:'64',subtitleSize:'32',noteSize:'24',headline:'Bundestagswahl: Wie sich die politische Stimmung in Deutschland verändert',subtitle:'Aktuelle Wahlabsichten und ihre Entwicklung – eine ausführliche Einordnung',note:'Umfragen sind Momentaufnahmen und keine Prognosen für ein Wahlergebnis.',textStyles:JSON.stringify({labels:{scale:1.35,font:'mono',italic:true},sources:{scale:1.3,font:'serif'}}),...c});
 const row={...c,id:i};try{
  await page.goto(base+'/?'+params);const svg=page.locator('.studio-current-preview-image > svg');await svg.waitFor({timeout:15000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
  row.normalized=JSON.parse(await page.locator('[data-assistant-state]').getAttribute('data-assistant-state'));
  row.issues=await page.evaluate(inspectLayout);await page.screenshot({path:`${out}/stress-${i}.png`});
  row.titleFont=await svg.locator('text').first().evaluate(n=>getComputedStyle(n).fontFamily);
 }catch(e){row.error=e.message.slice(0,500);await page.screenshot({path:`${out}/stress-${i}.png`}).catch(()=>{});}
 results.push(row);console.log(JSON.stringify({id:i,template:c.template,issues:row.issues?.length,error:row.error}));await context.close();
}}finally{await browser.close();}
await writeFile(out+'/stress.json',JSON.stringify({seconds:(performance.now()-start)/1000,results},null,2));
process.exitCode=results.some(row=>row.error||row.issues?.length)?1:0;
