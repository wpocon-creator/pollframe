import { test, expect } from "@playwright/test";

const languages = [
  [
    "de",
    "Konto",
    "Anmelden",
    "Registrieren",
    "Passwort vergessen",
    "Test-E-Mail",
    "Dein Pollframe-Konto",
  ],
  [
    "en-GB",
    "Account",
    "Sign in",
    "Register",
    "Forgot password",
    "Test email",
    "Your Pollframe account",
  ],
  [
    "en-US",
    "Account",
    "Sign in",
    "Register",
    "Forgot password",
    "Test email",
    "Your Pollframe account",
  ],
  [
    "es",
    "Cuenta",
    "Acceder",
    "Registrarse",
    "¿Has olvidado tu contraseña?",
    "Correo de prueba",
    "Tu cuenta de Pollframe",
  ],
];
for (const [lang, account, label, register, forgot, email, title] of languages)
  test(`account entry and focused flow fit every screen and theme: ${lang}`, async ({
    page,
  }, info) => {
    await page.route("**/api/account/capabilities", (r) =>
      r.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ localOnly: true, privateResults: false }),
      }),
    );
    await page.route("**/api/auth/get-session", (r) =>
      r.fulfill({ contentType: "application/json", body: "null" }),
    );
    await page.route("**/api/auth/email-otp/send-verification-otp", (r) =>
      r.fulfill({ contentType: "application/json", body: '{"success":true}' }),
    );
    await page.route("**/api/auth/email-otp/check-verification-otp", (r) =>
      r.fulfill({
        status: 400,
        contentType: "application/json",
        body: '{"code":"USER_NOT_FOUND","message":"User not found"}',
      }),
    );
    await page.route("**/api/account/test-outbox", (r) =>
      r.fulfill({ contentType: "application/json", body: '{"items":[]}' }),
    );
    // Account layout is independent of the gallery. Resizing eight times must
    // not benchmark the unrelated 3D thumbnail renderer in the background.
    // Real Studio registration/storage workflows are covered separately.
    await page.goto(`/?lang=${lang}`);
    const button = page.locator(".account-entry");
    for (const theme of ["light", "dark"])
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
        await expect(button.locator("span")).toHaveText(label);
        await expect(button.locator("span")).toBeVisible();
        const header = page.locator(".header-inner");
        const boxes = await header
          .locator(
            ":scope > .brand,:scope > .header-actions",
          )
          .evaluateAll((els) =>
            els.map((el) => {
              const r = el.getBoundingClientRect();
              return {
                left: r.left,
                right: r.right,
                top: r.top,
                bottom: r.bottom,
              };
            }),
          );
        expect(boxes[0].right).toBeLessThanOrEqual(boxes[1].left + 2);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width + 1);
        await button.click();
        const dialog = page.getByRole("dialog", { name: title, exact: true });
        await expect(dialog.locator(".account-progress li")).toHaveCount(3);
        const bounds = await dialog.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(-1);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
        if (width < 600) {
          expect(bounds.height).toBeGreaterThanOrEqual(899);
          expect(bounds.y).toBe(0);
        } else {
          expect(bounds.height).toBeLessThanOrEqual(676);
          expect(Math.abs(bounds.y + bounds.height / 2 - 450)).toBeLessThan(3);
        }
        expect(
          await dialog.evaluate((el) => el.scrollWidth - el.clientWidth),
        ).toBeLessThan(2);
        await expect(dialog.locator("form > .primary-button")).toBeInViewport();
        await expect(dialog.getByLabel(email, { exact: true })).toBeVisible();
        await dialog
          .getByLabel(email, { exact: true })
          .fill("layout@example.test");
        await dialog.locator("form > .primary-button").click();
        await expect(
          dialog.locator('.account-progress [aria-current="step"]'),
        ).toHaveText(/02/);
        await dialog.locator('input[name="code"]').fill("123456");
        await dialog.locator("form > .primary-button").click();
        await expect(
          dialog.locator('.account-progress [aria-current="step"]'),
        ).toHaveText(/03/);
        await expect(
          dialog.locator(".account-progress .is-complete"),
        ).toHaveCount(2);
        expect(
          await dialog.locator('input[name="name"]').getAttribute("required"),
        ).toBeNull();
        expect(
          await dialog.evaluate((el) => el.scrollWidth - el.clientWidth),
        ).toBeLessThan(2);
        if ((width === 390 || width === 1440) && lang === "de")
          await page.screenshot({
            path: info.outputPath(`account-register-${theme}-${width}.png`),
          });
        await dialog.locator(".account-email-chip button").click();
        await dialog.locator(".account-password-shortcut").click();
        await dialog.getByRole("button", { name: forgot, exact: true }).click();
        await expect(dialog.locator(".account-progress li")).toHaveCount(2);
        await expect(dialog.locator('input[type="password"]')).toHaveCount(0);
        await expect(dialog.locator(".account-back")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(button).toBeFocused();
      }
  });

test("late session response cannot revert a freshly signed-in button", async ({
  page,
}) => {
  let resolve;
  const pending = new Promise((r) => (resolve = r));
  await page.route("**/api/auth/get-session", async (route) => {
    await pending;
    await route.fulfill({ contentType: "application/json", body: "null" });
  });
  await page.goto("/?view=studio&lang=de");
  const button = page.locator(".account-entry");
  await expect(button).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("pollframe-account-changed", {
        detail: { signedIn: true },
      }),
    ),
  );
  await expect(button).toContainText("Mein Konto");
  resolve();
  await page.waitForResponse("**/api/auth/get-session");
  await expect(button).toContainText("Mein Konto");
});

test("local preview is no longer frozen at the branch snapshot", async ({
  request,
}) => {
  for (const path of [
    "/data/bundestag.json",
    "/data/uk-westminster.json",
    "/data/spain-congress.json",
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["x-pollframe-preview-data"]).toMatch(
      /^live(?:-cache)?$/,
    );
    const data = await response.json(),
      latest = data.polls
        .map((p) => p.date)
        .sort()
        .at(-1);
    expect(Date.parse(latest)).toBeGreaterThanOrEqual(Date.parse("2026-10-16"));
  }
});
