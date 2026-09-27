import { test, expect } from '@playwright/test';
test.use({ serviceWorkers: 'block', video: 'off' });
test('event countdown fits and expires without a new fetch', async ({ page }, info) => {
  const now = new Date('2026-09-10T12:00:00Z');
  await page.clock.install({ time: now });
  await page.route('**/api/elections/sachsen-anhalt-2026*', route => route.fulfill({ json: {
    result: { rows: [{ party: 'CDU', votes: 100 }], status: 'provisional',
      publishedAt: now.toISOString(), expiresAt: new Date(+now + 90000).toISOString() }
  } }));
  await page.goto('/?lang=de');
  const card = page.locator('.election-teaser');
  await expect(card).toBeVisible();
  await expect(card.locator('.election-temporary')).toHaveText('EVENT');
  await expect(card.getByRole('timer')).toContainText('00:01:');
  const bounds = await card.boundingBox();
  const clock = await card.getByRole('timer').boundingBox();
  expect(clock.x).toBeGreaterThanOrEqual(bounds.x);
  expect(clock.x + clock.width).toBeLessThanOrEqual(bounds.x + bounds.width);
  await card.screenshot({ path: info.outputPath('event-countdown.png') });
  await page.clock.fastForward(91000);
  await expect(card).toHaveCount(0);
});
