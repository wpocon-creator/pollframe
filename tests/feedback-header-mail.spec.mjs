import { test, expect } from "@playwright/test";
import { accountMessage } from "../server/account-message.mjs";

test.use({ serviceWorkers: "block" });

test("feedback remains visible next to accounts at phone, tablet and desktop widths", async ({
  page,
}, info) => {
  await page.route("**/api/auth/get-session", (route) =>
    route.fulfill({ json: null }),
  );
  for (const query of [
    "lang=de",
    "country=uk&lang=en-GB",
    "country=es&lang=es",
    "view=studio&lang=de",
  ]) {
    await page.goto(`/?${query}`);
    const account = page.locator(".account-entry");
    const feedback = page.locator(".header-report-button");
    await expect(account).toBeVisible();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(feedback).toBeVisible();
      await expect(feedback).toHaveAttribute("href", /page=bug-report/);
      const box = await feedback.boundingBox();
      const accountBox = await account.boundingBox();
      // Firefox can report 35.99998px for an exactly 36px CSS box.
      expect(box.width).toBeGreaterThanOrEqual(35.9);
      expect(box.height).toBeGreaterThanOrEqual(35.9);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(accountBox.x);
      expect(accountBox.x + accountBox.width).toBeLessThanOrEqual(width);
      // Visible is not enough: another control must not cover the flag.
      expect(
        await feedback.evaluate((node) => {
          const r = node.getBoundingClientRect();
          return node.contains(
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
          );
        }),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("feedback-and-account-phone.png"),
    scale: "css",
  });
  await page.locator(".header-report-button").click();
  await expect(page).toHaveURL(/page=bug-report/);
  await expect(page.locator("main form")).toBeVisible();
});

test("code email fits a small phone and presents only the numeric code before the brand", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const locale of ["de", "en-GB", "en-US", "es"]) {
    await page.setContent(
      accountMessage("code", { otp: "012345" }, locale).html,
    );
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    await expect(page.getByText("012345", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }
  await page.screenshot({
    path: info.outputPath("numeric-code-email-phone.png"),
    scale: "css",
  });
});
