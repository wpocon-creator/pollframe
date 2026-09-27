// Client-only raster import. Never upload, persist in URLs, or accept SVG.
export async function readBackground(file) {
  if(!file || !/^image\/(png|jpeg|webp|avif|gif|bmp)$/.test(file.type) || file.size>8*1024*1024) throw new Error('type-size');
  const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
  const image=new Image(); image.src=src; await image.decode();
  if(image.naturalWidth*image.naturalHeight>32_000_000) throw new Error('dimensions');
  const scale=Math.min(1,1920/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx) throw new Error('canvas');
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/png');
}
