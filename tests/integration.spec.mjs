import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

function watchRuntime(page) {
  const errors = [];
  const localAnalyticsNoise = (value) => page.url().startsWith("http://127.0.0.1") && (
    value.includes("cloudflareinsights.com/cdn-cgi/rum")
    || value.includes("Access-Control-Allow-Origin")
    || value === "Failed to load resource: net::ERR_FAILED"
  );
  page.on("pageerror", (error) => {
    if (!localAnalyticsNoise(error.message)) errors.push(`pageerror: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const value = message.text();
    if (!localAnalyticsNoise(value)) errors.push(`console: ${value}`);
  });
  return errors;
}

async function expectDocumentFits(page) {
  const dimensions = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll("body *")]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.position !== "fixed" && (rect.right > document.documentElement.clientWidth + 2 || rect.left < -2);
      })
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName,
        className: typeof element.className === "string" ? element.className : element.getAttribute("class"),
        text: element.textContent?.trim().slice(0, 60),
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      })),
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
          const insideHorizontalScroller = element.closest(".chart-wrap,.party-selector,.code-label,.poll-table-scroll");
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

async function expectPngHasVisibleContent(page, png) {
  const stats = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 100;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let minimum = 255;
    let maximum = 0;
    let total = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const luminance = (pixels[index] * 0.2126) + (pixels[index + 1] * 0.7152) + (pixels[index + 2] * 0.0722);
      minimum = Math.min(minimum, luminance);
      maximum = Math.max(maximum, luminance);
      total += luminance;
    }
    return { minimum, maximum, average: total / (pixels.length / 4) };
  }, png.toString("base64"));
  expect(stats.maximum - stats.minimum, `PNG looks blank: ${JSON.stringify(stats)}`).toBeGreaterThan(35);
  expect(stats.average, `PNG looks black: ${JSON.stringify(stats)}`).toBeGreaterThan(80);
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
    await expect(page.getByRole("heading", { level: 1, name: /Deutschland im Überblick|Germany at a glance/i })).toBeVisible();
    await expect(page.locator('.site-header .brand')).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: /Bundestagswahl|Federal election/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Europawahl in Deutschland|European election in Germany/i })).toHaveCount(0);
    await expect(page.locator('.overview-entry-stack .europe-entry')).toHaveCount(0);
    await expect(page.locator(".germany-map")).toBeVisible();
    await expect(page.locator(".overview-entry-stack .overview-classic-widget")).toHaveCount(2);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://de.pollframe.workers.dev/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);

    await page.getByRole("button", { name: /Einstellungen|Settings/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /English.*United Kingdom/i }).click();
    await expect(page.getByRole("heading", { level: 1, name: /Germany at a glance/ })).toBeVisible();
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

    const tendencyCard = page.locator(".tendency-card").first();
    await tendencyCard.evaluate((element) => element.scrollIntoView({ block: "center" }));
    if (testInfo.project.use.hasTouch) await tendencyCard.tap();
    else await tendencyCard.click();
    await expect(page.getByRole("dialog", { name: /im Zeitverlauf|over time/i })).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");
    await expect(page.locator(".party-periods button")).toHaveCount(8);
    await page.locator(".party-periods button").last().click();
    await expect(page.locator(".party-detail-chart")).toBeVisible();
    if (testInfo.project.use.hasTouch) {
      await expect(page.locator(".party-metric-relative")).toBeHidden();
      await expectDocumentFits(page);
    }
    await page.screenshot({ path: testInfo.outputPath("party-detail.png"), fullPage: false });
    await page.getByRole("button", { name: /Schließen|Close/i }).click();
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");

    await page.locator(".chart-actions .primary-button").click();
    await expect(page.locator(".embed-modal")).toBeVisible();
    const previewFrame = page.frameLocator(".embed-live-preview iframe");
    await expect(previewFrame.locator(".embed-page")).toBeVisible();
    await expect(previewFrame.locator(".series-line")).not.toHaveCount(0);
    await page.locator(".embed-live-preview").screenshot({ path: testInfo.outputPath("share-preview.png") });
    await page.getByRole("button", { name: /Schließen|Close/i }).click();

    const pollTable = page.locator(".poll-table-section");
    await pollTable.locator("summary").click();
    await expect(pollTable).toHaveAttribute("open", "");
    const sourceLink = page.viewportSize().width <= 700
      ? pollTable.locator('.poll-card-list a[href^="https://dawum.de/Bundestag/"]').first()
      : pollTable.locator('.poll-table-desktop a[href^="https://dawum.de/Bundestag/"]').first();
    await expect(sourceLink).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await pollTable.getByRole("button", { name: /CSV/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^pollframe-bundestag-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = await readFile(await download.path(), "utf8");
    expect(csv.startsWith('\uFEFF"publication_date","fieldwork_start","fieldwork_end"')).toBe(true);
    expect(csv).toContain('"source_url","license"');
    expect(csv).toMatch(/"https:\/\/dawum\.de\/Bundestag\/[^"\r\n]+\/","ODC-ODbL"/);

    if (page.viewportSize().width <= 700) {
      const visibleCoalitions = () => page.locator(".coalition-row").evaluateAll((rows) => rows.filter((row) => getComputedStyle(row).display !== "none").length);
      expect(await visibleCoalitions()).toBeLessThanOrEqual(5);
      if (await page.locator(".coalition-more").isVisible().catch(() => false)) {
        await page.locator(".coalition-more").click();
        expect(await visibleCoalitions()).toBeGreaterThan(5);
      }
    }

    await expectNoBrokenVisibleText(page);
    await page.screenshot({ path: testInfo.outputPath("federal.png"), fullPage: false });
    expect(errors).toEqual([]);
  });

  test("journalist PNG exports include a high-resolution chart", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    await page.goto("/?region=bundestag");
    await settle(page);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /PNG exportieren|Export PNG/i }).click();
    const download = await downloadPromise;
    await download.saveAs(testInfo.outputPath("bundestag-export.png"));
    expect(download.suggestedFilename()).toMatch(/^pollframe-bundestag-all-trend-\d{4}-\d{2}-\d{2}\.png$/);
    const png = await readFile(await download.path());
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.readUInt32BE(16)).toBeGreaterThanOrEqual(2200);
    expect(png.readUInt32BE(20)).toBeGreaterThan(900);
    await expectPngHasVisibleContent(page, png);
    await expect(page.getByRole("button", { name: /PNG gespeichert|PNG saved/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Turkish, Russian and Arabic settings update language, formats and direction", async ({ page }) => {
    const errors = watchRuntime(page);
    await page.goto("/");
    await settle(page);
    await page.getByRole("button", { name: /Einstellungen|Settings/i }).click();
    await expect(page.locator(".language-option")).toHaveCount(7);

    await page.getByRole("button", { name: /Türkçe.*Türkiye/i }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
    await expect(page.getByRole("heading", { level: 1, name: /Almanya'ya genel bakış/ })).toBeVisible();

    await page.getByRole("button", { name: /Русский/i }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.getByRole("heading", { level: 1, name: /Германия в целом/ })).toBeVisible();

    await page.getByRole("button", { name: /العربية/i }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1, name: /نظرة عامة على ألمانيا/ })).toBeVisible();
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);

    await page.goto("/?region=berlin&share=1&lang=ar");
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: /استطلاعات انتخابات ولاية Berlin/ })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expectDocumentFits(page);
    expect(errors).toEqual([]);
  });

  test("custom state map, date transparency and map embed work", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    await page.goto("/?view=map");
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: /Deutschland im Überblick|Germany at a glance/i })).toBeVisible();
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

    const mapDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /PNG exportieren|Export PNG/i }).click();
    const mapDownload = await mapDownloadPromise;
    await mapDownload.saveAs(testInfo.outputPath("map-export.png"));
    expect(mapDownload.suggestedFilename()).toMatch(/^pollframe-deutschlandkarte-party-\d{4}-\d{2}-\d{2}\.png$/);
    const mapPng = await readFile(await mapDownload.path());
    expect([...mapPng.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(mapPng.readUInt32BE(16)).toBeGreaterThanOrEqual(2200);

    await page.getByRole("button", { name: /Karte einbetten|Embed map/i }).click();
    await expect(page.getByRole("dialog", { name: /Deutschlandkarte einbetten|Embed map of Germany/i })).toBeVisible();
    await expect(page.locator(".embed-live-preview iframe")).toBeVisible();
    await page.getByRole("button", { name: /Schließen|Close/i }).click();

    await expectNoBrokenVisibleText(page);
    await page.screenshot({ path: testInfo.outputPath("map.png"), fullPage: true });
    expect(errors).toEqual([]);
  });

  test("state archive and thin-data state remain usable", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    for (const route of ["/?region=berlin", "/?region=saarland"]) {
      await page.goto(route);
      await settle(page);
      await expect(page.locator(".poll-chart")).toBeVisible();
      if (testInfo.project.use.hasTouch) await expect(page.locator(".coverage-banner")).toHaveCount(1);
      else await expect(page.locator(".coverage-banner")).toBeVisible();
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

  test("sparse party histories render as one normal chart without fan-shaped fills", async ({ page }) => {
    const errors = watchRuntime(page);
    await page.goto("/?region=sachsen-anhalt&party=afd");
    await settle(page);
    await expect(page.getByRole("dialog", { name: /AfD.*Zeitverlauf|AfD.*over time/i })).toBeVisible();
    await page.locator(".party-periods button").last().click();

    const line = page.locator(".party-detail-line");
    const area = page.locator(".party-area");
    await expect(line).toHaveCount(1);
    await expect(area).toHaveCount(1);

    const [linePath, areaPath] = await Promise.all([
      line.getAttribute("d"),
      area.getAttribute("d"),
    ]);
    expect(linePath).toBeTruthy();
    expect(areaPath).toBeTruthy();
    expect((linePath.match(/\bM\b/g) ?? []).length).toBe(1);
    expect((areaPath.match(/\bM\b/g) ?? []).length).toBe(1);
    expect(areaPath.startsWith(linePath)).toBe(true);
    expect(areaPath).not.toMatch(/NaN|undefined/);
    expect(errors).toEqual([]);
  });

  test("Germany remains the default country while retired expansion routes stay paused", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    await page.goto("/?view=europe");
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: /Deutschland im Überblick|Germany at a glance/i })).toBeVisible();
    await expect(page.locator(".europe-overview-page")).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://de.pollframe.workers.dev/",
    );
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);
    await page.screenshot({ path: testInfo.outputPath("germany-country-overview.png"), fullPage: false });

    await page.goto("/?country=de");
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: /Deutschland im Überblick|Germany at a glance/i })).toBeVisible();
    await expect(page.locator(".overview-entry-stack .overview-classic-widget")).toHaveCount(2);
    await expect(page.locator(".germany-map .map-state")).toHaveCount(16);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://de.pollframe.workers.dev/");
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);

    for (const code of ["fr", "at", "pl"]) {
      await page.goto(`/?country=${code}`);
      await settle(page);
      await expect(page.getByRole("heading", { level: 1, name: /Deutschland im Überblick|Germany at a glance/i })).toBeVisible();
      await expect(page.locator(".germany-country-overview")).toBeVisible();
      await expect(page.locator(".europe-overview-page")).toHaveCount(0);
      await expect(page).toHaveURL(/\/$/);
      await expectDocumentFits(page);
    }
    expect(errors).toEqual([]);
  });

  test("Spain archive, map, languages and PNG export stay coherent", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    await page.goto("/?country=es&lang=es");
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: /España de un vistazo/i })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Cómo se forma Gobierno|Cómo una gobierno|How a government is formed|Wie eine Regierung entsteht/i);
    await expect(page.locator(".spain-map-detail h3")).toHaveText("—");
    await expect(page.locator(".spain-map-svg .active-outline")).toHaveCount(0);
    await page.locator(".spain-map-svg path[role=button]").first().hover();
    await expect(page.locator(".spain-map-detail h3")).not.toHaveText("—");
    await expect(page.locator(".spain-map-svg .active-outline")).toHaveCount(1);

    await page.getByRole("button", { name: /Ajustes/i }).click();
    await expect(page.locator(".language-option")).toHaveCount(3);
    await expect(page.locator(".language-list")).toContainText("Deutsch");
    await expect(page.locator(".language-list")).toContainText("English");
    await expect(page.locator(".language-list")).toContainText("Español");
    await page.getByRole("button", { name: /Cerrar/i }).click();

    await page.locator(".spain-polling-entry").click();
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: /Encuestas de las elecciones generales/i })).toBeVisible();
    await page.getByRole("button", { name: /Configurar gráfico/i }).click();
    await expect(page.locator(".customize-panel")).toBeVisible();
    await expect(page.locator(".customize-panel")).not.toContainText(/10 años|10 years|10 Jahre/i);
    await expect(page.locator(".customize-panel")).toContainText(/Desde las elecciones de 2023/i);
    await expect(page.locator(".customize-panel")).toContainText(/Archivo completo.*1996/i);

    if (testInfo.project.name === "chromium-desktop") {
      const pngDownloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: /Exportar PNG/i }).click();
      const pngDownload = await pngDownloadPromise;
      await pngDownload.saveAs(testInfo.outputPath("spain-export.png"));
      const png = await readFile(await pngDownload.path());
      expect(png.readUInt32BE(16)).toBeGreaterThanOrEqual(3000);
      expect(png.readUInt32BE(20)).toBeGreaterThan(900);
      await expectPngHasVisibleContent(page, png);
    }
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);
    expect(errors).toEqual([]);
  });

  test("UK overview and Westminster detail use a distinct, responsive product flow", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    await page.goto("/?view=countries");
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: /Select a country|Land auswählen/i })).toBeVisible();
    await expect(page.locator(".country-index-grid .overview-classic-widget")).toHaveCount(3);
    await page.getByRole("link", { name: /United Kingdom/i }).click();
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: /United Kingdom at a glance|Vereinigtes Königreich im Überblick/i })).toBeVisible();
    await expect(page.locator('.site-header .brand')).toHaveAttribute("href", "/?country=uk");
    await expect(page.locator(".header-country-menu")).toBeVisible();
    await expect(page.locator(".overview-entry-stack .overview-classic-widget")).toHaveCount(2);
    await expect(page.locator(".overview-profile-badge")).toHaveCount(0);
    await expect(page.locator(".uk-devolution")).toHaveCount(0);
    await expect(page.locator(".uk-map-visual svg")).toBeVisible();
    await expect(page.locator(".uk-map-visual svg > .uk-map-active-overlay")).toHaveCount(1);
    await expect(page.locator(".uk-map-detail")).toContainText(/Greater London/);
    if (testInfo.project.name === "pixel-5") await expect(page.locator(".uk-map-pointer-advice")).toHaveCount(0);
    await page.getByRole("button", { name: /Compare party|Partei vergleichen/i }).click();
    await expect(page.locator(".uk-map-value-label")).not.toHaveCount(0);
    await page.locator(".uk-map-card").screenshot({ path: testInfo.outputPath("uk-map-compare.png") });
    if (!testInfo.project.name.includes("pixel") && !testInfo.project.name.includes("galaxy") && !testInfo.project.name.includes("iphone")) {
      await page.locator('.uk-map-visual path[id^="Scotland-"]').hover();
      await expect(page.locator(".uk-map-detail")).toContainText("Scotland");
      await expect(page.locator(".uk-map-visual svg > .uk-map-active-overlay")).toHaveCount(1);
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://de.pollframe.workers.dev/?country=uk");
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);

    await page.getByRole("link", { name: /Constituency finder|Wahlkreisfinder/i }).click();
    await settle(page);
    await expect(page).toHaveURL(/view=uk-constituencies/);
    await expect(page.getByRole("heading", { level: 1, name: /Find your constituency|Finde deinen Wahlkreis/i })).toBeVisible();
    if (!testInfo.project.use.hasTouch) {
      const exploreSeat = page.locator(".battleground-list button").first();
      const restingSeatColour = await exploreSeat.evaluate((node) => getComputedStyle(node).backgroundColor);
      await exploreSeat.hover();
      await expect.poll(() => exploreSeat.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(restingSeatColour);
    }
    await page.getByLabel(/Postcode, town or constituency|Postcode, Ort oder Wahlkreis/i).fill("Bristol Central");
    await page.getByRole("option", { name: /Bristol Central/i }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Bristol Central" })).toBeVisible();
    await expect(page.locator(".constituency-detail")).toContainText(/Official election result|Amtliches Wahlergebnis/i);
    await expect(page.locator(".constituency-detail")).toContainText(/no projection or estimate|keine Hochrechnung und keine Schätzung/i);
    await expect(page.locator(".constituency-detail")).not.toContainText(/Simple model|Einfaches Modell|UNS/i);
    await expectDocumentFits(page);
    await page.screenshot({ path: testInfo.outputPath("uk-constituency.png"), fullPage: false });

    await page.goto("/?country=uk");
    await settle(page);

    await page.getByRole("link", { name: /Westminster polling|Unterhaus-Umfragen/i }).click();
    await settle(page);
    await expect(page).toHaveURL(/region=uk-westminster/);
    await expect(page.getByRole("heading", { level: 1, name: /Westminster voting intention|Umfragen zur britischen Unterhauswahl/i })).toBeVisible();
    await expect(page.locator(".poll-chart")).toBeVisible();
    await expect(page.locator(".chart-footer .data-attribution")).toContainText("UK Election Data Vault");
    await expect(page.locator(".uk-votes-seats")).toBeVisible();
    await expect(page.locator(".uk-seat-projection")).toHaveCount(0);
    await expect(page.locator(".uk-votes-seats")).toContainText(/official result.*2024|amtliches Ergebnis.*2024/i);
    await expect(page.locator(".uk-votes-seats")).not.toContainText(/Why this matters|Warum das wichtig ist/i);
    if (page.viewportSize().width <= 600) {
      await expect(page.locator(".uk-minor-toggle")).toBeVisible();
      await page.locator(".uk-minor-toggle").click();
      await expect(page.locator(".uk-result-list")).toContainText("SNP");
    }
    if (testInfo.project.name === "chromium-desktop") {
      const pngDownloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: /PNG exportieren|Export PNG/i }).click();
      const pngDownload = await pngDownloadPromise;
      await pngDownload.saveAs(testInfo.outputPath("uk-export.png"));
      const png = await readFile(await pngDownload.path());
      await expectPngHasVisibleContent(page, png);
    }

    await page.getByRole("button", { name: /Customise chart|Diagramm anpassen/i }).click();
    await expect(page.locator(".customize-panel")).toBeVisible();
    await expect(page.locator(".customize-panel")).toContainText(/Connected averages|Verbundene Durchschnittswerte/i);
    await expect(page.locator(".customize-panel .select-control").nth(1)).toContainText(/10 years|10 Jahre/i);
    await expect(page.locator(".customize-panel")).toContainText(/Poll of polls.*weighted trend/i);
    await expect(page.locator(".customize-panel")).not.toContainText(/FindOutNow/);
    await page.locator(".customize-panel .select-control").nth(0).locator("summary").click();
    await page.getByRole("button", { name: /Connected averages|Verbundene Durchschnittswerte/i }).click();
    await expect(page.locator(".average-series-line")).not.toHaveCount(0);
    await expect(page.locator(".average-series-points")).toHaveCount(0);
    await expect(page.locator(".series-line")).toHaveCount(0);
    await page.locator(".customize-panel .select-control").nth(1).locator("summary").click();
    await page.getByRole("button", { name: /Custom dates|Eigener Zeitraum/i }).click();
    await expect(page.locator('.custom-date-slider input[type="range"]')).toHaveCount(2);
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);
    await page.screenshot({ path: testInfo.outputPath("uk-westminster.png"), fullPage: false });
    expect(errors).toEqual([]);
  });

  test("since-last-visit appears only for a real polling change", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await expect(page.locator(".since-visit")).toHaveCount(0);
    await page.reload();
    await settle(page);
    await expect(page.locator(".since-visit")).toHaveCount(0);
    await page.evaluate(() => {
      const key = "pollframe-last-snapshot-de";
      const snapshot = JSON.parse(localStorage.getItem(key));
      snapshot.results["7"] = Number(snapshot.results["7"]) - 0.1;
      localStorage.setItem(key, JSON.stringify(snapshot));
    });
    await page.reload();
    await settle(page);
    await expect(page.locator(".since-visit")).toBeVisible();
    await expect(page.locator(".since-visit")).toContainText(/0[,.]1/);
    await page.reload();
    await settle(page);
    await expect(page.locator(".since-visit")).toHaveCount(0);
  });

  test("local Watchlist tracks German parties and modelled majorities", async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query) => query === "(display-mode: standalone)"
        ? {
            matches: true,
            media: query,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent() { return true; },
          }
        : original(query);
    });
    await page.goto("/?view=watchlist&country=de");
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: "Watchlist" })).toBeVisible();
    if (await page.getByRole("button", { name: /Nicht jetzt|Not now/i }).isVisible().catch(() => false)) await page.getByRole("button", { name: /Nicht jetzt|Not now/i }).click();
    await expect(page.locator(".watchlist-empty")).toBeVisible();
    await page.locator(".watchlist-empty").click();
    await page.locator(".watch-gallery .select-control > summary").click();
    await page.getByRole("button", { name: /Berlin/ }).click();
    await page.getByRole("button", { name: /^Grüne/ }).click();
    await page.getByRole("button", { name: /Zur Watchlist|Add to Watchlist/i }).click();
    await expect(page.locator(".watch-card")).toHaveCount(1);
    await expect(page.locator(".watch-card").first()).toContainText(/Grüne/);
    await expect(page.locator(".watch-gallery")).toBeHidden();
    await page.getByRole("button", { name: /Watchlist-Eintrag hinzufügen|Add Watchlist item/i }).click();
    await page.getByRole("button", { name: /Mehrheit|Majority/i }).click();
    await page.getByRole("button", { name: /^SPD/ }).click();
    await page.getByRole("button", { name: /^CDU/ }).click();
    await page.getByRole("button", { name: /Zur Watchlist|Add to Watchlist/i }).click();
    await expect(page.locator(".watch-card")).toHaveCount(2);
    await expect(page.locator(".watch-widget-lab")).toHaveCount(0);
    await page.evaluate(() => {
      const key = "pollframe-watchlist-de-v2";
      const items = JSON.parse(localStorage.getItem(key));
      items[0].lastSnapshot.value -= 1.2;
      localStorage.setItem(key, JSON.stringify(items));
    });
    await page.reload();
    await settle(page);
    await expect(page.locator(".watchlist-alerts")).toContainText(/1[,.]2/);
    await expectDocumentFits(page);
    await page.screenshot({ path: testInfo.outputPath("watchlist.png"), fullPage: false });
  });

  test("dropdowns close outside, event clicks open their source and the timeline stays controlled", async ({ page, context }) => {
    await page.goto("/?region=bundestag");
    await settle(page);
    await page.getByRole("button", { name: /Diagramm anpassen|Customise chart/i }).click();
    const display = page.locator(".customize-panel .select-control").first();
    await display.locator("summary").click();
    await expect(display).toHaveAttribute("open", "");
    await page.locator(".chart-heading h2").click();
    await expect(display).not.toHaveAttribute("open", "");
    await page.locator(".customize-panel .select-control").nth(1).locator("summary").click();
    await page.getByRole("button", { name: /Eigener Zeitraum|Custom dates/i }).click();
    await expect(page.locator(".custom-date-slider input[type=range]")).toHaveCount(2);
    await expect(page.locator(".dual-range-ticks span")).toHaveCount(5);
    await expect(page.locator(".event-marker title")).toHaveCount(0);
    const popupPromise = page.waitForEvent("popup");
    await page.locator(".event-marker").last().click({ force: true });
    const popup = await popupPromise;
    expect(new URL(popup.url()).protocol).toMatch(/^https?:$/);
    await popup.close();
    expect(context.pages()).toHaveLength(1);
  });

  test("the paused German European-election archive returns to Germany overview", async ({ page }) => {
    const errors = watchRuntime(page);
    await page.goto("/?region=europawahl-deutschland");
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: /Deutschland im Überblick|Germany at a glance/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Europawahl in Deutschland|European election in Germany/i })).toHaveCount(0);
    await expect(page.locator(".poll-chart")).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://de.pollframe.workers.dev/",
    );
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);
    expect(errors).toEqual([]);
  });

  test("constituency search handles a Buxton address, an outward code and small typos", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    const lookupRequests = [];
    await page.route("https://api.postcodes.io/**", async (route) => {
      const url = new URL(route.request().url());
      lookupRequests.push(url.href);
      const headers = { "access-control-allow-origin": "*", "content-type": "application/json" };
      if (url.pathname === "/postcodes" && url.searchParams.get("query") === "SK17 6BE") {
        await route.fulfill({ status: 200, headers, body: JSON.stringify({ status: 200, result: [{ postcode: "SK17 6BE", parliamentary_constituency_2024: "High Peak" }] }) });
      } else if (url.pathname === "/postcodes") {
        await route.fulfill({ status: 200, headers, body: JSON.stringify({ status: 200, result: [] }) });
      } else if (url.pathname === "/outcodes/SK17") {
        await route.fulfill({ status: 200, headers, body: JSON.stringify({ status: 200, result: { outcode: "SK17", parliamentary_constituency: ["Derbyshire Dales", "High Peak", "Staffordshire Moorlands"] } }) });
      } else if (url.pathname === "/places") {
        await route.fulfill({ status: 200, headers, body: JSON.stringify({ status: 200, result: [{ name_1: "Buxton", name_2: null, outcode: "SK17", country: "England" }] }) });
      } else {
        await route.fulfill({ status: 404, headers, body: JSON.stringify({ status: 404, error: "Not found" }) });
      }
    });
    await page.goto("/?view=uk-constituencies&country=uk");
    await settle(page);
    const search = page.getByLabel(/Postcode, town or constituency|Postcode, Ort oder Wahlkreis/i);

    await search.fill("Flat 4, 12 Example Road, Buxton SK17 6BE");
    await page.getByRole("button", { name: /^Search$|^Suchen$/i }).click();
    await expect(page.locator(".selected-constituency")).toContainText("High Peak");
    await expect(search).toHaveValue("High Peak");
    expect(lookupRequests.some((url) => new URL(url).pathname === "/postcodes" && new URL(url).searchParams.get("query") === "SK17 6BE")).toBeTruthy();
    expect(lookupRequests.some((url) => url.includes("Example"))).toBeFalsy();

    await page.locator(".selected-constituency").getByRole("button", { name: /Change|Ändern/i }).click();
    await search.fill("SK17");
    await page.getByRole("button", { name: /^Search$|^Suchen$/i }).click();
    await expect(page.getByRole("listbox")).toContainText(/High Peak/);
    await page.getByRole("option", { name: /High Peak/i }).click();
    await expect(page.locator(".selected-constituency")).toContainText("High Peak");
    expect(lookupRequests.some((url) => url.endsWith("/outcodes/SK17"))).toBeTruthy();

    await page.locator(".selected-constituency").getByRole("button", { name: /Change|Ändern/i }).click();
    await search.fill("SK17 6ZZ");
    await page.getByRole("button", { name: /^Search$|^Suchen$/i }).click();
    await expect(page.getByRole("status")).toContainText(/exact postcode was not found|genaue Postcode wurde nicht gefunden/i);
    await page.getByRole("option", { name: /High Peak/i }).click();

    await page.locator(".selected-constituency").getByRole("button", { name: /Change|Ändern/i }).click();
    await search.fill("Bristol");
    await page.getByRole("button", { name: /^Search$|^Suchen$/i }).click();
    await expect(page.getByRole("status")).toContainText(/Several constituencies|Mehrere Wahlkreise/i);
    await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(5);
    await page.getByRole("option", { name: /^Bristol Central/i }).click();

    await page.locator(".selected-constituency").getByRole("button", { name: /Change|Ändern/i }).click();
    await search.fill("Bristl Centrl");
    await page.getByRole("button", { name: /^Search$|^Suchen$/i }).click();
    await expect(page.locator(".selected-constituency")).toContainText("Bristol Central");
    await expect(search).toHaveValue("Bristol Central");
    await expect(page.locator(".constituency-detail")).toContainText(/Official vote shares|Amtliche Stimmenanteile/i);
    await expect(page.locator(".constituency-model-summary")).toHaveCount(0);
    await expectDocumentFits(page);
    await page.screenshot({ path: testInfo.outputPath("uk-constituency-search.png"), fullPage: false });
    await page.locator(".constituency-detail").screenshot({ path: testInfo.outputPath("uk-constituency-detail.png") });
    expect(errors).toEqual([]);
  });

  test("shared chart URLs restore an exact view", async ({ page }) => {
    const errors = watchRuntime(page);
    await page.goto("/?region=bundestag&share=1&lang=en-GB&range=year&mode=both&parties=1,2&pollsters=1,2&events=national,global");
    await settle(page);
    await expect(page.getByRole("heading", { name: "German federal polling overview" })).toBeVisible();
    await expect(page.locator(".party-selector button.active")).toHaveCount(2);
    await expect(page.locator(".series-line")).toHaveCount(2);
    await expect(page.locator(".average-series-points")).toHaveCount(2);
    await page.getByRole("button", { name: /Customise chart/i }).click();
    await expect(page.locator(".customize-panel")).toContainText("Trend + average points");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://de.pollframe.workers.dev/?region=bundestag",
    );
    await expectDocumentFits(page);
    expect(errors).toEqual([]);
  });

  test("legal, contact, privacy and licence pages render", async ({ page }) => {
    const errors = watchRuntime(page);
    await page.goto("/?page=impressum");
    await settle(page);
    await expect(page.getByRole("heading", { name: "Impressum" })).toBeVisible();
    await expect(page.locator("address").filter({ hasText: "Katharina O'Connor" })).toBeVisible();
    await expect(page.getByText("23570 Lübeck")).toBeVisible();
    await expect(page.locator(".placeholder-warning")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expectDocumentFits(page);

    await page.goto("/?page=kontakt");
    await settle(page);
    await expect(page.getByRole("heading", { name: /Kontakt|Contact/i, level: 1 })).toBeVisible();
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
    await expect(page.locator("address").filter({ hasText: "Katharina O'Connor" })).toBeVisible();
    await expect(page.getByText(/Kontaktassistent.*überträgt|contact assistant does not transmit/i)).toBeVisible();
    await expect(page.locator(".placeholder-warning")).toHaveCount(0);
    await expectDocumentFits(page);

    await page.goto("/?page=lizenzen");
    await settle(page);
    await expect(page.getByRole("heading", { name: /Quellen und Lizenzen|Sources and licences/i })).toBeVisible();
    await expect(page.getByText(/Derivative Pollframe|abgeleitete Pollframe/i)).toBeVisible();
    await expect(page.getByText(/Meta Platforms/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "UK Election Data Vault" })).toBeVisible();
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
