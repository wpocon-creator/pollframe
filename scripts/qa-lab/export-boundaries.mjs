import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {inspectLayout} from './browser.mjs';
const base=process.env.POLLFRAME_TEST_BASE_URL||'http://127.0.0.1:4173';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local only');
const out='test-results/qa-lab';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[],start=performance.now();
try{for(const template of ['seats-ring','history-original']){
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 const page=await context.newPage();await page.addInitScript(()=>{localStorage.setItem('pollframe-analytics-off','1');localStorage.setItem('pollframe-notice-dismissed:studio-guide-v1','yes');});
 const params=new URLSearchParams({view:'studio',editor:'1',workspace:'edit',template,lang:'de',range:'five',theme:'dark',titleSize:'64',headline:'Bundestagswahl: Wie sich die politische Stimmung in Deutschland verändert',textStyles:JSON.stringify({sources:{scale:1.3,font:'serif'}})});
 const row={template};
 try{
  await page.goto(base+'/?'+params);await page.locator('.studio-current-preview-image > svg').waitFor();await page.evaluate(()=>document.fonts.ready);
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'SVG',exact:true}).click();const download=await pending;
  await download.saveAs(`${out}/${template}-boundary.svg`);
  const svg=await readFile(await download.path(),'utf8');
  const rendered=await context.newPage();
  // Explicit dimensions avoid Chromium's standalone SVG document screenshot
  // ambiguity with percentage-sized roots. The downloaded text is unchanged.
  await rendered.setContent('<!doctype html><html><body style="margin:0;background:#202020">'+svg+'</body></html>');
  await rendered.locator('svg').first().evaluate(node=>{const v=node.viewBox.baseVal;node.style.width=v.width+'px';node.style.height=v.height+'px';});
  await rendered.evaluate(()=>document.fonts.ready);
  row.exportIssues=(await rendered.evaluate(inspectLayout)).filter(x=>x.kind.startsWith('svg-'));
  await rendered.screenshot({path:`${out}/${template}-export-boundary.png`,timeout:10000});
 }catch(e){row.error=e.message.slice(0,500);}
 results.push(row);await context.close();
}}finally{await browser.close();}
const result={seconds:(performance.now()-start)/1000,results};await writeFile(`${out}/export-boundaries.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
process.exitCode=results.some(row=>row.error||row.exportIssues?.length)?1:0;
