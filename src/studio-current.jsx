import React, {
  lazy,
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import StudioSvg from "./studio-svg.jsx";
import { studioNumber, studioDate } from "./studio-format.js";
import StudioRange from "./studio-range.jsx";
import {studioRegionName} from './studio-regions.js';
import { STUDIO_ASSISTANT_ENABLED } from "./studio-assistant-feature.js";
const StudioAssistant = STUDIO_ASSISTANT_ENABLED
  ? React.lazy(() => import("./studio-assistant.jsx"))
  : null;
const PanelResizer = React.lazy(() => import("./studio-panel-resizer.jsx"));
import {
  useEditorSession,
  useStudioEditorDevice,
} from "./studio-editor-session.js";
const CanvasEditor = React.lazy(() => import("./studio-canvas-selection.jsx"));
const SelectionDialog = React.lazy(
  () => import("./studio-selection-dialog.jsx"),
);
const StylePicker = React.lazy(() => import("./studio-style-picker.jsx"));
const StyleWizard = React.lazy(() => import("./studio-style-wizard.jsx"));
const ResourceDialog = React.lazy(() => import("./studio-resource-dialog.jsx"));
const StudioTransparency = React.lazy(
  () => import("./studio-transparency.jsx"),
);
const ContextToolbar = React.lazy(() =>
  import("./studio-canvas-editor.jsx").then((m) => ({
    default: m.ContextToolbar,
  })),
);
import { useStudioFont, serializeStudioSvg } from "./studio-font-loader.js";
import { studioFont, textX, textAnchor } from "./studio-fonts.js";
import { studioEmbedParams, studioText } from "./studio-model.js";
import { StudioLoadBoundary } from "./studio-load-boundary.jsx";
import { wrapText } from "./studio-text-layout.js";
const StudioEditorControls = lazy(() =>
  import("./studio-editor-controls.jsx").then((module) => ({
    default: module.StudioEditorControls,
  })),
);

const words = (text, limit = 42) => {
  const lines = [""];
  for (const word of String(text)
    .split(/\s+/)
    .flatMap((word) => word.match(new RegExp(`.{1,${limit}}`, "gu")) ?? [])) {
    if (lines.at(-1).length + word.length > limit && lines.at(-1))
      lines.push("");
    lines[lines.length - 1] += `${lines.at(-1) ? " " : ""}${word}`;
  }
  return lines;
};
const number = (n, locale) =>
  studioNumber(n, locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
const wrapTitle = (value, font, size, weight = 700) =>
  wrapText(value, 870, size, font, weight);

// One existing Pollframe data renderer supplies a snapshot to every design.
// Changing visual templates never triggers another fetch or recalculation.
export function useCurrentSnapshot(state, enabled) {
  const frame = useRef(null);
  const cache = useRef(new Map());
  const [result, setResult] = useState({ key: "", data: null, error: false });
  const [retry, setRetry] = useState(0);
  const params = studioEmbedParams(
    { ...state, template: "poll-wide" },
    { source: true },
  );
  params.set("studioSource", "1");
  // Values are language-independent, but captions and methodology in the
  // snapshot are not. Include the requested language in the cache key.
  params.set("lang", state.lang);
  for (const field of ["range", "mode", "events", "parties", "from", "to"])
    params.delete(field);
  const key = params.toString();
  useEffect(() => {
    if (!enabled || cache.current.has(key)) return;
    let cancelled = false;
    let timer;
    const started = Date.now();
    const inspect = () => {
      if (cancelled) return;
      const text = frame.current?.contentDocument?.querySelector(
        "[data-studio-snapshot]",
      )?.dataset.studioSnapshot;
      if (text) {
        try {
          const data = JSON.parse(text);
          if (!data.date || !Array.isArray(data.rows))
            throw new Error("snapshot");
          cache.current.set(key, data);
          if (cache.current.size > 8) cache.current.delete(cache.current.keys().next().value);
          setResult({ key, data, error: false });
          return;
        } catch {
          /* Wait for a valid snapshot, never show invented values. */
        }
      }
      if (Date.now() - started > 20000) {
        setResult({ key, data: null, error: true });
        return;
      }
      timer = setTimeout(inspect, 120);
    };
    inspect();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, enabled, retry]);
  const data =
    cache.current.get(key) ?? (result.key === key ? result.data : null);
  return {
    data,
    error: result.key === key && result.error,
    retry: () => setRetry((n) => n + 1),
    frame:
      enabled && !cache.current.has(key) ? (
        <iframe
          key={`${key}:${retry}`}
          ref={frame}
          className="studio-snapshot-frame"
          src={`/embed.html?${key}`}
          title="Pollframe data source"
          tabIndex={-1}
          aria-hidden="true"
          inert=""
        />
      ) : null,
  };
}

export const CurrentDesign = React.memo(function CurrentDesign({
  snapshot,
  state,
  template,
  svgRef,
  backgroundImage,
}) {
  useStudioFont(state.font);
  const uid = `surface-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const l = (de, en, es) => studioText([de, en, es], state.lang);
  const selected =
    state.parties === null ? null : new Set(state.parties.split(","));
  const design = template.design;
  const focusActive =
    state.focusParty &&
    snapshot.rows.some(
      (row) =>
        String(row.id) === state.focusParty &&
        (!selected || selected.has(String(row.id))),
    );
  const customBg = state.background;
  const dark = customBg
    ? [1, 3, 5].reduce(
        (sum, i, index) =>
          sum +
          parseInt(customBg.slice(i, i + 2), 16) *
            [0.2126, 0.7152, 0.0722][index],
        0,
      ) < 140
    : state.theme === "dark" || design === "broadcast";
  const palette = Object.fromEntries(
    (state.palette || "")
      .split(",")
      .filter(Boolean)
      .map((item) => item.split(":")),
  );
  const rows = snapshot.rows
    .filter(
      (row) =>
        (!selected || selected.has(String(row.id))) &&
        Number.isFinite(row.value),
    )
    .map((row) => {
      // Standalone SVG/PNG cannot inherit the page's theme variables.
      // Resolve the site's union token explicitly before serialising.
      const rawColor =
        palette[row.id] ||
        (row.color === "var(--party-union)"
          ? "#202428"
          : row.color || "#687582");
      const hex = rawColor.replace(
        /^#([\da-f])([\da-f])([\da-f])$/i,
        "#$1$1$2$2$3$3",
      );
      const channels = /^#[\da-f]{6}$/i.test(hex)
        ? [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16))
        : [255, 255, 255];
      if (focusActive && String(row.id) !== state.focusParty)
        return { ...row, color: dark ? "#6c7a89" : "#b7bec5" };
      if (state.monochrome)
        return { ...row, color: dark ? "#f8fafc" : "#182028" };
      return dark && !palette[row.id] && Math.max(...channels) < 85
        ? { ...row, color: "#c6cbd1" }
        : { ...row, color: hex };
    })
    .sort((a, b) =>
      state.order === "name"
        ? a.name.localeCompare(b.name, state.lang)
        : b.value - a.value,
    );
  const paper = design === "paper";
  const ink = dark ? "#f8fafc" : "#182028";
  const muted = dark ? "#bcc8d3" : "#52616d";
  const bg = customBg || (dark ? "#101d2c" : paper ? "#fbf7ec" : "#ffffff");
  const grid =
    state.showGrid === false ? "transparent" : dark ? "#354457" : "#dde3e9";
  const font = studioFont(
    state.font,
    {
      sans: "Arial, Helvetica, sans-serif",
      serif: "Georgia, 'Times New Roman', serif",
      mono: "'Courier New', monospace",
    }[state.font] ||
      (paper
        ? "Georgia, 'Times New Roman', serif"
        : design === "dotplot" || design === "signal"
          ? "'Courier New', monospace"
          : "Arial, Helvetica, sans-serif"),
  );
  const W = 960;
  const title =
    state.headline ||
    (state.currentBasis==='average' ? `${studioRegionName(state.region,state.lang)}: ${l('Umfragedurchschnitt','polling average','media de encuestas')}` : state.region!=='bundestag' ? `${studioRegionName(state.region,state.lang)}: ${l('aktuelle Umfrage','latest poll','última encuesta')}` : l(
      "Bundestagswahl: aktuelle Umfrage",
      "German federal election: latest poll",
      "Elecciones al Bundestag: última encuesta",
    ));
  const titleSize = state.titleSize || 36;
  const titleLines = wrapTitle(
    title,
    font,
    titleSize,
    state.titleWeight || 700,
  );
  const titleStep = titleSize * (state.titleLeading || 1.2);
  const titleTopOffset = Math.max(0, titleSize - 36);
  const subtitleSize = state.subtitleSize || 24,
    noteSize = state.noteSize || 19;
  const subtitleLines = state.subtitle
    ? wrapTitle(state.subtitle, font, subtitleSize)
    : [];
  const noteLines = state.editorNote
    ? wrapTitle(state.editorNote, font, noteSize)
    : [];
  const footerExtra = noteLines.length * (noteSize * 1.45);
  const publicationY =
    91 +
    titleTopOffset +
    state.topPadding +
    (state.subtitle ? state.subtitleGap : 0) +
    (titleLines.length - 1) * titleStep +
    40 +
    subtitleLines.length * (subtitleSize * 1.45);
  const top = publicationY + 40;
  const H =
    Math.max(
      (template.preset === "landscape"
        ? 600
        : template.preset === "portrait"
          ? 1180
          : 960) * (state.density || 1),
      top +
        150 +
        rows.length *
          Math.max(
            60 * (state.density || 1),
            ...rows.map((row) => words(row.name, 14).length * 28 + 12),
          ),
    ) + footerExtra;
  const bottom = H - 110 - footerExtra,
    available = bottom - top;
  const step = available / Math.max(rows.length, 1);
  const max = Math.max(
    state.axisMax || 0,
    state.reference || 0,
    30,
    Math.ceil(Math.max(...rows.map((row) => row.value), 0) / 5) * 5,
  );
  const fmt = (value) =>
    `${state.precision === 0 ? studioNumber(value, state.lang, { maximumFractionDigits: 0 }) : number(value, state.lang)}%`;
  const date = studioDate(new Date(`${snapshot.date}T12:00:00Z`), state.lang, {
    dateStyle: "medium",
    timeZone: "UTC",
  });
  const text = (x, y, value, size = 24, props = {}) => (
    <text x={x} y={y} fontSize={size} fill={ink} {...props}>
      {value}
    </text>
  );
  const label = (x, y, value, size = 24, limit = 18, props = {}) =>
    words(value, limit).map((line, i) =>
      text(x, y + i * (size * 1.45), line, size, {
        ...props,
        key: `${y}:${i}`,
      }),
    );
  const color = (row) => (paper ? ink : row.color);
  const x0 = 250,
    x1 = 810,
    span = x1 - x0;
  return (
    <StudioSvg
      state={state}
      forwardedRef={svgRef}
      className="studio-current-art"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={`${title} · ${date}`}
      data-design={design}
      data-render-ready="true"
      data-snapshot-date={snapshot.date}
      fontFamily={font}
    >
      <title>{title}</title>
      <desc>
        {rows.map((row) => `${row.name}: ${fmt(row.value)}`).join("; ")}
      </desc>
      <defs>
        <clipPath id={`${uid}-clip`}>
          <rect
            width={W}
            height={H}
            rx={state.cornerRadius ?? (state.edges === "rounded" ? 24 : 0)}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-clip)`}>
        <rect data-editor-target="image" width={W} height={H} fill={bg} />
        {backgroundImage && (
          <>
            <image
              href={backgroundImage}
              width={W}
              height={H}
              preserveAspectRatio={
                state.imageFit === "contain"
                  ? "xMidYMid meet"
                  : "xMidYMid slice"
              }
            />
            <rect
              width={W}
              height={H}
              fill={bg}
              opacity={state.imageOverlay ?? 0.88}
            />
          </>
        )}
        {design === "poster" && <rect width="16" height={H} fill="#255ad9" />}
        {text(42, 38, "POLLFRAME", 18, { letterSpacing: "3", fontWeight: 700 })}
        {text(W - 42, 38, studioRegionName(state.region,state.lang), 17, {
          textAnchor: "end",
          fill: muted,
        })}
        {titleLines.map((line, i) =>
          text(
            textX(state.titleAlign, 42),
            91 + titleTopOffset + state.topPadding + i * titleStep,
            line,
            titleSize,
            {
              key: i,
              "data-editor-target": "text",
              fontWeight: state.titleWeight || 700,
              textAnchor: textAnchor(state.titleAlign),
            },
          ),
        )}
        {subtitleLines.map((line, i) =>
          text(
            textX(state.subtitleAlign, 42),
            91 +
              titleTopOffset +
              state.topPadding +
              state.subtitleGap +
              (titleLines.length - 1) * titleStep +
              subtitleSize +
              20 +
              i * (subtitleSize * 1.45),
            line,
            subtitleSize,
            {
              key: `subtitle-${i}`,
              "data-editor-target": "subtitle",
              fill: muted,
              textAnchor: textAnchor(state.subtitleAlign),
            },
          ),
        )}
        {text(
          42,
          publicationY,
          `${snapshot.pollster || ""} · ${snapshot.synthetic ? l('Daten bis','Data through','Datos hasta') : l("Veröffentlicht", "Published", "Publicado")}: ${date}`,
          20,
          { fill: muted, 'data-editor-target':'output' },
        )}
        {paper && (
          <>
            <line
              x1="42"
              x2="918"
              y1={top - 16}
              y2={top - 16}
              stroke={ink}
              strokeWidth="3"
            />
            <line x1="42" x2="918" y1={top - 10} y2={top - 10} stroke={ink} />
          </>
        )}
        {!rows.length &&
          text(
            42,
            top + 70,
            l(
              "Keine Parteien ausgewählt",
              "No parties selected",
              "No hay partidos seleccionados",
            ),
            30,
          )}
        {["news", "paper", "lollipop", "dotplot", "signal"].includes(
          design,
        ) && (
          <>
            {design === "dotplot" &&
              Array.from({ length: Math.floor(max / 5) + 1 }, (_, i) => (
                <g key={i}>
                  <line
                    x1={x0 + (span * i * 5) / max}
                    x2={x0 + (span * i * 5) / max}
                    y1={top}
                    y2={bottom}
                    stroke={grid}
                  />
                  {text(
                    x0 + (span * i * 5) / max,
                    bottom + 30,
                    `${i * 5}%`,
                    17,
                    { textAnchor: "middle", fill: muted },
                  )}
                </g>
              ))}
            {rows.map((row, i) => {
              const y = top + step * (i + 0.5),
                width = (span * row.value) / max;
              return (
                <g key={row.id} data-party-id={row.id} data-value={row.value}>
                  {label(42, y + 8, row.name, 25, 14, {
                    fontWeight: paper ? 400 : 700,
                  })}
                  {design === "lollipop" ? (
                    <>
                      <line
                        x1={x0}
                        x2={x0 + width}
                        y1={y}
                        y2={y}
                        stroke={color(row)}
                        strokeWidth="3"
                      />
                      <circle cx={x0 + width} cy={y} r="12" fill={color(row)} />
                    </>
                  ) : design === "dotplot" ? (
                    <circle
                      cx={x0 + width}
                      cy={y}
                      r="9"
                      fill={color(row)}
                      stroke={ink}
                      strokeWidth="1"
                    />
                  ) : (
                    <rect
                      x={x0}
                      y={y - (paper ? 6 : 14) * (state.barScale || 1)}
                      width={width}
                      height={(paper ? 12 : 28) * (state.barScale || 1)}
                      fill={color(row)}
                    />
                  )}
                  {design === "signal" &&
                    Array.from({ length: 25 }, (_, tick) => (
                      <line
                        key={tick}
                        x1={x0 + (tick * span) / 25}
                        x2={x0 + (tick * span) / 25}
                        y1={y - 15}
                        y2={y + 15}
                        stroke={bg}
                        strokeWidth="3"
                      />
                    ))}
                  {text(918, y + 9, fmt(row.value), paper ? 30 : 28, {
                    textAnchor: "end",
                    fontWeight: 700,
                  })}
                </g>
              );
            })}
            {design !== "dotplot" && (
              <>
                {text(x0, bottom + 28, "0%", 17, { fill: muted })}
                {text(x1, bottom + 28, `${max}%`, 17, {
                  textAnchor: "end",
                  fill: muted,
                })}
              </>
            )}
          </>
        )}
        {design === "broadcast" && (
          <>
            <line
              x1="42"
              x2="918"
              y1={bottom - 44}
              y2={bottom - 44}
              stroke={muted}
            />
            {rows.map((row, i) => {
              const slot = 876 / rows.length,
                h = ((available - 105) * row.value) / max,
                x = 42 + slot * i;
              return (
                <g key={row.id} data-party-id={row.id} data-value={row.value}>
                  <rect
                    x={x + slot * 0.15}
                    width={slot * 0.7}
                    y={bottom - 44 - h}
                    height={h}
                    fill={row.color}
                  />
                  {text(
                    x + slot / 2,
                    bottom - 60 - h,
                    fmt(row.value),
                    Math.min(38, slot * 0.28),
                    { textAnchor: "middle", fontWeight: 700 },
                  )}
                  {label(
                    x + slot / 2,
                    bottom - 10,
                    row.name,
                    Math.min(23, slot * 0.18),
                    13,
                    { textAnchor: "middle", fontWeight: 700 },
                  )}
                </g>
              );
            })}
            {text(42, top + 20, `0–${max}%`, 18, { fill: muted })}
          </>
        )}
        {design === "table" && (
          <>
            {text(42, top + 22, "#", 18, { fill: muted })}
            {text(112, top + 22, l("Partei", "Party", "Partido"), 20, {
              fill: muted,
            })}
            {text(
              918,
              top + 22,
              l("Stimmenanteil", "Vote share", "Porcentaje"),
              20,
              { textAnchor: "end", fill: muted },
            )}
            {rows.map((row, i) => {
              const dy = (available - 45) / rows.length,
                y = top + 45 + dy * i;
              return (
                <g key={row.id} data-party-id={row.id} data-value={row.value}>
                  <rect
                    x="42"
                    y={y}
                    width="876"
                    height={dy}
                    fill={i % 2 ? grid : bg}
                    opacity=".55"
                  />
                  {text(56, y + dy * 0.57, String(i + 1).padStart(2, "0"), 22, {
                    fill: muted,
                  })}
                  {label(112, y + dy * 0.57, row.name, 26, 20, {
                    fontWeight: 700,
                  })}
                  <rect
                    x="465"
                    y={y + dy * 0.45}
                    width={(230 * row.value) / max}
                    height="13"
                    fill={row.color}
                  />
                  {text(900, y + dy * 0.6, fmt(row.value), 38, {
                    textAnchor: "end",
                    fontWeight: 700,
                  })}
                </g>
              );
            })}
          </>
        )}
        {design === "cards" &&
          rows.map((row, i) => {
            const cols = rows.length < 3 ? rows.length : 3,
              w = 876 / cols,
              h = available / Math.ceil(rows.length / cols),
              x = 42 + (i % cols) * w,
              y = top + Math.floor(i / cols) * h;
            return (
              <g key={row.id} data-party-id={row.id} data-value={row.value}>
                <rect
                  x={x + 3}
                  y={y + 4}
                  width={w - 12}
                  height={h - 14}
                  fill={dark ? "#1e3044" : "#f1f4f7"}
                  rx="12"
                />
                <rect
                  x={x + 3}
                  y={y + 4}
                  width="7"
                  height={h - 14}
                  fill={row.color}
                />
                {label(x + 24, y + 47, row.name, 24, 13, { fontWeight: 700 })}
                {text(
                  x + 24,
                  y + h * 0.68,
                  fmt(row.value),
                  Math.min(60, w * 0.2),
                  { fontWeight: 700 },
                )}
                <rect
                  x={x + 24}
                  y={y + h - 40}
                  width={((w - 56) * row.value) / max}
                  height="7"
                  fill={row.color}
                />
              </g>
            );
          })}
        {design === "poster" &&
          rows.map((row, i) => {
            const y = top + i * step;
            return (
              <g key={row.id} data-party-id={row.id} data-value={row.value}>
                <line x1="42" x2="918" y1={y} y2={y} stroke={grid} />
                <rect
                  x="42"
                  y={y + 25}
                  width="12"
                  height={step - 43}
                  fill={row.color}
                />
                {label(78, y + step * 0.55, row.name, 33, 18, {
                  fontWeight: 700,
                })}
                {text(
                  918,
                  y + step * 0.73,
                  fmt(row.value),
                  Math.min(96, step * 0.78),
                  { textAnchor: "end", fontWeight: 900, letterSpacing: "-4" },
                )}
              </g>
            );
          })}
        {design === "ladder" && (
          <>
            <line
              x1="480"
              x2="480"
              y1={top + 30}
              y2={bottom}
              stroke={muted}
              strokeWidth="2"
            />
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <g key={v}>
                <line
                  x1="474"
                  x2="486"
                  y1={bottom - v * (available - 30)}
                  y2={bottom - v * (available - 30)}
                  stroke={muted}
                />
                {text(
                  493,
                  bottom - v * (available - 30) + 5,
                  `${studioNumber(v * max, state.lang, { maximumFractionDigits: 2 })}%`,
                  15,
                  { fill: muted },
                )}
              </g>
            ))}
            {rows.map((row, i) => {
              const left = i % 2 === 0,
                y =
                  top +
                  50 +
                  (i * (available - 75)) / Math.max(rows.length - 1, 1),
                cy = bottom - (row.value / max) * (available - 30),
                x = left ? 42 : 670;
              return (
                <g key={row.id} data-party-id={row.id} data-value={row.value}>
                  <line
                    x1={left ? 300 : 650}
                    x2="480"
                    y1={y}
                    y2={cy}
                    stroke={row.color}
                    strokeWidth="2"
                  />
                  <circle cx="480" cy={cy} r="8" fill={row.color} />
                  {label(x, y - 10, row.name, 23, 17, { fontWeight: 700 })}
                  {text(x, y + 30, fmt(row.value), 34, { fontWeight: 700 })}
                </g>
              );
            })}
          </>
        )}
        {design === "classic" &&
          rows.map((row, i) => {
            const y = top + i * step + (step - 55) / 2;
            const height = 18 * (state.barScale || 1);
            const width = (row.value / max) * 550;
            return (
              <g key={row.id} data-party-id={row.id} data-value={row.value}>
                <g data-editor-target="legend" data-legend-id={row.id} data-layout-width="185" data-layout-height={step - 8}>
                  <circle cx="56" cy={y + 27} r="6" fill={row.color} />
                  {label(74, y + 34, row.name, 23, 15, { fontWeight: 700, 'data-text-width': 158 })}
                </g>
                <rect
                  x="250"
                  y={y + 25 - height / 2}
                  width="550"
                  height={height}
                  rx={height / 2}
                  fill={grid}
                  opacity=".45"
                />
                <rect
                  x="250"
                  y={y + 25 - height / 2}
                  width={width}
                  height={height}
                  rx={height / 2}
                  fill={row.color}
                />
                {text(908, y + 34, fmt(row.value), 25, {
                  textAnchor: "end",
                  fontWeight: 700,
                })}
              </g>
            );
          })}
        {design === "pie" &&
          rows.length > 0 &&
          (() => {
            const total = rows.reduce((sum, row) => sum + row.value, 0);
            if (total > 100 || rows.some((row) => row.value < 0))
              return text(
                42,
                top + 45,
                l(
                  "Kein Kreisdiagramm: Anteile ergeben nicht 100 %.",
                  "Pie unavailable: shares do not form 100%.",
                  "Gráfico no disponible: los valores no forman el 100%.",
                ),
                23,
              );
            const slices = [
              ...rows,
              ...(total < 100
                ? [
                    {
                      id: "remainder",
                      name: l(
                        "Weitere / nicht dargestellt",
                        "Others / not displayed",
                        "Otros / no mostrados",
                      ),
                      value: 100 - total,
                      color: dark ? "#687582" : "#cbd2da",
                    },
                  ]
                : []),
            ];
            const r = Math.min(210, available / 2 - 30),
              cx = 280,
              cy = top + available / 2;
            let angle = -Math.PI / 2;
            return (
              <g data-pie-total="100">
                {slices.map((row) => {
                  const start = angle;
                  angle += (row.value / 100) * Math.PI * 2;
                  const d = `M ${cx} ${cy} L ${cx + r * Math.cos(start)} ${cy + r * Math.sin(start)} A ${r} ${r} 0 ${row.value > 50 ? 1 : 0} 1 ${cx + r * Math.cos(angle)} ${cy + r * Math.sin(angle)} Z`;
                  return row.value === 100 ? (
                    <circle
                      key={row.id}
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={row.color}
                    />
                  ) : (
                    <path
                      key={row.id}
                      d={d}
                      fill={row.color}
                      stroke={bg}
                      strokeWidth="3"
                      data-share={row.value}
                    />
                  );
                })}
                {slices.map((row, i) => {
                  const y =
                    top +
                    30 +
                    i * Math.min(76, (available - 40) / slices.length);
                  return (
                    <g
                      key={row.id}
                      data-party-id={
                        row.id === "remainder" ? undefined : row.id
                      }
                      data-value={row.value}
                    >
                      <g data-editor-target="legend" data-legend-id={row.id} data-layout-width="275" data-layout-height="58">
                        <circle cx="540" cy={y - 7} r="7" fill={row.color} />
                        {label(561, y, row.name, 22, 18, { 'data-text-width': 247 })}
                      </g>
                      {text(917, y, fmt(row.value), 24, {
                        textAnchor: "end",
                        fontWeight: 700,
                      })}
                    </g>
                  );
                })}
              </g>
            );
          })()}
        {design === "material" && rows.length > 0 && (
          <g data-editor-target="chart" data-design-blocks="party-colour">
            {rows.map((row, i) => {
              const cell = 840 / rows.length,
                width =
                  Math.min(92, cell * 0.6) * Math.min(1.2, state.barScale),
                depth = Math.min(24, cell * 0.17);
              const x = 60 + i * cell + (cell - width - depth) / 2,
                base = bottom - 70,
                h = ((available - 135) * row.value) / max;
              return (
                <g key={row.id} data-party-id={row.id} data-value={row.value}>
                  <polygon
                    points={`${x},${base - h} ${x + depth},${base - h - depth} ${x + width + depth},${base - h - depth} ${x + width},${base - h}`}
                    fill={row.color}
                  />
                  <polygon
                    points={`${x},${base - h} ${x + depth},${base - h - depth} ${x + width + depth},${base - h - depth} ${x + width},${base - h}`}
                    fill="#fff"
                    opacity=".24"
                  />
                  <rect
                    x={x}
                    y={base - h}
                    width={width}
                    height={h}
                    fill={row.color}
                  />
                  <polygon
                    points={`${x + width},${base - h} ${x + width + depth},${base - h - depth} ${x + width + depth},${base - depth} ${x + width},${base}`}
                    fill={row.color}
                  />
                  <polygon
                    points={`${x + width},${base - h} ${x + width + depth},${base - h - depth} ${x + width + depth},${base - depth} ${x + width},${base}`}
                    fill="#000"
                    opacity=".25"
                  />
                  {text(
                    x + width / 2,
                    base - h - depth - 18,
                    fmt(row.value),
                    26,
                    { textAnchor: "middle", fontWeight: 700 },
                  )}
                  {label(
                    x + width / 2,
                    base + 32,
                    row.name,
                    21,
                    Math.max(6, Math.floor(cell / 12)),
                    { textAnchor: "middle" },
                  )}
                </g>
              );
            })}
          </g>
        )}
        {state.reference > 0 &&
          [
            "classic",
            "news",
            "paper",
            "signal",
            "lollipop",
            "dotplot",
          ].includes(design) && (
            <g data-reference={state.reference}>
              <line
                x1={
                  250 +
                  ((design === "classic" ? 550 : span) * state.reference) / max
                }
                x2={
                  250 +
                  ((design === "classic" ? 550 : span) * state.reference) / max
                }
                y1={top}
                y2={bottom}
                stroke={ink}
                strokeDasharray="6 5"
                strokeWidth="2"
              />
              {text(
                250 +
                  ((design === "classic" ? 550 : span) * state.reference) / max,
                top - 10,
                `${studioNumber(state.reference, state.lang)} %`,
                17,
                { textAnchor: "middle" },
              )}
            </g>
          )}
        {noteLines.map((line, i) =>
          text(
            textX(state.noteAlign, 42),
            H - 90 - footerExtra + i * (noteSize * 1.45),
            line,
            noteSize,
            {
              key: `editor-note-${i}`,
              "data-editor-target": "note",
              textAnchor: textAnchor(state.noteAlign),
              fill: muted,
            },
          ),
        )}
        <line x1="42" x2="918" y1={H - 65} y2={H - 65} stroke={grid} />
        <a
          href={svgRef ? snapshot.sourceUrl : undefined}
          tabIndex={svgRef ? 0 : -1}
          target="_blank"
          rel="noreferrer"
        >
          <text x="42" y={H - 38} fontSize="17" fill={muted}>
            {snapshot.source || "DAWUM"} · dawum.de · {snapshot.license || "ODbL 1.0"} ·
            odbl.dawum.de · Pollframe
          </text>
        </a>
        {text(
          42,
          H - 15,
          l(
            `Ausgewählte Parteien · ${snapshot.latestCalculation?'Durchschnitt':'Umfrage'}, keine Prognose${state.precision === 0 ? " · Beschriftung gerundet" : ""}`,
            `Selected parties · ${snapshot.latestCalculation?'average':'a poll'}, not a forecast${state.precision === 0 ? " · Rounded labels" : ""}`,
            `Partidos seleccionados · ${snapshot.latestCalculation?'media':'encuesta'}, no pronóstico${state.precision === 0 ? " · Etiquetas redondeadas" : ""}`,
          ),
          16,
          { fill: muted },
        )}
      </g>
    </StudioSvg>
  );
});

export function CurrentDesignPreview({
  PublishDialog,
  assistantMessages,
  setAssistantMessages,
  snapshot,
  state,
  template,
  savedDesign,
  update: apply,
  onGallery,
  l,
  Design = CurrentDesign,
}) {
  const svgRef = useRef(null);
  const fontRevision = useStudioFont(state.font);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [publish, setPublish] = useState(null);
  const [resource, setResource] = useState(null);
  const [hasStyles, setHasStyles] = useState(false);
  const published = useRef(false);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      import("./studio-style-library.js")
        .then((m) => m.listStyles())
        .then((items) => {
          if (active) setHasStyles(items.length > 0);
        })
        .catch(() => {});
    refresh();
    window.addEventListener("studio-styles-change", refresh);
    return () => {
      active = false;
      window.removeEventListener("studio-styles-change", refresh);
    };
  }, []);
  const [assistantOpen, setAssistantOpen] = useState(
      () => STUDIO_ASSISTANT_ENABLED && Boolean(assistantMessages?.length),
    ),
    [chatWidth, setChatWidth] = useState(280),
    [inspectorWidth, setInspectorWidth] = useState(430);
  const editorAllowed = useStudioEditorDevice();
  const toolsOpen = editorAllowed && state.workspace === "edit";
  useEffect(() => {
    if (!editorAllowed && state.workspace === "edit")
      apply({ workspace: "preview" });
  }, [editorAllowed, state.workspace]);
  const [selection, setSelection] = useState({ target: "text", revision: 0 });
  const [selectionOpen, setSelectionOpen] = useState(false);
  const selectTool = (target) =>
    setSelection((previous) => ({
      ...(typeof target === "object" ? target : { target }),
      revision: previous.revision + 1,
    }));
  const [toolsLoaded, setToolsLoaded] = useState(toolsOpen);
  useEffect(() => {
    if (toolsOpen) setToolsLoaded(true);
  }, [toolsOpen]);
  const openEditor = () => {
    const url = new URL(location.href);
    url.searchParams.set("workspace", "edit");
    history.pushState({ ...history.state, studioEditor: true,
      ...(Number.isInteger(history.state?.studioGalleryDepth)
        ? { studioGalleryDepth: history.state.studioGalleryDepth + 1 } : {}),
    }, "", url);
    update({ workspace: "edit" });
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const [backgroundImage, setBackgroundImage] = useState("");
  const session = useEditorSession(
    state,
    apply,
    backgroundImage,
    setBackgroundImage,
    toolsOpen,
  );
  const update = session.change;
  const [designName, setDesignName] = useState(savedDesign?.name || ""),
    [saving, setSaving] = useState(false);
  const savedId = useRef(savedDesign?.id);
  useEffect(() => {
    setBackgroundImage(savedDesign?.backgroundImage || "");
    setDesignName(savedDesign?.name || "");
    savedId.current = savedDesign?.id;
  }, [savedDesign]);
  async function save() {
    if (!svgRef.current || saving) return;
    setSaving(true);
    try {
      const { saveDesign } = await import("./studio-library.js");
      const xml = await serializeStudioSvg(svgRef.current, state.font);
      const thumbnail = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(new Blob([xml], { type: "image/svg+xml" }));
      });
      const record = await saveDesign(
        designName,
        state,
        backgroundImage,
        thumbnail,
        savedId.current,
      );
      savedId.current = record.id;
      setResource("style-offer");
      setStatus(
        l(
          "Design in Meine Designs gespeichert.",
          "Saved to My designs.",
          "Guardado en Mis diseños.",
        ),
      );
    } catch {
      setStatus(
        l(
          "Speichern fehlgeschlagen. Prüfe den freien Browser-Speicher.",
          "Could not save. Check available browser storage.",
          "No se pudo guardar. Comprueba el espacio del navegador.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }
  const localBackground = backgroundImage;
  const embedParams = new URLSearchParams({ studioDesign: "1" });
  for (const [key, value] of Object.entries(state))
    if (value !== null && value !== undefined) embedParams.set(key, value);
  embedParams.set("workspace", "preview");
  const embedUrl = `${location.origin}/embed.html?${embedParams}`;
  const [ratio, setRatio] = useState("960/900");
  const captureSvg = React.useCallback((node) => {
    svgRef.current = node;
    if (node?.viewBox.baseVal.height)
      setRatio(`${node.viewBox.baseVal.width}/${node.viewBox.baseVal.height}`);
  }, []);
  useEffect(() => {
    const viewBox = svgRef.current?.viewBox.baseVal;
    if (viewBox?.height) setRatio(`${viewBox.width}/${viewBox.height}`);
  }, [state, template, snapshot, fontRevision]);
  const embedCode = `<iframe src="${embedUrl.replaceAll("&", "&amp;")}" title="Pollframe" loading="lazy" style="display:block;width:100%;height:auto;aspect-ratio:${ratio};border:0"></iframe>`;
  async function download({ renderOnly = false } = {}) {
    if (!svgRef.current || busy) return;
    setBusy(true);
    setStatus("");
    try {
      const svg = svgRef.current;
      const source = new Blob([await serializeStudioSvg(svg, state.font)], {
        type: "image/svg+xml;charset=utf-8",
      });
      const image = new Image();
      // The production policy allows data images, not blob images. Keep that
      // restriction and use a Unicode-safe data URL for the SVG rasterisation.
      image.src = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(source);
      });
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = state.exportWidth || 1920;
      canvas.height = Math.round(
        (svg.viewBox.baseVal.height * canvas.width) / svg.viewBox.baseVal.width,
      );
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob?.size) throw new Error("empty");
      if (renderOnly)
        return {
          blob,
          filename: `pollframe-${template.id}-${snapshot.date}.png`,
        };
      const downloadUrl = URL.createObjectURL(blob),
        anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `pollframe-${template.id}-${snapshot.date}.png`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
    } catch (error) {
      if (renderOnly) throw error;
      setStatus(
        l(
          "Export fehlgeschlagen. Bitte erneut versuchen.",
          "Export failed. Please retry.",
          "Error al exportar. Inténtalo de nuevo.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="studio-current-preview">
      <header>
        <h1>
          {toolsOpen
            ? l("Grafik bearbeiten", "Edit graphic", "Editar gráfica")
            : studioText(template.name, state.lang)}
        </h1>
        <div className="studio-preview-tools" role="group" aria-label={l('Gestaltung und Quellen','Design and sources','Diseño y fuentes')}>
        <button
          className="secondary-button"
          disabled={!snapshot}
          onClick={() => setResource("info")}
        >
          Info
        </button>
        {!toolsOpen && editorAllowed && (
          <button className="primary-button" onClick={openEditor}>
            {l("Bearbeiten", "Edit", "Editar")}
          </button>
        )}
        {hasStyles && (
          <button
            className="secondary-button studio-apply-style"
            onClick={() => setResource("styles")}
          >
            {l("Stil anwenden", "Apply a style", "Aplicar un estilo")}
          </button>
        )}
        </div>
        <div className="studio-preview-publish" role="group" aria-label={l('Veröffentlichen','Publish','Publicar')}>
        <button
          className={toolsOpen ? "primary-button" : "secondary-button"}
          disabled={!snapshot || busy}
          onClick={() => setPublish("png")}
        >
          {busy ? "…" : l("PNG herunterladen", "Download PNG", "Descargar PNG")}
        </button>

        <button
          className="secondary-button"
          disabled={
            Boolean(localBackground) || state.font.startsWith("custom-")
          }
          title={
            state.font.startsWith("custom-")
              ? l(
                  "Eigene Schriften sind nur für PNG verfügbar.",
                  "Custom fonts are PNG-only.",
                  "Las fuentes propias solo están disponibles para PNG.",
                )
              : undefined
          }
          aria-expanded={publish === "embed"}
          onClick={() => setPublish("embed")}
        >
          {l("Embed", "Embed", "Insertar")}
        </button>
        {toolsOpen && (
          <button
            className="secondary-button"
            disabled={!snapshot || busy || state.font.startsWith("custom-")}
            onClick={async () => {
              try {
                if (!svgRef.current) return;
                const { saveFile } = await import("./studio-editor-files.js");
                saveFile(
                  await serializeStudioSvg(svgRef.current, state.font),
                  "image/svg+xml;charset=utf-8",
                  `pollframe-${template.id}-${snapshot.date}.svg`,
                );
              } catch {
                setStatus(
                  l(
                    "SVG-Export fehlgeschlagen.",
                    "SVG export failed.",
                    "Error al exportar SVG.",
                  ),
                );
              }
            }}
          >
            SVG
          </button>
        )}
        </div>
      </header>
      {toolsOpen && (
        <div className="studio-save-row">
          {STUDIO_ASSISTANT_ENABLED && (
            <button
              className="secondary-button"
              aria-pressed={assistantOpen}
              onClick={() => setAssistantOpen((v) => !v)}
            >
              {l("KI-Assistent", "AI assistant", "Asistente de IA")}
            </button>
          )}
          <input
            aria-label={l("Designname", "Design name", "Nombre del diseño")}
            placeholder={l("Mein Design", "My design", "Mi diseño")}
            value={designName}
            maxLength="80"
            onChange={(e) => setDesignName(e.target.value)}
          />
          <button
            className="secondary-button"
            disabled={saving || !snapshot}
            onClick={save}
          >
            {l("Design speichern", "Save design", "Guardar diseño")}
          </button>
        </div>
      )}
      {localBackground && (
        <p className="studio-current-note">
          {l(
            "Dein Hintergrundbild ist nur lokal verfügbar. Für Embed bitte das Bild entfernen. Es wird nicht hochgeladen oder im Link gespeichert.",
            "Your background image is local only. Remove it to enable embed. It is not uploaded or stored in the link.",
            "La imagen de fondo solo está disponible localmente. Quítala para habilitar la inserción. No se sube ni se guarda en el enlace.",
          )}
        </p>
      )}
      {resource && (
        <Suspense
          fallback={
            <p role="status">
              {l("Wird geladen …", "Loading …", "Cargando …")}
            </p>
          }
        >
          {resource === "styles" ? (
            <StylePicker
              state={state}
              template={template}
              update={update}
              l={l}
              onClose={() => setResource(null)}
            />
          ) : resource === "style-create" ? (
            <StyleWizard
              state={state}
              l={l}
              preview={style => snapshot && <Design snapshot={snapshot} state={{...state,...style,subtitle:state.subtitle||l('Gestaltung für deine nächste Veröffentlichung','A style for your next publication','Un estilo para tu próxima publicación'),editorNote:state.editorNote||l('Beispiel einer redaktionellen Anmerkung','Example editorial note','Ejemplo de nota editorial'),workspace:"preview"}} template={template} />}
              onClose={() => setResource(null)}
            />
          ) : resource === "style-offer" ? (
            <ResourceDialog
              title={l(
                "Gestaltung wiederverwenden?",
                "Reuse this style?",
                "¿Reutilizar este estilo?",
              )}
              l={l}
              onClose={() => setResource(null)}
              footer={
                <>
                  <button
                    className="primary-button"
                    onClick={() => setResource("style-create")}
                  >
                    {l(
                      "Als Stil speichern",
                      "Save as a style",
                      "Guardar como estilo",
                    )}
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => setResource(null)}
                  >
                    {l("Nicht jetzt", "Not now", "Ahora no")}
                  </button>
                </>
              }
            >
              <p>
                {l(
                  "Speichere Schrift, Hintergrund und Formen separat, um sie auf andere Grafiken anzuwenden. Daten und Texte werden nicht übernommen.",
                  "Save typography, background and shapes separately to reuse on other charts. Data and wording are not included.",
                  "Guarda tipografía, fondo y formas por separado para reutilizarlos. No se incluyen datos ni textos.",
                )}
              </p>
            </ResourceDialog>
          ) : (
            snapshot && (
              <StudioTransparency
                render={() => download({renderOnly:true})}
                state={state}
                snapshot={snapshot}
                template={template}
                l={l}
                onClose={() => setResource(null)}
              />
            )
          )}
        </Suspense>
      )}
      {publish && PublishDialog && (
        <Suspense fallback={null}>
          <PublishDialog
            kind={publish}
            setKind={setPublish}
            snapshot={snapshot}
            template={template}
            embedUrl={embedUrl}
            ratio={ratio}
            onClose={() => {
              setPublish(null);
              if (published.current) {
                published.current = false;
                setResource("style-offer");
              }
            }}
            onPublished={() => {
              published.current = true;
            }}
            state={state}
            update={update}
            download={download}
            busy={busy}
            embedCode={embedCode}
            svgRef={svgRef}
            l={l}
          />
        </Suspense>
      )}
      {toolsOpen && (
        <nav
          className="studio-canvas-tools"
          aria-label={l(
            "Direkt bearbeiten",
            "Edit directly",
            "Editar directamente",
          )}
        >
          {[
            ["text", l("Titel", "Title", "Título")],
            ["subtitle", l("Unterzeile", "Subtitle", "Subtítulo")],
            ["chart", l("Diagramm", "Chart", "Gráfica")],
            ["data", l("Daten", "Data", "Datos")],
            ["color", l("Farben", "Colours", "Colores")],
            ["image", l("Hintergrund", "Background", "Fondo")],
          ].map(([target, label]) => (
            <button
              type="button"
              key={target}
              aria-pressed={selection.target === target}
              onClick={() => selectTool(target)}
            >
              {label}
            </button>
          ))}
          <small>
            {l(
              "Oder direkt in die Grafik klicken.",
              "Or click directly on the graphic.",
              "O haz clic directamente en la gráfica.",
            )}
          </small>
        </nav>
      )}
      {toolsOpen && (
        <Suspense fallback={null}>
          <ContextToolbar
            template={template}
            state={state}
            selection={selection}
            update={update}
            l={l}
            session={session}
            elementControl={(detail) =>
              svgRef.current?.dispatchEvent(
                new CustomEvent("studio-selection-command", { detail }),
              )
            }
          />
        </Suspense>
      )}
      <div
        className={
          toolsOpen
            ? `studio-workspace has-tools ${assistantOpen ? "has-assistant" : ""}`
            : "studio-workspace"
        }
        style={{
          "--studio-chat-width": `${chatWidth}px`,
          "--studio-inspector-width": `${inspectorWidth}px`,
        }}
        onPointerDown={(e) => {
          if (
            e.target === e.currentTarget ||
            e.target.classList.contains("studio-current-preview-image")
          )
            selectTool("none");
        }}
      >
        {STUDIO_ASSISTANT_ENABLED && toolsOpen && assistantOpen && (
          <Suspense fallback={null}>
            <StudioAssistant
              state={state}
              snapshot={snapshot}
              l={l}
              messages={assistantMessages || []}
              setMessages={setAssistantMessages}
              onApply={update}
              onCollapse={() => setAssistantOpen(false)}
            />
            <PanelResizer
              side="left"
              value={chatWidth}
              onChange={setChatWidth}
              l={l}
            />
          </Suspense>
        )}
        {snapshot ? (
          <div
            className="studio-current-preview-image"
            data-editing={toolsOpen || undefined}
            style={{
              "--studio-art-ratio":
                Number(ratio.split("/")[0]) / Number(ratio.split("/")[1]),
            }}
          >
            <StudioLoadBoundary key={template.id} lang={state.lang}>
              <Suspense
                fallback={
                  <p role="status">
                    {l(
                      "Grafik wird geladen…",
                      "Loading chart…",
                      "Cargando gráfica…",
                    )}
                  </p>
                }
              >
                <Design
                  snapshot={snapshot}
                  state={
                    template.topic === "party"
                      ? { ...state, parties: null }
                      : state
                  }
                  template={template}
                  svgRef={captureSvg}
                  backgroundImage={localBackground}
                />
              </Suspense>
            </StudioLoadBoundary>
            {toolsOpen && (
              <Suspense fallback={null}>
                <CanvasEditor
                  topic={template.topic}
                  onEdit={() => setSelectionOpen(true)}
                  session={session}
                  svgRef={svgRef}
                  state={state}
                  selection={selection}
                  select={selectTool}
                  update={update}
                  l={l}
                />
              </Suspense>
            )}
            {toolsOpen && (
              <button
                type="button"
                className="studio-preview-expand"
                onClick={() => {
                  update({ workspace: "preview" });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                {l("Große Vorschau", "Full preview", "Vista previa completa")}
              </button>
            )}
          </div>
        ) : (
          <p role="status">
            {l("Daten werden geladen…", "Loading data…", "Cargando datos…")}
          </p>
        )}
        {STUDIO_ASSISTANT_ENABLED && toolsOpen && assistantOpen && (
          <Suspense fallback={null}>
            <PanelResizer
              side="right"
              value={inspectorWidth}
              onChange={setInspectorWidth}
              l={l}
            />
          </Suspense>
        )}
        {toolsLoaded && (
          <div hidden={!toolsOpen} className="studio-inspector-panel">
            {toolsOpen && (
              <Suspense fallback={null}>
                <PanelResizer
                  side="right"
                  value={inspectorWidth}
                  onChange={setInspectorWidth}
                  l={l}
                />
              </Suspense>
            )}
            <div className="studio-inspector-content">
              <StudioLoadBoundary lang={state.lang}>
                <Suspense
                  fallback={
                    <p role="status">
                      {l(
                        "Editor wird geladen…",
                        "Loading editor…",
                        "Cargando editor…",
                      )}
                    </p>
                  }
                >
                  <StudioEditorControls
                    state={state}
                    template={template}
                    snapshot={snapshot}
                    update={update}
                    backgroundImage={backgroundImage}
                    setBackgroundImage={setBackgroundImage}
                    l={l}
                    selection={selection}
                    session={session}
                  />
                </Suspense>
              </StudioLoadBoundary>
            </div>
          </div>
        )}
      </div>
      {toolsOpen && selectionOpen && (
        <Suspense fallback={null}>
          <SelectionDialog
            state={state}
            selection={selection}
            template={template}
            snapshot={snapshot}
            update={update}
            backgroundImage={backgroundImage}
            setBackgroundImage={setBackgroundImage}
            l={l}
            session={session}
            onClose={() => setSelectionOpen(false)}
            elementControl={(detail) =>
              svgRef.current?.dispatchEvent(
                new CustomEvent("studio-selection-command", { detail }),
              )
            }
          />
        </Suspense>
      )}
      <p role="status">{status}</p>
      <p className="studio-current-note">
        {l(
          "PNG hält den exportierten Stand fest. Embed lädt beim Öffnen verfügbare Daten mit deinen Einstellungen. Quellen und Berechnung findest du unter Info.",
          "PNG freezes the exported view. Embed loads available data when opened using your settings. Find sources and calculations under Info.",
          "El PNG conserva la vista exportada. La inserción carga los datos disponibles al abrirse con tus ajustes. Consulta las fuentes y los cálculos en Info.",
        )}
      </p>
    </section>
  );
}
