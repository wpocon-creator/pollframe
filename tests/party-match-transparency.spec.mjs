import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("concise screens retain three accessible levels of transparency and a private evidence download", async ({
  page,
}, info) => {
  await page.goto("/?view=party-match&lang=en-GB");
  await expect(page.locator(".pm-breadcrumb")).toContainText("before the 2025");
  await expect(page.locator(".pm-intro")).not.toContainText(
    "confidence interval",
  );
  await expect(page.locator(".pm-intro")).not.toContainText(
    "Missing evidence leaves",
  );
  await expect(page.locator(".pm-intro")).toContainText(
    "Answers stay only in this tab",
  );
  await page.screenshot({
    path: info.outputPath("intro-concise.png"),
    fullPage: true,
  });
  const mainInfo = page
    .locator(".pm-toolbar")
    .getByRole("button", { name: "Sources & method" });
  await mainInfo.click();
  const dialog = page.getByRole("dialog", { name: "Info", exact: true });
  await expect(dialog).toContainText("not current government policy");
  await dialog
    .locator("summary")
    .filter({ hasText: "Sources & editorial interpretation" })
    .click();
  await expect(dialog.getByText(/not every party/)).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "CDU/CSU", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: /Download this round/ }).click();
  const file = await download;
  const receipt = JSON.parse(await readFile(await file.path(), "utf8"));
  expect(receipt.questions).toHaveLength(16);
  expect(receipt).not.toHaveProperty("answers");
  expect(receipt).not.toHaveProperty("results");
  await dialog
    .locator("summary")
    .filter({ hasText: "Calculation in detail" })
    .click();
  await expect(
    dialog.getByText(/For each party, achieved points/),
  ).toBeVisible();
  await dialog
    .locator("summary")
    .filter({ hasText: "Privacy" })
    .click();
  await expect(
    dialog.getByText(/Individual answers stay in this tab/),
  ).toBeVisible();
  await expect(
    dialog.getByText(/not a substitute for independent human expert review/),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(mainInfo).toBeFocused();
  await page.locator('.pm-lengths input[value="8"]').check();
  await page.locator(".pm-start-card > .pm-primary").click();
  await expect(page.locator(".pm-question-card .pm-context")).toHaveCount(0);
  const qInfo = page.getByRole("button", { name: "Question info: Tax" });
  await qInfo.click();
  await expect(dialog).toContainText("accumulated wealth, not annual income");
  await expect(dialog).toContainText("7 / 7 documented");
  // Moving context into Info must not remove the clickable glossary terms.
  const term = dialog.getByRole("button", {
    name: "Explain term: wealth tax",
    exact: true,
  });
  await term.click();
  await expect(
    page.getByRole("dialog", { name: "Wealth tax", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(term).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(qInfo).toBeFocused();
  await page.screenshot({
    path: info.outputPath("question-concise.png"),
    fullPage: true,
  });
  for (let i = 0; i < 8; i++) {
    await page.locator(".pm-choices label").first().click();
    await page.locator(".pm-question-actions .pm-primary").click();
  }
  await expect(page.locator(".pm-results > .pm-view-heading")).toContainText(
    "Each party shows how many of your answers were compared",
  );
  await expect(page.locator(".pm-party-coverage")).toHaveCount(7);
  await page.screenshot({
    path: info.outputPath("results-concise.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Which questions count?" }).click();
  await expect(dialog).toContainText("not a probability");
  await dialog
    .locator("summary")
    .filter({ hasText: "Which questions count?" })
    .click();
  await expect(dialog.locator(".pm-coverage li")).toHaveCount(8);
  await page.keyboard.press("Escape");
});

for (const locale of ["de", "es"])
  test(`info stays within the screen with large text in ${locale}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 360, height: 700 });
    await page.goto(`/?view=party-match&lang=${locale}`);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "26px";
      document.documentElement.dataset.theme = "dark";
    });
    await page.locator(".pm-start-card > .pm-primary").click();
    await page
      .locator(".pm-question-card .graph-info-popover > summary")
      .click();
    const dialog = page.getByRole("dialog", { name: "Info", exact: true });
    const box = await dialog.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        vw: innerWidth,
        vh: innerHeight,
        overflow: el.scrollWidth - el.clientWidth,
        scrollable: el.scrollHeight > el.clientHeight,
      };
    });
    expect(Math.abs(box.x + box.w / 2 - box.vw / 2)).toBeLessThan(3);
    expect(Math.abs(box.y + box.h / 2 - box.vh / 2)).toBeLessThan(3);
    expect(box.h).toBeLessThanOrEqual(box.vh * 0.75 + 1);
    expect(box.overflow).toBeLessThan(2);
    expect(box.scrollable).toBe(true);
    await expect(dialog).not.toContainText("Missing evidence");
    const before = await page.evaluate(() => scrollY);
    await dialog.hover();
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(before);
    await expect
      .poll(() =>
        dialog.evaluate((el) => {
          const outer = el.getBoundingClientRect(),
            header = el
              .querySelector(":scope > header")
              .getBoundingClientRect();
          return Math.abs(header.top - outer.top);
        }),
      )
      .toBeLessThanOrEqual(2);
    await page.screenshot({
      path: info.outputPath(`info-${locale}-large.png`),
    });
    await page.keyboard.press("Escape");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });
