import { expect, test } from "@playwright/test";

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts?.ready);
  await expect(page.locator("main")).toBeVisible();
}

async function expectNoViewportOverflow(page, root) {
  const result = await root.evaluate((node) => {
    const viewport = { width: document.documentElement.clientWidth, height: window.innerHeight };
    const rect = node.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      horizontalOverflow: node.scrollWidth - node.clientWidth,
      documentOverflow: document.documentElement.scrollWidth - viewport.width,
      viewport,
    };
  });
  expect(result.left).toBeGreaterThanOrEqual(-1);
  expect(result.right).toBeLessThanOrEqual(result.viewport.width + 1);
  expect(result.horizontalOverflow).toBeLessThanOrEqual(2);
  expect(result.documentOverflow).toBeLessThanOrEqual(2);
}

test.describe("expanded publishing tools", () => {
  test("German approval has two compact independently publishable current cards", async ({ page }, testInfo) => {
    await page.goto("/?view=approval&country=de&lang=de");
    await settle(page);
    const cards = page.locator(".approval-current-stack .approval-current-card");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText(/kanzler/i);
    await expect(cards.nth(1)).toContainText(/Regierung/);
    for (const card of await cards.all()) {
      await expect(card.locator(".approval-current-tools .widget-share-trigger")).toHaveCount(2);
      await expectNoViewportOverflow(page, card);
    }
    await page.screenshot({ path: testInfo.outputPath("approval-current-page.png"), fullPage: false });

    await cards.nth(0).locator(".approval-current-tools .widget-share-trigger").first().click();
    const share = page.locator(".approval-snapshot-share-card");
    await expect(share).toBeVisible();
    const preview = page.frameLocator(".approval-snapshot-share-card iframe");
    await expect(preview.locator(".approval-current-leader")).toBeVisible();
    await expect(preview.locator(".approval-main-chart")).toHaveCount(0);
    await share.screenshot({ path: testInfo.outputPath("approval-current-share.png") });
    await share.locator(".panel-header .icon-button").click();

    await cards.nth(1).locator(".approval-current-tools .widget-png-trigger").click();
    const png = page.locator(".png-options-modal");
    await expect(png.locator('.png-format-grid [role="radio"]')).toHaveCount(2);
    await png.locator(".png-format-shape.is-square").locator("..").click();
    await expect(png.locator('.png-preview-surface[data-preview-ready="true"][data-export-preset="square"]')).toHaveCount(1);
    await png.screenshot({ path: testInfo.outputPath("approval-government-png.png") });
  });

  test("party history and seat model publish through responsive standalone embeds", async ({ page }, testInfo) => {
    await page.goto("/?region=bundestag&lang=de");
    await settle(page);

    const projection = page.locator(".projection-section");
    await projection.scrollIntoViewIfNeeded();
    const side = projection.locator(".projection-heading-side");
    await expect(side.locator(".majority-badge")).toBeVisible();
    await expect(side.locator(".widget-share-tools")).toBeVisible();
    const overlap = await side.evaluate((node) => {
      const badge = node.querySelector(".majority-badge").getBoundingClientRect();
      const tools = node.querySelector(".widget-share-tools").getBoundingClientRect();
      return Math.max(0, Math.min(badge.right, tools.right) - Math.max(badge.left, tools.left))
        * Math.max(0, Math.min(badge.bottom, tools.bottom) - Math.max(badge.top, tools.top));
    });
    expect(overlap).toBeLessThanOrEqual(1);
    await side.locator(".widget-png-trigger").click();
    const seatsPng = page.locator(".png-options-modal");
    await expect(seatsPng.locator('.png-format-grid [role="radio"]')).toHaveCount(3);
    await seatsPng.locator(".png-format-shape.is-square").locator("..").click();
    await expect(seatsPng.locator('.png-preview-surface[data-preview-ready="true"][data-export-preset="square"]')).toHaveCount(1);
    await seatsPng.screenshot({ path: testInfo.outputPath("seat-model-square-png.png") });
    await page.locator(".png-options-modal .panel-header .icon-button").click();

    await page.locator(".tendency-card").first().click();
    const party = page.locator(".party-modal");
    await expect(party).toBeVisible();
    await expect(party.locator(".party-modal-actions .widget-share-trigger")).toHaveCount(2);
    await party.locator(".party-modal-actions .widget-share-trigger").first().click();
    const share = page.locator(".widget-share-modal");
    await expect(share).toBeVisible();
    const preview = page.frameLocator(".widget-share-modal iframe");
    await expect(preview.locator(".party-history-embed-card")).toBeVisible();
    await expect(preview.locator(".party-periods")).toHaveCount(0);
    await share.screenshot({ path: testInfo.outputPath("party-history-share.png") });
    await share.locator(".panel-header .icon-button").click();
    await party.locator(".party-modal-actions .widget-png-trigger").click();
    const partyPng = page.locator(".png-options-modal");
    await expect(partyPng.locator('.png-format-grid [role="radio"]')).toHaveCount(2);
    await partyPng.locator(".png-format-shape.is-square").locator("..").click();
    await expect(partyPng.locator('.png-preview-surface[data-preview-ready="true"][data-export-preset="square"]')).toHaveCount(1);
    const previewEndpointGap = await partyPng.locator(".png-preview-clone").evaluate((root) => {
      const path = root.querySelector(".party-detail-line");
      const lastPoint = path.getPointAtLength(path.getTotalLength());
      const marker = root.querySelector(".party-detail-chart svg>circle");
      return Math.abs(lastPoint.x - Number(marker.getAttribute("cx")));
    });
    expect(previewEndpointGap).toBeLessThan(2);
    await partyPng.screenshot({ path: testInfo.outputPath("party-history-square-png.png") });
  });

  test("a constituency result has its own licensed embed and three PNG layouts", async ({ page }, testInfo) => {
    await page.goto("/?view=uk-constituencies&seat=bristol-central&lang=en-GB");
    await settle(page);
    const card = page.locator(".constituency-result-card");
    await expect(card).toBeVisible();
    await expect(card.locator(".constituency-title-actions .widget-share-trigger")).toHaveCount(2);
    await card.locator(".constituency-title-actions .widget-share-trigger").first().click();
    const share = page.locator(".widget-share-modal");
    await expect(share).toBeVisible();
    const preview = page.frameLocator(".widget-share-modal iframe");
    await expect(preview.locator(".constituency-result-card.is-embed")).toBeVisible();
    await expect(preview.locator(".constituency-finder")).toHaveCount(0);
    await expect(preview.locator(".embed-footer")).toContainText("Open Parliament Licence");
    await share.screenshot({ path: testInfo.outputPath("constituency-share.png") });
    await share.locator(".panel-header .icon-button").click();
    await card.locator(".widget-png-trigger").click();
    const png = page.locator(".png-options-modal");
    await expect(png.locator('.png-format-grid [role="radio"]')).toHaveCount(3);
    await png.locator(".png-format-shape.is-square").locator("..").click();
    await expect(png.locator('.png-preview-surface[data-preview-ready="true"][data-export-preset="square"]')).toHaveCount(1);
    await png.screenshot({ path: testInfo.outputPath("constituency-square-png.png") });
  });
});
