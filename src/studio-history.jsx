import StudioSvg from "./studio-svg.jsx";
import { studioNumber, studioDate } from "./studio-format.js";
import { EventMarkerGlyph } from "./event-marker-glyph.jsx";
import { eventLabelMetrics } from "./event-marker-layout.js";
import { studioEvents } from "./studio-events.js";
import { eventLayout, parseEventLanes, parseEventNumbers } from "./studio-event-layout.js";
import { useStudioFont } from "./studio-font-loader.js";
import { studioFont, textX, textAnchor } from "./studio-fonts.js";
import React, { useId } from "react";
import { historySegments, historyScale } from "./studio-history-model.js";
import { continuousSmoothPath, continuousLinearPath } from "./chart-paths.js";
import { selectStudioEvents, eventIds } from "./studio-event-selection.js";
import { wrapText, textWidth } from "./studio-text-layout.js";
import { normalizeTextStyles } from "./studio-text-style.js";
import { layoutHistoryFooter } from "./studio-history-footer.js";
import {studioRegionName} from './studio-regions.js';

const luminance = (color) => {
  const rgb = color
    .replace("#", "")
    .match(/../g)
    ?.map((v) => parseInt(v, 16) / 255) || [1, 1, 1];
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
const colors = [
  "#55b8ff",
  "#f26b8a",
  "#54c995",
  "#bb92ef",
  "#e5bc46",
  "#f4955e",
];
const patterns = ["", "12 5", "3 5", "14 4 3 4", "7 3", "2 3"];

export const HistoryDesign = React.memo(function HistoryDesign({
  snapshot,
  state,
  template,
  svgRef,
  backgroundImage,
}) {
  useStudioFont(state.font);
  const sourceStyle = normalizeTextStyles(state.textStyles).sources || {};
  // A role-specific font can load independently of the overall design font.
  // Rerender this layout too, not only StudioSvg's presentation attributes.
  useStudioFont(sourceStyle.font);
  const id = useId().replace(/:/g, "");
  if (!snapshot) return null;
  const l = (de, en, es) =>
    state.lang === "de" ? de : state.lang === "es" ? es : en;
  const design = template.design,
    difference = snapshot.unit === "pp",
    panels = design === "panels",
    print = design === "print";
  const bg =
    state.background ||
    (state.theme === "dark"
      ? design === "neon"
        ? "#090f22"
        : "#191e25"
      : print
        ? "#f6f1e6"
        : "#ffffff");
  const dark = luminance(bg) < 0.45,
    ink = dark ? "#f2f5fa" : "#17202d",
    muted = dark ? "#bec8d7" : "#4c5868",
    grid = dark ? "#3c4659" : "#d8dee6";
  const font = studioFont(
    state.font,
    state.font === "serif" || (state.font === "auto" && print)
      ? "Georgia, serif"
      : state.font === "mono"
        ? "Courier New, monospace"
        : "Arial, sans-serif",
  );
  const points =
    state.mode === "trend" || state.mode === "both"
      ? snapshot.trend
      : snapshot.averages;
  const available = snapshot.rows.filter((row) =>
    points.some((point) => Number.isFinite(point.results?.[row.id])),
  );
  const selected = available.filter((row) =>
    state.parties === null || ["party", "approval"].includes(template.topic)
      ? (snapshot.selectedParties || available.map((x) => x.id)).includes(
          row.id,
        )
      : state.parties.split(",").includes(String(row.id)),
  );
  const entries = selected
    .map((row, index) => {
      const raw = historySegments(points, row.id).flat(),
        base = 0;
      const segments = historySegments(points, row.id, difference ? base : 0);
      let color =
        state.monochrome || print
          ? ink
          : (state.palette || "")
              .split(",")
              .find((s) => s.startsWith(row.id + ":"))
              ?.split(":")[1] || row.color;
      if (color === "var(--party-union)") color = dark ? "#dce0e6" : "#17191c";
      if (!/^#[a-f\d]{6}$/i.test(color)) color = colors[index % colors.length];
      // Retain party hue in dark mode; saturated reds must not become CDU grey.
      if (dark && luminance(color) < 0.22) {
        const channels = color
          .slice(1)
          .match(/../g)
          .map((channel) => parseInt(channel, 16));
        color =
          Math.max(...channels) - Math.min(...channels) < 25
            ? "#c4cddd"
            : "#" +
              color
                .slice(1)
                .match(/../g)
                .map((channel) =>
                  Math.round(parseInt(channel, 16) * 0.62 + 255 * 0.38)
                    .toString(16)
                    .padStart(2, "0"),
                )
                .join("");
      }
      if (!dark && luminance(color) > 0.77) color = "#a07d12";
      return {
        ...row,
        color,
        segments,
        base,
        first: raw[0],
        last: raw.at(-1),
        value: segments.at(-1)?.at(-1)?.value,
        index,
      };
    })
    .sort((a, b) =>
      state.order === "name"
        ? a.name.localeCompare(b.name, state.lang)
        : (b.last?.value ?? 0) - (a.last?.value ?? 0),
    );
  const value = (v) =>
    studioNumber(Number(v), state.lang, {
      minimumFractionDigits: state.precision,
      maximumFractionDigits: state.precision,
    });
  const date = (d) =>
    snapshot.aligned
      ? `${Math.round((Date.parse(d) - Date.parse(snapshot.start)) / 2629800000)} ${l("Mon.", "mo.", "meses")}`
      : studioDate(new Date(d), state.lang, {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        });
  const exact = (d) =>
    studioDate(new Date(d), state.lang, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  const title =
    state.headline ||
    snapshot.title ||
    (difference
      ? l(
          "Gewinne und Verluste im Zeitverlauf",
          "Gains and losses over time",
          "Ganancias y pérdidas a lo largo del tiempo",
        )
      : state.region!=='bundestag' ? `${studioRegionName(state.region,state.lang)} · ${l('Umfragen im Zeitverlauf','polling over time','evolución de las encuestas')}` : l(
          "Bundestagsumfragen im Zeitverlauf",
          "German polling over time",
          "Evolución de las encuestas alemanas",
        ));
  const titleSize =
    state.titleSize *
    (design === "poster" ? 1.55 : design === "news" ? 1.15 : 1);
  const titleBaseline = 85 + state.topPadding + Math.max(0, titleSize - 36);
  const titleLines = wrapText(title, 820, titleSize, font, state.titleWeight);
  const subtitle = wrapText(state.subtitle, 850, state.subtitleSize, font);
  const subtitleStep = state.subtitleSize * 1.5;
  const subtitleBaseline =
    titleBaseline +
    state.subtitleGap +
    (titleLines.length - 1) * titleSize * state.titleLeading +
    state.subtitleSize +
    36;
  const headerBottom = state.subtitle
    ? subtitleBaseline + (subtitle.length - 1) * subtitleStep + 16
    : titleBaseline +
      (titleLines.length - 1) * titleSize * state.titleLeading +
      16;
  const legendStep = Math.max(
    34,
    ...entries.map(
      (row) =>
        wrapText(row.name, 188, state.historyLabelSize, font).length *
          (state.historyLabelSize + 4) +
        12,
    ),
  );
  const legendHeight = state.historyLegend
    ? Math.ceil(entries.length / 4) * legendStep
    : 0;
  const latest = !difference && !snapshot.aligned ? snapshot.latestIndividual : null;
  const originPolls = state.showPollOrigins && !difference && !snapshot.aligned && !panels
    ? (snapshot.calculationInputs?.polls||[]).filter(p=>p.date>=snapshot.start&&p.date<=snapshot.end) : [];
  const averageMark = state.mode==='polls' ? l('Punkte: Mittelwerte','Dots: averages','Puntos: medias') : l('Linie: Durchschnitt','Line: average','Línea: media');
  const pollMark = l('umrandete Punkte: Einzelumfragen','outlined dots: individual polls','puntos con contorno: encuestas individuales');
  const latestLegendLines = latest || originPolls.length ? wrapText(`${averageMark} · ${pollMark}${originPolls.length?'':` · ${latest.institute} · ${latest.date}`}`,864,15,font) : [];
  const latestLegendHeight = latestLegendLines.length * 20 + (latest ? 10 : 0);
  const top = headerBottom + 65 + legendHeight + latestLegendHeight;
  const eventSelection = panels || snapshot.aligned
    ? { candidates: [], elections: [] } : selectStudioEvents(snapshot, {...state,historySeedRemoved:""});
  const eventCandidates = eventSelection.candidates;
  const allEvents = [...eventCandidates, ...eventSelection.elections];
  const left = Math.max(72, Math.ceil(textWidth("−100,0", state.historyLabelSize, font)) + 22),
    right = design === "rail" ? 680 : snapshot.kind === "approval" ? 740 : 824,
    plotWidth = right - left;
  const x = (d) =>
    left +
    ((Date.parse(d) - Date.parse(snapshot.start)) /
      Math.max(1, Date.parse(snapshot.end) - Date.parse(snapshot.start))) *
      plotWidth;
  const measuredCandidates = eventCandidates.map((event) => {
      const label = event.custom
        ? `${l("Eigene Annotation", "Custom annotation", "Anotación propia")}: ${event.label}`
        : event.label;
      const metrics = eventLabelMetrics(label);
      // Measure the actual selected font, including wide display fonts and
      // unbroken custom titles, rather than estimating by character count.
      const labelLines = wrapText(label, 220, 12.8, font, 800);
      return { ...event, ...metrics, labelLines,
        labelWidth: Math.min(250, Math.max(134, ...labelLines.map(line => textWidth(line, 12.8, font, 800) + 30))),
        labelHeight: 18 + labelLines.length * 15 };
    });
  const { visible: eventLabels, hidden: hiddenEvents } = eventLayout(
    measuredCandidates.filter(e=>!eventIds(state.historySeedRemoved).has(e.id)),
    {
      x,
      left,
      right,
      layers: state.historyLayers,
      limit: state.historyEventLimit,
      lanes: parseEventLanes(state.historyEventLanes),
      positions: parseEventNumbers(state.historyEventPositions),
      limits: parseEventNumbers(state.historyLayerDensity, 0, 16),
    },
  );
  const eventBoxHeight = Math.max(
    38,
    ...eventLabels.map((event) => event.labelHeight),
  );
  const eventLaneHeight = eventBoxHeight + 8;
  const eventTimelineY =
    top +
    (!panels && !snapshot.aligned ? eventLaneHeight * state.historyLayers : 0) +
    12;
  const eventsHeight =
    panels && allEvents.length
      ? eventTimelineY - top + 70
      : !panels && !snapshot.aligned && state.historyLayers
        ? eventTimelineY - top + 12
        : 0;
  const chartTop = top + eventsHeight;
  const plotHeight = Math.max(
    state.historyEndLabels ? entries.length * 54 : 0,
    state.historyHeight *
      state.density *
      (design === "poster" ? 1.5 : design === "briefing" ? 0.7 : 1),
  );
  const panelHeight = panels
    ? state.historyHeight * 0.55 * state.density
    : plotHeight;
  const plotBottom =
    chartTop +
    (panels
      ? Math.ceil(Math.max(1, entries.length) / 2) * (panelHeight + 80)
      : plotHeight);
  const tableHeight = design === "briefing" ? 75 + entries.length * 32 : 0;
  const noteLines = state.editorNote
    ? wrapText(state.editorNote, 850, state.noteSize, font)
    : [];
  const footerTop = plotBottom + 65 + tableHeight;
  const method =
    snapshot.methodLabel ||
    (["trend","both"].includes(state.mode) && snapshot.smoothingDays <= 14
      ? l(
          "Ohne zeitliche Glättung · 14-Tage-Stützstellen",
          "No time smoothing · 14-day support points",
          "Sin suavizado temporal · puntos cada 14 días",
        )
      : ["trend","both"].includes(state.mode)
        ? l(
            `Trend · Glättung ±${snapshot.smoothingDays} Tage`,
            `Trend · smoothing ±${snapshot.smoothingDays} days`,
            `Tendencia · suavizado ±${snapshot.smoothingDays} días`,
          )
        : l(
              "Berechnete Mittelwerte ausgewählter Institute",
              "Calculated averages of selected pollsters",
              "Medias calculadas de los institutos seleccionados",
            ));
  const institutes = (snapshot.selectedPollsters || [])
    .map(
      (id) => snapshot.pollsters?.[id]?.name || snapshot.pollsters?.[id] || id,
    )
    .join(" · ");
  const footer = layoutHistoryFooter([
    {kind:"method",text:method,fontSize:16},
    {kind:"methodNote",text:snapshot.methodNote || (difference
      ? l("Basis: erster vorhandener Reihenwert je Partei, nicht die letzte Wahl.","Base: first available series value per party, not the previous election.","Base: primer valor disponible de cada partido, no las elecciones anteriores.")
      : l("Je Institut neueste Umfrage innerhalb von 45 Tagen, gleich gewichtet.","Latest poll per institute within 45 days, equally weighted.","Última encuesta por instituto en 45 días, con igual ponderación."))},
    {kind:"institutes",text:`${l("Institute", "Pollsters", "Institutos")}: ${institutes}`},
    {kind:"source",text:`${snapshot.kind === "approval" ? snapshot.source : "DAWUM · dawum.de · ODbL 1.0: odbl.dawum.de"} · ${exact(snapshot.date)}`},
  ],{
    font:sourceStyle.font && sourceStyle.font !== "auto" ? studioFont(sourceStyle.font) : font,
    scale:sourceStyle.scale || 1,weight:sourceStyle.weight || 400,italic:sourceStyle.italic,
  });
  const height =
    footerTop +
    footer.height + 48 +
    noteLines.length * (state.noteSize * 1.45);
  const scaleValues = entries.flatMap((row) => [
    ...originPolls.map(p=>p.results[row.id]).filter(Number.isFinite),
    ...(latest && Number.isFinite(latest.results[row.id]) ? [latest.results[row.id]] : []),
    ...row.segments.flat().map((point) => point.value),
    ...(state.mode === "both"
      ? snapshot.averages
          .filter((p) => Number.isFinite(p.results[row.id]))
          .map((p) => p.results[row.id] - (difference ? row.base : 0))
      : []),
  ]);
  const [min, max] = historyScale(scaleValues, {
    difference,
    zero: state.historyZero || design === "focus",
    max: state.axisMax,
    reference: state.reference,
  });
  const focus =
    entries.find((row) => row.id === state.focusParty) ||
    [...entries].sort((a, b) => b.last.value - a.last.value)[0];
  const y = (v, h = plotHeight, origin = chartTop) =>
    origin + h - ((v - min) / (max - min)) * h;
  const endLabels = [...entries]
    .sort((a, b) => b.value - a.value)
    .map((row) => ({ row, at: y(row.value) }));
  endLabels.forEach(
    (label, i) =>
      (label.at = Math.max(
        label.at,
        chartTop + 18,
        i ? endLabels[i - 1].at + 54 : 0,
      )),
  );
  for (let i = endLabels.length - 1; i >= 0; i--)
    endLabels[i].at = Math.min(
      endLabels[i].at,
      i === endLabels.length - 1 ? plotBottom - 22 : endLabels[i + 1].at - 54,
    );
  const makePath = (segment, xx, yy) =>
    ((state.mode === "trend" || state.mode === "both") && state.historySmoothing !== "none"
      ? continuousSmoothPath
      : continuousLinearPath)(
      segment.map((p) => ({ x: xx(p.date), y: yy(p.value) })),
    );
  function line(row, xx, yy) {
    const mutedLine =
      (state.focusParty || design === "focus") && row.id !== focus?.id;
    return (
      <g
        data-editor-target="chart"
        key={row.id}
        data-history-party={row.id}
        data-value={row.value}
        opacity={mutedLine ? 0.3 : 1}
      >
        {row.segments.map((segment, i) => {
          const path = makePath(segment, xx, yy);
          return (
            <g key={i}>
              {state.mode !== "polls" &&
                ((design === "focus" && row.id === focus?.id) ||
                  (design === "original" && template.topic === "party")) &&
                segment.length > 1 && (
                  <path
                    d={`${path} L ${xx(segment.at(-1).date)} ${yy(Math.max(min, 0))} L ${xx(segment[0].date)} ${yy(Math.max(min, 0))} Z`}
                    fill={row.color}
                    opacity=".12"
                  />
                )}
              {design === "original" && state.mode !== "polls" && (
                <path
                  d={path}
                  fill="none"
                  stroke={bg}
                  strokeWidth={state.historyLineWidth + 5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {design === "neon" && state.mode !== "polls" && (
                <path
                  d={path}
                  fill="none"
                  stroke={row.color}
                  strokeWidth={state.historyLineWidth + 9}
                  opacity=".14"
                />
              )}
              {state.mode !== "polls" && (
                <path
                  d={path}
                  fill="none"
                  stroke={row.color}
                  strokeWidth={state.historyLineWidth}
                  strokeDasharray={
                    print || state.monochrome
                      ? patterns[row.index % patterns.length]
                      : undefined
                  }
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {(state.mode === "polls" || segment.length === 1) &&
                segment.map((p) => (
                  <circle
                    key={p.date}
                    cx={xx(p.date)}
                    cy={yy(p.value)}
                    r={state.historyPointSize}
                    fill={row.color}
                  />
                ))}
            </g>
          );
        })}
        {state.mode === "both" &&
          (snapshot.averages || [])
            .filter((p) => Number.isFinite(p.results[row.id]))
            .map((p) => (
              <circle
                key={p.date}
                cx={xx(p.date)}
                cy={yy(p.results[row.id] - (difference ? row.base : 0))}
                r={state.historyPointSize}
                fill={row.color}
                opacity=".45"
              />
            ))}
      </g>
    );
  }
  const step =
    [1, 2, 5, 10, 20, 25].find((step) => (max - min) / step <= 8) || 25;
  const ticks = Array.from(
    { length: Math.floor((max - min) / step) + 1 },
    (_, i) => min + step * i,
  );
  const eventColor = (event) =>
    ({
      germany: dark ? "#b79ae1" : "#7755a4",
      europe: dark ? "#79afe2" : "#245f9b",
      global: dark ? "#7fc7b4" : "#357867",
      custom: dark ? "#d2b6ef" : "#7755a4",
      national: muted,
    })[event.category] || muted;
  return (
    <StudioSvg
      state={state}
      forwardedRef={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 960 ${height}`}
      width="960"
      height={height}
      textRendering="geometricPrecision"
      className="studio-current-art studio-history-design"
      data-hidden-events={hiddenEvents.map((e) => e.id).join(",")}
      data-labelled-events={eventLabels.map((e) => e.id).join(",")}
      data-event-candidates={state.workspace === "edit" ? JSON.stringify(measuredCandidates) : undefined}
      data-event-start={snapshot.start}
      data-event-end={snapshot.end}
      data-event-left={left}
      data-event-right={right}
      role="img"
      aria-label={`${title}. ${method}. ${snapshot.aligned ? l("Monate seit Amtsantritt", "Months since taking office", "Meses desde la toma de posesión") : `${snapshot.start} – ${snapshot.end}`}`}
      data-history-design={design}
      data-axis-min={min}
      data-axis-max={max}
    >
      <defs>
        <clipPath id={`history-clip-${id}`}>
          <rect
            width="960"
            height={height}
            rx={state.cornerRadius ?? (state.edges === "sharp" ? 0 : 24)}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#history-clip-${id})`} fontFamily={font} fill={ink}>
        <rect
          data-editor-target="image"
          width="960"
          height={height}
          fill={bg}
        />
        {backgroundImage && (
          <>
            <image
              href={backgroundImage}
              width="960"
              height={height}
              preserveAspectRatio={
                state.imageFit === "contain"
                  ? "xMidYMid meet"
                  : "xMidYMid slice"
              }
            />
            <rect
              width="960"
              height={height}
              fill={bg}
              opacity={state.imageOverlay}
            />
          </>
        )}
        {design === "poster" && (
          <rect width="14" height={height} fill={focus?.color || "#3863db"} />
        )}
        {design === "news" && (
          <path d="M48 55 H912" stroke={ink} strokeWidth="4" />
        )}
        <text x="48" y="36" fontSize="16" fontWeight="700" letterSpacing="2">
          POLLFRAME
        </text>
        <text x="912" y="36" textAnchor="end" fontSize="14" fill={muted}>
          DE ·{" "}
          {snapshot.kind === "approval"
            ? l("Politbarometer", "Politbarometer", "Politbarometer")
            : studioRegionName(state.region,state.lang)}
        </text>
        {titleLines.map((text, i) => (
          <text
            data-editor-target="text"
            key={i}
            x={textX(state.titleAlign)}
            y={titleBaseline + i * titleSize * state.titleLeading}
            textAnchor={textAnchor(state.titleAlign)}
            fontWeight={state.titleWeight}
            fontSize={titleSize}
          >
            {text}
          </text>
        ))}
        {state.subtitle &&
          subtitle.map((text, i) => (
            <text
              data-editor-target="subtitle"
              key={i}
              x={textX(state.subtitleAlign)}
              textAnchor={textAnchor(state.subtitleAlign)}
              y={subtitleBaseline + i * subtitleStep}
              fontSize={state.subtitleSize}
              fill={muted}
            >
              {text}
            </text>
          ))}
        <text x="48" y={headerBottom + 20} fontSize="17" fill={muted}>
          {snapshot.aligned
            ? l(
                "Monate seit Amtsantritt · tatsächliche Messzeitpunkte",
                "Months since taking office · actual observation dates",
                "Meses desde la toma de posesión · fechas reales de medición",
              )
            : `${exact(snapshot.start)} – ${exact(snapshot.end)}`}
        </text>
        {state.historyLegend &&
          entries.map((row, i) => (
            <g
              key={row.id}
              data-editor-target="legend"
              data-legend-id={row.id}
              data-layout-width="214"
              data-layout-height={legendStep-4}
              transform={`translate(${48 + (i % 4) * 222},${headerBottom + 48 + Math.floor(i / 4) * legendStep})`}
            >
              <path
                d="M0 0 H22"
                stroke={row.color}
                strokeWidth="3"
                strokeDasharray={
                  print || state.monochrome
                    ? patterns[row.index % 6]
                    : undefined
                }
              />
              {wrapText(row.name, 188, state.historyLabelSize, font).map(
                (line, j) => (
                  <text
                    key={j}
                    x="30"
                    data-text-width="184"
                    y={6 + j * (state.historyLabelSize + 4)}
                    fontSize={state.historyLabelSize}
                  >
                    {line}
                  </text>
                ),
              )}
            </g>
          ))}
        {latestLegendLines.map((text, i) => <text key={i} data-editor-target="output" x="48" y={headerBottom+56+legendHeight+i*20} fontSize="15" fill={muted}>{text}</text>)}
        {state.workspace === "edit" && !panels && !snapshot.aligned && Array.from({length:state.historyLayers}, (_, lane) => <rect key={`layer-${lane}`} data-preview-only="true" data-event-layer={lane} data-layer-top={top} data-layer-step={eventLaneHeight} x={left} y={top+lane*eventLaneHeight} width={right-left} height={eventLaneHeight} fill="transparent" />)}
        {eventLabels.map((event) => (
          <g
            key={event.id}
            data-editor-target="events"
            data-event-id={event.id}
            data-event-lane={event.lane}
            data-event-center={event.labelCenter}
            className={`event-marker event-${event.category}`}
            style={{ color: eventColor(event), "--surface": bg }}
          >
            <EventMarkerGlyph
              event={event}
              labelY={top + event.lane * eventLaneHeight}
              height={eventBoxHeight}
              bottom={plotBottom}
              hitTop={chartTop}
              color={eventColor(event)}
              background={bg}
              lineStyle={state.historyEventStyle}
            />
            <title>
              {event.label} · {exact(event.date)} ·{" "}
              {event.description ? `${event.description} · ` : ""}{event.source || event.url || ""}
            </title>
          </g>
        ))}
        {state.workspace === "edit" && hiddenEvents.map(event => <g key={`dot-${event.id}`} data-preview-only="true" data-editor-target="events" data-event-id={event.id}>
          <circle cx={x(event.date)} cy={plotBottom-5} r="12" fill="transparent"/>
          <circle cx={x(event.date)} cy={plotBottom-5} r="4" fill={bg} stroke={eventColor(event)} strokeWidth="2"/>
          <title>{event.label} · {event.date}</title>
        </g>)}
        {panels && allEvents.length > 0 && (
          <g>
            <path d={`M${left} ${eventTimelineY}H${right}`} stroke={grid} />
            {allEvents
              .filter((e) => e.election)
              .map((event) => (
                <g key={event.id} data-election-id={event.id}>
                  <path
                    d={`M${x(event.date)} ${eventTimelineY - 10}v20`}
                    stroke={muted}
                    strokeWidth="2"
                  />
                  <text
                    x={x(event.date)}
                    y={eventTimelineY + 28}
                    textAnchor="middle"
                    fontSize="13"
                    fill={muted}
                  >
                    {l("Wahl", "Election", "Elección")} {event.date.slice(2, 4)}
                  </text>
                </g>
              ))}
          </g>
        )}
        {!panels && (
          <>
            {ticks.map((v) => (
              <g key={v}>
                {state.showGrid && (
                  <path
                    d={`M${left} ${y(v)}H${right}`}
                    stroke={grid}
                    strokeDasharray="3 5"
                  />
                )}
                <text
                  x={left - 12}
                  y={y(v) + 5}
                  textAnchor="end"
                  fill={muted}
                  fontSize={state.historyLabelSize}
                >
                  {value(v)}
                </text>
              </g>
            ))}
            <text x={left} y={chartTop - 12} fontSize="15" fill={muted}>
              {difference
                ? l(
                    "Nettobewertung · Prozentpunkte",
                    "Net rating · percentage points",
                    "Valoración neta · puntos porcentuales",
                  )
                : "%"}
            </text>
            {min > 0 && (
              <text
                x={right}
                y={chartTop - 12}
                textAnchor="end"
                fontSize="14"
                fill={muted}
              >
                {l("Verkürzte Skala", "Truncated scale", "Escala recortada")}
              </text>
            )}
            {(difference || state.reference > 0) && (
              <path
                data-reference={difference ? 0 : state.reference}
                d={`M${left} ${y(difference ? 0 : state.reference)}H${right}`}
                stroke={ink}
                strokeWidth="1.5"
                strokeDasharray="7 4"
              />
            )}
            {allEvents
              .filter((e) => e.election)
              .map((event) => (
                <g key={event.id} data-election-id={event.id}>
                  <path
                    d={`M${x(event.date)} ${chartTop}V${plotBottom}`}
                    stroke={muted}
                    strokeWidth="1.8"
                  />
                  <title>
                    {event.label} · {exact(event.date)}
                  </title>
                </g>
              ))}
            {entries.map((row) => line(row, x, (v) => y(v)))}
            {(snapshot.terms || [])
              .filter((term) => term.actualStart >= snapshot.start)
              .map((term) => {
                const point = points.find((p) =>
                  Number.isFinite(p.results[term.id]),
                );
                return point ? (
                  <g key={term.id}>
                    <path
                      d={`M${x(point.date)} ${y(point.results[term.id]) - 10}v20`}
                      stroke={ink}
                      strokeWidth="4"
                    />
                    <title>
                      {term.label} · {term.actualStart}
                    </title>
                  </g>
                ) : null;
              })}
            {originPolls.flatMap((poll,i)=>entries.filter(row=>Number.isFinite(poll.results[row.id])).map(row=><circle key={`origin-${i}-${row.id}`} className="studio-origin-poll" data-poll-date={poll.date} data-pollster={poll.pollster} cx={x(poll.date)} cy={y(poll.results[row.id])} r="3.5" fill={bg} stroke={row.color} strokeWidth="1.5" tabIndex={svgRef?0:undefined} aria-label={`${row.name}: ${poll.results[row.id]}% · ${snapshot.pollsters[poll.pollster]} · ${poll.date}`}><title>{row.name}: {poll.results[row.id]}% · {snapshot.pollsters[poll.pollster]} · {poll.date}{poll.fieldwork ? ` · ${poll.fieldwork.join(' – ')}` : ''}</title></circle>))}
            {latest && !originPolls.length && entries.filter(row=>Number.isFinite(latest.results[row.id])).map(row=><circle key={`latest-${row.id}`} className="studio-latest-poll" cx={x(latest.date)} cy={y(latest.results[row.id])} r="5" fill={bg} stroke={row.color} strokeWidth="2"><title>{row.name} · {latest.institute} · {latest.date}: {latest.results[row.id]}%</title></circle>)}
            {state.historyEndLabels &&
              endLabels.map(({ row, at }) => (
                <g key={row.id}>
                  <circle
                    cx={x(row.last.date)}
                    cy={y(row.value)}
                    r="4"
                    fill={row.color}
                  />
                  <text
                    x={right + 16}
                    y={at - 6}
                    fontSize={Math.min(state.historyLabelSize, 17)}
                    fill={row.color}
                  >
                    {row.name}
                  </text>
                  <text
                    x={right + 16}
                    y={at + 22}
                    fontSize={state.historyLabelSize}
                    fontWeight="700"
                    fill={row.color}
                  >
                    {value(row.value)}
                    {difference ? " pp" : "%"}
                  </text>
                  <path
                    d={`M${x(row.last.date) + 6} ${y(row.value)} L${right + 9} ${at}`}
                    fill="none"
                    stroke={row.color}
                    opacity=".45"
                  />
                </g>
              ))}
          </>
        )}
        {panels &&
          entries.map((row, i) => {
            const ox = 48 + (i % 2) * 450,
              oy = chartTop + Math.floor(i / 2) * (panelHeight + 80),
              xx = (d) => ox + 44 + ((x(d) - left) / plotWidth) * 350,
              yy = (v) => y(v, panelHeight, oy);
            return (
              <g key={row.id}>
                <text
                  x={ox + 44}
                  y={oy - 16}
                  fontSize="20"
                  fontWeight="700"
                  fill={row.color}
                >
                  {row.name}
                  {state.historyEndLabels
                    ? ` · ${value(row.last.value)}${difference ? " pp" : "%"}`
                    : ""}
                </text>
                {[min, (min + max) / 2, max].map((v) => (
                  <g key={v}>
                    <text
                      x={ox + 34}
                      y={yy(v) + 5}
                      textAnchor="end"
                      fontSize={state.historyLabelSize - 2}
                      fill={muted}
                    >
                      {value(v)}
                    </text>
                    {state.showGrid && (
                      <path d={`M${ox + 44} ${yy(v)}h350`} stroke={grid} />
                    )}
                  </g>
                ))}
                {line(row, xx, yy)}
                {latest && Number.isFinite(latest.results[row.id]) && <circle className="studio-latest-poll" cx={xx(latest.date)} cy={yy(latest.results[row.id])} r="5" fill={bg} stroke={row.color} strokeWidth="2"><title>{latest.institute} · {latest.date}: {latest.results[row.id]}%</title></circle>}
                <text
                  x={ox + 44}
                  y={oy + panelHeight + 24}
                  fontSize={state.historyLabelSize - 2}
                  fill={muted}
                >
                  {date(snapshot.start)}
                </text>
                <text
                  x={ox + 394}
                  y={oy + panelHeight + 24}
                  textAnchor="end"
                  fontSize={state.historyLabelSize - 2}
                  fill={muted}
                >
                  {date(snapshot.end)}
                </text>
              </g>
            );
          })}
        {!panels &&
          Array.from({ length: 4 }, (_, i) => {
            const d = new Date(
              Date.parse(snapshot.start) +
                ((Date.parse(snapshot.end) - Date.parse(snapshot.start)) * i) /
                  3,
            ).toISOString();
            return (
              <text
                key={i}
                x={left + (plotWidth * i) / 3}
                y={plotBottom + 32}
                fontSize="17"
                textAnchor={i === 0 ? "start" : i === 3 ? "end" : "middle"}
                fill={muted}
              >
                {date(d)}
              </text>
            );
          })}
        {!panels &&
          allEvents
            .filter((e) => e.election)
            .map((event) => (
              <text
                key={event.id}
                x={Math.max(left + 30, Math.min(right - 30, x(event.date)))}
                y={plotBottom + 52}
                textAnchor="middle"
                fontSize="13"
                fill={muted}
              >
                {l("Wahl", "Election", "Elección")} {event.date.slice(2, 4)}
              </text>
            ))}
        {!entries.length && (
          <text x="480" y={chartTop + 100} textAnchor="middle" fontSize="24">
            {l(
              "Keine Parteien mit Daten ausgewählt",
              "No parties with data selected",
              "No hay partidos con datos seleccionados",
            )}
          </text>
        )}
        {design === "briefing" && (
          <g transform={`translate(48,${plotBottom + 76})`}>
            <text fontSize="16" fontWeight="700">
              {l(
                "Reihe / erster und letzter Wert / Veränderung",
                "Series / first and last value / change",
                "Serie / primer y último valor / cambio",
              )}
            </text>
            {entries.map((row, i) => (
              <g key={row.id} transform={`translate(0,${32 + i * 32})`}>
                <text fontSize="18">{row.name}</text>
                <text x="420" fontSize="18">
                  {value(row.first.value)}
                  {difference ? " pp" : "%"}
                </text>
                <text x="580" fontSize="18">
                  {value(row.last.value)}
                  {difference ? " pp" : "%"}
                </text>
                <text x="750" fontSize="18">
                  {value(row.last.value - row.first.value)} pp
                </text>
              </g>
            ))}
          </g>
        )}
        <path d={`M48 ${footerTop}H912`} stroke={grid} />
        <g data-editor-target="output" data-history-footer="true" fill={muted}>
          {footer.lines.map((line,i)=>{
            const label=<text x="48" y={footerTop+line.y} fontSize={line.fontSize}
              data-text-width="864" data-source-block={line.kind}>{line.text}</text>;
            return line.kind === "source"
              ? <a key={i} href={svgRef ? snapshot.sourceUrl : undefined} target="_blank" rel="noreferrer">{label}</a>
              : <React.Fragment key={i}>{label}</React.Fragment>;
          })}
        </g>
        {noteLines.map((text, i) => (
          <text
            data-editor-target="note"
            key={i}
            x={textX(state.noteAlign)}
            textAnchor={textAnchor(state.noteAlign)}
            y={
              footerTop +
              footer.height + state.noteSize * 1.45 +
              i * (state.noteSize * 1.45)
            }
            fontSize={state.noteSize}
          >
            {text}
          </text>
        ))}
      </g>
    </StudioSvg>
  );
});
