import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.use({ serviceWorkers: "block", video: "off" });
test("search: typo, honest fallback, Enter dismisses keyboard and no country control", async ({
  page,
}) => {
  await page.goto("/?view=studio&lang=de&profile=current-poll");
  await expect(page.getByLabel("Land", { exact: true })).toHaveCount(0);
  const input = page.getByRole("searchbox");
  await input.fill("räumlcih");
  await expect(page.locator("#studio-poll-material")).toBeVisible();
  await expect(page.locator(".studio-template-card")).toHaveCount(1);
  await input.press("Enter");
  await expect(input).not.toBeFocused();
  await input.fill("marsraumschiff");
  await expect(page.locator(".studio-gallery-meta")).toContainText(
    "Kein direkter Treffer",
  );
  await expect(page.locator(".studio-template-card")).toHaveCount(13);
});
test("editor changes real SVG, preserves values, exports nonempty PNG and matching embed", async ({
  page,
  isMobile,
}, info) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?view=studio&lang=de&template=poll-classic&editor=1");
  const svg = page.locator(".studio-current-preview-image svg");
  await expect(svg.locator("[data-party-id]").first()).toBeVisible({
    timeout: 25000,
  });
  const values = await svg
    .locator("[data-party-id]")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.value));
  const baseline = await svg
    .locator("[data-party-id] rect")
    .first()
    .getAttribute("height");
  const edit = page.getByRole("button", { name: "Bearbeiten", exact: true });
  if (isMobile) await edit.tap();
  else await edit.click();
  await expect(page.locator(".is-full-editor")).toBeVisible();
  expect(new URL(page.url()).searchParams.get("workspace")).toBe("edit");
  await page
    .getByLabel("Überschrift", { exact: true })
    .fill(
      "Deutschland vor der nächsten Wahl: die aktuelle Sonntagsfrage im Überblick",
    );
  await page.getByRole("button", { name: "Georgia", exact: true }).click();
  await page
    .locator(".studio-tools")
    .getByRole("button", { name: "Unterzeile", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Unterzeile", exact: true })
    .fill("Eine Einordnung für die Redaktion");
  await page
    .locator(".studio-tools")
    .getByRole("button", { name: "Anmerkung", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Redaktionelle Anmerkung", exact: true })
    .fill("Ausgewählte Parteien im Vergleich.");
  await page
    .locator(".studio-tools")
    .getByRole("button", { name: "Diagramm", exact: true })
    .click();
  const bar = page.getByLabel(/Balkendicke/);
  await bar.fill("0.5");
  expect(
    await svg.locator("[data-party-id] rect").first().getAttribute("height"),
  ).not.toBe(baseline);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  expect(
    await svg.locator("[data-party-id] rect").first().getAttribute("height"),
  ).toBe(baseline);
  await page.getByRole("button", { name: "Wiederholen", exact: true }).click();
  await page
    .locator(".studio-tools")
    .getByRole("button", { name: "100%", exact: true })
    .click();
  expect(
    await svg
      .locator("[data-party-id]")
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.value)),
  ).toEqual(values);
  await expect(svg).toHaveAttribute("font-family", /Georgia/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("editor.png"),
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "PNG herunterladen", exact: true })
    .click();
  await page.locator("dialog[open]").getByRole("button",{name:"PNG herunterladen",exact:true}).click();
  const download = await downloadPromise;
  const file = await readFile(await download.path());
  expect(file.subarray(1, 4).toString()).toBe("PNG");
  expect(file.length).toBeGreaterThan(15000);
  await download.saveAs(info.outputPath("edited.png"));
  if(await page.locator("dialog[open]").count())await page.locator("dialog[open]").getByRole("button",{name:"Schließen"}).click();
  await page.getByRole("button", { name: "Embed", exact: true }).click();
  const code = await page.locator("dialog[open] textarea").inputValue();
  expect(code).toContain("barScale=0.5");
  expect(code).toContain("axisMax=100");
  expect(code).toContain("font=serif");
  const url = code.match(/src="([^"]+)/)[1].replaceAll("&amp;", "&");
  const embed = await page.context().newPage();
  await embed.goto(url);
  await expect(embed.locator("svg [data-party-id]").first()).toBeVisible({
    timeout: 25000,
  });
  const standalone = embed.locator("svg.studio-current-art");
  expect(await standalone.getAttribute("viewBox")).toBe(
    await svg.getAttribute("viewBox"),
  );
  expect(
    await standalone
      .locator("[data-party-id]")
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.value)),
  ).toEqual(values);
  await embed.close();
  await page
    .locator(".studio-tools")
    .getByRole("button", { name: "Hintergrund", exact: true })
    .click();
  await page
    .locator('.studio-tools input[accept^="image"]')
    .setInputFiles({
      name: "unsafe.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
  await expect(page.locator(".studio-tools [role=status]")).toContainText(
    "Dieses Bild",
  );
  await page
    .locator('.studio-tools input[accept^="image"]')
    .setInputFiles({
      name: "background.png",
      mimeType: "image/png",
      buffer: file,
    });
  await expect(
    page.getByRole("button", { name: "Embed", exact: true }),
  ).toBeDisabled();
  expect(page.url()).not.toContain("data%3A");
  await page
    .getByRole("button", { name: "Bild entfernen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Embed", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Zur Vorschau", exact: false })
    .click();
  await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Rückgängig", exact: true }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});

test("language variants and template-specific tools keep long titles inside SVG", async ({
  page,
}) => {
  for (const lang of ["es", "en-GB", "en-US"]) {
    const font = lang === "es" ? "sans" : lang === "en-GB" ? "serif" : "mono";
    await page.goto(
      `/?view=studio&lang=${lang}&template=poll-pie&editor=1&titleSize=44&font=${font}&headline=${"W".repeat(100)}`,
    );
    const svg = page.locator(".studio-current-preview-image svg");
    await expect(svg.locator("[data-party-id]").first()).toBeVisible({
      timeout: 25000,
    });
    await page
      .getByRole("button", {
        name: lang === "es" ? "Editar" : "Edit",
        exact: true,
      })
      .click();
    await expect(page.locator(".studio-tools")).toBeVisible();
    await expect(page.locator(".studio-tools")).not.toContainText(
      "Überschrift",
    );
    await expect(
      page.locator(".studio-tools input[type=range]:visible"),
    ).toHaveCount(1); // Only the selected text element's size.
    const clipped = await svg.evaluate((svg) =>
      [...svg.querySelectorAll("text")]
        .filter((text) => {
          const b = text.getBBox();
          return (
            b.x < 0 ||
            b.y < 0 ||
            b.x + b.width > 960.5 ||
            b.y + b.height > svg.viewBox.baseVal.height + 0.5
          );
        })
        .map((text) => text.textContent),
    );
    expect(clipped).toEqual([]);
  }
});

test("full editor deep link survives reload and export width changes pixels", async ({
  page,
}) => {
  await page.goto(
    "/?view=studio&editor=1&workspace=edit&template=poll-classic&lang=de&subtitle=Redaktion&editorNote=Kontext&titleAlign=center&exportWidth=960",
  );
  await expect(page.locator(".is-full-editor")).toBeVisible();
  await page.reload();
  await page
    .locator(".studio-tools")
    .getByRole("button", { name: "Unterzeile", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Unterzeile", exact: true }),
  ).toHaveValue("Redaktion");
  await page
    .locator(".studio-tools")
    .getByRole("button", { name: "Ausgabe", exact: true })
    .click();
  await expect(
    page
      .locator(".studio-tools")
      .getByRole("button", { name: "960 px", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("textbox", { name: "Alternativtext", exact: true }),
  ).toHaveValue(/%/);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "PNG herunterladen", exact: true })
    .click();
  await page.locator("dialog[open]").getByRole("button",{name:"PNG herunterladen",exact:true}).click();
  const download = await downloadPromise;
  const png = await readFile(await download.path());
  expect(png.readUInt32BE(16)).toBe(960);
  await page
    .locator(".studio-tools")
    .getByRole("button", { name: "Diagramm", exact: true })
    .click();
  await page
    .locator(".studio-tools")
    .getByRole("button", { name: "Kreisdiagramm", exact: true })
    .click();
  await expect(
    page.locator(".studio-current-preview-image svg"),
  ).toHaveAttribute("data-design", "pie");
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await expect(
    page.locator(".studio-current-preview-image svg"),
  ).toHaveAttribute("data-design", "classic");
});

// Full editing is intentionally unavailable on phones; preview/export coverage
// remains in studio-polish and the dedicated phone guard in studio-workspace.
test.beforeEach(async ({ page }, info) => {
  const viewport=info.project.use.viewport;
  test.skip(Boolean(info.project.use.isMobile && viewport && Math.min(viewport.width,viewport.height)<600), "Full editor is desktop/tablet only");
});
