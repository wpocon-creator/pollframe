import { expect, test } from "@playwright/test";

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts?.ready);
  await expect(page.locator("main")).toBeVisible();
}

async function installPngCapture(page, { nativeShare = false } = {}) {
  await page.addInitScript(({ nativeShare }) => {
    const blobs = new Map();
    const createObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = createObjectURL(blob);
      blobs.set(url, blob);
      return url;
    };
    window.__inspectPngBlob = async (blob) => {
      // Inspect bytes without requiring weaker production CSP permissions for
      // blob: image loads or fetch(blob:). data: images are already supported.
      const objectUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      try {
        const image = await new Promise((resolve, reject) => {
          const candidate = new Image();
          candidate.onload = () => resolve(candidate);
          candidate.onerror = reject;
          candidate.src = objectUrl;
        });
        const canvas = document.createElement("canvas");
        canvas.width = 80;
        canvas.height = 50;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let luminance = 0;
        let minimum = 255;
        let maximum = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          const value = (pixels[index] * .2126) + (pixels[index + 1] * .7152) + (pixels[index + 2] * .0722);
          luminance += value;
          minimum = Math.min(minimum, value);
          maximum = Math.max(maximum, value);
        }
        return { width: image.naturalWidth, height: image.naturalHeight, bytes: blob.size, contrast: maximum - minimum, luminance: luminance / (pixels.length / 4) };
      } finally {
        // FileReader data URLs need no object-URL cleanup.
      }
    };
    document.addEventListener("click", (event) => {
      const link = event.target.closest?.("a[download]");
      if (!link?.href.startsWith("blob:")) return;
      const blob = blobs.get(link.href);
      if (blob) window.__inspectPngBlob(blob).then((result) => { window.__downloadedPng = result; });
    }, true);
    if (nativeShare) {
      Object.defineProperty(navigator, "canShare", { configurable: true, value: ({ files }) => Boolean(files?.length) });
      Object.defineProperty(navigator, "share", { configurable: true, value: async ({ files }) => { window.__sharedPng = await window.__inspectPngBlob(files[0]); } });
    }
  }, { nativeShare });
}

async function auditPngDialog(page, expectedFormats) {
  const modal = page.locator(".png-options-modal");
  await expect(modal).toBeVisible();
  await expect(modal.locator('.png-preview-surface[data-preview-ready="true"]')).toHaveCount(1);
  await expect(modal.locator('.png-format-grid [role="radio"]')).toHaveCount(expectedFormats.length);
  await expect(modal.locator(".png-format-panel")).toHaveCount(expectedFormats.length ? 1 : 0);
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

async function waitForPreview(modal, { preset, theme = null }) {
  const selector = `.png-preview-surface[data-preview-ready="true"][data-export-preset="${preset}"]${theme ? `[data-export-theme="${theme}"]` : ""}`;
  await expect(modal.locator(selector)).toHaveCount(1);
  return modal.locator(selector);
}

async function expectDialogChromeAnchored(modal) {
  const geometry = await modal.evaluate((root) => {
    const modalRect = root.getBoundingClientRect();
    const headerRect = root.querySelector(":scope > .panel-header")?.getBoundingClientRect();
    return {
      scrollTop: root.scrollTop,
      headerInside: Boolean(headerRect) && headerRect.top >= modalRect.top - 1 && headerRect.bottom <= modalRect.bottom + 1,
    };
  });
  expect(geometry.scrollTop, "the publishing-dialog frame must not scroll away").toBe(0);
  expect(geometry.headerInside, "the publishing-dialog header must remain visible").toBe(true);
}

async function downloadPngSample(page, button, expectedFormats, outputPath, expectedSize, selectedFormat = null) {
  await page.evaluate(() => { window.__downloadedPng = null; });
  await button.scrollIntoViewIfNeeded();
  await button.click();
  const modal = await auditPngDialog(page, expectedFormats);
  if (selectedFormat) await modal.locator(`.png-format-shape.is-${selectedFormat}`).locator("..").click();
  const downloadPromise = page.waitForEvent("download");
  await modal.locator(".png-options-actions .primary-button").click();
  const download = await downloadPromise;
  await download.saveAs(outputPath);
  await page.waitForFunction(() => Boolean(window.__downloadedPng), null, { timeout: 30_000 });
  const image = await page.evaluate(() => window.__downloadedPng);
  expect([image.width, image.height]).toEqual(expectedSize);
  expect(image.bytes).toBeGreaterThan(20_000);
  expect(image.contrast).toBeGreaterThan(35);
  await modal.getByRole("button", { name: /Schließen|Close|Cerrar/i }).click();
  return image;
}

test.describe("PNG export chooser", () => {
  test("centres PNG and embed dialogs against the viewport after scrolling", async ({ page }, testInfo) => {
    test.skip(!["chromium-desktop", "iphone-13-chromium"].includes(testInfo.project.name), "Representative desktop and phone geometry coverage only.");
    await page.goto("/?region=bundestag&lang=de");
    await settle(page);

    const assertViewportCentred = async (modal, label) => {
      await expect(modal).toBeVisible();
      await modal.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
      const geometry = await modal.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        // Fixed-position portals centre in the visual viewport. On desktop,
        // innerWidth includes the scrollbar gutter that is intentionally kept
        // stable while the underlying document is locked.
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        return {
          parent: element.parentElement?.parentElement?.tagName,
          horizontalOffset: Math.abs((rect.left + rect.width / 2) - viewport.width / 2),
          verticalOffset: Math.abs((rect.top + rect.height / 2) - viewport.height / 2),
          inside: rect.left >= -1 && rect.right <= viewport.width + 1 && rect.top >= -1 && rect.bottom <= viewport.height + 1,
        };
      });
      expect(geometry.parent, `${label} should be portalled to document.body`).toBe("BODY");
      expect(geometry.inside, `${label} should remain fully visible`).toBe(true);
      expect(geometry.horizontalOffset, `${label} horizontal centre`).toBeLessThanOrEqual(2);
      expect(geometry.verticalOffset, `${label} vertical centre`).toBeLessThanOrEqual(2);
    };

    const chart = page.locator(".chart-card");
    await chart.scrollIntoViewIfNeeded();
    await chart.evaluate((element) => { element.style.transform = "translateZ(0)"; });
    await page.evaluate(() => window.scrollBy(0, 420));

    await page.locator(".chart-actions .primary-button").click();
    const shareModal = page.locator(".embed-modal:not(.png-options-modal)");
    await assertViewportCentred(shareModal, "embed dialog");
    await shareModal.getByRole("button", { name: /Schließen|Close|Cerrar/i }).click();

    await page.locator(".chart-actions .png-export-button").click();
    const pngModal = page.locator(".png-options-modal");
    await expect(pngModal.locator('.png-preview-surface[data-preview-ready="true"]')).toHaveCount(1);
    await assertViewportCentred(pngModal, "PNG dialog");
    await pngModal.getByRole("button", { name: /Schließen|Close|Cerrar/i }).click();

    await page.locator(".results-card .widget-share-trigger:not(.widget-png-trigger)").click();
    const widgetModal = page.locator(".widget-share-modal");
    await assertViewportCentred(widgetModal, "widget embed dialog");
    await widgetModal.getByRole("button", { name: /Schließen|Close|Cerrar/i }).click();

    await page.goto("/?view=map&lang=de");
    await settle(page);
    await page.getByRole("button", { name: /Karte einbetten|Embed map/i }).click();
    const mapModal = page.locator(".embed-modal");
    await assertViewportCentred(mapModal, "map embed dialog");
    await mapModal.getByRole("button", { name: /Schließen|Close|Cerrar/i }).click();

    await page.goto("/?view=approval&country=de&lang=de");
    await settle(page);
    await page.getByRole("button", { name: "Teilen & einbetten", exact: true }).click();
    const approvalModal = page.locator(".approval-share-card");
    await assertViewportCentred(approvalModal, "approval embed dialog");
  });

  test("portrait current-poll grids stay balanced across countries and devices", async ({ page }, testInfo) => {
    test.skip(!["chromium-desktop", "iphone-13-chromium"].includes(testInfo.project.name), "Representative fine- and coarse-pointer coverage only.");
    for (const route of [
      "/?region=bundestag&lang=de",
      "/?region=uk-westminster&lang=en-GB",
      "/?region=spain-congress&lang=es",
    ]) {
      await page.goto(route);
      await settle(page);
      await page.locator(".results-card .widget-png-trigger").click();
      const modal = await auditPngDialog(page, ["landscape", "square", "portrait"]);
      await modal.locator(".png-format-shape.is-portrait").locator("..").click();
      await waitForPreview(modal, { preset: "portrait" });
      const composition = await modal.locator(".png-preview-clone .result-list").evaluate((list) => {
        const rows = [...list.querySelectorAll(":scope > .result-row")];
        const rowGroups = new Map();
        rows.forEach((row) => {
          const top = Math.round(row.getBoundingClientRect().top);
          rowGroups.set(top, (rowGroups.get(top) ?? 0) + 1);
        });
        const groups = [...rowGroups.values()];
        const heights = rows.map((row) => row.getBoundingClientRect().height);
        const clippedNames = rows.filter((row) => {
          const name = row.querySelector(".party-info-trigger");
          return name && (name.scrollWidth > name.clientWidth + 2 || name.scrollHeight > name.clientHeight + 2);
        }).length;
        return {
          groups,
          heightSpread: Math.max(...heights) - Math.min(...heights),
          clippedNames,
          horizontalOverflow: list.scrollWidth - list.clientWidth,
        };
      });
      expect(Math.max(...composition.groups) - Math.min(...composition.groups), route).toBeLessThanOrEqual(1);
      expect(composition.groups.length === 1 || Math.min(...composition.groups) >= 2, route).toBe(true);
      expect(composition.heightSpread, route).toBeLessThanOrEqual(1);
      expect(composition.clippedNames, route).toBe(0);
      expect(composition.horizontalOverflow, route).toBeLessThanOrEqual(2);
      await modal.getByRole("button", { name: /Schließen|Close|Cerrar/i }).click();
    }
  });

  test("UK current polling portrait export remains a complete readable composition", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "One raster audit is sufficient for the fixed export geometry.");
    await installPngCapture(page);
    await page.goto("/?region=uk-westminster&lang=en-GB");
    await settle(page);
    const button = page.locator(".results-card .widget-png-trigger");
    await button.click();
    const modal = await auditPngDialog(page, ["landscape", "square", "portrait"]);
    await modal.locator(".png-format-shape.is-portrait").locator("..").click();
    await waitForPreview(modal, { preset: "portrait" });
    const composition = await modal.locator(".png-preview-clone .result-list").evaluate((list) => {
      const rows = [...list.querySelectorAll(":scope > .result-row")];
      const rowGroups = new Map();
      rows.forEach((row) => {
        const top = Math.round(row.getBoundingClientRect().top);
        rowGroups.set(top, (rowGroups.get(top) ?? 0) + 1);
      });
      const heights = rows.map((row) => row.getBoundingClientRect().height);
      const clippedNames = rows.filter((row) => {
        const name = row.querySelector(".party-info-trigger");
        return name && (name.scrollWidth > name.clientWidth + 2 || name.scrollHeight > name.clientHeight + 2);
      }).length;
      return {
        columns: Number(list.dataset.pngPortraitColumns),
        rows: Number(list.dataset.pngPortraitRows),
        groups: [...rowGroups.values()],
        heightSpread: Math.max(...heights) - Math.min(...heights),
        clippedNames,
      };
    });
    expect(composition).toEqual({ columns: 4, rows: 2, groups: [4, 4], heightSpread: 0, clippedNames: 0 });
    await modal.getByRole("button", { name: /Schließen|Close|Cerrar/i }).click();
    await downloadPngSample(page, button, ["landscape", "square", "portrait"], testInfo.outputPath("uk-current-portrait.png"), [1080, 1350], "portrait");
  });

  test("uses graph-specific formats and changes the real preview geometry", async ({ page }, testInfo) => {
    if (testInfo.project.name.includes("iphone")) await installPngCapture(page, { nativeShare: true });
    await page.goto("/?region=bundestag&lang=de");
    await settle(page);
    await page.locator(".chart-card .png-export-button").first().click();
    const modal = await auditPngDialog(page, ["landscape", "square"]);
    await expect(modal.locator('.png-format-shape.is-landscape').locator("..")).toHaveAttribute("aria-checked", "true");
    await modal.locator(".png-format-shape.is-landscape").locator("..").click();
    const landscapeSurface = await waitForPreview(modal, { preset: "landscape" });
    await expect(landscapeSurface).toHaveCSS("width", "1920px");
    await expect(landscapeSurface).toHaveCSS("height", "1080px");
    await expect(landscapeSurface.locator(".png-export-header")).toContainText("POLLFRAME");
    await expect(landscapeSurface.locator(".png-export-footer")).toContainText(/Entwicklung der Wahlabsicht|Voting intention/i);
    const landscapeRatio = await modal.locator(".png-preview-canvas").evaluate((node) => node.getBoundingClientRect().width / node.getBoundingClientRect().height);
    const landscapeCloneWidth = await modal.locator(".png-preview-clone").evaluate((node) => Number.parseFloat(node.style.width));
    await modal.locator(".png-format-shape.is-square").locator("..").click();
    const squareSurface = await waitForPreview(modal, { preset: "square" });
    await expect(squareSurface).toHaveCSS("width", "1080px");
    await expect(squareSurface).toHaveCSS("height", "1080px");
    const squareRatio = await modal.locator(".png-preview-canvas").evaluate((node) => node.getBoundingClientRect().width / node.getBoundingClientRect().height);
    const squareCloneWidth = await modal.locator(".png-preview-clone").evaluate((node) => Number.parseFloat(node.style.width));
    expect(landscapeRatio).toBeGreaterThan(1.65);
    expect(squareRatio).toBeGreaterThan(.94);
    expect(squareRatio).toBeLessThan(1.06);
    expect(landscapeCloneWidth).toBeGreaterThan(squareCloneWidth * 1.5);
    await modal.locator('.png-preview-theme [role="radio"]').filter({ hasText: /Dunkel|Dark|Oscuro/i }).click();
    await expect(modal.locator('.png-preview-canvas')).toHaveAttribute("data-export-theme", "dark");
    await waitForPreview(modal, { preset: "square", theme: "dark" });
    await expectDialogChromeAnchored(modal);
    await modal.screenshot({ path: testInfo.outputPath("png-dialog-history.png") });
    await modal.getByRole("button", { name: /Schließen|Close|Cerrar/i }).click();

    await page.locator(".results-card .widget-png-trigger").click();
    const widgetModal = await auditPngDialog(page, ["landscape", "square", "portrait"]);
    await expect(widgetModal.locator(".png-format-shape.is-landscape").locator("..")).toHaveAttribute("aria-checked", "true");
    await widgetModal.locator(".png-format-shape.is-portrait").locator("..").click();
    const portraitSurface = await waitForPreview(widgetModal, { preset: "portrait" });
    await expect(portraitSurface).toHaveCSS("width", "1080px");
    await expect(portraitSurface).toHaveCSS("height", "1350px");
    await expect(widgetModal.locator(".png-preview-clone .result-list")).toHaveCSS("display", "grid");
    await expect(widgetModal.locator(".png-preview-clone .result-bar").first()).toHaveCSS("width", "44px");
    await widgetModal.screenshot({ path: testInfo.outputPath("png-dialog-widget.png") });
  });

  test("produces a non-empty correctly sized PNG on desktop and mobile share sheets", async ({ page }, testInfo) => {
    const mobileShare = ["pixel-5", "iphone-13", "iphone-13-chromium"].includes(testInfo.project.name);
    await installPngCapture(page, { nativeShare: mobileShare });
    await page.goto("/?region=bundestag&lang=de");
    await settle(page);
    await page.locator(".chart-card .png-export-button").first().click();
    const modal = await auditPngDialog(page, ["landscape", "square"]);
    await modal.locator('.png-preview-theme [role="radio"]').filter({ hasText: "Dunkel" }).click();
    await modal.locator(".png-options-actions .primary-button").click();
    const captureName = mobileShare ? "__sharedPng" : "__downloadedPng";
    await page.waitForFunction((name) => Boolean(window[name]), captureName, { timeout: 30_000 });
    const image = await page.evaluate((name) => window[name], captureName);
    expect(image.width).toBe(1920);
    expect(image.height).toBe(1080);
    expect(image.bytes).toBeGreaterThan(20_000);
    expect(image.contrast).toBeGreaterThan(35);
    expect(image.luminance).toBeLessThan(150);
  });

  test("Germany map exports as a tightly used 4:5 graphic on phones", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone-13-chromium", "Representative mobile export coverage only.");
    await installPngCapture(page, { nativeShare: true });
    await page.goto("/?view=map&lang=de");
    await settle(page);
    await page.locator(".poll-map-module .png-export-button").first().click();
    const modal = await auditPngDialog(page, []);
    const composition = await modal.locator(".png-preview-clone").evaluate((root) => {
      const map = root.querySelector(".polling-map").getBoundingClientRect();
      const clone = root.getBoundingClientRect();
      return { preset: root.dataset.pngPreset, widthUse: map.width / clone.width };
    });
    expect(composition.preset).toBe("portrait");
    expect(composition.widthUse).toBeGreaterThan(.7);
    await modal.locator(".png-options-actions .primary-button").click();
    await page.waitForFunction(() => Boolean(window.__sharedPng), null, { timeout: 30_000 });
    const image = await page.evaluate(() => window.__sharedPng);
    expect([image.width, image.height]).toEqual([1080, 1350]);
    expect(image.bytes).toBeGreaterThan(20_000);
    expect(image.contrast).toBeGreaterThan(35);
  });

  test("remains clean when opened from inside Share and Embed", async ({ page }, testInfo) => {
    await page.goto("/?region=bundestag&lang=en-GB");
    await settle(page);
    await page.locator(".results-card .widget-share-trigger:not(.widget-png-trigger)").click();
    await expect(page.locator(".embed-modal:not(.png-options-modal)")).toBeVisible();
    await page.locator(".journalist-embed-actions .png-export-button").click();
    const modal = await auditPngDialog(page, ["landscape", "square", "portrait"]);
    const layers = await page.evaluate(() => ({
      png: Number.parseInt(getComputedStyle(document.querySelector(".png-options-overlay")).zIndex, 10),
      share: Number.parseInt(getComputedStyle(document.querySelector(".modal-overlay:not(.png-options-overlay)")).zIndex, 10),
    }));
    expect(layers.png).toBeGreaterThan(layers.share);
    await modal.screenshot({ path: testInfo.outputPath("png-dialog-over-share.png") });
    await modal.getByRole("button", { name: /Schließen|Close|Cerrar/i }).click();
    await expect(page.locator(".embed-modal:not(.png-options-modal)")).toBeVisible();
  });

  test("compact approval redesign preserves both real PNG compositions", async ({ page }, testInfo) => {
    test.skip(!["chromium-desktop", "iphone-13-chromium"].includes(testInfo.project.name), "Representative desktop and touch downloads");
    await installPngCapture(page);
    await page.goto("/?view=approval&country=de&lang=de");
    await settle(page);
    for (const [preset, size] of [["landscape", [1920, 1080]], ["square", [1080, 1080]]]) {
      await downloadPngSample(page, page.locator(".approval-current-government .widget-png-trigger"), ["landscape", "square"], `test-results/design-review/${testInfo.project.name}/approval-export-${preset}.png`, size, preset);
    }
  });

  test("renders complete profile-specific graphics rather than empty frames", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "One representative visual export audit is sufficient.");
    test.setTimeout(180_000); // Seventeen real high-resolution downloads, not a single navigation.
    await installPngCapture(page);

    await page.goto("/?region=bundestag&lang=de");
    await settle(page);
    await downloadPngSample(page, page.locator(".chart-card .png-export-button").first(), ["landscape", "square"], testInfo.outputPath("history-landscape.png"), [1920, 1080]);
    await downloadPngSample(page, page.locator(".results-card .widget-png-trigger"), ["landscape", "square", "portrait"], testInfo.outputPath("current-landscape-bars.png"), [1920, 1080], "landscape");
    await downloadPngSample(page, page.locator(".results-card .widget-png-trigger"), ["landscape", "square", "portrait"], testInfo.outputPath("current-square-bars.png"), [1080, 1080], "square");
    await downloadPngSample(page, page.locator(".results-card .widget-png-trigger"), ["landscape", "square", "portrait"], testInfo.outputPath("current-portrait-columns.png"), [1080, 1350], "portrait");
    await downloadPngSample(page, page.locator(".tendency-section .widget-png-trigger"), ["landscape", "square", "portrait"], testInfo.outputPath("party-cards-square.png"), [1080, 1080], "square");
    await downloadPngSample(page, page.locator(".projection-section .widget-png-trigger"), ["landscape", "square", "portrait"], testInfo.outputPath("modelled-seats-square.png"), [1080, 1080], "square");
    await page.locator(".tendency-card").first().click();
    await downloadPngSample(page, page.locator(".party-modal .widget-png-trigger"), ["landscape", "square"], testInfo.outputPath("party-history-square.png"), [1080, 1080], "square");
    await page.locator(".party-modal>.party-modal-header .icon-button").click();

    await page.goto("/?view=map&lang=de");
    await settle(page);
    await page.locator(".poll-map-module .png-export-button").first().click();
    const mapModal = await auditPngDialog(page, []);
    const stripeReferences = await mapModal.locator(".png-preview-clone").evaluate((root) => {
      const patterns = [...root.querySelectorAll("defs pattern[id]")].map((node) => node.id);
      const tied = [...root.querySelectorAll(".poll-map-state")].find((node) => node.getAttribute("style")?.includes("url("));
      return { patterns, fill: tied?.style.fill ?? "" };
    });
    expect(stripeReferences.patterns.length).toBeGreaterThan(0);
    expect(stripeReferences.patterns.some((id) => stripeReferences.fill.includes(`#${id}`))).toBe(true);
    const mapComposition = await mapModal.locator(".png-preview-clone").evaluate((root) => {
      const map = root.querySelector(".polling-map").getBoundingClientRect();
      const clone = root.getBoundingClientRect();
      return { widthUse: map.width / clone.width, preset: root.dataset.pngPreset };
    });
    expect(mapComposition.preset).toBe("portrait");
    expect(mapComposition.widthUse).toBeGreaterThan(.7);
    await mapModal.getByRole("button", { name: /Schließen|Close|Cerrar/i }).click();
    await downloadPngSample(page, page.locator(".poll-map-module .png-export-button").first(), [], testInfo.outputPath("map-portrait.png"), [1080, 1350]);

    await page.goto("/?view=approval&country=de&lang=de");
    await settle(page);
    await downloadPngSample(page, page.locator(".approval-main-chart .png-export-button"), ["landscape", "square"], testInfo.outputPath("approval-landscape.png"), [1920, 1080]);
    await downloadPngSample(page, page.locator(".approval-current-government .widget-png-trigger"), ["landscape", "square"], testInfo.outputPath("approval-government-square.png"), [1080, 1080], "square");

    await page.goto("/?region=spain-congress&lang=es");
    await settle(page);
    await downloadPngSample(page, page.locator(".spain-insights-export-surface .png-export-button"), ["square", "portrait"], testInfo.outputPath("spain-insight-portrait.png"), [1080, 1350]);

    await page.goto("/?country=es&view=spain-issues&lang=es");
    await settle(page);
    await downloadPngSample(page, page.locator(".spain-concern-panel .png-export-button").first(), ["landscape", "square", "portrait"], testInfo.outputPath("spain-issues-square.png"), [1080, 1080], "square");
    await downloadPngSample(page, page.locator(".spain-concern-panel .png-export-button").first(), ["landscape", "square", "portrait"], testInfo.outputPath("spain-issues-portrait-columns.png"), [1080, 1350], "portrait");

    await page.goto("/?view=uk-constituencies&seat=bristol-central&lang=en-GB");
    await settle(page);
    await downloadPngSample(page, page.locator(".constituency-result-card .widget-png-trigger"), ["landscape", "square", "portrait"], testInfo.outputPath("constituency-square.png"), [1080, 1080], "square");
  });
});
