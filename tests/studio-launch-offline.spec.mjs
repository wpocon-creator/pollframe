import {test,expect} from '@playwright/test';
test('ordinary visits do not preload unvisited states; installed app still prepares them offline',async({page,context})=>{
  test.setTimeout(120000);
  await page.goto('/?lang=en-GB');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  expect(await page.evaluate(async()=>Boolean(await caches.match('/data/berlin.json')))).toBe(false);
  await page.addInitScript(()=>{
    const match=window.matchMedia.bind(window);
    window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:true,addEventListener(){},removeEventListener(){}}:match(q);
  });
  await page.reload();
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await page.waitForFunction(async()=>Boolean(await caches.match('/__pollframe-offline-ready__')),null,{timeout:60000});
  const cacheInfo=await page.evaluate(async()=>{
    const names=(await caches.keys()).filter(n=>n.startsWith('pollframe-app-'));
    const responses=(await Promise.all(names.map(async n=>(await caches.open(n)).matchAll()))).flat();
    return {bytes:(await Promise.all(responses.map(r=>r.clone().arrayBuffer().then(b=>b.byteLength)))).reduce((a,b)=>a+b,0),
      berlin:Boolean(await caches.match('/data/berlin.json')),uk:Boolean(await caches.match('/data/uk-westminster.json')),es:Boolean(await caches.match('/data/spain-congress.json'))};
  });
  expect(cacheInfo.berlin&&cacheInfo.uk&&cacheInfo.es).toBe(true);
  expect(cacheInfo.bytes).toBeGreaterThan(1000000);
  console.log('Actual offline cache bytes:',cacheInfo.bytes);
  await context.setOffline(true);
  for(const region of ['berlin','uk-westminster','spain-congress']){
    await page.goto('/?region='+region+'&lang=en-GB',{waitUntil:'domcontentloaded'});
    await expect(page.locator('.results-card .result-row').first()).toBeVisible();
    expect(await page.locator('.results-card .result-row').count()).toBeGreaterThan(3);
  }
  await context.setOffline(false);
});
