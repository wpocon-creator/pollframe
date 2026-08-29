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

const EXPORT_BACKGROUNDS = { light: "#ffffff", dark: "#1a1d20" };
const EXPORT_MAX_SCALE = { chart: 1.2, approval: 1.22, map: 1.25, "current-poll": 1.34, "party-grid": 1.34, "seat-grid": 1.26, issues: 1.34, insight: 1.36 };

const PROFILES = {
  chart: { formats: ["landscape", "square"], recommended: "landscape", copyKey: "chart" },
  approval: { formats: ["landscape", "square"], recommended: "landscape", copyKey: "approval" },
  map: { formats: ["landscape"], recommended: "landscape", copyKey: "map" },
  "current-poll": { formats: ["landscape", "square", "portrait"], recommended: "landscape", copyKey: "currentPoll" },
  "party-grid": { formats: ["landscape", "square", "portrait"], recommended: "square", copyKey: "partyGrid" },
  "seat-grid": { formats: ["landscape", "portrait"], recommended: "landscape", copyKey: "seatGrid" },
  issues: { formats: ["landscape", "square", "portrait"], recommended: "square", copyKey: "issues" },
  insight: { formats: ["square", "portrait"], recommended: "portrait", copyKey: "insight" },
};

function profileCopy(copy, config, format, suffix = "") {
  const profileKey = `${config.copyKey}${format[0].toUpperCase()}${format.slice(1)}${suffix}`;
  return copy[profileKey] ?? copy[`${format}${suffix}`];
}

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
    intro: "Wähle das für diese Grafik vorbereitete Layout. Inhalt und Anordnung ändern sich mit deiner Auswahl.",
    singleIntro: "Für diese Grafik gibt es ein optimiertes Layout. Du kannst nur die Darstellung ändern.",
    content: "Vollständige Grafik", contentMeta: "automatische Höhe · 3200 px breit",
    landscape: "Breitbild", landscapeMeta: "16:9 · 1920 × 1080",
    square: "Quadrat", squareMeta: "1:1 · 1080 × 1080",
    portrait: "Feed-Hochformat", portraitMeta: "4:5 · 1080 × 1350",
    story: "Story", storyMeta: "9:16 · 1080 × 1920",
    recommended: "Empfohlen",
    appearance: "Darstellung", light: "Hell", dark: "Dunkel",
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
    currentPollNote: "Querformat und Quadrat nutzen kurze Balken; im Hochformat werden die Werte zu Säulen.",
    partyGridNote: "Die Parteikarten werden für jedes Format neu angeordnet, statt nur in einen anderen Rahmen gesetzt.",
    seatGridNote: "Querformat zeigt Sitz- und Koalitionslisten nebeneinander, Hochformat untereinander.",
    issuesNote: "Querformat und Quadrat nutzen Rangbalken; im Hochformat werden die Themen als Säulen gesetzt.",
    insightNote: "Für längere Listen und Einordnungen nutzt das Hochformat den Platz am besten.",
    currentPollLandscape: "Balken · Querformat", currentPollLandscapeMeta: "16:9 · kurze Vergleichsbalken",
    currentPollSquare: "Kompakte Balken", currentPollSquareMeta: "1:1 · für Social Posts",
    currentPollPortrait: "Säulen · Hochformat", currentPollPortraitMeta: "4:5 · vertikales Diagramm",
    partyGridLandscape: "Parteikarten · breit", partyGridLandscapeMeta: "16:9 · vier Karten je Reihe",
    partyGridSquare: "Parteikarten · quadratisch", partyGridSquareMeta: "1:1 · zwei Karten je Reihe",
    partyGridPortrait: "Parteikarten · hochkant", partyGridPortraitMeta: "4:5 · vertikale Übersicht",
    seatGridLandscape: "Sitze · Querformat", seatGridLandscapeMeta: "16:9 · Listen nebeneinander",
    seatGridPortrait: "Sitze · Hochformat", seatGridPortraitMeta: "4:5 · Listen untereinander",
    issuesLandscape: "Themenbalken · breit", issuesLandscapeMeta: "16:9 · kurze Rangbalken",
    issuesSquare: "Themenbalken · quadratisch", issuesSquareMeta: "1:1 · kompakte Rangliste",
    issuesPortrait: "Themensäulen · hochkant", issuesPortraitMeta: "4:5 · vertikales Diagramm",
    systemHelp: "Auf iPhone und iPad kann Pollframe nur das geschützte Systemmenü öffnen; dort lässt sich das Bild in Fotos sichern. Browser dürfen nicht direkt in die Fotomediathek schreiben.",
  };
  if (locale === "es") return {
    title: "Exportar PNG",
    intro: "Elige un diseño preparado para este gráfico. El contenido y la disposición cambian con la selección.",
    singleIntro: "Este gráfico tiene un único diseño optimizado. Solo puedes cambiar la apariencia.",
    content: "Gráfico completo", contentMeta: "altura automática · 3200 px de ancho",
    landscape: "Horizontal", landscapeMeta: "16:9 · 1920 × 1080",
    square: "Cuadrado", squareMeta: "1:1 · 1080 × 1080",
    portrait: "Vertical para feed", portraitMeta: "4:5 · 1080 × 1350",
    story: "Historia", storyMeta: "9:16 · 1080 × 1920",
    recommended: "Recomendado", appearance: "Apariencia", light: "Claro", dark: "Oscuro", download: "Descargar PNG", save: "Guardar o compartir imagen",
    preparing: "Creando PNG…", ready: "La descarga ha comenzado.", shared: "Se abrió el menú del sistema.", failed: "No se pudo exportar el PNG.", close: "Cerrar",
    chartNote: "En las series temporales, el formato horizontal mantiene los ejes y rótulos más legibles.",
    approvalNote: "El formato horizontal está optimizado para artículos y presentaciones de esta serie histórica.",
    mapNote: "En los mapas, el formato horizontal conserva mejor las formas y la leyenda.",
    currentPollNote: "Los formatos horizontal y cuadrado usan barras cortas; el vertical convierte los valores en columnas.",
    partyGridNote: "Las tarjetas de partidos se reorganizan para cada formato en lugar de cambiar solo el marco.",
    seatGridNote: "El horizontal coloca escaños y coaliciones en paralelo; el vertical, uno debajo del otro.",
    issuesNote: "Los formatos horizontal y cuadrado usan barras; el vertical muestra los temas como columnas.",
    insightNote: "En listas y explicaciones largas, el formato vertical aprovecha mejor el espacio.",
    currentPollLandscape: "Barras · horizontal", currentPollLandscapeMeta: "16:9 · barras comparativas cortas",
    currentPollSquare: "Barras compactas", currentPollSquareMeta: "1:1 · para redes sociales",
    currentPollPortrait: "Columnas · vertical", currentPollPortraitMeta: "4:5 · gráfico vertical",
    partyGridLandscape: "Tarjetas · horizontal", partyGridLandscapeMeta: "16:9 · cuatro por fila",
    partyGridSquare: "Tarjetas · cuadrado", partyGridSquareMeta: "1:1 · dos por fila",
    partyGridPortrait: "Tarjetas · vertical", partyGridPortraitMeta: "4:5 · resumen vertical",
    seatGridLandscape: "Escaños · horizontal", seatGridLandscapeMeta: "16:9 · listas en paralelo",
    seatGridPortrait: "Escaños · vertical", seatGridPortraitMeta: "4:5 · listas apiladas",
    issuesLandscape: "Temas · horizontal", issuesLandscapeMeta: "16:9 · barras cortas",
    issuesSquare: "Temas · cuadrado", issuesSquareMeta: "1:1 · ranking compacto",
    issuesPortrait: "Temas · columnas", issuesPortraitMeta: "4:5 · gráfico vertical",
    systemHelp: "En iPhone y iPad, Pollframe solo puede abrir el menú seguro del sistema; desde allí puedes guardar la imagen en Fotos.",
  };
  return {
    title: "Export PNG",
    intro: "Choose a layout prepared for this graphic. Its content and arrangement change with your selection.",
    singleIntro: "This graphic has one optimised layout. You can change its appearance only.",
    content: "Full graphic", contentMeta: "automatic height · 3200 px wide",
    landscape: "Landscape", landscapeMeta: "16:9 · 1920 × 1080",
    square: "Square", squareMeta: "1:1 · 1080 × 1080",
    portrait: "Feed portrait", portraitMeta: "4:5 · 1080 × 1350",
    story: "Story", storyMeta: "9:16 · 1080 × 1920",
    recommended: "Recommended", appearance: "Appearance", light: "Light", dark: "Dark", download: "Download PNG", save: "Save or share image",
    preparing: "Creating PNG…", ready: "The download has started.", shared: "The system share sheet opened.", failed: "PNG export failed.", close: "Close",
    chartNote: "For time series, landscape keeps axes and labels most readable.",
    approvalNote: "Landscape is optimised for articles and presentations using this historical series.",
    mapNote: "For maps, landscape preserves geographic shapes and legends most clearly.",
    currentPollNote: "Landscape and square use shorter bars; portrait turns the values into columns.",
    partyGridNote: "Party cards are rearranged for every format instead of being placed inside a different frame.",
    seatGridNote: "Landscape places seat and coalition lists side by side; portrait stacks them.",
    issuesNote: "Landscape and square use ranked bars; portrait displays the issues as columns.",
    insightNote: "For longer lists and explanations, portrait makes the best use of the space.",
    currentPollLandscape: "Bars · landscape", currentPollLandscapeMeta: "16:9 · short comparison bars",
    currentPollSquare: "Compact bars", currentPollSquareMeta: "1:1 · for social posts",
    currentPollPortrait: "Columns · portrait", currentPollPortraitMeta: "4:5 · vertical chart",
    partyGridLandscape: "Party cards · wide", partyGridLandscapeMeta: "16:9 · four cards per row",
    partyGridSquare: "Party cards · square", partyGridSquareMeta: "1:1 · two cards per row",
    partyGridPortrait: "Party cards · portrait", partyGridPortraitMeta: "4:5 · vertical overview",
    seatGridLandscape: "Seats · landscape", seatGridLandscapeMeta: "16:9 · lists side by side",
    seatGridPortrait: "Seats · portrait", seatGridPortraitMeta: "4:5 · stacked lists",
    issuesLandscape: "Issue bars · wide", issuesLandscapeMeta: "16:9 · short ranked bars",
    issuesSquare: "Issue bars · square", issuesSquareMeta: "1:1 · compact ranking",
    issuesPortrait: "Issue columns · portrait", issuesPortraitMeta: "4:5 · vertical chart",
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

let exportCloneSequence = 0;

function remapSvgPaintReferences(clone) {
  const references = new Map();
  const prefix = `png-${++exportCloneSequence}-`;
  clone.querySelectorAll("svg defs [id]").forEach((node) => {
    const original = node.id;
    const replacement = `${prefix}${original}`;
    references.set(original, replacement);
    node.id = replacement;
  });
  if (!references.size) return new Set();
  const attributes = ["fill", "stroke", "filter", "clip-path", "mask", "marker-start", "marker-mid", "marker-end", "style"];
  clone.querySelectorAll("*").forEach((node) => attributes.forEach((attribute) => {
    const value = node.getAttribute(attribute);
    if (!value?.includes("url(")) return;
    let updated = value;
    references.forEach((replacement, original) => {
      updated = updated
        .replaceAll(`url(#${original})`, `url(#${replacement})`)
        .replaceAll(`url("#${original}")`, `url("#${replacement}")`)
        .replaceAll(`url('#${original}')`, `url('#${replacement}')`);
    });
    if (updated !== value) node.setAttribute(attribute, updated);
  }));
  return new Set(references.values());
}

function cleanExportClone(clone) {
  clone.querySelectorAll("[data-export-ignore], .interactive-event-layer, .event-dot, .event-dot-hit, .event-anchor, .chart-hover-card, .event-hover-card, .chart-scroll-hint, .event-key, .chart-footer, .approval-source-footer, .results-more").forEach((node) => node.remove());
  const paintIds = remapSvgPaintReferences(clone);
  clone.querySelectorAll("[id]").forEach((node) => { if (!paintIds.has(node.id)) node.removeAttribute("id"); });
  clone.querySelectorAll("path.series-halo,path.series-line,path.average-series-halo,path.average-series-line").forEach((path) => path.setAttribute("fill", "none"));
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("inert", "");
  return clone;
}

function preferredExportTheme() {
  const selected = document.documentElement.dataset.theme;
  if (selected === "light" || selected === "dark") return selected;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function exportCloneWidth(format, profile, preset) {
  const horizontalPadding = format.height ? 80 : 104;
  const available = Math.max(320, format.width - horizontalPadding);
  if (profile === "current-poll") {
    const compactWidth = preset === "landscape" ? 1400 : preset === "portrait" ? 760 : 820;
    return Math.min(available, compactWidth);
  }
  if (profile === "issues") {
    const compactWidth = preset === "landscape" ? 1380 : preset === "portrait" ? 760 : 820;
    return Math.min(available, compactWidth);
  }
  if (["party-grid", "seat-grid", "insight"].includes(profile)) {
    const compactWidth = preset === "landscape" ? 1440 : preset === "portrait" ? 900 : 900;
    return Math.min(available, compactWidth);
  }
  return available;
}

function prepareExportClone(clone, { format, preset, profile }) {
  clone.dataset.pngPreset = preset;
  clone.dataset.pngProfile = profile;
  clone.style.setProperty("width", `${exportCloneWidth(format, profile, preset)}px`);
  clone.style.setProperty("max-width", "none");
  clone.style.setProperty("margin", "0");
  clone.querySelectorAll(".chart-wrap, .party-selector, .party-detail-chart").forEach((node) => node.style.setProperty("overflow", "visible"));
  clone.querySelectorAll(".poll-chart, .approval-poll-chart").forEach((node) => {
    node.style.setProperty("width", "100%");
    node.style.setProperty("min-width", "0");
    node.style.setProperty("max-height", "none");
    node.style.setProperty("height", "auto");
  });
  if (preset === "portrait" && ["current-poll", "issues"].includes(profile)) {
    const bars = profile === "current-poll"
      ? clone.querySelectorAll(".result-bar>i")
      : clone.querySelectorAll(".spain-concern-ranking>div>div>i");
    const values = [...bars].map((bar) => Number.parseFloat(bar.style.width)).filter(Number.isFinite);
    const issueCeiling = profile === "issues" && values.length
      ? Math.max(5, Math.ceil(Math.max(...values) / 5) * 5)
      : 100;
    bars.forEach((bar) => {
      const value = Number.parseFloat(bar.style.width);
      if (Number.isFinite(value)) bar.style.setProperty("--png-column-level", `${Math.min(100, (value / issueCeiling) * 100)}%`);
    });
  }
  return clone;
}

function constrainedCanvas() {
  const ua = navigator.userAgent ?? "";
  const ios = /iP(?:hone|ad|od)/.test(ua) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  return ios ? { maxArea: 3_800_000, maxDimension: 4096 } : coarse ? { maxArea: 7_500_000, maxDimension: 6144 } : { maxArea: 18_000_000, maxDimension: 8192 };
}

function safePixelRatio(width, height, desiredRatio) {
  const { maxArea, maxDimension } = constrainedCanvas();
  return Math.max(.45, Math.min(
    desiredRatio,
    Math.sqrt(maxArea / Math.max(1, width * height)),
    maxDimension / Math.max(1, width),
    maxDimension / Math.max(1, height),
  ));
}

async function blobHasVisibleContent(blob, backgroundColor) {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const candidate = new Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = reject;
      candidate.src = objectUrl;
    });
    if (!image.naturalWidth || !image.naturalHeight) return false;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return blob.size > 12_000;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const background = backgroundColor === EXPORT_BACKGROUNDS.dark ? [26, 29, 32] : [255, 255, 255];
    let visible = 0;
    let changed = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] > 8) visible += 1;
      const difference = Math.abs(pixels[index] - background[0]) + Math.abs(pixels[index + 1] - background[1]) + Math.abs(pixels[index + 2] - background[2]);
      if (pixels[index + 3] > 8 && difference > 28) changed += 1;
    }
    return visible > 200 && changed > 12;
  } catch {
    // Some older WebKit versions cannot decode an object URL while the share
    // sheet is being prepared. A normally sized blob remains a safer signal
    // than rejecting a valid export in that browser.
    return blob.size > 12_000;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function renderSurfaceBlob(surface, { width, height, desiredPixelRatio, backgroundColor }) {
  const { toBlob } = await import("html-to-image");
  const firstRatio = safePixelRatio(width, height, desiredPixelRatio);
  const attempts = [...new Set([firstRatio, Math.max(.45, firstRatio * .68)].map((value) => Math.round(value * 1000) / 1000))];
  for (const pixelRatio of attempts) {
    const blob = await toBlob(surface, {
      width,
      height,
      pixelRatio,
      cacheBust: true,
      preferredFontFormat: "woff2",
      skipAutoScale: true,
      backgroundColor,
    });
    if (blob && await blobHasVisibleContent(blob, backgroundColor)) return { blob, pixelRatio };
  }
  throw new Error("PNG renderer returned an empty image");
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

function createExportBrandMark() {
  const namespace = "http://www.w3.org/2000/svg";
  const mark = document.createElementNS(namespace, "svg");
  mark.setAttribute("viewBox", "0 0 32 32");
  mark.setAttribute("aria-hidden", "true");
  mark.classList.add("png-export-brand-mark");
  const background = document.createElementNS(namespace, "rect");
  background.setAttribute("width", "32");
  background.setAttribute("height", "32");
  background.setAttribute("rx", "8.25");
  const frame = document.createElementNS(namespace, "path");
  frame.setAttribute("d", "M11 7.25H7.75v17.5H11M21 7.25h3.25v17.5H21");
  frame.setAttribute("fill", "none");
  frame.setAttribute("stroke-width", "1.4375");
  const signal = document.createElementNS(namespace, "path");
  signal.setAttribute("d", "m10.25 20.75 4.1-4.2 3.45 2.35 4.25-7.65");
  signal.setAttribute("fill", "none");
  signal.setAttribute("stroke-width", "1.8125");
  [frame, signal].forEach((path) => {
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
  });
  mark.append(background, frame, signal);
  return mark;
}

function PreviewBrand() {
  return <svg className="png-export-brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8.25"/><path d="M11 7.25H7.75v17.5H11M21 7.25h3.25v17.5H21" fill="none" strokeWidth="1.4375"/><path d="m10.25 20.75 4.1-4.2 3.45 2.35 4.25-7.65" fill="none" strokeWidth="1.8125"/></svg>;
}

export async function renderElementPng({ element, filename, title, subtitle, locale = "en-GB", credit = "Pollframe", preset = "content", profile = "chart", theme = "light" }) {
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
  surface.dataset.exportPreset = preset;
  surface.dataset.exportTheme = theme;
  surface.dir = "ltr";
  surface.lang = locale === "de" ? "de" : locale === "es" ? "es" : "en";
  const header = document.createElement("header");
  header.className = "png-export-header";
  const identity = document.createElement("div");
  const brand = document.createElement("strong");
  const brandMark = createExportBrandMark();
  brand.append(brandMark, document.createTextNode("POLLFRAME"));
  const context = document.createElement("small");
  context.textContent = subtitle;
  identity.append(brand, context);
  const date = document.createElement("time");
  date.textContent = new Intl.DateTimeFormat(numberLocale(locale), { dateStyle: "medium" }).format(new Date());
  header.append(identity, date);
  const content = document.createElement("div");
  content.className = "png-export-content";
  const clone = prepareExportClone(cleanExportClone(element.cloneNode(true)), { format, preset, profile });
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
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    if (format.height) {
      clone.style.setProperty("transform", "none");
      const availableHeight = content.clientHeight;
      const availableWidth = content.clientWidth;
      const natural = clone.getBoundingClientRect();
      const scale = Math.max(.38, Math.min(
        availableWidth / Math.max(1, natural.width),
        availableHeight / Math.max(1, natural.height),
        EXPORT_MAX_SCALE[profile] ?? 1.2,
      ));
      clone.style.setProperty("transform", `scale(${scale})`);
      clone.style.setProperty("transform-origin", "center center");
    }
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    freezeExportStyles(surface);
    const logicalHeight = format.height ?? Math.ceil(surface.getBoundingClientRect().height);
    const backgroundColor = EXPORT_BACKGROUNDS[theme] ?? EXPORT_BACKGROUNDS.light;
    const rendered = await renderSurfaceBlob(surface, { width: format.width, height: logicalHeight, desiredPixelRatio: format.pixelRatio, backgroundColor });
    return {
      blob: rendered.blob,
      width: Math.round(format.width * rendered.pixelRatio),
      height: Math.round(logicalHeight * rendered.pixelRatio),
      filename: `${safeFilenamePart(filename)}-${preset}-${theme}-${new Date().toISOString().slice(0, 10)}.png`,
    };
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

function PngPreview({ element, preset, profile, theme, setTheme, title, subtitle, copy }) {
  const liveRef = useRef(null);
  const canvasRef = useRef(null);
  const hostRef = useRef(null);
  const format = PRESETS[preset] ?? PRESETS.content;
  useEffect(() => {
    const live = liveRef.current;
    const canvas = canvasRef.current;
    if (!live || !canvas) return undefined;
    const fitFrame = () => {
      const toolbar = live.querySelector(".png-preview-theme");
      const styles = getComputedStyle(live);
      const horizontalInset = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
      const verticalInset = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
      const gap = Number.parseFloat(styles.rowGap) || 0;
      const ratio = format.height ? format.width / format.height : 4 / 3;
      const availableWidth = Math.max(120, live.clientWidth - horizontalInset);
      const availableHeight = Math.max(110, live.clientHeight - verticalInset - (toolbar?.offsetHeight ?? 0) - gap);
      const width = Math.min(520, availableWidth, availableHeight * ratio);
      canvas.style.setProperty("width", `${Math.floor(width)}px`);
    };
    const frame = requestAnimationFrame(fitFrame);
    const observer = new ResizeObserver(fitFrame);
    observer.observe(live);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [format.height, format.width, preset]);
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !element) return undefined;
    const clone = prepareExportClone(cleanExportClone(element.cloneNode(true)), { format, preset, profile });
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
  }, [element, preset, profile, theme]);
  const ratio = format.height ? `${format.width} / ${format.height}` : "4 / 3";
  return <div ref={liveRef} className="png-live-preview">
    <div className="png-preview-theme" role="radiogroup" aria-label={copy.appearance}>
      <span>{copy.appearance}</span>
      {["light", "dark"].map((value) => <button key={value} type="button" role="radio" aria-checked={theme === value} className={theme === value ? "selected" : ""} onClick={() => setTheme(value)}>{copy[value]}</button>)}
    </div>
    <div ref={canvasRef} className="png-preview-canvas" data-export-theme={theme} data-export-profile={profile} data-export-preset={preset} style={{ aspectRatio: ratio }}><header><strong><PreviewBrand />POLLFRAME</strong><small>{subtitle}</small></header><div ref={hostRef} className="png-preview-content" /><footer>{title}</footer></div>
  </div>;
}

export function PngExportModal({ open, onClose, elementRef, filename, title, subtitle, locale = "en-GB", credit, profile = "chart" }) {
  const config = PROFILES[profile] ?? PROFILES.chart;
  const [preset, setPreset] = useState(config.recommended);
  const [theme, setTheme] = useState("light");
  const [status, setStatus] = useState("idle");
  const copy = copyFor(locale);
  const dialogRef = useExportDialog(open, onClose);
  const nativeShareAvailable = typeof navigator.share === "function" && typeof File === "function";
  const touchShare = nativeShareAvailable && typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  useEffect(() => { if (open) { setPreset(config.recommended); setTheme(preferredExportTheme()); setStatus("idle"); trackAggregateEvent("png_dialog_opened"); } }, [open, profile, config.recommended]);
  const singleFormat = config.formats.length === 1;
  const note = copy[`${config.copyKey}Note`] ?? copy.chartNote;
  const exportPng = async (action) => {
    if (status === "working") return;
    setStatus("working");
    try {
      const rendered = await renderElementPng({ element: elementRef.current, filename, title, subtitle, locale, credit, preset, profile, theme });
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
      <section ref={dialogRef} className={`embed-modal png-options-modal${singleFormat ? " is-single-format" : ""}`} role="dialog" aria-modal="true" aria-labelledby="png-options-title" tabIndex={-1}>
        <div className="panel-header"><div><span className="section-label">{subtitle}</span><h2 id="png-options-title">{copy.title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label={copy.close}><Icon name="close" /></button></div>
        <p className="modal-intro">{singleFormat ? copy.singleIntro : copy.intro}</p>
        <div className="png-dialog-layout">
          {!singleFormat && <div className="png-format-panel">
            <p className="png-profile-note">{note}</p>
            <div className="png-format-grid" role="radiogroup" aria-label={copy.title}>
              {config.formats.map((format) => <button key={format} type="button" role="radio" aria-checked={preset === format} className={preset === format ? "selected" : ""} onClick={() => { setPreset(format); setStatus("idle"); }}><span className={`png-format-shape is-${format}`} aria-hidden="true" /><span><strong>{profileCopy(copy, config, format)}{format === config.recommended && <em>{copy.recommended}</em>}</strong><small>{profileCopy(copy, config, format, "Meta")}</small></span></button>)}
            </div>
          </div>}
          <PngPreview element={elementRef.current} preset={preset} profile={profile} theme={theme} setTheme={(value) => { setTheme(value); setStatus("idle"); }} title={title} subtitle={subtitle} copy={copy} />
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
