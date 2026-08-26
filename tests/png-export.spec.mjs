import { expect, test } from "@playwright/test";

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts?.ready);
  await expect(page.locator("main")).toBeVisible();
}

async function auditPngDialog(page, expectedFormats) {
  const modal = page.locator(".png-options-modal");
  await expect(modal).toBeVisible();
  await expect(modal.locator('.png-format-grid [role="radio"]')).toHaveCount(expectedFormats.length);
  for (const format of expectedFormats) await expect(modal.locator(`.png-format-shape.is-${format}`)).toHaveCount(1);
  const geometry = await modal.evaluate((root) => {
    const viewport = { width: document.documentElement.clientWidth, height: window.innerHeight };
    const rect = root.getBoundingClientRect();
    const actions = root.querySelector(".png-options-actions")?.getBoundingClientRect();
    const formats = root.querySelector(".png-format-grid")?.getBoundingClientRect();
    const preview = root.querySelector(".png-preview-canvas")?.getBoundingClientRect();
    const visibleActions = [...root.querySelectorAll(".png-options-actions button")].every((button) => {
      const box = button.getBoundingClientRect();
      return box.width >= 120 && box.height >= 40 && box.left >= -1 && box.right <= viewport.width + 1 && box.top >= -1 && box.bottom <= viewport.height + 1;
    });
    return {
      rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      visibleActions,
      overlap: actions && formats ? Math.max(0, Math.min(actions.bottom, formats.bottom) - Math.max(actions.top, formats.top)) : 0,
      preview: preview ? { width: preview.width, height: preview.height } : null,
      documentOverflow: document.documentElement.scrollWidth - viewport.width,
    };
  });
  expect(geometry.rect.left).toBeGreaterThanOrEqual(-1);
  expect(geometry.rect.right).toBeLessThanOrEqual((await page.evaluate(() => document.documentElement.clientWidth)) + 1);
  expect(geometry.scrollWidth - geometry.clientWidth).toBeLessThanOrEqual(2);
  expect(geometry.documentOverflow).toBeLessThanOrEqual(2);
  expect(geometry.visibleActions).toBe(true);
  expect(geometry.overlap).toBeLessThanOrEqual(1);
  expect(geometry.preview?.width).toBeGreaterThan(100);
  expect(geometry.preview?.height).toBeGreaterThan(100);
  return modal;
}

test.describe("PNG export chooser", () => {
  test("uses graph-specific formats and changes the real preview geometry", async ({ page }, testInfo) => {
    if (testInfo.project.name.includes("iphone")) await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { configurable: true, value: async () => {} });
      Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    });
    await page.goto("/?region=bundestag&lang=de");
    await settle(page);
    await page.locator(".chart-card .png-export-button").first().click();
    const modal = await auditPngDialog(page, ["content", "landscape", "square"]);
    await modal.locator(".png-format-shape.is-landscape").locator("..").click();
    const landscapeRatio = await modal.locator(".png-preview-canvas").evaluate((node) => node.getBoundingClientRect().width / node.getBoundingClientRect().height);
    await modal.locator(".png-format-shape.is-square").locator("..").click();
    const squareRatio = await modal.locator(".png-preview-canvas").evaluate((node) => node.getBoundingClientRect().width / node.getBoundingClientRect().height);
    expect(landscapeRatio).toBeGreaterThan(1.65);
    expect(squareRatio).toBeGreaterThan(.94);
    expect(squareRatio).toBeLessThan(1.06);
    await modal.screenshot({ path: testInfo.outputPath("png-dialog-history.png") });
    await modal.getByRole("button", { name: /Schließen|Close|Cerrar/i }).click();

    await page.locator(".results-card .widget-png-trigger").click();
    const widgetModal = await auditPngDialog(page, ["content", "square", "portrait"]);
    await expect(widgetModal.locator(".png-format-shape.is-landscape")).toHaveCount(0);
    await widgetModal.screenshot({ path: testInfo.outputPath("png-dialog-widget.png") });
  });

  test("remains clean when opened from inside Share and Embed", async ({ page }, testInfo) => {
    await page.goto("/?region=bundestag&lang=en-GB");
    await settle(page);
    await page.locator(".results-card .widget-share-trigger:not(.widget-png-trigger)").click();
    await expect(page.locator(".embed-modal:not(.png-options-modal)")).toBeVisible();
    await page.locator(".journalist-embed-actions .png-export-button").click();
    const modal = await auditPngDialog(page, ["content", "square", "portrait"]);
    const layers = await page.evaluate(() => ({
      png: Number.parseInt(getComputedStyle(document.querySelector(".png-options-overlay")).zIndex, 10),
      share: Number.parseInt(getComputedStyle(document.querySelector(".modal-overlay:not(.png-options-overlay)")).zIndex, 10),
    }));
    expect(layers.png).toBeGreaterThan(layers.share);
    await modal.screenshot({ path: testInfo.outputPath("png-dialog-over-share.png") });
    await modal.getByRole("button", { name: /Schließen|Close|Cerrar/i }).click();
    await expect(page.locator(".embed-modal:not(.png-options-modal)")).toBeVisible();
  });
});
