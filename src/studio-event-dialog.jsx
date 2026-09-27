import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { customEvents } from "./studio-custom-events.js";
import StudioDateInput from "./studio-date-input.jsx";
import StudioSelect from "./studio-select.jsx";
export default function EventDialog({
  event,
  state,
  snapshot,
  change,
  onClose,
  l,
}) {
  const ref = useRef(null),
    [label, setLabel] = useState(event?.label || ""),
    [date, setDate] = useState(event?.date || ""),
    [source, setSource] = useState(event?.source || ""),
    [description, setDescription] = useState(event?.description || ""),
    [category, setCategory] = useState(event?.category || "custom"),
    [error, setError] = useState("");
  useEffect(() => {
    const before = document.activeElement;
    ref.current.showModal();
    return () => before?.focus?.();
  }, []);
  const save = (e) => {
    e.preventDefault();
    const row = {
        id: event?.id || `custom-${crypto.randomUUID()}`,
        label,
        date,
        source,
        description,
        category,
      },
      valid = customEvents([row]);
    if (!valid.length || (source && !valid[0].source)) {
      setError(
        l(
          "Bitte Titel, gültiges Datum und gegebenenfalls einen HTTPS-Quellenlink angeben.",
          "Enter a title, valid date and, optionally, an HTTPS source link.",
          "Introduce título, fecha válida y, opcionalmente, una fuente HTTPS.",
        ),
      );
      return;
    }
    const rows = customEvents(state.historyCustomEvents);
    if (!event && rows.length >= 24) {
      setError(
        l(
          "Maximal 24 eigene Ereignisse pro Design.",
          "Up to 24 custom events per design.",
          "Máximo 24 acontecimientos propios.",
        ),
      );
      return;
    }
    change({
      historyCustomEvents: JSON.stringify([
        ...rows.filter((r) => r.id !== row.id),
        valid[0],
      ]),
      ...(state.historyEventIds != null
        ? {
            historyEventIds: [
              ...new Set([
                ...state.historyEventIds.split(",").filter(Boolean),
                row.id,
              ]),
            ].join(","),
          }
        : {}),
      historyEventPinned: [
        ...new Set([
          ...(state.historyEventPinned || "").split(",").filter(Boolean),
          row.id,
        ]),
      ].join(","),
    });
    onClose();
  };
  return createPortal(
    <dialog
      ref={ref}
      className="studio-event-dialog"
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      <form onSubmit={save}>
        <header>
          <h2>
            {l("Eigenes Ereignis", "Custom event", "Acontecimiento propio")}
          </h2>
          <button
            type="button"
            className="icon-button"
            aria-label={l("Schließen", "Close", "Cerrar")}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <p>
          {l(
            "Wird sichtbar als eigene Annotation gekennzeichnet. Umfragedaten und Originalquellen bleiben unverändert.",
            "Clearly marked as a custom annotation. Polling data and original sources stay unchanged.",
            "Se identifica como anotación propia. Los datos y fuentes originales no cambian.",
          )}
        </p>
        <label>
          {l("Titel", "Title", "Título")}
          <input
            autoFocus
            required
            maxLength={100}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label>
          {l("Datum", "Date", "Fecha")}
          <StudioDateInput
            required
            value={date}
            onChange={setDate}
            label={l("Datum", "Date", "Fecha")}
          />
          <small>DD.MM.YYYY / YYYY-MM-DD</small>
        </label>
        <label>
          {l("Kategorie", "Category", "Categoría")}
          <StudioSelect
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {[
              [
                "custom",
                "Eigene Annotation",
                "Custom annotation",
                "Anotación propia",
              ],
              ["germany", "Deutschland", "Germany", "Alemania"],
              ["europe", "Europa", "Europe", "Europa"],
              ["global", "Weltweit", "Global", "Mundial"],
            ].map(([id, ...words]) => (
              <option key={id} value={id}>
                {l(...words)}
              </option>
            ))}
          </StudioSelect>
        </label>
        <label>
          {l(
            "Beschreibung für interaktive Embeds (optional)",
            "Description for interactive embeds (optional)",
            "Descripción para inserciones interactivas (opcional)",
          )}
          <textarea
            rows={3}
            maxLength={800}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        {snapshot?.start &&
          date &&
          (date < snapshot.start || date > snapshot.end) && (
            <p role="status">
              {l(
                "Dieses Datum liegt außerhalb des dargestellten Zeitraums. Das Ereignis wird gespeichert, erscheint aber erst in einem passenden Zeitraum.",
                "This date is outside the displayed period. The event will be saved, but only appears when its date is in range.",
                "Esta fecha está fuera del periodo. El acontecimiento se guardará, pero solo aparecerá al incluir su fecha.",
              )}
            </p>
          )}
        <label>
          {l(
            "Quelle (optional, HTTPS)",
            "Source (optional, HTTPS)",
            "Fuente (opcional, HTTPS)",
          )}
          <input
            type="url"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <p role="alert">{error}</p>
        <footer>
          {event && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                change({
                  historyCustomEvents: JSON.stringify(
                    customEvents(state.historyCustomEvents).filter(
                      (e) => e.id !== event.id,
                    ),
                  ),
                });
                onClose();
              }}
            >
              {l("Entfernen", "Remove", "Eliminar")}
            </button>
          )}
          <button className="primary-button" type="submit">
            {l("Speichern", "Save", "Guardar")}
          </button>
        </footer>
      </form>
    </dialog>,
    document.body,
  );
}
