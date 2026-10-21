import { test, expect } from "@playwright/test";
test.use({ serviceWorkers: "block" });
test("native focus movement cannot shift an information dialog's background or return position", async ({ page }) => {
  await page.addInitScript(() => {
    const native = HTMLDialogElement.prototype.showModal;
    HTMLDialogElement.prototype.showModal = function(...args) {
      native.apply(this,args);
      // Reproduce a browser's synchronous focus scroll, before MutationObserver
      // can see the open attribute. This must never replace the saved position.
      window.scrollTo({top:0,behavior:'instant'});
    };
  });
  await page.goto('/?region=bundestag&lang=de');
  const info = page.locator('.results-card .graph-info-popover > summary');
  await expect(info).toBeVisible();
  await page.evaluate(()=>window.scrollTo({top:450,behavior:'instant'}));
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(450);
  await info.evaluate(element=>element.click());
  const dialog = page.locator('dialog[open]');
  await expect(dialog).toBeVisible();
  await expect(page.locator('html')).toHaveCSS('--modal-scroll-top','-450px');
  await dialog.getByRole('button',{name:'Erklärung schließen'}).click();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(450);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  expect(await page.evaluate(()=>scrollY)).toBe(450);
});
