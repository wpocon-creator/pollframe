import "./studio-workspace.css";
import { WAHLFRAME_UI_ENABLED } from './wahlframe-feature.js';
import React, { lazy, Suspense, useEffect, useState } from "react";
import { listDesigns, deleteDesign, saveDesign } from "./studio-library.js";
import { listStyles, deleteStyle, saveStyle } from "./studio-style-library.js";
import { parseStyle } from "./studio-editor-files.js";
const StyleActions = lazy(() => import("./studio-style-actions.jsx"));
const PrivateResults = WAHLFRAME_UI_ENABLED
  ? lazy(() => import("./party-match-library.jsx"))
  : null;
import StyleWizard from "./studio-style-wizard.jsx";
import { CurrentDesign } from "./studio-current.jsx";
import {
  normalizeStudioState,
  STUDIO_TEMPLATES,
  isPausedStudioRequest,
} from "./studio-model.js";
export default function Library({
  open,
  l,
  state,
  snapshot,
  renderTemplate,
  initialStyleId,
}) {
  const [styleAction, setStyleAction] = useState(null);
  const [tab, setTab] = useState(initialStyleId ? "styles" : "designs"),
    [styles, setStyles] = useState([]),
    [styleEdit, setStyleEdit] = useState(null);
  const stylePreview = (style) =>
    snapshot ? (
      <CurrentDesign
        snapshot={snapshot}
        state={normalizeStudioState({
          lang: state.lang,
          ...style,
          subtitle: l(
            "Gestaltung für deine nächste Veröffentlichung",
            "A style for your next publication",
            "Un estilo para tu próxima publicación",
          ),
          editorNote: l(
            "Beispiel einer redaktionellen Anmerkung",
            "Example editorial note",
            "Ejemplo de nota editorial",
          ),
          template: "poll-classic",
        })}
        template={STUDIO_TEMPLATES.find((t) => t.id === "poll-classic")}
      />
    ) : (
      <p>
        {l(
          "Vorschau wird geladen…",
          "Loading preview…",
          "Cargando vista previa…",
        )}
      </p>
    );
  useEffect(() => {
    let active = true;
    const refresh = () =>
      listStyles()
        .then((items) => {
          if (active) setStyles(items);
        })
        .catch(() => {
          if (active) setError(true);
        });
    refresh();
    if (initialStyleId)
      listStyles()
        .then((items) => {
          if (active)
            setStyleEdit(
              items.find((item) => item.id === initialStyleId) || null,
            );
        })
        .catch(() => {});
    window.addEventListener("studio-styles-change", refresh);
    const accountChange = () => {
      setStyles([]);
      setStyleAction(null);
      setStyleEdit(null);
      refresh();
    };
    window.addEventListener("pollframe-account-changed", accountChange);
    return () => {
      active = false;
      window.removeEventListener("studio-styles-change", refresh);
      window.removeEventListener("pollframe-account-changed", accountChange);
    };
  }, []);
  const [items, setItems] = useState([]),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      listDesigns()
        .then((v) => {
          if (active)
            setItems(v.filter((item) => !isPausedStudioRequest(item.state)));
        })
        .catch(() => setError(true));
    refresh();
    window.addEventListener("studio-library-change", refresh);
    const accountChange = () => {
      setItems([]);
      refresh();
    };
    window.addEventListener("pollframe-account-changed", accountChange);
    return () => {
      active = false;
      window.removeEventListener("studio-library-change", refresh);
      window.removeEventListener("pollframe-account-changed", accountChange);
    };
  }, []);
  return (
    <section className="studio-library">
      <h2>{l("Meine Designs", "My designs", "Mis diseños")}</h2>
      <nav
        className="studio-editor-tabs"
        aria-label={l("Bibliothek", "Library", "Biblioteca")}
      >
        <button
          aria-pressed={tab === "designs"}
          onClick={() => setTab("designs")}
        >
          {l("Designs", "Designs", "Diseños")}
        </button>
        <button
          aria-pressed={tab === "styles"}
          onClick={() => setTab("styles")}
        >
          {l("Stile", "Styles", "Estilos")}
        </button>
      </nav>
      {error && tab === "styles" && (
        <p role="alert">
          {l(
            "Zum Speichern brauchst du ein Konto und eine Verbindung. Bitte melde dich an und versuche es erneut.",
            "Saving requires an account and a connection. Please sign in and try again.",
            "Necesitas una cuenta y conexión para guardar. Accede e inténtalo de nuevo.",
          )}
        </p>
      )}
      {tab === "styles" ? (
        <>
          <div className="studio-library-actions">
            <button
              className="secondary-button"
              onClick={() => setStyleEdit({})}
            >
              {l(
                "+ Neuen Stil erstellen",
                "+ Create a style",
                "+ Crear un estilo",
              )}
            </button>
            <label className="secondary-button studio-style-import">
              {l("Stil importieren", "Import style", "Importar estilo")}
              <input
                hidden
                type="file"
                accept=".pollframe-style,.json,application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    if (file.size > 20000) throw Error("size");
                    const text = await file.text(),
                      style = parseStyle(text),
                      doc = JSON.parse(text);
                    await saveStyle(
                      String(
                        doc.name ||
                          file.name.replace(/\.(pollframe-style|json)$/i, ""),
                      )
                        .replace(/[<>\u0000-\u001f]/g, "")
                        .slice(0, 80),
                      style,
                    );
                    setError(false);
                  } catch {
                    setError(true);
                  }
                }}
              />
            </label>
          </div>
          <p>
            {l(
              "Ein Stil ist deine Gestaltung für verschiedene Grafiken. Die Vorschau zeigt die aktuelle Bundestagsumfrage. Gespeicherte Stile gehören zu deinem Konto.",
              "A style is your visual identity across charts. Previews show current Bundestag polling. Saved styles belong to your account.",
              "Un estilo define el aspecto de varias gráficas. Las vistas previas muestran la encuesta actual del Bundestag. Los estilos guardados pertenecen a tu cuenta.",
            )}
          </p>
          <div className="studio-library-grid">
            {styles.map((item) => (
              <article key={item.id}>
                <button
                  className="studio-saved-preview"
                  onClick={() => setStyleAction(item)}
                >
                  {stylePreview(item.style)}
                  <strong>{item.name}</strong>
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    if (
                      confirm(
                        l(
                          "Diesen Stil löschen?",
                          "Delete this style?",
                          "¿Eliminar este estilo?",
                        ),
                      )
                    )
                      deleteStyle(item.id).catch(() => setError(true));
                  }}
                >
                  {l("Löschen", "Delete", "Eliminar")}
                </button>
              </article>
            ))}
          </div>
          {styleEdit && (
            <StyleWizard
              l={l}
              state={state}
              item={styleEdit.id ? styleEdit : null}
              onClose={() => setStyleEdit(null)}
              preview={stylePreview}
            />
          )}
          {styleAction && (
            <Suspense fallback={null}>
              <StyleActions
                item={styleAction}
                state={state}
                l={l}
                renderTemplate={renderTemplate}
                onClose={() => setStyleAction(null)}
                onEdit={() => {
                  setStyleEdit(styleAction);
                  setStyleAction(null);
                }}
                onSaved={() => setTab("designs")}
              />
            </Suspense>
          )}
        </>
      ) : (
        <>
          {PrivateResults && (
            <Suspense fallback={null}>
              <PrivateResults locale={state.lang} />
            </Suspense>
          )}
          <p>
            {l(
              "Mit deinem Konto auf deinen Geräten verfügbar. Importierte Bild- und Schriftdateien bleiben auf dem jeweiligen Gerät. Umfragevorlagen verwenden beim Öffnen aktuelle Daten.",
              "Available across your devices through your account. Imported images and font files stay on the respective device. Polling templates use current data when opened.",
              "Disponible en tus dispositivos mediante tu cuenta. Las imágenes y fuentes importadas permanecen en cada dispositivo. Las plantillas usan datos actuales al abrirse.",
            )}
          </p>
          {error && (
            <p role="alert">
              {l(
                "Der lokale Speicher ist nicht verfügbar.",
                "Local storage is unavailable.",
                "El almacenamiento local no está disponible.",
              )}
            </p>
          )}
          {!items.length && !error && (
            <p>
              {l(
                "Speichere dein erstes Design im Editor.",
                "Save your first design in the editor.",
                "Guarda tu primer diseño en el editor.",
              )}
            </p>
          )}
          <div className="studio-library-grid">
            {items.map((item) => (
              <article key={item.id}>
                <button
                  className="studio-saved-preview"
                  onClick={() => open(item)}
                >
                  {item.thumbnail?.startsWith("data:image/") && (
                    <img src={item.thumbnail} alt="" />
                  )}
                  {!item.thumbnail &&
                    renderTemplate?.(
                      STUDIO_TEMPLATES.find(
                        (t) => t.id === item.state.template,
                      ) || STUDIO_TEMPLATES[0],
                      item.state,
                    )}
                  <strong>{item.name}</strong>
                </button>
                <div className="studio-choice">
                  <button
                    onClick={async () => {
                      const { saveFile } = await import(
                        "./studio-editor-files.js"
                      );
                      saveFile(
                        JSON.stringify(item, null, 2),
                        "application/json",
                        `pollframe-${item.id}.json`,
                      );
                    }}
                  >
                    {l("Sicherung", "Backup", "Copia de seguridad")}
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          l(
                            "Dieses gespeicherte Design löschen?",
                            "Delete this saved design?",
                            "¿Eliminar este diseño guardado?",
                          ),
                        )
                      )
                        deleteDesign(item.id).catch(() => setError(true));
                    }}
                  >
                    {l("Löschen", "Delete", "Eliminar")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
