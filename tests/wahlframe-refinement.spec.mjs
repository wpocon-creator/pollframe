import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("shared export dialog keeps SVG and PDF controls inside the viewport", async ({
  page,
}, info) => {
  await page.goto("/?region=bundestag&lang=en-GB");
  await page.locator(".chart-card .png-export-button").first().click();
  const modal = page.locator(".png-options-modal");
  for (const type of ["svg", "pdf"]) {
    await modal.getByRole("combobox", { name: "File type" }).click();
    await page
      .getByRole("option", {
        name: type === "svg" ? "SVG (image)" : "PDF",
        exact: true,
      })
      .click();
    await expect(
      modal.locator(".png-preview-surface[data-preview-ready=true]"),
    ).toHaveCount(1);
    const geometry = await modal.evaluate((root) => {
      const actions = root
        .querySelector(".png-options-actions")
        .getBoundingClientRect();
      const formats = root
        .querySelector(".png-format-grid")
        .getBoundingClientRect();
      return {
        right: root.getBoundingClientRect().right,
        width: innerWidth,
        bottom: actions.bottom,
        height: innerHeight,
        overlap: Math.max(
          0,
          Math.min(actions.bottom, formats.bottom) -
            Math.max(actions.top, formats.top),
        ),
      };
    });
    expect(geometry.right).toBeLessThanOrEqual(geometry.width + 1);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.height + 1);
    expect(geometry.overlap).toBeLessThanOrEqual(1);
    const pending = page.waitForEvent("download");
    await modal
      .getByRole("button", {
        name: `Download ${type.toUpperCase()}`,
        exact: true,
      })
      .click();
    const file = await pending;
    expect(file.suggestedFilename()).toMatch(new RegExp(`\\.${type}$`));
    const contents = await readFile(await file.path());
    expect(contents.length).toBeGreaterThan(1000);
    if (type === "svg") expect(contents.toString()).toContain("<image");
    else expect(contents.subarray(0, 8).toString()).toBe("%PDF-1.4");
  }
  await modal.screenshot({ path: info.outputPath("shared-pdf-export.png") });
});

async function result(page) {
  await page.goto("/?view=party-match&lang=en-GB");
  await page.locator('.pm-lengths input[value="8"]').check();
  await page.locator(".pm-start-card > .pm-primary").click();
  for (let i = 0; i < 8; i++) {
    await page
      .locator(".pm-choices label")
      .nth(i % 3)
      .click();
    await page.locator(".pm-question-actions .pm-primary").click();
  }
}
test("results order, complete axes, mobile layout and preview-before-editor", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await result(page);
  const sections = page.locator(".pm-result-insights > section");
  await expect(sections).toHaveCount(3);
  await expect(sections.nth(0)).toContainText("Your policy profile");
  await expect(sections.nth(1)).toContainText("Agreement by topic");
  await expect(sections.nth(2)).toContainText("You & one party");
  await expect(page.locator(".pm-pairwise")).toHaveCount(0);
  const axis = page.getByRole("combobox", { name: "Dimension 2", exact: true });
  await axis.click();
  await page
    .getByRole("option", { name: "Climate ambition", exact: true })
    .click();
  await expect(
    page.locator("[data-dimension=climate] .pm-profile-rail"),
  ).toHaveCount(0);
  await expect(page.locator("[data-dimension=climate]")).toContainText(
    "three included answers",
  );
  await expect(page.locator("[data-dimension=economy]")).toContainText(
    "More redistribution",
  );
  await expect(page.locator("[data-dimension=economy]")).toContainText(
    "More market",
  );
  await page
    .locator(".pm-policy-profile")
    .screenshot({ path: info.outputPath("answer-profile.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  const allowed = await page.evaluate(
    () => innerWidth >= 768 && Math.min(screen.width, screen.height) >= 600,
  );
  const studio = page
    .getByRole("button", { name: "Design in Studio", exact: true })
    .first();
  if (!allowed) await expect(studio).toBeHidden();
  else {
    await studio.click();
    await expect(page.locator(".pm-studio-preview img")).toBeVisible();
    await expect(page.locator(".pm-studio-editor")).toHaveCount(0);
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.locator(".pm-studio-editor")).toBeVisible();
    await page.getByRole("button", { name: "Text", exact: true }).click();
    await page.getByRole("button", { name: /Change typeface/ }).click();
    const library = page.getByRole("dialog", { name: "Typeface library" });
    await expect(library).toBeVisible();
    await library.getByRole("searchbox").fill("Manrope");
    await library.getByRole("button", { name: /Manrope/ }).click();
    await expect(library).toHaveCount(0);
    await expect
      .poll(async () =>
        decodeURIComponent(
          (await page.locator(".pm-studio-preview img").getAttribute("src"))
            .split(",")
            .slice(1)
            .join(","),
        ),
      )
      .toContain("@font-face");
    await page.getByLabel("Title", { exact: true }).fill("A considered choice");
    await expect
      .poll(async () =>
        decodeURIComponent(
          (await page.locator(".pm-studio-preview img").getAttribute("src"))
            .split(",")
            .slice(1)
            .join(","),
        ),
      )
      .toContain("A considered choice");
    await page.screenshot({
      path: info.outputPath("wahlframe-editor.png"),
      fullPage: true,
    });
  }
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.fontSize = "28px";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  if (!allowed)
    await page
      .locator(".pm-policy-profile")
      .screenshot({ path: info.outputPath("answer-profile-dark-large.png") });
  expect(errors).toEqual([]);
});

test("all graphic file types preserve size and PDF is readable", async ({
  page,
}, info) => {
  await page.goto("/?view=party-match&lang=en-GB");
  const outputs = await page.evaluate(async () => {
    const { renderElementPng } = await import("/src/png-export.jsx");
    const { graphicFile } = await import("/src/graphic-file.js");
    const element = document.createElement("div");
    element.innerHTML =
      '<h2>Polling test graphic</h2><div style="width:500px;height:160px;background:#235bc9;color:#fff;padding:20px">Source: Pollframe test · 2025</div>';
    document.body.append(element);
    const png = await renderElementPng({
      element,
      filename: "test-export",
      title: "Readable source",
      subtitle: "Test",
      preset: "square",
      profile: "insight",
    });
    const results = [];
    for (const type of ["png", "svg", "pdf"]) {
      const value = await graphicFile(png, type);
      results.push({
        type,
        mime: value.blob.type,
        size: value.blob.size,
        filename: value.filename,
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(value.blob);
      a.download = `qa.${type}`;
      a.click();
    }
    element.remove();
    return results;
  });
  for (const row of outputs) {
    expect(row.size).toBeGreaterThan(1000);
    expect(row.filename.endsWith(`.${row.type}`)).toBe(true);
  }
  expect(outputs.map((r) => r.mime)).toEqual([
    "image/png",
    "image/svg+xml",
    "application/pdf",
  ]);
});

test("Wahlframe SVG and PDF downloads use the selected format", async ({
  page,
}, info) => {
  await result(page);
  await page.getByRole("button", { name: "Export PNG", exact: true }).click();
  const dialog = page.locator(".pm-dialog[open]");
  await dialog.getByRole("button", { name: "PDF", exact: true }).click();
  await expect(dialog.locator(".pm-export-preview img")).toBeVisible();
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: /Download/ }).click();
  const pdf = await download;
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  const path = info.outputPath("wahlframe.pdf");
  await pdf.saveAs(path);
  const bytes = await readFile(path);
  expect(bytes.subarray(0, 8).toString()).toBe("%PDF-1.4");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
  }).promise;
  expect(document.numPages).toBe(1);
  const viewport = (await document.getPage(1)).getViewport({ scale: 1 });
  expect(viewport.width / viewport.height).toBeCloseTo(1, 2);
  await document.destroy();
  await dialog.getByRole("button", { name: "SVG", exact: true }).click();
  await expect(dialog.locator(".pm-export-preview img")).toBeVisible();
  const next = page.waitForEvent("download");
  await dialog.getByRole("button", { name: /Download/ }).click();
  const svg = await next;
  expect(svg.suggestedFilename()).toMatch(/\.svg$/);
  const contents = await readFile(await svg.path(), "utf8");
  expect(contents).toContain("<text");
  expect(contents).toContain("<svg");
  expect(contents).not.toContain("<script");
});
