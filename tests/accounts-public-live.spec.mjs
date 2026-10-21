// Explicit, read-only production smoke check. No registration, reset requests,
// emails, saved results or account mutations. Password estimates stay local.
import { test, expect } from "@playwright/test";
test.skip(
  process.env.POLLFRAME_TEST_BASE_URL !== "https://pollframe.com",
  "Explicit production smoke check only",
);
test.use({ serviceWorkers: "block" });

test("live sign-in asks for a password without attempting to send email", async ({
  page,
}, info) => {
  const posts = [];
  // Even if the password-first regression returns, this read-only live test
  // must never send real mail or mutate account state.
  await page.route("**/api/auth/**", (route) => {
    if (route.request().method() === "GET") return route.continue();
    posts.push(new URL(route.request().url()).pathname);
    return route.fulfill({ status: 403, json: { code: "READ_ONLY_UI_CHECK" } });
  });
  await page.goto("/?lang=en-GB");
  await page.locator(".account-entry").click();
  const dialog = page.getByRole("dialog", {
    name: "Your Pollframe account",
    exact: true,
  });
  await dialog
    .getByLabel("Email", { exact: true })
    .fill("read-only-ui-check@example.invalid");
  await dialog
    .getByRole("button", { name: "Continue with email", exact: true })
    .click();
  await expect(dialog.getByLabel("Password", { exact: true })).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await expect(dialog.getByLabel("Confirmation code")).toHaveCount(0);
  await expect(
    dialog.getByRole("button", {
      name: "New here? Create a free account",
      exact: true,
    }),
  ).toBeVisible();
  expect(posts).toEqual([]);
  await page.screenshot({
    path: info.outputPath("live-password-first.png"),
    scale: "css",
  });
});

test("live account readiness and new-password meter under production CSP", async ({
  page,
  request,
}, info) => {
  const capability = await request.get("/api/account/capabilities");
  expect(capability.ok()).toBe(true);
  expect(await capability.json()).toMatchObject({
    enabled: true,
    localOnly: false,
    privateResults: true,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/?view=studio&lang=en-GB&account=reset&token=public-ui-check-not-a-real-token",
  );
  const dialog = page.getByRole("dialog", {
    name: "Your Pollframe account",
    exact: true,
  });
  await expect(
    dialog.getByLabel("New password", { exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.has("token")).toBe(false);
  await dialog
    .getByLabel("New password", { exact: true })
    .fill("passwordpassword");
  await expect(dialog.locator(".account-password-strength")).toContainText(
    "Too predictable",
  );
  await expect(
    dialog.getByRole("button", { name: "Change password", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByLabel("New password", { exact: true })
    .fill("Fictional public UI test passphrase with no account");
  await expect(dialog.locator(".account-password-strength")).toContainText(
    "Good choice",
  );
  await expect(
    dialog.getByRole("button", { name: "Change password", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: info.outputPath("live-new-password.png"),
    scale: "css",
  });
  expect(errors).toEqual([]);
});

test("live Wahlframe compact choices and navigation remain within the screen", async ({
  page,
}, info) => {
  await page.goto("/?view=party-match&lang=de");
  const feedback = page.locator(".header-report-button");
  await expect(page.locator(".account-entry")).toBeVisible();
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveAttribute("href", /page=bug-report/);
  await page.locator('.pm-topic-entry-card[data-round="economy"]').click();
  await page.locator(".pm-question-card").scrollIntoViewIfNeeded();
  await page.locator(".pm-choices label").first().click();
  await expect(page.locator(".pm-question-actions .pm-primary")).toBeEnabled();
  await page.screenshot({
    path: info.outputPath("live-mobile-question.png"),
    scale: "css",
  });
  await page.locator(".pm-question-actions .pm-primary").click();
  await page.locator(".pm-question-actions .pm-skip").click();
  await expect(page.locator(".pm-progress-label")).toContainText("3");
  for (const fontSize of ["16px", "24px"]) {
    await page.evaluate((size) => {
      document.documentElement.style.fontSize = size;
      document.documentElement.dataset.theme = "dark";
    }, fontSize);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await expect(page.locator(".pm-question-actions .pm-skip")).toBeVisible();
  }
});
