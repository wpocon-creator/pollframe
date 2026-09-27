import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseElectionResults, parseElectionSeats } from '../worker/election-results.js';
const fixture = JSON.parse(readFileSync(new URL('./fixtures/election-st2026-tables.json', import.meta.url)));
const html = table => `Landtagswahl Sachsen-Anhalt 2026<div id="zeitstempel" data-value="${fixture.stamp}"></div><div id="statusXY">2661 von 2661 Wahlbezirken</div><script data-for="ergtable">${JSON.stringify({x:{tag:{attribs:table}}})}</script>`;
const result = {...parseElectionResults(html(fixture.results),fixture.stamp+1000), seatAllocation:parseElectionSeats(html(fixture.seats),fixture.stamp+1000), expiresAt:'2026-09-11T19:06:45Z'};
test.use({serviceWorkers:'block'});
test('each election widget exports its selected data and has an isolated themed embed', async ({page}, info) => {
  await page.route('**/api/elections/sachsen-anhalt-2026*',route=>route.fulfill({json:{result}}));
  await page.goto('/?view=election-st2026&lang=de');
  await expect(page.locator('[data-election-widget]')).toHaveCount(4);
  await page.getByLabel('Vergleich mit',{exact:true}).selectOption('poll');
  await expect(page.locator('.election-poll-note').first()).toContainText('03.09.2026');
  await page.locator('.election-party-picker').getByRole('button',{name:/CDU/}).click();
  for (const kind of ['comparison','turnout','votes','seats']) {
    const widget = page.locator(`[data-election-widget="${kind}"]`);
    await widget.locator('.widget-png-trigger').click();
    const modal=page.getByRole('dialog',{name:'PNG exportieren'});
    await expect(modal).toBeVisible();
    await expect(modal.locator('[data-preview-ready="true"]')).toBeVisible({timeout:60000});
    const download=page.waitForEvent('download');
    await modal.getByRole('button',{name:'PNG herunterladen',exact:true}).click();
    const file=await download; await file.saveAs(info.outputPath(`${kind}.png`));
    await modal.getByRole('button',{name:'Schließen',exact:true}).click();
    await widget.locator('.widget-share-trigger').first().click();
    const share=page.locator('.widget-share-modal');
    await expect(share).toBeVisible();
    const code=await share.locator('.code-label code').textContent();
    expect(code).toContain(`electionWidget=${kind}`);
    expect(code).toContain('view=election-st2026');
    await share.getByRole('button',{name:'Schließen',exact:true}).click();
  }
  for (const kind of ['comparison','turnout','votes','seats']) {
    await page.goto(`/embed.html?view=election-st2026&electionWidget=${kind}&lang=de&theme=dark&baseline=poll&coalition=CDU`);
    await expect(page.locator(`[data-election-widget="${kind}"]`)).toBeVisible();
    await expect(page.locator('[data-election-widget]:visible')).toHaveCount(1);
    await expect(page.locator('.site-header')).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`${kind}-embed.png`),fullPage:true});
  }
});
