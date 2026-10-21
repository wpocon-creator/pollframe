import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "./pollframe-ui.jsx";
import { MATCH_COPY } from "./party-match-copy.js";
import { MATCH_PARTIES } from "./party-match-data.js";
import { localText } from "./party-match-text.js";
import {
  getResultDraft,
  clearResultDraft,
  setResultDraft,
} from "./party-match-storage.js";
import {
  normalizeMatchDesign,
  matchDesignSvg,
  matchThemeDark,
  renderMatchSvg,
} from "./party-match-design.js";
import { MatchExport } from "./party-match-export.jsx";
import PrivateResults from "./party-match-library.jsx";
import PersonalControls from "./party-match-studio-controls.jsx";
import ResultSave from "./party-match-save.jsx";
import "./party-match.css";
import "./graphic-studio.css";
import { useStudioEditorDevice } from "./studio-editor-session.js";

export default function ResultStudio({ Header }) {
  const editorAllowed = useStudioEditorDevice();
  const [draft, setDraft] = useState(getResultDraft),
    [design, setDesign] = useState(() =>
      normalizeMatchDesign(getResultDraft()?.design),
    );
  const [modal, setModal] = useState(null),
    [editing, setEditing] = useState(false),
    [fontPreview, setFontPreview] = useState(null),
    [fontError, setFontError] = useState(false),
    [saved, setSaved] = useState(false),
    [savedId, setSavedId] = useState(draft?.savedId),
    [name, setName] = useState(draft?.savedName || "");
  useEffect(() => {
    const clear = () => {
      setDraft(null);
      setModal(null);
      setSavedId(null);
    };
    window.addEventListener("studio-private-draft-cleared", clear);
    return () =>
      window.removeEventListener("studio-private-draft-cleared", clear);
  }, []);
  const [locale, setLocale] = useState(() => {
    const value =
      draft?.document.locale ||
      new URLSearchParams(location.search).get("lang") ||
      "de";
    return ["de", "es", "en-GB", "en-US"].includes(value) ? value : "de";
  });
  const c = (k) => localText(MATCH_COPY[k], locale),
    l = (v) => localText(v, locale),
    s = (de, en, es) => (locale === "de" ? de : locale === "es" ? es : en);
  const update = (patch) => {
    setDesign((old) => {
      const next = { ...old, ...patch };
      if (["topics", "duel"].includes(next.graphic) && next.party === "none")
        next.party = draft.document.rows[0].slug;
      if (next.graphic === "duel" && next.other === next.party)
        next.other = MATCH_PARTIES.find((p) => p.slug !== next.party).slug;
      return normalizeMatchDesign(next);
    });
    setSaved(false);
  };
  const preview = useMemo(
    () =>
      draft ? matchDesignSvg({ ...draft.document, locale }, design) : null,
    [draft, design, locale],
  );
  useEffect(() => {
    let alive = true;
    setFontPreview(null);
    setFontError(false);
    if (draft)
      renderMatchSvg({ ...draft.document, locale }, design)
        .then((value) => {
          if (alive) setFontPreview(value.svg);
        })
        .catch(() => {
          if (alive) setFontError(true);
        });
    return () => {
      alive = false;
    };
  }, [draft, design, locale]);
  useEffect(() => {
    if (draft)
      setResultDraft({ ...draft.document, locale }, design, savedId, name);
  }, [draft, design, savedId, name, locale]);
  useEffect(() => {
    const previous = document.title;
    document.title = `${c("resultStudio")} · Pollframe Studio`;
    const clear = () => {
      clearResultDraft();
      setDraft(null);
    };
    const restore = (e) => {
      if (e.persisted) clear();
    };
    const open = () => {
      const next = getResultDraft();
      setDraft(next);
      setDesign(normalizeMatchDesign(next?.design));
      setSavedId(next?.savedId);
      setName(next?.savedName || "");
      setModal(null);
      setSaved(false);
    };
    window.addEventListener("pagehide", clear);
    window.addEventListener("pageshow", restore);
    window.addEventListener("popstate", open);
    return () => {
      document.title = previous;
      window.removeEventListener("pagehide", clear);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("popstate", open);
    };
  }, []);
  const navigate = (url) => {
    history.pushState(null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  return (
    <div className="party-match-page pm-result-studio">
      {Header && <Header locale={locale} setLocale={setLocale} />}
      <main className="party-match">
        <nav className="pm-view-heading">
          <a
            className="pm-text-button"
            href={`/?view=studio&topic=personal&lang=${locale}`}
            onClick={(e) => {
              if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
                return;
              e.preventDefault();
              navigate(`/?view=studio&topic=personal&lang=${locale}`);
            }}
          >
            <span aria-hidden="true">←</span> Studio
          </a>
          {draft && !draft.savedId && (
            <button
              className="pm-text-button"
              onClick={() => navigate(`/?view=party-match&lang=${locale}`)}
            >
              {c("backToResult")}
            </button>
          )}
          <h1>{c("resultStudio")}</h1>
          {draft && (
            <div className="pm-actions">
              {editorAllowed && (
                <button
                  className="pm-secondary pm-studio-entry"
                  aria-pressed={editing}
                  onClick={() => setEditing(!editing)}
                >
                  {editing
                    ? s("Vorschau", "Preview", "Vista previa")
                    : s("Bearbeiten", "Edit", "Editar")}
                </button>
              )}
              <ResultSave
                documentRecord={{ ...draft.document, locale }}
                design={design}
                locale={locale}
                id={savedId}
                name={name}
                onSaved={(row) => {
                  setSavedId(row.id);
                  setSaved(true);
                  setName(row.name);
                }}
              />
              <button className="pm-primary" onClick={() => setModal("export")}>
                <Icon name="download" />
                {c("export")}
              </button>
            </div>
          )}
        </nav>
        {!draft ? (
          <>
            <p>{c("noDraft")}</p>
            <a
              className="pm-primary"
              href={`/?view=party-match&lang=${locale}`}
            >
              {c("name")}
            </a>
            <PrivateResults locale={locale} />
          </>
        ) : (
          <>
            <p className="pm-small">{c("lockedResult")}</p>
            {fontError && (
              <p role="alert">
                {s(
                  "Die gewählte Schrift konnte nicht geladen werden. Prüfe, ob eine importierte Schrift auf diesem Gerät noch verfügbar ist, oder wähle eine Bibliotheksschrift.",
                  "The chosen typeface could not be loaded. Check that an imported typeface is still available on this device, or choose a library typeface.",
                  "No se pudo cargar la fuente elegida. Comprueba que la fuente importada sigue disponible en este dispositivo o elige una de la biblioteca.",
                )}
              </p>
            )}
            {saved && <p role="status">{c("savedPrivate")}</p>}
            <div
              className={`pm-studio-layout${editing && editorAllowed ? " is-editing" : " is-preview"}`}
            >
              <div className="pm-studio-preview">
                <img
                  alt={c("resultsTitle")}
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(fontPreview || preview.svg)}`}
                />
              </div>
              {editing && editorAllowed && (
                <aside
                  className="pm-studio-editor"
                  aria-label={c("resultStudio")}
                >
                  <PersonalControls
                    doc={draft.document}
                    design={design}
                    update={update}
                    locale={locale}
                    c={c}
                    l={l}
                  />
                  <button
                    className="pm-text-button"
                    onClick={() =>
                      update(
                        normalizeMatchDesign({
                          graphic: design.graphic,
                          style: design.style,
                          party: design.party,
                          other: design.other,
                          dark: matchThemeDark(),
                        }),
                      )
                    }
                  >
                    {c("resetStyle")}
                  </button>
                </aside>
              )}
            </div>
          </>
        )}
      </main>
      {modal === "export" && draft && (
        <MatchExport
          document={{ ...draft.document, locale }}
          design={design}
          locale={locale}
          c={c}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
