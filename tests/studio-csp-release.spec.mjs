import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block',ignoreHTTPSErrors:true}); // Self-signed local Worker certificate only.
test('production policy supports the editor while untrusted settings cannot add active content',async({page})=>{
 test.skip(!process.env.POLLFRAME_TEST_BASE_URL?.includes(':4177'),'Run against the local production Worker, not the headerless Vite preview');
 const dialogs=[],errors=[];
 page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.dismiss();});
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  window.policyViolations=[];
  document.addEventListener('securitypolicyviolation',event=>window.policyViolations.push({directive:event.effectiveDirective,url:event.blockedURI}));
 });
 const q=new URLSearchParams({view:'studio',region:'berlin',template:'poll-classic',editor:'1',lang:'en-GB',headline:'<img src=x onerror=alert(1)>',background:'url(https://evil.invalid/image)',source:'Forged source',results:'{"1":100}',font:'javascript:alert(1)'});
 const response=await page.goto('/?'+q,{waitUntil:'domcontentloaded'});
 expect(response.headers()['content-security-policy']).toContain("script-src 'self'");
 expect(response.headers()['x-frame-options']).toBe('DENY');
 const svg=page.locator('.studio-current-preview-image > svg');
 await expect(svg).toBeVisible();
 await expect(svg).toContainText(/dawum/i);
 await expect(svg).not.toContainText('Forged source');
 expect(await svg.locator('script,foreignObject,[onerror],[onclick]').count()).toBe(0);
 expect(await page.evaluate(()=>window.policyViolations)).toEqual([]);
 expect(dialogs).toEqual([]);expect(errors).toEqual([]);
});
