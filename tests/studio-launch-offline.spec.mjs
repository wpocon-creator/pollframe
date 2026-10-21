import {test,expect} from '@playwright/test';
test('ordinary visits do not preload unvisited states; installed app still prepares them offline',async({page,context})=>{
  test.setTimeout(120000);
  await page.goto('/?lang=en-GB');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  expect(await page.evaluate(async()=>{
    const keys=(await Promise.all((await caches.keys()).map(async name=>(await caches.open(name)).keys()))).flat();
    return keys.some(request=>new URL(request.url).pathname==='/data/berlin.json');
  })).toBe(false);
  await page.addInitScript(()=>{
    const match=window.matchMedia.bind(window);
    window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:true,addEventListener(){},removeEventListener(){}}:match(q);
  });
  await page.reload();
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await page.waitForFunction(async()=>Boolean(await caches.match('/__pollframe-offline-ready__')),null,{timeout:60000});
  const cacheInfo=await page.evaluate(async()=>{
    const names=(await caches.keys()).filter(n=>n.startsWith('pollframe-app-'));
    // Match each stored request with its original headers. A public preload
    // can carry Origin and Vary: Origin; a synthetic headerless Request need
    // not match it, even though the cached response is present and usable.
    const entries=(await Promise.all(names.map(async n=>{
      const cache=await caches.open(n);return Promise.all((await cache.keys()).map(async request=>({path:new URL(request.url).pathname,response:await cache.match(request)})));
    }))).flat();
    const responses=entries.map(e=>e.response).filter(Boolean);
    const has=path=>entries.some(e=>e.path===path&&e.response?.ok);
    return {bytes:(await Promise.all(responses.map(r=>r.clone().arrayBuffer().then(b=>b.byteLength)))).reduce((a,b)=>a+b,0),
      berlin:has('/data/berlin.json'),uk:has('/data/uk-westminster.json'),es:has('/data/spain-congress.json')};
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
