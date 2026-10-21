import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
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
  // waitForFunction treats a returned Promise as truthy before it resolves.
  // Poll the resolved value on the test side, not an async browser predicate.
  await expect.poll(()=>page.evaluate(async()=>Boolean(await caches.match('/__pollframe-offline-ready__'))),{timeout:60000}).toBe(true);
  const cacheInfo=await page.evaluate(async()=>{
    const names=(await caches.keys()).filter(n=>n.startsWith('pollframe-app-'));
    // Inventory storage without manufacturing requests. Browser-controlled
    // Vary headers (notably Accept-Encoding) are not all exposed by keys().
    // Actual usability is independently verified through offline navigations
    // below, including the rendered values, not inferred from this inventory.
    const cachesInfo=await Promise.all(names.map(async n=>{
      const cache=await caches.open(n);return {keys:await cache.keys(),responses:await cache.matchAll()};
    }));
    const responses=cachesInfo.flatMap(c=>c.responses);
    const paths=cachesInfo.flatMap(c=>c.keys.map(request=>new URL(request.url).pathname));
    const has=path=>paths.includes(path);
    return {bytes:(await Promise.all(responses.map(r=>r.clone().arrayBuffer().then(b=>b.byteLength)))).reduce((a,b)=>a+b,0),
      berlin:has('/data/berlin.json'),uk:has('/data/uk-westminster.json'),es:has('/data/spain-congress.json')};
  });
  expect(cacheInfo).toMatchObject({berlin:true,uk:true,es:true});
  expect(cacheInfo.bytes).toBeGreaterThan(1000000);
  console.log('Actual offline cache bytes:',cacheInfo.bytes);
  await context.setOffline(true);
  for(const region of ['berlin','uk-westminster','spain-congress']){
    await page.goto('/?region='+region+'&lang=en-GB',{waitUntil:'domcontentloaded'});
    await expect(page.locator('.results-card .result-row').first()).toBeVisible();
    expect(await page.locator('.results-card .result-row').count()).toBeGreaterThan(3);
    const expected=JSON.parse(await readFile(new URL(`../dist/data/${region}.json`,import.meta.url),'utf8'));
    expect(await page.evaluate(async region=>{
      const response=await fetch(`/data/${region}.json`);
      if(!response.ok)throw Error(`Offline data returned ${response.status}`);
      return response.json();
    },region)).toEqual(expected);
  }
  await context.setOffline(false);
});
