import { MATCH_EDITION, MATCH_PARTIES } from "./party-match-data.js";
import { MATCH_COPY } from "./party-match-copy.js";
import { localText } from "./party-match-text.js";
import { MATCH_DESIGNS } from "./party-match-templates.js";
import { buildMatchInsights } from "./party-match-spectrum.js";
import { validateMatchInsights } from "./party-match-summary.js";
import { renderPersonalGraphic } from "./party-match-personal-svg.js";
import { topicRound, roundScope } from "./party-match-topic-definitions.js";
import { STUDIO_FONTS, studioFont } from "./studio-fonts.js";

export { MATCH_DESIGNS };
export const MATCH_FONTS = ["Arial", "Georgia", "Verdana", "Trebuchet MS"];
const cut = (v, n) =>
  String(v ?? "")
    .replace(/[\u0000-\u001f]/g, " ")
    .trim()
    .slice(0, n);
const clamp = (v, min, max, fallback) =>
  Number.isFinite(Number(v))
    ? Math.min(max, Math.max(min, Number(v)))
    : fallback;
export function matchThemeDark() {
  const root = globalThis.document?.documentElement,
    body = globalThis.document?.body;
  const theme = root?.dataset.theme || body?.dataset.theme;
  return (
    theme === "dark" ||
    (theme !== "light" &&
      globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches === true)
  );
}
export function normalizeMatchDesign(input = {}) {
  const graphic = ["ranking", "topics", "spectrum", "duel"].includes(
    input.graphic,
  )
    ? input.graphic
    : MATCH_DESIGNS.find((d) => d.id === input.style)?.graphic || "ranking";
  const hex = (v) => (/^#[0-9a-f]{6}$/i.test(v) ? v : "");
  const background = hex(input.background);
  const dimensions = ["economy", "society", "climate"];
  const spectrumX = dimensions.includes(input.spectrumX)
    ? input.spectrumX
    : "economy";
  const requestedY = dimensions.includes(input.spectrumY)
    ? input.spectrumY
    : "society";
  const spectrumY =
    requestedY === spectrumX
      ? dimensions.find((id) => id !== spectrumX)
      : requestedY;
  const brightness = background
    ? [1, 3, 5]
        .map((i) => {
          const v = parseInt(background.slice(i, i + 2), 16) / 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
    : null;
  return {
    graphic,
    style: MATCH_DESIGNS.some(
      (d) => d.id === input.style && d.graphic === graphic,
    )
      ? input.style
      : MATCH_DESIGNS.find((d) => d.graphic === graphic).id,
    format: ["square", "portrait", "wide"].includes(input.format)
      ? input.format
      : "square",
    dark: brightness === null ? input.dark === true : brightness < 0.179,
    title: cut(input.title, 100),
    subtitle: cut(input.subtitle, 160),
    fontKey:
      STUDIO_FONTS.some(([key]) => key === input.fontKey) ||
      /^custom-[a-f0-9-]{36}$/.test(input.fontKey || "")
        ? input.fontKey
        : null,
    font:
      input.fontKey &&
      (STUDIO_FONTS.some(([key]) => key === input.fontKey) ||
        /^custom-[a-f0-9-]{36}$/.test(input.fontKey))
        ? studioFont(input.fontKey, "Arial")
        : MATCH_FONTS.includes(input.font)
          ? input.font
          : input.style === "editorial"
            ? "Georgia"
            : "Arial",
    textScale: clamp(input.textScale, 0.85, 1.2, 1),
    rounding: clamp(input.rounding, 0, 64, 24),
    party: ["none", ...MATCH_PARTIES.map((p) => p.slug)].includes(input.party)
      ? input.party
      : "none",
    other: MATCH_PARTIES.some((p) => p.slug === input.other)
      ? input.other
      : "spd",
    accent: hex(input.accent) || "#2558c5",
    background,
    titleAlign: ["start", "middle", "end"].includes(input.titleAlign)
      ? input.titleAlign
      : "start",
    barThickness: clamp(input.barThickness, 4, 32, 12),
    pointSize: clamp(input.pointSize, 6, 18, 10),
    spectrumY,
    spectrumX,
    labelScale: clamp(input.labelScale, 0.85, 1.35, 1),
    valueScale: clamp(input.valueScale, 0.85, 1.5, 1),
    topN: Math.round(clamp(input.topN, 3, 7, 7)),
    grid: input.grid !== false,
    labels: input.labels === "short" ? "short" : "full",
    note: cut(input.note, 120),
  };
}
export function resultDocument(result, length, locale, context) {
  if (!result?.ready) throw Error("No calculated result");
  return validateResultDocument({
    format: "pollframe-private-result-v1",
    edition: { ...MATCH_EDITION },
    length,
    ...(topicRound(context?.round) ? { round: context.round } : {}),
    locale,
    answered: result.answered,
    priorities: result.totalWeight > result.answered,
    rows: result.results.map((p) => ({
      slug: p.slug,
      score: p.score,
      rank: p.rank,
      known: p.known,
      missing: p.missing,
    })),
    ...(context
      ? {
          insights: buildMatchInsights(
            result,
            context.answers,
            context.questions,
            context.round,
          ),
        }
      : {}),
  });
}
export function validateResultDocument(input) {
  if (
    input?.format !== "pollframe-private-result-v1" ||
    input.edition?.programmeYear !== 2025 ||
    !(topicRound(input.round)
      ? input.length === 15
      : !input.round && [8, 16, 30].includes(input.length)) ||
    !Number.isInteger(input.answered) ||
    input.answered < 4 ||
    input.answered > input.length ||
    !Array.isArray(input.rows) ||
    input.rows.length !== MATCH_PARTIES.length
  )
    throw Error("Invalid private result");
  const seen = new Set();
  const rows = input.rows.map((row) => {
    if (
      !MATCH_PARTIES.some((p) => p.slug === row.slug) ||
      seen.has(row.slug) ||
      !Number.isInteger(row.known) ||
      row.known < 0 ||
      row.known > input.answered ||
      !Number.isInteger(row.missing) ||
      row.missing !== input.answered - row.known ||
      (row.score === null && row.known >= 4) ||
      (row.score !== null &&
        (!Number.isFinite(row.score) ||
          row.score < 0 ||
          row.score > 100 ||
          row.known < 4)) ||
      (row.rank === null) !== (row.score === null) ||
      (row.rank !== null &&
        (!Number.isInteger(row.rank) || row.rank < 1 || row.rank > 7))
    )
      throw Error("Invalid result row");
    seen.add(row.slug);
    return {
      slug: row.slug,
      score: row.score,
      rank: row.rank,
      known: row.known,
      missing: row.missing,
    };
  });
  if (!rows.some((row) => row.score !== null)) throw Error("No scored result");
  for (const row of rows) {
    if (
      row.score !== null &&
      row.rank !==
        1 +
          rows.filter(
            (other) => other.score !== null && other.score > row.score + 1e-9,
          ).length
    )
      throw Error("Inconsistent rank");
  }
  if (
    !Number.isInteger(input.edition.version) ||
    input.edition.version < 1 ||
    input.edition.version > 10000 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.edition.reviewed) ||
    !Number.isFinite(Date.parse(input.edition.reviewed)) ||
    new Date(input.edition.reviewed).toISOString().slice(0, 10) !==
      input.edition.reviewed
  )
    throw Error("Invalid edition");
  // Explicit whitelist: never persist raw answers, comparisons, URLs or arbitrary HTML.
  return {
    format: input.format,
    edition: {
      programmeYear: 2025,
      version: input.edition.version,
      reviewed: cut(input.edition.reviewed, 10),
      positionCutoff: "2025-02-23",
    },
    length: input.length,
    ...(topicRound(input.round) ? { round: input.round } : {}),
    answered: input.answered,
    priorities: input.priorities === true,
    locale: ["de", "es", "en-GB", "en-US"].includes(input.locale)
      ? input.locale
      : "de",
    rows,
    ...(input.insights
      ? {
          insights: validateMatchInsights(
            input.insights,
            input.answered,
            input.edition.version >= 8 ? 3 : 2,
            topicRound(input.round)?.groups,
          ),
        }
      : {}),
  };
}
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let measurementContext;
function wrapText(text, available, size, font, weight = 400) {
  // Use the same installed font metrics as SVG/PNG, not a character-count guess.
  // The conservative fallback also keeps server-side validation DOM-independent.
  if (!measurementContext && globalThis.document)
    measurementContext = globalThis.document
      .createElement("canvas")
      .getContext("2d");
  if (measurementContext)
    measurementContext.font = `${weight} ${size}px ${font}, sans-serif`;
  const width = (value) =>
    measurementContext
      ? measurementContext.measureText(value).width
      : [...value].reduce(
          (sum, c) => sum + (/[MW@]/.test(c) ? 1.1 : 0.65) * size,
          0,
        );
  const lines = [];
  let line = "";
  for (const word of String(text).split(/\s+/)) {
    if (line && width(`${line} ${word}`) > available) {
      lines.push(line);
      line = "";
    }
    if (width(word) > available) {
      for (const char of word) {
        if (line && width(line + char) > available) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}
export function matchDesignSvg(document, input = {}) {
  const doc = validateResultDocument(document),
    d = normalizeMatchDesign(input),
    l = (v) => localText(v, doc.locale),
    c = (k) => l(MATCH_COPY[k]);
  if (doc.round && d.graphic === "spectrum")
    throw Error("A topic round is not an overall political profile");
  if (!["pollframe", "editorial", "social"].includes(d.style))
    return renderPersonalGraphic(doc, d, { wrapText, escape });
  const [width, height] =
    d.format === "portrait"
      ? [1080, 1350]
      : d.format === "wide"
        ? [1600, 1000]
        : [1200, 1200];
  const fg = d.background
      ? d.dark
        ? "#ffffff"
        : "#000000"
      : d.dark
        ? "#f3f5f7"
        : "#171b20",
    muted = d.background ? fg : d.dark ? "#b7c1ce" : "#596572",
    bg = d.background || (d.dark ? "#15191f" : "#ffffff"),
    track = d.dark ? "#303741" : "#e9edf1";
  const accent = d.accent === "#2558c5" && d.dark ? "#9bbaff" : d.accent,
    pad = 64,
    inside = width - pad * 2;
  const footerSize = d.note ? 17 : 21;
  const footerLines = [
    ...(d.note ? [d.note] : []),
    roundScope(doc.round, doc.locale) || c("scope"),
    c("exportSource"),
    c("exportRange"),
    c("notAdvice"),
    `pollframe.com · ${c("checkDate")}: ${doc.edition.reviewed} · v${doc.edition.version}`,
  ].flatMap((line) => wrapText(line, inside, footerSize, d.font));
  const footerLeading = d.note ? 30 : 36;
  const footerHeight = footerLines.length * footerLeading + 38;
  const pieces = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" rx="${d.rounding}" fill="${bg}"/>`,
  ];
  const text = (
    v,
    x,
    y,
    size = 24,
    color = fg,
    weight = 400,
    anchor = "start",
    font = d.font,
  ) =>
    pieces.push(
      `<text x="${x}" y="${y}" font-family="${escape(font)}, sans-serif" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${escape(v)}</text>`,
    );
  text("POLLFRAME", pad, 66, 24, accent, 700);
  text(`${c("name")} · 2025`, width - pad, 66, 23, muted, 400, "end");
  let y = 150;
  const title =
    d.title ||
    (topicRound(doc.round)
      ? localText(topicRound(doc.round).resultTitle, doc.locale)
      : c("resultsTitle"));
  const subtitle =
    d.subtitle || roundScope(doc.round, doc.locale) || c("scope");
  const titleFont = d.font;
  let titleSize =
    (d.style === "social" ? 54 : d.style === "editorial" ? 44 : 46) *
    d.textScale;
  while (
    wrapText(title, inside, titleSize, titleFont, 700).length > 3 &&
    titleSize > 24
  )
    titleSize -= 1;
  let subtitleSize = 24 * d.textScale;
  const shownRows = doc.rows.slice(0, d.topN);
  const headerLimit = height - footerHeight - pad - shownRows.length * 58;
  const headerBottom = () =>
    150 +
    wrapText(title, inside, titleSize, titleFont, 700).length *
      titleSize *
      1.6 +
    wrapText(subtitle, inside, subtitleSize, d.font).length *
      subtitleSize *
      1.6 +
    55;
  while (
    headerBottom() > headerLimit &&
    (titleSize > 24 || subtitleSize > 18)
  ) {
    titleSize = Math.max(24, titleSize - 1);
    subtitleSize = Math.max(18, subtitleSize - 0.5);
  }
  for (const line of wrapText(title, inside, titleSize, titleFont, 700)) {
    text(
      line,
      d.titleAlign === "middle"
        ? width / 2
        : d.titleAlign === "end"
          ? width - pad
          : pad,
      y,
      titleSize,
      fg,
      700,
      d.titleAlign,
      titleFont,
    );
    y += titleSize * 1.6;
  }
  for (const line of wrapText(subtitle, inside, subtitleSize, d.font)) {
    text(line, pad, y + 10, subtitleSize, muted);
    y += subtitleSize * 1.6;
  }
  text(
    `${doc.answered} ${c("countLabel")}${doc.priorities ? ` · ${c("weightedExport")}` : ""}`,
    pad,
    y + 18,
    22,
    muted,
  );
  y += 55;
  const rowHeight = Math.min(
    d.format === "portrait" ? 128 : 108,
    (height - y - footerHeight - pad) / shownRows.length,
  );
  if (rowHeight < 45) throw Error("Layout too small for this text");
  for (const row of shownRows) {
    const party = MATCH_PARTIES.find((p) => p.slug === row.slug),
      color =
        party.slug === "union" ? (d.dark ? "#e5e9ef" : "#20242a") : party.color;
    const rowTop = y;
    if (d.style === "social")
      pieces.push(
        `<rect x="${pad}" y="${rowTop}" width="${inside}" height="${rowHeight - Math.min(8, rowHeight * 0.12)}" rx="10" fill="${track}"/>`,
      );
    const start = pad + (d.style === "social" ? 24 : 0),
      scoreText = row.score === null ? "—" : `${Math.round(row.score)}%`;
    const rowScale = Math.min(1, rowHeight / 100),
      nameY = rowTop + rowHeight * 0.28;
    text(row.rank ?? "—", start, nameY, 23 * rowScale, muted, 400);
    const name =
      party.slug === "greens"
        ? d.labels === "short"
          ? doc.locale === "de"
            ? "Grüne"
            : doc.locale === "es"
              ? "Verdes"
              : "Greens"
          : "Bündnis 90/Die Grünen"
        : party.name;
    const nameSize = Math.min(
      29 * d.textScale * rowScale * d.labelScale,
      rowHeight * 0.3,
      (inside - 260) / (name.length * 0.57),
    );
    text(name, start + 55, nameY, nameSize, fg, 700);
    text(
      scoreText,
      width - pad - (d.style === "social" ? 24 : 0),
      nameY,
      Math.min(31 * d.textScale * rowScale * d.valueScale, rowHeight * 0.42),
      fg,
      700,
      "end",
    );
    const barX = start + 55,
      barWidth = width - pad - (d.style === "social" ? 24 : 0) - barX;
    const barHeight =
        Math.min(
          d.style === "editorial" ? d.barThickness / 3 : d.barThickness,
          rowHeight * 0.17,
        ) * rowScale,
      barY = rowTop + rowHeight * 0.43;
    pieces.push(
      `<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="${barHeight / 2}" fill="${track}"/>`,
    );
    if (row.score !== null)
      pieces.push(
        `<rect x="${barX}" y="${barY}" width="${(barWidth * row.score) / 100}" height="${barHeight}" rx="${barHeight / 2}" fill="${color}"/>`,
      );
    text(
      `${row.known}/${doc.answered} ${c("coverage")}`,
      barX,
      rowTop + rowHeight * 0.82,
      20 * rowScale,
      muted,
    );
    y += rowHeight;
  }
  y = height - pad - footerLines.length * footerLeading;
  pieces.push(`<path d="M${pad} ${y - 24}H${width - pad}" stroke="${track}"/>`);
  for (const line of footerLines) {
    text(line, pad, y, footerSize, muted);
    y += footerLeading;
  }
  pieces.push("</svg>");
  return { svg: pieces.join(""), width, height };
}

export async function renderMatchSvg(doc, design) {
  const key = normalizeMatchDesign(design).fontKey;
  const { loadStudioFont } = await import("./studio-font-loader.js");
  const loaded = key ? await loadStudioFont(key) : null;
  const result = matchDesignSvg(doc, design);
  if (loaded) {
    const root = new DOMParser().parseFromString(
      result.svg,
      "image/svg+xml",
    ).documentElement;
    const style = document.createElementNS(root.namespaceURI, "style");
    style.textContent = `@font-face{font-family:"${loaded.family}";src:url("${loaded.data}");font-weight:100 900}`;
    root.prepend(style);
    const metadata = document.createElementNS(root.namespaceURI, "metadata");
    metadata.textContent = loaded.license || "Locally imported typeface";
    root.prepend(metadata);
    result.svg = new XMLSerializer().serializeToString(root);
  }
  return result;
}

export async function renderMatchPng(doc, design) {
  const { svg, width, height } = await renderMatchSvg(doc, design),
    url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    );
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      const timeout = setTimeout(
        () => reject(Error("Graphic rendering timed out")),
        15000,
      );
      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timeout);
        reject(Error("Graphic could not be rendered"));
      };
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Canvas unavailable");
    ctx.drawImage(image, 0, 0);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(Error("PNG encoding failed"))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
