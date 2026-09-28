import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
for(const region of ['bundestag','uk-westminster','spain-congress']){
 test(`${region}: compact changes retain comparison context in Info and PNG`,async({page},testInfo)=>{
  const activate=element=>testInfo.project.use.hasTouch?element.tap():element.click();
  await page.goto(`/?region=${region}&lang=de`);
  const current=page.locator('.results-card').first(),tendencies=page.locator('.tendency-section');
  await expect(current).toBeVisible();
  await expect(current.locator('.results-note')).toBeHidden();
  await activate(current.locator('summary').first());
  const info=page.locator('dialog[open]');
  await expect(info).toContainText(/Veränderung.*gegenüber|Keine frühere Vergleichsumfrage/);
  await activate(info.getByRole('button',{name:'Erklärung schließen'}));
  await expect(tendencies.locator('.tendency-card').first()).toBeVisible();
  await expect(tendencies.locator('.tendency-card p').first()).toBeHidden();
  await expect(tendencies.locator('.tendency-reading .delta').first()).toBeVisible();
  await activate(tendencies.locator('summary').first());
  await expect(info).toContainText('90 Tage');
  await expect(info).toContainText(/\d{4}/);
  await activate(info.getByRole('button',{name:'Erklärung schließen'}));
  await tendencies.evaluate(el=>el.classList.add('png-export-clone'));
  await expect(tendencies.locator('.comparison-export-detail').first()).toBeVisible();
 });
}
