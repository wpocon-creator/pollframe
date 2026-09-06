import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("party portraits load on demand and still restore focus", async ({ page }) => {
  const portraits = [];
  page.on("request", (request) => { if (/party-profile-content-.*\.js/.test(request.url())) portraits.push(request.url()); });
  await page.goto("/?region=bundestag&lang=de");
  const trigger = page.locator('.results-card [data-party-profile="de:spd"]').first();
  await expect(trigger).toBeVisible();
  expect(portraits).toHaveLength(0);
  await expect(page.locator(".poll-table-body")).toHaveCount(0);
  await trigger.click();
  await expect(page.locator(".party-profile-modal")).toContainText("Sozialdemokratische Partei Deutschlands");
  expect(portraits).toHaveLength(1);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.locator(".party-profile-policies li")).toHaveCount(4);
  expect(portraits).toHaveLength(1);
});

test("closing a loading portrait does not reopen it when its code arrives", async ({ page }) => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route(/party-profile-content-.*\.js/, async (route) => { await gate; await route.continue(); });
  await page.goto("/?region=bundestag&lang=de");
  const trigger = page.locator('.results-card [data-party-profile="de:spd"]').first();
  await trigger.click();
  await expect(page.getByRole("status")).toContainText("Parteiporträt wird geladen");
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  release();
  await expect(page.locator(".party-profile-modal")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.locator(".party-profile-policies li")).toHaveCount(4);
});
