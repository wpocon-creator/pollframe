// Explicit, bounded acceptance on the separate preview; never target production.
import{test,expect}from'@playwright/test';
const origin='https://test.pollframe.com';
test.use({serviceWorkers:'block'});
test.skip(process.env.POLLFRAME_TEST_BASE_URL!==origin,'Explicit preview opt-in only');
test('live preview: Wahlframe, isolated accounts, no tracking and mobile layout',async({page,request},info)=>{
  test.setTimeout(90_000);
  await page.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));
  const tracking=[],errors=[];
  page.on('request',r=>{if(/cloudflareinsights|beacon\.min\.js/.test(r.url())||(/\/api\/analytics|\/api\/studio-popular/.test(r.url())&&r.method()==='POST'))tracking.push(r.url());});
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(origin+'/wahlframe');
  expect(response.status()).toBe(200);
  expect(response.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.locator('.pf-preview-notice')).toContainText('Testversion');
  await expect(page.locator('.pm-start-card')).toBeVisible();
  await page.locator('.pm-topic-entry-card[data-round="economy"]').click();
  for(let i=0;i<15;i++){
    await page.locator('.pm-choices label').nth(i%3).click();
    await page.locator('.pm-question-actions .pm-primary').click();
  }
  await expect(page.locator('.pm-results')).toBeVisible();
  await page.locator('.pm-results>.pm-view-heading').getByRole('button',{name:'Im Konto speichern',exact:true}).click();
  const account=page.getByRole('dialog',{name:'Dein Pollframe-Konto',exact:true});
  await expect(account.getByLabel('E-Mail',{exact:true})).toBeVisible();
  expect(new URL(page.url()).origin).toBe(origin);
  await page.screenshot({path:info.outputPath('preview-account-ready.png')});
  await account.getByRole('button',{name:'Schließen',exact:true}).click();
  for(const path of ['/api/account/documents','/api/account/private-results']){
    const r=await request.get(origin+path);
    expect(r.status()).toBe(401);
    expect(r.headers()['cache-control']).toContain('no-store');
    expect(r.headers()['x-robots-tag']).toContain('noindex');
  }
  const cross=await request.post(origin+'/api/auth/sign-in/email',{headers:{Origin:'https://evil.example','Content-Type':'application/json'},data:{}});
  expect(cross.status()).toBe(403);
  const robots=await request.get(origin+'/robots.txt');
  expect(await robots.text()).toContain('Disallow: /');
  expect(await page.locator('meta[name=robots]').getAttribute('content')).toContain('noindex');
  expect(await page.locator('link[rel=canonical]').count()).toBe(0);
  for(const attr of['dark','light']){
    await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.documentElement.style.fontSize='24px';},attr);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
  expect(tracking).toEqual([]);expect(errors).toEqual([]);
  await page.screenshot({path:info.outputPath('preview-results-large.png')});
  await page.goto(origin+'/studio?lang=de');
  await expect(page.locator('.studio-shell')).toBeVisible();
  expect(await page.locator('meta[name=robots]').getAttribute('content')).toContain('noindex');
  expect(new URL(page.url()).origin).toBe(origin);
});
