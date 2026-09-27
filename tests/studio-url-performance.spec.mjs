import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test('sustained slider changes keep the editor alive and coalesce history updates',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?view=studio&lang=en-GB&template=poll-classic&editor=1&workspace=edit');
 const slider=page.getByRole('slider',{name:'Font size',exact:true});
 await expect(slider).toBeVisible();
 await page.evaluate(()=>{window.__historyWrites=0;const replace=history.replaceState.bind(history);history.replaceState=(...args)=>{window.__historyWrites++;return replace(...args);};});
 await slider.evaluate(async input=>{
   const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
   input.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
   for(let i=0;i<140;i++){
     set.call(input,String(30+i%25));input.dispatchEvent(new Event('input',{bubbles:true}));
     await new Promise(r=>setTimeout(r,20));
   }
   set.call(input,'42');input.dispatchEvent(new Event('input',{bubbles:true}));
   input.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
 });
 await expect(page.locator('[data-assistant-state]')).toHaveAttribute('data-assistant-state',/"titleSize":42/);
 await expect(page).toHaveURL(/titleSize=42(?:&|$)/);
 expect(await page.evaluate(()=>window.__historyWrites)).toBeLessThan(80);
 expect(errors).toEqual([]);
 await page.reload();
 await expect(page.locator('[data-assistant-state]')).toHaveAttribute('data-assistant-state',/"titleSize":42/);
});
