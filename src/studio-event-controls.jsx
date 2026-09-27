import React, { useEffect, useMemo, useState } from "react";
import StudioRange from "./studio-range.jsx";
import EventDialog from "./studio-event-dialog.jsx";
import ResourceDialog from "./studio-resource-dialog.jsx";
import { studioEvents } from "./studio-events.js";
import { eventIds } from "./studio-event-selection.js";
import StudioSelect from "./studio-select.jsx";
import EventLayers from "./studio-event-layers.jsx";
import {
  eventLayout,
  parseEventLanes,
  parseEventNumbers,
} from "./studio-event-layout.js";
import { searchEvents } from "./studio-event-search.js";

export default function EventControls({
  state,
  snapshot,
  template,
  change,
  l,
  selectedEventId,
  session,
}) {
  const [catalogue, setCatalogue] = useState(false),
    [query, setQuery] = useState("");
  const [includeOutside, setIncludeOutside] = useState(true);
  const [sort, setSort] = useState("time"),
    [densityLayer, setDensityLayer] = useState(0);
  const [editing, setEditing] = useState(null),
    [display, setDisplay] = useState({ labels: [], hidden: [] });
  useEffect(() => {
    let frame;
    const read = () => {
      const svg = document.querySelector(".studio-current-preview-image svg");
      const next = {
        labels: [...eventIds(svg?.dataset.labelledEvents)],
        hidden: [...eventIds(svg?.dataset.hiddenEvents)],
      };
      setDisplay((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(read);
    };
    schedule();
    // Font loading can repack labels without changing the editor settings.
    const observer = new MutationObserver(schedule);
    const preview = document.querySelector(".studio-current-preview-image");
    if (preview)
      observer.observe(preview, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["data-labelled-events", "data-hidden-events"],
      });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [snapshot]);
  const all = useMemo(() => studioEvents(snapshot, state).sort((a, b) =>
    a.date.localeCompare(b.date)), [snapshot, state.country, state.lang, state.historyCustomEvents]);
  if (["panels", "aligned"].includes(template.design))
    return (
      <p>
        {l(
          "Dieses Design hat keine gemeinsame Zeitachse für Ereignisse.",
          "This design has no shared calendar axis for events.",
          "Este diseño no tiene un eje temporal común para acontecimientos.",
        )}
      </p>
    );
  const categories = eventIds(
    state.events ?? (snapshot.categories || []).map((c) => c.id).join(","),
  );
  const pinned = eventIds(state.historyEventPinned),
    excluded = eventIds(state.historyEventExcluded);
  const manual = state.historyEventIds != null,
    selected = eventIds(state.historyEventIds);
  const lanes = parseEventLanes(state.historyEventLanes);
  const layerDensity = parseEventNumbers(state.historyLayerDensity, 0, 16);
  const currentLayer = Math.min(
    densityLayer,
    Math.max(0, state.historyLayers - 1),
  );
  const inRange = (e) => e.date >= snapshot.start && e.date <= snapshot.end;
  const active = (e) => e.custom || categories.has(e.category);
  const rangeCount = all.filter(
    (e) => inRange(e) && active(e) && !e.election && !excluded.has(e.id),
  ).length;
  const unavailable = all.filter(
    (e) =>
      (pinned.has(e.id) || (manual && selected.has(e.id))) &&
      inRange(e) &&
      active(e) &&
      display.hidden.includes(e.id),
  );
  const setDecision = (event, value) => {
    const p = new Set(pinned),
      x = new Set(excluded),
      s = new Set(selected);
    p.delete(event.id);
    x.delete(event.id);
    s.delete(event.id);
    if (value === "pin") {
      p.add(event.id);
      s.add(event.id);
    }
    if (value === "exclude") x.add(event.id);
    change({
      ...(value === "pin" && !event.custom && !categories.has(event.category)
        ? { events: [...categories, event.category].join(",") }
        : {}),
      historyEventPinned: [...p].join(","),
      historyEventExcluded: [...x].join(","),
      ...(manual ? { historyEventIds: [...s].join(",") } : {}),
    });
  };
  // One geometry read per render, one packing check per event/layer. Previously
  // each option parsed the complete SVG catalogue and ran packing twice.
  const svg = document.querySelector(".studio-current-preview-image svg");
  let measured;
  const blockedLanes = new Map();
  const blockedLane = (event, lane) => {
    if (!svg || !inRange(event)) return false;
    const key = `${event.id}:${lane}`;
    if (blockedLanes.has(key)) return blockedLanes.get(key);
    try { measured ??= JSON.parse(svg.dataset.eventCandidates || "[]"); }
    catch { return false; }
    const candidate = measured.find(e => e.id === event.id);
    if (!candidate) return false;
    const left = Number(svg.dataset.eventLeft), right = Number(svg.dataset.eventRight);
    const start = Date.parse(snapshot.start), span = Math.max(1, Date.parse(snapshot.end) - start);
    const x = date => left + (Date.parse(date) - start) / span * (right - left);
    const otherPins = measured.filter(e => e.id !== event.id && pinned.has(e.id));
    const result = eventLayout([...otherPins, { ...candidate, forced: true }], {
      x,
      left,
      right,
      layers: state.historyLayers,
      lanes: { ...lanes, [event.id]: lane },
      positions: parseEventNumbers(state.historyEventPositions),
    });
    const blocked = (
      !result.visible.some((e) => e.id === event.id) ||
      result.hidden.some((e) => pinned.has(e.id))
    );
    blockedLanes.set(key, blocked);
    return blocked;
  };
  const row = (e) => {
    const decision = excluded.has(e.id)
      ? "exclude"
      : pinned.has(e.id) || (manual && selected.has(e.id))
        ? "pin"
        : manual
          ? "exclude"
          : "auto";
    const status = !inRange(e)
      ? l("Außerhalb des Zeitraums", "Outside the period", "Fuera del periodo")
      : !active(e)
        ? l(
            "Kategorie ausgeschaltet",
            "Category disabled",
            "Categoría desactivada",
          )
        : decision === "exclude"
          ? l("Ausgeschlossen", "Excluded", "Excluido")
          : display.labels.includes(e.id)
            ? decision === "pin"
              ? l(
                  "Angeheftet · immer bevorzugt",
                  "Pinned · always prioritised",
                  "Fijado · siempre prioritario",
                )
              : l(
                  "Automatisch in dieser Anordnung",
                  "Automatic in this layout",
                  "Automático en esta disposición",
                )
            : display.hidden.includes(e.id)
              ? state.historyLayers === 0
                ? l(
                    "Nur Markierung · Ebenen ausgeschaltet",
                    "Marker only · layers disabled",
                    "Solo marcador · capas desactivadas",
                  )
                : decision === "pin"
                  ? l(
                      "Platzkonflikt · andere Ebene wählen",
                      "Placement conflict · choose another layer",
                      "Conflicto de espacio · elige otra capa",
                    )
                  : l(
                      "Nur Markierung · Platz oder Dichtebegrenzung",
                      "Marker only · space or density limit",
                      "Solo marcador · límite de espacio o densidad",
                    )
              : e.election
                ? l("Wahllinie", "Election line", "Línea electoral")
                : l(
                    "Nicht automatisch ausgewählt",
                    "Not selected automatically",
                    "No seleccionado automáticamente",
                  );
    return (
      <div
        key={e.id}
        data-catalogue-event={e.id}
        className={`studio-event-row ${e.id === selectedEventId ? "is-selected" : ""}`}
      >
        <label className="studio-event-check">
          <input
            type="checkbox"
            checked={decision === "pin"}
            aria-label={`${l("Anheften", "Pin", "Fijar")}: ${e.label}`}
            onChange={(ev) =>
              setDecision(e, ev.target.checked ? "pin" : "auto")
            }
          />
          <span>
            <strong>{e.label}</strong>
            <small>
              {e.date} · {status}
            </small>
          </span>
        </label>
        <div className="studio-event-actions">
          <button
            type="button"
            className="text-button"
            onClick={() =>
              setDecision(e, decision === "exclude" ? "auto" : "exclude")
            }
          >
            {decision === "exclude"
              ? l("Zulassen", "Allow", "Permitir")
              : l("Ausschließen", "Exclude", "Excluir")}
          </button>
          {!e.election && decision !== "exclude" && (
            <StudioSelect
              aria-label={`${l("Ebene für", "Layer for", "Capa de")} ${e.label}`}
              value={lanes[e.id] < state.historyLayers ? lanes[e.id] : ""}
              onChange={(ev) => {
                const next = { ...lanes };
                if (ev.target.value === "") delete next[e.id];
                else next[e.id] = Number(ev.target.value);
                change({
                  historyEventLanes: JSON.stringify(next),
                  historyEventPinned: [...new Set([...pinned, e.id])].join(","),
                });
              }}
            >
              <option value="">
                {l("Ebene automatisch", "Automatic layer", "Capa automática")}
              </option>
              {Array.from({ length: state.historyLayers }, (_, i) => (
                <option key={i} value={i} disabled={blockedLane(e, i)}>
                  {l("Ebene", "Layer", "Capa")} {i + 1}
                  {blockedLane(e, i)
                    ? ` · ${l("belegt", "occupied", "ocupada")}`
                    : ""}
                </option>
              ))}
            </StudioSelect>
          )}
          {e.custom && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setCatalogue(false);
                setEditing(e);
              }}
            >
              {l("Bearbeiten", "Edit", "Editar")}
            </button>
          )}
        </div>
      </div>
    );
  };
  return (
    <section className="studio-event-controls">
      <div className="studio-event-categories">
        {(snapshot.categories || []).map((c) => (
          <label key={c.id}>
            <input
              type="checkbox"
              checked={categories.has(c.id)}
              onChange={() => {
                const next = new Set(categories);
                next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                change({ events: [...next].join(",") });
              }}
            />
            {state.lang === "de"
              ? c.de
              : state.lang === "es"
                ? {
                    national: "Elecciones",
                    germany: "Alemania",
                    europe: "Europa",
                    global: "Mundo",
                  }[c.id] || c.en
                : c.en}
          </label>
        ))}
      </div>
      {rangeCount < 2 && (
        <p className="studio-event-range-note" role="status">
          {l(
            "Für diesen Zeitraum und diese Kategorien gibt es nur wenige Ereignisse. Mehr Ebenen erzeugen keine zusätzlichen Daten.",
            "This period and these categories contain few events. More layers do not create additional data.",
            "Este periodo y estas categorías contienen pocos acontecimientos. Más capas no generan datos nuevos.",
          )}
          <button
            type="button"
            className="text-button"
            onClick={() => change({ range: "five", start: "", end: "" })}
          >
            {l("Fünf Jahre ansehen", "Show five years", "Ver cinco años")}
          </button>
        </p>
      )}
      <label>
        {l("Dichte für Ebene", "Density for layer", "Densidad de la capa")}
        <StudioSelect
          value={currentLayer}
          disabled={!state.historyLayers}
          onChange={(e) => setDensityLayer(Number(e.target.value))}
        >
          {Array.from({ length: state.historyLayers }, (_, i) => (
            <option key={i} value={i}>
              {l("Ebene", "Layer", "Capa")} {i + 1}
            </option>
          ))}
        </StudioSelect>
      </label>
      <label>
        {l("Beschriftungsdichte", "Label density", "Densidad de etiquetas")}
        <StudioRange
          hideNumber
          disabled={!state.historyLayers}
          session={session}
          aria-label={l(
            "Ereignisdichte",
            "Event density",
            "Densidad de acontecimientos",
          )}
          type="range"
          min="0"
          max="16"
          value={layerDensity[currentLayer] ?? state.historyEventLimit}
          onChange={(e) =>
            change({
              historyLayerDensity: JSON.stringify({
                ...layerDensity,
                [currentLayer]: Number(e.target.value),
              }),
            })
          }
        />
      </label>
      <EventLayers
        value={state.historyLayers}
        onChange={(historyLayers) => change({ historyLayers })}
        l={l}
      />
      <button
        type="button"
        className="primary-button"
        disabled={!state.historyLayers}
        onClick={() =>
          change({
            historyEventIds: null,
            historySeedRemoved: "",
            historyEventSeed: ((state.historyEventSeed || 0) % 2147483647) + 1,
          })
        }
      >
        {l("Anordnung erzeugen", "Generate layout", "Generar disposición")}
      </button>
      <small aria-live="polite">
        {manual &&
          l(
            "Manuelle Auswahl. Anordnung erzeugen ergänzt wieder automatisch passende Ereignisse. ",
            "Manual selection. Generate layout restores automatic filling around your choices. ",
            "Selección manual. Generar disposición vuelve a completar los espacios automáticamente. ",
          )}
        {l("Variante", "Variation", "Variante")} {state.historyEventSeed || 0} ·{" "}
        {rangeCount}{" "}
        {l(
          "Ereignisse im Zeitraum",
          "events in this period",
          "acontecimientos en este periodo",
        )}
        .{" "}
        {l(
          "Wichtige und angeheftete Ereignisse haben Vorrang. Gleiche Variante, gleiche Anordnung; ohne Platzkonflikte bleibt sie unverändert.",
          "Important and pinned events take priority. The same variation gives the same layout; without conflicts it stays unchanged.",
          "Los acontecimientos importantes y fijados tienen prioridad. La misma variante da la misma disposición; sin conflictos, no cambia.",
        )}
      </small>
      <small>
        {l(
          "Die Dichte begrenzt die automatische Auswahl; angeheftete Ereignisse haben Vorrang. Ohne Ebenen erscheinen keine Beschriftungen. Wahlen werden separat über ihre Kategorie gesteuert.",
          "Density limits automatic labels; pinned events take priority. Zero layers hides labels. Elections are controlled separately by their category.",
          "La densidad limita las etiquetas automáticas; las fijadas tienen prioridad. Sin capas no hay etiquetas. Las elecciones se controlan por su categoría.",
        )}
      </small>
      {unavailable.length > 0 && (
        <p role="status">
          {l(
            "Nicht alle angehefteten Beschriftungen passen:",
            "Some pinned labels do not fit:",
            "No caben todas las etiquetas fijadas:",
          )}{" "}
          {unavailable.map((e) => e.label).join(", ")}
        </p>
      )}
      <button
        type="button"
        className="secondary-button"
        onClick={() => setCatalogue(true)}
      >
        {l("Ereignisse auswählen", "Choose events", "Elegir acontecimientos")} ·{" "}
        {display.labels.length} {l("beschriftet", "labelled", "con etiqueta")}
      </button>
      {selectedEventId && all.filter((e) => e.id === selectedEventId).map(row)}
      {catalogue && (
        <ResourceDialog
          className="studio-event-catalogue"
          title={l(
            "Ereignisse auswählen",
            "Choose events",
            "Elegir acontecimientos",
          )}
          l={l}
          onClose={() => setCatalogue(false)}
          footer={
            <button
              type="button"
              className="primary-button"
              onClick={() => setCatalogue(false)}
            >
              {l("Fertig", "Done", "Listo")}
            </button>
          }
          wide
        >
          <div className="studio-catalogue-toolbar">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setCatalogue(false);
                setEditing({});
              }}
            >
              {l(
                "+ Eigenes Ereignis",
                "+ Custom event",
                "+ Acontecimiento propio",
              )}
            </button>
            <label>
              {l("Sortieren", "Sort", "Ordenar")}
              <StudioSelect
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="time">
                  {l(
                    "Datum aufsteigend",
                    "Oldest first",
                    "Más antiguos primero",
                  )}
                </option>
                <option value="recent">
                  {l("Neuste zuerst", "Newest first", "Más recientes primero")}
                </option>
                <option value="name">A–Z</option>
                <option value="pinned">
                  {l("Angeheftete zuerst", "Pinned first", "Fijados primero")}
                </option>
              </StudioSelect>
            </label>
          </div>
          <label>
            {l("Auswahl", "Selection", "Selección")}
            <StudioSelect
              value={manual ? "manual" : "auto"}
              onChange={(e) =>
                change({
                  historyEventIds:
                    e.target.value === "manual"
                      ? [
                          ...new Set([
                            ...display.labels,
                            ...all
                              .filter(
                                (e) =>
                                  e.election &&
                                  inRange(e) &&
                                  active(e) &&
                                  !excluded.has(e.id),
                              )
                              .map((e) => e.id),
                          ]),
                        ].join(",")
                      : null,
                })
              }
            >
              <option value="auto">
                {l(
                  "Automatisch mit meinen Vorgaben",
                  "Automatic with my choices",
                  "Automática con mis preferencias",
                )}
              </option>
              <option value="manual">
                {l(
                  "Nur meine Auswahl",
                  "Only my selection",
                  "Solo mi selección",
                )}
              </option>
            </StudioSelect>
          </label>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            aria-label={l(
              "Ereignis suchen",
              "Search events",
              "Buscar acontecimientos",
            )}
            placeholder={l(
              "Krieg, Corona, Energie, Jahr…",
              "War, pandemic, energy, year…",
              "Guerra, pandemia, energía, año…",
            )}
          />
          <p className="studio-catalogue-explanation">
            {l(
              "Häkchen heften Ereignisse an. Automatische Beschriftungen sind separat markiert. Ereignisse außerhalb des Zeitraums werden nicht eingezeichnet.",
              "Tick to pin an event. Automatic labels are marked separately. Events outside the period are not drawn.",
              "Marca para fijar un acontecimiento. Las etiquetas automáticas se indican aparte. No se dibujan acontecimientos fuera del periodo.",
            )}
          </p>
          <label className="studio-event-outside-toggle">
            <input
              type="checkbox"
              checked={includeOutside}
              onChange={(event) => setIncludeOutside(event.target.checked)}
            />
            {l(
              "Auch Ereignisse außerhalb des Zeitraums zeigen",
              "Also show events outside this period",
              "Mostrar también acontecimientos fuera del periodo",
            )}
          </label>
          {searchEvents(all, query)
            .filter((e) => includeOutside || inRange(e))
            .sort((a, b) =>
              sort === "name"
                ? a.label.localeCompare(b.label, state.lang)
                : sort === "pinned"
                  ? Number(pinned.has(b.id)) - Number(pinned.has(a.id)) ||
                    a.date.localeCompare(b.date)
                  : (sort === "recent" ? -1 : 1) * a.date.localeCompare(b.date),
            )
            .map(row)}
          {!searchEvents(all, query).some(
            (e) => includeOutside || inRange(e),
          ) && (
            <p role="status">
              {l(
                "Keine passenden Ereignisse.",
                "No matching events.",
                "No hay acontecimientos que coincidan.",
              )}
            </p>
          )}
        </ResourceDialog>
      )}
      {editing && (
        <EventDialog
          event={editing.id ? editing : null}
          state={state}
          snapshot={snapshot}
          change={change}
          onClose={() => {
            setEditing(null);
            setCatalogue(true);
          }}
          l={l}
        />
      )}
    </section>
  );
}
