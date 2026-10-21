import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("reconnecting refetches polling and replaces the old visible publication date", async ({
  page,
}) => {
  const summary = JSON.parse(
    await readFile(new URL("../public/regions.json", import.meta.url), "utf8"),
  );
  const polling = JSON.parse(
    await readFile(
      new URL("../public/data/bundestag.json", import.meta.url),
      "utf8",
    ),
  );
  let refreshed = false,
    summaryRequests = 0,
    pollRequests = 0;
  await page.route("**/regions.json", async (route) => {
    summaryRequests++;
    const data = structuredClone(summary);
    if (refreshed)
      data.regions.find((r) => r.slug === "bundestag").latestDate =
        "2026-10-17";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.route("**/data/bundestag.json", async (route) => {
    pollRequests++;
    const data = structuredClone(polling);
    if (refreshed) data.polls.at(-1).date = "2026-10-17";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.goto("/?lang=de");
  const widget = page
    .locator(".germany-country-overview a")
    .filter({
      has: page.getByRole("heading", {
        name: "Aktuelle Sonntagsfrage zur Bundestagswahl",
        exact: true,
      }),
    });
  await expect(widget).toContainText("8. Sept. 2026");
  refreshed = true;
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
  });
  await expect.poll(() => summaryRequests).toBeGreaterThanOrEqual(2);
  await expect.poll(() => pollRequests).toBeGreaterThanOrEqual(2);
  await expect(widget).toContainText("17. Okt. 2026");
  await expect(widget).not.toContainText("8. Sept. 2026");
});
