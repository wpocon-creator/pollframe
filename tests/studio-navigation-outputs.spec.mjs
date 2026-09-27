import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.use({ serviceWorkers: 'block' });
test('adjacent designs keep settings, both outputs, and a single gallery back', async ({page}, info) => {
  await page.goto('/?view=studio&profile=current-poll&lang=de&parties=1,2,4&theme=dark');
  await expect(page.locator('.studio-local-badge')).toHaveCount(0);
  await expect(page.locator('.studio-header')).toHaveCount(0);
  await page.locator('#studio-poll-classic').click({timeout:60000});
  await expect(page.getByRole('button', {name:'Vorheriges Design', exact:true})).toBeDisabled();
  await page.getByRole('button', {name:'Nächstes Design', exact:true}).click();
  await expect(page.locator('.studio-current-preview h1')).toHaveText('Kreisdiagramm');
  await expect(page.getByRole('button', {name:'PNG herunterladen', exact:true})).toBeVisible();
  if(await page.locator("dialog[open]").count())await page.locator("dialog[open]").getByRole("button",{name:"Schließen"}).click();
  await page.getByRole('button', {name:'Embed', exact:true}).click();
  await expect(page.locator('.studio-current-preview-image svg')).toBeVisible();
  const code = await page.locator('dialog[open] textarea').inputValue();
  expect(code).toContain('template=poll-pie');
  expect(code).toContain('parties=1%2C2%2C4');
  expect(code).toContain('theme=dark');
  const header = await page.locator('.header-inner').boundingBox();
  for (const element of await page.locator('.header-inner a:visible, .header-inner button:visible').all()) {
    const rect = await element.boundingBox();
    expect(rect.x + rect.width).toBeLessThanOrEqual(header.x + header.width + 1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('studio-navigation.png'),fullPage:true});
  const embed = await page.context().newPage();
  await embed.route('**/studio-journalist-test', route => route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><main style="max-width:960px;margin:auto">${code}</main>`}));
  await embed.goto('/studio-journalist-test');
  const embeddedSvg = embed.frameLocator('iframe').locator('.studio-standalone-embed > svg');
  await expect(embeddedSvg).toBeVisible();
  expect(await embeddedSvg.getAttribute('viewBox')).toBe(await page.locator('.studio-current-preview-image svg').getAttribute('viewBox'));
  expect(await embeddedSvg.textContent()).toBe(await page.locator('.studio-current-preview-image svg').textContent());
  const graphicBox = await embeddedSvg.boundingBox();
  const frameBox = await embed.locator('iframe').boundingBox();
  expect(Math.abs(graphicBox.height-frameBox.height)).toBeLessThan(2);
  await embed.locator('iframe').screenshot({path:info.outputPath('studio-embed.png'),timeout:60000});
  await embed.close();
  await page.getByRole('button', {name:'Alle Designs',exact:false}).click();
  await expect(page.locator('.studio-template-card')).toHaveCount(13);
});

test('analytics opt-out persists, opt-in reverses it and automation is excluded', async ({page}) => {
  await page.route('**/analytics-test*', route => route.fulfill({contentType:'text/html',body:'<!doctype html><title>Analytics test</title>'}));
  await page.addInitScript(() => Object.defineProperty(navigator,'webdriver',{get:()=>false,configurable:true}));
  const excluded = () => page.evaluate(async () => (await import('/analytics-preference.js')).analyticsExcluded());
  await page.goto('/analytics-test?analytics=off');
  expect(await excluded()).toBe(true);
  await page.goto('/analytics-test');
  expect(await excluded()).toBe(true);
  await page.goto('/analytics-test?analytics=on');
  expect(await excluded()).toBe(false);
  await page.evaluate(() => Object.defineProperty(navigator,'webdriver',{get:()=>true}));
  expect(await excluded()).toBe(true);
});

test('Cloudflare loader sends no request for excluded visits and loads for normal visits under CSP', async ({page}) => {
  let requests = 0;
  await page.addInitScript(() => Object.defineProperty(navigator,'webdriver',{get:()=>false}));
  await page.route('https://static.cloudflareinsights.com/**', route => { requests++; return route.fulfill({contentType:'application/javascript',body:''}); });
  for(const file of ['analytics-beacon.js','analytics-preference.js']) await page.route(`https://pollframe.com/${file}`,route=>readFile(`public/${file}`,'utf8').then(body=>route.fulfill({contentType:'application/javascript',body})));
  await page.route('**/analytics-test*', route => route.fulfill({contentType:'text/html', headers:{'Content-Security-Policy':"script-src 'self' https://static.cloudflareinsights.com; require-trusted-types-for 'script'; trusted-types pollframe-analytics"}, body:`<!doctype html><script type="module" src="/analytics-beacon.js" data-pollframe-beacon="${'a'.repeat(32)}"></script>`}));
  await page.goto('/analytics-test?analytics=off');
  await page.waitForLoadState('networkidle');
  expect(requests).toBe(0);
  await page.goto('/analytics-test?analytics=on');
  await page.waitForLoadState('networkidle');
  expect(requests).toBe(0); // Even manual local previews are not production traffic.
  await page.goto('https://pollframe.com/analytics-test?analytics=off');
  await page.waitForLoadState('networkidle');
  expect(requests).toBe(0);
  await page.goto('https://pollframe.com/analytics-test');
  await page.waitForLoadState('networkidle');
  expect(requests).toBe(0);
  await page.goto('https://pollframe.com/analytics-test?analytics=on');
  await expect.poll(() => requests).toBe(1);
});
