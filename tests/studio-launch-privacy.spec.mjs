import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
for(const [lang,title] of [['de','Datenschutzerklärung'],['en-GB','Privacy notice'],['en-US','Privacy notice'],['es','Política de privacidad']]) {
 test(`complete lazy privacy notice and working opt-out: ${lang}`,async({page})=>{
  await page.goto('/?page=datenschutz&lang='+lang);
  await expect(page.getByRole('heading',{level:1,name:title})).toBeVisible();
  const notice=page.locator('.privacy-page');
  await expect(notice).toContainText('31');await expect(notice).toContainText('400');await expect(notice).toContainText('URL');
  await expect(notice.locator('h2')).toHaveCount(10);
  const opt=notice.locator('a[href*="analytics=off"]');await expect(opt).toBeVisible();
  expect(await notice.locator('a[href="mailto:william@pollframe.com"]').count()).toBe(1);
  await opt.click();await expect(page).toHaveURL(/analytics=off/);
  await expect(page.getByRole('heading',{level:1,name:title})).toBeVisible();
 });
}
