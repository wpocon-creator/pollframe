import { test, expect } from '@playwright/test';
import film from '../src/studio-guide-content.json' with { type: 'json' };

test('finished film decodes, has matching chapters and captions, and fits the viewport', async ({page}) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?view=studio&lang=de&topic=current#studio-guide');
  const video=page.locator('.studio-guide-video');
  await expect(video).toBeVisible();
  expect(await video.locator('track[default]').count()).toBe(0);
  await video.evaluate(el=>{el.muted=true;el.load();});
  await expect.poll(()=>video.evaluate(el=>el.readyState),{timeout:30000}).toBeGreaterThanOrEqual(2);
  expect(await video.evaluate(el=>Array.from(el.textTracks).every(track=>track.mode!=='showing'))).toBe(true);
  expect(await video.evaluate(el=>el.videoWidth)).toBe(1920);
  expect(Math.abs(await video.evaluate(el=>el.duration)-film.duration)).toBeLessThan(.2);
  await video.evaluate(el=>el.play());
  await expect.poll(()=>video.evaluate(el=>el.currentTime)).toBeGreaterThan(.1);
  await video.evaluate(el=>el.pause());
  const chapter=film.scenes.find(x=>x.id==='reuse');
  await page.locator('.studio-guide-chapters button').nth(4).click();
  await expect.poll(()=>video.evaluate(el=>el.currentTime)).toBeGreaterThanOrEqual(chapter.start-.1);
  for(const track of await video.locator('track').evaluateAll(xs=>xs.map(x=>x.src))){
    const r=await page.request.get(track);expect(r.ok()).toBe(true);expect((await r.text()).startsWith('WEBVTT')).toBe(true);
  }
  const dialog=page.locator('.studio-guide-dialog');
  // Chapter selection may scroll the dialog body; return to the video for review.
  await dialog.locator('.studio-resource-body').evaluate(el=>el.scrollTop=0);
  const box=await dialog.boundingBox(),viewport=page.viewportSize();
  expect(box.x).toBeGreaterThanOrEqual(-1);expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x+box.width).toBeLessThanOrEqual(viewport.width+1);
  expect(box.y+box.height).toBeLessThanOrEqual(viewport.height+1);
  await page.screenshot({path:test.info().outputPath('finished-film-player.png')});
  await page.keyboard.press('Escape');await expect(video).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('current-poll preview does not inherit errors from unrelated approval data', async({page})=>{
  await page.route('**/data/approval.json',route=>route.fulfill({contentType:'application/json',body:'{"countries":{}}'}));
  await page.addInitScript(()=>localStorage.setItem('pollframe-notice-dismissed:studio-guide-v1','yes'));
  await page.goto('/?view=studio&lang=en-GB&topic=approval-current');
  await expect(page.locator('.studio-availability-note')).toBeVisible();
  // React keeps the loaded data state when returning to all designs.
  await page.getByRole('button',{name:'Latest polls',exact:true}).click();
  await page.locator('#studio-poll-classic').click();
  await expect(page.getByRole('alert').filter({hasText:'Data unavailable'})).toHaveCount(0);
  await expect(page.locator('.studio-current-preview')).toBeVisible();
});
