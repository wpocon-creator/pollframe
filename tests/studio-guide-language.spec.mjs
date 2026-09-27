import { test, expect } from "@playwright/test";
for (const [locale, audio] of [
  ["en-GB", "en"],
  ["en-US", "en"],
  ["de", "en"],
  ["es", "en"],
]) {
  test(`video language ${locale}: single ${audio} narration and correctly timed captions`, async ({
    page,
  }) => {
    await page.goto(`/?view=studio&lang=${locale}#studio-guide`);
    const video = page.locator(".studio-guide-video");
    await expect(video).toBeVisible();
    await expect(video).toHaveCount(1);
    await expect(video).toHaveAttribute(
      "src",
      new RegExp(
        `pollframe-studio\\.mp4\\?v=film3$`,
      ),
    );
    await expect(video.locator("track")).toHaveCount(3);
    for (const src of await video
      .locator("track")
      .evaluateAll((nodes) => nodes.map((n) => n.src)))
      expect(src).toContain(`-on-${audio}.vtt`);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await video.evaluate((el) => {
      el.muted = true;
      return el.play();
    });
    await expect
      .poll(() => video.evaluate((el) => el.currentTime))
      .toBeGreaterThan(0.1);
    await page.locator(".studio-guide-dialog > header button").click();
    await expect(video).toHaveCount(0);
    expect(await page.locator("audio,video").count()).toBe(0);
    expect(errors).toEqual([]);
  });
}
