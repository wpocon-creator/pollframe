import {test,expect} from '@playwright/test';
test('withdrawn approval designs are absent, old bookmarks explain rather than retry',async({page})=>{
  const requests=[];page.on('request',r=>{if(r.url().includes('/data/approval.json'))requests.push(r.url());});
  await page.addInitScript(()=>localStorage.setItem('pollframe-notice-dismissed:studio-guide-v1','yes'));
  await page.goto('/?view=studio&lang=en-GB&topic=approval&template=approval-original&editor=1');
  await expect(page.getByRole('status').filter({hasText:'Approval designs are temporarily unavailable'})).toBeVisible();
  await expect(page.locator('[id^="studio-approval-"]')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/^(Current approval|Approval history)$/})).toHaveCount(0);
  await expect(page.getByRole('alert').filter({hasText:'Data unavailable'})).toHaveCount(0);
  expect(page.url()).toContain('template=approval-original');
  await page.getByRole('button',{name:'Latest polls',exact:true}).click();
  await page.locator('#studio-poll-classic').click();
  await expect(page.locator('.studio-current-preview svg')).toBeVisible({timeout:30000});
  await expect(page.locator('.studio-availability-note')).toHaveCount(0);
  expect(requests).toEqual([]);
});
test('gallery excludes approval designs in every language',async({page})=>{
  for(const lang of ['de','en-GB','en-US','es']){
    await page.goto(`/?view=studio&lang=${lang}`);
    await expect(page.locator('.studio-topic-tabs')).toBeVisible();
    await expect(page.locator('[id^="studio-approval-"]')).toHaveCount(0);
    expect(await page.locator('.studio-topic-tabs button').count()).toBe(8);
  }
});
test('an old approval embed never substitutes voting-intention data',async({page})=>{
  await page.goto('/embed.html?studioDesign=1&template=approval-current-bars&country=de&lang=en-GB');
  await expect(page.getByRole('status').filter({hasText:'This approval design is temporarily unavailable.'})).toBeVisible();
  await expect(page.locator('.studio-standalone-embed svg')).toHaveCount(0);
});
