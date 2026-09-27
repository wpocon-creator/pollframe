import React, { lazy, Suspense, useState } from "react";
import { STUDIO_FONTS } from "./studio-fonts.js";
const FontLibrary = lazy(()=>import("./studio-font-library.jsx"));
export default function StudioFontButton({value,onChange,l}) {
  const [open,setOpen]=useState(false);
  return <><button type="button" className="secondary-button studio-font-button" onClick={()=>setOpen(true)}><span aria-hidden="true">Aa</span><span>{l("Schriftart ändern","Change typeface","Cambiar tipografía")}<small>{value==="auto"?l("Design-Schrift","Design typeface","Tipografía del diseño"):STUDIO_FONTS.find(f=>f[0]===value)?.[1] || l("Eigene Schrift","Custom typeface","Tipografía propia")}</small></span></button>{open && <Suspense fallback={<span role="status">{l("Schriften laden…","Loading fonts…","Cargando tipografías…")}</span>}><FontLibrary value={value} onChange={onChange} onClose={()=>setOpen(false)} l={l}/></Suspense>}</>;
}
