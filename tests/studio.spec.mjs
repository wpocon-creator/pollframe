import { test, expect } from "@playwright/test";
import { STUDIO_TEMPLATES } from "../src/studio-model.js";
test.use({ serviceWorkers: "block" });
// Every renderer, PNG, embed and recipe round-trip is covered in the focused
// studio-expanded/history/editor tests. These checks cover the entry and gallery.
test("studio is lazy, and entry from the existing PNG dialog preserves chart context", async ({
  page,
}) => {
  const loadedStudioAssets = [];
  page.on("request", (request) => {
    if (/\/assets\/graphic-studio-/.test(request.url()))
      loadedStudioAssets.push(request.url());
  });
  await page.goto(
    "/?region=bundestag&lang=de&share=1&range=five&parties=1,2&pollsters=1,2&events=",
  );
  await expect(page.locator(".results-card .result-row").first()).toBeVisible();
  expect(loadedStudioAssets).toEqual([]);
  await page.locator(".results-card .png-export-button").click();
  const modal = page.locator(".png-options-modal");
  await expect(modal).toBeVisible();
  const entry = modal.getByRole("link", { name: /Zum Pollframe Studio/ });
  const href = await entry.getAttribute("href");
  const params = new URL(href, "http://127.0.0.1:4174").searchParams;
  expect(params.get("pollsters")).toBe("1,2");
  expect(params.get("parties")).toBe("1,2");
  expect(params.get("range")).toBe("five");
  expect(params.get("events")).toBe("");
  const bounds = await modal.boundingBox();
  const entryBounds = await entry.boundingBox();
  expect(entryBounds.x).toBeGreaterThanOrEqual(bounds.x);
  expect(entryBounds.x + entryBounds.width).toBeLessThanOrEqual(
    bounds.x + bounds.width + 1,
  );
  await entry.click();
  await expect(page.locator(".studio-template-card")).toHaveCount(13);
  await expect(page.locator(".studio-return")).toHaveCount(0);
  expect(loadedStudioAssets.length).toBeGreaterThan(0);
});

test("full gallery uses all indexed templates, translated filters and honest fallback", async ({
  page,
}) => {
  await page.goto("/?view=studio&lang=de");
  await expect(page.locator(".studio-template-card")).toHaveCount(
    STUDIO_TEMPLATES.length,
  );
  await page
    .locator(".studio-topic-tabs")
    .getByRole("button", { name: "Sitzmodell", exact: true })
    .click();
  await expect(page.locator(".studio-template-card")).toHaveCount(8);
  await page.getByRole("searchbox").fill("xyz-not-a-template");
  await expect(page.locator(".studio-gallery-meta")).toContainText(
    "Kein direkter Treffer",
  );
  await expect(page.locator(".studio-template-card")).toHaveCount(8);
  await page.getByRole("searchbox").fill("");
  await page
    .getByRole("combobox", { name: "Sprache", exact: true })
    .selectOption("es");
  await expect(page.locator(".studio-topic-tabs")).toContainText(
    "Modelo de escaños",
  );
  await expect(
    page.getByRole("combobox", { name: "Country", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("inherited historical source settings survive editing and reload", async ({
  page,
}) => {
  await page.goto(
    "/?view=studio&editor=1&workspace=edit&template=history-wide&lang=de&parties=1,2&pollsters=1,2&events=national&range=custom&from=2020-01-01&to=2024-01-01&mode=polls",
  );
  await expect(page.locator(".studio-current-preview-image>svg")).toBeVisible({
    timeout: 35000,
  });
  const tools = page.locator(".studio-tools");
  await tools.getByRole("button", { name: "Daten", exact: true }).click();
  await expect(tools.getByLabel("Von", { exact: true })).toHaveValue(
    "2020-01-01",
  );
  await expect(
    tools.getByRole("combobox", { name: "Reihendarstellung", exact: true }),
  ).toHaveValue("polls");
  await tools
    .getByRole("combobox", { name: "Reihendarstellung", exact: true })
    .selectOption("both");
  await page.reload();
  const params = new URL(page.url()).searchParams;
  expect(params.get("mode")).toBe("both");
  expect(params.get("pollsters")).toBe("1,2");
  expect(params.get("events")).toBe("national");
  expect(params.get("parties")).toBe("1,2");
});
