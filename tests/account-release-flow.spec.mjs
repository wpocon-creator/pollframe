// Production frontend + real local workerd/D1. No production requests or mail.
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { releaseAccountFixture as setup } from "./helpers/account-release-fixture.mjs";
const origin = "https://pollframe.com";
const assets = process.env.POLLFRAME_ACCOUNT_BUILD_DIR;
test.use({ serviceWorkers: "block", ignoreHTTPSErrors: true });
test.skip(!assets, "Needs the separately opted-in release build");
async function open(page, origin) {
  await page.goto(origin + "/?lang=en-US");
  await page.locator(".account-entry").click();
  return page.getByRole("dialog", {
    name: "Your Pollframe account",
    exact: true,
  });
}

test("release build: real code, registration, saved files, export, reset navigation and deletion", async ({
  page,
  context,
}, info) => {
  const { mf, db, mail, origin: browserOrigin } = await setup(page);
  try {
    let dialog = await open(page, browserOrigin);
    const privacy = dialog.getByRole("link", { name: "Privacy", exact: true });
    expect(
      new URL(await privacy.getAttribute("href"), origin).searchParams.get(
        "page",
      ),
    ).toBe("datenschutz");
    const password = "Fictional release test account passphrase 2026";
    await dialog
      .getByLabel("Email", { exact: true })
      .fill("release@example.test");
    await dialog
      .getByRole("button", { name: "Create a free account", exact: true })
      .click();
    await expect(dialog.getByLabel("Confirmation code")).toBeVisible();
    const code = (await mail()).text.match(/\b\d{6}\b/)[0];
    await dialog.getByLabel("Confirmation code").fill(code);
    await dialog
      .getByRole("button", { name: "Verify code", exact: true })
      .click();
    await dialog
      .getByLabel("Password", { exact: true })
      .fill("passwordpassword");
    await expect(dialog.locator(".account-password-strength")).toContainText(
      "Too predictable",
    );
    await expect(
      dialog.getByRole("button", { name: "Create account", exact: true }),
    ).toBeDisabled();
    await dialog.getByLabel("Password", { exact: true }).fill(password);
    await expect(dialog.locator(".account-password-strength")).toContainText(
      "Good choice",
    );
    await dialog
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(dialog).toContainText("Signed in as");
    // A read/refresh in another tab must not dismiss the current dialog.
    // This used to break mobile Safari's email-reset handoff as well.
    const recheck = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/auth/get-session",
    );
    await page.evaluate(() =>
      window.dispatchEvent(
        new CustomEvent("pollframe-account-changed", {
          detail: { remote: true, recheck: true },
        }),
      ),
    );
    await recheck;
    await expect(dialog).toBeVisible();
    expect(
      (await context.cookies()).some(
        (c) =>
          c.name.includes("pollframe") &&
          c.secure &&
          c.httpOnly &&
          c.sameSite === "Lax",
      ),
    ).toBe(true);
    await page.evaluate(async () => {
      const request = indexedDB.open("pollframe-studio-styles", 1);
      await new Promise((resolve, reject) => {
        request.onupgradeneeded = () =>
          request.result.createObjectStore("styles", { keyPath: "id" });
        request.onsuccess = resolve;
        request.onerror = reject;
      });
      const db = request.result,
        tx = db.transaction("styles", "readwrite");
      tx.objectStore("styles").put({
        id: "release-style",
        name: "Release newsroom",
        style: { theme: "dark" },
        updatedAt: new Date().toISOString(),
      });
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = reject;
      });
      db.close();
    });
    await dialog.locator(".account-local-import > summary").click();
    await dialog
      .getByRole("button", {
        name: "Back up local designs and styles to your account",
        exact: true,
      })
      .click();
    await expect(dialog.locator(".studio-account-documents")).toContainText(
      "Release newsroom",
    );
    if (page.viewportSize().width <= 600) {
      const row = dialog.locator(".studio-account-documents li").first();
      const name = await row.locator(":scope > span").boundingBox();
      expect(name.width).toBeGreaterThan((await row.boundingBox()).width * 0.8);
    }
    await dialog
      .getByRole("button", { name: "Data & privacy", exact: true })
      .click();
    const download = page.waitForEvent("download");
    await dialog
      .getByRole("button", { name: "Download account data", exact: true })
      .click();
    const exported = JSON.parse(
      await readFile(await (await download).path(), "utf8"),
    );
    expect(exported.format).toBe("pollframe-account-export-v1");
    expect(exported.profile.email).toBe("release@example.test");
    expect(exported.documents).toHaveLength(1);
    expect(exported.sessions.length).toBeGreaterThan(0);
    expect(JSON.stringify(exported)).not.toMatch(
      /"(?:password|token|accessToken|refreshToken)"\s*:/,
    );
    await dialog
      .getByRole("button", { name: "Account & security", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Set or change your password", exact: true })
      .click();
    await expect(dialog.getByRole("status")).toContainText("requested");
    const resetLink = (await mail()).text.match(/https:\/\/\S+/)[0];
    // Check the production-origin callback, then follow the same mail link
    // through the loopback HTTPS bridge so cookies and redirects are real.
    const callback = await mf.dispatchFetch(resetLink, {
      redirect: "manual",
      headers: {
        "sec-fetch-site": "cross-site",
        "sec-fetch-mode": "navigate",
        "cf-connecting-ip": "192.0.2.71",
      },
    });
    expect(callback.status).toBe(302);
    const callbackURL = callback.headers.get("location");
    expect(new URL(callbackURL).origin).toBe(origin);
    expect(new URL(callbackURL).searchParams.get("lang")).toBe("en-US");
    const mailNavigation = new URL(resetLink);
    mailNavigation.host = new URL(browserOrigin).host;
    await page.goto(mailNavigation.href);
    dialog = page.getByRole("dialog", {
      name: "Your Pollframe account",
      exact: true,
    });
    await expect(
      dialog.getByLabel("New password", { exact: true }),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.has("token")).toBe(false);
    expect(new URL(page.url()).searchParams.has("account")).toBe(false);
    await dialog
      .getByLabel("New password", { exact: true })
      .fill(password + " changed");
    await dialog
      .getByRole("button", { name: "Change password", exact: true })
      .click();
    await expect(dialog.getByRole("status")).toContainText("Password changed");
    await dialog
      .getByLabel("Email", { exact: true })
      .fill("release@example.test");
    await dialog
      .getByLabel("Password", { exact: true })
      .fill(password + " changed");
    await dialog
      .locator("form")
      .getByRole("button", { name: "Sign in", exact: true })
      .click();
    await expect(dialog.locator(".studio-account-documents")).toContainText(
      "Release newsroom",
    );
    await page.screenshot({
      path: info.outputPath("production-built-account-files.png"),
    });
    await dialog
      .getByRole("button", { name: "Account & security", exact: true })
      .click();
    await expect(
      dialog.getByRole("heading", { name: "Account settings", exact: true }),
    ).toBeVisible();
    await dialog
      .locator(".account-security summary")
      .filter({ hasText: "Profile & email" })
      .click();
    await expect(
      dialog.getByLabel("Display name", { exact: true }),
    ).toBeVisible();
    await dialog
      .locator(".account-security summary")
      .filter({ hasText: "Devices & sessions" })
      .click();
    await expect(dialog.locator(".account-sessions")).toContainText(
      "This device",
    );
    await page.screenshot({
      path: info.outputPath("account-security-new-layout.png"),
    });
    await dialog
      .getByRole("button", { name: "Data & privacy", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Delete account…", exact: true })
      .click();
    await dialog
      .getByLabel("Confirm with your password", { exact: true })
      .fill(password + " changed");
    await dialog
      .getByRole("button", { name: "Permanently delete account", exact: true })
      .click();
    await expect(dialog.getByRole("status")).toContainText(
      "Account and stored files deleted",
    );
    for (const table of [
      "user",
      "account",
      "session",
      "studio_document",
      "verification",
    ])
      expect(
        (await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first()).n,
      ).toBe(0);
  } finally {
    await mf.dispose();
  }
});

test("release build: invalid recovery is useful, translated account privacy fits small dark screens", async ({
  page,
}, info) => {
  const { mf, origin } = await setup(page);
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "/?lang=en-GB&account=reset&error=INVALID_TOKEN");
    const dialog = page.getByRole("dialog", {
      name: "Your Pollframe account",
      exact: true,
    });
    await expect(dialog.getByRole("status")).toContainText(
      "invalid or has expired",
    );
    await expect(
      dialog.getByRole("button", { name: "Request link", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath("invalid-reset-mobile.png"),
    });
    await page.goto(origin + "/?page=datenschutz&lang=es#accounts");
    await expect(page.locator("[data-account-privacy]")).toContainText(
      "Cuenta opcional",
    );
    await expect(page.locator("[data-account-privacy]")).toContainText(
      "EE. UU.",
    );
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px";
      document.documentElement.dataset.theme = "dark";
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThan(2);
    await page.screenshot({
      path: info.outputPath("account-privacy-spanish-large-phone.png"),
    });
  } finally {
    await mf.dispose();
  }
});
