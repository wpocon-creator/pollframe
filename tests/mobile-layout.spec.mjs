import { expect, test } from "@playwright/test";

const phoneProjects = new Set(["pixel-5", "galaxy-s9", "iphone-se", "iphone-13", "iphone-13-chromium", "phone-landscape"]);

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

    if (page.viewportSize().width <= 680) await expectMobileHeaderIconsCentred(page);
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
      "/?country=es",
      "/?country=es&view=spain-issues",
      "/?country=es&view=spain-region&area=asturias",
      "/?region=spain-congress",
    ];
    for (const route of routes) {
      await page.goto(route);
      await settle(page);
      await expect(page.locator(".site-header")).toBeVisible();
      if (page.viewportSize().width <= 680) await expectMobileHeaderIconsCentred(page);
      await expectNoPageOverflow(page, route);
    }
    await expect(page.locator(".poll-chart")).toHaveAttribute("viewBox", page.viewportSize().width <= 680 ? "0 0 420 390" : "0 0 1320 660");
    await expect(page.locator(".event-key")).toBeVisible();
  });

  test("chart dropdowns and dialogs remain usable on a phone", async ({ page }, testInfo) => {
    await page.goto("/?region=bundestag");
    await settle(page);
    const info = page.locator(".chart-heading .graph-info-popover").first();
    await info.scrollIntoViewIfNeeded();
    await info.locator("summary").click();
    const visibleInfoCard = page.locator(".graph-info-card:visible");
    await visibleInfoCard.evaluate((card) => Promise.all(card.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
    const infoGeometry = await visibleInfoCard.evaluate((card) => {
      const cardRect = card.getBoundingClientRect();
      const backdropRect = document.querySelector(".graph-info-popover[open] .graph-info-backdrop").getBoundingClientRect();
      return {
        centreOffset: Math.abs(((cardRect.top + cardRect.bottom) / 2) - (innerHeight / 2)),
        inside: cardRect.top >= 8 && cardRect.bottom <= innerHeight - 8 && cardRect.left >= 8 && cardRect.right <= innerWidth - 8,
        backdrop: { top: backdropRect.top, bottom: backdropRect.bottom, left: backdropRect.left, right: backdropRect.right },
        blur: getComputedStyle(document.querySelector(".graph-info-popover[open] .graph-info-backdrop")).backdropFilter,
      };
    });
    expect(infoGeometry.centreOffset).toBeLessThanOrEqual(3);
    expect(infoGeometry.inside).toBe(true);
    expect(infoGeometry.backdrop.top).toBeLessThanOrEqual(0);
    expect(infoGeometry.backdrop.bottom).toBeGreaterThanOrEqual(page.viewportSize().height);
    expect(infoGeometry.backdrop.left).toBeLessThanOrEqual(0);
    expect(infoGeometry.backdrop.right).toBeGreaterThanOrEqual(page.viewportSize().width);
    expect(infoGeometry.blur).not.toBe("none");
    await page.locator(".graph-info-popover[open] .graph-info-card header button").click();
    await page.getByRole("button", { name: /Diagramm anpassen|Customise chart|Customize chart/i }).click();
    const controls = page.locator(".customize-panel details:visible");
    expect(await controls.count()).toBeGreaterThanOrEqual(3);

    for (let index = 0; index < await controls.count(); index += 1) {
      const control = controls.nth(index);
      await control.locator("summary").click();
      const menu = control.locator(".select-menu,.multi-menu");
      await expectInsideViewport(menu, page, `chart menu ${index}`, 8);
      if (index === 0) {
        const layers = await page.evaluate(() => ({
          info: Number.parseInt(getComputedStyle(document.querySelector(".chart-heading .graph-info-popover:not([open])")).zIndex, 10),
          control: Number.parseInt(getComputedStyle(document.querySelector(".customize-panel details[open]")).zIndex, 10),
          menu: Number.parseInt(getComputedStyle(document.querySelector(".customize-panel details[open] .select-menu,.customize-panel details[open] .multi-menu")).zIndex, 10),
        }));
        expect(layers.info).toBeLessThan(layers.control);
        expect(layers.info).toBeLessThan(layers.menu);
      }
      if (index === 0) await page.screenshot({ path: testInfo.outputPath("chart-dropdown.png"), fullPage: false });
      if (index === 0) {
        const outside = page.locator("main").first();
        await outside.dispatchEvent("pointerdown", { pointerId: 41, pointerType: "touch", isPrimary: true });
        await expect(menu).toBeVisible();
        await outside.dispatchEvent("pointerup", { pointerId: 41, pointerType: "touch", isPrimary: true });
        await outside.dispatchEvent("click", { button: 0 });
      } else {
        await page.mouse.click(4, Math.round(page.viewportSize().height / 2));
      }
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
    await expect(page.locator(".embed-live-preview iframe")).toHaveAttribute("scrolling", "no");
    expect(await page.locator(".embed-live-preview iframe").evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("none");
    const verticalScrollAreas = await page.locator(".embed-modal").evaluate((modal) => [...modal.querySelectorAll("*")]
      .filter((element) => {
        const style = getComputedStyle(element);
        return element.scrollHeight > element.clientHeight + 2 && ["auto", "scroll"].includes(style.overflowY);
      })
      .map((element) => element.className));
    // The document preview is the only element allowed to scroll. On taller
    // phones the complete preview may fit, in which case no scrollbar appears.
    expect(verticalScrollAreas.length).toBeLessThanOrEqual(1);
    if (verticalScrollAreas.length) expect(verticalScrollAreas[0]).toContain("static-embed-preview");
    expect(await page.locator(".embed-modal").evaluate((modal) => modal.scrollHeight <= modal.clientHeight + 2)).toBe(true);
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
    await page.locator(".watchlist-add-button").click();
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

  test("approval comparison uses the fitted Pollframe historical-chart canvas on a phone", async ({ page }, testInfo) => {
    await page.goto("/?view=approval&mode=compare&lang=de");
    await settle(page);
    await expectNoPageOverflow(page, "approval comparison");
    const geometry = await page.locator(".approval-chart-region .chart-wrap").evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.client + 2);
    await expect(page.locator(".approval-chart-region .long-range-chart-wrap")).toHaveCount(0);
    const markers = await page.locator(".approval-chart-region .approval-event-marker-original").count();
    expect(markers).toBeLessThanOrEqual(6);
    const dots = await page.locator(".approval-chart-region .interactive-event-layer .event-dot").count();
    const elections = await page.locator(".approval-chart-region .historical-election-marker").count();
    await expect(page.locator(".approval-chart-region .event-key-item")).toHaveCount(markers + dots + elections);
    await expect(page.locator(".approval-event-marker-original .event-label-text")).toHaveCount(markers);
    await expect(page.locator(".approval-event-marker-original .event-label-date")).toHaveCount(0);
    expect((await page.locator(".approval-event-marker-original .event-label-text").allTextContents()).some((label) => label.includes("…"))).toBe(false);
    await expect(page.locator(".approval-insight-grid")).toHaveCount(0);
    await page.locator(".approval-main-chart").screenshot({ path: testInfo.outputPath("approval-phone-chart.png") });
    await page.locator(".approval-event-marker-original").first().dispatchEvent("click");
    await expectInsideViewport(page.locator(".approval-event-card"), page, "approval event card", 8);
    await page.screenshot({ path: testInfo.outputPath("approval-phone-event-card.png"), fullPage: false });
    await page.locator(".approval-poll-chart .grid-line").last().click({ force: true });
    await page.getByRole("button", { name: "Teilen & einbetten", exact: true }).click();
    await expectInsideViewport(page.locator(".approval-share-card"), page, "approval share dialog");
    await expect(page.locator(".approval-embed-preview iframe")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("approval-phone.png"), fullPage: false });
  });

  test("historical charts stay fitted after display and custom-date changes", async ({ page }) => {
    await page.goto("/?region=bundestag&lang=de");
    await settle(page);
    await page.getByRole("button", { name: /Diagramm anpassen|Customize chart/i }).click();

    const assertFitted = async (label) => {
      const wrap = page.locator(".chart-card .chart-wrap");
      await expect(page.locator(".chart-card .long-range-chart-wrap"), `${label}: old long-range layout`).toHaveCount(0);
      const size = await wrap.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
      expect(size.scrollWidth, `${label}: chart should not become horizontally scrollable`).toBeLessThanOrEqual(size.clientWidth + 2);
    };

    await assertFitted("default archive");
    const displayControl = page.locator(".customize-panel .select-control").first();
    await displayControl.locator("summary").click();
    await displayControl.getByRole("button", { name: "Durchschnittspunkte", exact: true }).click();
    await assertFitted("published-polls mode");

    const rangeControl = page.locator(".customize-panel .select-control").nth(1);
    await rangeControl.locator("summary").click();
    await rangeControl.getByRole("button", { name: /Eigener Zeitraum|Custom dates/i }).click();
    await expect(page.locator('.custom-date-slider input[type="range"]')).toHaveCount(2);
    await assertFitted("custom full archive");
  });
});
