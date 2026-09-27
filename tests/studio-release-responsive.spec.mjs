import {test,expect} from '@playwright/test';
test('gallery renders only nearby thumbnails and remains within phone/tablet width',async({page},info)=>{
  await page.goto('/?view=studio&lang=de&topic=all');
  await expect(page.locator('.studio-template-canvas').first()).toBeVisible();
  await expect(page.locator('.studio-gallery svg').first()).toBeVisible();
  const stats=await page.evaluate(()=>({cards:document.querySelectorAll('.studio-template-canvas').length,svgs:document.querySelectorAll('.studio-gallery svg').length}));
  expect(stats.cards).toBeGreaterThan(30);expect(stats.svgs).toBeLessThan(stats.cards/2);
  console.log('Initial thumbnail render counts',stats);
  for(const width of [820,390]){
    await page.setViewportSize({width,height:900});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
    await page.screenshot({path:info.outputPath(`studio-gallery-${width}.png`)});
    await page.getByRole('button',{name:'Meine Designs',exact:true}).click();
    await page.getByRole('button',{name:'Stile',exact:true}).click();
    await page.getByRole('button',{name:'+ Neuen Stil erstellen',exact:true}).click();
    const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
    const bounds=await dialog.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width+1);expect(bounds.height).toBeLessThanOrEqual(900*.8);
    await dialog.getByRole('button',{name:'Weiter',exact:true}).click();
    await dialog.getByRole('button',{name:'Dunkel',exact:true}).click();
    await page.screenshot({path:info.outputPath(`studio-style-wizard-${width}.png`)});
    await dialog.getByRole('button',{name:'Schließen',exact:true}).click();
    await page.getByRole('button',{name:'Alle Vorlagen',exact:true}).click();
  }
});
test('rejected tutorial is not offered or downloaded',async({page})=>{
  const videoRequests=[];page.on('request',r=>{if(r.url().endsWith('.mp4'))videoRequests.push(r.url());});
  await page.goto('/?view=studio&lang=de&topic=current');
  expect(videoRequests).toHaveLength(0);
  await expect(page.getByRole('button',{name:/Editor kennenlernen/})).toHaveCount(0);
  await expect(page.locator('video')).toHaveCount(0);
});
