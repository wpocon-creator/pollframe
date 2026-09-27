import React, { useState } from "react";
import Dialog from "./studio-resource-dialog.jsx";
import StudioSelect from "./studio-select.jsx";
import {
  STUDIO_TEMPLATES,
  normalizeStudioState,
  studioText,
} from "./studio-model.js";
import { searchTemplates } from "./studio-search.js";
import { stylePatch } from "./studio-style-model.js";
import { styleDocument, saveFile } from "./studio-editor-files.js";
import { saveDesign } from "./studio-library.js";

export default function StyleActions({
  item,
  state,
  l,
  onClose,
  onEdit,
  onSaved,
  renderTemplate,
}) {
  const [screen, setScreen] = useState("actions"),
    [query, setQuery] = useState(""),
    [topic, setTopic] = useState("all"),
    [template, setTemplate] = useState(null),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const topics = {
    all: l("Alle Grafiken", "All graphics", "Todas las gráficas"),
    current: l("Aktuelle Umfragen", "Latest polls", "Encuestas actuales"),
    history: l(
      "Historischer Verlauf",
      "Historical polling",
      "Evolución histórica",
    ),
    approval: l(
      "Zustimmungsverlauf",
      "Approval history",
      "Evolución de aprobación",
    ),
    "approval-current": l(
      "Aktuelle Zustimmung",
      "Current approval",
      "Aprobación actual",
    ),
    party: l("Einzelne Partei", "Single party", "Un partido"),
    seats: l("Sitzmodell", "Seat model", "Modelo de escaños"),
    majority: l("Mehrheiten", "Majorities", "Mayorías"),
    map: l("Karten", "Maps", "Mapas"),
    tendencies: l("Veränderungen", "Changes", "Cambios"),
  };
  const download = async () => {
    const content = JSON.stringify({
      ...styleDocument(item.style),
      name: item.name,
    });
    const file = new File(
      [content],
      `${item.name.replace(/[^\p{L}\p{N}_-]/gu, "-").slice(0, 60) || "Pollframe"}.pollframe-style`,
      { type: "application/json" },
    );
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: item.name });
        return;
      }
    } catch (e) {
      if (e.name === "AbortError") return;
    }
    saveFile(file, "application/json", file.name);
  };
  const save = async () => {
    if (busy || !name.trim()) return;
    setBusy(true);
    try {
      const record = await saveDesign(
        name,
        normalizeStudioState({
          lang: state.lang,
          template: template.id,
          ...stylePatch(item.style, template),
        }),
      );
      onSaved(record);
      onClose();
    } catch {
      setError(
        l(
          "Design konnte nicht gespeichert werden.",
          "Could not save the design.",
          "No se pudo guardar el diseño.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const customFontNotice = /custom-[a-f0-9-]{36}/.test(
    JSON.stringify(item.style),
  );
  return (
    <Dialog
      title={
        screen === "actions"
          ? item.name
          : screen === "name"
            ? l("Design speichern", "Save design", "Guardar diseño")
            : l(
                "Stil auf ein Design anwenden",
                "Apply style to a design",
                "Aplicar estilo a un diseño",
              )
      }
      l={l}
      onClose={onClose}
      wide={screen === "apply"}
      footer={
        screen === "name" ? (
          <button
            type="button"
            className="primary-button"
            disabled={busy || !name.trim()}
            onClick={save}
          >
            {l("Design speichern", "Save design", "Guardar diseño")}
          </button>
        ) : null
      }
    >
      {screen === "actions" ? (
        <div className="studio-style-action-list">
          <button
            className="studio-style-action"
            onClick={() => setScreen("apply")}
          >
            <strong>
              {l(
                "Auf ein Design anwenden",
                "Apply to a design",
                "Aplicar a un diseño",
              )}
            </strong>
            <span>
              {l(
                "Vorlage wählen und als neues Design speichern.",
                "Choose a template and save a new design.",
                "Elige una plantilla y guarda un nuevo diseño.",
              )}
            </span>
          </button>
          <button className="studio-style-action" onClick={download}>
            <strong>
              {l("Exportieren / senden", "Export / send", "Exportar / enviar")}
            </strong>
            <span>
              {l(
                "Kleine Pollframe-Stildatei zum Teilen oder Sichern.",
                "A small Pollframe style file to share or keep.",
                "Un pequeño archivo de estilo Pollframe para compartir o guardar.",
              )}
            </span>
          </button>
          <button className="studio-style-action" onClick={onEdit}>
            <strong>
              {l("Stil bearbeiten", "Edit style", "Editar estilo")}
            </strong>
            <span>
              {l(
                "Alle Stileinstellungen in der Übersicht öffnen.",
                "Open all style settings in the review.",
                "Abrir todos los ajustes del estilo.",
              )}
            </span>
          </button>
        </div>
      ) : screen === "name" ? (
        <label>
          {l("Designname", "Design name", "Nombre del diseño")}
          <input
            autoFocus
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
          />
        </label>
      ) : (
        <>
          <label>
            {l("Vorlagen durchsuchen", "Search templates", "Buscar plantillas")}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              placeholder={l(
                "Zum Beispiel modern, Verlauf",
                "For example modern, history",
                "Por ejemplo moderno, histórico",
              )}
            />
          </label>
          <StudioSelect
            aria-label={l("Grafiktyp", "Chart type", "Tipo de gráfica")}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            {Object.entries(topics).filter(([id]) => id === "all" || STUDIO_TEMPLATES.some(t => t.topic === id)).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </StudioSelect>
          <div className="studio-style-template-list">
            {searchTemplates(
              STUDIO_TEMPLATES.filter(
                (t) => topic === "all" || t.topic === topic,
              ),
              query,
            ).items.map((t) => (
              <button
                key={t.id}
                className="studio-style-card"
                onClick={() => {
                  setTemplate(t);
                  setName(
                    `${item.name} · ${studioText(t.name, state.lang)}`.slice(
                      0,
                      80,
                    ),
                  );
                  setScreen("name");
                }}
              >
                {renderTemplate?.(t, stylePatch(item.style, t))}
                <span>
                  <strong>{studioText(t.name, state.lang)}</strong>
                  <small>{topics[t.topic]}</small>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      {customFontNotice && (
        <p>
          {l(
            "Eigene Schriftdateien werden nicht mitgesendet. In der Stildatei werden sie durch die Design-Schrift ersetzt.",
            "Custom font files are not shared. The portable file uses the design’s default typeface instead.",
            "No se comparten archivos de fuentes propias. El archivo usa la tipografía predeterminada del diseño.",
          )}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </Dialog>
  );
}
