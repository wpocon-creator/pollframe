import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
await mkdir('output/quality-review',{recursive:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.addInitScript(()=>{
  localStorage.setItem('opinion-poll-text-size','large');
  localStorage.setItem('pollframe-watchlist-de-v2',JSON.stringify([
    {id:'party',country:'de',regionSlug:'bundestag',type:'party',partyIds:['4'],layout:'square'},
    {id:'coalition',country:'de',regionSlug:'bundestag',type:'coalition',partyIds:['1','2','4'],layout:'square'},
    {id:'snapshot',country:'de',regionSlug:'bundestag',type:'snapshot',partyIds:[],layout:'wide'},
    {id:'approval',country:'de',regionSlug:'bundestag',type:'approval',partyIds:[],layout:'wide'},
  ]));
  const original=matchMedia.bind(window);
  window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:true,addEventListener(){},removeEventListener(){}}:original(q);
});
for(const [name,url] of [['watchlist','/?view=watchlist&country=de&lang=de'],['overview','/?lang=de'],['polls','/?region=bundestag&lang=de'],['studio','/?view=studio&lang=de']]){
 await page.goto('http://127.0.0.1:4173'+url);await page.waitForTimeout(1800);
 await page.screenshot({path:`output/quality-review/${name}-large-before.png`,fullPage:true});
 console.log(name,await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,font:getComputedStyle(document.documentElement).fontSize,overflow:[...document.querySelectorAll('.watch-card,.watch-card *')].filter(e=>{const r=e.getBoundingClientRect(),p=e.closest('.watch-card')?.getBoundingClientRect();return p&&r.width&&r.height&&(r.right>p.right+1||r.bottom>p.bottom+1)}).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,90)})).slice(0,25)})));
}
await browser.close();
