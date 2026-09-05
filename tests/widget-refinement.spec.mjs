import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});

async function assertToolbarClear(card) {
  const conflicts=await card.evaluate(root=>{
    const visible=node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0;};
    const tools=[...root.querySelectorAll('.graph-info-popover>summary,.widget-share-tools,.historical-main-publish-tools,.approval-current-tools')].filter(visible);
    const text=[...root.querySelectorAll('h2,h3,.status-dot,.majority-badge,.chart-actions>.secondary-button')].filter(visible);
    return tools.flatMap(tool=>text.filter(node=>{
      const a=tool.getBoundingClientRect(),b=node.getBoundingClientRect();
      return a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
    }).map(node=>node.textContent));
  });
  expect(conflicts).toEqual([]);
}

test('corner tools have their own row above titles and supporting controls',async({page},testInfo)=>{
  for(const region of ['bundestag','uk-westminster','spain-congress']) {
    await page.goto(`/?region=${region}&lang=de`);
    await expect(page.locator('.results-card')).toBeVisible();
    for(const card of await page.locator('.results-card,.historical-main-chart,.projection-section:has(.widget-share-tools)').all()) await assertToolbarClear(card);
    expect(await page.locator('.results-card .party-name').evaluateAll(nodes=>nodes.filter(node=>{
      const label=node.querySelector('.party-info-trigger');
      if(!label)return false;
      const a=node.getBoundingClientRect(),b=label.getBoundingClientRect();
      return b.top<a.top-1 || b.bottom>a.bottom+1 || label.scrollWidth>label.clientWidth+1;
    }).map(node=>node.textContent))).toEqual([]);
    await page.locator('.results-card').screenshot({path:`test-results/design-review/${testInfo.project.name}/toolbar-${region}.png`});
  }
});

test('refined approval cards stay compact and readable in supported languages and themes',async({page},testInfo)=>{
  for(const locale of ['de','en-GB','en-US','es']) {
    await page.goto(`/?view=approval&country=de&lang=${locale}`);
    const cards=page.locator('.approval-current-card');
    await expect(cards).toHaveCount(2);
    for(const card of await cards.all()) {
      await assertToolbarClear(card);
      const geometry=await card.evaluate(root=>({height:root.getBoundingClientRect().height,overflow:[...root.querySelectorAll('.approval-current-values>div')].some(node=>node.scrollWidth>node.clientWidth+1),tops:[...root.querySelectorAll('.approval-current-values strong')].map(node=>node.getBoundingClientRect().top)}));
      expect(geometry.height).toBeLessThan(275);
      expect(geometry.overflow).toBe(false);
      expect(Math.max(...geometry.tops)-Math.min(...geometry.tops)).toBeLessThan(2);
    }
    for(const theme of ['light','dark']) {
      await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
      await cards.first().screenshot({path:`test-results/design-review/${testInfo.project.name}/refined-${locale}-${theme}.png`});
    }
  }
});

test('approval Watchlist gives each value a label without nested panels',async({page},testInfo)=>{
  await page.addInitScript(()=>{
    const original=window.matchMedia.bind(window);
    window.matchMedia=query=>query==='(display-mode: standalone)' ? {matches:true,addEventListener(){},removeEventListener(){}} : original(query);
    localStorage.setItem('pollframe-watchlist-de-v2',JSON.stringify([{id:'approval-review',country:'de',regionSlug:'bundestag',type:'approval',partyIds:[],layout:'wide',label:'Zufriedenheit',createdAt:'2026-09-05',lastSnapshot:null}]));
  });
  await page.goto('/?view=watchlist&country=de&lang=de');
  const card=page.locator('.watch-card-approval');
  await expect(card.locator('.watch-approval-summary tbody td')).toHaveCount(6);
  const overflow=await card.evaluate(node=>[...node.querySelectorAll('th,td,.watch-approval-age')].filter(element=>element.scrollWidth>element.clientWidth+1 || element.getBoundingClientRect().bottom>node.getBoundingClientRect().bottom-5).map(element=>element.textContent));
  expect(overflow).toEqual([]);
  for(const theme of ['light','dark']) {
    await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
    await card.screenshot({path:`test-results/design-review/${testInfo.project.name}/watchlist-${theme}.png`});
  }
  for(const locale of ['en-GB','es']) {
    await page.goto(`/?view=watchlist&country=de&lang=${locale}`);
    await expect(card.locator('tbody td')).toHaveCount(6);
    expect(await card.evaluate(node=>node.scrollHeight-node.clientHeight)).toBeLessThanOrEqual(1);
  }
});

test('narrow phone approval labels and values remain within their cells',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='iphone-13-chromium');
  await page.setViewportSize({width:320,height:700});
  for(const country of ['de','uk']) {
    await page.goto(`/?view=approval&country=${country}&lang=en-GB`);
    await expect(page.locator('.approval-current-card').first()).toBeVisible();
    for(const card of await page.locator('.approval-current-card').all()) {
      await assertToolbarClear(card);
      const overflow=await card.evaluate(root=>[...root.querySelectorAll('.approval-current-values>div')].filter(node=>node.scrollWidth>node.clientWidth+1).map(node=>node.textContent));
      expect(overflow).toEqual([]);
    }
    await page.locator('.approval-current-card').first().screenshot({path:`test-results/design-review/${testInfo.project.name}/narrow-${country}.png`});
  }
});
