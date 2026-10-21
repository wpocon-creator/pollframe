import React, { useEffect, useState } from "react";
import "./party-match.css";
import {
  listPrivateResults,
  deletePrivateResult,
  openResultStudio,
  getResultDraft,
} from "./party-match-storage.js";
import { matchDesignSvg } from "./party-match-design.js";
import { MATCH_COPY } from "./party-match-copy.js";
import { localText } from "./party-match-text.js";
import StudioSelect from "./studio-select.jsx";
import { MATCH_GRAPHICS, searchMatchDesigns } from "./party-match-templates.js";

export default function PrivateResults({
  locale = "de",
  gallery = false,
  query = "",
}) {
  const [rows, setRows] = useState([]),
    [error, setError] = useState(false);
  const [selected, setSelected] = useState(""),
    [graphic, setGraphic] = useState("all");
  const draft = getResultDraft();
  const l = (de, en, es) => (locale === "de" ? de : locale === "es" ? es : en);
  const c = (key) => localText(MATCH_COPY[key], locale);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      listPrivateResults()
        .then((rows) => {
          if (active) setRows(rows);
        })
        .catch(() => {
          if (active) setError(true);
        });
    refresh();
    window.addEventListener("studio-private-results-change", refresh);
    const accountChange = () => {
      setRows([]);
      setSelected("");
      refresh();
    };
    window.addEventListener("pollframe-account-changed", accountChange);
    return () => {
      active = false;
      window.removeEventListener("studio-private-results-change", refresh);
      window.removeEventListener("pollframe-account-changed", accountChange);
    };
  }, []);
  const datasets = [
    ...(draft && !draft.savedId
      ? [
          {
            id: "current",
            name: l(
              "Aktuelles Ergebnis (nicht gespeichert)",
              "Current result (not saved)",
              "Resultado actual (sin guardar)",
            ),
            ...draft,
          },
        ]
      : []),
    ...rows,
  ];
  const normalize = (s) =>
    String(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  const named =
    query.trim().length >= 3
      ? datasets.find((d) =>
          normalize(d.name).includes(normalize(query.trim())),
        )
      : null;
  const active =
    named || datasets.find((d) => d.id === selected) || datasets[0];
  const visibleGraphic =
    active?.document.round && graphic === "spectrum"
      ? "all"
      : active?.document.insights || graphic === "ranking"
        ? graphic
        : "all";
  if (gallery) {
    const search = (named ? "" : query)
      .replace(
        /\b(meine|mein|my|mis|polls|umfragen|ergebnisse|results|resultados|wahlframe|parteifinder|personlich|personal)\b/gi,
        "",
      )
      .trim();
    const choices = searchMatchDesigns(search, visibleGraphic).filter(
      (d) =>
        (d.graphic === "ranking" || active?.document.insights) &&
        (!active?.document.round || d.graphic !== "spectrum"),
    );
    return (
      <section className="pm-private-gallery pm-private-library">
        <header>
          <h2>
            {l(
              "Meine Ergebnisse gestalten",
              "Design my results",
              "Diseñar mis resultados",
            )}
          </h2>
          <p className="pm-small">
            {l(
              "Deine persönlichen Vergleiche – keine Bevölkerungsumfragen. Gespeicherte Ergebnisse gehören zu deinem Konto.",
              "Your personal comparisons—not public opinion polls. Saved results belong to your account.",
              "Tus comparaciones personales, no sondeos de opinión. Los resultados guardados pertenecen a tu cuenta.",
            )}
          </p>
        </header>
        {error && (
          <p role="alert">
            {l(
              "Der lokale Speicher ist nicht verfügbar.",
              "Local storage is unavailable.",
              "El almacenamiento local no está disponible.",
            )}
          </p>
        )}
        {!active ? (
          <div className="pm-private-empty">
            <p>
              {l(
                "Hier erscheinen ausdrücklich gespeicherte Ergebnisse und dein noch geöffnetes Ergebnis aus Wahlframe.",
                "Explicitly saved results and your currently open Wahlframe result appear here.",
                "Aquí aparecen los resultados guardados expresamente y el resultado abierto de Wahlframe.",
              )}
            </p>
            <a
              className="pm-secondary"
              href={`/?view=party-match&lang=${locale}`}
            >
              {l("Wahlframe öffnen", "Open Wahlframe", "Abrir Wahlframe")}
            </a>
          </div>
        ) : (
          <>
            <div className="pm-private-controls">
              <label>
                {l("Ergebnis auswählen", "Choose result", "Elegir resultado")}
                <StudioSelect
                  aria-label={l(
                    "Ergebnis auswählen",
                    "Choose result",
                    "Elegir resultado",
                  )}
                  value={active.id}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {datasets.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </StudioSelect>
              </label>
              <label>
                {l("Grafiktyp", "Graphic type", "Tipo de gráfica")}
                <StudioSelect
                  aria-label={l(
                    "Persönlicher Grafiktyp",
                    "Personal graphic type",
                    "Tipo de gráfica personal",
                  )}
                  value={visibleGraphic}
                  onChange={(e) => setGraphic(e.target.value)}
                >
                  <option value="all">
                    {l("Alle Grafiken", "All graphics", "Todas las gráficas")}
                  </option>
                  {MATCH_GRAPHICS.filter(
                    (g) =>
                      (g.id === "ranking" || active.document.insights) &&
                      (!active.document.round || g.id !== "spectrum"),
                  ).map((g) => (
                    <option key={g.id} value={g.id}>
                      {localText(g.name, locale)}
                    </option>
                  ))}
                </StudioSelect>
              </label>
            </div>
            <div className="pm-private-thumbnails">
              {choices.map((style) => {
                const design = {
                    ...active.design,
                    graphic: style.graphic,
                    style: style.id,
                    party:
                      style.graphic === "spectrum"
                        ? active.design.party || "none"
                        : active.design.party === "none" || !active.design.party
                          ? active.document.rows[0].slug
                          : active.design.party,
                  },
                  image = matchDesignSvg(
                    { ...active.document, locale },
                    design,
                  );
                return (
                  <button
                    className="pm-personal-thumbnail"
                    key={style.id}
                    onClick={() =>
                      openResultStudio(
                        { ...active.document, locale },
                        design,
                        active.id === "current" ? null : active.id,
                        active.name,
                      )
                    }
                  >
                    <img
                      loading="lazy"
                      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(image.svg)}`}
                      alt=""
                    />
                    <span>{localText(style.name, locale)}</span>
                  </button>
                );
              })}
            </div>
            {!choices.length && (
              <p role="status">
                {l(
                  "Keine passende Vorlage. Versuche zum Beispiel „modern“, „Kompass“ oder „Themen“.",
                  "No matching template. Try “modern”, “compass” or “topics”.",
                  "No hay plantillas coincidentes. Prueba «moderno», «brújula» o «temas».",
                )}
              </p>
            )}
          </>
        )}
      </section>
    );
  }
  if (!rows.length && !error) return null;
  return (
    <section className="pm-private-library">
      <h3>{c("privateResults")}</h3>
      <p>{c("savePrivacy")}</p>
      {error && (
        <p role="alert">
          {locale === "de"
            ? "Der lokale Speicher ist nicht verfügbar."
            : locale === "es"
              ? "El almacenamiento local no está disponible."
              : "Local storage is unavailable."}
        </p>
      )}
      <div className="studio-library-grid">
        {rows.map((row) => {
          const { svg } = matchDesignSvg(row.document, row.design);
          return (
            <article key={row.id}>
              <button
                className="studio-saved-preview"
                onClick={() =>
                  openResultStudio(row.document, row.design, row.id, row.name)
                }
              >
                <img
                  alt=""
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
                />
                <strong>{row.name}</strong>
              </button>
              <button
                className="text-button"
                onClick={() =>
                  deletePrivateResult(row.id).catch(() => setError(true))
                }
              >
                {locale === "de"
                  ? "Löschen"
                  : locale === "es"
                    ? "Eliminar"
                    : "Delete"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
