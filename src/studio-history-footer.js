import {wrapText} from './studio-text-layout.js';

// Layout before rendering, with the same final typography used by StudioSvg.
// Reflow rather than truncating provenance or squeezing it into tiny text.
export function layoutHistoryFooter(blocks,{font,scale=1,weight=400,italic=false,width=864}) {
  let bottom=12;
  const lines=[];
  for(const block of blocks){
    const size=block.fontSize||15;
    const lineHeight=Math.max(22,size*scale*1.5);
    for(const text of wrapText(block.text,width-8,size*scale,font,weight,italic)){
      bottom+=lineHeight;
      lines.push({...block,text,y:bottom,fontSize:size});
    }
    bottom+=6;
  }
  return {lines,height:bottom};
}
