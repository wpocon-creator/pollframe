import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { calculateMatches, scoreLabel } from "../src/party-match-model.js";
import { questionsForLength } from "../src/party-match-data.js";
async function start(page, n = 8, lang = "en-GB") {
  await page.goto(`/?view=party-match&lang=${lang}`);
  await page.locator(`.pm-lengths input[value="${n}"]`).check();
  await page.locator(".pm-start-card>.pm-primary").click();
}
async function finish(page, n = 8, skip = false) {
  for (let i = 0; i < n; i++) {
    await expect(page.locator(".pm-progress-label")).toContainText(`${i + 1} `);
    if (skip)
      await page.locator(".pm-question-actions>.pm-text-button").click();
    else {
      await page
        .locator(".pm-choices label")
        .nth(i % 3)
        .click();
      await page.locator(".pm-question-actions .pm-primary").click();
    }
  }
}
async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".party-match")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
}
test("complete, ranked, sourced, edit in place, extend without losing answers, clear", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await finish(page);
  await expect(page.locator(".pm-party")).toHaveCount(7);
  const scores = await page.locator(".pm-score").allTextContents();
  const qs = questionsForLength(8);
  const expected = calculateMatches(Object.fromEntries(qs.map((q,i)=>[q.id,{value:[1,0,-1][i%3]}])), qs);
  expect(scores).toEqual(expected.results.map(scoreLabel));
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("results.png"),
    fullPage: true,
  });
  const party = page.locator(".pm-party").first();
  await party.locator(":scope>summary").click();
  await expect(party.locator(".pm-evidence")).toHaveCount(8);
  const evidence = party.locator(".pm-evidence").first();
  await evidence.locator("summary").click();
  await expect(evidence.getByRole("link")).toHaveAttribute(
    "href",
    /^https:.*\.pdf#page=\d+$/,
  );
  await evidence
    .getByRole("button", { name: "Edit answer", exact: true })
    .click();
  await expect(page.locator('#pm-edit-wealth input[value="1"]')).toBeChecked();
  await page.locator("#pm-edit-wealth .pm-choices label").last().click();
  await page.locator('#pm-edit-wealth input[type="checkbox"]').check();
  await page.getByRole("button", { name: "Back to ranking" }).click();
  expect(await page.locator(".pm-score").allTextContents()).not.toEqual(scores);
  await page.getByRole("button", { name: /Answer more questions/ }).click();
  await expect(page.locator(".pm-progress-label")).toContainText("9 of 16");
  await page.locator(".pm-early-result").click();
  await page.getByRole("button", { name: "Edit answers", exact: true }).click();
  await expect(page.locator('#pm-edit-wealth input[value="-1"]')).toBeChecked();
  await page
    .getByRole("button", { name: "Clear answers", exact: true })
    .click();
  await page.locator("dialog .pm-primary").click();
  await expect(page.locator(".pm-intro")).toBeVisible();
  expect(errors).toEqual([]);
});
test("30 questions, Spanish, dark, enlarged text and narrow-screen layout", async ({
  page,
}, info) => {
  await start(page, 30, "es");
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.fontSize = "22px";
  });
  await finish(page, 30);
  await noOverflow(page);
  await expect(page.locator(".pm-results h1")).toHaveText(
    "Tus posturas, comparadas",
  );
  await expect(page.locator(".pm-result-context")).toContainText("30 / 30");
  await page
    .getByRole("button", { name: "Editar respuestas", exact: true })
    .click();
  await page.getByRole("searchbox").fill("alquiler");
  await expect(page.locator(".pm-edit-card")).toHaveCount(1);
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("spanish-dark-large-text.png"),
    fullPage: true,
  });
});
test("newly established positions expose the right original source, date and PDF page", async ({
  page,
}, info) => {
  await start(page, 30, "en-GB");
  await finish(page, 30);
  await expect(page.locator(".pm-result-context")).toContainText("30 / 30");
  const afd = page
    .locator(".pm-party")
    .filter({ has: page.locator(":scope > summary", { hasText: "AfD" }) });
  await afd.locator(":scope > summary").click();
  const wage = afd.locator('[data-question="wage"]');
  await wage.locator("summary").click();
  await expect(wage.locator(".pm-source-context")).toContainText(
    "30 April 2024",
  );
  await expect(wage.getByRole("link")).toHaveAttribute(
    "href",
    "https://afdbundestag.de/gerrit-huy-spd-opfert-unabhaengige-mindestlohnkommission/",
  );
  await expect(wage).not.toContainText("excluded from");
  await noOverflow(page);
  await wage.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("supplementary-source.png") });
  const health = afd.locator('[data-question="health"]');
  await health.locator("summary").click();
  await expect(health.getByRole("link")).toHaveAttribute(
    "href",
    "https://dserver.bundestag.de/btd/20/136/2013675.pdf#page=6",
  );
  await expect(health.locator(".pm-source-context")).toContainText(
    "7 November 2024",
  );
  const fdp = page
    .locator(".pm-party")
    .filter({ has: page.locator(":scope > summary", { hasText: "FDP" }) });
  await fdp.locator(":scope > summary").click();
  const self = fdp.locator('[data-question="selfdetermination"]');
  await self.locator("summary").click();
  await expect(self.locator(".pm-source-context")).toHaveText(
    "Supplementary pre-election evidence · April 2024",
  );
  await expect(self.getByRole("link")).toHaveAttribute(
    "href",
    /20240412_argumente_selbstbestimmungsgesetz.pdf#page=1$/,
  );
  const vote = fdp.locator('[data-question="vote16"]');
  await vote.locator("summary").click();
  await expect(vote.locator(".pm-source-context")).toHaveText(
    "2025 programme extract",
  );
  await expect(vote.getByRole("link")).toHaveAttribute(
    "href",
    "https://www.fdp.de/forderung/wahlrecht-ab-16",
  );
  await noOverflow(page);
});
test("skips and minimum; radio keyboard navigation stays on the current question", async ({
  page,
}) => {
  await start(page);
  const radio = page.locator(".pm-choices input").first();
  await radio.focus();
  await page.keyboard.press("Space");
  await expect(radio).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('.pm-choices input[value="0"]')).toBeChecked();
  await expect(page.locator('.pm-choices input[value="0"]')).toBeFocused();
  await finish(page, 8, true);
  await expect(page.locator(".pm-notice")).toContainText("at least four");
  await expect(page.getByRole("button", { name: "Export PNG" })).toBeDisabled();
  expect(await page.locator(".pm-score").allTextContents()).toEqual(
    Array(7).fill("—"),
  );
});
test("answers never enter storage, network, URLs or reload state", async ({
  page,
}) => {
  await start(page);
  await page.waitForLoadState("networkidle");
  const snapshot = () =>
    page.evaluate(() => ({
      local: { ...localStorage },
      session: { ...sessionStorage },
      cookie: document.cookie,
    }));
  const before = await snapshot(),
    outgoing = [],
    url = page.url();
  page.on("request", (r) => {
    if (/^https?:/.test(r.url()))
      outgoing.push({ url: r.url(), body: r.postData() });
  });
  await finish(page);
  await page.getByRole("button", { name: "Edit answers", exact: true }).click();
  await page
    .locator(".pm-edit-card")
    .first()
    .locator(".pm-choices label")
    .last()
    .click();
  expect(await snapshot()).toEqual(before);
  expect(outgoing).toEqual([]);
  expect(page.url()).toBe(url);
  await page.reload();
  await expect(page.locator(".pm-intro")).toBeVisible();
  await page.locator(".pm-start-card>.pm-primary").click();
  await expect(page.locator(".pm-choices input:checked")).toHaveCount(0);
  await page.locator(".pm-choices label").first().click();
  await page.goto("/?page=datenschutz&lang=en-GB");
  await page.goBack();
  await expect(page.locator(".pm-intro")).toBeVisible();
});
test("PNG preview equals downloaded bytes, formats differ, modal stays within viewport", async ({
  page,
}, info) => {
  await start(page, 16, "de");
  await finish(page, 16);
  await page.getByRole("button", { name: "PNG exportieren" }).click();
  const dialog = page.locator(".pm-dialog");
  await expect(dialog).toBeVisible();
  for (const format of ["Quadratisch", "Hochkant"]) {
    await dialog.getByLabel(format, { exact: true }).check();
    await expect(dialog.locator("img")).toBeVisible();
    const dims = await dialog
      .locator("img")
      .evaluate((im) => ({ w: im.naturalWidth, h: im.naturalHeight }));
    expect(dims).toEqual(
      format === "Quadratisch" ? { w: 1200, h: 1200 } : { w: 1080, h: 1350 },
    );
    // A complete PNG can still be clipped by an intrinsically sized grid row.
    // Check the preview box too, not just the downloaded image dimensions.
    const previewBounds = await dialog
      .locator(".pm-export-preview")
      .evaluate((frame) => {
        const image = frame.querySelector("img").getBoundingClientRect();
        const box = frame.getBoundingClientRect();
        return {
          contained:
            image.top >= box.top &&
            image.left >= box.left &&
            image.bottom <= box.bottom + 1 &&
            image.right <= box.right + 1,
          fit: getComputedStyle(frame.querySelector("img")).objectFit,
        };
      });
    expect(previewBounds).toEqual({ contained: true, fit: "contain" });
    // Compare the exact PNG with a digest, not hundreds of thousands of
    // individually serialized bytes in the browser trace.
    const encoded = await dialog.locator("img").evaluate(async (im) => {
      const bytes = await (await fetch(im.src)).arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return {
        length: bytes.byteLength,
        hash: Array.from(new Uint8Array(digest), (b) =>
          b.toString(16).padStart(2, "0"),
        ).join(""),
      };
    });
    const pending = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "PNG herunterladen" }).click();
    const d = await pending;
    const path = info.outputPath(`${format}.png`);
    await d.saveAs(path);
    const downloaded = await readFile(path);
    expect(createHash("sha256").update(downloaded).digest("hex")).toBe(
      encoded.hash,
    );
    expect(downloaded.length).toBe(encoded.length);
    expect(encoded.length).toBeGreaterThan(25000);
  }
  await dialog.getByLabel("Dunkel", { exact: true }).check();
  await expect(dialog.locator("img")).toBeVisible();
  const box = await dialog.boundingBox();
  const vp = page.viewportSize();
  expect(box.height).toBeLessThanOrEqual(vp.height * 0.75 + 2);
  expect(Math.abs(box.y + box.height / 2 - vp.height / 2)).toBeLessThan(3);
  const oldScroll = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 400);
  expect(await page.evaluate(() => scrollY)).toBe(oldScroll);
  await page.screenshot({ path: info.outputPath("export-dialog.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
test("local legal pages explain political-data handling and editorial status in all languages", async ({
  page,
}) => {
  for (const lang of ["de", "en-GB", "es"])
    for (const legal of ["datenschutz", "impressum"]) {
      await page.goto(`/?page=${legal}&lang=${lang}`);
      await expect(page.locator("[data-party-match-legal]")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
});
