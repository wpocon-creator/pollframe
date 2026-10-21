import { test, expect } from "@playwright/test";

for (const locale of ["de", "en-GB", "en-US", "es"]) {
  test(`question sidebar scrolls only vertically with readable labels: ${locale}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(`/?view=party-match&lang=${locale}`);
    await page.locator('.pm-lengths input[value="30"]').check();
    await page.locator(".pm-start-card > .pm-primary").click();
    const nav = page.locator(".pm-topic-nav");
    await expect(nav.getByRole("button")).toHaveCount(30);
    for (const size of [16, 28]) {
      await page.evaluate(
        (size) => (document.documentElement.style.fontSize = `${size}px`),
        size,
      );
      await expect
        .poll(() => nav.evaluate((el) => el.scrollWidth - el.clientWidth))
        .toBeLessThanOrEqual(1);
      const layout = await nav.evaluate((el) => {
        el.scrollLeft = 200;
        el.scrollTop = el.scrollHeight;
        return {
          left: el.scrollLeft,
          top: el.scrollTop,
          overflowingLabels: [...el.querySelectorAll("button")].filter(
            (b) => b.scrollWidth > b.clientWidth + 1,
          ).length,
        };
      });
      expect(layout.left).toBe(0);
      expect(layout.top).toBeGreaterThan(0);
      expect(layout.overflowingLabels).toBe(0);
      await nav.getByRole("button").last().click();
      await expect(nav.getByRole("button").last()).toHaveAttribute(
        "aria-current",
        "step",
      );
      await expect(page.locator(".pm-progress-label")).toContainText("30");
    }
    // A long label and the number/checkmark columns must remain readable together.
    const longTopic = nav.getByRole("button").nth(6);
    await longTopic.click();
    await page.locator(".pm-choices label").first().click();
    await expect(longTopic).toContainText("✓");
    await longTopic.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath(`sidebar-${locale}-large.png`),
    });
    await page.setViewportSize({ width: 820, height: 1180 });
    expect(
      await nav.evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1);
    await nav.getByRole("button").last().click();
    await expect(nav.getByRole("button").last()).toHaveAttribute(
      "aria-current",
      "step",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(nav).toBeHidden();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });
}
