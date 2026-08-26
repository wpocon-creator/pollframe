import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./pollframe-ui.jsx";
import { trackAggregateEvent } from "./aggregateAnalytics.js";

const PRESETS = {
  content: { width: 1600, height: null, pixelRatio: 2 },
  landscape: { width: 1920, height: 1080, pixelRatio: 1 },
  square: { width: 1080, height: 1080, pixelRatio: 1 },
  portrait: { width: 1080, height: 1350, pixelRatio: 1 },
  story: { width: 1080, height: 1920, pixelRatio: 1 },
};

const PROFILES = {
  chart: { formats: ["content", "landscape", "square"], recommended: "landscape" },
  approval: { formats: ["content", "landscape", "square"], recommended: "landscape" },
  map: { formats: ["content", "landscape", "square"], recommended: "landscape" },
  widget: { formats: ["content", "square", "portrait"], recommended: "square" },
  insight: { formats: ["content", "square", "portrait"], recommended: "portrait" },
};

function numberLocale(locale) {
  if (locale === "de") return "de-DE";
  if (locale === "es") return "es-ES";
  return locale === "en-US" ? "en-US" : "en-GB";
}

function safeFilenamePart(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

function copyFor(locale) {
  if (locale === "de") return {
    title: "PNG exportieren",
    intro: "Wähle ein Format. Die Vorschau und die ausgegebene Bildgröße ändern sich mit deiner Auswahl.",
    content: "Vollständige Grafik", contentMeta: "automatische Höhe · 3200 px breit",
    landscape: "Breitbild", landscapeMeta: "16:9 · 1920 × 1080",
    square: "Quadrat", squareMeta: "1:1 · 1080 × 1080",
    portrait: "Feed-Hochformat", portraitMeta: "4:5 · 1080 × 1350",
    story: "Story", storyMeta: "9:16 · 1080 × 1920",
    recommended: "Empfohlen",
    download: "PNG herunterladen",
    save: "Bild sichern oder teilen",
    preparing: "PNG wird erstellt …",
    ready: "Der Download wurde gestartet.",
    shared: "Das Systemmenü wurde geöffnet.",
    failed: "Der PNG-Export ist fehlgeschlagen.",
    close: "Schließen",
    chartNote: "Für Zeitreihen bleiben Achsen und Beschriftungen im Breitbild am besten lesbar.",
    approvalNote: "Für die historische Zufriedenheitsgrafik ist Breitbild für Artikel und Präsentationen optimiert.",
    mapNote: "Für Karten bewahrt Breitbild die geografischen Formen und Legenden am klarsten.",
    widgetNote: "Für kompakte Kennzahlen und Widgets ist das Quadrat meist die ausgewogenste Darstellung.",
    insightNote: "Für längere Listen und Einordnungen nutzt das Hochformat den Platz am besten.",
    systemHelp: "Auf iPhone und iPad kann Pollframe nur das geschützte Systemmenü öffnen; dort lässt sich das Bild in Fotos sichern. Browser dürfen nicht direkt in die Fotomediathek schreiben.",
  };
  if (locale === "es") return {
    title: "Exportar PNG",
    intro: "Elige un formato. La vista previa y el tamaño de la imagen cambian con la selección.",
    content: "Gráfico completo", contentMeta: "altura automática · 3200 px de ancho",
    landscape: "Horizontal", landscapeMeta: "16:9 · 1920 × 1080",
    square: "Cuadrado", squareMeta: "1:1 · 1080 × 1080",
    portrait: "Vertical para feed", portraitMeta: "4:5 · 1080 × 1350",
    story: "Historia", storyMeta: "9:16 · 1080 × 1920",
    recommended: "Recomendado", download: "Descargar PNG", save: "Guardar o compartir imagen",
    preparing: "Creando PNG…", ready: "La descarga ha comenzado.", shared: "Se abrió el menú del sistema.", failed: "No se pudo exportar el PNG.", close: "Cerrar",
    chartNote: "En las series temporales, el formato horizontal mantiene los ejes y rótulos más legibles.",
    approvalNote: "El formato horizontal está optimizado para artículos y presentaciones de esta serie histórica.",
    mapNote: "En los mapas, el formato horizontal conserva mejor las formas y la leyenda.",
    widgetNote: "En indicadores y módulos compactos, el cuadrado suele ser la opción más equilibrada.",
    insightNote: "En listas y explicaciones largas, el formato vertical aprovecha mejor el espacio.",
    systemHelp: "En iPhone y iPad, Pollframe solo puede abrir el menú seguro del sistema; desde allí puedes guardar la imagen en Fotos.",
  };
  return {
    title: "Export PNG",
    intro: "Choose a format. The preview and exported image size change with your selection.",
    content: "Full graphic", contentMeta: "automatic height · 3200 px wide",
    landscape: "Landscape", landscapeMeta: "16:9 · 1920 × 1080",
    square: "Square", squareMeta: "1:1 · 1080 × 1080",
    portrait: "Feed portrait", portraitMeta: "4:5 · 1080 × 1350",
    story: "Story", storyMeta: "9:16 · 1080 × 1920",
    recommended: "Recommended", download: "Download PNG", save: "Save or share image",
    preparing: "Creating PNG…", ready: "The download has started.", shared: "The system share sheet opened.", failed: "PNG export failed.", close: "Close",
    chartNote: "For time series, landscape keeps axes and labels most readable.",
    approvalNote: "Landscape is optimised for articles and presentations using this historical series.",
    mapNote: "For maps, landscape preserves geographic shapes and legends most clearly.",
    widgetNote: "For compact figures and widgets, square is usually the most balanced format.",
    insightNote: "For longer lists and explanations, portrait makes the best use of the space.",
    systemHelp: "On iPhone and iPad, Pollframe can only open the protected system share sheet; choose Save Image there. Browsers cannot write directly to Photos.",
  };
}

function freezeExportStyles(root) {
  const properties = [
    "color", "background-color", "background-image", "border-color", "border-radius",
    "box-shadow", "fill", "fill-opacity", "stroke", "stroke-opacity", "stroke-width",
    "font-family", "font-size", "font-style", "font-weight", "letter-spacing", "line-height",
    "opacity", "paint-order", "text-anchor", "text-transform",
  ];
  [root, ...root.querySelectorAll("*")].forEach((node) => {
    const computed = window.getComputedStyle(node);
    for (const property of properties) {
      const value = computed.getPropertyValue(property);
      if (value && value !== "normal") node.style.setProperty(property, value);
    }
    node.style.setProperty("animation", "none");
    node.style.setProperty("transition", "none");
  });
}

function cleanExportClone(clone) {
  clone.querySelectorAll("[data-export-ignore], .interactive-event-layer, .event-dot, .event-dot-hit, .event-anchor, .chart-hover-card, .event-hover-card, .chart-scroll-hint, .event-key, .chart-footer").forEach((node) => node.remove());
  clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  clone.querySelectorAll("path.series-halo,path.series-line,path.average-series-halo,path.average-series-line").forEach((path) => path.setAttribute("fill", "none"));
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("inert", "");
  return clone;
}

function triggerBlobDownload(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = objectUrl;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}

export async function renderElementPng({ element, filename, title, subtitle, locale = "en-GB", credit = "Pollframe", preset = "content", profile = "chart" }) {
  if (!element) throw new Error("Missing export element");
  const format = PRESETS[preset] ?? PRESETS.content;
  if (document.fonts?.ready) await document.fonts.ready;
  // Historical charts use a deliberately simpler narrow-screen SVG. Export
  // the stable wide geometry on every device so a phone download contains the
  // same labels and resolution as a desktop download.
  window.dispatchEvent(new CustomEvent("pollframe:export-layout", { detail: { wide: true } }));
  await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
  const host = document.createElement("div");
  host.className = "png-export-host";
  const surface = document.createElement("section");
  surface.className = "png-export-surface";
  surface.dataset.exportProfile = profile;
  surface.dir = "ltr";
  surface.lang = locale === "de" ? "de" : locale === "es" ? "es" : "en";
  const header = document.createElement("header");
  header.className = "png-export-header";
  const identity = document.createElement("div");
  const brand = document.createElement("strong");
  const brandMark = document.createElement("span");
  brandMark.className = "png-export-brand-mark";
  brandMark.textContent = "↗";
  brand.append(brandMark, document.createTextNode("POLLFRAME"));
  const context = document.createElement("small");
  context.textContent = subtitle;
  identity.append(brand, context);
  const date = document.createElement("time");
  date.textContent = new Intl.DateTimeFormat(numberLocale(locale), { dateStyle: "medium" }).format(new Date());
  header.append(identity, date);
  const content = document.createElement("div");
  content.className = "png-export-content";
  const clone = cleanExportClone(element.cloneNode(true));
  clone.classList.add("png-export-clone");
  content.append(clone);
  const footer = document.createElement("footer");
  footer.className = "png-export-footer";
  const footerTitle = document.createElement("span");
  footerTitle.textContent = title;
  const creditNode = document.createElement("span");
  creditNode.textContent = credit;
  footer.append(footerTitle, creditNode);
  surface.append(header, content, footer);
  host.append(surface);
  document.body.append(host);
  try {
    surface.style.setProperty("width", `${format.width}px`);
    if (format.height) {
      surface.classList.add("is-fixed-format");
      surface.style.setProperty("height", `${format.height}px`);
    }
    clone.style.setProperty("width", "100%");
    clone.style.setProperty("max-width", "none");
    clone.querySelectorAll(".chart-wrap, .party-selector").forEach((node) => node.style.setProperty("overflow", "visible"));
    clone.querySelectorAll(".poll-chart").forEach((node) => {
      node.style.setProperty("width", "100%");
      node.style.setProperty("min-width", "0");
      // Mobile page CSS caps the live SVG at 390px. Keeping that cap in a
      // 1080/1920px export made the same chart tiny when exported on a phone.
      node.style.setProperty("max-height", "none");
      node.style.setProperty("height", "auto");
    });
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    freezeExportStyles(surface);
    if (format.height) {
      const availableHeight = content.clientHeight;
      const naturalHeight = clone.getBoundingClientRect().height;
      const scale = naturalHeight > availableHeight ? Math.max(0.42, availableHeight / naturalHeight) : 1;
      clone.style.setProperty("transform", `scale(${scale})`);
      clone.style.setProperty("transform-origin", "center center");
    }
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(surface, {
      width: format.width,
      ...(format.height ? { height: format.height } : {}),
      pixelRatio: format.pixelRatio,
      cacheBust: true,
      backgroundColor: "#ffffff",
    });
    if (!blob) throw new Error("PNG renderer returned no image");
    return { blob, width: format.width * format.pixelRatio, height: format.height ? format.height * format.pixelRatio : null, filename: `${safeFilenamePart(filename)}-${preset}-${new Date().toISOString().slice(0, 10)}.png` };
  } finally {
    host.remove();
    window.dispatchEvent(new CustomEvent("pollframe:export-layout", { detail: { wide: false } }));
  }
}

function useExportDialog(open, onClose) {
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => dialogRef.current?.focus());
    const keydown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll("button:not([disabled]),a[href]")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      previous?.focus?.();
    };
  }, [open, onClose]);
  return dialogRef;
}

function PngPreview({ element, preset, title, subtitle }) {
  const hostRef = useRef(null);
  const format = PRESETS[preset] ?? PRESETS.content;
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !element) return undefined;
    const clone = cleanExportClone(element.cloneNode(true));
    clone.classList.add("png-preview-clone");
    host.replaceChildren(clone);
    const fit = () => {
      clone.style.transform = "none";
      const width = clone.scrollWidth || clone.getBoundingClientRect().width;
      const height = clone.scrollHeight || clone.getBoundingClientRect().height;
      const scale = Math.min((host.clientWidth - 18) / Math.max(1, width), (host.clientHeight - 18) / Math.max(1, height), 0.42);
      clone.style.transform = `translate(-50%, -50%) scale(${Math.max(0.08, scale)})`;
    };
    const frame = requestAnimationFrame(() => requestAnimationFrame(fit));
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); clone.remove(); };
  }, [element, preset]);
  const ratio = format.height ? `${format.width} / ${format.height}` : "4 / 3";
  return <div className="png-live-preview"><div className="png-preview-canvas" style={{ aspectRatio: ratio }}><header><strong>↗ POLLFRAME</strong><small>{subtitle}</small></header><div ref={hostRef} className="png-preview-content" /><footer>{title}</footer></div></div>;
}

export function PngExportModal({ open, onClose, elementRef, filename, title, subtitle, locale = "en-GB", credit, profile = "chart" }) {
  const config = PROFILES[profile] ?? PROFILES.chart;
  const [preset, setPreset] = useState(config.formats[0]);
  const [status, setStatus] = useState("idle");
  const copy = copyFor(locale);
  const dialogRef = useExportDialog(open, onClose);
  const nativeShareAvailable = typeof navigator.share === "function" && typeof File === "function";
  const touchShare = nativeShareAvailable && typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  useEffect(() => { if (open) { setPreset(config.formats[0]); setStatus("idle"); trackAggregateEvent("png_dialog_opened"); } }, [open, profile]);
  const note = copy[`${profile}Note`] ?? copy.chartNote;
  const exportPng = async (action) => {
    if (status === "working") return;
    setStatus("working");
    try {
      const rendered = await renderElementPng({ element: elementRef.current, filename, title, subtitle, locale, credit, preset, profile });
      if (action === "share" && nativeShareAvailable) {
        const file = new File([rendered.blob], rendered.filename, { type: "image/png" });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title });
          setStatus("shared");
          trackAggregateEvent("png_export_shared");
          return;
        }
      }
      triggerBlobDownload(rendered.blob, rendered.filename);
      setStatus("done");
      trackAggregateEvent("png_export_downloaded");
    } catch (error) {
      if (error?.name === "AbortError") setStatus("idle");
      else { console.error("PNG export failed", error); setStatus("error"); }
    }
  };
  const statusText = status === "working" ? copy.preparing : status === "done" ? copy.ready : status === "shared" ? copy.shared : status === "error" ? copy.failed : "";
  const modal = open ? (
    <div className="overlay modal-overlay png-options-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()} data-export-ignore="true">
      <section ref={dialogRef} className="embed-modal png-options-modal" role="dialog" aria-modal="true" aria-labelledby="png-options-title" tabIndex={-1}>
        <div className="panel-header"><div><span className="section-label">{subtitle}</span><h2 id="png-options-title">{copy.title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label={copy.close}><Icon name="close" /></button></div>
        <p className="modal-intro">{copy.intro}</p>
        <div className="png-dialog-layout">
          <div className="png-format-panel">
            <p className="png-profile-note">{note}</p>
            <div className="png-format-grid" role="radiogroup" aria-label={copy.title}>
              {config.formats.map((format) => <button key={format} type="button" role="radio" aria-checked={preset === format} className={preset === format ? "selected" : ""} onClick={() => { setPreset(format); setStatus("idle"); }}><span className={`png-format-shape is-${format}`} aria-hidden="true" /><span><strong>{copy[format]}{format === config.recommended && <em>{copy.recommended}</em>}</strong><small>{copy[`${format}Meta`]}</small></span></button>)}
            </div>
          </div>
          <PngPreview element={elementRef.current} preset={preset} title={title} subtitle={subtitle} />
        </div>
        {touchShare && <p className="png-share-help">{copy.systemHelp}</p>}
        <div className="png-options-actions">
          <button className="primary-button" type="button" disabled={status === "working"} onClick={() => exportPng(touchShare ? "share" : "download")}><Icon name={touchShare ? "share" : "download"} size={17}/>{touchShare ? copy.save : copy.download}</button>
          {nativeShareAvailable && !touchShare && <button className="secondary-button" type="button" disabled={status === "working"} onClick={() => exportPng("share")}><Icon name="share" size={17}/>{copy.save}</button>}
          {touchShare && <button className="secondary-button" type="button" disabled={status === "working"} onClick={() => exportPng("download")}><Icon name="download" size={17}/>{copy.download}</button>}
        </div>
        {statusText && <p className={`png-export-status is-${status}`} role="status">{statusText}</p>}
      </section>
    </div>
  ) : null;
  return modal ? createPortal(modal, document.body) : null;
}

export function PngExportButton({ elementRef, filename, title, subtitle, locale, label, credit, profile = "chart", className = "secondary-button" }) {
  const [open, setOpen] = useState(false);
  const buttonLabel = label ?? (locale === "de" ? "PNG exportieren" : locale === "es" ? "Exportar PNG" : "Export PNG");
  return <><button className={`${className} png-export-button`} type="button" onClick={() => setOpen(true)} data-export-ignore="true"><Icon name="download" size={17} />{buttonLabel}</button><PngExportModal open={open} onClose={() => setOpen(false)} elementRef={elementRef} filename={filename} title={title} subtitle={subtitle} locale={locale} credit={credit} profile={profile} /></>;
}
