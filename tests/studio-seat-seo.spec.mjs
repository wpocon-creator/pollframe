import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test.use({serviceWorkers:'block'});
test('seat chart PNG and embed keep the preview geometry',async({page},info)=>{
 await page.goto('/studio/seats-grid?lang=en-GB&theme=dark');
 const svg=page.locator('.studio-current-preview-image > svg');await expect(svg).toBeVisible();
 const box=await svg.getAttribute('viewBox');
 await page.getByRole('button',{name:'Download PNG',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog.locator('.studio-png-exact-preview > svg')).toHaveAttribute('viewBox',box);
 const downloaded=page.waitForEvent('download');
 await dialog.getByRole('button',{name:'Download PNG',exact:true}).click();
 const path=info.outputPath('seat-export.png');await (await downloaded).saveAs(path);
 const bytes=await readFile(path);expect(bytes.subarray(1,4).toString()).toBe('PNG');
 const [, ,w,h]=box.split(' ').map(Number);
 expect(Math.abs(bytes.readUInt32BE(16)/bytes.readUInt32BE(20)-w/h)).toBeLessThan(0.01);
 if(await dialog.count())await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Embed',exact:true}).click();
 const code=await page.getByRole('dialog').locator('.code-label code').textContent();
 const source=code.match(/src="([^"]+)"/)[1].replaceAll('&amp;','&');
 const embed=new URL(source);await page.goto('/embed.html'+embed.search);
 await expect(page.locator('.studio-standalone-embed > svg')).toHaveAttribute('viewBox',box);
});
test('clean Studio routes open the requested preview and preserve gallery navigation',async({page})=>{
 await page.goto('/studio/seats-grid?lang=en-GB');
 await expect(page.locator('.studio-current-preview-image > svg')).toBeVisible();
 await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://pollframe.com/studio/seats-grid?lang=en-GB');
 await page.goto('/studio?lang=en-GB');
 const card=page.locator('#studio-seats-grid');
 await expect(card).toHaveAttribute('href',/\/studio\/seats-grid/);
 await card.click();
 await expect(page).toHaveURL(/\/studio\/seats-grid/);
 await expect(page.locator('.studio-current-preview-image > svg')).toBeVisible();
});
for(const template of ['seats-wide','seats-grid','seats-ring','seats-strip'])for(const theme of ['light','dark']){
 test(`${template} ${theme}: seat totals and chart marks stay above the legend`,async({page},info)=>{
  await page.setViewportSize({width:820,height:1180});
  const q=new URLSearchParams({lang:'en-GB',theme,density:'0.7',textStyles:JSON.stringify({labels:{scale:1.35},values:{scale:1.35}})});
  await page.goto(`/studio/${template}?${q}`);
  const svg=page.locator('.studio-current-preview-image > svg');
  await expect(svg).toBeVisible();await page.evaluate(()=>document.fonts.ready);
  await expect(svg.locator('[data-editor-target="legend"]')).not.toHaveCount(0);
  const collisions=await svg.evaluate(root=>{
   const legends=[...root.querySelectorAll('[data-editor-target="legend"]')].map(n=>n.getBoundingClientRect());
   const texts=[...root.querySelectorAll('text')].filter(n=>!n.closest('[data-editor-target="legend"]'));
   const intersects=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
   return texts.filter(n=>legends.some(b=>intersects(n.getBoundingClientRect(),b))).map(n=>n.textContent);
  });
  expect(collisions).toEqual([]);
  await svg.screenshot({path:info.outputPath(`${template}-${theme}.png`)});
 });
}
