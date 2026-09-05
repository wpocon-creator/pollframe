import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("approval cards have readable values and top-layer info after scrolling", async ({ page }, testInfo) => {
  await page.goto("/?view=approval&country=de&lang=de");
  const card = page.locator(".approval-current-card").first();
  await expect(card).toBeVisible();
  const geometry = await card.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return [...node.querySelectorAll("header h2,.approval-current-values strong,.approval-current-values span")].map((element) => {
      const bounds = element.getBoundingClientRect();
      return { text: element.textContent, left: bounds.left - rect.left, right: rect.right - bounds.right, font: parseFloat(getComputedStyle(element).fontSize), scroll: element.scrollWidth - element.clientWidth };
    });
  });
  for (const bounds of geometry) {
    expect(bounds.left, bounds.text).toBeGreaterThanOrEqual(0);
    expect(bounds.right, bounds.text).toBeGreaterThanOrEqual(0);
    expect(bounds.font, bounds.text).toBeGreaterThanOrEqual(11);
    expect(bounds.scroll, bounds.text).toBeLessThanOrEqual(1);
  }
  await page.screenshot({ path: testInfo.outputPath("approval-current-light.png") });
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.screenshot({ path: testInfo.outputPath("approval-current-dark.png") });
  const info = page.locator(".approval-main-chart .graph-info-popover").first();
  await info.locator("summary").click();
  const dialog = info.locator("dialog");
  await expect(dialog).toBeVisible();
  const layout = await dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { modal: element.matches(":modal"), height: bounds.height, max: innerHeight * .75, centre: bounds.top + bounds.height / 2, target: innerHeight / 2 };
  });
  expect(layout.modal).toBe(true);
  expect(layout.height).toBeLessThanOrEqual(layout.max + 1);
  expect(Math.abs(layout.centre - layout.target)).toBeLessThan(2);
  await page.screenshot({ path: testInfo.outputPath("approval-info-scrolled.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("party history labels fit and chart buttons do not consume the title width", async ({ page }, testInfo) => {
  await page.goto("/?region=bundestag&party=greens&lang=de");
  const modal = page.locator(".party-modal");
  await expect(modal).toBeVisible();
  const labels = await modal.locator("svg text.axis-label").evaluateAll((elements) => elements.map((element) => {
    const text = element.getBoundingClientRect();
    const svg = element.ownerSVGElement.getBoundingClientRect();
    return { label: element.textContent, left: text.left - svg.left, right: svg.right - text.right };
  }));
  expect(labels.length).toBeGreaterThanOrEqual(3);
  labels.forEach((label) => {
    expect(label.left, label.label).toBeGreaterThanOrEqual(-1);
    expect(label.right, label.label).toBeGreaterThanOrEqual(-1);
  });
  const titleBox = await modal.locator("h2").boundingBox();
  const toolsBox = await modal.locator(".party-modal-actions").boundingBox();
  expect(titleBox.y).toBeGreaterThanOrEqual(toolsBox.y + toolsBox.height);
  await page.screenshot({ path: testInfo.outputPath("party-history-phone.png") });
});
