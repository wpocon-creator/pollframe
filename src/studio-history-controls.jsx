import StudioRange from "./studio-range.jsx";
import StudioSelect from "./studio-select.jsx";
import React, {lazy,Suspense} from "react";
const StudioDateRange=lazy(()=>import("./studio-date-range.jsx"));
import SmoothingControl from "./studio-smoothing-control.jsx";
export default function HistoryControls({
  state,
  snapshot,
  template,
  change,
  l,
  section = "data",
}) {
  const approval = snapshot.kind === "approval",
    net = snapshot.unit === "pp";
  const institutes = Array.isArray(snapshot?.pollsters)
    ? snapshot.pollsters
    : Object.entries(snapshot?.pollsters || {}).map(([id, p]) => ({
        id,
        ...(typeof p === "object" ? p : { name: p }),
      }));
  return (
    <>
      {section === "data" && (
        <>
          {snapshot.aligned && (
            <fieldset>
              <legend>{l("Amtszeiten", "Terms in office", "Mandatos")}</legend>
              {snapshot.availableTerms.map((term) => (
                <label key={term.id}>
                  <input
                    type="checkbox"
                    checked={
                      state.approvalTerms === null ||
                      state.approvalTerms.split(",").includes(term.id)
                    }
                    onChange={(e) => {
                      const selected =
                        state.approvalTerms === null
                          ? snapshot.availableTerms.map((t) => t.id)
                          : state.approvalTerms.split(",");
                      change({
                        approvalTerms: (e.target.checked
                          ? [...selected, term.id]
                          : selected.filter((id) => id !== term.id)
                        ).join(","),
                      });
                    }}
                  />
                  {term.name}
                  <small>
                    {term.start} –{" "}
                    {term.end || l("heute", "present", "actualidad")}
                  </small>
                </label>
              ))}
              <p>
                {l(
                  "Für Regierungsbewertungen sind Daten ab Merkel IV vorhanden.",
                  "Government ratings are available from Merkel IV onwards.",
                  "Hay valoraciones de gobiernos desde Merkel IV.",
                )}
              </p>
            </fieldset>
          )}
          {!snapshot.aligned && (
            <label>
              {l("Zeitraum", "Time range", "Periodo")}
              <StudioSelect
                value={state.range}
                onChange={(e) =>
                  change(
                    e.target.value === "custom"
                      ? {
                          range: "custom",
                          start: state.start || snapshot?.start,
                          end: state.end || snapshot?.end,
                        }
                      : { range: e.target.value },
                  )
                }
              >
                {[
                  ["month", "1 Monat", "1 month", "1 mes"],
                  ["three", "3 Monate", "3 months", "3 meses"],
                  ["six", "6 Monate", "6 months", "6 meses"],
                  ["ytd", "Seit Jahresbeginn", "Year to date", "Desde enero"],
                  ["year", "1 Jahr", "1 year", "1 año"],
                  ["two", "2 Jahre", "2 years", "2 años"],
                  ["five", "5 Jahre", "5 years", "5 años"],
                  ["ten", "10 Jahre", "10 years", "10 años"],
                  [
                    "election",
                    "Seit der letzten Wahl",
                    "Since the last election",
                    "Desde las últimas elecciones",
                  ],
                  [
                    "all",
                    "Gesamter Verlauf",
                    "Full archive",
                    "Todo el historial",
                  ],
                  [
                    "custom",
                    "Eigener Zeitraum",
                    "Custom dates",
                    "Fechas personalizadas",
                  ],
                ]
                  .filter(
                    ([id]) =>
                      template.topic !== "party" ||
                      !["custom", "election", "ten", "all"].includes(id),
                  )
                  .map(([id, ...words]) => (
                    <option key={id} value={id}>
                      {l(...words)}
                    </option>
                  ))}
              </StudioSelect>
            </label>
          )}
          {!snapshot.aligned && state.range === "custom" && (
            <Suspense fallback={<p>…</p>}>
            <StudioDateRange
              state={state}
              snapshot={snapshot}
              change={change}
              l={l}
            />
            </Suspense>
          )}
        </>
      )}
      {section === "chart" && (
        <>
          <label>
            {l("Reihendarstellung", "Series display", "Representación")}
            <StudioSelect
              value={state.mode}
              onChange={(e) => change({ mode: e.target.value })}
            >
              <option value="trend">
                {l(
                  "Geglätteter Trend",
                  "Smoothed trend",
                  "Tendencia suavizada",
                )}
              </option>
              <option value="linear">
                {approval
                  ? l(
                      "Verbundene Messungen",
                      "Connected readings",
                      "Mediciones conectadas",
                    )
                  : l(
                      "Verbundene Mittelwerte",
                      "Connected averages",
                      "Medias conectadas",
                    )}
              </option>
              <option value="polls">
                {approval
                  ? l(
                      "Einzelmessungen als Punkte",
                      "Individual readings",
                      "Mediciones individuales",
                    )
                  : l(
                      "Mittelwerte als Punkte",
                      "Average points",
                      "Puntos de medias",
                    )}
              </option>
              <option value="both">
                {approval
                  ? l(
                      "Trend und Einzelmessungen",
                      "Trend and individual readings",
                      "Tendencia y mediciones individuales",
                    )
                  : l(
                      "Trend und Mittelwertpunkte",
                      "Trend and average points",
                      "Tendencia y puntos de medias",
                    )}
              </option>
            </StudioSelect>
          </label>
          <SmoothingControl
            state={state}
            snapshot={snapshot}
            change={change}
            l={l}
          />
          {state.mode !== "polls" && (
            <label>
              {l("Linienbreite", "Line width", "Grosor de líneas")} ·{" "}
              {state.historyLineWidth}
              <StudioRange
                type="range"
                min="1"
                max="7"
                step=".5"
                value={state.historyLineWidth}
                onChange={(e) =>
                  change({ historyLineWidth: Number(e.target.value) })
                }
              />
            </label>
          )}
          {["both", "polls"].includes(state.mode) && (
            <label>
              {l("Punktgröße", "Point size", "Tamaño de puntos")}
              <StudioRange
                type="range"
                min="1"
                max="5"
                step=".5"
                value={state.historyPointSize}
                onChange={(e) =>
                  change({ historyPointSize: Number(e.target.value) })
                }
              />
            </label>
          )}
          <label>
            {l("Diagrammhöhe", "Chart height", "Altura de la gráfica")}
            <StudioRange
              type="range"
              min="280"
              max="660"
              step="20"
              value={state.historyHeight}
              onChange={(e) =>
                change({ historyHeight: Number(e.target.value) })
              }
            />
          </label>
          <label>
            {l("Beschriftungsgröße", "Label size", "Tamaño de etiquetas")}
            <StudioRange
              type="range"
              min="15"
              max="22"
              value={state.historyLabelSize}
              onChange={(e) =>
                change({ historyLabelSize: Number(e.target.value) })
              }
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.historyLegend}
              onChange={(e) => change({ historyLegend: e.target.checked })}
            />
            {approval
              ? l(
                  "Legende der Amtszeiten",
                  "Term legend",
                  "Leyenda de mandatos",
                )
              : l("Parteienlegende", "Party legend", "Leyenda de partidos")}
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.historyEndLabels}
              onChange={(e) => change({ historyEndLabels: e.target.checked })}
            />
            {l(
              "Endwerte anzeigen",
              "Show end values",
              "Mostrar valores finales",
            )}
          </label>
          {!net && template.design !== "focus" && (
            <label>
              <input
                type="checkbox"
                checked={state.historyZero}
                onChange={(e) => change({ historyZero: e.target.checked })}
              />
              {l(
                "Prozentskala ab null",
                "Percentage scale from zero",
                "Escala porcentual desde cero",
              )}
            </label>
          )}
          {!net && (
            <label>
              {l("Skalenende", "Scale maximum", "Máximo de la escala")}
              <StudioSelect
                value={state.axisMax}
                onChange={(e) => change({ axisMax: Number(e.target.value) })}
              >
                <option value="0">
                  {l("Automatisch", "Automatic", "Automático")}
                </option>
                {[30, 40, 50, 75, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}%
                  </option>
                ))}
              </StudioSelect>
              <small>
                {l(
                  "Die Skala wird bei höheren Datenwerten automatisch erweitert.",
                  "Higher data values automatically expand the scale.",
                  "Los valores superiores amplían automáticamente la escala.",
                )}
              </small>
            </label>
          )}
          {!net && template.design !== "panels" && (
            <label>
              {l(
                "Referenzlinie (%) · 0 = aus",
                "Reference line (%) · 0 = off",
                "Línea de referencia (%) · 0 = desactivada",
              )}
              <input
                type="number"
                min="0"
                max="100"
                value={state.reference}
                onChange={(e) => change({ reference: Number(e.target.value) })}
              />
            </label>
          )}
          <small>
            {l(
              "Automatisch verkürzte Skalen werden gekennzeichnet. Nettobewertungen verwenden eine symmetrische Prozentpunkte-Skala; Fokus eine Nullbasis.",
              "Automatically truncated scales are labelled. Net ratings use symmetric percentage points; focus starts at zero.",
              "Las escalas recortadas se indican. La valoración neta usa puntos porcentuales simétricos; el enfoque empieza en cero.",
            )}
          </small>
        </>
      )}
      {section === "data" && approval && (
        <details>
          <summary>{l("Institute", "Pollsters", "Institutos")}</summary>
          {institutes.map((p) => {
            const ids =
              state.pollsters === null
                ? snapshot.selectedPollsters
                : state.pollsters.split(",");
            return (
              <label key={p.id}>
                <input
                  type="checkbox"
                  checked={ids.includes(String(p.id))}
                  disabled={ids.length === 1 && ids.includes(String(p.id))}
                  onChange={(e) =>
                    change({
                      pollsters: (e.target.checked
                        ? [...ids, String(p.id)]
                        : ids.filter((id) => id !== String(p.id))
                      ).join(","),
                    })
                  }
                />
                {p.name || p.id}
              </label>
            );
          })}
        </details>
      )}
    </>
  );
}
