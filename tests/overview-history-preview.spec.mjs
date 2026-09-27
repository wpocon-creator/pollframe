import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const setup of [
  { width: 1440, locale: 'de', theme: 'light' },
  { width: 820, locale: 'es', theme: 'dark' },
]) {
  test(`overview history since 2017 with events: ${setup.width} ${setup.locale}`, async ({ page }, info) => {
    await page.setViewportSize({ width: setup.width, height: 1100 });
    await page.addInitScript(theme => localStorage.setItem('opinion-poll-theme', theme), setup.theme);
    await page.goto(`/?lang=${setup.locale}`);
    const graph = page.locator('.overview-history-preview svg');
    await expect(graph).toBeVisible();
    await expect(graph).toHaveAttribute('data-start', '2017-01-01');
    const data = JSON.parse(await readFile('public/data/bundestag.json', 'utf8'));
    await expect(graph).toHaveAttribute('data-end', data.polls.at(-1).date);
    await expect(graph).toHaveAttribute('aria-label', /2017/);
    await expect.poll(() => graph.locator('.event-marker').count()).toBeGreaterThanOrEqual(4);
    await expect(graph.locator('.overview-election-marker')).toHaveCount(3);
    await expect(graph.locator('[data-party]')).toHaveCount(7);
    await expect(graph.locator('[data-lane="0"]').first()).toBeVisible();
    await expect(graph.locator('[data-lane="1"]').first()).toBeVisible();
    await expect.poll(() => graph.evaluate(svg => Math.abs(svg.viewBox.baseVal.width-svg.getBoundingClientRect().width))).toBeLessThan(2);
    const geometry = await graph.evaluate(svg => {
      const labels = [...svg.querySelectorAll('.event-label-bg')].map(el => {
        const b=el.getBBox(); return {x:b.x,y:b.y,w:b.width,h:b.height};
      });
      return {
        invalidPaths: [...svg.querySelectorAll('path')].some(el => /NaN|Infinity/.test(el.getAttribute('d'))),
        clipped: [...svg.querySelectorAll('text')].some(el => {
          const b=el.getBBox(); return b.x<0 || b.x+b.width>svg.viewBox.baseVal.width || b.y<0 || b.y+b.height>svg.viewBox.baseVal.height;
        }),
        overlap: labels.some((a,i) => labels.slice(i+1).some(b => a.x<b.x+b.w && b.x<a.x+a.w && a.y<b.y+b.h && b.y<a.y+a.h)),
      };
    });
    expect(geometry).toEqual({invalidPaths:false,clipped:false,overlap:false});
    await graph.screenshot({path:info.outputPath(`overview-${setup.locale}-${setup.theme}.png`)});
    await graph.click({position:{x:100,y:200}});
    await expect(page).toHaveURL(/bundestag/);
  });
}

test('overview preview keeps the existing phone layout and appears after resizing', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/?lang=en-GB');
  await expect(page.locator('.germany-country-overview')).toBeVisible();
  await expect(page.locator('.overview-history-preview')).toHaveCount(0);
  await page.setViewportSize({width:1024,height:900});
  await expect(page.locator('.overview-history-preview svg')).toBeVisible();
  await expect(page.locator('.overview-history-preview svg')).toHaveAttribute('aria-label', /since 2017/);
});
