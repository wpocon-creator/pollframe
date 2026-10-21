// Joint-release acceptance: actual optimised assets + real isolated account
// service, with no outgoing mail or requests to the public Worker.
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { releaseAccountFixture } from "./helpers/account-release-fixture.mjs";
test.use({ serviceWorkers: "block", ignoreHTTPSErrors: true });
test.skip(
  !process.env.POLLFRAME_ACCOUNT_BUILD_DIR,
  "Requires explicit joint release build",
);

test("joint release: questionnaire, source receipt, signup and explicit encrypted saving including phones", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const { mf, db, mail, origin } = await releaseAccountFixture(page, {
    privateResults: true,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(origin + "/?view=party-match&lang=en-GB");
    await expect(page.locator(".pm-edition-context")).toContainText("2025");
    await page.locator('.pm-topic-entry-card[data-round="economy"]').click();
    for (let i = 0; i < 15; i++) {
      if (i === 0) {
        await page.locator(".pm-question-card").scrollIntoViewIfNeeded();
        await page.screenshot({
          path: info.outputPath("wahlframe-question-thumb-layout.png"),
        });
        const targets = await page
          .locator(".pm-question-actions button")
          .evaluateAll((items) =>
            items.map((el) => ({
              height: el.getBoundingClientRect().height,
              width: el.getBoundingClientRect().width,
            })),
          );
        expect(targets.every((t) => t.height >= 40 && t.width >= 44)).toBe(
          true,
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
      }
      await page
        .locator(".pm-choices label")
        .nth(i % 3)
        .click();
      await page.locator(".pm-question-actions .pm-primary").click();
    }
    await expect(page.locator(".pm-results")).toBeVisible();
    await expect(page.locator(".pm-result-context")).toContainText("15 / 15");
    expect(
      (await db.prepare("SELECT COUNT(*) AS n FROM private_result").first()).n,
    ).toBe(0);
    await page
      .locator(".pm-results>.pm-view-heading")
      .getByRole("button", { name: "Save to my account", exact: true })
      .click();
    const account = page.getByRole("dialog", {
      name: "Your Pollframe account",
      exact: true,
    });
    await expect(account).toBeVisible();
    // Consent must not sit underneath a login overlay.
    await expect(
      page.getByRole("dialog", { name: "Save to my account", exact: true }),
    ).toHaveCount(0);
    await account
      .getByLabel("Email", { exact: true })
      .fill("wahlframe-release@example.test");
    await account
      .getByRole("button", { name: "Create a free account", exact: true })
      .click();
    await expect(account.getByLabel("Confirmation code")).toBeVisible();
    const code = (await mail()).text.match(/\b\d{6}\b/)[0];
    await account.getByLabel("Confirmation code").fill(code);
    await account
      .getByRole("button", { name: "Verify code", exact: true })
      .click();
    await account
      .getByLabel("Password", { exact: true })
      .fill("Fictional joint release passphrase 2026");
    await account
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(account).toContainText("Signed in as");
    await expect(
      page.getByRole("dialog", { name: "Save to my account", exact: true }),
    ).toHaveCount(0);
    await account.getByRole("button", { name: "Close", exact: true }).click();
    const save = page.getByRole("dialog", {
      name: "Save to my account",
      exact: true,
    });
    await expect(save).toBeVisible();
    await expect(account).toHaveCount(0);
    await expect(save.getByRole("checkbox")).not.toBeChecked();
    await expect(save.getByRole("checkbox")).toHaveAccessibleName(
      /at least 16/,
    );
    await expect(
      save.getByRole("button", { name: "Save to my account", exact: true }),
    ).toBeDisabled();
    await save
      .getByLabel("Graphic name", { exact: true })
      .fill("Economy release result");
    await save.getByRole("checkbox").check();
    await save
      .getByRole("button", { name: "Save to my account", exact: true })
      .click();
    await expect(save).toHaveCount(0);
    await expect(page.locator(".pm-result-save").first()).toContainText(
      "Result saved",
    );
    const stored = await db
      .prepare("SELECT ciphertext,nonce FROM private_result")
      .first();
    expect(stored.ciphertext).not.toContain("Economy release result");
    expect(stored.nonce).toBeTruthy();
    const listing = await (
      await page.request.get(origin + "/api/account/private-results")
    ).json();
    expect(listing.items).toHaveLength(1);
    const record = listing.items[0];
    expect(record.name).toBe("Economy release result");
    expect(record.payload.document.round).toBe("economy");
    expect(record.payload.document.length).toBe(15);
    expect(record.payload.document.answers).toBeUndefined();
    expect(record.payload.answers).toBeUndefined();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "24px";
      document.documentElement.dataset.theme = "dark";
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    const headingLayout = await page
      .locator(".pm-results>.pm-view-heading")
      .evaluate((el) => {
        const title = el.firstElementChild.getBoundingClientRect(),
          actions = el.lastElementChild.getBoundingClientRect();
        return {
          separate:
            title.right <= actions.left ||
            actions.right <= title.left ||
            title.bottom <= actions.top ||
            actions.bottom <= title.top,
          titleWidth: title.width,
          available: el.clientWidth,
        };
      });
    expect(headingLayout.separate).toBe(true);
    expect(headingLayout.titleWidth).toBeGreaterThan(
      Math.min(380, headingLayout.available - 1),
    );
    await page.locator(".pm-results>.pm-view-heading").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath("joint-release-results-large-dark.png"),
    });
    await page.reload();
    await expect(page.locator(".pm-start-card")).toBeVisible();
    const afterReload = await (
      await page.request.get(origin + "/api/account/private-results")
    ).json();
    expect(afterReload.items).toHaveLength(1);
    expect(
      (
        await page.request.delete(
          origin + "/api/account/private-results/" + record.id,
          {
            headers: { Origin: origin, "Content-Type": "application/json" },
            data: {},
          },
        )
      ).ok(),
    ).toBe(true);
    expect(
      (await db.prepare("SELECT COUNT(*) AS n FROM private_result").first()).n,
    ).toBe(0);
    expect(errors).toEqual([]);
  } finally {
    await mf.dispose();
  }
});

test("joint release: translated edition, general/topic entry and non-personal source download", async ({
  page,
}, info) => {
  const { mf, origin } = await releaseAccountFixture(page);
  try {
    for (const lang of ["de", "es"]) {
      await page.goto(origin + "/?view=party-match&lang=" + lang);
      await expect(page.locator(".pm-edition-context")).toContainText("2025");
      await expect(page.locator(".pm-lengths input")).toHaveCount(3);
      await expect(page.locator(".pm-topic-entry-card")).toHaveCount(3);
      await page.evaluate(
        () => (document.documentElement.style.fontSize = "24px"),
      );
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        metrics: [innerWidth, document.documentElement.clientWidth, document.documentElement.scrollWidth, document.body.clientWidth, document.body.scrollWidth],
        text: [...document.querySelectorAll("body *")].filter(el => {
          return el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === "visible";
        }).slice(0, 12).map(el => ({ cls: el.className, widths: [el.clientWidth, el.scrollWidth], text: el.textContent.slice(0, 70) })),
        wide: [...document.querySelectorAll("body *")].filter(el => {
          const box = el.getBoundingClientRect();
          return box.width > 0 && box.right > innerWidth + 1 && box.left >= 0;
        }).slice(0, 12).map(el => ({ tag: el.tagName, cls: el.className, text: el.textContent.slice(0, 90) })),
      }));
      expect(layout.overflow, JSON.stringify(layout)).toBeLessThanOrEqual(1);
      await page.screenshot({
        path: info.outputPath("joint-release-entry-" + lang + ".png"),
        fullPage: true,
      });
    }
    await page.goto(origin + "/?view=party-match&lang=en-GB");
    await page
      .locator(".pm-toolbar")
      .getByRole("button", { name: "Sources & method" })
      .click();
    const dialog = page.getByRole("dialog", { name: "Info", exact: true });
    await dialog
      .locator("summary")
      .filter({ hasText: "Sources & editorial interpretation" })
      .click();
    const download = page.waitForEvent("download");
    await dialog.getByRole("button", { name: /Download this round/ }).click();
    const receipt = JSON.parse(
      await readFile(await (await download).path(), "utf8"),
    );
    expect(receipt.questions).toHaveLength(16);
    expect(receipt.edition.positionCutoff).toBe("2025-02-23");
    expect(receipt.answers).toBeUndefined();
    expect(receipt.results).toBeUndefined();
    await page.keyboard.press("Escape");
    await page.goto(origin + "/?page=datenschutz&lang=es");
    await expect(page.locator("[data-party-match-legal]")).toContainText(
      "9.2.a",
    );
    await expect(page.locator("[data-account-privacy]")).toBeVisible();
  } finally {
    await mf.dispose();
  }
});
