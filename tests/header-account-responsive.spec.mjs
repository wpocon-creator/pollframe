import {test,expect} from '@playwright/test';
test('account is rightmost, does not overflow and opens on ordinary country pages',async({page},info)=>{
  const requests=[];page.on('request',r=>requests.push(r.url()));
  await page.goto('/?lang=de');
  const account=page.getByRole('button',{name:'Konto',exact:true});
  await expect(account).toBeVisible();
  // Country startup must not download the optional editor, recipe or account UI.
  expect(requests.filter(url=>/studio-(?:event-controls|model|account-lab)(?:\.|-)/.test(url))).toEqual([]);
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    const box=await account.boundingBox();
    const other=await page.locator('.header-actions > .header-button').evaluateAll(nodes=>nodes.map(n=>({account:n.classList.contains('account-entry'),right:n.getBoundingClientRect().right})));
    expect(other.filter(n=>!n.account).every(n=>n.right<=box.x+1)).toBe(true);
  }
  await page.setViewportSize({width:390,height:844});
  await account.click();
  const dialog=page.getByRole('dialog',{name:'Dein Pollframe-Konto'});await expect(dialog).toBeVisible();
  await page.screenshot({path:info.outputPath('account-country-phone.png')});
});
