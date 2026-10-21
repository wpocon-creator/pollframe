import { test, expect } from "@playwright/test";

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
async function records(page) {
  return page.evaluate(async () => {
    const { listPrivateResults } = await import("/src/party-match-storage.js");
    return listPrivateResults();
  });
}
test("result Studio: styles, protected values, explicit private saving, reopen, delete and return to answers", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await result(page);
  const scores = await page.locator(".pm-score").allTextContents();
  await page
    .getByRole("button", { name: "Design in Studio", exact: true })
    .first()
    .click();
  await expect(page.locator(".pm-studio-preview img")).toBeVisible();
  await expect(page.locator(".pm-studio-editor")).toHaveCount(0);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  expect(await records(page)).toEqual([]);
  await page.getByRole("button", { name: "Editorial", exact: true }).click();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("My policy comparison");
  await page
    .getByLabel("Subtitle", { exact: true })
    .fill("An example result — programme edition 2025");
  await page.getByRole("button", { name: /Change typeface/ }).click();
  await page.getByRole("dialog", { name: "Typeface library" }).getByRole("button", { name: /Georgia/ }).click();
  await page
    .getByRole("button", { name: "Back to result", exact: true })
    .click();
  await expect(page.locator(".pm-score")).toHaveText(scores);
  await page
    .getByRole("button", { name: "Design in Studio", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "My policy comparison",
  );
  await page.getByRole("button", { name: "Chart", exact: true }).click();
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("A private local result");
  await page
    .getByRole("button", { name: "Save on this device", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("political views");
  expect(await records(page)).toEqual([]);
  await dialog.getByLabel("Graphic name").fill("Example local graphic");
  await dialog
    .getByRole("button", { name: "Save on this device", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Result saved");
  const saved = await records(page);
  expect(saved).toHaveLength(1);
  expect(saved[0].document).not.toHaveProperty("answers");
  expect(saved[0].document.rows[0]).not.toHaveProperty("comparisons");
  expect(page.url()).not.toContain("score=");
  await page.screenshot({
    path: info.outputPath("result-studio.png"),
    fullPage: true,
  });
  await page
    .locator("main")
    .getByRole("link", { name: "Studio", exact: true })
    .click();
  await page.getByRole("button", { name: "My designs", exact: true }).click();
  const library = page.locator(".pm-private-library");
  await expect(library).toContainText("Example local graphic");
  await library
    .getByRole("button", { name: "Example local graphic", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "A private local result",
  );
  await page
    .getByRole("button", { name: "Save on this device", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByLabel("Graphic name")).toHaveValue(
    "Example local graphic",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Export PNG", exact: true }).click();
  await expect(page.locator(".pm-export-preview img")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator(".pm-studio-preview")).toHaveCount(0);
  await expect(page.locator(".pm-private-library")).toContainText(
    "Example local graphic",
  );
  await page
    .locator(".pm-private-library")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect.poll(() => records(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test("private result editor fits narrow screens, large text, all formats and dark theme", async ({
  page,
}, info) => {
  await result(page);
  await page
    .getByRole("button", { name: "Design in Studio", exact: true })
    .first()
    .click();
  for (const width of [320, 390, 820, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "28px";
      document.documentElement.dataset.theme = "dark";
    });
    if (width < 768) {
      await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
      await expect(page.locator('.pm-studio-editor')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      continue;
    }
    if (!(await page.locator('.pm-studio-editor').count())) await page.getByRole('button',{name:'Edit',exact:true}).click();
    for (const format of ["Square", "Portrait", "Landscape"]) {
      await page.getByRole("combobox", { name: "Format", exact: true }).click();
      await page.getByRole("option", { name: format, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("result-studio-phone-large-dark.png"),
    fullPage: true,
  });
});
