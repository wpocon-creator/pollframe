import { test, expect } from "@playwright/test";
test.use({ serviceWorkers: "block" });

for (const template of ["poll-classic", "history-original"]) {
  test(`${template}: publishing waits for actual data and cannot crash during a slow load`, async ({ page }) => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/embed.html?**", async route => {
      const params = new URL(route.request().url()).searchParams;
      if (params.has("studioSource") || params.has("studioHistorySource")) await gate;
      await route.continue();
    });
    try {
      await page.goto(`/?view=studio&lang=de&template=${template}&editor=1&workspace=edit`);
      const embed = page.getByRole("button", { name: "Embed", exact: true });
      await expect(embed).toBeVisible();
      await expect(embed).toBeDisabled();
      await expect(page.getByRole("button", { name: "PNG herunterladen", exact: true })).toBeDisabled();
      await expect(page.locator(".studio-current-preview-image > svg")).toHaveCount(0);
      release();
      await expect(page.locator(".studio-current-preview-image > svg")).toBeVisible();
      await expect(embed).toBeEnabled();
      await embed.click();
      await expect(page.locator(".widget-share-modal .code-label code")).toContainText("iframe");
      await expect(page.getByRole("heading", { name: "Dieser Teil konnte nicht geladen werden" })).toHaveCount(0);
      expect(errors).toEqual([]);
    } finally { release(); }
  });
}
