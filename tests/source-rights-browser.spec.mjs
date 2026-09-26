import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('detached PNG credit is readable and remains inside preview; actual export downloads', async ({page}, info) => {
  await page.goto('/?region=bundestag&lang=de');
  await expect(page.locator('#snapshot-title')).toBeVisible();
  const widget=page.locator('#snapshot-title').locator('xpath=ancestor::*[contains(@class,"results-card")][1]');
  const button=widget.locator('.widget-png-trigger');
  await button.click();
  const preview=page.locator('.png-preview-surface[data-preview-ready="true"]');
  await expect(preview).toBeVisible();
  await expect(preview.locator('.publication-credit')).toContainText('odbl.dawum.de');
  const fit=await preview.evaluate(root=>{
    const surface=root.querySelector('.png-export-surface')??root;const credit=root.querySelector('.publication-credit');
    const r=surface.getBoundingClientRect(),c=credit.getBoundingClientRect();
    return { fits:c.left>=r.left-1&&c.right<=r.right+1&&c.bottom<=r.bottom+1, clipped:credit.scrollWidth>credit.clientWidth+1 };
  });
  expect(fit).toEqual({fits:true,clipped:false});
  await page.screenshot({path:info.outputPath('rights-png-preview.png')});
  const download=page.waitForEvent('download');
  await page.locator('.png-options-actions .primary-button').click();
  const saved=await download;
  await saved.saveAs(info.outputPath('rights-current.png'));
  expect((await readFile(await saved.path())).length).toBeGreaterThan(20000);
});

test('UK CSV preserves per-row Wikipedia licence and original publication', async ({page}) => {
  await page.goto('/?region=uk-westminster&lang=en-GB');
  const table=page.locator('.poll-table-section');
  await table.scrollIntoViewIfNeeded();
  await table.locator('summary').click();
  const csvButton=table.getByRole('button',{name:/CSV/i});
  const wait=page.waitForEvent('download');
  await csvButton.click();
  const file=await wait;const csv=await readFile(await file.path(),'utf8');
  expect(csv).toContain('"compilation_url"');
  const recent=csv.split('\r\n').filter(line=>line.includes('"CC BY-SA 4.0"'));
  expect(recent.length).toBeGreaterThan(0);
  for(const row of recent){expect(row).toContain('https://creativecommons.org/licenses/by-sa/4.0/');expect(row).toContain('https://en.wikipedia.org/wiki/');expect(row).not.toContain('"Free commercial reuse"');}
});

test('sources expose full font licence and source receipt without withheld numbers', async ({page}) => {
  await page.goto('/sources?lang=de');
  await expect(page.getByRole('link',{name:'SIL Open Font License 1.1'})).toBeVisible();
  const receipt=await (await page.request.get('/data/source-receipt.json')).json();
  expect(receipt.rights['fgw-direct'].uses.display).toBe(false);
  const text=await (await page.request.get('/licenses/Inter-OFL.txt')).text();
  expect(text).toContain('SIL OPEN FONT LICENSE Version 1.1');
});
