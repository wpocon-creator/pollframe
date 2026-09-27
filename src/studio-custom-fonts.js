const database = () => new Promise((resolve,reject)=>{const r=indexedDB.open("pollframe-studio-fonts",1);r.onupgradeneeded=()=>r.result.createObjectStore("fonts",{keyPath:"key"});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
async function store(mode, action) {const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction("fonts",mode), r=action(tx.objectStore("fonts"));let result;r.onsuccess=()=>result=r.result;tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(tx.error);};});}
export const getCustomFont = key => store("readonly",s=>s.get(key));
export const listCustomFonts = () => store("readonly",s=>s.getAll());
export async function importCustomFont(file) {
  if(!file || file.size>4*1024*1024 || !/\.(woff2?|ttf|otf)$/i.test(file.name)) throw Error("format");
  const bytes=await file.arrayBuffer(), sig=new DataView(bytes);
  if(bytes.byteLength<12 || ![0x774f4632,0x774f4646,0x00010000,0x4f54544f].includes(sig.getUint32(0))) throw Error("format");
  const key="custom-"+crypto.randomUUID(),family="PF "+key;
  // Let the browser validate the font before persisting it. No remote font URL.
  const font=await new FontFace(family,bytes,{weight:"100 900"}).load();
  const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(new Blob([bytes]));});
  const record={key,family,name:file.name.replace(/\.[^.]+$/,"").slice(0,80),data,license:"User-imported font. The user is responsible for the necessary usage rights; local PNG use only."};
  await store("readwrite",s=>s.put(record));document.fonts.add(font);return record;
}
