import {test,expect} from '@playwright/test';
for(const [template,width,height] of [['history-original',1440,960],['poll-classic',1440,960],['poll-pie',820,1180],['seats-ring',820,1180]]) {
 test(`${template}: dark, large typography retains grouped legend geometry`,async({page},info)=>{
  await page.setViewportSize({width,height});
  await page.addInitScript(()=>localStorage.setItem('pollframe-notice-dismissed:studio-guide-v1','yes'));
  const styles=JSON.stringify({labels:{font:'mono',scale:1.35,italic:true},sources:{font:'serif',scale:1.15}});
  await page.goto(`/?view=studio&lang=en-GB&template=${template}&theme=dark&editor=1&workspace=edit&textStyles=${encodeURIComponent(styles)}&range=five&titleSize=48`);
  const svg=page.locator('.studio-current-preview-image > svg');
  await expect(svg).toBeVisible();
  await expect(svg).toHaveAttribute('data-direct-edit-ready','true');
  const groups=svg.locator('[data-editor-target="legend"]');
  expect(await groups.count()).toBeGreaterThan(1);
  const problems=await groups.evaluateAll(nodes=>nodes.flatMap(n=>{
   const visible=n.getBoundingClientRect(),unit=n.ownerSVGElement.getScreenCTM().a,box={width:visible.width/unit,height:visible.height/unit},maxW=Number(n.dataset.layoutWidth),maxH=Number(n.dataset.layoutHeight);
   const marker=n.querySelector('circle,line,path'),texts=[...n.querySelectorAll('text')];
   const issues=[];
   if(box.width>maxW+2)issues.push('width '+n.dataset.legendId);
   if(box.height>maxH+2)issues.push('height '+n.dataset.legendId);
   if(!marker||!texts.length)issues.push('ungrouped marker '+n.dataset.legendId);
   if(marker?.hasAttribute('data-studio-item')||texts.some(t=>t.hasAttribute('data-studio-item')))issues.push('detachable children '+n.dataset.legendId);
   return issues;
  }));
  expect(problems).toEqual([]);
  const all=await groups.first().boundingBox();expect(all).not.toBeNull();
  const documentWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(documentWidth).toBeLessThanOrEqual(width+2);
  const preview=await page.locator('.studio-current-preview-image').boundingBox(),panel=await page.locator('.studio-inspector-panel').boundingBox();
  expect(preview.x+preview.width).toBeLessThanOrEqual(panel.x-8);
  await page.screenshot({path:info.outputPath(`${template}-dark-large.png`)});
 });
}
