import { expect, test } from "@playwright/test";

const phoneProjects = new Set(["pixel-5", "galaxy-s9", "iphone-se", "iphone-13", "iphone-13-chromium"]);

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts?.ready);
}

async function expectInsideViewport(locator, page, name, padding = 0) {
  await expect(locator, `${name} should be visible`).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box, `${name} should have a bounding box`).toBeTruthy();
  expect(box.x, `${name} left edge`).toBeGreaterThanOrEqual(padding - 1);
  expect(box.x + box.width, `${name} right edge`).toBeLessThanOrEqual(viewport.width - padding + 1);
  expect(box.y, `${name} top edge`).toBeGreaterThanOrEqual(-1);
  expect(box.y + box.height, `${name} bottom edge`).toBeLessThanOrEqual(viewport.height + 1);
}

async function expectMobileHeaderIconsCentred(page) {
  const measurements = await page.locator(".site-header .header-button:visible").evaluateAll((buttons) => buttons.map((button) => {
    const buttonRect = button.getBoundingClientRect();
    const visibleIcons = [...button.querySelectorAll("svg")].filter((icon) => {
      const style = getComputedStyle(icon);
      const rect = icon.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    });
    return {
      label: button.getAttribute("aria-label"),
      button: { x: buttonRect.x, y: buttonRect.y, width: buttonRect.width, height: buttonRect.height },
      icons: visibleIcons.map((icon) => {
        const rect = icon.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
    };
  }));

  expect(measurements.length).toBeGreaterThan(1);
  for (const item of measurements) {
    expect(item.icons, `${item.label}: exactly one mobile icon must be visible`).toHaveLength(1);
    const icon = item.icons[0];
    const horizontalDifference = Math.abs((item.button.x + item.button.width / 2) - (icon.x + icon.width / 2));
    const verticalDifference = Math.abs((item.button.y + item.button.height / 2) - (icon.y + icon.height / 2));
    expect(horizontalDifference, `${item.label}: horizontal icon centring`).toBeLessThanOrEqual(1);
    expect(verticalDifference, `${item.label}: vertical icon centring`).toBeLessThanOrEqual(1);
  }
}

async function expectNoPageOverflow(page, name) {
  const result = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll("body *")]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || rect.width < 1 || rect.height < 1) return false;
        if (element.closest(".chart-wrap,.party-detail-chart,.poll-table-scroll")) return false;
        return rect.left < -2 || rect.right > document.documentElement.clientWidth + 2;
      })
      .slice(0, 10)
      .map((element) => ({
        tag: element.tagName,
        className: typeof element.className === "string" ? element.className : element.getAttribute("class"),
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      })),
  }));
  expect(result.scrollWidth, `${name}: horizontal page overflow ${JSON.stringify(result)}`).toBeLessThanOrEqual(result.clientWidth + 2);
}

test.describe("mobile layout geometry", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!phoneProjects.has(testInfo.project.name), "phone layout audit only");
  });

  test("header controls and country menu stay centred and inside the screen", async ({ page }, testInfo) => {
    await page.goto("/");
    await settle(page);

    await expectMobileHeaderIconsCentred(page);
    const buttons = page.locator(".site-header .header-button:visible");
    for (let index = 0; index < await buttons.count(); index += 1) {
      await expectInsideViewport(buttons.nth(index), page, `header button ${index}`);
    }

    await page.getByRole("button", { name: /Land auswählen|Select country/i }).click();
    const popover = page.locator(".header-country-popover");
    await expectInsideViewport(popover, page, "country popover", 8);
    await page.screenshot({ path: testInfo.outputPath("header-country-menu.png"), fullPage: false });

    await page.keyboard.press("Escape");
    await expect(popover).toBeHidden();
    await page.getByRole("button", { name: /Einstellungen|Settings/i }).click();
    await page.waitForTimeout(250);
    await expectInsideViewport(page.locator(".side-panel"), page, "settings panel");
    await page.screenshot({ path: testInfo.outputPath("settings-panel.png"), fullPage: false });
  });

  test("core pages stay within the phone viewport", async ({ page }) => {
    const routes = [
      "/",
      "/?region=bundestag",
      "/?view=map",
      "/?region=berlin",
      "/?view=countries",
      "/?country=uk",
      "/?region=uk-westminster",
      "/?country=uk&view=uk-map",
      "/?view=uk-constituencies&country=uk",
    ];
    for (const route of routes) {
      await page.goto(route);
      await settle(page);
      await expect(page.locator(".site-header")).toBeVisible();
      await expectMobileHeaderIconsCentred(page);
      await expectNoPageOverflow(page, route);
    }
  });

  test("chart dropdowns and dialogs remain usable on a phone", async ({ page }, testInfo) => {
    await page.goto("/?region=bundestag");
    await settle(page);
    await page.getByRole("button", { name: /Diagramm anpassen|Customise chart|Customize chart/i }).click();
    const controls = page.locator(".customize-panel details:visible");
    expect(await controls.count()).toBeGreaterThanOrEqual(3);

    for (let index = 0; index < await controls.count(); index += 1) {
      const control = controls.nth(index);
      await control.locator("summary").click();
      const menu = control.locator(".select-menu,.multi-menu");
      await expectInsideViewport(menu, page, `chart menu ${index}`, 8);
      if (index === 0) await page.screenshot({ path: testInfo.outputPath("chart-dropdown.png"), fullPage: false });
      await page.mouse.click(4, Math.round(page.viewportSize().height / 2));
      await expect(menu).toBeHidden();
    }

    const tendencyCard = page.locator(".tendency-card").first();
    await tendencyCard.scrollIntoViewIfNeeded();
    await tendencyCard.click();
    await page.waitForTimeout(200);
    await expectInsideViewport(page.locator(".party-modal"), page, "party detail dialog");
    await page.screenshot({ path: testInfo.outputPath("party-dialog.png"), fullPage: false });
    await page.getByRole("button", { name: /Schließen|Close/i }).click();

    const shareButton = page.locator(".chart-actions .primary-button");
    await shareButton.scrollIntoViewIfNeeded();
    await shareButton.click();
    await page.waitForTimeout(200);
    await expectInsideViewport(page.locator(".embed-modal"), page, "share dialog");
    await expect(page.locator(".embed-live-preview iframe")).toBeVisible();
    const previewDimensions = await page.frameLocator(".embed-live-preview iframe").locator("html").evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(previewDimensions.scrollWidth, `share preview overflow ${JSON.stringify(previewDimensions)}`).toBeLessThanOrEqual(previewDimensions.clientWidth + 1);
    await page.screenshot({ path: testInfo.outputPath("share-dialog.png"), fullPage: false });
    await page.getByRole("button", { name: /Schließen|Close/i }).click();
  });

  test("map, watchlist and constituency overlays fit the phone", async ({ page }, testInfo) => {
    await page.goto("/?view=map");
    await settle(page);
    await page.getByRole("button", { name: /Karte einbetten|Embed map/i }).click();
    await page.waitForTimeout(200);
    await expectInsideViewport(page.locator(".embed-modal"), page, "map embed dialog");
    await page.getByRole("button", { name: /Schließen|Close/i }).click();

    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query) => query === "(display-mode: standalone)"
        ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } }
        : original(query);
    });
    await page.goto("/?view=watchlist&country=de");
    await settle(page);
    const notificationIntro = page.locator(".notification-intro");
    if (await notificationIntro.isVisible().catch(() => false)) {
      await expectInsideViewport(notificationIntro, page, "notification intro", 8);
      await page.screenshot({ path: testInfo.outputPath("notification-intro.png"), fullPage: false });
      await page.getByRole("button", { name: /Nicht jetzt|Not now/i }).click();
    }
    await page.getByRole("button", { name: /Watchlist-Eintrag hinzufügen|Add Watchlist item/i }).click();
    await page.waitForTimeout(200);
    await expectInsideViewport(page.locator(".watch-gallery"), page, "watchlist gallery");
    await page.screenshot({ path: testInfo.outputPath("watchlist-gallery.png"), fullPage: false });
    await page.getByRole("button", { name: /Schließen|Close/i }).click();

    await page.goto("/?view=uk-constituencies&country=uk");
    await settle(page);
    const search = page.getByLabel(/Postcode, town or constituency|Postcode, Ort oder Wahlkreis/i);
    await search.fill("Brist");
    const suggestions = page.locator(".finder-results");
    await expectInsideViewport(suggestions, page, "constituency suggestions", 8);
    await page.screenshot({ path: testInfo.outputPath("constituency-suggestions.png"), fullPage: false });
    await page.mouse.click(4, Math.round(page.viewportSize().height / 2));
    await expect(suggestions).toBeHidden();
  });
});
