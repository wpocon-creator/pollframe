import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
for(const theme of ['light','dark'])for(const template of ['poll-classic','history-original','party-original','seats-original','majority-original','tendencies-original','map-original']) {
  test(`${template}: protected provenance survives custom title and ${theme} styles`,async({page},info)=>{
    await page.addInitScript(()=>localStorage.setItem('pollframe-notice-dismissed:studio-guide-v1','yes'));
    const q=new URLSearchParams({view:'studio',template,editor:'1',lang:'en-GB',region:'berlin',headline:'Our newsroom headline',theme,
      textStyles:JSON.stringify({sources:{color:theme==='dark'?'#141e2b':'#ffffff',scale:1.1}})});
    await page.goto('/?'+q);
    const svg=page.locator('.studio-current-preview-image > svg');
    await expect(svg).toBeVisible();
    await expect(svg).toContainText(/dawum/i);
    await expect(svg).toContainText('odbl.dawum.de');
    if(template!=='map-original')await expect(svg).toContainText('Berlin');
    if(template==='map-original')await expect(svg).toContainText('CC BY 4.0');
    const outside=await svg.evaluate(root=>{
      const area=root.getBoundingClientRect();
      return [...root.querySelectorAll('text[data-text-role="sources"]')].filter(node=>{
        const b=node.getBoundingClientRect();return b.right>area.right+2||b.left<area.left-2||b.bottom>area.bottom+2;
      }).map(node=>node.textContent);
    });
    expect(outside).toEqual([]);
    await svg.screenshot({path:info.outputPath('provenance.png')});
  });
}
