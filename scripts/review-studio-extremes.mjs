import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { STUDIO_TEMPLATE_IDS } from '../src/studio-template-ids.js';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1280,height:900}});
await mkdir('output/quality-review',{recursive:true});
const failures=[];
page.on('pageerror',e=>failures.push(e.message));
for(const template of ['poll-classic','poll-columns','poll-pie','history-original','history-paper','history-panels','approval-original','approval-aligned','seats-original','majority-original']){
 if(!STUDIO_TEMPLATE_IDS.includes(template))throw Error(`Unknown template: ${template}`);
 const params=new URLSearchParams({view:'studio',lang:'de',template,editor:'1',workspace:'edit',range:'all',theme:'dark',font:'mono',titleSize:'64',subtitleSize:'30',noteSize:'24',historyLabelSize:'22',headline:'Politische Stimmung in Deutschland: die Ergebnisse der aktuellen Umfragen im Vergleich',subtitle:'Ausgewählte Umfragen und ihre Entwicklung – eine journalistische Betrachtung',editorNote:'Eine redaktionelle Anmerkung mit etwas mehr Text, die auch in größerer Schrift vollständig lesbar bleiben muss.',historyLayers:'4',historyEventLimit:'16'});
 await page.goto('http://127.0.0.1:4173/?'+params);
 const svg=page.locator('.studio-current-preview-image > svg');
 try {await svg.waitFor({timeout:20000});await page.waitForTimeout(400);}
 catch(e){console.log('LOAD',template,e.message);continue;}
 const issues=await svg.evaluate(svg=>{
   const view=svg.viewBox.baseVal;
   return [...svg.querySelectorAll('text')].flatMap(e=>{
     const box=e.getBBox(),ctm=e.getCTM(),point=(x,y)=>new DOMPoint(x,y).matrixTransform(ctm).matrixTransform(svg.getCTM().inverse());
     const a=point(box.x,box.y),b=point(box.x+box.width,box.y+box.height);
     return a.x < 0 || b.x > view.width+1 || a.y <0 || b.y>view.height+1 ? [{text:e.textContent.slice(0,120),a:{x:a.x,y:a.y},b:{x:b.x,y:b.y}}]:[];
   });
 });
 console.log(template,JSON.stringify(issues));
 await page.screenshot({path:`output/quality-review/${template}-extreme.png`});
}
console.log('runtime errors',JSON.stringify(failures));
await browser.close();
