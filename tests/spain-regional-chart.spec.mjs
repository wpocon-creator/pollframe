import { test, expect } from '@playwright/test';

test('Spanish regional polling reuses the standard fitted chart without claiming an average', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?country=es&lang=es&view=spain-region&area=cataluna');
  const section = page.locator('.spain-region-history');
  await expect(section.locator('.poll-chart')).toBeVisible();
  await expect(section.locator('.grid-line').first()).toBeAttached();
  await expect(section.locator('.line-legend .party-info-trigger')).toHaveCount(6);
  await expect(section.locator('.average-series-line').first()).toBeVisible();
  await expect(section.locator('.latest-poll-legend')).toHaveCount(0);
  await expect(page.locator('.region-trend')).toHaveCount(0);
  const layout = await section.locator('.poll-chart').evaluate(svg => ({
    width: svg.getBoundingClientRect().width,
    viewport: document.documentElement.clientWidth,
    paths: [...svg.querySelectorAll('path')].map(path => path.getAttribute('d')).filter(Boolean),
  }));
  expect(layout.width).toBeLessThanOrEqual(layout.viewport);
  expect(layout.paths.every(path => !/NaN|Infinity/.test(path))).toBe(true);
  const headingLayout = await section.evaluate(widget => {
    const title = widget.querySelector('h2').getBoundingClientRect();
    const date = widget.querySelector('.current-widget-meta').getBoundingClientRect();
    return { separate: date.bottom <= title.top, titleWidth: title.width, width: widget.clientWidth };
  });
  expect(headingLayout.separate).toBe(true);
  expect(headingLayout.titleWidth).toBeGreaterThan(headingLayout.width * .6);
  expect(errors).toEqual([]);
  await section.screenshot({ path: testInfo.outputPath('spanish-regional-light.png'), style: '.site-header { visibility: hidden; }' });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; document.documentElement.classList.add('dark'); });
  await section.screenshot({ path: testInfo.outputPath('spanish-regional-dark.png') });
});

test('sparse Spanish regions still do not get misleading trend charts', async ({ page }) => {
  await page.goto('/?country=es&lang=es&view=spain-region&area=asturias');
  await expect(page.locator('.spain-region-page')).toBeVisible();
  await expect(page.locator('.spain-region-history')).toHaveCount(0);
});
