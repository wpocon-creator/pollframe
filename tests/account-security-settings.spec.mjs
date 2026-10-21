import { test, expect } from "@playwright/test";
import { createHmac } from "node:crypto";
import { base32 } from "@better-auth/utils/base32";
test.use({ trace: "off", screenshot: "off" });

async function signIn(request, base) {
  const email = `security-browser-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`,
    password = "Independent browser test passphrase 2026!";
  const post = (path, data) =>
    request.post(base + path, { data, headers: { origin: base } });
  expect(
    (
      await post("/api/auth/sign-up/email", {
        email,
        password,
        name: "Browser security test",
        callbackURL: base,
      })
    ).ok(),
  ).toBe(true);
  const out = await request.post(base + "/api/account/test-outbox", {
    data: {},
    headers: { origin: base, "x-pollframe-lab": "1" },
  });
  const mail = (await out.json()).items.findLast(
      (m) => m.kind === "verify" && m.to === email,
    ),
    url = new URL(mail.url);
  expect((await request.get(base + url.pathname + url.search)).ok()).toBe(true);
  expect(
    (await post("/api/auth/sign-in/email", { email, password })).ok(),
  ).toBe(true);
  return { email, password };
}
test("saving requires a verified account; settings, local QR, recovery and logout work in a real browser", async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?lang=en-GB");
  const attempted = await page.evaluate(async () => {
    try {
      const m = await import("/src/studio-style-library.js");
      await m.saveStyle("Must not persist anonymously", {});
      return "incorrectly saved";
    } catch (error) {
      return error.code;
    }
  });
  expect(attempted).toBe("ACCOUNT_REQUIRED");
  const dialog = page.getByRole("dialog", { name: "Your Pollframe account" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("free account");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  const { password } = await signIn(page.request, baseURL);
  await page.reload();
  await page.locator(".account-entry").click();
  await dialog.getByRole("button", { name: "Account & security", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "Account settings", exact: true }),
  ).toBeVisible();
  const profile = dialog
    .locator(".account-security details")
    .filter({ has: page.locator("summary", { hasText: "Profile & email" }) });
  await profile.locator("summary").click();
  await profile
    .getByLabel("Display name", { exact: true })
    .fill("<img src=x onerror=alert(1)>");
  await profile.getByRole("button", { name: "Save name", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("Profile updated");
  expect(await dialog.locator('img[src="x"]').count()).toBe(0);
  const factor = dialog.locator(".account-security details").filter({
    has: page.locator("summary", { hasText: "Two-factor authentication" }),
  });
  await factor.locator("summary").click();
  await factor.getByLabel("Current password", { exact: true }).fill(password);
  await factor
    .getByRole("button", { name: "Set up authenticator", exact: true })
    .click();
  await expect(
    factor.locator(".account-factor-enrollment img"),
  ).toHaveAttribute("src", /^data:image\/png/);
  const secret = await factor
    .locator(".account-factor-enrollment code")
    .innerText();
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", base32.decode(secret)).update(counter).digest(),
    o = h[19] & 15;
  const code = String((h.readUInt32BE(o) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
  await factor
    .getByLabel("Confirm the code from the app", { exact: true })
    .fill(code);
  await factor.getByRole("button", { name: "Enable", exact: true }).click();
  await expect(factor.locator("summary")).toContainText("On");
  await expect(factor.locator(".account-recovery-codes li")).toHaveCount(10);
  // Never include setup secrets/recovery codes in screenshots or retained traces.
  await factor.getByRole("button", { name: "Hide codes", exact: true }).click();
  await expect(factor.locator(".account-factor-enrollment")).toHaveCount(0);
  const saved = await page.evaluate(async () => {
    const { saveStyle, listStyles } = await import(
      "/src/studio-style-library.js"
    );
    const item = await saveStyle("Account-only style", { font: "inter" });
    return (await listStyles()).some((row) => row.id === item.id);
  });
  expect(saved).toBe(true);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await dialog.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        innerWidth,
        innerHeight,
        layoutWidth: document.documentElement.clientWidth,
        overflow: el.scrollWidth - el.clientWidth,
      };
    });
    // Account settings intentionally fill a phone; desktop dialogs are capped.
    if (width <= 600) expect(geometry.h).toBeCloseTo(900, 0);
    else expect(geometry.h).toBeLessThanOrEqual(675 + 1);
    expect(geometry.overflow).toBeLessThanOrEqual(1);
    expect(
      Math.abs(geometry.x + geometry.w / 2 - geometry.innerWidth / 2),
    ).toBeLessThan(3);
    expect(
      Math.abs(geometry.y + geometry.h / 2 - geometry.innerHeight / 2),
    ).toBeLessThan(3);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }
  // Collapse the 2FA section before capturing a visual sample.
  await factor.evaluate(el => { el.open = false; });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("account-settings-phone.png"),
  });
  await dialog.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "Account settings", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(async () => {
      const { listStyles } = await import("/src/studio-style-library.js");
      return listStyles();
    }),
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test("the two full-width section links sit BELOW the header at every device size", async ({
  page,
}) => {
  await page.goto("/?lang=de");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const nav = page.locator(".product-sections-bar");
    await expect(nav).toBeVisible();
    const r = await nav.boundingBox(),
      h = await page.locator(".header-inner").boundingBox();
    expect(r.y).toBeGreaterThanOrEqual(h.y + h.height - 1);
    expect(r.width).toBeCloseTo(
      (await page.locator(".site-header").boundingBox()).width,
      0,
    );
    const a = nav.getByRole("link", { name: "Pollframe", exact: true }),
      b = nav.getByRole("link", { name: "Studio", exact: true });
    expect((await a.boundingBox()).width).toBeCloseTo(
      (await b.boundingBox()).width,
      0,
    );
    await expect(a).toHaveAttribute("aria-current");
  }
});
