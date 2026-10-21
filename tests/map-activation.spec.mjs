import { test, expect } from "@playwright/test";
test.use({ serviceWorkers: "block" });

test("Spain map hover must not move its link before the first click", async ({ page }, info) => {
  await page.goto("/?country=es&lang=es");
  const link = page.locator('.spain-map-svg a[href*="view=spain-region"]').first();
  await expect(link).toBeVisible();
  await page.locator(".spain-map-svg").scrollIntoViewIfNeeded();
  const point = await link.evaluate(anchor => {
    const box = anchor.getBoundingClientRect(), candidates = [];
    for (let row = 1; row < 20; row++) for (let col = 1; col < 20; col++) {
      const x = box.left + box.width * col / 20, y = box.top + box.height * row / 20;
      if (document.elementFromPoint(x, y)?.closest("a") === anchor)
        candidates.push({ x, y, distance: (col - 10) ** 2 + (row - 10) ** 2 });
    }
    return { ...candidates.sort((a,b) => a.distance-b.distance)[0], top: box.top, href: anchor.getAttribute("href") };
  });
  expect(Number.isFinite(point.x), JSON.stringify(point)).toBe(true);
  if (info.project.use.hasTouch) await page.touchscreen.tap(point.x, point.y);
  else {
    await page.mouse.move(point.x, point.y);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const after = await link.evaluate(anchor => ({ top: anchor.getBoundingClientRect().top, scroll: scrollY, hit: document.elementFromPoint(anchor.getBoundingClientRect().x+anchor.getBoundingClientRect().width/2, anchor.getBoundingClientRect().y+anchor.getBoundingClientRect().height/2)?.outerHTML?.slice(0,150) }));
    expect(Math.abs(after.top-point.top), JSON.stringify({point,after})).toBeLessThanOrEqual(1);
    await page.mouse.click(point.x, point.y);
  }
  await expect(page).toHaveURL(new RegExp(point.href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await expect(page.locator(".spain-region-page")).toBeVisible();
});
