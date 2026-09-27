import { studioCapabilities } from "./studio-capabilities.js";
import StudioRange from "./studio-range.jsx";
import { elementStyles } from "./studio-elements.js";
import StudioSelect from "./studio-select.jsx";
import EventLayers from "./studio-event-layers.jsx";
import "./studio-workspace.css";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import StudioFontButton from "./studio-font-picker.jsx";
const keys = { text: "headline", subtitle: "subtitle", note: "editorNote" };
const alignKeys = {
  text: "titleAlign",
  subtitle: "subtitleAlign",
  note: "noteAlign",
};
const sizeKeys = {
  text: "titleSize",
  subtitle: "subtitleSize",
  note: "noteSize",
};

export function ContextToolbar({
  state,
  selection,
  template,
  update,
  l,
  elementControl,
  session,
}) {
  const capabilities = studioCapabilities(template),
    timeline = capabilities.timeline;
  const target = selection.target,
    editable = Boolean(keys[target]),
    size = sizeKeys[target];
  return (
    <div
      className="studio-context-toolbar"
      aria-label={l("Auswahl bearbeiten", "Edit selection", "Editar selección")}
    >
      <strong>
        {l("Auswahl", "Selection", "Selección")}:{" "}
        {{
          text: l("Titel", "Title", "Título"),
          subtitle: l("Unterzeile", "Subtitle", "Subtítulo"),
          note: l("Anmerkung", "Note", "Nota"),
          events: l("Ereignisse", "Events", "Acontecimientos"),
          chart: l("Diagramm", "Chart", "Gráfica"),
          image: l("Hintergrund", "Background", "Fondo"),
          output: l(
            "Quelle (geschützt)",
            "Source (protected)",
            "Fuente (protegida)",
          ),
        }[target] || l("Gestaltung", "Styling", "Estilo")}
      </strong>
      {target === "element" ? (
        <>
          <span>
            {selection.label ||
              `${selection.count || 0} ${l("Elemente", "items", "elementos")}`}
          </span>
          {selection.editable ? (
            <label>
              {l("Größe", "Size", "Tamaño")}
              <StudioRange
                aria-label={l(
                  "Auswahlgröße",
                  "Selection size",
                  "Tamaño de selección",
                )}
                min={70}
                max={160}
                value={Math.round(
                  (elementStyles(state.elementStyles)[selection.ids?.[0]]
                    ?.scale || 1) * 100,
                )}
                onStart={() => elementControl?.({ start: true })}
                onChange={(e) =>
                  elementControl?.({
                    changes: { scale: Number(e.target.value) / 100 },
                  })
                }
                onCommit={() => elementControl?.({ end: true })}
              />
            </label>
          ) : (
            <span>
              {l(
                "Geschützt · kann ausgewählt, aber nicht verändert werden.",
                "Protected · selectable, but not editable.",
                "Protegido · seleccionable, no editable.",
              )}
            </span>
          )}
        </>
      ) : editable ? (
        <>
          <StudioFontButton
            value={state.font}
            onChange={(font) => update({ font })}
            l={l}
          />
          <label>
            {l("Größe", "Size", "Tamaño")}
            <StudioRange
              session={session}
              aria-label={l("Schriftgröße", "Font size", "Tamaño de letra")}
              type="range"
              min={target === "text" ? 24 : target === "subtitle" ? 18 : 16}
              max={target === "text" ? 64 : target === "subtitle" ? 30 : 24}
              value={state[size]}
              onChange={(e) => update({ [size]: Number(e.target.value) })}
            />
            <output>{state[size]}</output>
          </label>
          <div className="studio-choice">
            {[
              ["left", l("Links", "Left", "Izquierda")],
              ["center", l("Mitte", "Centre", "Centro")],
              ["right", l("Rechts", "Right", "Derecha")],
            ].map(([id, name]) => (
              <button
                key={id}
                aria-pressed={state[alignKeys[target]] === id}
                onClick={() => update({ [alignKeys[target]]: id })}
              >
                {name}
              </button>
            ))}
          </div>
        </>
      ) : target === "events" ? (
        <>
          <EventLayers value={state.historyLayers} onChange={historyLayers => update({historyLayers})} l={l} />
          <button
            type="button"
            className="secondary-button"
            disabled={state.historyLayers >= 4}
            onClick={() => update({ historyLayers: state.historyLayers + 1 })}
          >
            {l("+ Ebene", "+ Layer", "+ Capa")}
          </button>
        </>
      ) : target === "chart" ? (
        <>
          {capabilities.timeline && (
            <label>
              {l("Linienbreite", "Line width", "Grosor de línea")}
              <StudioRange
                min={1}
                max={7}
                step={0.5}
                value={state.historyLineWidth}
                onChange={(e) =>
                  update({ historyLineWidth: Number(e.target.value) })
                }
              />
            </label>
          )}
          {capabilities.bars && (
            <label>
              {l("Balkendicke", "Bar thickness", "Grosor de barras")}
              <StudioRange
                min={0.5}
                max={1.6}
                step={0.1}
                value={state.barScale}
                onChange={(e) => update({ barScale: Number(e.target.value) })}
              />
            </label>
          )}
          {capabilities.grid && (
            <label>
              <input
                type="checkbox"
                checked={state.showGrid}
                onChange={(e) => update({ showGrid: e.target.checked })}
              />
              {l("Hilfslinien", "Gridlines", "Cuadrícula")}
            </label>
          )}
        </>
      ) : target === "image" ? (
        <label>
          {l("Hintergrundfarbe", "Background colour", "Color de fondo")}
          <input
            type="color"
            value={
              state.background ||
              (state.theme === "dark" ? "#101d2c" : "#ffffff")
            }
            onChange={(e) => update({ background: e.target.value })}
          />
        </label>
      ) : (
        <span>
          {target === "output"
            ? l(
                "Werte und Quellen können nicht verändert werden.",
                "Values and sources cannot be changed.",
                "Los valores y las fuentes no se pueden modificar.",
              )
            : l(
                "Details findest du rechts in den Werkzeugen.",
                "Detailed controls are on the right.",
                "Los controles detallados están a la derecha.",
              )}
        </span>
      )}
    </div>
  );
}
