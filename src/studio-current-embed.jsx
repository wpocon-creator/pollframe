import React, { useEffect, useRef, useState } from "react";
import { CurrentDesign, useCurrentSnapshot } from "./studio-current.jsx";
const HistoryDesign = React.lazy(() =>
  import("./studio-history.jsx").then((module) => ({
    default: module.HistoryDesign,
  })),
);
import { useHistorySnapshot } from "./studio-history-source.jsx";
import { normalizeStudioState, STUDIO_TEMPLATES, isPausedStudioRequest } from "./studio-model.js";
import "./graphic-studio.css";
const MapDesign = React.lazy(() =>
  import("./studio-map.jsx").then((m) => ({ default: m.MapDesign })),
);
const StatisticDesign = React.lazy(() =>
  import("./studio-statistic.jsx").then((m) => ({
    default: m.StatisticDesign,
  })),
);
import {
  useExtraSnapshot,
  useApprovalSnapshot,
} from "./studio-extra-source.jsx";
import { isTimelineTopic, partySnapshot } from "./studio-extra-model.js";
import { unsupportedStudioDataset } from "./studio-publication-policy.js";

export default function StudioCurrentEmbed() {
  const svgRef = useRef(null);
  const [paused] = useState(() => isPausedStudioRequest(Object.fromEntries(new URLSearchParams(location.search))));
  const [state] = useState(() =>
    normalizeStudioState(
      Object.fromEntries(new URLSearchParams(location.search)),
    ),
  );
  const template = paused ? null : STUDIO_TEMPLATES.find((item) => item.id === state.template);
  const current = useCurrentSnapshot(
    state,
    template?.topic === "current" && state.country === "de",
  );
  const historical = useHistorySnapshot(
    state,
    ["history", "party", "approval"].includes(template?.topic) &&
      state.country === "de",
  );
  const map = useExtraSnapshot(
    state,
    "map",
    template?.topic === "map" && state.country === "de",
  );
  const seats = useExtraSnapshot(
    state,
    "seats",
    ["seats", "majority"].includes(template?.topic) && state.country === "de",
  );
  const changes = useExtraSnapshot(
    state,
    "tendencies",
    template?.topic === "tendencies" && state.country === "de",
  );
  const approval = useApprovalSnapshot(
    state,
    ["approval", "approval-current"].includes(template?.topic) &&
      state.country === "de",
    historical.data?.eventCatalogue,
  );
  const waitsForEvents =
    template?.topic === "approval" && state.events !== "" && !historical.data;
  const snapshot =
    template?.topic === "map"
      ? map
      : template?.topic === "current"
        ? current
        : template?.topic === "history"
          ? historical
          : template?.topic === "party"
            ? { ...historical, data: partySnapshot(historical.data, state) }
            : template?.topic === "tendencies"
              ? changes
              : ["approval", "approval-current"].includes(template?.topic)
                ? approval
                : seats;
  const Design = isTimelineTopic(template?.topic)
    ? HistoryDesign
    : template?.topic === "current"
      ? CurrentDesign
      : template?.topic === "map"
        ? MapDesign
        : StatisticDesign;
  useEffect(() => {
    document.documentElement.dataset.embed = "true";
    document.documentElement.lang = state.lang;
  }, [state.lang]);
  return (
    <main className="studio-standalone-embed">
      {unsupportedStudioDataset(state) ? <p role="status">{state.lang === 'de' ? 'Studio bietet derzeit nur deutsche Wahldaten an.' : state.lang === 'es' ? 'Studio ofrece actualmente solo datos electorales de Alemania.' : 'Studio currently supports German election data only.'}</p> : paused ? <p role="status">{state.lang === "de" ? "Dieses Zustimmungsdesign ist vorübergehend nicht verfügbar." : state.lang === "es" ? "Este diseño de valoración no está disponible temporalmente." : "This approval design is temporarily unavailable."}</p> : <>
      {snapshot.frame}
      {template?.topic === "approval" && historical.frame}
      {snapshot.data && template && !waitsForEvents ? (
        <Design
          snapshot={snapshot.data}
          state={state}
          template={template}
          svgRef={svgRef}
        />
      ) : (
        <p role="status">
          {snapshot.error || !template || (waitsForEvents && historical.error)
            ? state.lang === "de"
              ? "Daten konnten nicht geladen werden. Bitte erneut versuchen."
              : state.lang === "es"
                ? "No se pudieron cargar los datos. Inténtalo de nuevo."
                : "Data could not be loaded. Please try again."
            : "Pollframe …"}
        </p>
      )}
      </>}
    </main>
  );
}
