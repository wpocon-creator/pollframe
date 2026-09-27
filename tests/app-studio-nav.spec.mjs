import { test, expect } from "@playwright/test";

test("installed app keeps Studio as the fourth tab and can return to the overview", async ({ page }, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { configurable: true, get: () => true });
    localStorage.setItem("opinion-poll-locale", "de");
  });
  await page.goto("/?view=watchlist&lang=de");
  const nav = page.locator(".mobile-app-nav");
  await expect(nav).toBeVisible();
  await expect(nav.locator("a")).toHaveCount(4);
  await expect(nav.locator("a").last()).toHaveText("Studio");
  const boxes = await nav.locator("a").evaluateAll(nodes => nodes.map(n => { const b = n.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, width: b.width }; }));
  expect(Math.max(...boxes.map(b => b.y)) - Math.min(...boxes.map(b => b.y))).toBeLessThan(2);
  for (let i = 1; i < boxes.length; i++) expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i - 1].right - 1);
  await nav.getByRole("link", { name: "Studio", exact: true }).click();
  await expect(page.locator(".studio-shell")).toBeVisible();
  await expect(nav.getByRole("link", { name: "Studio", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(nav).toHaveCount(1);
  await page.screenshot({ path: info.outputPath("app-studio-navigation.png") });
  await nav.getByRole("link", { name: "Übersicht", exact: true }).click();
  await expect(page.locator(".studio-shell")).toHaveCount(0);
});
