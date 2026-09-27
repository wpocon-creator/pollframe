import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:390,height:844}});
await mkdir('output/quality-review',{recursive:true});
await page.addInitScript(()=>localStorage.setItem('opinion-poll-text-size','large'));
for(const [name,url] of [['de','/?lang=de'],['uk','/?country=uk&lang=de'],['es','/?country=es&lang=de'],['approval','/?view=approval&country=de&lang=de'],['polls','/?region=bundestag&lang=de']]){
  await page.goto('http://127.0.0.1:4173'+url);
  await page.waitForTimeout(900);
  await page.evaluate(()=>document.documentElement.style.fontSize='32px');
  const overflow=await page.locator('main').evaluateAll(mains=>mains.flatMap(main=>[...main.querySelectorAll('h1,h2,h3,p,button,td,strong')].filter(e=>!e.closest('svg,.sr-only,[hidden]')).flatMap(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.left< -1||r.right>innerWidth+1)?[{tag:e.tagName,cls:e.className,text:e.textContent.slice(0,80),left:r.left,right:r.right}]:[]})));
  console.log(name,JSON.stringify(overflow));
  await page.screenshot({path:`output/quality-review/${name}-200-percent.png`,fullPage:true});
}
await browser.close();
