import { test, expect } from "@playwright/test";

const route = "/?view=studio&lang=de&topic=current";
test("short landscape view keeps the complete picture and native controls visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(route + "#studio-guide");
  const video = page.locator(".studio-guide-video");
  await expect(video).toBeVisible();
  const v = await video.boundingBox();
  const body = await page
    .locator(".studio-guide-dialog .studio-resource-body")
    .boundingBox();
  expect(v.y).toBeGreaterThanOrEqual(body.y);
  expect(v.y + v.height).toBeLessThanOrEqual(body.y + body.height - 4);
  expect(Math.abs(v.width / v.height - 16 / 9)).toBeLessThan(0.02);
  await page.screenshot({
    path: test.info().outputPath("landscape-player.png"),
  });
});
test("return from editor reaches the gallery even after reopening Edit", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("pollframe-notice-dismissed:studio-guide-v1", "yes"),
  );
  await page.goto(route);
  await page.locator("#studio-poll-classic").click();
  if (
    !(await page
      .getByRole("button", { name: "Bearbeiten", exact: true })
      .count())
  )
    test.skip(true, "Desktop/tablet editor only");
  await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await page
    .getByRole("button", { name: "← Zur Vorschau", exact: true })
    .click();
  await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await page
    .getByRole("button", { name: "← Zur Vorschau", exact: true })
    .click();
  await page
    .getByRole("button", { name: "← Alle Designs", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Meine Designs", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#studio-poll-classic")).toBeVisible();
});
test("Studio notice floats, dismisses without layout shift and never preloads the film", async ({
  page,
}, info) => {
  const media = [];
  page.on("request", (r) => {
    if (/studio-guide\/(?:.*\.mp4|.*\.vtt|poster)/.test(r.url()))
      media.push(r.url());
  });
  await page.goto(route);
  const notice = page.locator(".studio-announcement");
  await expect(notice).toBeVisible();
  await page.waitForTimeout(700);
  const first = await notice.boundingBox();
  const header = await page.locator(".site-header").boundingBox();
  expect(first.y).toBeGreaterThan(header.y + header.height + 5);
  expect(await notice.evaluate((el) => getComputedStyle(el).position)).toBe(
    "fixed",
  );
  await page.evaluate(() => scrollTo(0, 500));
  await page.waitForTimeout(200);
  expect(Math.abs((await notice.boundingBox()).y - first.y)).toBeLessThan(2);
  const before = await page.evaluate(() => scrollY);
  await page.getByRole("button", { name: "Einführung ausblenden" }).click();
  await expect(notice).toHaveCount(0);
  expect(await page.evaluate(() => scrollY)).toBe(before);
  expect(media).toEqual([]);
  await page.reload();
  await expect(notice).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("studio-dismissed.png") });
});

test("video opens from Info, stays centred, has in-player transport and closes with Escape", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    localStorage.setItem("pollframe-notice-dismissed:studio-guide-v1", "yes"),
  );
  await page.goto("/?view=studio&lang=de&template=poll-classic&editor=1");
  await page.getByRole("button", { name: "Info", exact: true }).click();
  await page
    .getByRole("button", { name: "Studio im Video kennenlernen →" })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Studio kennenlernen",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  expect(await page.locator("dialog[open]").count()).toBe(1);
  const rect = await dialog.boundingBox(),
    vp = page.viewportSize();
  expect(rect.height).toBeLessThanOrEqual(vp.height * 0.75 + 2);
  expect(Math.abs(rect.x + rect.width / 2 - vp.width / 2)).toBeLessThan(3);
  expect(Math.abs(rect.y + rect.height / 2 - vp.height / 2)).toBeLessThan(3);
  await expect(
    dialog.getByText("Mit Unterstützung von KI erstellt.", { exact: true }),
  ).toBeVisible();
  const video = dialog.locator("video");
  await expect(video).toHaveAttribute("preload", "none");
  expect(await video.evaluate((el) => el.controls)).toBe(true);
  for (const name of ["15 Sekunden zurück", "15 Sekunden vor"]) {
    const r = await dialog
        .getByRole("button", { name, exact: true })
        .boundingBox(),
      v = await video.boundingBox();
    expect(r.y).toBeGreaterThanOrEqual(v.y);
    expect(r.y + r.height).toBeLessThanOrEqual(v.y + v.height);
  }
  await page.screenshot({ path: info.outputPath("studio-video-dialog.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Info", exact: true }),
  ).toBeFocused();
});

test("localized player and transcript do not require an external player or analytics", async ({
  page,
}) => {
  const external = [];
  page.on("request", (r) => {
    if (/youtube|vimeo|googlevideo|api\/analytics/.test(r.url()))
      external.push(r.url());
  });
  await page.goto("/?view=studio&lang=es&topic=current#studio-guide");
  const dialog = page.getByRole("dialog", {
    name: "Descubre Studio",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("Creado con ayuda de IA.", { exact: true }),
  ).toBeVisible();
  await dialog.getByText("Transcripción y producción", { exact: true }).click();
  await expect(dialog).toContainText("Vamos a diseñar una gráfica");
  await expect(dialog).not.toContainText("Wir gestalten zusammen");
  await expect(dialog.locator("track[default]")).toHaveAttribute(
    "srclang",
    "es",
  );
  expect(external).toEqual([]);
});

test("notice timeout pauses during interaction and does not create a persistent tracking marker", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto(route);
  const notice = page.locator(".studio-announcement");
  await expect(notice).toBeVisible();
  await page
    .getByRole("button", { name: "Video ansehen", exact: true })
    .focus();
  await page.clock.fastForward(20000);
  await expect(notice).toBeVisible();
  await page
    .getByRole("button", { name: "Meine Designs", exact: true })
    .focus();
  await page.clock.fastForward(17000);
  await expect(notice).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("pollframe-notice-dismissed:studio-guide-v1"),
    ),
  ).toBeNull();
});

test("local film decodes, seeks to a chapter and provides all caption languages", async ({
  page,
}) => {
  await page.goto(route + "#studio-guide");
  const video = page.locator(".studio-guide-video");
  await expect(video).toBeVisible();
  await video.evaluate((el) => el.load());
  await expect
    .poll(() => video.evaluate((el) => el.readyState), { timeout: 20000 })
    .toBeGreaterThanOrEqual(2);
  expect(await video.evaluate((el) => el.duration)).toBeGreaterThan(100);
  expect(await video.evaluate((el) => el.videoWidth)).toBe(1920);
  await page
    .getByRole("button", { name: "Video abspielen", exact: true })
    .click();
  await expect
    .poll(() => video.evaluate((el) => el.currentTime))
    .toBeGreaterThan(0);
  // A mouse click must not leave the large transport controls permanently
  // covering the film just because the Play button retains focus.
  await page.mouse.move(2, 2);
  await expect(page.locator(".studio-guide-transport")).toHaveCSS(
    "opacity",
    "0",
  );
  await video.evaluate((el) => el.pause());
  await page.getByRole("button", { name: /Ein Stil lässt sich wiederverwenden/ }).click();
  await expect
    .poll(() => video.evaluate((el) => el.currentTime))
    .toBeGreaterThan(45);
  await expect(video.locator("track")).toHaveCount(3);
});

test("failed media keeps an accessible transcript and direct file fallback", async ({
  page,
}) => {
  await page.route(/\/media\/studio-guide\/[^/]+\.mp4(?:\?.*)?$/, (route) => route.abort());
  await page.goto(route + "#studio-guide");
  await page
    .getByRole("button", { name: "Video abspielen", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Das Video konnte nicht geladen werden",
  );
  await page.getByText("Transkript & Produktion", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Video herunterladen", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".studio-guide-dialog")).toContainText(
    "Wir machen aus einer deutschen Sonntagsfrage",
  );
});
