import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function checkFooter(svg){
  await expect(svg.locator('[data-history-footer]')).toBeVisible();
  const problems=await svg.evaluate(root=>{
    const area=root.getBoundingClientRect();
    const rows=[...root.querySelectorAll('[data-history-footer] text')];
    const problems=[];
    for(const [i,node]of rows.entries()){
      const box=node.getBoundingClientRect();
      if(box.left<area.left||box.right>area.right||box.bottom>area.bottom)problems.push('outside: '+node.textContent);
      if(node.dataset.textRole!=='sources')problems.push('wrong role: '+node.textContent);
      if(parseFloat(getComputedStyle(node).fontSize)<19)problems.push('source silently shrunk');
      if(i && rows[i-1].getBoundingClientRect().bottom>box.top+1)problems.push('overlapping source lines');
    }
    return problems;
  });
  expect(problems).toEqual([]);
  await expect(svg.locator('[data-history-footer]')).toContainText('DAWUM');
  await expect(svg.locator('[data-history-footer]')).toContainText('Forschungsgruppe Wahlen');
}

for(const template of ['history-original','party-original'])for(const theme of ['light','dark']){
  test(`${template}: enlarged sources fit in ${theme} editor and publication output`,async({page},info)=>{
    await page.setViewportSize({width:theme==='dark'?820:1440,height:1100});
    await page.addInitScript(()=>{localStorage.setItem('opinion-poll-text-size','large');localStorage.setItem('pollframe-notice-dismissed:studio-guide-v1','yes');});
    const params=new URLSearchParams({view:'studio',template,editor:'1',workspace:'edit',range:'five',theme,lang:theme==='dark'?'es':'de',
      textStyles:JSON.stringify({sources:{font:'lora',scale:1.35,italic:true,weight:700},labels:{font:'mono',scale:1.35,italic:true}})});
    await page.goto('/?'+params);
    const svg=page.locator('.studio-current-preview-image > svg');
    await expect(svg).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>[...document.fonts].some(font=>font.family==='PF Lora'&&font.status==='loaded'))).toBe(true);
    await checkFooter(svg);
    await svg.screenshot({path:info.outputPath('sources-fit.png')});
    if(theme!=='light'||template!=='history-original')return;
    // Check the serialized output, not merely the editor's current DOM.
    const pending=page.waitForEvent('download');
    await page.getByRole('button',{name:'SVG',exact:true}).click();
    const file=await pending;const text=await readFile(await file.path(),'utf8');
    const rendered=await page.context().newPage();
    await rendered.setContent('<!doctype html><html><body>'+text+'</body></html>');
    await rendered.evaluate(()=>document.fonts.ready);
    await checkFooter(rendered.locator('svg'));
    await rendered.close();
    await page.getByRole('button',{name:'PNG herunterladen',exact:true}).click();
    const dialog=page.locator('.png-options-modal');
    await checkFooter(dialog.locator('svg.studio-current-art'));
    const pngPending=page.waitForEvent('download');
    await dialog.getByRole('button',{name:'PNG herunterladen',exact:true}).click();
    const png=await pngPending;await png.saveAs(info.outputPath('source-export.png'));
    expect((await readFile(await png.path())).length).toBeGreaterThan(20000);
    await page.goto('/?'+params);
    await page.getByRole('button',{name:'Embed',exact:true}).click();
    const code=await page.locator('.widget-share-modal .code-label code').textContent();
    const embed=await page.context().newPage();
    await embed.goto(code.match(/src="([^"]+)"/)[1].replaceAll('&amp;','&'));
    await expect(embed.locator('svg.studio-current-art')).toBeVisible();
    await expect.poll(()=>embed.evaluate(()=>[...document.fonts].some(font=>font.family==='PF Lora'&&font.status==='loaded'))).toBe(true);
    await checkFooter(embed.locator('svg.studio-current-art'));
    await embed.screenshot({path:info.outputPath('source-embed.png')});
    await embed.close();
  });
}

for(const theme of ['light','dark'])test(`current-poll editorial notes clear axes and source credits in ${theme}`,async({page},info)=>{
  for(const template of ['poll-wide','poll-paper','poll-lollipop','poll-dotplot','poll-signal']){
    const params=new URLSearchParams({view:'studio',template,editor:'1',workspace:'preview',lang:'de',theme,
      noteSize:'24',editorNote:'1.000 Befragte · Feldzeit: 6.–13. Oktober 2026. Eine Einzelumfrage ist keine Wahlprognose. Ausgewählte Parteien; weitere Anteile sind nicht dargestellt.'});
    await page.goto('/?'+params);
    const svg=page.locator('.studio-current-preview-image > svg');
    await expect(svg).toBeVisible();
    const geometry=await svg.evaluate(root=>{
      const notes=[...root.querySelectorAll('[data-editor-target="note"]')];
      const first=notes[0].getBoundingClientRect(),last=notes.at(-1).getBoundingClientRect();
      const separatorNode=[...root.querySelectorAll('line')].at(-1);
      const others=[...root.querySelectorAll('text')].filter(n=>!notes.includes(n)&&Number(n.getAttribute('y'))<Number(separatorNode.getAttribute('y1')));
      const chartBottom=Math.max(...others.map(n=>n.getBoundingClientRect().bottom));
      const separator=separatorNode.getBoundingClientRect();
      return {lines:notes.length,noteTop:first.top,noteBottom:last.bottom,chartBottom,sourceTop:separator.top};
    });
    expect(geometry.lines,template).toBeGreaterThan(1);
    expect(geometry.noteTop,JSON.stringify({template,geometry})).toBeGreaterThan(geometry.chartBottom+2);
    expect(geometry.noteBottom,template).toBeLessThan(geometry.sourceTop-2);
    if(template==='poll-wide')await svg.screenshot({path:info.outputPath(`note-spacing-${theme}.png`)});
  }
});
