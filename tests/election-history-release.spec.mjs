import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test('Sachsen-Anhalt result is a separate provisional marker, not a fabricated poll',async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/embed.html?region=sachsen-anhalt&lang=de&range=year&mode=trend&parties=7,101,2&events=state-election');
  const markers=page.locator('.election-point');await expect(markers.first()).toBeVisible({timeout:30000});
  await expect(markers.first()).toHaveAttribute('aria-label',/Vorläufiges amtliches Wahlergebnis/);
  expect((await markers.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')))).join(' ')).toContain('43.8%');
  const response=await page.request.get('/data/sachsen-anhalt.json'),data=await response.json();
  expect(data.metadata.electionResults['2026-09-06']['7']).toBe(43.8);
  expect(data.polls.some(p=>p.date==='2026-09-06'&&p.results['7']===43.8)).toBe(false);
  await expect(page.locator('a[href="https://www.govdata.de/dl-de/by-2-0"]')).toHaveCount(1);
  await page.screenshot({path:info.outputPath('sachsen-anhalt-result.png'),fullPage:true});
  expect(errors).toEqual([]);
  await page.goto('/embed.html?region=sachsen-anhalt&lang=de&range=year&mode=trend&parties=7,101,2&events=');
  await expect(page.locator('.chart-region')).toBeVisible();await expect(page.locator('.election-point')).toHaveCount(0);
});
