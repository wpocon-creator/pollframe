import { expect, test } from "@playwright/test";

// Pairwise coverage catches most layout regressions without multiplying every
// route by every language, theme and device. Chromium desktop and the touch
// iPhone profile cover the two layout engines used by Pollframe's CSS; the
// smaller focused browser suites continue to cover Firefox and WebKit.
const auditProjects = new Set(["chromium-desktop", "iphone-13-chromium"]);
const cases = [
  { route: "/", theme: "light", label: "Germany overview" },
  { route: "/?region=bundestag&lang=de", theme: "dark", label: "Bundestag history" },
  { route: "/?view=map&lang=en-US", theme: "light", label: "Germany map" },
  { route: "/?view=approval&country=de&lang=de", theme: "dark", label: "approval history" },
  { route: "/?country=uk&lang=en-GB", theme: "light", label: "UK overview" },
  { route: "/?region=uk-westminster&lang=en-US", theme: "dark", label: "UK history" },
  { route: "/?country=uk&view=uk-map&lang=de", theme: "light", label: "UK map" },
  { route: "/?country=es&lang=es", theme: "dark", label: "Spain overview" },
  { route: "/?region=spain-congress&lang=de", theme: "light", label: "Spain history" },
  { route: "/?country=es&view=spain-issues&lang=es", theme: "dark", label: "Spain issues" },
  { route: "/?view=watchlist&country=de&lang=de", theme: "light", label: "watchlist" },
  { route: "/?page=kontakt&lang=en-GB", theme: "dark", label: "contact" },
];

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts?.ready);
  await expect(page.locator("main")).toBeVisible();
  await page.waitForTimeout(80);
}

async function auditVisibleLayout(page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    const ignoredScroller = ".chart-wrap,.party-selector,.line-legend,.poll-table-scroll,.code-label,.static-embed-preview,.watchlist-strip,.approval-workbench>.approval-country-key";
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 1 && rect.height > 1 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0;
    };
    const describe = (element) => {
      const className = typeof element.className === "string" ? element.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
      const text = element.textContent?.trim().replace(/\s+/g, " ").slice(0, 55) ?? "";
      return `${element.tagName.toLowerCase()}${className ? `.${className}` : ""}${text ? ` “${text}”` : ""}`;
    };
    const all = [...document.querySelectorAll("body *")].filter(visible);
    const issues = [];

    if (document.documentElement.scrollWidth > viewportWidth + 2) {
      issues.push(`document is ${document.documentElement.scrollWidth - viewportWidth}px wider than the viewport`);
    }

    for (const element of all) {
      const rect = element.getBoundingClientRect();
      if (!element.closest(ignoredScroller) && (rect.left < -2 || rect.right > viewportWidth + 2)) {
        issues.push(`${describe(element)} leaves the viewport horizontally (${Math.round(rect.left)}…${Math.round(rect.right)})`);
      }
    }

    const textCandidates = [...document.querySelectorAll("h1,h2,h3,h4,p,button,a,summary,label,strong,small,dt,dd")]
      .filter(visible)
      .filter((element) => !element.closest(ignoredScroller));
    for (const element of textCandidates) {
      const style = getComputedStyle(element);
      const deliberatelyShortened = style.textOverflow === "ellipsis" || style.webkitLineClamp !== "none" || element.hasAttribute("title");
      if (deliberatelyShortened) continue;
      const horizontalClip = ["hidden", "clip"].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 3;
      const verticalClip = ["hidden", "clip"].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 3;
      if (horizontalClip || verticalClip) issues.push(`${describe(element)} clips visible text`);
    }

    const activeLayer = document.querySelector(".png-options-modal")
      ?? document.querySelector(".embed-modal")
      ?? document.querySelector(".graph-info-popover[open] .graph-info-card")
      ?? document.querySelector(".party-profile-modal,.party-modal,.side-panel");
    const controlRoot = activeLayer ?? document;
    const controls = [...controlRoot.querySelectorAll("button,a[href],summary,input:not([type=hidden]),select,textarea")]
      .filter(visible)
      .filter((element) => !element.closest("[inert],[aria-hidden='true']"))
      .filter((element) => !element.matches(".graph-info-backdrop"))
      .filter((element) => !element.closest("svg,.poll-chart,.germany-map,.spain-map-svg,.uk-map-svg"))
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.bottom > 0 && rect.top < viewportHeight);
    for (let left = 0; left < controls.length; left += 1) {
      for (let right = left + 1; right < controls.length; right += 1) {
        const a = controls[left];
        const b = controls[right];
        if (a.element.contains(b.element) || b.element.contains(a.element)) continue;
        const chromeA = a.element.closest(".site-header,.mobile-app-nav");
        const chromeB = b.element.closest(".site-header,.mobile-app-nav");
        if ((chromeA || chromeB) && chromeA !== chromeB) continue;
        const floatingA = a.element.closest(".select-menu,.multi-menu,.header-country-popover");
        const floatingB = b.element.closest(".select-menu,.multi-menu,.header-country-popover");
        if ((floatingA || floatingB) && floatingA !== floatingB) continue;
        const overlapX = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left));
        const overlapY = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top));
        if (overlapX > 3 && overlapY > 3) issues.push(`${describe(a.element)} overlaps ${describe(b.element)} by ${Math.round(overlapX)}×${Math.round(overlapY)}px`);
      }
    }

    if (matchMedia("(pointer: coarse)").matches) {
      const compactTargets = controls.filter(({ element, rect }) => {
        if (!element.matches("button,summary,.header-button,.icon-button") || element.closest("footer,.poll-table,.event-key-list")) return false;
        if (element.matches(".party-info-trigger")) return rect.height < 28;
        return rect.width < 28 || rect.height < 28;
      });
      for (const { element, rect } of compactTargets) issues.push(`${describe(element)} is only ${Math.round(rect.width)}×${Math.round(rect.height)}px on touch`);
    }

    return [...new Set(issues)].slice(0, 30);
  });
}

test.describe("global layout auditor", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!auditProjects.has(testInfo.project.name), "pairwise global audit only");
  });

  test("representative routes have no overflow, clipping or control collisions", async ({ page }) => {
    await page.goto("/");
    for (const item of cases) {
      await test.step(item.label, async () => {
        await page.evaluate((theme) => localStorage.setItem("opinion-poll-theme", theme), item.theme);
        await page.goto(item.route);
        await settle(page);
        const issues = await auditVisibleLayout(page);
        expect.soft(issues, `${item.label} (${item.route})`).toEqual([]);
      });
    }
  });

  test("layered controls remain separated in their open states", async ({ page }) => {
    await page.goto("/?region=bundestag&lang=de");
    await settle(page);
    await page.getByRole("button", { name: /Diagramm anpassen|Customise chart/i }).click();
    await page.locator(".customize-panel details summary").first().click();
    expect(await auditVisibleLayout(page), "open chart selector").toEqual([]);
    await page.keyboard.press("Escape");

    await page.locator(".chart-heading .graph-info-popover summary").first().click();
    expect(await auditVisibleLayout(page), "open information dialog").toEqual([]);
    await page.locator(".graph-info-popover[open] .graph-info-card header button").click();

    await page.locator(".chart-actions .primary-button").click();
    expect(await auditVisibleLayout(page), "open share dialog").toEqual([]);
    await page.locator(".embed-modal .panel-header .icon-button").click();
    await page.locator(".chart-actions .png-export-button").click();
    expect(await auditVisibleLayout(page), "open PNG dialog").toEqual([]);
  });
});
