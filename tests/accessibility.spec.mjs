import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/?region=bundestag&lang=de",
  "/?country=uk&lang=en-GB",
  "/?country=es&view=spain-issues&lang=es",
  "/?view=approval&country=de&lang=de",
  "/?page=redaktion&lang=de",
  "/?page=kontakt&lang=en-GB",
  "/?page=bug-report&lang=en-GB",
];

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts?.ready);
  await expect(page.locator("main")).toBeVisible();
}

test("public routes retain a named, unambiguous document structure", async ({ page }) => {
  for (const route of routes) {
    await page.goto(route);
    await settle(page);
    const audit = await page.evaluate(() => {
      const visible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      };
      const ids = [...document.querySelectorAll("[id]")].map((element) => element.id).filter(Boolean);
      const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
      const unnamed = [...document.querySelectorAll("button,a[href],input,select,textarea,summary")]
        .filter(visible)
        .filter((element) => {
          if (element.matches('input[type="hidden"]')) return false;
          const labelledBy = element.getAttribute("aria-labelledby")?.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ") ?? "";
          const nativeLabel = element.labels ? [...element.labels].map((label) => label.textContent).join(" ") : "";
          return ![element.getAttribute("aria-label"), labelledBy, nativeLabel, element.textContent, element.getAttribute("title"), element.getAttribute("placeholder"), element.getAttribute("value")].some((value) => value?.trim());
        })
        .map((element) => `${element.tagName.toLowerCase()}.${element.className || ""}`);
      return {
        duplicateIds,
        unnamed,
        h1: document.querySelectorAll("main h1").length,
        lang: document.documentElement.lang,
        main: document.querySelectorAll("main").length,
      };
    });
    expect(audit.duplicateIds, `${route} has duplicate ids`).toEqual([]);
    expect(audit.unnamed, `${route} has unnamed visible controls`).toEqual([]);
    expect(audit.h1, `${route} needs exactly one main heading`).toBe(1);
    expect(audit.main, `${route} needs exactly one main landmark`).toBe(1);
    expect(audit.lang, `${route} needs a document language`).toMatch(/^(de|en|es)(-|$)/);
  }
});

test("keyboard focus enters the interface and modal focus returns to its trigger", async ({ page }) => {
  await page.goto("/?region=bundestag&lang=de");
  await settle(page);
  await page.keyboard.press("Tab");
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
  const settings = page.getByRole("button", { name: /Einstellungen|Settings/i });
  await settings.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(settings).toBeFocused();
});
