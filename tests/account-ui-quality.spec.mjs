import {test,expect} from '@playwright/test';
test('recovery token survives Studio URL normalization and lazy account loading',async({page})=>{
  await page.route('**/api/account/capabilities',r=>r.fulfill({contentType:'application/json',body:'{"enabled":true,"localOnly":false}'}));
  await page.route('**/api/auth/get-session',r=>r.fulfill({contentType:'application/json',body:'null'}));
  let submitted;
  await page.route('**/api/auth/reset-password',r=>{submitted=r.request().postDataJSON();return r.fulfill({contentType:'application/json',body:'{"status":true}'});});
  await page.goto('/?view=studio&lang=de&account=reset&token=regression-only-token');
  const dialog=page.getByRole('dialog',{name:'Dein Pollframe-Konto'});
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Neues Passwort',{exact:true}).fill('A changed secure passphrase 2026');
  await dialog.getByRole('button',{name:'Passwort ändern',exact:true}).click();
  await expect(dialog.getByRole('status')).toContainText('Passwort geändert');
  expect(submitted.token).toBe('regression-only-token');
  expect(new URL(page.url()).searchParams.has('token')).toBe(false);
  const reportLinks=await page.locator('a[href*="bug-report"]').evaluateAll(links=>links.map(link=>link.href));
  expect(reportLinks.length).toBeGreaterThan(0);
  for(const href of reportLinks) expect(decodeURIComponent(href)).not.toContain('regression-only-token');
  await expect(dialog.getByRole('button',{name:'Lokalen Test-Postausgang öffnen'})).toHaveCount(0);
});
async function open(page){
  await page.goto('/?view=studio&lang=de&topic=current');
  await page.getByRole('button',{name:'Konto',exact:true}).click();
  return page.getByRole('dialog',{name:'Dein Pollframe-Konto'});
}
test('unavailable account service never presents a working public registration',async({page})=>{
  await page.route('**/api/account/capabilities',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
  const dialog=await open(page);
  await expect(dialog.getByRole('status')).toContainText('Öffentliche Konten sind noch nicht freigeschaltet');
  await expect(dialog.getByRole('button',{name:'Registrieren',exact:true})).toHaveCount(0);
});
test('test-only email restriction, password visibility and failed login remain usable',async({page},info)=>{
  await page.route('**/api/account/capabilities',r=>r.fulfill({contentType:'application/json',body:'{"localOnly":true}'}));
  await page.route('**/api/auth/get-session',r=>r.fulfill({contentType:'application/json',body:'null'}));
  let requests=0;
  await page.route('**/api/auth/sign-in/email',async r=>{
    requests++;
    await new Promise(resolve=>setTimeout(resolve,250));
    await r.fulfill({status:401,contentType:'application/json',body:'{"message":"Test: ungültige Zugangsdaten"}'});
  });
  const dialog=await open(page);
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>document.documentElement.style.fontSize='32px');
  await dialog.getByLabel('Test-E-Mail').fill('do-not-send@example.com');
  await dialog.getByLabel('Passwort',{exact:true}).fill('Only a local test password');
  await dialog.locator('form').getByRole('button',{name:'Anmelden',exact:true}).click();
  expect(requests).toBe(0);
  expect(await dialog.getByLabel('Test-E-Mail').evaluate(e=>e.validity.patternMismatch)).toBe(true);
  await dialog.getByLabel('Test-E-Mail').fill('nobody@example.test');
  await dialog.getByRole('button',{name:'Passwort anzeigen',exact:true}).click();
  await expect(dialog.getByLabel('Passwort',{exact:true})).toHaveAttribute('type','text');
  await dialog.locator('form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});
  await expect(dialog.getByRole('status')).toContainText('ungültige Zugangsdaten');
  expect(requests).toBe(1);
  await expect(dialog.locator('form').getByRole('button',{name:'Anmelden',exact:true})).toBeEnabled();
  const box=await dialog.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(391);
  expect(box.height).toBeLessThanOrEqual(844*.76);
  await page.screenshot({path:info.outputPath('account-error-large-text.png')});
});
