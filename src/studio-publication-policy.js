// Facts used for publication belong to the source snapshot, never user text.
export const DAWUM_LICENCE_URL = 'https://opendatacommons.org/licenses/odbl/1-0/';
export const unsupportedStudioDataset = input => ['uk','es'].includes(input?.country) || ['uk-westminster','spain-congress'].includes(input?.region);
export function publicationSources(snapshot, state) {
  const sources = [];
  if (/dawum/i.test(snapshot?.source || '')) {
    sources.push({kind:'provider',label:'dawum.de',url:'https://dawum.de/'});
    sources.push({kind:'licence',label:'Open Database License (ODbL) 1.0',url:DAWUM_LICENCE_URL});
  }
  if (snapshot?.kind === 'map') {
    sources.push({kind:'geometry',label:'MapSVG / Victor Cazanave · recoloured by Pollframe',url:'https://github.com/VictorCazanave/svg-maps/tree/master/packages/germany'});
    sources.push({kind:'geometry-licence',label:'Creative Commons Attribution 4.0',url:'https://creativecommons.org/licenses/by/4.0/'});
  }
  return sources;
}

// Source text can be styled, but not made invisible against a solid surface.
// Invalid colours fall back to the renderer's safe default.
export function readableSourceColour(colour, background) {
  const rgb = hex => /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(hex || '')
    ? (hex.length===4 ? [...hex.slice(1)].map(c=>parseInt(c+c,16)) : [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)))
    : null;
  const luminance = channels => channels.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const bg=rgb(background),fg=rgb(colour);
  if(!bg||!fg)return null;
  const b=luminance(bg),f=luminance(fg);
  if((Math.max(b,f)+.05)/(Math.min(b,f)+.05)>=4.5)return colour;
  return b>.179?'#172130':'#f4f7fb';
}
