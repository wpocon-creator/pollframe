import React, { lazy, Suspense, useState } from "react";
import { Icon } from "./pollframe-ui.jsx";

const LazyPngExportModal = lazy(() => import("./png-export.jsx").then((module) => ({ default: module.PngExportModal })));

export function PngExportButton({ elementRef, filename, title, subtitle, locale, label, credit, profile = "chart", className = "secondary-button" }) {
  const [open, setOpen] = useState(false);
  const buttonLabel = label ?? (locale === "de" ? "PNG exportieren" : locale === "es" ? "Exportar PNG" : "Export PNG");
  return <>
    <button className={`${className} png-export-button`} type="button" onClick={() => setOpen(true)} data-export-ignore="true"><Icon name="download" size={17} />{buttonLabel}</button>
    {open && <Suspense fallback={null}><LazyPngExportModal open onClose={() => setOpen(false)} elementRef={elementRef} filename={filename} title={title} subtitle={subtitle} locale={locale} credit={credit} profile={profile} /></Suspense>}
  </>;
}
