import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

// Keep page-level API routing deterministic here. Service-worker caching and
// cold-offline behaviour are exercised separately in pwa.spec.mjs.
test.use({ serviceWorkers: "block" });

function watchRuntime(page) {
  const errors = [];
  let fullNavigationInProgress = false;
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) fullNavigationInProgress = true;
  });
  page.on("load", () => { fullNavigationInProgress = false; });
  const localAnalyticsNoise = (value) => page.url().startsWith("http://127.0.0.1") && (
    value.includes("cloudflareinsights.com/cdn-cgi/rum")
    || value.includes("Access-Control-Allow-Origin")
    || value === "Failed to load resource: net::ERR_FAILED"
    // WebKit reports cancelled outgoing fetches generically while page.goto or
    // reload replaces the document. Assertions on the new document still catch
    // real load failures; SPA navigation errors remain visible to this watcher.
    || (fullNavigationInProgress && value === "TypeError: Load failed")
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
          const insideHorizontalScroller = element.closest(".chart-wrap,.party-selector,.line-legend,.code-label,.poll-table-scroll");
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

async function downloadPng(page, button, format = "content") {
  await button.click();
  const modal = page.locator(".png-options-modal");
  await expect(modal).toBeVisible();
  await expect(modal.locator(".png-format-grid > button")).toHaveCount(3);
  const overlap = await modal.evaluate((root) => {
    const formats = root.querySelector(".png-format-grid")?.getBoundingClientRect();
    const actions = root.querySelector(".png-options-actions")?.getBoundingClientRect();
    if (!formats || !actions) return 0;
    return Math.max(0, Math.min(formats.bottom, actions.bottom) - Math.max(formats.top, actions.top));
  });
  expect(overlap, "PNG format choices overlap the export buttons").toBeLessThanOrEqual(1);
  if (format !== "content") await modal.locator(`.png-format-shape.is-${format}`).locator("..").click();
  const downloadPromise = page.waitForEvent("download");
  await modal.getByRole("button", { name: /PNG herunterladen|Download PNG|Descargar PNG/i }).click();
  const download = await downloadPromise;
  await modal.getByRole("button", { name: /Schließen|Close|Cerrar/i }).click();
  await expect(modal).toHaveCount(0);
  return download;
}

test.describe("core routes", () => {
  test("overview, navigation and settings are integrated", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    await page.goto("/");
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: /Deutschland im Überblick|Germany at a glance/i })).toBeVisible();
    await expect(page.locator('.site-header .brand')).toHaveAttribute("href", "/");
    await expect(page.locator(".header-report-button")).toHaveAttribute("href", /page=bug-report.*from=/);
    await expect(page.locator(".header-report-button")).toHaveAttribute("aria-label", /Problem melden|Report issue/i);
    await expect(page.locator("footer .report-bug-link")).toHaveAttribute("href", /page=bug-report.*from=/);
    await expect(page.getByRole("link", { name: /Bundestagswahl|Federal election/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Europawahl in Deutschland|European election in Germany/i })).toHaveCount(0);
    await expect(page.locator('.overview-entry-stack .europe-entry')).toHaveCount(0);
    await expect(page.locator(".germany-map")).toBeVisible();
    await expect(page.locator(".overview-entry-stack .overview-classic-widget")).toHaveCount(3);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://de.pollframe.workers.dev/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);

    const settingsButton = page.getByRole("button", { name: /Einstellungen|Settings/i });
    await settingsButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").locator(".icon-button")).toBeFocused();
    await page.getByRole("button", { name: /English.*United Kingdom/i }).click();
    await expect(page.getByRole("heading", { level: 1, name: /Germany at a glance/ })).toBeVisible();
    await page.getByRole("button", { name: /Dark/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: /Larger.*19 px/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-text", "large");
    await page.getByRole("button", { name: /Close/i }).click();
    await expect(settingsButton).toBeFocused();
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
    await expect(page.locator(".results-card .widget-data-age")).toContainText(/veröffentlicht/i);
    await page.locator(".results-card .graph-info-popover summary").click();
    await expect(page.locator(".results-card .graph-info-card")).toContainText(/wurde am .* veröffentlicht/i);
    await expect(page.locator(".results-card .graph-info-card")).toContainText(/Befragungszeitraum:/i);
    await page.locator(".results-card .graph-info-backdrop").click({ position: { x: 5, y: 5 } });
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

    const eventCategories = page.locator(".customize-panel .multi-select").last();
    await expect(page.locator(".election-point")).not.toHaveCount(0);
    await eventCategories.locator("summary").click();
    const electionCategory = eventCategories.getByText(/Bundestagswahlen|National elections/i, { exact: true });
    await electionCategory.click();
    await expect(page.locator(".election-point")).toHaveCount(0);
    await expect(page.locator(".historical-election-marker")).toHaveCount(0);
    await electionCategory.click();
    await expect(page.locator(".election-point")).not.toHaveCount(0);
    await eventCategories.locator("summary").click();

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
    const staticPreview = page.locator(".static-embed-preview");
    const previewIframe = staticPreview.locator("iframe");
    await expect(previewIframe).toHaveAttribute("scrolling", "no");
    await expect(previewIframe).toHaveAttribute("tabindex", "-1");
    expect(await previewIframe.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("none");
    expect(await staticPreview.evaluate((element) => getComputedStyle(element).overflowY)).toBe("auto");
    await expect(page.locator(".embed-options")).not.toContainText(/Höhe|Height/i);
    expect(await page.locator(".embed-modal").evaluate((element) => element.scrollHeight <= element.clientHeight + 2)).toBe(true);
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
    const chartExportButton = page.locator(".chart-card .png-export-button").first();
    const download = await downloadPng(page, chartExportButton, "landscape");
    await download.saveAs(testInfo.outputPath("bundestag-export.png"));
    expect(download.suggestedFilename()).toMatch(/^pollframe-bundestag-all-trend-landscape-\d{4}-\d{2}-\d{2}\.png$/);
    const png = await readFile(await download.path());
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.readUInt32BE(16)).toBe(1920);
    expect(png.readUInt32BE(20)).toBe(1080);
    await expectPngHasVisibleContent(page, png);
    const squareDownload = await downloadPng(page, chartExportButton, "square");
    await squareDownload.saveAs(testInfo.outputPath("bundestag-export-square.png"));
    expect(squareDownload.suggestedFilename()).toMatch(/-square-\d{4}-\d{2}-\d{2}\.png$/);
    const squarePng = await readFile(await squareDownload.path());
    expect(squarePng.readUInt32BE(16)).toBe(1080);
    expect(squarePng.readUInt32BE(20)).toBe(1080);
    expect(squarePng.equals(png)).toBe(false);
    await expectPngHasVisibleContent(page, squarePng);
    expect(errors).toEqual([]);
  });

  test("settings expose only the four fully supported locales", async ({ page }) => {
    const errors = watchRuntime(page);
    await page.goto("/");
    await settle(page);
    await page.getByRole("button", { name: /Einstellungen|Settings/i }).click();
    await expect(page.locator(".language-option")).toHaveCount(4);
    await expect(page.locator(".language-more-toggle")).toHaveCount(0);
    await page.getByRole("button", { name: /Español.*España/i }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);
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

    const mapDownload = await downloadPng(page, page.getByRole("button", { name: /PNG exportieren|Export PNG/i }));
    await mapDownload.saveAs(testInfo.outputPath("map-export.png"));
    expect(mapDownload.suggestedFilename()).toMatch(/^pollframe-deutschlandkarte-party-content-\d{4}-\d{2}-\d{2}\.png$/);
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
      await expect(page.locator(".coverage-banner")).toHaveCount(0);
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
    await expect(page.locator(".overview-entry-stack .overview-classic-widget")).toHaveCount(3);
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
    await expect(page.locator(".spain-shift-card")).toHaveCount(0);
    await expect(page.locator(".spain-issues-entry")).toContainText(/Qué preocupa a España/i);
    await expect(page.locator(".spain-issues-entry .spain-issue-bars")).toHaveCount(0);
    await expect(page.locator(".spain-issues-entry footer")).toHaveCount(0);
    await expect(page.locator(".spain-map-detail h3")).toHaveText("—");
    await expect(page.locator(".spain-map-svg .active-outline")).toHaveCount(0);
    await page.locator(".spain-map-svg a").first().hover();
    await expect(page.locator(".spain-map-detail h3")).not.toHaveText("Comunidad de Madrid");
    await expect(page.locator(".spain-map-svg .active-outline")).toHaveCount(1);
    await expect(page.locator(".spain-map-svg path").first()).toHaveAttribute("style", /--region-party/);
    await expect(page.locator(".spain-map-party-legend")).toContainText(/Primera fuerza/i);
    await page.getByRole("button", { name: /Comparar partido/i }).click();
    await expect(page.locator(".spain-map-value-label")).not.toHaveCount(0);
    await expect(page.locator(".spain-map-select")).toContainText("PP");
    await expect(page.locator(".spain-map-party-legend")).toHaveCount(0);
    await expect(page.locator(".spain-map-detail .uk-map-party-list > div")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("spain-overview.png"), fullPage: true });

    await page.locator(".spain-issues-entry").click();
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: /Qué preocupa a España/i })).toBeVisible();
    await expect(page.locator(".spain-concern-panel")).toHaveCount(2);
    await expect(page.locator(".spain-concern-ranking").first().locator(":scope > div")).toHaveCount(5);
    await expect(page.locator(".spain-concern-ranking").nth(1).locator(":scope > div")).toHaveCount(5);
    await expect(page.locator(".spain-concern-ranking").first()).toContainText(/41[,.]3%/);
    await expect(page.locator(".spain-concern-ranking").first().locator("i").first()).toHaveAttribute("style", /width: 41\.3%/);
    await expect(page.locator(".spain-economy-panel")).toContainText(/64[,.]7%/);
    const spainWidgetGap = await page.evaluate(() => {
      const concerns = document.querySelector(".spain-concern-grid").getBoundingClientRect();
      const economy = document.querySelector(".spain-economy-panel").getBoundingClientRect();
      return Math.round(economy.top - concerns.bottom);
    });
    expect(spainWidgetGap).toBeGreaterThanOrEqual(15);
    await expect(page.locator(".economic-perception-bar").first().locator("i").first()).toHaveAttribute("style", /width: 64\.7%/);
    await expect(page.locator(".economic-perception-bar").nth(1).locator("i").first()).toHaveAttribute("style", /width: 38\.1%/);
    await page.getByRole("button", { name: "Todas las respuestas" }).click();
    await expect(page.locator(".economic-perception-bar").first().locator("i")).toHaveCount(7);
    await expect(page.locator(".spain-economy-panel")).toContainText(/Muy buena/);
    await expect(page.locator(".spain-clock-panel")).toHaveCount(0);
    await expect(page.locator(".spain-issues-method")).toContainText(/4020/);
    const infoCorner = await page.locator(".spain-concern-panel").first().evaluate((widget) => {
      const widgetBox = widget.getBoundingClientRect();
      const iconBox = widget.querySelector(".graph-info-popover summary").getBoundingClientRect();
      const titleBox = widget.querySelector("h2").getBoundingClientRect();
      return { inset: iconBox.left - widgetBox.left, iconRight: iconBox.right, titleLeft: titleBox.left };
    });
    expect(infoCorner.inset).toBeLessThan(32);
    expect(infoCorner.titleLeft).toBeGreaterThan(infoCorner.iconRight);
    await page.locator(".spain-concern-panel .graph-info-popover summary").first().click();
    await expect(page.locator(".spain-concern-panel .graph-info-card").first()).toBeVisible();
    await expect(page.locator(".spain-concern-panel .graph-info-card").first()).toHaveAttribute("role", "dialog");
    await expect(page.locator(".spain-concern-panel .info-glyph").first()).toHaveText("i");
    await expectDocumentFits(page);
    await page.screenshot({ path: testInfo.outputPath("spain-issues.png"), fullPage: true });
    await page.locator(".spain-concern-panel .graph-info-backdrop").first().click({ position: { x: 5, y: 5 } });
    await page.getByRole("link", { name: /Volver a España/i }).click();
    await settle(page);

    await page.goto("/?country=es&lang=es&view=spain-region&area=cataluna");
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: "Cataluña" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator(".spain-region-history.is-recent")).toHaveCount(1);
    await expect(page.locator(".region-election-facts")).toContainText(/68/);
    await expect(page.locator(".spain-region-quality")).toContainText(/83 días/);

    await page.goto("/?country=es&lang=es&view=spain-region&area=asturias");
    await settle(page);
    await expect(page.locator(".spain-region-history")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: /Última encuesta publicada/i })).toBeVisible();
    await expect(page.locator(".spain-region-snapshot")).toContainText(/Una encuesta, no una media/i);

    await page.goto("/?country=es&lang=es&view=spain-region&area=andalucia");
    await settle(page);
    await expect(page.locator(".spain-region-history")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: /Sin una media continua/i })).toBeVisible();

    await page.goto("/?country=es&lang=es");
    await settle(page);

    await page.getByRole("button", { name: /Ajustes/i }).click();
    await expect(page.locator(".language-option")).toHaveCount(4);
    await expect(page.locator(".language-list")).toContainText("Deutsch");
    await expect(page.locator(".language-list")).toContainText("English");
    await expect(page.locator(".language-list")).toContainText("Español");
    await expect(page.locator(".language-more-toggle")).toHaveCount(0);
    await page.getByRole("button", { name: /Cerrar/i }).click();

    await page.locator(".spain-polling-entry").first().click();
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: /Encuestas de las elecciones generales/i })).toBeVisible();
    await expect(page.locator(".spain-results-card .result-row")).toHaveCount(5);
    await expect(page.locator(".spain-results-card .snapshot-date")).toBeHidden();
    await expect(page.locator(".spain-results-card .widget-data-age")).toContainText(/Trabajo de campo finalizado/i);
    await page.locator(".spain-results-card .graph-info-popover summary").click();
    await expect(page.locator(".spain-results-card .graph-info-card")).toContainText(/terminó su trabajo de campo el/i);
    await expect(page.locator(".spain-results-card .graph-info-card")).toContainText(/Trabajo de campo:/i);
    await page.locator(".spain-results-card .graph-info-backdrop").click({ position: { x: 5, y: 5 } });
    if (testInfo.project.name.includes("iphone") || testInfo.project.name.includes("pixel") || testInfo.project.name.includes("galaxy")) {
      await expect(page.locator(".chart-heading > div > p:not(.section-label)")).toBeHidden();
      await expect(page.locator(".tendency-heading .widget-info-heading > div > p")).toBeHidden();
    }
    await page.getByRole("button", { name: /Configurar gráfico/i }).click();
    await expect(page.locator(".customize-panel")).toBeVisible();
    await expect(page.locator(".customize-panel")).not.toContainText(/10 años|10 years|10 Jahre/i);
    await expect(page.locator(".customize-panel")).toContainText(/Desde las elecciones de 2023/i);
    await expect(page.locator(".customize-panel")).toContainText(/Archivo completo.*1996/i);
    await expect(page.locator(".spain-pulse-section")).toBeVisible();
    await expect(page.locator(".spain-change-card,.spain-race-card,.spain-agreement-card")).toHaveCount(3);
    const comparisonSwitchedByNextFrame = await page.evaluate(async () => {
      const button = [...document.querySelectorAll(".spain-period-tabs button")].find((node) => node.textContent.includes("Hace 12 meses"));
      button.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return [...document.querySelectorAll(".spain-period-tabs button")]
        .find((node) => node.textContent.includes("Hace 12 meses"))
        ?.getAttribute("aria-pressed") === "true";
    });
    expect(comparisonSwitchedByNextFrame).toBe(true);
    await expect(page.getByRole("button", { name: /Hace 12 meses/i })).toHaveAttribute("aria-pressed", "true");
    await page.locator(".spain-pulse-section").screenshot({ path: testInfo.outputPath("spain-pulse.png") });

    if (testInfo.project.name === "chromium-desktop") {
      const pngDownload = await downloadPng(page, page.locator(".chart-card .png-export-button"));
      await pngDownload.saveAs(testInfo.outputPath("spain-export.png"));
      const png = await readFile(await pngDownload.path());
      expect(png.readUInt32BE(16)).toBeGreaterThanOrEqual(3000);
      expect(png.readUInt32BE(20)).toBeGreaterThan(900);
      await expectPngHasVisibleContent(page, png);
      const insightDownload = await downloadPng(page, page.locator(".spain-pulse-heading .png-export-button"));
      await insightDownload.saveAs(testInfo.outputPath("spain-pulse-export.png"));
      const insightPng = await readFile(await insightDownload.path());
      expect(insightPng.readUInt32BE(16)).toBeGreaterThanOrEqual(3000);
      await expectPngHasVisibleContent(page, insightPng);

      await page.evaluate(() => localStorage.setItem("opinion-poll-locale", "en-GB"));
      await page.goto("/?region=spain-congress");
      await settle(page);
      await expect(page.locator(".spain-pulse-section")).toContainText("What is changing");
      await expect(page.locator(".spain-agreement-card")).toContainText("Spread between pollsters");
      await page.evaluate(() => localStorage.setItem("opinion-poll-locale", "de"));
      await page.goto("/?region=spain-congress");
      await settle(page);
      await expect(page.locator(".spain-pulse-section")).toContainText("Was sich gerade verändert");
      await expect(page.locator(".spain-agreement-card")).toContainText("Streuung zwischen Instituten");
    }
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);
    expect(errors).toEqual([]);
  });

  test("state and autonomous-community maps open their page on the first activation", async ({ page }, testInfo) => {
    await page.goto("/?view=states");
    await settle(page);
    const bavaria = page.locator('.germany-map a[href="/?region=bayern"]');
    await expect(bavaria).toBeVisible();
    if (testInfo.project.use.hasTouch) await bavaria.tap();
    else await bavaria.click();
    await expect(page).toHaveURL(/region=bayern/);
    await expect(page.getByRole("heading", { level: 1, name: /Landtagswahl/ })).toBeVisible();

    await page.goto("/?country=es&lang=es");
    await settle(page);
    const firstRegion = page.locator('.spain-map-svg a[href*="view=spain-region"]').first();
    const href = await firstRegion.getAttribute("href");
    if (testInfo.project.use.hasTouch) await firstRegion.tap();
    else await firstRegion.click();
    await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/^\//, "")));
    await expect(page.locator(".spain-region-page")).toBeVisible();

    await page.goto("/?country=uk&lang=en-GB");
    await settle(page);
    const ukArea = page.locator('.uk-map-visual path[id]:not([id^="Ireland-"])').first();
    await expect(ukArea).toBeVisible();
    if (testInfo.project.use.hasTouch) await ukArea.tap();
    else await ukArea.click();
    await expect(page.locator(".uk-map-detail")).not.toContainText("No area selected");
  });

  test("UK overview and Westminster detail use a distinct, responsive product flow", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    await page.goto("/?view=countries");
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: /Select a country|Land auswählen/i })).toBeVisible();
    await expect(page.locator(".country-index-grid .overview-classic-widget")).toHaveCount(3);
    if (await page.getByRole("heading", { level: 1, name: "Land auswählen" }).isVisible().catch(() => false)) {
      await expect(page.locator(".country-index-grid")).toContainText("Vereinigtes Königreich");
      await expect(page.locator(".country-index-grid")).toContainText("Spanien");
    }
    await page.getByRole("link", { name: /United Kingdom|Vereinigtes Königreich/i }).click();
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: /United Kingdom at a glance|Vereinigtes Königreich im Überblick/i })).toBeVisible();
    await expect(page.locator('.site-header .brand')).toHaveAttribute("href", "/?country=uk");
    await expect(page.locator(".header-country-menu")).toBeVisible();
    await expect(page.locator(".overview-entry-stack .overview-classic-widget")).toHaveCount(2);
    await expect(page.locator(".overview-profile-badge")).toHaveCount(0);
    await expect(page.locator(".uk-devolution")).toHaveCount(0);
    await expect(page.locator(".uk-issues-widget")).toHaveCount(0);
    await expect(page.locator(".uk-issues-card-link")).toHaveCount(0);
    await expect(page.locator(".uk-map-visual svg")).toBeVisible();
    await expect(page.locator(".uk-map-visual svg > .uk-map-active-overlay")).toHaveCount(0);
    await expect(page.locator(".uk-map-detail")).toContainText(/No area selected|Keine Region ausgewählt/);
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

    await page.goto("/?country=uk&view=uk-issues");
    await settle(page);
    await expect(page).toHaveURL(/country=uk(?!.*view=uk-issues)/);
    await expect(page.getByRole("heading", { level: 1, name: /United Kingdom at a glance|Vereinigtes Königreich im Überblick/i })).toBeVisible();
    await expect(page.locator(".uk-issues-full-ranking,.uk-economy-perception")).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://de.pollframe.workers.dev/?country=uk");
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);

    await page.goto("/?country=uk");
    await settle(page);

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
      const pngDownload = await downloadPng(page, page.locator(".chart-actions .png-export-button"));
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
    const customStart = page.locator('.custom-date-slider input[type="range"]').first();
    const startDateCard = page.locator(".custom-date-values strong").first();
    const chartLine = page.locator(".average-series-line").first();
    const lineBeforeDrag = await chartLine.getAttribute("d");
    const dateBeforeDrag = await startDateCard.textContent();
    await customStart.evaluate(async (input) => {
      const target = Math.max(Number(input.min), Math.round(Number(input.max) * .25));
      input.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, String(target));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    // The date changing within the two frames above, while the expensive chart
    // path remains unchanged until release, is the behaviour users need. Wall
    // time is not asserted because a shared CI process can be suspended between
    // otherwise consecutive animation frames.
    await expect(startDateCard).not.toHaveText(dateBeforeDrag);
    expect(await chartLine.getAttribute("d")).toBe(lineBeforeDrag);
    await customStart.dispatchEvent("pointerup", { pointerId: 1, pointerType: "mouse" });
    await expect.poll(() => chartLine.getAttribute("d")).not.toBe(lineBeforeDrag);
    await page.locator(".custom-date-slider").screenshot({ path: testInfo.outputPath("custom-date-slider.png") });
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);
    await page.screenshot({ path: testInfo.outputPath("uk-westminster.png"), fullPage: false });
    expect(errors).toEqual([]);
  });

  test("party labels open neutral sourced profiles without shifting the page", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    await page.goto("/?region=bundestag");
    await page.evaluate(() => localStorage.setItem("opinion-poll-locale", "en-GB"));
    await page.reload();
    await settle(page);
    const spd = page.locator('[data-party-profile="de:spd"]').first();
    await expect(spd).toBeVisible();
    const before = await page.locator("main").evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { left: Math.round(rect.left * 10) / 10, width: Math.round(rect.width * 10) / 10 };
    });
    await spd.click();
    await expect(page.locator(".party-profile-modal")).toBeVisible();
    await expect(page.locator(".party-profile-modal")).toContainText("Sozialdemokratische Partei Deutschlands");
    await expect(page.locator(".party-profile-overview")).toContainText(/General position|Allgemeine Einordnung/);
    await expect(page.locator(".party-profile-overview")).toContainText(/centre-left|Mitte-links/i);
    await expect(page.locator(".party-profile-policies li")).toHaveCount(4);
    await expect(page.locator(".party-profile-sources a")).toHaveCount(2);
    expect(await page.locator(".party-profile-sources a").evaluateAll((links) => links.every((link) => link.href.startsWith("https://")))).toBe(true);
    const after = await page.locator("main").evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { left: Math.round(rect.left * 10) / 10, width: Math.round(rect.width * 10) / 10 };
    });
    expect(after).toEqual(before);
    await page.locator(".party-profile-modal").screenshot({ path: testInfo.outputPath("party-profile-spd.png") });
    await page.keyboard.press("Escape");
    await expect(page.locator(".party-profile-modal")).toHaveCount(0);
    await expect(spd).toBeFocused();

    await page.goto("/?country=uk");
    await settle(page);
    const labour = page.locator('[data-party-profile="uk:labour"]').first();
    await expect(labour).toBeVisible();
    await labour.click();
    await expect(page.locator(".party-profile-modal")).toContainText("Labour Party");
    await expect(page.locator(".party-profile-modal")).toContainText(/Policy priorities|Politische Schwerpunkte/);
    await page.locator(".party-profile-modal .icon-button").click();

    await page.goto("/?country=es");
    await settle(page);
    const psoe = page.locator('[data-party-profile="es:psoe"]').first();
    await expect(psoe).toBeVisible();
    await psoe.click();
    await expect(page.locator(".party-profile-modal")).toContainText("Partido Socialista Obrero Español");
    await expect(page.locator(".party-profile-sources a")).toHaveCount(2);

    await page.goto("/?country=es&view=spain-region&area=madrid");
    await settle(page);
    const masMadrid = page.locator('[data-party-profile="es:mas-madrid"]').first();
    await expect(masMadrid).toBeVisible();
    await masMadrid.click();
    await expect(page.locator(".party-profile-modal")).toContainText("Más Madrid");
    await expect(page.locator(".party-profile-modal")).toContainText(/not yet published|noch keine|aún no ha publicado/i);
    await expect(page.locator(".party-profile-sources a")).toHaveCount(1);
    await expectDocumentFits(page);
    expect(errors).toEqual([]);
  });

  test("an explicitly selected German interface language survives country changes", async ({ page }) => {
    const errors = watchRuntime(page);
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("opinion-poll-locale", "de"));
    await page.reload();
    await settle(page);
    await page.getByRole("button", { name: "Land auswählen" }).click();
    await page.getByRole("link", { name: /Spanien.*Kongress/i }).click();
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: "Spanien im Überblick" })).toBeVisible();
    await page.getByRole("button", { name: "Land auswählen" }).click();
    await page.getByRole("link", { name: /Vereinigtes Königreich.*Westminster/i }).click();
    await settle(page);
    await expect(page.getByRole("heading", { level: 1, name: "Vereinigtes Königreich im Überblick" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("since-last-visit is not shown as a separate overview widget", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await expect(page.locator(".since-visit")).toHaveCount(0);
    await page.evaluate(() => {
      localStorage.setItem("pollframe-last-snapshot-de", JSON.stringify({ date: "2026-08-01", results: { "7": 1 } }));
    });
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
    await page.getByRole("button", { name: /Watchlist-Eintrag hinzufügen|Add Watchlist item|Hinzufügen$/i }).click();
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

  test("dropdowns close outside, event links adapt to the device and the timeline stays controlled", async ({ page, context }, testInfo) => {
    await page.goto("/?region=bundestag");
    await settle(page);
    if (testInfo.project.use.hasTouch) {
      const countryButton = page.getByRole("button", { name: /Land auswählen|Select country/i });
      const settingsButton = page.getByRole("button", { name: /Einstellungen|Settings/i });
      await countryButton.click();
      await expect(page.locator("#header-country-popover")).toBeVisible();
      await settingsButton.click();
      await expect(page.locator("#header-country-popover")).toHaveCount(0);
      await expect(page.locator(".side-panel")).toHaveCount(0);
      await settingsButton.click();
      await expect(page.locator(".side-panel")).toBeVisible();
      await page.locator(".side-panel .icon-button").click();
    }
    await page.getByRole("button", { name: /Diagramm anpassen|Customise chart/i }).click();
    const display = page.locator(".customize-panel .select-control").first();
    await display.locator("summary").click();
    await expect(display).toHaveAttribute("open", "");
    const neighbouringControl = page.locator(".customize-panel .select-control").nth(1);
    await neighbouringControl.locator("summary").click();
    await expect(display).not.toHaveAttribute("open", "");
    if (testInfo.project.use.hasTouch) {
      await expect(neighbouringControl).not.toHaveAttribute("open", "");
      await neighbouringControl.locator("summary").click();
    }
    await expect(neighbouringControl).toHaveAttribute("open", "");
    if (testInfo.project.use.hasTouch) await page.touchscreen.tap(8, 200);
    else await page.locator(".chart-heading h2").click();
    await expect(neighbouringControl).not.toHaveAttribute("open", "");
    const pollsterMenu = page.locator(".customize-panel .multi-select").first();
    await pollsterMenu.locator("summary").click();
    const menu = pollsterMenu.locator(".multi-menu");
    await expect(menu).toBeVisible();
    await expect(menu).toHaveCSS("overscroll-behavior-y", "contain");
    if (!testInfo.project.use.hasTouch) {
      await menu.hover();
      const pageScrollBefore = await page.evaluate(() => scrollY);
      // Dispatch to the menu itself so this checks Pollframe's wheel containment
      // rather than the CI browser's occasionally stale pointer hit-test.
      await menu.dispatchEvent("wheel", { deltaY: 500, deltaMode: 0 });
      await expect.poll(() => menu.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
      expect(await page.evaluate(() => scrollY)).toBe(pageScrollBefore);
    }
    if (testInfo.project.use.hasTouch) await page.touchscreen.tap(8, 200);
    else await page.locator(".chart-heading h2").click();
    await expect(pollsterMenu).not.toHaveAttribute("open", "");
    await expect(page.locator(".customize-panel .multi-select")).toHaveCount(2);
    await page.locator(".customize-panel .select-control").nth(1).locator("summary").click();
    await page.getByRole("button", { name: /Eigener Zeitraum|Custom dates/i }).click();
    await expect(page.locator(".custom-date-slider input[type=range]")).toHaveCount(2);
    await expect(page.locator(".dual-range-ticks span")).toHaveCount(5);
    await expect(page.locator(".poll-chart > title, .event-marker title")).toHaveCount(0);
    const eventLayout = await page.locator(".poll-chart").evaluate((chart) => ({
      labels: chart.querySelectorAll(".event-label-bg").length,
      dates: chart.querySelectorAll(".event-label-date").length,
      truncated: [...chart.querySelectorAll(".event-label-text")].some((label) => label.textContent.includes("…")),
      lanes: new Set([...chart.querySelectorAll(".event-label-bg")].map((label) => label.getAttribute("y"))).size,
      contextLines: [...chart.querySelectorAll(".event-context-line")].map((line) => ({ y1: Number(line.getAttribute("y1")), y2: Number(line.getAttribute("y2")) })),
      anchors: chart.querySelectorAll(".event-anchor").length,
    }));
    expect(eventLayout.labels).toBeLessThanOrEqual(13);
    expect(eventLayout.dates).toBe(0);
    expect(eventLayout.truncated).toBe(false);
    expect(eventLayout.lanes).toBeLessThanOrEqual(2);
    expect(eventLayout.contextLines.length).toBe(eventLayout.labels);
    expect(eventLayout.contextLines.every((line) => line.y1 < line.y2 && line.y2 - line.y1 > 250)).toBe(true);
    expect(eventLayout.anchors).toBeGreaterThan(0);
    expect(eventLayout.anchors).toBeLessThanOrEqual(20);
    const chartEventCount = await page.locator(".event-marker").count()
      + await page.locator(".interactive-event-layer .event-dot").count()
      + await page.locator(".historical-election-marker").count();
    await expect(page.locator(".event-key-item")).toHaveCount(chartEventCount);
    await expect(page.locator(".event-dot-tick")).toHaveCount(0);
    expect(await page.locator(".event-dot-hit").first().getAttribute("r").then(Number)).toBeGreaterThanOrEqual(14);
    await expect(page.locator(".historical-election-marker .election-bottom-label").first()).toBeVisible();
    const chartInfo = page.locator(".chart-title-row .graph-info-popover");
    const chartInfoOrder = await page.locator(".chart-title-row").evaluate((heading) => {
      const iconBox = heading.querySelector(".graph-info-popover summary").getBoundingClientRect();
      const titleBox = heading.querySelector("h2").getBoundingClientRect();
      return { iconRight: iconBox.right, titleLeft: titleBox.left };
    });
    expect(chartInfoOrder.titleLeft).toBeGreaterThan(chartInfoOrder.iconRight);
    await chartInfo.locator("summary").click();
    await expect(chartInfo.locator(".graph-info-card")).toContainText(/keine Wahlprognose|not an election forecast/i);
    await chartInfo.locator(".graph-info-backdrop").click({ position: { x: 5, y: 5 } });
    await expect(chartInfo).not.toHaveAttribute("open", "");
    if (testInfo.project.use.hasTouch) {
      await expect(page.locator(".event-marker.inspect-only")).not.toHaveCount(0);
      await page.locator(".event-marker .event-label-bg").last().click({ force: true });
      await expect(page.locator(".event-hover-card")).toBeVisible();
      expect(context.pages()).toHaveLength(1);
      await page.locator(".event-key summary").click();
      const popupPromise = page.waitForEvent("popup");
      await page.locator(".event-key-item").last().click();
      const popup = await popupPromise;
      expect(new URL(popup.url()).protocol).toMatch(/^https?:$/);
      await popup.close();
    } else {
      await expect(page.locator(".event-marker .event-hit-target").first()).toHaveCSS("pointer-events", "none");
      const popupPromise = page.waitForEvent("popup");
      await page.locator(".event-marker .event-label-bg").last().click({ force: true });
      const popup = await popupPromise;
      expect(new URL(popup.url()).protocol).toMatch(/^https?:$/);
      await popup.close();
    }
    expect(context.pages()).toHaveLength(1);
  });

  test("the full UK archive keeps every election and reserves both early event lanes", async ({ page }, testInfo) => {
    await page.goto("/?region=uk-westminster&range=all&share=1&lang=en-GB");
    await settle(page);
    const chart = page.locator(".poll-chart").first();
    await expect(chart.locator(".historical-election-marker")).toHaveCount(22);
    expect(await chart.locator(".election-bottom-label").count()).toBeGreaterThanOrEqual(16);
    const electionRows = await chart.locator(".election-bottom-label text").evaluateAll((labels) => new Set(labels.map((label) => label.getAttribute("y"))).size);
    expect(electionRows).toBe(2);
    const eventLabels = (await chart.locator(".event-label-text").allTextContents()).join(" ");
    expect(eventLabels).toMatch(/D-Day/);
    expect(eventLabels).toMatch(/VE Day/);
    await expect(chart.locator(".event-dot-tick")).toHaveCount(0);
    await page.locator(".chart-card").screenshot({ path: testInfo.outputPath("uk-full-archive-events.png") });

    await page.goto("/?region=uk-westminster&lang=en-GB");
    await settle(page);
    await page.getByRole("button", { name: /Customise chart/i }).click();
    const rangeControl = page.locator(".customize-panel .select-control").nth(1);
    await rangeControl.locator("summary").click();
    await rangeControl.getByRole("button", { name: /Full archive/i }).click();
    await expect(page.locator('.event-dot[aria-label*="National Health Service"]')).toHaveCount(1);
    expect(Number(await page.locator('.event-dot[aria-label*="National Health Service"] .event-dot-hit').getAttribute("r"))).toBeGreaterThanOrEqual(14);
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
      if (url.pathname === "/postcodes/SK176BE") {
        await route.fulfill({ status: 200, headers, body: JSON.stringify({ status: 200, result: { postcode: "SK17 6BE", parliamentary_constituency_2024: "High Peak" } }) });
      } else if (url.pathname === "/postcodes/SK176ZZ") {
        await route.fulfill({ status: 200, headers, body: JSON.stringify({ status: 404, result: null }) });
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
    expect(lookupRequests.some((url) => new URL(url).pathname === "/postcodes/SK176BE")).toBeTruthy();
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
    await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(6);
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

    await page.route("**/api/bug-reports**", async (route) => {
      if (route.request().method() === "POST") return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, id: "test-report" }) });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ reports: [{ id: "test-report", type: "visual", message: "A label overlaps", page: "http://127.0.0.1:4174/?view=approval&country=uk", locale: "en-GB", viewport: "390×844", userAgent: "Test browser", createdAt: "2026-08-16T10:00:00.000Z", status: "new" }], stats: { total: 1, typeCounts: { visual: 1 }, statusCounts: { new: 1 }, dayCounts: { "2026-08-16": 1 } } }) });
    });
    await page.goto(`/?page=bug-report&from=${encodeURIComponent("http://127.0.0.1:4174/?view=approval&country=uk")}`);
    await settle(page);
    await expect(page.getByRole("heading", { name: /Was ist dir aufgefallen|What did you notice/i })).toBeVisible();
    await expect(page.locator(".header-report-button")).toHaveCount(0);
    await expect(page.getByRole("radio")).toHaveCount(6);
    await expect(page.getByText(/Beschreibung ist optional|description is optional/i)).toBeVisible();
    await page.getByRole("radio", { name: /Darstellung|Display/i }).click();
    await page.getByRole("button", { name: /Meldung senden|Send report/i }).click();
    await expect(page.getByRole("status")).toContainText(/Danke|Thanks/i);
    await expect(page.locator(".bug-contact-separate")).toHaveCount(0);

    await page.goto("/?page=bug-reports");
    await settle(page);
    await expect(page.getByLabel("Dashboard key")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: /Deutschland im Überblick|Germany at a glance/i })).toBeVisible();

    await page.goto("/pf-ops/3f592c524cff69071b258ce63776e793/reports");
    await settle(page);
    await page.getByLabel("Dashboard key").fill("test-key");
    await page.getByRole("button", { name: "Open dashboard" }).click();
    await expect(page.getByRole("heading", { name: "Bug reports" })).toBeVisible();
    await expect(page.locator(".bug-stats:not(.analytics-stats)")).toContainText("1");
    await expect(page.locator(".bug-report-list")).toContainText("A label overlaps");
    const bugExportPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export JSON" }).click();
    const bugExport = await bugExportPromise;
    expect(bugExport.suggestedFilename()).toMatch(/^pollframe-bug-reports-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(await readFile(await bugExport.path(), "utf8")).reports).toHaveLength(1);

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
    await expect(page.getByText(/Rechtestatus|Rights status/)).toBeVisible();
    await expect(page.locator(".placeholder-warning")).toHaveCount(0);
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);

    await page.goto("/?page=redaktion");
    await settle(page);
    await expect(page.getByRole("heading", { name: /Redaktionelle Standards|Editorial standards/i, level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Ereignisse im historischen Kontext|Events as historical context/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Öffentliches Änderungsprotokoll|Public change log/i })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://de.pollframe.workers.dev/?page=redaktion");
    await expectDocumentFits(page);
    await expectNoBrokenVisibleText(page);
    expect(errors).toEqual([]);
  });

  test("chart and map embeds remain self-contained and responsive", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    await page.goto("/embed.html?embed=1&region=bundestag&lang=de&theme=light&range=ten&mode=both&parties=1,2,4,5,7&pollsters=1,2,3,5,6,9,13,17&events=national");
    await settle(page);
    await expect(page.locator(".embed-page .poll-chart")).toBeVisible();
    await expect(page.locator(".embed-page .interactive-event-layer")).toHaveCount(0);
    await expect(page.locator(".embed-page .historical-election-marker")).not.toHaveCount(0);
    await expect(page.locator(".embed-footer .data-attribution")).toContainText("Bundeswahlleiterin");
    await expect(page.getByRole("link", { name: /Interaktiv öffnen|Open interactive/i })).toHaveAttribute("href", /share=1.*mode=both.*pollsters=1%2C2%2C3%2C5%2C6%2C9%2C13/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expectDocumentFits(page);
    await page.screenshot({ path: testInfo.outputPath("chart-embed.png"), fullPage: true });

    await page.goto("/embed.html?embed=1&view=map&lang=de&theme=light&mapMode=leader&mapParty=union");
    await settle(page);
    await expect(page.locator(".map-embed-page .polling-map")).toBeVisible();
    await expect(page.locator(".embed-footer .data-attribution")).toContainText("CC BY 4.0");
    await expect(page.getByRole("link", { name: /Interaktiv öffnen|Open interactive/i })).toHaveAttribute("href", /view=map.*mapMode=leader.*mapParty=union/);
    await expectDocumentFits(page);
    await page.screenshot({ path: testInfo.outputPath("map-embed.png"), fullPage: true });
    expect(errors).toEqual([]);
  });

  test("approval events stay balanced, colour-coded and readable in the default dark ten-year view", async ({ page }, testInfo) => {
    await page.addInitScript(() => localStorage.setItem("opinion-poll-theme", "dark"));
    await page.goto("/?view=approval&compare=0&metric=government&range=ten&display=trend&answers=positive&events=1&eventMode=key&eventCats=national%2Cgermany%2Ceurope%2Ccontroversy%2Cglobal&lang=en-GB&country=de");
    await settle(page);
    const markers = page.locator(".approval-event-marker-original");
    await expect(markers).not.toHaveCount(0);
    const markerCount = await markers.count();
    expect(markerCount).toBeGreaterThanOrEqual(3);
    expect(markerCount).toBeLessThanOrEqual(11);
    const priorityLabels = (await page.locator(".approval-event-marker-original .event-label-text").allTextContents()).join(" ");
    expect(priorityLabels).toMatch(/COVID-19 pandemic/i);
    expect(priorityLabels).toMatch(/Invasion of Ukraine/i);
    await expect(page.locator(".approval-event-marker-original .event-label-date")).toHaveCount(0);
    expect((await page.locator(".approval-event-marker-original .event-label-text").allTextContents()).some((label) => label.includes("…"))).toBe(false);
    expect(await page.locator(".approval-main-chart .historical-election-marker").count()).toBeGreaterThanOrEqual(2);
    expect(await page.locator(".approval-main-chart .interactive-event-layer .event-dot").count()).toBeGreaterThan(0);
    const representedEvents = markerCount
      + await page.locator(".approval-main-chart .interactive-event-layer .event-dot").count()
      + await page.locator(".approval-main-chart .historical-election-marker").count();
    await expect(page.locator(".approval-main-chart .event-key-item")).toHaveCount(representedEvents);
    const geometry = await markers.evaluateAll((items) => ({
      lanes: new Set(items.map((item) => item.querySelector(".event-label-bg").getAttribute("y"))).size,
      lineStrokes: new Set(items.map((item) => getComputedStyle(item.querySelector(".approval-event-context-line")).stroke)).size,
      textFills: new Set(items.map((item) => getComputedStyle(item.querySelector(".event-label-text")).fill)).size,
    }));
    expect(geometry.lanes).toBeLessThanOrEqual(2);
    expect(geometry.lineStrokes).toBeGreaterThanOrEqual(2);
    expect(geometry.textFills).toBeGreaterThanOrEqual(2);
    await page.locator(".approval-main-chart").screenshot({ path: testInfo.outputPath("approval-calm-dark-events.png") });

    await page.goto("/?view=approval&compare=0&metric=government&range=ten&display=trend&answers=positive&events=1&eventMode=key&eventCats=national%2Cgermany%2Ceurope%2Ccontroversy%2Cglobal&lang=en-GB&country=de&share=1");
    await settle(page);
    await expect(page.locator(".approval-main-chart .interactive-event-layer")).toHaveCount(0);
    await expect(page.locator(".approval-main-chart .historical-election-marker")).not.toHaveCount(0);
  });

  test("approval workbench supports journalist customisation, exact embed preview and real exports", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    await page.goto("/?view=approval&country=de&compare=1&lang=en-GB&metric=leader&range=all&display=trend&answers=positive&events=1");
    await settle(page);
    await expect(page.getByRole("heading", { name: /How satisfied is Germany with its government and Chancellor/ })).toBeVisible();
    await expect(page.locator(".approval-question")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Compare DE · UK" })).toHaveCount(0);
    expect(await page.locator(".approval-series .series-line").count()).toBeGreaterThanOrEqual(3);
    await expect(page.locator(".approval-line-legend span:not(.axis-range-note)")).toHaveCount(3);
    expect(await page.locator(".approval-term-marker").count()).toBeGreaterThanOrEqual(2);
    const segmentKeys = await page.locator(".approval-series").evaluateAll((groups) => groups.map((group) => `${group.dataset.country}:${group.dataset.term}:${group.dataset.answer}`));
    expect(new Set(segmentKeys).size).toBe(segmentKeys.length);
    await expect(page.locator(".approval-insight-grid")).toHaveCount(0);

    const keyMarkerCount = await page.locator(".approval-event-marker-original").count();
    expect(keyMarkerCount).toBeGreaterThanOrEqual(3);
    await expect(page.locator(".approval-event-marker-original .event-label-text")).toHaveCount(keyMarkerCount);
    await expect(page.locator(".approval-event-marker-original .event-label-date")).toHaveCount(0);
    await expect(page.locator(".approval-event-marker-original .event-date-chip")).toHaveCount(0);
    expect(await page.locator(".approval-event-marker-original .event-label-text").allTextContents()).not.toEqual(expect.arrayContaining([expect.stringContaining("…")]));
    const editorialLabels = (await page.locator(".approval-event-marker-original .event-label-text").allTextContents()).join(" ");
    expect(editorialLabels).toMatch(/Financial (?:crisis|rescue package)/i);
    expect(editorialLabels).toMatch(/COVID-19 pandemic/i);
    expect(editorialLabels).toMatch(/Invasion of Ukraine/i);
    expect(editorialLabels).not.toMatch(/Welfare revisions/i);
    await expect(page.locator(".approval-poll-chart")).toHaveCSS("cursor", "default");
    const eventLineGeometry = await page.locator(".approval-event-context-line").evaluateAll((lines) => lines.map((line) => ({ y1: Number(line.getAttribute("y1")), y2: Number(line.getAttribute("y2")) })));
    expect(eventLineGeometry.every((line) => line.y1 < line.y2 && line.y2 - line.y1 > 300)).toBe(true);
    expect(await page.locator(".historical-election-marker>line").evaluateAll((lines) => lines.every((line) => line.getAttribute("x1") === line.getAttribute("x2")))).toBe(true);
    await expect(page.locator(".approval-event-rail-row,.approval-event-cluster")).toHaveCount(0);
    const eventLabelGeometry = await page.locator(".approval-event-marker-original").evaluateAll((markers) => markers.map((marker) => {
      const label = marker.querySelector(".event-label-text").getBoundingClientRect();
      const pill = marker.querySelector(".event-label-bg").getBoundingClientRect();
      return { inside: label.left >= pill.left - 1 && label.right <= pill.right + 1 && label.top >= pill.top - 1 && label.bottom <= pill.bottom + 1, pill: { left: pill.left, right: pill.right, top: pill.top, bottom: pill.bottom } };
    }));
    expect(eventLabelGeometry.every((item) => item.inside)).toBe(true);
    expect(eventLabelGeometry.every((item, index, all) => all.slice(index + 1).every((other) => item.pill.right <= other.pill.left || other.pill.right <= item.pill.left || item.pill.bottom <= other.pill.top || other.pill.bottom <= item.pill.top))).toBe(true);
    const termLengths = await page.locator(".approval-term-marker .term-marker-tick").evaluateAll((lines) => lines.map((line) => Number(line.getAttribute("y2")) - Number(line.getAttribute("y1"))));
    expect(termLengths.every((length) => length > 0 && length <= 24)).toBe(true);
    await page.locator(".approval-event-marker-original .event-label-bg").first().hover();
    await expect(page.locator(".approval-event-card")).toBeVisible();
    await expect(page.locator(".approval-svg-tooltip")).toHaveCount(0);
    expect(parseFloat(await page.locator(".approval-event-marker-original .event-label-text").first().evaluate((node) => getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(10);
    await page.locator(".approval-main-chart").screenshot({ path: testInfo.outputPath("approval-readable-events.png") });
    await page.locator(".approval-event-marker-original .event-label-bg").first().click();
    await expect(page.locator(".approval-event-card .event-card-source")).toHaveAttribute("href", /^https:\/\//);
    await expect(page.locator(".approval-event-card footer")).toHaveCount(0);
    await page.locator(".approval-main-chart").screenshot({ path: testInfo.outputPath("approval-standard-event-card.png") });
    await page.locator(".approval-poll-chart .grid-line").last().click({ force: true });
    await expect(page.locator(".approval-event-card")).toHaveCount(0);

    await page.getByRole("button", { name: "Customise chart" }).click();
    await expect(page.locator(".approval-customize-panel .select-control").filter({ hasText: "Events" })).toHaveCount(0);
    await expect(page.locator(".approval-customize-panel .multi-select")).toHaveCount(1);
    await expect(page.locator(".approval-event-marker-original .event-label-text")).toHaveCount(keyMarkerCount);
    await expect(page.locator(".historical-election-marker .election-bottom-label").first()).toBeVisible();
    const answerMode = page.locator(".approval-customize-panel .select-control").filter({ hasText: "Answers" });
    await answerMode.locator("summary").click();
    await answerMode.getByRole("button", { name: "Dissatisfied / negative" }).click();
    await expect(page.locator(".approval-series.answer-negative").first()).toBeVisible();
    await expect(page.locator(".approval-series.answer-positive")).toHaveCount(0);
    await answerMode.locator("summary").click();
    await answerMode.getByRole("button", { name: "Satisfied / positive" }).click();
    await answerMode.locator("summary").click();
    await answerMode.getByRole("button", { name: "Net rating" }).click();
    await expect(page.locator(".approval-series.answer-net").first()).toBeVisible();
    await expect(page.locator(".approval-poll-chart .zero-line")).toHaveCount(1);
    await expect(page.locator(".approval-line-legend .axis-range-note")).toContainText("pp");
    await page.getByRole("button", { name: "Customise chart" }).click();

    await page.locator(".approval-info > summary").click();
    await expect(page.locator(".approval-info-card")).toContainText("Original question");
    await expect(page.locator(".approval-info-card h2,.approval-info-card h3,.approval-info-card blockquote,.approval-info-card section")).toHaveCount(0);
    await expect(page.locator(".approval-info-card .approval-info-prose")).toHaveCount(1);
    await page.locator(".approval-info-card").screenshot({ path: testInfo.outputPath("approval-info-prose.png") });
    await page.locator(".approval-info-card header button").click();

    await page.getByRole("button", { name: "Share & embed" }).click();
    const preview = page.frameLocator(".approval-embed-preview iframe");
    await expect(preview.getByRole("heading", { name: /Chancellor: Satisfaction over time/ })).toBeVisible();
    await expect(preview.locator(".approval-series .series-line").first()).toBeVisible();
    await expect(preview.locator(".interactive-event-layer")).toHaveCount(0);
    await expect(preview.locator(".historical-election-marker")).not.toHaveCount(0);
    await expect(page.locator(".approval-embed-preview iframe")).toHaveAttribute("src", /country=de.*compare=0.*metric=leader.*range=all.*display=trend.*answers=net/);
    await expect(page.locator(".approval-embed-preview iframe")).not.toHaveAttribute("src", /country=es/);
    await expect(page.locator(".approval-embed-preview")).toHaveCSS("overflow-y", "auto");
    expect(await page.locator(".approval-embed-preview").evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
    await expect(page.locator(".approval-embed-preview iframe")).toHaveCSS("pointer-events", "none");

    const png = await downloadPng(page, page.locator(".approval-share-actions").getByRole("button", { name: "Export PNG", exact: true }), "landscape");
    await expectPngHasVisibleContent(page, (await readFile(await png.path())).toString("base64"));

    const csvDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download CSV" }).click();
    const csv = await csvDownload;
    expect((await readFile(await csv.path(), "utf8")).split("\n").length).toBeGreaterThan(100);
    await page.screenshot({ path: testInfo.outputPath("approval-share-preview.png"), fullPage: true });
    expect(errors).toEqual([]);
  });

  test("approval embed is self-contained, configurable and excluded from indexing", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    await page.goto("/embed.html?view=approval&country=de&compare=1&lang=de&metric=government&range=ten&display=both&answers=positive,negative&events=1&theme=dark");
    await settle(page);
    await expect(page.locator(".approval-page.is-embed .approval-poll-chart")).toBeVisible();
    await expect(page.locator(".approval-line-legend span:not(.axis-range-note)")).toHaveCount(3);
    await expect(page.locator(".approval-average-point").first()).toBeVisible();
    await expect(page.locator(".approval-embed-footer")).toContainText("POLLFRAME");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.locator(".approval-main-chart").screenshot({ path: testInfo.outputPath("approval-dark-embed.png") });
    await expectDocumentFits(page);
    expect(errors).toEqual([]);
  });

  test("withheld UK approval URLs fall back to the cleared German series", async ({ page }) => {
    const errors = watchRuntime(page);
    await page.goto("/?view=approval&country=uk&lang=en-GB");
    await settle(page);
    await expect(page).toHaveURL(/view=approval.*country=de/);
    await expect(page.getByRole("heading", { name: /How satisfied is Germany/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Compare DE · UK" })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("journalist snapshot modules have exact responsive embeds", async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    await page.goto("/?region=bundestag&lang=de");
    await settle(page);
    const shareButton = page.getByRole("button", { name: /Teilen.*Letzte Umfrage/i });
    await shareButton.click();
    await expect(page.locator(".widget-share-modal")).toBeVisible();
    const embedSectionOverlaps = await page.locator(".widget-share-modal").evaluate((root) => {
      const selectors = [".panel-header", ".embed-options", ".embed-preview-toolbar", ".static-embed-preview", ".embed-actions"];
      const rectangles = selectors.map((selector) => ({ selector, rect: root.querySelector(`:scope > ${selector}`)?.getBoundingClientRect() })).filter((item) => item.rect?.width && item.rect?.height);
      const collisions = [];
      for (let left = 0; left < rectangles.length; left += 1) for (let right = left + 1; right < rectangles.length; right += 1) {
        const a = rectangles[left]; const b = rectangles[right];
        const x = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left));
        const y = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top));
        if (x > 2 && y > 2) collisions.push(`${a.selector}/${b.selector}:${Math.round(x)}x${Math.round(y)}`);
      }
      return collisions;
    });
    expect(embedSectionOverlaps).toEqual([]);
    await expect(page.locator(".widget-embed-preview iframe")).toHaveAttribute("src", /widget=current-average/);
    await expect(page.locator(".widget-embed-preview iframe")).toHaveAttribute("src", /pollsters=/);
    await expect(page.locator(".code-label code")).toContainText("&amp;");
    await page.getByRole("button", { name: /Handy|Phone/i }).click();
    expect(await page.locator(".widget-embed-preview").evaluate((node) => Math.round(node.getBoundingClientRect().width))).toBeLessThanOrEqual(390);
    await expect(page.locator(".widget-share-modal").getByRole("link", { name: /Problem melden|Report issue/i })).toHaveAttribute("href", /page=bug-report.*from=/);
    await page.keyboard.press("Escape");
    await expect(page.locator(".widget-share-modal")).toHaveCount(0);
    await expect(shareButton).toBeFocused();

    const snapshotDownload = await downloadPng(page, page.locator(".results-card").getByRole("button", { name: /PNG exportieren|Export PNG/i }));
    const snapshotPng = await readFile(await snapshotDownload.path());
    await snapshotDownload.saveAs(testInfo.outputPath("current-average-export.png"));
    expect(snapshotPng.readUInt32BE(16)).toBeGreaterThanOrEqual(3000);
    expect(snapshotPng.readUInt32BE(20)).toBeGreaterThan(900);
    await expectPngHasVisibleContent(page, snapshotPng);

    await page.goto("/embed.html?embed=1&widget=current-average&region=bundestag&lang=de&theme=dark");
    await settle(page);
    await expect(page.locator(".widget-embed-current-average .results-card")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expectDocumentFits(page);

    await page.goto("/embed.html?embed=1&widget=current-average&region=bundestag&lang=de&theme=dark&pollsters=1,2");
    await settle(page);
    await expect(page.locator(".widget-embed-current-average .results-card")).toContainText("Letzte Umfrage");
    await expect(page.locator(".widget-embed-current-average .results-card")).not.toContainText("Mittel aus");
    await expect(page.getByRole("link", { name: /Interaktiv öffnen|Open interactive/i })).toHaveAttribute("href", /share=1.*pollsters=1%2C2/);

    await page.goto("/embed.html?embed=1&widget=modelled-seats&region=bundestag&lang=de&theme=light");
    await settle(page);
    await expect(page.locator(".widget-embed-modelled-seats .projection-section")).toBeVisible();
    await expect(page.locator(".projection-summary")).not.toContainText("Unterhalb der 5-%-Hürde");
    await expect(page.locator(".threshold-box")).toContainText("Größere erfasste Parteien ohne Sitze");
    await expectDocumentFits(page);

    await page.goto("/embed.html?embed=1&widget=tendencies&region=uk-westminster&lang=en-GB&theme=dark");
    await settle(page);
    await expect(page.locator(".widget-embed-tendencies .tendency-card")).toHaveCount(8);
    await expectDocumentFits(page);
    expect(errors).toEqual([]);
  });

  test("recommended embed heights contain every publishing product at phone and article widths", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "one deterministic Chromium matrix is sufficient");
    const cases = [
      ["historical chart", 760, "/embed.html?embed=1&region=bundestag&range=all&mode=trend&parties=7,1,4,2,5&pollsters=1,2,3,5,6,9,13,17&events=national&lang=de&theme=light"],
      ["current average", 620, "/embed.html?embed=1&widget=current-average&region=bundestag&lang=de&theme=light"],
      ["tendencies", 1216, "/embed.html?embed=1&widget=tendencies&region=bundestag&lang=de&theme=light"],
      ["modelled seats", 1272, "/embed.html?embed=1&widget=modelled-seats&region=bundestag&lang=de&theme=light"],
      ["approval", 1120, "/embed.html?view=approval&country=de&compare=1&metric=leader&range=ten&display=trend&answers=positive&eventMode=key&lang=de&theme=light"],
      ["map", 1240, "/embed.html?embed=1&view=map&lang=de&theme=light&mapMode=leader&mapParty=union"],
    ];
    for (const width of [320, 760, 1200]) {
      for (const [name, height, url] of cases) {
        await page.setViewportSize({ width, height });
        await page.goto(url);
        await settle(page);
        const geometry = await page.evaluate(() => ({
          clientHeight: document.documentElement.clientHeight,
          scrollHeight: document.documentElement.scrollHeight,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect.soft(geometry.scrollHeight, `${name} clips vertically at ${width}px: ${JSON.stringify(geometry)}`).toBeLessThanOrEqual(geometry.clientHeight + 1);
        expect.soft(geometry.scrollWidth, `${name} clips horizontally at ${width}px: ${JSON.stringify(geometry)}`).toBeLessThanOrEqual(geometry.clientWidth + 1);
      }
    }
  });
});
