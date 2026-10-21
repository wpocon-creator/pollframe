import { test, expect } from "@playwright/test";
// These are page-level API fixtures. A service worker can otherwise take over
// requests before Playwright's route handlers, especially in mobile WebKit.
test.use({ serviceWorkers: "block" });

async function mockAccount(
  page,
  { registered = false, signedIn = false, failPasswordOnce = false } = {},
) {
  const user = {
    id: "email-first-ui",
    name: "Newsroom",
    email: "editor@example.test",
    emailVerified: true,
  };
  const calls = { signIn: 0, password: 0, logIn: 0, sends: 0 };
  await page.route("**/api/elections/sachsen-anhalt-2026", r => r.fulfill({json:{active:false}}));
  await page.route("**/api/account/notices", r => r.fulfill({json:{items:[]}}));
  await page.route("**/api/account/notices/claim", r => r.fulfill({json:{claimed:false}}));
  await page.route("**/api/account/capabilities", (r) =>
    r.fulfill({ json: { enabled: true, localOnly: false } }),
  );
  await page.route("**/api/auth/get-session", (r) =>
    r.fulfill({ json: signedIn ? { user } : null }),
  );
  await page.route("**/api/account/documents", (r) =>
    r.fulfill({ json: { items: [] } }),
  );
  await page.route("**/api/auth/email-otp/send-verification-otp", (r) => {
    calls.sends++;
    return r.fulfill({ json: { success: true } });
  });
  await page.route("**/api/auth/sign-in/email", (r) => {
    calls.logIn++;
    if (r.request().postDataJSON().password === "wrong-password")
      return r.fulfill({
        status: 401,
        json: { code: "INVALID_EMAIL_OR_PASSWORD" },
      });
    signedIn = true;
    return r.fulfill({ json: { user } });
  });
  await page.route("**/api/auth/email-otp/check-verification-otp", (r) => {
    if (r.request().postDataJSON().otp !== "123456")
      return r.fulfill({
        status: 400,
        json: { code: "INVALID_OTP", message: "Invalid OTP" },
      });
    return r.fulfill(
      registered
        ? { json: { success: true } }
        : {
            status: 400,
            json: { code: "USER_NOT_FOUND", message: "User not found" },
          },
    );
  });
  await page.route("**/api/auth/sign-in/email-otp", (r) => {
    calls.signIn++;
    signedIn = true;
    return r.fulfill({ json: { user } });
  });
  await page.route("**/api/account/initial-password", (r) => {
    calls.password++;
    return r.fulfill(
      failPasswordOnce && calls.password === 1
        ? { status: 503, json: { message: "Temporary test failure" } }
        : { json: { status: true } },
    );
  });
  return calls;
}
async function start(page, registration = true) {
  await page.goto("/?lang=en-GB");
  await page.locator(".account-entry").click();
  const dialog = page.getByRole("dialog", {
    name: "Your Pollframe account",
    exact: true,
  });
  await dialog.getByLabel("Email", { exact: true }).fill("editor@example.test");
  await dialog
    .getByRole("button", {
      name: registration ? "Create a free account" : "Continue with email",
      exact: true,
    })
    .click();
  return dialog;
}

test("returning users use their password by default, without requesting a code", async ({
  page,
}, info) => {
  const calls = await mockAccount(page, { registered: true });
  const dialog = await start(page, false);
  await expect(dialog.getByLabel("Password", { exact: true })).toBeEnabled();
  await expect(dialog.getByLabel("Confirmation code")).toHaveCount(0);
  expect(calls.sends).toBe(0);
  await dialog.getByLabel("Password", { exact: true }).fill("wrong-password");
  await dialog
    .locator("form")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText(
    "email address or password is incorrect",
  );
  await expect(dialog.getByLabel("Password", { exact: true })).toHaveValue(
    "wrong-password",
  );
  await page.screenshot({
    path: info.outputPath("password-first-sign-in.png"),
  });
  await dialog
    .getByLabel("Password", { exact: true })
    .fill("Fictional returning-user password");
  await dialog
    .locator("form")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(dialog).toContainText("Signed in as");
  expect(calls).toEqual({ signIn: 0, password: 0, logIn: 2, sends: 0 });
});

test("an existing account's email proof leads to password entry, never an OTP session", async ({
  page,
}) => {
  const calls = await mockAccount(page, { registered: true });
  const dialog = await start(page);
  await dialog.getByLabel("Confirmation code").fill("000000");
  await dialog
    .getByRole("button", { name: "Verify code", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText(
    "invalid or has expired",
  );
  await dialog.getByLabel("Confirmation code").fill("12 34 56");
  await expect(dialog.getByLabel("Confirmation code")).toHaveValue("123456");
  await dialog
    .getByRole("button", { name: "Verify code", exact: true })
    .click();
  await expect(dialog.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("status")).toContainText(
    "already have an account",
  );
  expect(calls.signIn).toBe(0);
  expect(calls.logIn).toBe(0);
});

test("429 shows a countdown, prevents repeat requests and does not block unrelated password sign-in", async ({
  page,
}) => {
  const calls = await mockAccount(page);
  await page.route("**/api/auth/email-otp/send-verification-otp", (r) =>
    r.fulfill({
      status: 429,
      headers: { "retry-after": "120" },
      json: { code: "TOO_MANY_REQUESTS" },
    }),
  );
  const dialog = await start(page);
  await expect(dialog.getByRole("status")).toContainText("120 seconds");
  await expect(
    dialog.getByRole("button", { name: "Create a free account", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Continue with email", exact: true })
    .click();
  await expect(dialog.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(
    dialog
      .locator("form")
      .getByRole("button", { name: "Sign in", exact: true }),
  ).toBeEnabled();
  let attempts = 0;
  await page.route("**/api/auth/sign-in/email", (r) => {
    attempts++;
    return r.fulfill({
      status: 429,
      headers: { "retry-after": "2" },
      json: {},
    });
  });
  await dialog
    .getByLabel("Password", { exact: true })
    .fill("Fictional returning password");
  await dialog
    .locator("form")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: /Try again in/ }),
  ).toBeDisabled();
  expect(attempts).toBe(1);
  await expect(
    dialog
      .locator("form")
      .getByRole("button", { name: "Sign in", exact: true }),
  ).toBeEnabled({ timeout: 5000 });
  expect(attempts).toBe(1);
  expect(calls.signIn).toBe(0);
});

test("all six code digits fit on a narrow phone with doubled text size", async ({
  page,
}, info) => {
  await mockAccount(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/?view=studio&lang=en-GB");
  await page.evaluate(() => (document.documentElement.style.fontSize = "32px"));
  const dialog = await start(page);
  // start navigates to Studio but retains the same document-wide text setting.
  await page.evaluate(() => (document.documentElement.style.fontSize = "32px"));
  const input = dialog.getByLabel("Confirmation code");
  await input.fill("123456");
  const size = await input.evaluate((el) => {
    const s = getComputedStyle(el),
      canvas = document.createElement("canvas"),
      ctx = canvas.getContext("2d");
    ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    // Replaced form controls report clientWidth differently across engines.
    // Use the border box minus explicit padding/borders for actual text room.
    return {
      text: ctx.measureText(el.value).width + 6 * parseFloat(s.letterSpacing),
      space:
        el.getBoundingClientRect().width -
        parseFloat(s.borderLeftWidth) -
        parseFloat(s.borderRightWidth) -
        parseFloat(s.paddingLeft) -
        parseFloat(s.paddingRight),
    };
  });
  expect(size.text).toBeLessThanOrEqual(size.space + 1);
  expect(
    await dialog.evaluate((el) => el.scrollWidth - el.clientWidth),
  ).toBeLessThan(2);
  await page.screenshot({
    path: info.outputPath("confirmation-code-large-text-320.png"),
  });
});

test("sign-in explains cookies that cannot retain a session instead of silently returning to the form", async ({
  page,
}) => {
  await mockAccount(page);
  await page.route("**/api/auth/get-session", (r) => r.fulfill({ json: null }));
  const dialog = await start(page, false);
  await dialog
    .getByLabel("Password", { exact: true })
    .fill("Fictional sign-in password");
  await dialog
    .locator("form")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText(
    "Allow cookies for Pollframe",
  );
  await expect(dialog.getByLabel("Password", { exact: true })).toBeVisible();
});

test("a failed initial password save can be retried without consuming the code twice", async ({
  page,
}) => {
  const calls = await mockAccount(page, { failPasswordOnce: true });
  const dialog = await start(page);
  await dialog.getByLabel("Confirmation code").fill("123456");
  await dialog
    .getByRole("button", { name: "Verify code", exact: true })
    .click();
  await dialog
    .getByLabel("Password", { exact: true })
    .fill("An initial password chosen for this test");
  await dialog
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText(
    "Temporary test failure",
  );
  await expect(dialog.getByLabel("Password", { exact: true })).toHaveValue(
    "An initial password chosen for this test",
  );
  await dialog
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(dialog).toContainText("Signed in as");
  expect(calls).toEqual({ signIn: 1, password: 2, logIn: 0, sends: 1 });
});

test("a delivery failure stays on the email step instead of claiming a code arrived", async ({
  page,
}) => {
  await mockAccount(page);
  await page.route("**/api/auth/email-otp/send-verification-otp", (r) =>
    r.fulfill({ status: 503, json: { code: "EMAIL_DELIVERY_UNAVAILABLE" } }),
  );
  const dialog = await start(page);
  await expect(dialog.getByRole("status")).toContainText(
    "Email delivery is temporarily unavailable",
  );
  await expect(dialog.getByLabel("Confirmation code")).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Continue with email", exact: true }),
  ).toBeEnabled();
});

test("password reset remains visible even when the browser already has a signed-in session", async ({
  page,
}) => {
  await mockAccount(page, { signedIn: true });
  await page.route("**/api/auth/reset-password", (r) =>
    r.fulfill({ json: { status: true } }),
  );
  await page.goto(
    "/?view=studio&lang=en-GB&account=reset&token=reset-ui-test-only",
  );
  const dialog = page.getByRole("dialog", {
    name: "Your Pollframe account",
    exact: true,
  });
  await expect(
    dialog.getByLabel("New password", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByLabel("New password", { exact: true })
    .fill("A new and unique password for this test");
  await dialog
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText("Password changed");
});
