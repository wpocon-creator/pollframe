import React, { useEffect, useMemo, useState } from "react";

export const SPAIN_PARTY_DEFINITIONS = [
  { id: "405", slug: "podemos", name: "Podemos", color: "#6d3b87" },
  { id: "404", slug: "sumar", name: "Sumar", color: "#e05a9d" },
  { id: "402", slug: "psoe", name: "PSOE", color: "#e0272f" },
  { id: "406", slug: "erc", name: "ERC", color: "#f0a500" },
  { id: "408", slug: "eh-bildu", name: "EH Bildu", color: "#6aa84f" },
  { id: "410", slug: "bng", name: "BNG", color: "#56a7c9" },
  { id: "409", slug: "pnv", name: "PNV", color: "#17864b" },
  { id: "407", slug: "junts", name: "Junts", color: "#19a7a0" },
  { id: "411", slug: "cca", name: "CCa", color: "#e2b126" },
  { id: "412", slug: "upn", name: "UPN", color: "#215ca6" },
  { id: "401", slug: "pp", name: "PP", color: "#1479c9" },
  { id: "403", slug: "vox", name: "Vox", color: "#63a62f" },
  { id: "414", slug: "salf", name: "SALF", color: "#4b4b4b" },
  { id: "415", slug: "alianca", name: "Aliança.cat", color: "#173762" },
  { id: "413", slug: "adelante", name: "Adelante Andalucía", color: "#39a88f" },
  { id: "416", slug: "other", name: "Otros", color: "#8a939c" },
];

export const SPAIN_EVENT_CATEGORIES = [
  { id: "spain-election", de: "Parlamentswahlen", en: "General elections", es: "Elecciones generales" },
  { id: "spain-politics", de: "Politische Wendepunkte", en: "Political milestones", es: "Hitos políticos" },
  { id: "europe", de: "Europa", en: "Europe", es: "Europa" },
  { id: "global", de: "Globale Ereignisse", en: "Global events", es: "Eventos globales" },
];

export const SPAIN_POLITICAL_EVENTS = [
  { id: "es-election-2023", category: "spain-election", date: "2023-07-23", de: "Parlamentswahl 2023", en: "2023 general election", es: "Elecciones generales de 2023", shortDe: "Wahl 2023", shortEn: "2023 election", shortEs: "Elecciones 2023", detailDe: "Wahl zum Abgeordnetenkongress und Senat.", detailEn: "Election to the Congress of Deputies and Senate.", detailEs: "Elección al Congreso de los Diputados y al Senado.", source: "https://resultados.generales23j.es/" },
  { id: "es-feijoo-vote", category: "spain-politics", date: "2023-09-29", de: "Feijóos Investitur scheitert", en: "Feijóo investiture fails", es: "Investidura fallida de Feijóo", shortDe: "Investitur Feijóo", shortEn: "Feijóo vote", shortEs: "Investidura Feijóo", detailDe: "Der Kongress erteilt Alberto Núñez Feijóo nicht das Vertrauen.", detailEn: "Congress did not grant Alberto Núñez Feijóo its confidence.", detailEs: "El Congreso no otorgó su confianza a Alberto Núñez Feijóo.", source: "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaPrensaId=44837" },
  { id: "es-sanchez-investiture", category: "spain-politics", date: "2023-11-16", de: "Sánchez wiedergewählt", en: "Sánchez re-elected", es: "Sánchez, reelegido", shortDe: "Investitur Sánchez", shortEn: "Sánchez vote", shortEs: "Investidura Sánchez", detailDe: "Der Kongress wählt Pedro Sánchez im ersten Wahlgang mit absoluter Mehrheit zum Ministerpräsidenten.", detailEn: "Congress elected Pedro Sánchez prime minister by absolute majority in the first ballot.", detailEs: "El Congreso eligió a Pedro Sánchez presidente del Gobierno por mayoría absoluta en primera votación.", source: "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaPrensaId=45350" },
  { id: "es-eu-election-2024", category: "europe", date: "2024-06-09", de: "Europawahl 2024", en: "2024 European election", es: "Elecciones europeas de 2024", shortDe: "Europawahl", shortEn: "EU election", shortEs: "Elecciones UE", detailDe: "Wahl der spanischen Mitglieder des Europäischen Parlaments.", detailEn: "Election of Spain's members of the European Parliament.", detailEs: "Elección de los miembros españoles del Parlamento Europeo.", source: "https://results.elections.europa.eu/en/spain/" },
  { id: "es-valencia-floods", category: "spain-politics", date: "2024-10-29", de: "Flutkatastrophe in Valencia", en: "Valencia floods", es: "DANA de Valencia", shortDe: "Flut Valencia", shortEn: "Valencia floods", shortEs: "DANA Valencia", detailDe: "Schwere Überschwemmungen treffen vor allem die Provinz Valencia.", detailEn: "Severe flooding struck mainly the province of Valencia.", detailEs: "Graves inundaciones afectaron principalmente a la provincia de Valencia.", source: "https://www.lamoncloa.gob.es/info-dana/Paginas/index.aspx" },
];

const UI = {
  es: {
    label: "Congreso, temas y territorios", title: "España de un vistazo", intro: "Intención de voto, preocupaciones públicas y reglas para formar Gobierno, separando siempre encuestas, resultados y explicaciones.", pollingEyebrow: "Congreso de los Diputados", pollingTitle: "Intención de voto", pollingText: "Media transparente, encuestas individuales, evolución histórica y acontecimientos.", polls: "Encuestas", since: "Desde", updated: "Actualizado", issuesEyebrow: "Barómetro del CIS", issuesTitle: "Qué preocupa a España", issuesText: "Las respuestas espontáneas más citadas en el último barómetro disponible.", mentions: "Menciones", answers: "Hasta 3", source: "Fuente", systemEyebrow: "Artículo 99 CE", systemTitle: "Cómo se forma Gobierno", systemText: "La primera votación exige 176 síes. En la segunda, 48 horas después, bastan más síes que noes: abstenerse puede cambiar el resultado.", first: "1.ª votación", second: "2.ª votación", yes: "Sí", rule: "Regla", absolute: "176 de 350", simple: "Sí > No", mapLabel: "17 comunidades + Ceuta y Melilla", mapTitle: "Explorar el territorio", mapText: "Toca una comunidad para identificarla. Las series autonómicas se publicarán solo cuando superen el control de cobertura y licencia.", selected: "Seleccionada", coverage: "Estado de datos", preparing: "Serie autonómica en revisión", mapSource: "Geometría", noSum: "No suman 100: cada persona podía citar hasta tres problemas.",
  },
  de: {
    label: "Kongress, Themen und Regionen", title: "Spanien im Überblick", intro: "Wahlabsicht, öffentliche Sorgen und Regeln der Regierungsbildung – Umfragen, Ergebnisse und Erklärungen bleiben klar getrennt.", pollingEyebrow: "Abgeordnetenkongress", pollingTitle: "Nationale Wahlabsicht", pollingText: "Transparenter Durchschnitt, Einzelumfragen, historischer Verlauf und Ereignisse.", polls: "Umfragen", since: "Seit", updated: "Aktualisiert", issuesEyebrow: "CIS-Barometer", issuesTitle: "Was Spanien beschäftigt", issuesText: "Die häufigsten spontanen Antworten im jüngsten verfügbaren Barometer.", mentions: "Nennungen", answers: "Bis zu 3", source: "Quelle", systemEyebrow: "Artikel 99 der Verfassung", systemTitle: "Wie eine Regierung entsteht", systemText: "Im ersten Wahlgang sind 176 Ja-Stimmen nötig. Im zweiten 48 Stunden später genügen mehr Ja- als Nein-Stimmen – Enthaltungen können das Ergebnis verändern.", first: "1. Wahlgang", second: "2. Wahlgang", yes: "Ja", rule: "Regel", absolute: "176 von 350", simple: "Ja > Nein", mapLabel: "17 Gemeinschaften + Ceuta und Melilla", mapTitle: "Regionen erkunden", mapText: "Tippe eine Region an. Autonome Umfragereihen werden erst nach Prüfung von Abdeckung und Lizenz veröffentlicht.", selected: "Ausgewählt", coverage: "Datenstatus", preparing: "Autonome Reihe in Prüfung", mapSource: "Kartengeometrie", noSum: "Die Werte summieren sich nicht auf 100: Jede Person konnte bis zu drei Probleme nennen.",
  },
  en: {
    label: "Congress, issues and territories", title: "Spain at a glance", intro: "Voting intention, public concerns and government-formation rules—with polls, results and explanations kept clearly separate.", pollingEyebrow: "Congress of Deputies", pollingTitle: "National voting intention", pollingText: "A transparent average, individual polls, historical movement and events.", polls: "Polls", since: "Since", updated: "Updated", issuesEyebrow: "CIS barometer", issuesTitle: "What concerns Spain", issuesText: "The most-cited spontaneous answers in the latest available barometer.", mentions: "Mentions", answers: "Up to 3", source: "Source", systemEyebrow: "Constitution, Article 99", systemTitle: "How a government is formed", systemText: "The first ballot needs 176 yes votes. In the second, 48 hours later, more yes than no votes suffice—abstentions can change the result.", first: "First ballot", second: "Second ballot", yes: "Yes", rule: "Rule", absolute: "176 of 350", simple: "Yes > No", mapLabel: "17 communities + Ceuta and Melilla", mapTitle: "Explore the territory", mapText: "Tap a community to identify it. Regional polling series will appear only after coverage and licensing checks.", selected: "Selected", coverage: "Data status", preparing: "Regional series under review", mapSource: "Map geometry", noSum: "The values do not add to 100: each person could name up to three issues.",
  },
};

function language(locale) {
  return locale === "es" ? UI.es : locale === "de" ? UI.de : UI.en;
}

function coordinatesToPath(coordinates) {
  const project = ([longitude, latitude]) => {
    if (longitude < -12) return [25 + ((longitude + 18.5) * 28), 405 + ((29.6 - latitude) * 28)];
    return [35 + ((longitude + 10) * 44), 18 + ((44.5 - latitude) * 45)];
  };
  const ring = (points) => points.map((point, index) => `${index ? "L" : "M"}${project(point).map((value) => value.toFixed(1)).join(" ")}`).join(" ") + "Z";
  if (!Array.isArray(coordinates?.[0]?.[0]?.[0])) return coordinates.map(ring).join(" ");
  return coordinates.flatMap((polygon) => polygon.map(ring)).join(" ");
}

export function SpainMiniMap({ geojson }) {
  const features = geojson?.features?.filter((feature) => feature?.geometry?.coordinates && !feature.properties?.acom_name?.startsWith("Territorio no asociado")) ?? [];
  return <svg className="watch-mini-map watch-mini-map-es" viewBox="0 0 710 470" aria-hidden="true">{features.map((feature) => <path key={feature.properties?.acom_code} d={coordinatesToPath(feature.geometry.coordinates)} />)}</svg>;
}

function SpainMap({ locale }) {
  const text = language(locale);
  const [map, setMap] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/spain-autonomies.geojson", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then(setMap).catch((error) => { if (error.name !== "AbortError") console.error(error); });
    return () => controller.abort();
  }, []);
  const features = useMemo(() => map?.features?.filter((feature) => feature?.geometry?.coordinates && !feature.properties?.acom_name?.startsWith("Territorio no asociado")) ?? [], [map]);
  const active = hovered ?? selected ?? features.find((feature) => feature.properties?.acom_name === "Comunidad de Madrid") ?? null;
  return (
    <section id="spain-map" className="spain-map-card" aria-labelledby="spain-map-title">
      <header><div><p className="section-label">{text.mapLabel}</p><h2 id="spain-map-title">{text.mapTitle}</h2><p>{text.mapText}</p></div></header>
      <div className="spain-map-layout">
        <svg className="spain-map-svg" viewBox="0 0 710 470" role="img" aria-label={text.mapTitle}>
          {features.map((feature) => {
            const id = feature.properties?.acom_code;
            const name = feature.properties?.acom_name_local || feature.properties?.acom_name;
            const isActive = active?.properties?.acom_code === id;
            return <path key={id} d={coordinatesToPath(feature.geometry.coordinates)} className={isActive ? "active" : ""} tabIndex="0" role="button" aria-label={name} onPointerEnter={() => setHovered(feature)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(feature)} onBlur={() => setHovered(null)} onClick={() => setSelected(feature)} />;
          })}
        </svg>
        <aside className="spain-map-detail" aria-live="polite"><span>{text.selected}</span><h3>{active?.properties?.acom_name_local || active?.properties?.acom_name || "Madrid"}</h3><dl><div><dt>{text.coverage}</dt><dd>{text.preparing}</dd></div></dl><small>Pollframe muestra aquí únicamente una identificación territorial; no infiere intención de voto sin una serie válida.</small></aside>
      </div>
      <p className="spain-map-source">{text.mapSource}: <a href={map?.attribution?.sourceUrl ?? "https://public.opendatasoft.com/explore/dataset/georef-spain-comunidad-autonoma/"} target="_blank" rel="noreferrer">BDLJE · IGN.es / Opendatasoft · CC BY 4.0</a></p>
    </section>
  );
}

export function SpainCountryOverview({ locale, summary, formatDate, numberLocale }) {
  const text = language(locale);
  const congress = summary.congress;
  const issueMax = Math.max(...summary.issues.items.map((item) => item.value));
  return (
    <main id="top" className="germany-country-overview spain-country-overview">
      <nav className="region-breadcrumb country-breadcrumb" aria-label="Navigation"><strong>España</strong></nav>
      <section className="germany-country-hero spain-country-hero"><div><div className="eyebrow"><span />{text.label}</div><h1>🇪🇸 {text.title}</h1><p>{text.intro}</p></div></section>
      <section className="spain-overview-grid" aria-label={text.title}>
        <a className="spain-polling-entry" href="/?region=spain-congress"><div><span>{text.pollingEyebrow}</span><h2>{text.pollingTitle}</h2><p>{text.pollingText}</p></div><dl><div><dt>{text.polls}</dt><dd>{congress.pollCount.toLocaleString(numberLocale)}</dd></div><div><dt>{text.since}</dt><dd>{congress.firstDate.slice(0, 4)}</dd></div><div><dt>{text.updated}</dt><dd>{formatDate(congress.latestDate, locale)}</dd></div></dl><b aria-hidden="true">→</b></a>
        <article className="spain-issues-card"><header><span>{text.issuesEyebrow}</span><h2>{text.issuesTitle}</h2><p>{text.issuesText}</p></header><div className="spain-issue-bars">{summary.issues.items.map((item) => <div key={item.id}><span>{item.label}</span><div><i style={{ width: `${(item.value / issueMax) * 100}%`, background: item.color }} /></div><strong>{item.value.toLocaleString(numberLocale)}%</strong></div>)}</div><footer><span>{text.answers}</span><a href={summary.issues.sourceUrl} target="_blank" rel="noreferrer">CIS ↗</a></footer></article>
        <article className="spain-investiture-card"><header><span>{text.systemEyebrow}</span><h2>{text.systemTitle}</h2><p>{text.systemText}</p></header><div className="investiture-rounds"><div><b>1</b><span>{text.first}</span><strong>{text.absolute}</strong></div><i aria-hidden="true">48 h</i><div><b>2</b><span>{text.second}</span><strong>{text.simple}</strong></div></div><a href="https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229#a99" target="_blank" rel="noreferrer">Constitución Española · art. 99 ↗</a><details className="spain-system-details"><summary>{locale === "es" ? "Cómo se elige el Congreso" : locale === "de" ? "Wie der Kongress gewählt wird" : "How Congress is elected"}</summary><p>{locale === "es" ? "Los 350 escaños se reparten en 52 circunscripciones: las 50 provincias más Ceuta y Melilla. Cada provincia recibe inicialmente dos escaños y el resto se distribuye por población. Dentro de cada circunscripción se usa D’Hondt y un umbral del 3 % de los votos válidos." : locale === "de" ? "Die 350 Sitze werden in 52 Wahlkreisen vergeben: 50 Provinzen sowie Ceuta und Melilla. Jede Provinz erhält zunächst zwei Sitze, die übrigen folgen der Bevölkerung. Innerhalb jedes Wahlkreises gelten D’Hondt und eine 3-%-Hürde der gültigen Stimmen." : "The 350 seats are elected in 52 constituencies: 50 provinces plus Ceuta and Melilla. Each province initially receives two seats and the remainder follow population. D’Hondt and a 3% valid-vote threshold apply within each constituency."}</p><a href="https://infoelectoral.interior.gob.es/en/proceso-electoral/preguntas-frecuentes/sistema-electoral/" target="_blank" rel="noreferrer">Ministerio del Interior ↗</a></details></article>
      </section>
      <SpainMap locale={locale} />
    </main>
  );
}

export function SpainSystemNote({ locale }) {
  const text = language(locale);
  return <section className="spain-system-note"><div><span>{text.systemEyebrow}</span><h2>{text.systemTitle}</h2><p>{text.systemText}</p></div><div className="investiture-rounds"><div><b>1</b><span>{text.first}</span><strong>{text.absolute}</strong></div><i>48 h</i><div><b>2</b><span>{text.second}</span><strong>{text.simple}</strong></div></div></section>;
}
