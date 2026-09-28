import {test,expect} from '@playwright/test';
test.use({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
const studio='/?view=studio&lang=de';
test('mobile header keeps Studio beside the logo; installed app only uses bottom navigation',async({page})=>{
  await page.goto(studio);
  for(const width of [320,390,430,768]){
    await page.setViewportSize({width,height:900});
    const brand=await page.locator('.site-header .brand').boundingBox(),nav=await page.locator('.product-navigation').boundingBox();
    expect(Math.abs((brand.y+brand.height/2)-(nav.y+nav.height/2))).toBeLessThan(9);
    expect(nav.x).toBeGreaterThan(brand.x);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.addInitScript(()=>{const match=window.matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:true,addEventListener(){},removeEventListener(){}}:match(q);});
  await page.reload();
  await expect(page.locator('.product-navigation')).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.product-navigation')).toBeHidden();
  await expect(page.locator('.mobile-app-nav').getByRole('link',{name:'Studio',exact:true})).toBeVisible();
  for(const path of ['/?lang=de','/?region=bundestag&lang=de','/?view=watchlist&lang=de']){
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('data-standalone','true');
    await expect(page.locator('.site-header .product-navigation')).toBeHidden();
    await expect(page.locator('.mobile-app-nav').getByRole('link',{name:'Studio',exact:true})).toBeVisible();
  }
});
test('selection widths stay fixed; outside tap closes only the dropdown',async({page},info)=>{
  await page.goto(studio);
  const dataset=page.getByRole('combobox',{name:'Datensatz'}),language=page.locator('.studio-global-controls .studio-select > button').nth(1);
  const before=await language.boundingBox();
  await dataset.click();await page.getByRole('option',{name:'Mecklenburg-Vorpommern',exact:true}).click();
  expect(await language.boundingBox()).toEqual(before);
  const sort=page.locator('.studio-library-navigation [role=combobox]');
  const original=await sort.boundingBox();await sort.click();await page.getByRole('option',{name:'Kürzlich angesehen',exact:true}).click();
  expect(await sort.boundingBox()).toEqual(original);
  await dataset.click();await language.click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await language.click();await expect(page.getByRole('listbox')).toHaveCount(1);
  await page.evaluate(()=>window.scrollBy(0,150));await expect(page.getByRole('listbox')).toHaveCount(0);
  await page.screenshot({path:info.outputPath('mobile-controls.png')});
});
test('introduction stays fixed and compact; native modal locks background and restores scroll',async({page,browserName},info)=>{
  await page.goto(studio);const notice=page.locator('.studio-announcement');await expect(notice).toBeVisible();
  await page.waitForTimeout(650);const before=await notice.boundingBox();expect(before.height).toBeLessThan(105);
  await page.evaluate(()=>window.scrollTo(0,450));
  expect(Math.abs((await notice.boundingBox()).y-before.y)).toBeLessThan(2);
  await notice.getByRole('button',{name:/Video ansehen/}).click();
  const modal=page.locator('dialog[open]');await expect(modal).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-modal-scroll-locked','true');
  const top=await page.locator('body').evaluate(e=>e.getBoundingClientRect().top);
  if(browserName!=='webkit'){await page.mouse.move(5,800);await page.mouse.wheel(0,700);}
  await page.evaluate(()=>window.scrollBy(0,700));await page.waitForTimeout(120);
  expect(await page.locator('body').evaluate(e=>e.getBoundingClientRect().top)).toBe(top);
  await page.screenshot({path:info.outputPath('mobile-dialog.png')});
  await modal.getByRole('button',{name:'Schließen',exact:true}).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-modal-scroll-locked','true');
  expect(await page.evaluate(()=>window.scrollY)).toBeCloseTo(450,0);
});
async function gesture(page,dx,dy,multi=false){
 await page.locator('.studio-current-preview-image').evaluate((el,{dx,dy,multi})=>{
  const r=el.getBoundingClientRect(),x=r.x+r.width*.6,y=r.y+Math.min(120,r.height*.5);
  const t=(id,x,y)=>({identifier:id,target:el,clientX:x,clientY:y});
  const start=[t(1,x,y)],end=[t(1,x+dx,y+dy)];
  const emit=(type,touches,changedTouches)=>{const e=new Event(type,{bubbles:true});Object.defineProperties(e,{touches:{value:touches},changedTouches:{value:changedTouches}});el.dispatchEvent(e);};
  emit('touchstart',start,start);
  emit('touchmove',multi?[...end,t(2,x+10,y+10)]:end,end);
  emit('touchend',[],end);
 },{dx,dy,multi});
}
test('preview swipes use neighbouring designs, not vertical scroll or pinch gestures',async({page})=>{
 await page.goto(studio+'&template=poll-classic&editor=1&workspace=preview');
 await expect(page.locator('.studio-current-preview-image svg')).toBeVisible();
 const template=()=>new URL(page.url()).searchParams.get('template');const initial=template();
 await gesture(page,-140,10);await expect.poll(template).not.toBe(initial);
 await gesture(page,140,5);await expect.poll(template).toBe(initial);
 await gesture(page,-20,150);await page.waitForTimeout(200);expect(template()).toBe(initial);
 await gesture(page,-140,0,true);await page.waitForTimeout(200);expect(template()).toBe(initial);
});
test('keyboard and internal menu scrolling do not scroll the document or close the list',async({page})=>{
 await page.goto(studio);
 const dataset=page.getByRole('combobox',{name:'Datensatz'});
 await dataset.focus();await page.keyboard.press('End');
 await expect(page.getByRole('listbox')).toBeVisible();
 expect(await page.getByRole('listbox').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>scrollY)).toBe(0);
 await page.keyboard.press('Home');await page.keyboard.press('Enter');
 await expect(page.getByRole('listbox')).toHaveCount(0);
 await dataset.click();await page.keyboard.press('Escape');
 await expect(page.getByRole('listbox')).toHaveCount(0);
});
test('nested dialogs keep the page locked until the last closes',async({page})=>{
 await page.goto(studio);await expect(page.locator('.studio-shell')).toBeVisible();
 await expect(page.locator('.studio-gallery')).toBeVisible();
 await page.evaluate(()=>{window.scrollTo({top:300,behavior:'instant'});for(const id of ['outer','inner']){const d=document.createElement('dialog');d.style.position='fixed';d.id=id;d.textContent=id;document.body.append(d);d.showModal();}});
 await expect(page.locator('html')).toHaveAttribute('data-modal-scroll-locked','true');
 await page.evaluate(()=>document.querySelector('#inner').remove());
 await expect(page.locator('html')).toHaveAttribute('data-modal-scroll-locked','true');
 await page.evaluate(()=>document.querySelector('#outer').remove());
 await expect(page.locator('html')).not.toHaveAttribute('data-modal-scroll-locked','true');
 expect(await page.evaluate(()=>scrollY)).toBeCloseTo(300,0);
});
test('narrow dark layout remains within viewport with enlarged text',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('opinion-poll-theme','dark'));
 await page.goto(studio+'&theme=dark');
 await page.setViewportSize({width:320,height:740});
 await page.addStyleTag({content:'html {font-size:20px}'});
 await expect(page.locator('.studio-gallery')).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
 await page.screenshot({path:info.outputPath('dark-large-text.png')});
});
test('browser touch pipeline permits a horizontal preview swipe',async({page,browserName})=>{
 test.skip(browserName!=='chromium','Chromium-specific trusted touch injection');
 await page.goto(studio+'&template=poll-classic&editor=1&workspace=preview');
 const preview=page.locator('.studio-current-preview-image');
 await expect(preview.locator('svg')).toBeVisible();
 await preview.scrollIntoViewIfNeeded();
 const r=await preview.boundingBox(),x=r.x+r.width*.8,y=r.y+Math.min(r.height*.5,100);
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-i*17,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect.poll(()=>new URL(page.url()).searchParams.get('template')).not.toBe('poll-classic');
});
