// WebKit's protocol boundingBox/getContentQuads can omit an SVG element's
// viewBox offset. Use the DOM geometry and verify the visible hit target first.
// This is a real pointer action, never force:true or dispatchEvent.
export async function clickSvg(locator,page,{double=false}={}) {
  await locator.scrollIntoViewIfNeeded();
  const point=await locator.evaluate(node=>{
    const r=node.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    const target=document.elementFromPoint(x,y);
    if(!target || !(node===target || node.contains(target)))throw Error(`SVG is obscured by ${target?.tagName}`);
    return {x,y};
  });
  if(double)await page.mouse.dblclick(point.x,point.y);
  else await page.mouse.click(point.x,point.y);
}
