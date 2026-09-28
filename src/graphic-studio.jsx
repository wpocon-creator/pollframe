import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyticsExcluded } from "../public/analytics-preference.js";
import { trackAggregateEventOnce } from "./aggregateAnalytics.js";
import { observeUsage } from "./usage-quality.js";
import StudioSelect from "./studio-select.jsx";
import {useStudioSwipe} from './studio-swipe.js';
import StudioThumbnail from "./studio-thumbnail.jsx";
import StudioGuide from "./studio-guide.jsx";
import {
  sortedStudioTemplates,
  trackStudioTemplate,
} from "./studio-popularity.js";
import { STUDIO_ASSISTANT_ENABLED } from "./studio-assistant-feature.js";
const StudioAssistant = STUDIO_ASSISTANT_ENABLED
  ? React.lazy(() => import("./studio-assistant.jsx"))
  : null;
const Library = React.lazy(() => import("./studio-library.jsx"));
import {
  STUDIO_TEMPLATES,
  isPausedStudioRequest,
  normalizeStudioState,
  studioText,
  safeStudioBack,
} from "./studio-model.js";
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
import { partySnapshot, isTimelineTopic } from "./studio-extra-model.js";
import { searchTemplates } from "./studio-search.js";
import {STUDIO_DATASETS,studioRegionName,studioRegionPatch,searchStudioRegions} from './studio-regions.js';
const HistoryDesign = React.lazy(() =>
  import("./studio-history.jsx").then((module) => ({
    default: module.HistoryDesign,
  })),
);
import { useHistorySnapshot } from "./studio-history-source.jsx";
import {
  CurrentDesign,
  CurrentDesignPreview,
  useCurrentSnapshot,
} from "./studio-current.jsx";

const topicLabels = {
  all: ["Alle Grafiken", "All graphics", "Todas las gráficas"],
  current: ["Aktuelle Umfragen", "Latest polls", "Encuestas actuales"],
  history: [
    "Historischer Verlauf",
    "Historical polling",
    "Evolución histórica",
  ],
  seats: ["Sitzmodell", "Seat model", "Modelo de escaños"],
  map: ["Bundesländer", "Federal states", "Estados federados"],
  majority: ["Mehrheiten", "Majorities", "Mayorías"],
  approval: [
    "Zustimmungsverlauf",
    "Approval history",
    "Evolución de valoración",
  ],
  "approval-current": [
    "Aktuelle Zustimmung",
    "Current approval",
    "Valoración actual",
  ],
  tendencies: ["Veränderungen", "Changes", "Cambios"],
  party: ["Einzelne Partei", "Single party", "Un solo partido"],
};
function defaultStudioTheme() {
  try {
    const preference = localStorage.getItem("opinion-poll-theme");
    return preference === "dark" ||
      (preference !== "light" &&
        matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : "light";
  } catch {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }
}
export default function GraphicStudio({ Header, PublishDialog }) {
  useEffect(() => {
    if (analyticsExcluded() || !import.meta.env.PROD || location.protocol !== "https:" || document.documentElement.dataset.embed === "true") return;
    return observeUsage(event => trackAggregateEventOnce(event));
  }, []);
  const initial = useRef(new URLSearchParams(window.location.search));
  const [pausedRequest, setPausedRequest] = useState(() =>
    isPausedStudioRequest(Object.fromEntries(initial.current)));
  const explicitTheme = useRef(initial.current.has("theme"));
  const [state, setState] = useState(() =>
    normalizeStudioState({
      ...Object.fromEntries(initial.current),
      region:initial.current.get('region') || searchStudioRegions(initial.current.get('q')).regions[0],
      theme: initial.current.get("theme") || defaultStudioTheme(),
      start: initial.current.get("from") ?? initial.current.get("start"),
      end: initial.current.get("to") ?? initial.current.get("end"),
    }),
  );
  const [assistantMessages, setAssistantMessages] = useState([]),
    [assistantOpen, setAssistantOpen] = useState(false);
  const [editing, setEditing] = useState(!pausedRequest && initial.current.get("editor") === "1");
  const [query, setQuery] = useState(initial.current.get("q") ?? "");
  const [visibleTopics, setVisibleTopics] = useState(
    () => new Set(["current"]),
  );
  const revealTopic = useCallback(
    (topic) =>
      setVisibleTopics((old) =>
        old.has(topic) ? old : new Set([...old, topic]),
      ),
    [],
  );
  const [searchFocused, setSearchFocused] = useState(false);
  const [library, setLibrary] = useState(false),
    [savedDesign, setSavedDesign] = useState(null),
    [sort, setSort] = useState("recommended"),
    [popularity, setPopularity] = useState({});
  useEffect(() => {
    let active = true;
    fetch("/api/studio-popular")
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => {
        if (active && v?.counts) setPopularity(v.counts);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const [contextProfile,setContextProfile] = useState(pausedRequest ? null : initial.current.get("profile"));
  const [topic, setTopic] = useState(
    (pausedRequest ? "all" : initial.current.get("topic")) ??
      (contextProfile
        ? (STUDIO_TEMPLATES.find((item) => item.profile === contextProfile)
            ?.topic ?? "all")
        : "all"),
  );
  const activeTopic = STUDIO_TEMPLATES.find(
    (t) => t.id === state.template,
  )?.topic;
  const snapshot = useCurrentSnapshot(
    state,
    state.country === "de" &&
      (library ||
        (editing
          ? activeTopic === "current"
          : ["all", "current"].includes(topic))),
  );
  const historySnapshot = useHistorySnapshot(
    state,
    state.country === "de" &&
      (editing
        ? ["history", "party", "approval"].includes(activeTopic)
        : ["history", "party", "approval"].includes(topic) ||
          (topic === "all" &&
            ["history", "party", "approval"].some((t) =>
              visibleTopics.has(t),
            ))),
  );
  const needs = (topics) =>
    state.country === "de" &&
    (editing
      ? topics.includes(activeTopic)
      : topic === "all"
        ? topics.some((t) => visibleTopics.has(t))
        : topics.includes(topic));
  const seatSnapshot = useExtraSnapshot(
    state,
    "seats",
    needs(["seats", "majority"]),
  );
  const mapSnapshot = useExtraSnapshot(state, "map", needs(["map"]));
  const changeSnapshot = useExtraSnapshot(
    state,
    "tendencies",
    needs(["tendencies"]),
  );
  const approvals = useApprovalSnapshot(
    state,
    needs(["approval", "approval-current"]),
  );
  const selectedPartySnapshot = useMemo(() => partySnapshot(historySnapshot.data, state),
    [historySnapshot.data, state.party, state.region, state.lang]);
  const dataFor = (t) =>
    t.topic === "map"
      ? mapSnapshot.data
      : t.topic === "current"
        ? snapshot.data
        : t.topic === "history"
          ? historySnapshot.data
          : t.topic === "party"
            ? selectedPartySnapshot
            : ["approval", "approval-current"].includes(t.topic)
              ? approvals.raw &&
                (t.topic !== "approval" ||
                  state.events === "" ||
                  historySnapshot.data)
                ? approvals.create(
                    approvals.raw,
                    { ...state, template: t.id },
                    historySnapshot.data?.eventCatalogue,
                  )
                : null
              : t.topic === "tendencies"
                ? changeSnapshot.data
                : seatSnapshot.data;
  const designFor = (t) =>
    isTimelineTopic(t.topic)
      ? HistoryDesign
      : t.topic === "current"
        ? CurrentDesign
        : t.topic === "map"
          ? MapDesign
          : StatisticDesign;
  const l = (de, en, es) => studioText([de, en, es], state.lang);
  const update = (patch) => {
    if (Object.hasOwn(patch, "theme")) explicitTheme.current = true;
    setState((current) => normalizeStudioState({ ...current, ...patch }));
  };
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!explicitTheme.current)
        setState((s) => ({
          ...s,
          theme:
            document.documentElement.dataset.theme === "dark"
              ? "dark"
              : "light",
        }));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  const back = safeStudioBack(initial.current.get("back"));
  const regionSearch = useMemo(() => searchStudioRegions(query), [query]);
  const candidates = useMemo(() => STUDIO_TEMPLATES.filter(
    (template) =>
      (!contextProfile || template.profile === contextProfile) &&
      (!template.country || template.country === state.country) &&
      (topic === "all" || topic === template.topic),
  ), [contextProfile, state.country, topic]);
  const searchResult = useMemo(() => searchTemplates(
    sortedStudioTemplates(candidates, sort, popularity),
    regionSearch.query,
  ), [candidates, sort, popularity, regionSearch.query, editing]);
  const changeQuery=(value)=>{
    setQuery(value);
    const found=searchStudioRegions(value);
    if(found.regions.length && !found.regions.includes(state.region))update(studioRegionPatch(found.regions[0]));
  };
  const templates = searchResult.items;
  useEffect(() => {
    if (editing) return;
    const frame = requestAnimationFrame(() => {
      const tabs = document.querySelector(".studio-topic-tabs");
      const active = tabs?.querySelector('[aria-pressed="true"]');
      if (!active || tabs.scrollWidth <= tabs.clientWidth) return;
      tabs.scrollLeft +=
        active.getBoundingClientRect().left -
        tabs.getBoundingClientRect().left -
        (tabs.clientWidth - active.clientWidth) / 2;
    });
    return () => cancelAnimationFrame(frame);
  }, [topic, editing]);
  useEffect(() => {
    const shell = document.querySelector(".studio-shell"),
      header = shell?.querySelector(".site-header");
    if (!header || !globalThis.ResizeObserver) return;
    const measure = () =>
      shell.style.setProperty(
        "--studio-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    measure();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      let preference = "system";
      try {
        preference = localStorage.getItem("opinion-poll-theme") || "system";
      } catch {
        /* Storage may be disabled. */
      }
      document.documentElement.dataset.theme =
        preference === "dark" || (preference !== "light" && media.matches)
          ? "dark"
          : "light";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  useEffect(() => {
    document.title = `${l("Grafikstudio", "Graphic studio", "Estudio gráfico")} · Pollframe`;
    document.documentElement.lang = state.lang;
    document.documentElement.dataset.embed = "false";
    document
      .querySelector('meta[name="robots"]')
      ?.setAttribute("content", "noindex, nofollow");
  }, [state.lang]);
  const lastUrlWrite = useRef(0);
  useEffect(() => {
    if (pausedRequest) return; // Do not silently rewrite an approval bookmark as a poll.
    const params = new URLSearchParams({ view: "studio", back });
    if (contextProfile) params.set("profile", contextProfile);
    if (query) params.set("q", query);
    params.set("topic", topic);
    for (const [key, value] of Object.entries(state))
      if (value !== null && value !== "") params.set(key, value);
    // Preserve the intentional empty event selection when restoring a recipe.
    for (const key of ["events", "parties", "pollsters"])
      if (state[key] === "") params.set(key, "");
    if (editing) params.set("editor", "1");
    const next = `/?${params}`;
    const sync = () => {
      if (location.pathname + location.search === next) return;
      try {
        window.history.replaceState(window.history.state, "", next);
        lastUrlWrite.current = performance.now();
      } catch {
        // A browser history quota must not unmount the editor or lose its data.
        // Export and save use the current recipe, not the address bar.
      }
    };
    // Safari rejects >100 history writes in ten seconds. A dragged slider can
    // easily exceed that; update the graphic immediately, but coalesce its URL.
    const delay = Math.max(0, 160 - (performance.now() - lastUrlWrite.current));
    const timer = delay ? setTimeout(sync, delay) : null;
    if (!delay) sync();
    window.addEventListener("pagehide", sync);
    return () => { clearTimeout(timer); window.removeEventListener("pagehide", sync); };
  }, [state, editing, back, query, topic, contextProfile, pausedRequest]);
  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") !== "studio") return;
      const paused = isPausedStudioRequest(Object.fromEntries(params));
      setPausedRequest(paused);
      setState(normalizeStudioState(Object.fromEntries(params)));
      setEditing(!paused && params.get("editor") === "1");
      setQuery(params.get("q") ?? "");
      setTopic(paused ? "all" : params.get("topic") ?? "all");
      setContextProfile(paused ? null : params.get("profile"));
      const saved = window.history.state;
      setTimeout(() => {
        document.getElementById(saved?.focusId)?.focus({ preventScroll: true });
        window.scrollTo({
          top: saved?.galleryScroll ?? 0,
          behavior: "instant",
        });
      }, 100);
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  const openTemplate = (template) => {
    setPausedRequest(false);
    setSavedDesign(null);
    trackStudioTemplate(template.id);
    history.replaceState(
      {
        ...history.state,
        galleryScroll: window.scrollY,
        focusId: `studio-${template.id}`,
      },
      "",
    );
    const params = new URLSearchParams(window.location.search);
    params.set("editor", "1");
    params.set("template", template.id);
    history.pushState({ studioPreview: true, studioGalleryDepth: 1 }, "", `/?${params}`);
    update({ template: template.id });
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const showGallery = () => {
    setQuery('');setTopic('all');setContextProfile(null);setLibrary(false);
    setSort('recommended');setEditing(false);
    update({workspace:'preview'});
    const params=new URLSearchParams({view:'studio',country:'de',lang:state.lang,topic:'all'});
    history.replaceState({},'',`/?${params}`);
    window.scrollTo({top:0,behavior:'instant'});
    requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));
  };
  const swipe=useStudioSwipe(editing && state.workspace!=='edit',direction=>{
    const index=templates.findIndex(item=>item.id===state.template);
    const adjacent=index<0?null:templates[index+direction];
    if(adjacent)update({template:adjacent.id});
  });
  return (
    <div className="studio-shell" data-swipe-preview={editing && state.workspace!=='edit' || undefined} {...swipe} data-assistant-state={JSON.stringify(state)}>
      {STUDIO_ASSISTANT_ENABLED && !editing && (
        <button
          className="secondary-button studio-gallery-assistant-toggle"
          onClick={() => setAssistantOpen((v) => !v)}
        >
          {l("KI-Assistent", "AI assistant", "Asistente de IA")}
        </button>
      )}
      {STUDIO_ASSISTANT_ENABLED && !editing && assistantOpen && (
        <div className="studio-assistant-gallery">
          <React.Suspense fallback={null}>
            <StudioAssistant
              state={state}
              snapshot={null}
              gallery
              l={l}
              messages={assistantMessages}
              setMessages={setAssistantMessages}
              onCollapse={() => setAssistantOpen(false)}
              onApply={(patch) => {
                update({
                  ...patch,
                  workspace: innerWidth >= 768 ? "edit" : "preview",
                });
                setEditing(true);
                setAssistantOpen(false);
              }}
            />
          </React.Suspense>
        </div>
      )}
      {Header && (
        <Header locale={state.lang} setLocale={(lang) => update({ lang })} />
      )}
      <StudioGuide l={l} lang={state.lang} />
      {editing && (
        <nav
          className="studio-preview-navigation"
          aria-label={l(
            "Design-Navigation",
            "Design navigation",
            "Navegación de diseños",
          )}
        >
          {editing && (
            <button
              className="studio-return secondary-button"
              type="button"
              onClick={() =>
                state.workspace === "edit"
                  ? update({ workspace: "preview" })
                  : showGallery()
              }
            >
              ←{" "}
              {state.workspace === "edit"
                ? l(
                    "Zur Vorschau",
                    "Back to preview",
                    "Volver a la vista previa",
                  )
                : l("Alle Designs", "All designs", "Todos los diseños")}
            </button>
          )}
          {(state.workspace === "edit" ? [] : [-1, 1]).map((direction) => {
            const index = templates.findIndex(
              (item) => item.id === state.template,
            );
            const adjacent = index < 0 ? null : templates[index + direction];
            return (
              <button
                key={direction}
                className={`studio-adjacent ${direction < 0 ? "previous" : "next"}`}
                disabled={!adjacent}
                aria-label={
                  direction < 0
                    ? l(
                        "Vorheriges Design",
                        "Previous design",
                        "Diseño anterior",
                      )
                    : l("Nächstes Design", "Next design", "Diseño siguiente")
                }
                title={
                  adjacent ? studioText(adjacent.name, state.lang) : undefined
                }
                onClick={() => adjacent && update({ template: adjacent.id })}
              >
                <svg viewBox="0 0 48 88" aria-hidden="true">
                  <path
                    d={
                      direction < 0
                        ? "M35 10 10 44 35 78"
                        : "M13 10 38 44 13 78"
                    }
                  />
                </svg>
              </button>
            );
          })}
        </nav>
      )}
      {state.country !== "de" ? (
        <main className="studio-main">
          <h1>
            {l(
              "Studio startet mit Deutschland",
              "Studio starts with Germany",
              "Studio comienza con Alemania",
            )}
          </h1>
          <p>
            {l(
              "Dieser Link enthält Daten eines anderen Landes. Sie werden nicht durch deutsche Daten ersetzt.",
              "This link contains another country's data. They have not been replaced with German data.",
              "Este enlace contiene datos de otro país. No se han sustituido por datos alemanes.",
            )}
          </p>
          <a
            className="primary-button"
            href={`/?view=studio&lang=${state.lang}`}
          >
            {l(
              "Deutsche Designs ansehen",
              "Explore German designs",
              "Ver diseños de Alemania",
            )}
          </a>
        </main>
      ) : (
        <>
          {pausedRequest && <p className="studio-availability-note" role="status">
            {l("Zustimmungsdesigns sind vorübergehend nicht verfügbar. Deine gespeicherten Designs bleiben erhalten. Hier findest du die übrigen Vorlagen.",
              "Approval designs are temporarily unavailable. Your saved designs are preserved. Explore the other templates below.",
              "Los diseños de valoración no están disponibles temporalmente. Tus diseños guardados se conservan. Puedes explorar las demás plantillas abajo.")}
          </p>}
          {snapshot.frame}
          {historySnapshot.frame}
          {seatSnapshot.frame}
          {changeSnapshot.frame}
          {mapSnapshot.frame}
          {[
            needs(["seats", "majority"]) && seatSnapshot,
            needs(["tendencies"]) && changeSnapshot,
            needs(["approval", "approval-current"]) && approvals,
            needs(["map"]) && mapSnapshot,
          ].filter(Boolean)
            .filter((s) => s.error)
            .map((s, i) => (
              <p role="alert" key={i}>
                {l(
                  "Daten nicht verfügbar.",
                  "Data unavailable.",
                  "Datos no disponibles.",
                )}{" "}
                <button className="secondary-button" onClick={s.retry}>
                  {l("Erneut versuchen", "Retry", "Reintentar")}
                </button>
              </p>
            ))}
          {historySnapshot.error && (
            <p role="alert">
              {l(
                "Historische Daten konnten nicht geladen werden.",
                "Historical data could not be loaded.",
                "No se pudieron cargar los datos históricos.",
              )}{" "}
              <button
                className="secondary-button"
                onClick={historySnapshot.retry}
              >
                {l("Erneut versuchen", "Retry", "Reintentar")}
              </button>
            </p>
          )}
          <main
            className={`studio-main ${editing ? "is-editing" : "is-gallery"} ${editing && state.workspace === "edit" ? "is-full-editor" : ""}`}
          >
            {!editing && (
              <section className="studio-intro">
                <div>
                  <p className="section-label">
                    {l(
                      "Daten treffen Gestaltung",
                      "Data meets design",
                      "Datos y diseño",
                    )}
                  </p>
                  <h1>
                    {l(
                      "Die richtige Grafik für deine Geschichte.",
                      "The right graphic for your story.",
                      "La gráfica adecuada para tu historia.",
                    )}
                  </h1>
                  <p>
                    {l(
                      "Vorlage wählen, mit echten Umfragen anpassen und direkt verwenden. Quellen und Methodik bleiben dabei.",
                      "Choose a template, customise it with real polling and make it yours. Sources and methodology stay attached.",
                      "Elige una plantilla, ajústala con encuestas reales y úsala. Las fuentes y la metodología se conservan.",
                    )}
                  </p>
                </div>
                <div className="studio-intro-note">
                  <span>01 — 02 — 03</span>
                  <strong>
                    {l(
                      "Auswählen. Anpassen. Erzählen.",
                      "Choose. Customise. Tell.",
                      "Elige. Ajusta. Cuenta.",
                    )}
                  </strong>
                </div>
              </section>
            )}
            <div
              className="studio-global-controls"
              hidden={editing && state.workspace === "edit"}
            >
              {!editing && <label>
                {l('Datensatz','Dataset','Conjunto de datos')}
                <StudioSelect aria-label={l('Datensatz','Dataset','Conjunto de datos')} value={state.region} onChange={e=>{setQuery(searchStudioRegions(query).query);update(studioRegionPatch(e.target.value));}}>
                  {STUDIO_DATASETS.map(r=><option key={r[0]} value={r[0]}>{studioRegionName(r[0],state.lang)}</option>)}
                </StudioSelect>
              </label>}
              <label>
                {l("Sprache", "Language", "Idioma")}
                <StudioSelect
                  value={state.lang}
                  onChange={(event) => update({ lang: event.target.value })}
                >
                  <option value="de">Deutsch</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es">Español</option>
                </StudioSelect>
              </label>
              {!editing && (
                <div
                  className="studio-search"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget))
                      setSearchFocused(false);
                  }}
                >
                  <label>
                    {l(
                      "Vorlagen suchen",
                      "Search templates",
                      "Buscar plantillas",
                    )}
                    <span className="studio-search-field">
                      <input
                        type="search"
                        placeholder={l(
                          "Zum Beispiel: Verlauf, Sitze …",
                          "For example: history, seats …",
                          "Por ejemplo: evolución, escaños …",
                        )}
                        value={query}
                        maxLength={160}
                        onFocus={() => setSearchFocused(true)}
                        onKeyDown={(event) => {
                          if (["Enter", "Escape"].includes(event.key)) {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                        }}
                        onChange={(event) => {
                          changeQuery(event.target.value);
                          setSearchFocused(true);
                        }}
                      />
                      {query && (
                        <button
                          type="button"
                          className="studio-search-clear"
                          aria-label={l(
                            "Suche löschen",
                            "Clear search",
                            "Borrar búsqueda",
                          )}
                          onClick={(event) => {
                            setQuery("");
                            event.currentTarget.parentElement
                              .querySelector("input")
                              .focus();
                          }}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  </label>
                  {searchFocused && query.trim() && (
                    <div
                      className="studio-search-suggestions"
                      onPointerDown={(event) => event.preventDefault()}
                    >
                      <small>
                        {searchResult.fallback
                          ? l(
                              "Kein direkter Treffer · Vorschläge",
                              "No direct match · suggestions",
                              "Sin coincidencias directas · sugerencias",
                            )
                          : l(
                              "Passende Designs",
                              "Matching designs",
                              "Diseños relacionados",
                            )}
                      </small>
                      {templates.slice(0, 4).map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => {
                            setSearchFocused(false);
                            openTemplate(template);
                          }}
                        >
                          {studioText(template.name, state.lang)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {!editing && (
              <div className="studio-library-navigation">
                <div className="studio-choice">
                  <button
                    aria-pressed={!library}
                    onClick={() => setLibrary(false)}
                  >
                    {l(
                      "Alle Vorlagen",
                      "All templates",
                      "Todas las plantillas",
                    )}
                  </button>
                  <button
                    aria-pressed={library}
                    onClick={() => setLibrary(true)}
                  >
                    {l("Meine Designs", "My designs", "Mis diseños")}
                  </button>
                </div>
                {!library && (
                  <label>
                    {l("Sortierung", "Sort by", "Ordenar")}
                    <StudioSelect
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="popular">
                        {l("Beliebt", "Most popular", "Más populares")}
                      </option>
                      <option value="recommended">
                        {l("Empfohlen", "Recommended", "Recomendados")}
                      </option>
                      <option value="new">
                        {l("Neu", "Newest", "Nuevos")}
                      </option>
                      <option value="recent">
                        {l(
                          "Kürzlich angesehen",
                          "Recently viewed",
                          "Vistos recientemente",
                        )}
                      </option>
                    </StudioSelect>
                    {sort === "popular" &&
                      Object.keys(popularity).length === 0 && (
                        <small>
                          {l(
                            "Noch keine Nutzungszahlen: vorläufige Reihenfolge.",
                            "No usage counts yet: provisional order.",
                            "Aún no hay datos de uso: orden provisional.",
                          )}
                        </small>
                      )}
                  </label>
                )}
              </div>
            )}
            {!editing && library ? (
              <React.Suspense fallback={null}>
                <Library
                  renderTemplate={(template,patch)=>{
                    const data=dataFor(template),Design=designFor(template);
                    return <StudioThumbnail topic={template.topic} onVisible={revealTopic} loading={l('Lädt…','Loading…','Cargando…')}>{()=>data?<React.Suspense fallback={null}><Design snapshot={data} state={normalizeStudioState({...state,...patch,template:template.id})} template={template}/></React.Suspense>:<span>{l('Daten werden geladen…','Loading data…','Cargando datos…')}</span>}</StudioThumbnail>;
                  }}
                  l={l}
                  state={state}
                  snapshot={snapshot.data}
                  open={(record) => {
                    openTemplate(
                      STUDIO_TEMPLATES.find(
                        (t) => t.id === record.state.template,
                      ) || STUDIO_TEMPLATES[0],
                    );
                    setState(
                      normalizeStudioState({
                        ...record.state,
                        lang: state.lang,
                        workspace: "preview",
                      }),
                    );
                    setSavedDesign(record);
                  }}
                />
              </React.Suspense>
            ) : editing &&
              STUDIO_TEMPLATES.find((item) => item.id === state.template) ? (
              <CurrentDesignPreview
                PublishDialog={PublishDialog}
                assistantMessages={assistantMessages}
                setAssistantMessages={setAssistantMessages}
                snapshot={dataFor(
                  STUDIO_TEMPLATES.find((item) => item.id === state.template),
                )}
                Design={designFor(
                  STUDIO_TEMPLATES.find((item) => item.id === state.template),
                )}
                state={state}
                template={STUDIO_TEMPLATES.find(
                  (item) => item.id === state.template,
                )}
                savedDesign={savedDesign}
                update={update}
                onGallery={showGallery}
                l={l}
              />
            ) : editing ? null : (
              <>
                <nav
                  className="studio-topic-tabs"
                  aria-label={l("Grafiktyp", "Graphic type", "Tipo de gráfica")}
                >
                  {Object.entries(topicLabels)
                    .filter(([id]) => id === "all" || STUDIO_TEMPLATES.some(t => t.topic === id))
                    .filter(([id]) => !contextProfile || id === topic)
                    .map(([id, labels]) => (
                      <button
                        key={id}
                        aria-pressed={topic === id}
                        onClick={() => setTopic(id)}
                      >
                        {studioText(labels, state.lang)}
                      </button>
                    ))}
                </nav>
                <div className="studio-gallery-meta">
                  <strong>{studioRegionName(state.region,state.lang)}</strong>
                  {regionSearch.regions.length>1 && regionSearch.regions.map(region=><button type="button" className="secondary-button" key={region} aria-pressed={state.region===region} onClick={()=>update(studioRegionPatch(region))}>{studioRegionName(region,state.lang)}</button>)}
                  {searchResult.fallback && (
                    <p role="status">
                      {l(
                        "Kein direkter Treffer. Hier sind verfügbare Designs aus deiner Auswahl.",
                        "No direct match. These are available designs within your selection.",
                        "Sin coincidencias directas. Estos diseños están disponibles en tu selección.",
                      )}
                    </p>
                  )}
                  <span>
                    {templates.length}{" "}
                    {l("Vorlagen", "templates", "plantillas")}
                  </span>
                  <span>
                    {l(
                      "Echte Daten · Quellen und Methodik bleiben erhalten",
                      "Real data · sources and methodology retained",
                      "Datos reales · se conservan las fuentes y la metodología",
                    )}
                  </span>
                </div>
                {snapshot.error && (
                  <p role="alert">
                    {l(
                      "Daten konnten nicht geladen werden.",
                      "Data could not be loaded.",
                      "No se pudieron cargar los datos.",
                    )}{" "}
                    <button onClick={snapshot.retry}>
                      {l("Erneut versuchen", "Retry", "Reintentar")}
                    </button>
                  </p>
                )}
                <div className="studio-gallery studio-picture-gallery">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      id={`studio-${template.id}`}
                      className={`studio-template-card template-${template.preset}`}
                      onClick={() => openTemplate(template)}
                    >
                      <StudioThumbnail
                        topic={template.topic}
                        onVisible={revealTopic}
                        loading={l("Lädt…", "Loading…", "Cargando…")}
                      >
                        {() => {
                          const data = dataFor(template),
                            Design = designFor(template);
                          return data ? (
                            <React.Suspense
                              fallback={
                                <div className="studio-thumbnail-loading">
                                  {l("Lädt…", "Loading…", "Cargando…")}
                                </div>
                              }
                            >
                              <Design
                                snapshot={data}
                                state={
                                  template.topic === "party"
                                    ? { ...state, parties: null }
                                    : state
                                }
                                template={template}
                              />
                            </React.Suspense>
                          ) : (
                            <div className="studio-thumbnail-loading">
                              {l("Lädt…", "Loading…", "Cargando…")}
                            </div>
                          );
                        }}
                      </StudioThumbnail>
                      <div className="studio-template-caption">
                        <div>
                          <h2>{studioText(template.name, state.lang)}</h2>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {!templates.length && (
                  <div className="studio-empty">
                    <h2>
                      {l(
                        "Keine passende Vorlage gefunden.",
                        "No matching template found.",
                        "No se encontró una plantilla.",
                      )}
                    </h2>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setQuery("");
                        setTopic("all");
                      }}
                    >
                      {l(
                        "Filter zurücksetzen",
                        "Reset filters",
                        "Restablecer filtros",
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
            <footer className="studio-footer">
              <span>
                Pollframe Studio ·{" "}
                {l(
                  "Gespeicherte Designs bleiben in diesem Browser",
                  "Saved designs stay in this browser",
                  "Los diseños guardados permanecen en este navegador",
                )}
              </span>
              <span>
                {l(
                  "Keine Daten werden durch das Gestalten verändert.",
                  "Designing never changes the data.",
                  "El diseño nunca cambia los datos.",
                )}
              </span>
            </footer>
          </main>
        </>
      )}
    </div>
  );
}
