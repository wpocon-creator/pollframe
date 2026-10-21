import { test, expect } from "@playwright/test";
async function result(page) {
  await page.goto("/?view=party-match&lang=en-GB");
  await page.locator('.pm-lengths input[value="8"]').check();
  await page.locator(".pm-start-card > .pm-primary").click();
  for (let i = 0; i < 8; i++) {
    await page.locator(".pm-choices label").first().click();
    await page.locator(".pm-question-actions .pm-primary").click();
  }
}
test("temporary removal hides studies and arguments while preserving cited positions", async ({
  page,
}, info) => {
  await page.goto("/?view=party-match&lang=en-GB");
  await page.locator(".pm-start-card > .pm-primary").click();
  await page.locator(".pm-question-card .pm-arguments-trigger").click();
  const dialog = page.getByRole("dialog", { name: "Positions & sources" }),
    before = await page.evaluate(() => scrollY);
  await expect(
    dialog.getByRole("button", { name: "What research says", exact: true }),
  ).toHaveCount(0);
  await expect(dialog.locator(".pm-research")).toHaveCount(0);
  await expect(dialog.locator("article[data-party]")).toHaveCount(7);
  await expect(dialog.locator("article[data-party] a")).toHaveCount(7);
  await expect(dialog).not.toContainText("What they argue");
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await page.screenshot({ path: info.outputPath("research.png") });
});
test("results omit the removed two-party block and end with the personal comparison", async ({
  page,
}) => {
  await result(page);
  await expect(page.locator(".pm-pairwise")).toHaveCount(0);
  await expect(page.locator(".pm-result-insights > section").last()).toContainText("You & one party");
});

test("closed evidence is not built until requested, and reopening preserves the selected source", async ({
  page,
}) => {
  await result(page);
  await expect(page.locator(".pm-party-body")).toHaveCount(0);
  const party = page.locator(".pm-party").first();
  await party.locator(":scope > summary").click();
  await expect(page.locator(".pm-party-body")).toHaveCount(1);
  await expect(party.locator(".pm-evidence")).toHaveCount(8);
  await expect(party.locator(".pm-evidence > div")).toHaveCount(0);
  const source = party.locator(".pm-evidence").first();
  await source.locator("summary").click();
  await expect(source.locator(".pm-source-citation a")).toBeVisible();
  await party.locator(":scope > summary").click();
  await expect(page.locator(".pm-party-body")).toHaveCount(0);
  await party.locator(":scope > summary").click();
  await expect(source.locator(".pm-source-citation a")).toBeVisible();
});
test("clearing answers after returning from Studio also clears the held result draft", async ({
  page,
}) => {
  await result(page);
  await page
    .getByRole("button", { name: "Design in Studio", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Back to result", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Clear answers", exact: true })
    .click();
  await page.getByRole("dialog").locator(".pm-primary").click();
  await expect(page.locator(".pm-intro")).toBeVisible();
  const held = await page.evaluate(async () => {
    const { getResultDraft, takeQuestionnaire } = await import(
      "/src/party-match-storage.js"
    );
    return { draft: getResultDraft(), questionnaire: takeQuestionnaire() };
  });
  expect(held).toEqual({ draft: null, questionnaire: null });
  await page.locator(".pm-start-card > .pm-primary").click();
  await expect(page.locator(".pm-choices input:checked")).toHaveCount(0);
});
test("blocked device storage gives an error inside the save dialog while PNG export still works", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "indexedDB", {
      value: {
        open() {
          throw Error("Storage blocked for test");
        },
      },
      configurable: true,
    }),
  );
  await result(page);
  await page
    .getByRole("button", { name: "Design in Studio", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Save on this device", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Save on this device", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("Could not save");
  await expect(
    dialog.getByRole("button", { name: "Save on this device", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Export PNG", exact: true }).click();
  await expect(page.locator(".pm-export-preview img")).toBeVisible();
});
