import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:1440,height:1000}});
const output='output/spanish-transparency-review';
await mkdir(output,{recursive:true});
const results=[];
for (const template of ['poll-classic','history-original','map-original','seats-original','approval-current-original']) {
  await page.goto(`http://127.0.0.1:4173/?view=studio&lang=es&template=${template}&editor=1`);
  try {
    await page.locator('.studio-current-preview-image > svg').waitFor({timeout:35000});
    await page.getByRole('button',{name:'Info',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Info',exact:true});
    for (const summary of await dialog.locator('details > summary').all()) await summary.click();
    results.push({template,graphic:await page.locator('.studio-current-preview-image > svg').textContent(),info:await dialog.innerText(),links:await dialog.locator('a').evaluateAll(items=>items.map(a=>({label:a.textContent,url:a.href})))});
    await page.screenshot({path:`${output}/${template}.png`});
  } catch(error) {results.push({template,error:error.message});}
}
await writeFile(`${output}/spanish-studio.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
await browser.close();
