import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
const path=source.match(/const BUG_REPORT_DASHBOARD_PATH = "([^"]+)"/)[1];
test('admin key is not persisted and late refresh cannot reopen logged-out data',async({page})=>{
  await page.addInitScript(()=>sessionStorage.setItem('pollframe-bug-admin-key','legacy-test-key'));
  let unblock,delay=false;
  await page.route('**/api/bug-reports?*',async route=>{
    if(delay)await new Promise(resolve=>unblock=resolve);
    await route.fulfill({json:{reports:[],stats:{total:7}},headers:{'cache-control':'no-store'}});
  });
  await page.route('**/api/analytics',route=>route.fulfill({json:{dayCounts:{}},headers:{'cache-control':'no-store'}}));
  await page.goto(path);
  expect(await page.evaluate(()=>sessionStorage.getItem('pollframe-bug-admin-key'))).toBeNull();
  await page.getByLabel('Dashboard key').fill('synthetic-test-secret');
  await page.getByRole('button',{name:'Open dashboard',exact:true}).click();
  await expect(page.getByRole('button',{name:'Log out',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem('pollframe-bug-admin-key'))).toBeNull();
  delay=true;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>Boolean(unblock)).toBe(true);
  await page.getByRole('button',{name:'Log out',exact:true}).click();
  unblock();
  await expect(page.getByLabel('Dashboard key')).toHaveValue('');
  await expect(page.locator('.bug-stats')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Open dashboard',exact:true})).toBeVisible();
});
