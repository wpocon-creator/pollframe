import { test, expect } from "@playwright/test";
const url =
  "/?view=studio&topic=current&country=de&lang=de&template=poll-wide&editor=1&workspace=edit";
test("editor selection, scrolling, undo, fonts, dialogs and saved designs", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop");
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  const art = page.locator(".studio-current-preview-image svg");
  await expect(art).toBeVisible();
  await expect(page.locator(".studio-tools")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Schriftart", exact: true })
    .selectOption("dm-sans");
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.fonts].some(
          (f) => f.family === "PF DM Sans" && f.status === "loaded",
        ),
      ),
    )
    .toBe(true);
  const title = art.locator("[data-editor-target=text]").first();
  await title.dblclick();
  const input = page.getByRole("textbox", { name: "Text direkt bearbeiten" });
  await input.fill("Meine politische Analyse");
  await input.press("Control+Enter");
  await expect(title).toHaveText("Meine politische Analyse");
  await page.locator(".studio-context-toolbar strong").click();
  await page.keyboard.press("Control+z");
  await expect(title).not.toHaveText("Meine politische Analyse");
  const before = await art.boundingBox();
  await page.locator(".studio-tools").hover();
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(250);
  const after = await art.boundingBox();
  expect(Math.abs(before.y - after.y)).toBeLessThan(2);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page
    .getByRole("button", { name: "PNG herunterladen", exact: true })
    .click();
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toBeVisible();
  const b = await dialog.boundingBox();
  expect(b.height).toBeLessThanOrEqual(675);
  expect(Math.abs(b.y + b.height / 2 - 450)).toBeLessThan(3);
  await dialog.getByRole("button", { name: "Schließen" }).click();
  await page.getByRole("button", { name: "Embed", exact: true }).click();
  await expect(page.locator("dialog[open] textarea")).toContainText("dm-sans");
  await page
    .locator("dialog[open]")
    .getByRole("button", { name: "Schließen" })
    .click();
  await page
    .getByRole("textbox", { name: "Designname" })
    .fill("Mein gespeichertes Design");
  await page
    .getByRole("button", { name: "Design speichern", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Meine Designs gespeichert" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/studio-editor-desktop.png",
    fullPage: true,
  });
  await page.goto("/?view=studio&topic=current&lang=de");
  await page
    .getByRole("button", { name: "Meine Designs", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Mein gespeichertes Design",
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("phone direct URL does not expose full editor", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes("iphone-13-chromium"));
  await page.goto(url);
  await expect(page.locator(".studio-current-preview-image svg")).toBeVisible();
  await expect(page.locator(".studio-tools")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Bearbeiten", exact: true }),
  ).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("workspace")).toBe("preview");
});
test("dark tablet workspace keeps preview and tools side by side", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes("ipad-mini-chromium"));
  await page.goto(url + "&theme=dark");
  await expect(page.locator(".studio-tools")).toBeVisible();
  await expect(page.locator(".studio-current-preview-image svg")).toBeVisible();
  const a = await page.locator(".studio-current-preview-image").boundingBox(),
    b = await page.locator(".studio-tools").boundingBox();
  expect(a.x + a.width).toBeLessThanOrEqual(b.x + 1);
  expect(a.height).toBeGreaterThan(200);
  await page.screenshot({
    path: "test-results/studio-editor-tablet.png",
    fullPage: true,
  });
});
test("history event layers, buffered dates, drag snapping and corner transparency", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "chromium-desktop");
  await page.goto(
    url
      .replace("topic=current", "topic=history")
      .replace("poll-wide", "history-original") +
      "&range=five&theme=dark&cornerRadius=60",
  );
  const art = page.locator(".studio-current-preview-image svg");
  await expect(art).toBeVisible();
  const title = art.locator("[data-editor-target=text]").first(),
    box = await title.boundingBox();
  await page.mouse.move(box.x + 20, box.y + 10);
  await page.mouse.down();
  const right = await art.evaluate((svg) => {
    const p = new DOMPoint(900, 120).matrixTransform(svg.getScreenCTM());
    return { x: p.x, y: p.y };
  });
  await page.mouse.move(right.x, right.y, { steps: 8 });
  await page.mouse.up();
  await expect(title).toHaveAttribute("text-anchor", "end");
  await page.keyboard.press('Control+z');
  await expect(title).toHaveAttribute('text-anchor','start');
  await page
    .getByRole("navigation", { name: "Werkzeuge" })
    .getByRole("button", { name: "Daten", exact: true })
    .click();
  await page
    .locator(".studio-tools select")
    .filter({ has: page.locator("option[value=custom]") })
    .selectOption("custom");
  const start = page.getByLabel("Von", { exact: true }),
    end = page.getByLabel("Bis", { exact: true });
  await start.fill("2023-01-01");
  await end.fill("2024-01-01");
  const before = new URL(page.url()).searchParams.get("start");
  expect(before).not.toBe("2023-01-01");
  await page
    .getByRole("button", { name: "Zeitraum anwenden", exact: true })
    .click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("start"))
    .toBe("2023-01-01");
  await page
    .locator(".studio-tools summary")
    .filter({ hasText: /^Ereignisse$/ })
    .click();
  await page.getByRole("slider", { name: /Ereignis-Ebenen/ }).fill("4");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("historyLayers"))
    .toBe("4");
  await page
    .locator(".studio-event-controls")
    .getByRole("button", { name: "Keine", exact: true })
    .click();
  await expect(art.locator("[data-event-id]")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/studio-editor-events.png",
    fullPage: true,
  });
});
