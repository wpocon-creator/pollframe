import { test, expect } from "@playwright/test";
const base = "/?view=studio&lang=en-GB";
test.beforeEach(async ({ page }) =>
  page.addInitScript(() =>
    localStorage.setItem("pollframe-notice-dismissed:studio-guide-v1", "yes"),
  ),
);
test("combined search, Enter and return to all designs leave a clean gallery", async ({
  page,
}) => {
  await page.goto(base);
  const search = page.getByRole("searchbox", { name: "Search templates" });
  await search.fill("moden, history");
  await search.press("Enter");
  await expect(search).not.toBeFocused();
  await expect(page.locator('[id^="studio-history-"]').first()).toBeVisible();
  expect(await page.locator('[id^="studio-poll-"]').count()).toBe(0);
  await page.locator('[id^="studio-history-"]').first().click();
  await page
    .getByRole("button", { name: "← All designs", exact: true })
    .click();
  await expect(search).toHaveValue("");
  await expect(page.locator("#studio-poll-classic")).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBeLessThan(3);
});
test("text roles change real preview styles while source words remain protected", async ({
  page,
}, info) => {
  await page.goto(base + "&template=poll-classic&editor=1&workspace=edit");
  const panel = page.locator(".studio-inspector-panel");
  await expect(panel).toBeVisible();
  const svg = page.locator(".studio-current-preview-image > svg");
  await expect(svg).toBeVisible();
  const select = panel.getByRole("combobox", { name: "Text element" });
  await select.click();
  await page.getByRole("option", { name: "Subtitle", exact: true }).click();
  await panel
    .getByRole("textbox", { name: "Subtitle", exact: true })
    .fill("An editorial subtitle");
  await expect(svg).toContainText("An editorial subtitle");
  await panel.getByRole("button", { name: "Italic", exact: true }).click();
  await expect
    .poll(() =>
      svg
        .locator('text[data-text-role="subtitle"]')
        .first()
        .evaluate((n) => getComputedStyle(n).fontStyle),
    )
    .toBe("italic");
  await select.click();
  await page
    .getByRole("option", { name: "Sources & dates", exact: true })
    .click();
  const before = await svg
    .locator('text[data-text-role="sources"]')
    .allTextContents();
  await panel.getByRole("button", { name: "Italic", exact: true }).click();
  await expect
    .poll(() =>
      svg
        .locator('text[data-text-role="sources"]')
        .first()
        .evaluate((n) => getComputedStyle(n).fontStyle),
    )
    .toBe("italic");
  expect(
    await svg.locator('text[data-text-role="sources"]').allTextContents(),
  ).toEqual(before);
  expect(await panel.locator("textarea:visible").count()).toBe(0);
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Redo", exact: true }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Reset style", exact: true }),
  ).toHaveCount(1);
  await panel.getByRole("button", { name: "Reset style", exact: true }).click();
  await expect(svg).toContainText("An editorial subtitle");
  await page.screenshot({ path: info.outputPath("text-roles.png") });
});
test("portable style import, actions, review and application save a real design", async ({
  page,
}, info) => {
  await page.goto(base);
  await page.getByRole("button", { name: "My designs", exact: true }).click();
  await page.getByRole("button", { name: "Styles", exact: true }).click();
  const file = JSON.stringify({
    type: "pollframe-style",
    version: 1,
    name: "Newsroom blue",
    style: {
      background: "#e6eef9",
      font: "lora",
      titleSize: 40,
      subtitleSize: 25,
      textStyles: JSON.stringify({ sources: { italic: true } }),
    },
  });
  await page
    .locator(".studio-style-import input")
    .setInputFiles({
      name: "newsroom.pollframe-style",
      mimeType: "application/json",
      buffer: Buffer.from(file),
    });
  const tile = page
    .locator(".studio-library-grid button")
    .filter({ hasText: "Newsroom blue" })
    .first();
  await expect(tile).toBeVisible();
  await tile.click();
  let dialog = page.getByRole("dialog", { name: "Newsroom blue", exact: true });
  await expect(
    dialog.getByRole("button", { name: /Apply to a design/ }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: /Export \/ send/ }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pollframe-style$/);
  await dialog.getByRole("button", { name: /Edit style/ }).click();
  await expect(page.getByRole("textbox", { name: /Style name/ })).toHaveValue(
    "Newsroom blue",
  );
  await page.getByRole("button", { name: /Advanced options/ }).click();
  await page.getByRole("searchbox", { name: "Find a setting" }).fill("sorces");
  await expect(page.getByRole("dialog")).toContainText("Sources & dates");
  await page.screenshot({ path: info.outputPath("style-review.png") });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await tile.click();
  dialog = page.getByRole("dialog", { name: "Newsroom blue", exact: true });
  await dialog.getByRole("button", { name: /Apply to a design/ }).click();
  dialog = page.getByRole("dialog", {
    name: "Apply style to a design",
    exact: true,
  });
  await dialog.getByRole("searchbox").fill("Pollframe Original");
  await dialog.locator(".studio-style-card").first().click();
  await page
    .getByRole("textbox", { name: "Design name", exact: true })
    .fill("Shared newsroom poll");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save design", exact: true })
    .click();
  await expect(page.locator(".studio-library")).toContainText(
    "Shared newsroom poll",
  );
  await expect(page.getByText("Import backup", { exact: true })).toHaveCount(0);
});
