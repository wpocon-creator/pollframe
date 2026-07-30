import { expect, test } from "@playwright/test";

function watchRuntime(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function expectDocumentFits(page) {
  const dimensions = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll, `document overflow: ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.client + 2);
}

async function expectNoBrokenVisibleText(page) {
  const broken = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    return [...document.querySelectorAll("h1,h2,h3,h4,p,button,a,dt,dd,strong,small,label")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (
          style.display === "none"
          || style.visibility === "hidden"
          || Number(style.opacity) === 0
          || rect.width < 1
          || rect.height < 1
          || rect.bottom < 0
          || rect.top > innerHeight * 2
        ) return false;
        if (rect.left < -2 || rect.right > viewportWidth + 2) {
          const insideHorizontalScroller = element.closest(".chart-wrap,.party-selector,.code-label");
          return !insideHorizontalScroller;
        }
        return false;
      })
      .slice(0, 12)
      .map((element) => ({
        tag: element.tagName,
        text: element.textContent.trim().slice(0, 80),
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      }));
  });
  expect(broken).toEqual([]);
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts?.ready);
}

test.describe("core routes", () => {
  test("overview, navigation and settings are integrated", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    await page.goto("/");
    await settle(page);
    await expect(page.getByRole("heading", { name: /Bund und Länder|Federal and state/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Umfragen zur Bundestagswahl|Federal election polling/i })).toBeVisible();
    await expect(page.locator(".germany-map")).toBeVisible();
    await expect(page.locator(".state-grid a")).toHaveCount(16);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://de.pollframe.workers.dev/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);

    await page.getByRole("button", { name: /Einstellungen|Settings/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /English.*United Kingdom/i }).click();
    await expect(page.getByRole("heading", { name: "Federal and state polling" })).toBeVisible();
    await page.getByRole("button", { name: /Dark/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: /Larger.*19 px/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-text", "large");
    await page.getByRole("button", { name: /Close/i }).click();
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);

    await page.screenshot({ path: testInfo.outputPath("overview.png"), fullPage: true });
    expect(errors).toEqual([]);
  });

  test("federal chart controls, hover, methodology and party detail work", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    await page.goto("/?region=bundestag");
    await settle(page);
    await expect(page.locator(".poll-chart")).toBeVisible();
    await expect(page.locator(".series-line")).not.toHaveCount(0);
    await expect(page.locator(".chart-footer .data-attribution")).toContainText("dawum.de");
    await expect(page.locator(".chart-footer .data-attribution")).toContainText("Bundeswahlleiterin");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://de.pollframe.workers.dev/?region=bundestag",
    );
    await expectDocumentFits(page);

    await page.getByRole("button", { name: /Diagramm anpassen|Customise chart|Customize chart/i }).click();
    await expect(page.locator(".customize-panel")).toBeVisible();
    await page.locator(".select-control > summary").first().click();
    await page.locator(".select-menu button").filter({ hasText: /Trend.*Durchschnittspunkte|Trend.*average points/i }).click();
    await expect(page.locator(".average-series-line")).not.toHaveCount(0);

    const chart = page.locator(".poll-chart");
    await chart.scrollIntoViewIfNeeded();
    const box = await chart.boundingBox();
    expect(box).toBeTruthy();
    const viewport = page.viewportSize();
    const inspectX = Math.min(box.x + box.width * 0.62, viewport.width - 28);
    const inspectY = Math.min(box.y + Math.min(box.height * 0.68, 520), viewport.height - 28);
    if (testInfo.project.use.hasTouch) {
      await page.touchscreen.tap(inspectX, inspectY);
    } else {
      await page.mouse.move(inspectX, inspectY);
    }
    await expect(page.locator(".chart-cursor-line")).toHaveCount(1);
    await expect(page.locator(".chart-tooltip")).toBeVisible();

    await page.getByRole("button", { name: /Information about data|Daten und Methodik|Methodik|Methodology|Info/i }).first().click();
    await expect(page.getByRole("dialog", { name: /Daten und Methodik|Data and methodology/i })).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText(/ODbL/);
    await page.getByRole("button", { name: /Schließen|Close/i }).click();

    await page.locator(".tendency-card").first().click();
    await expect(page.getByRole("dialog", { name: /im Zeitverlauf|over time/i })).toBeVisible();
    await expect(page.locator(".party-periods button")).toHaveCount(8);
    await page.locator(".party-periods button").last().click();
    await expect(page.locator(".party-detail-chart")).toBeVisible();
    await page.getByRole("button", { name: /Schließen|Close/i }).click();

    await expectNoBrokenVisibleText(page);
    await page.screenshot({ path: testInfo.outputPath("federal.png"), fullPage: false });
    expect(errors).toEqual([]);
  });

  test("custom state map, date transparency and map embed work", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    await page.goto("/?view=map");
    await settle(page);
    await expect(page.getByRole("heading", { name: /Deutschland im Überblick|Germany at a glance/i })).toBeVisible();
    await expect(page.locator(".polling-map .poll-map-state")).toHaveCount(16);
    await expect(page.locator(".map-method-note")).toContainText(/90 Tage|90 days/);
    await expectDocumentFits(page);

    await page.locator('.polling-map a[href="/?region=bayern"]').focus();
    await expect(page.locator(".map-stale-badge")).toBeVisible();

    await page.getByRole("button", { name: /Karte anpassen|Customize map/i }).click();
    const mapControls = page.locator(".map-customize-panel");
    await mapControls.getByRole("radio", { name: /Partei vergleichen|Compare party/i }).click();
    await mapControls.getByRole("radio", { name: /Grüne|Greens/i }).click();
    await expect(page.locator(".intensity-legend")).toBeVisible();

    await page.getByRole("button", { name: /Karte einbetten|Embed map/i }).click();
    await expect(page.getByRole("dialog", { name: /Deutschlandkarte einbetten|Embed map of Germany/i })).toBeVisible();
    await expect(page.locator(".embed-live-preview iframe")).toBeVisible();
    await page.getByRole("button", { name: /Schließen|Close/i }).click();

    await expectNoBrokenVisibleText(page);
    await page.screenshot({ path: testInfo.outputPath("map.png"), fullPage: true });
    expect(errors).toEqual([]);
  });

  test("state archive and thin-data state remain usable", async ({ page }) => {
    const errors = watchRuntime(page);
    for (const route of ["/?region=berlin", "/?region=saarland"]) {
      await page.goto(route);
      await settle(page);
      await expect(page.locator(".poll-chart")).toBeVisible();
      await expect(page.locator(".coverage-banner")).toBeVisible();
      await expect(page.locator(".chart-footer .data-attribution")).toContainText("dawum.de");
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `https://de.pollframe.workers.dev${route}`,
      );
      const projection = page.locator(".projection-section");
      await projection.scrollIntoViewIfNeeded();
      await expect(projection).toBeVisible();
      await expect(projection).toContainText(/Regierungsrechner|Government calculator/i);

      const partyNames = await projection.locator(".seat-party").allTextContents();
      const plenaryOrder = new Map([
        ["BSW", -1],
        ["Linke", 0],
        ["SPD", 1],
        ["Grüne", 2],
        ["SSW", 2.5],
        ["FDP", 3],
        ["Freie Wähler", 3.5],
        ["CDU/CSU", 4],
        ["CDU", 4],
        ["CSU", 4],
        ["BVB/FW", 4.5],
        ["AfD", 5],
      ]);
      const positions = partyNames.map((name) => plenaryOrder.get(name.trim()));
      expect(positions.every(Number.isFinite)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));

      await expectDocumentFits(page);
      await expectNoBrokenVisibleText(page);
    }
    expect(errors).toEqual([]);
  });

  test("legal, contact, privacy and licence pages render", async ({ page }) => {
    const errors = watchRuntime(page);
    await page.goto("/?page=impressum");
    await settle(page);
    await expect(page.getByRole("heading", { name: "Impressum" })).toBeVisible();
    await expect(page.getByText("Katharina O'Connor")).toBeVisible();
    await expect(page.getByText("23570 Lübeck")).toBeVisible();
    await expect(page.locator(".placeholder-warning")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expectDocumentFits(page);

    await page.goto("/?page=kontakt");
    await settle(page);
    await expect(page.getByRole("heading", { name: /Wobei können wir helfen|How can we help/i })).toBeVisible();
    await expect(page.locator(".contact-form-card")).toBeVisible();
    await expect(page.getByLabel(/Betreff|Subject/i)).toBeVisible();
    await expect(page.getByLabel(/Nachricht|Message/i)).toBeVisible();
    await expect(page.getByText(/sendet und speichert nichts|does not send or store/i)).toBeVisible();
    await expect(page.locator(`a[href="mailto:opinionpoll.redaktion@proton.me"]`)).not.toHaveCount(0);
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);

    await page.goto("/?page=datenschutz");
    await settle(page);
    await expect(page.getByRole("heading", { name: /Datenschutzerklärung|Privacy notice/i })).toBeVisible();
    await expect(page.getByText("Katharina O'Connor")).toBeVisible();
    await expect(page.getByText(/Kontaktassistent.*überträgt|contact assistant does not transmit/i)).toBeVisible();
    await expect(page.locator(".placeholder-warning")).toHaveCount(0);
    await expectDocumentFits(page);

    await page.goto("/?page=lizenzen");
    await settle(page);
    await expect(page.getByRole("heading", { name: /Quellen und Lizenzen|Sources and licences/i })).toBeVisible();
    await expect(page.getByText(/Derivative Pollframe|abgeleitete Pollframe/i)).toBeVisible();
    await expect(page.getByText(/Meta Platforms/).first()).toBeVisible();
    await expect(page.locator(".placeholder-warning")).toHaveCount(0);
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);
    expect(errors).toEqual([]);
  });

  test("chart and map embeds remain self-contained and responsive", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    await page.goto("/embed.html?embed=1&region=bundestag&lang=de&theme=light&range=year&mode=both&parties=1,2,4,5,7&pollsters=1,2,3,5,6,9,13,17&events=national");
    await settle(page);
    await expect(page.locator(".embed-page .poll-chart")).toBeVisible();
    await expect(page.locator(".embed-footer .data-attribution")).toContainText("Bundeswahlleiterin");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expectDocumentFits(page);
    await page.screenshot({ path: testInfo.outputPath("chart-embed.png"), fullPage: true });

    await page.goto("/embed.html?embed=1&view=map&lang=de&theme=light&mapMode=leader&mapParty=union");
    await settle(page);
    await expect(page.locator(".map-embed-page .polling-map")).toBeVisible();
    await expect(page.locator(".embed-footer .data-attribution")).toContainText("CC BY 4.0");
    await expectDocumentFits(page);
    await page.screenshot({ path: testInfo.outputPath("map-embed.png"), fullPage: true });
    expect(errors).toEqual([]);
  });
});
