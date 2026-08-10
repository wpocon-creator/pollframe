import React, { useEffect, useMemo, useState } from "react";

export const SPAIN_PARTY_DEFINITIONS = [
  { id: "405", slug: "podemos-up", name: "Podemos / UP", color: "#6d3b87" },
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
  { id: "418", slug: "iu", name: "IU", color: "#b51f2e" },
  { id: "419", slug: "upyd", name: "UPyD", color: "#d41478" },
  { id: "421", slug: "compromis", name: "Compromís", color: "#e8891c" },
  { id: "420", slug: "ciu-cdc", name: "CiU / CDC", color: "#1a78a8" },
  { id: "417", slug: "ciudadanos", name: "Ciudadanos", color: "#eb6f19" },
  { id: "422", slug: "cup", name: "CUP", color: "#f2c500" },
  { id: "423", slug: "mas-pais", name: "Más País", color: "#15a388" },
  { id: "424", slug: "pacma", name: "PACMA", color: "#79a52b" },
];

export const SPAIN_EVENT_CATEGORIES = [
  { id: "spain-election", de: "Parlamentswahlen", en: "General elections", es: "Elecciones generales" },
  { id: "spain-politics", de: "Politische Wendepunkte", en: "Political milestones", es: "Hitos políticos" },
  { id: "spain-crisis", de: "Krisen und Gesellschaft", en: "Crises and society", es: "Crisis y sociedad" },
  { id: "europe", de: "Europa", en: "Europe", es: "Europa" },
  { id: "global", de: "Globale Ereignisse", en: "Global events", es: "Eventos globales" },
];

export const SPAIN_POLITICAL_EVENTS = [
  { id: "es-election-1996", category: "spain-election", date: "1996-03-03", de: "Parlamentswahl 1996", en: "1996 general election", es: "Elecciones generales de 1996", shortDe: "Wahl 1996", shortEn: "1996 election", shortEs: "Elecciones 1996", detailDe: "Wahl zu den Cortes Generales.", detailEn: "Election to the Cortes Generales.", detailEs: "Elección a las Cortes Generales.", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/" },
  { id: "es-election-2000", category: "spain-election", date: "2000-03-12", de: "Parlamentswahl 2000", en: "2000 general election", es: "Elecciones generales de 2000", shortDe: "Wahl 2000", shortEn: "2000 election", shortEs: "Elecciones 2000", detailDe: "Wahl zu den Cortes Generales.", detailEn: "Election to the Cortes Generales.", detailEs: "Elección a las Cortes Generales.", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/" },
  { id: "es-euro-cash", category: "europe", date: "2002-01-01", de: "Euro-Bargeld wird eingeführt", en: "Euro cash enters circulation", es: "Entra en circulación el euro", shortDe: "Euro-Bargeld", shortEn: "Euro cash", shortEs: "Euro en efectivo", detailDe: "Euro-Banknoten und -Münzen werden in Spanien und elf weiteren Staaten gesetzliches Zahlungsmittel.", detailEn: "Euro notes and coins became legal tender in Spain and eleven other countries.", detailEs: "Los billetes y monedas de euro entraron en circulación en España y otros once países.", source: "https://european-union.europa.eu/institutions-law-budget/euro/history-and-purpose_en" },
  { id: "es-madrid-attacks", category: "spain-crisis", date: "2004-03-11", de: "Anschläge von Madrid", en: "Madrid train bombings", es: "Atentados de Madrid", shortDe: "Anschläge Madrid", shortEn: "Madrid attacks", shortEs: "11-M", detailDe: "Bombenanschläge auf Pendlerzüge in Madrid fordern 193 Todesopfer.", detailEn: "Bomb attacks on commuter trains in Madrid killed 193 people.", detailEs: "Los atentados contra trenes de cercanías en Madrid causaron 193 víctimas mortales.", source: "https://www.interior.gob.es/opencms/es/prensa/hemeroteca/" },
  { id: "es-election-2004", category: "spain-election", date: "2004-03-14", de: "Parlamentswahl 2004", en: "2004 general election", es: "Elecciones generales de 2004", shortDe: "Wahl 2004", shortEn: "2004 election", shortEs: "Elecciones 2004", detailDe: "Wahl zu den Cortes Generales.", detailEn: "Election to the Cortes Generales.", detailEs: "Elección a las Cortes Generales.", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/" },
  { id: "es-election-2008", category: "spain-election", date: "2008-03-09", de: "Parlamentswahl 2008", en: "2008 general election", es: "Elecciones generales de 2008", shortDe: "Wahl 2008", shortEn: "2008 election", shortEs: "Elecciones 2008", detailDe: "Wahl zu den Cortes Generales.", detailEn: "Election to the Cortes Generales.", detailEs: "Elección a las Cortes Generales.", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/" },
  { id: "es-financial-crisis", category: "global", date: "2008-09-15", de: "Globale Finanzkrise", en: "Global financial crisis", es: "Crisis financiera mundial", shortDe: "Finanzkrise", shortEn: "Financial crisis", shortEs: "Crisis financiera", detailDe: "Die Insolvenz von Lehman Brothers markiert eine Eskalation der weltweiten Finanzkrise.", detailEn: "The collapse of Lehman Brothers marked an escalation of the global financial crisis.", detailEs: "La quiebra de Lehman Brothers marcó una escalada de la crisis financiera mundial.", source: "https://www.ecb.europa.eu/press/key/date/2018/html/ecb.sp180912.en.html" },
  { id: "es-eta-end", category: "spain-politics", date: "2011-10-20", de: "ETA beendet bewaffnete Aktivitäten", en: "ETA ends armed activity", es: "ETA cesa su actividad armada", shortDe: "Ende ETA-Gewalt", shortEn: "ETA ends violence", shortEs: "Fin de ETA", detailDe: "ETA erklärt die endgültige Beendigung ihrer bewaffneten Aktivitäten.", detailEn: "ETA announced the definitive end of its armed activity.", detailEs: "ETA anunció el cese definitivo de su actividad armada.", source: "https://www.lamoncloa.gob.es/presidente/actividades/Paginas/2011/20111020_Declaracion.aspx" },
  { id: "es-election-2011", category: "spain-election", date: "2011-11-20", de: "Parlamentswahl 2011", en: "2011 general election", es: "Elecciones generales de 2011", shortDe: "Wahl 2011", shortEn: "2011 election", shortEs: "Elecciones 2011", detailDe: "Wahl zu den Cortes Generales.", detailEn: "Election to the Cortes Generales.", detailEs: "Elección a las Cortes Generales.", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/" },
  { id: "es-abdication-2014", category: "spain-politics", date: "2014-06-02", de: "Juan Carlos I. kündigt Abdankung an", en: "Juan Carlos I announces abdication", es: "Juan Carlos I anuncia su abdicación", shortDe: "Abdankung", shortEn: "Abdication", shortEs: "Abdicación", detailDe: "König Juan Carlos I. kündigt seine Abdankung an; Felipe VI. folgt ihm im Juni.", detailEn: "King Juan Carlos I announced his abdication; Felipe VI succeeded him later that month.", detailEs: "El rey Juan Carlos I anunció su abdicación; Felipe VI le sucedió ese mismo mes.", source: "https://www.boe.es/buscar/doc.php?id=BOE-A-2014-6476" },
  { id: "es-election-2015", category: "spain-election", date: "2015-12-20", de: "Parlamentswahl 2015", en: "2015 general election", es: "Elecciones generales de 2015", shortDe: "Wahl 2015", shortEn: "2015 election", shortEs: "Elecciones 2015", detailDe: "Wahl zu den Cortes Generales; erstmals entsteht keine tragfähige Regierungsmehrheit.", detailEn: "Election to the Cortes Generales; no viable governing majority emerged.", detailEs: "Elección a las Cortes Generales; no surgió una mayoría de gobierno viable.", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/" },
  { id: "es-election-2016", category: "spain-election", date: "2016-06-26", de: "Parlamentswahl 2016", en: "2016 general election", es: "Elecciones generales de 2016", shortDe: "Wahl 2016", shortEn: "2016 election", shortEs: "Elecciones 2016", detailDe: "Vorgezogene Neuwahl zu den Cortes Generales.", detailEn: "A repeat election to the Cortes Generales.", detailEs: "Repetición electoral a las Cortes Generales.", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/" },
  { id: "es-catalonia-155", category: "spain-politics", date: "2017-10-27", de: "Artikel 155 in Katalonien", en: "Article 155 applied in Catalonia", es: "Aplicación del artículo 155 en Cataluña", shortDe: "Artikel 155", shortEn: "Article 155", shortEs: "Artículo 155", detailDe: "Der Senat billigt Maßnahmen nach Artikel 155; die katalanische Regierung wird abgesetzt und eine Regionalwahl angesetzt.", detailEn: "The Senate authorised Article 155 measures; Catalonia's government was dismissed and a regional election called.", detailEs: "El Senado autorizó las medidas del artículo 155; se cesó al Govern y se convocaron elecciones autonómicas.", source: "https://www.boe.es/eli/es/rd/2017/10/27/946" },
  { id: "es-no-confidence-2018", category: "spain-politics", date: "2018-06-01", de: "Misstrauensvotum gegen Rajoy", en: "No-confidence vote removes Rajoy", es: "Moción de censura contra Rajoy", shortDe: "Misstrauensvotum", shortEn: "No-confidence vote", shortEs: "Moción de censura", detailDe: "Der Kongress nimmt das Misstrauensvotum an; Pedro Sánchez erhält das Vertrauen der Kammer.", detailEn: "Congress passed the no-confidence motion and granted Pedro Sánchez its confidence.", detailEs: "El Congreso aprobó la moción de censura y otorgó su confianza a Pedro Sánchez.", source: "https://www.congreso.es/es/notas-de-prensa?_notasprensa_mvcPath=detalle&_notasprensa_notaId=28789&p_p_id=notasprensa" },
  { id: "es-election-2019-apr", category: "spain-election", date: "2019-04-28", de: "Parlamentswahl April 2019", en: "April 2019 general election", es: "Elecciones generales de abril de 2019", shortDe: "Wahl Apr. 2019", shortEn: "Apr 2019 election", shortEs: "Elecciones abr. 2019", detailDe: "Wahl zu den Cortes Generales.", detailEn: "Election to the Cortes Generales.", detailEs: "Elección a las Cortes Generales.", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/" },
  { id: "es-election-2019-nov", category: "spain-election", date: "2019-11-10", de: "Parlamentswahl November 2019", en: "November 2019 general election", es: "Elecciones generales de noviembre de 2019", shortDe: "Wahl Nov. 2019", shortEn: "Nov 2019 election", shortEs: "Elecciones nov. 2019", detailDe: "Erneute Wahl zu den Cortes Generales.", detailEn: "A repeat election to the Cortes Generales.", detailEs: "Repetición electoral a las Cortes Generales.", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/" },
  { id: "es-covid-emergency", category: "spain-crisis", date: "2020-03-14", de: "COVID-Notstand", en: "COVID state of alarm", es: "Estado de alarma por la COVID", shortDe: "COVID-Notstand", shortEn: "COVID emergency", shortEs: "Alarma COVID", detailDe: "Spanien ruft wegen der COVID-19-Pandemie den Alarmzustand aus.", detailEn: "Spain declared a state of alarm in response to the COVID-19 pandemic.", detailEs: "España declaró el estado de alarma ante la pandemia de COVID-19.", source: "https://www.boe.es/eli/es/rd/2020/03/14/463" },
  { id: "es-ukraine-invasion", category: "global", date: "2022-02-24", de: "Russlands Großinvasion der Ukraine", en: "Russia invades Ukraine", es: "Invasión rusa de Ucrania", shortDe: "Ukraine-Invasion", shortEn: "Ukraine invasion", shortEs: "Invasión de Ucrania", detailDe: "Russland beginnt seine großangelegte Invasion der Ukraine.", detailEn: "Russia began its full-scale invasion of Ukraine.", detailEs: "Rusia inició su invasión a gran escala de Ucrania.", source: "https://www.consilium.europa.eu/en/policies/eu-response-russia-military-aggression-against-ukraine/" },
  { id: "es-snap-election-called", category: "spain-politics", date: "2023-05-29", de: "Vorgezogene Wahl angekündigt", en: "Snap election called", es: "Convocatoria electoral anticipada", shortDe: "Wahl angekündigt", shortEn: "Election called", shortEs: "Elecciones convocadas", detailDe: "Pedro Sánchez kündigt die Auflösung des Parlaments und eine Wahl am 23. Juli an.", detailEn: "Pedro Sánchez announced the dissolution of parliament and an election for 23 July.", detailEs: "Pedro Sánchez anunció la disolución de las Cortes y elecciones para el 23 de julio.", source: "https://www.lamoncloa.gob.es/presidente/actividades/Paginas/2023/290523-sanchez-declaracion-institucional.aspx" },
  { id: "es-election-2023", category: "spain-election", date: "2023-07-23", de: "Parlamentswahl 2023", en: "2023 general election", es: "Elecciones generales de 2023", shortDe: "Wahl 2023", shortEn: "2023 election", shortEs: "Elecciones 2023", detailDe: "Wahl zum Abgeordnetenkongress und Senat.", detailEn: "Election to the Congress of Deputies and Senate.", detailEs: "Elección al Congreso de los Diputados y al Senado.", source: "https://resultados.generales23j.es/" },
  { id: "es-feijoo-vote", category: "spain-politics", date: "2023-09-29", de: "Feijóos Investitur scheitert", en: "Feijóo investiture fails", es: "Investidura fallida de Feijóo", shortDe: "Investitur Feijóo", shortEn: "Feijóo vote", shortEs: "Investidura Feijóo", detailDe: "Der Kongress erteilt Alberto Núñez Feijóo nicht das Vertrauen.", detailEn: "Congress did not grant Alberto Núñez Feijóo its confidence.", detailEs: "El Congreso no otorgó su confianza a Alberto Núñez Feijóo.", source: "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaPrensaId=44837" },
  { id: "es-sanchez-investiture", category: "spain-politics", date: "2023-11-16", de: "Sánchez wiedergewählt", en: "Sánchez re-elected", es: "Sánchez, reelegido", shortDe: "Investitur Sánchez", shortEn: "Sánchez vote", shortEs: "Investidura Sánchez", detailDe: "Der Kongress wählt Pedro Sánchez im ersten Wahlgang mit absoluter Mehrheit zum Ministerpräsidenten.", detailEn: "Congress elected Pedro Sánchez prime minister by absolute majority in the first ballot.", detailEs: "El Congreso eligió a Pedro Sánchez presidente del Gobierno por mayoría absoluta en primera votación.", source: "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaPrensaId=45350" },
  { id: "es-amnesty-law", category: "spain-politics", date: "2024-05-30", de: "Amnestiegesetz verabschiedet", en: "Amnesty law approved", es: "Aprobación de la ley de amnistía", shortDe: "Amnestiegesetz", shortEn: "Amnesty law", shortEs: "Ley de amnistía", detailDe: "Der Kongress verabschiedet das Amnestiegesetz nach Aufhebung des Vetos des Senats.", detailEn: "Congress gave final approval to the amnesty law after overriding the Senate's veto.", detailEs: "El Congreso aprobó definitivamente la ley de amnistía tras levantar el veto del Senado.", source: "https://www.congreso.es/gl/notas-de-prensa?_notasprensa_mvcPath=detalle&_notasprensa_notaId=46873&p_p_id=notasprensa" },
  { id: "es-eu-election-2024", category: "europe", date: "2024-06-09", de: "Europawahl 2024", en: "2024 European election", es: "Elecciones europeas de 2024", shortDe: "Europawahl", shortEn: "EU election", shortEs: "Elecciones UE", detailDe: "Wahl der spanischen Mitglieder des Europäischen Parlaments.", detailEn: "Election of Spain's members of the European Parliament.", detailEs: "Elección de los miembros españoles del Parlamento Europeo.", source: "https://results.elections.europa.eu/en/spain/" },
  { id: "es-valencia-floods", category: "spain-crisis", date: "2024-10-29", de: "Flutkatastrophe in Valencia", en: "Valencia floods", es: "DANA de Valencia", shortDe: "Flut Valencia", shortEn: "Valencia floods", shortEs: "DANA Valencia", detailDe: "Schwere Überschwemmungen treffen vor allem die Provinz Valencia.", detailEn: "Severe flooding struck mainly the province of Valencia.", detailEs: "Graves inundaciones afectaron principalmente a la provincia de Valencia.", source: "https://www.lamoncloa.gob.es/info-dana/paginas/2024/051124-informacion-ayudas.aspx" },
  { id: "es-iberian-blackout", category: "spain-crisis", date: "2025-04-28", de: "Stromausfall auf der Iberischen Halbinsel", en: "Iberian power outage", es: "Apagón ibérico", shortDe: "Stromausfall", shortEn: "Power outage", shortEs: "Apagón", detailDe: "Ein großflächiger Stromausfall trifft Spanien und Portugal.", detailEn: "A widespread power outage affected Spain and Portugal.", detailEs: "Un apagón generalizado afectó a España y Portugal.", source: "https://www.lamoncloa.gob.es/presidente/intervenciones/Paginas/2025/20250428-sanchez-reunion-consej-seguridad-nacional.aspx" },
  { id: "es-cerdan-resignation", category: "spain-politics", date: "2025-06-12", de: "PSOE-Organisationssekretär tritt zurück", en: "PSOE organisation secretary resigns", es: "Dimite el secretario de Organización del PSOE", shortDe: "PSOE-Rücktritt", shortEn: "PSOE resignation", shortEs: "Dimisión en el PSOE", detailDe: "Santos Cerdán legt nach Korruptionsvorwürfen seine Parteiämter und sein Abgeordnetenmandat nieder; die Vorwürfe waren zu diesem Zeitpunkt nicht gerichtlich entschieden.", detailEn: "Santos Cerdán resigned his party posts and parliamentary seat following corruption allegations; the allegations had not been adjudicated at the time.", detailEs: "Santos Cerdán dimitió de sus cargos en el partido y de su escaño tras acusaciones de corrupción; las acusaciones no habían sido juzgadas en ese momento.", source: "https://efe.com/espana/2025-06-12/santos-cerdan-dimision-psoe-acta-diputado/" },
];

const UI = {
  es: {
    label: "Congreso, temas y territorios", title: "España de un vistazo", intro: "Intención de voto, preocupaciones públicas y territorios, con encuestas y resultados claramente separados.", pollingEyebrow: "Congreso de los Diputados", pollingTitle: "Intención de voto", pollingText: "Media transparente, encuestas individuales, evolución histórica y acontecimientos.", polls: "Encuestas", since: "Desde", updated: "Actualizado", issuesEyebrow: "Barómetro del CIS", issuesTitle: "Qué preocupa a España", issuesText: "Las respuestas espontáneas más citadas en el último barómetro disponible.", mentions: "Menciones", answers: "Hasta 3", source: "Fuente", exploreIssues: "Explorar los datos", mapLabel: "17 comunidades + Ceuta y Melilla", mapTitle: "Explorar el territorio", mapText: "Pasa el cursor o toca una comunidad para identificarla. Las series autonómicas solo se publican tras comprobar su cobertura y licencia.", selected: "Seleccionada", choose: "Selecciona una comunidad", coverage: "Estado de datos", preparing: "Serie autonómica en revisión", mapDisclaimer: "Esta vista solo identifica el territorio; no estima intención de voto sin una serie válida.", mapSource: "Geometría", noSum: "No suman 100: cada persona podía citar hasta tres problemas.",
  },
  de: {
    label: "Kongress, Themen und Regionen", title: "Spanien im Überblick", intro: "Wahlabsicht, öffentliche Sorgen und Regionen – Umfragen und Wahlergebnisse bleiben klar getrennt.", pollingEyebrow: "Abgeordnetenkongress", pollingTitle: "Nationale Wahlabsicht", pollingText: "Transparenter Durchschnitt, Einzelumfragen, historischer Verlauf und Ereignisse.", polls: "Umfragen", since: "Seit", updated: "Aktualisiert", issuesEyebrow: "CIS-Barometer", issuesTitle: "Was Spanien beschäftigt", issuesText: "Die häufigsten spontanen Antworten im jüngsten verfügbaren Barometer.", mentions: "Nennungen", answers: "Bis zu 3", source: "Quelle", exploreIssues: "Daten genauer ansehen", mapLabel: "17 Gemeinschaften + Ceuta und Melilla", mapTitle: "Regionen erkunden", mapText: "Bewege den Mauszeiger über eine Region oder tippe sie an. Autonome Reihen erscheinen erst nach Prüfung von Abdeckung und Lizenz.", selected: "Ausgewählt", choose: "Region auswählen", coverage: "Datenstatus", preparing: "Autonome Reihe in Prüfung", mapDisclaimer: "Diese Ansicht identifiziert nur die Region; ohne belastbare Reihe wird keine Wahlabsicht geschätzt.", mapSource: "Kartengeometrie", noSum: "Die Werte summieren sich nicht auf 100: Jede Person konnte bis zu drei Probleme nennen.",
  },
  en: {
    label: "Congress, issues and territories", title: "Spain at a glance", intro: "Voting intention, public concerns and territories, with polls and election results kept clearly separate.", pollingEyebrow: "Congress of Deputies", pollingTitle: "National voting intention", pollingText: "A transparent average, individual polls, historical movement and events.", polls: "Polls", since: "Since", updated: "Updated", issuesEyebrow: "CIS barometer", issuesTitle: "What concerns Spain", issuesText: "The most-cited spontaneous answers in the latest available barometer.", mentions: "Mentions", answers: "Up to 3", source: "Source", exploreIssues: "Explore the data", mapLabel: "17 communities + Ceuta and Melilla", mapTitle: "Explore the territory", mapText: "Hover over or tap a community to identify it. Regional series appear only after coverage and licensing checks.", selected: "Selected", choose: "Select a community", coverage: "Data status", preparing: "Regional series under review", mapDisclaimer: "This view only identifies the territory; it does not estimate voting intention without a valid series.", mapSource: "Map geometry", noSum: "The values do not add to 100: each person could name up to three issues.",
  },
};

function language(locale) {
  return locale === "es" ? UI.es : locale === "de" ? UI.de : UI.en;
}

function MiniGraphInfo({ locale, title, text }) {
  const label = locale === "es" ? "Cómo leer este gráfico" : locale === "de" ? "So wird diese Grafik gelesen" : "How to read this chart";
  return (
    <details className="graph-info-popover graph-info-compact" data-export-ignore="true">
      <summary aria-label={label} title={label}><span aria-hidden="true">i</span></summary>
      <div className="graph-info-card" role="note"><strong>{title}</strong><p>{text}</p></div>
    </details>
  );
}

const DAY = 86_400_000;
const SPAIN_COMPARISON_GROUPS = [
  { id: "pp", name: "PP", partyIds: ["401"], color: "#1479c9" },
  { id: "psoe", name: "PSOE", partyIds: ["402"], color: "#e0272f" },
  { id: "vox", name: "Vox", partyIds: ["403"], color: "#63a62f" },
  { id: "sumar-podemos", name: "Sumar + Podemos", partyIds: ["404", "405"], color: "#d454a0" },
];

const INSIGHT_UI = {
  es: {
    eyebrow: "Lectura rápida", title: "Qué está cambiando", intro: "Tres lecturas complementarias del mismo archivo: movimiento, distancia entre los dos primeros partidos y acuerdo entre institutos.",
    compare: "Cambio desde", election: "23-J de 2023", year: "Hace 12 meses", yearStart: "Inicio de año", now: "ahora", electionResult: "resultado oficial", pollingAverage: "media comparable", currentAverage: "Media actual", points: "pp",
    raceEyebrow: "La carrera por el primer puesto", raceTitle: "Distancia PP–PSOE", ahead: "por delante", tied: "Empate técnico en la media", sinceElection: "Evolución de la diferencia desde el 23-J", ppLead: "PP por delante", psoeLead: "PSOE por delante",
    agreementEyebrow: "Transparencia", agreementTitle: "Cuánto coinciden los institutos", agreementIntro: "Última encuesta de cada instituto seleccionado dentro de 45 días. La línea muestra el mínimo y el máximo; el punto, la media.", polls: "institutos", range: "rango", spreadNote: "El rango refleja desacuerdo entre encuestas, no un intervalo de confianza.",
    changeInfo: "Compara la media actual con el punto de referencia elegido. El valor de la derecha es la diferencia en puntos porcentuales, no el cambio relativo.", raceInfo: "Para cada mes se calcula una media comparable de PP y PSOE; la línea muestra PP menos PSOE. Por encima de cero lidera PP y por debajo lidera PSOE.", agreementInfo: "Se toma la última encuesta de cada instituto seleccionado dentro de 45 días. La línea une el valor mínimo y máximo; el círculo es la media. No es un intervalo de confianza.",
    combinedNote: "Sumar + Podemos se agrupan para mantener una comparación coherente con la candidatura Sumar de 2023.", exportTitle: "Qué está cambiando en España",
  },
  de: {
    eyebrow: "Schneller Überblick", title: "Was sich gerade verändert", intro: "Drei ergänzende Blicke auf dasselbe Archiv: Bewegung, Abstand der beiden größten Parteien und Übereinstimmung der Institute.",
    compare: "Veränderung seit", election: "Wahl am 23. Juli 2023", year: "Vor 12 Monaten", yearStart: "Jahresbeginn", now: "jetzt", electionResult: "amtliches Ergebnis", pollingAverage: "vergleichbarer Durchschnitt", currentAverage: "Aktueller Durchschnitt", points: "Pkt.",
    raceEyebrow: "Rennen um Platz eins", raceTitle: "Abstand PP–PSOE", ahead: "vorn", tied: "Im Durchschnitt praktisch gleichauf", sinceElection: "Entwicklung des Abstands seit der Wahl 2023", ppLead: "PP vorn", psoeLead: "PSOE vorn",
    agreementEyebrow: "Transparenz", agreementTitle: "Wie stark die Institute übereinstimmen", agreementIntro: "Je ausgewähltem Institut die jüngste Umfrage innerhalb von 45 Tagen. Die Linie zeigt Minimum und Maximum, der Punkt den Mittelwert.", polls: "Institute", range: "Spanne", spreadNote: "Die Spanne zeigt Unterschiede zwischen Umfragen und ist kein Konfidenzintervall.",
    changeInfo: "Verglichen wird der aktuelle Mittelwert mit dem gewählten Ausgangspunkt. Rechts steht die Differenz in Prozentpunkten, nicht die relative Veränderung.", raceInfo: "Für jeden Monat wird ein vergleichbarer Mittelwert für PP und PSOE berechnet; die Linie zeigt PP minus PSOE. Oberhalb von null liegt PP vorn, unterhalb PSOE.", agreementInfo: "Je ausgewähltem Institut zählt die jüngste Umfrage innerhalb von 45 Tagen. Die Linie verbindet Minimum und Maximum, der Kreis ist der Mittelwert. Das ist kein Konfidenzintervall.",
    combinedNote: "Sumar und Podemos werden zusammengefasst, damit der Vergleich mit der gemeinsamen Sumar-Kandidatur von 2023 sinnvoll bleibt.", exportTitle: "Was sich in Spanien verändert",
  },
  en: {
    eyebrow: "Quick read", title: "What is changing", intro: "Three complementary readings of the same archive: movement, the gap between the two largest parties and pollster agreement.",
    compare: "Change since", election: "23 July 2023 election", year: "12 months ago", yearStart: "Start of year", now: "now", electionResult: "official result", pollingAverage: "comparable average", currentAverage: "Current average", points: "pts",
    raceEyebrow: "The race for first place", raceTitle: "PP–PSOE gap", ahead: "ahead", tied: "Effectively level in the average", sinceElection: "How the gap has moved since the 2023 election", ppLead: "PP ahead", psoeLead: "PSOE ahead",
    agreementEyebrow: "Transparency", agreementTitle: "How closely pollsters agree", agreementIntro: "Each selected pollster’s latest poll within 45 days. The line is the minimum-to-maximum range; the dot is the mean.", polls: "pollsters", range: "range", spreadNote: "This range shows disagreement between polls; it is not a confidence interval.",
    changeInfo: "The current average is compared with the selected baseline. The figure on the right is a percentage-point difference, not a relative change.", raceInfo: "A comparable PP and PSOE average is calculated for each month; the line is PP minus PSOE. Above zero PP leads, and below zero PSOE leads.", agreementInfo: "Each selected pollster contributes its latest poll within 45 days. The line joins the minimum and maximum, while the circle is the mean. This is not a confidence interval.",
    combinedNote: "Sumar and Podemos are grouped to keep the comparison consistent with the joint Sumar candidacy in 2023.", exportTitle: "What is changing in Spain",
  },
};

function insightLanguage(locale) {
  return locale === "es" ? INSIGHT_UI.es : locale === "de" ? INSIGHT_UI.de : INSIGHT_UI.en;
}

function isoTime(date) {
  return Date.parse(`${date}T00:00:00Z`);
}

function isoDate(time) {
  return new Date(time).toISOString().slice(0, 10);
}

function groupValue(results, partyIds) {
  const values = partyIds.map((id) => results?.[id]).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function pollingSnapshot(polls, pollsterIds, date) {
  const end = isoTime(date);
  const start = end - (45 * DAY);
  const allowed = new Set(pollsterIds);
  const latest = new Map();
  for (const poll of polls) {
    const time = isoTime(poll.date);
    if (time > end) break;
    if (time >= start && allowed.has(poll.pollster)) latest.set(poll.pollster, poll);
  }
  const results = {};
  for (const group of SPAIN_COMPARISON_GROUPS) {
    const values = [...latest.values()].map((poll) => groupValue(poll.results, group.partyIds)).filter(Number.isFinite);
    if (values.length) results[group.id] = values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  return { results, pollsterCount: latest.size, polls: [...latest.values()] };
}

function formatNumber(value, locale, digits = 1) {
  return value.toLocaleString(locale === "es" ? "es-ES" : locale === "de" ? "de-DE" : "en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function comparisonGroups(results) {
  return SPAIN_COMPARISON_GROUPS.map((group) => ({ ...group, value: groupValue(results, group.partyIds) })).filter((group) => Number.isFinite(group.value));
}

function RaceSparkline({ series, locale, text }) {
  if (series.length < 2) return null;
  const width = 520;
  const height = 132;
  const pad = 12;
  const ceiling = Math.max(4, Math.ceil(Math.max(...series.map((point) => Math.abs(point.gap))) / 2) * 2);
  const x = (index) => pad + (index / (series.length - 1)) * (width - (pad * 2));
  const y = (gap) => (height / 2) - ((gap / ceiling) * ((height / 2) - pad));
  const path = series.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(point.gap).toFixed(1)}`).join(" ");
  const final = series.at(-1);
  return (
    <div className="spain-race-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${text.raceTitle}: ${formatNumber(final.gap, locale)} ${text.points}`}>
        <defs><linearGradient id="spain-race-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1479c9" /><stop offset="49%" stopColor="#1479c9" /><stop offset="51%" stopColor="#e0272f" /><stop offset="100%" stopColor="#e0272f" /></linearGradient></defs>
        <line className="race-zero" x1={pad} x2={width - pad} y1={height / 2} y2={height / 2} />
        <path className="race-halo" d={path} />
        <path className="race-line" d={path} />
        <circle cx={x(series.length - 1)} cy={y(final.gap)} r="5" fill={final.gap >= 0 ? "#1479c9" : "#e0272f"} />
      </svg>
      <div><span>{text.psoeLead}</span><span>{text.ppLead}</span></div>
    </div>
  );
}

export function SpainPollingInsights({ locale, pollData, current, latestDate, selectedPollsters, exportControl = null }) {
  const text = insightLanguage(locale);
  const [comparison, setComparison] = useState("election");
  const groups = useMemo(() => SPAIN_COMPARISON_GROUPS.map((group) => ({ ...group, current: groupValue(current.results, group.partyIds) })).filter((group) => Number.isFinite(group.current)), [current.results]);
  const snapshots = useMemo(() => {
    const latestTime = isoTime(latestDate);
    const election = pollData.metadata?.electionResults?.["2023-07-23"] ?? {};
    return {
      election: { results: Object.fromEntries(SPAIN_COMPARISON_GROUPS.map((group) => [group.id, groupValue(election, group.partyIds)])), pollsterCount: null, kind: "election" },
      year: { ...pollingSnapshot(pollData.polls, selectedPollsters, isoDate(latestTime - (365 * DAY))), kind: "average" },
      yearStart: { ...pollingSnapshot(pollData.polls, selectedPollsters, `${new Date(latestTime).getUTCFullYear()}-01-01`), kind: "average" },
    };
  }, [latestDate, pollData, selectedPollsters]);
  const spread = useMemo(() => {
    const snapshot = pollingSnapshot(pollData.polls, selectedPollsters, latestDate);
    return groups.map((group) => {
      const values = snapshot.polls.map((poll) => groupValue(poll.results, group.partyIds)).filter(Number.isFinite);
      return values.length ? { ...group, min: Math.min(...values), max: Math.max(...values), mean: values.reduce((sum, value) => sum + value, 0) / values.length, count: values.length } : null;
    }).filter(Boolean);
  }, [groups, latestDate, pollData.polls, selectedPollsters]);
  const raceSeries = useMemo(() => {
    const dates = [];
    const start = isoTime("2023-07-23");
    const end = isoTime(latestDate);
    const cursor = new Date(start);
    while (cursor.getTime() < end) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    dates.push(latestDate);
    return dates.map((date) => {
      const snapshot = pollingSnapshot(pollData.polls, selectedPollsters, date);
      const pp = snapshot.results.pp;
      const psoe = snapshot.results.psoe;
      return Number.isFinite(pp) && Number.isFinite(psoe) ? { date, gap: pp - psoe } : null;
    }).filter(Boolean);
  }, [latestDate, pollData.polls, selectedPollsters]);
  const activeSnapshot = snapshots[comparison];
  const gap = (groupValue(current.results, ["401"]) ?? 0) - (groupValue(current.results, ["402"]) ?? 0);
  const axisMax = Math.max(40, Math.ceil(Math.max(...spread.map((item) => item.max), 40) / 5) * 5);
  const tabs = [["election", text.election], ["year", text.year], ["yearStart", text.yearStart]];
  return (
    <section id="spain-pulse" className="spain-pulse-section" aria-labelledby="spain-pulse-title">
      <header className="spain-pulse-heading"><div><p className="section-label">{text.eyebrow}</p><h2 id="spain-pulse-title">{text.title}</h2><p>{text.intro}</p></div>{exportControl}</header>
      <div className="spain-pulse-grid">
        <article className="spain-change-card">
          <header><div><span>{text.compare}</span><div className="spain-card-title-row"><h3>{tabs.find(([id]) => id === comparison)?.[1]}</h3><MiniGraphInfo locale={locale} title={text.compare} text={text.changeInfo} /></div></div><div className="spain-period-tabs" data-export-ignore="true">{tabs.map(([id, label]) => <button key={id} type="button" className={comparison === id ? "active" : ""} aria-pressed={comparison === id} onClick={() => setComparison(id)}>{label}</button>)}</div></header>
          <div className="spain-change-list">{groups.map((group) => {
            const baseline = activeSnapshot.results[group.id];
            const delta = Number.isFinite(baseline) ? group.current - baseline : null;
            const extent = Math.min(50, (Math.abs(delta ?? 0) / 12) * 50);
            return <div className="spain-change-row" key={group.id}><span className="party-dot" style={{ background: group.color }} /><strong>{group.name}</strong><div className="delta-track" aria-hidden="true"><i className={delta >= 0 ? "positive" : "negative"} style={{ left: `${delta >= 0 ? 50 : 50 - extent}%`, width: `${extent}%`, background: group.color }} /></div><b>{formatNumber(group.current, locale)}%</b><em className={delta > 0 ? "up" : delta < 0 ? "down" : "flat"}>{Number.isFinite(delta) ? `${delta > 0 ? "+" : ""}${formatNumber(delta, locale)} ${text.points}` : "—"}</em></div>;
          })}</div>
          <footer><span>{activeSnapshot.kind === "election" ? text.electionResult : `${activeSnapshot.pollsterCount} ${text.polls} · ${text.pollingAverage}`}</span><small>{text.combinedNote}</small></footer>
        </article>
        <article className="spain-race-card">
          <span>{text.raceEyebrow}</span><div className="spain-race-summary"><div><div className="spain-card-title-row"><h3>{text.raceTitle}</h3><MiniGraphInfo locale={locale} title={text.raceTitle} text={text.raceInfo} /></div><p>{text.sinceElection}</p></div><strong className={Math.abs(gap) < .15 ? "tied" : gap > 0 ? "pp" : "psoe"}>{Math.abs(gap) < .15 ? "≈ 0" : `${formatNumber(Math.abs(gap), locale)} ${text.points}`}<small>{Math.abs(gap) < .15 ? text.tied : `${gap > 0 ? "PP" : "PSOE"} ${text.ahead}`}</small></strong></div>
          <RaceSparkline series={raceSeries} locale={locale} text={text} />
        </article>
        <article className="spain-agreement-card">
          <header><span>{text.agreementEyebrow}</span><div className="spain-card-title-row"><h3>{text.agreementTitle}</h3><MiniGraphInfo locale={locale} title={text.agreementTitle} text={text.agreementInfo} /></div><p>{text.agreementIntro}</p></header>
          <div className="spain-range-list">{spread.map((item) => <div key={item.id}><div className="range-label"><span className="party-dot" style={{ background: item.color }} /><strong>{item.name}</strong><small>{item.count} {text.polls}</small><b>{formatNumber(item.min, locale)}–{formatNumber(item.max, locale)}%</b></div><div className="range-track"><i style={{ left: `${(item.min / axisMax) * 100}%`, width: `${((item.max - item.min) / axisMax) * 100}%`, background: item.color }} /><span style={{ left: `${(item.mean / axisMax) * 100}%`, borderColor: item.color }} title={`${text.currentAverage}: ${formatNumber(item.mean, locale)}%`} /></div></div>)}</div>
          <footer><span>0%</span><small>{text.spreadNote}</small><span>{axisMax}%</span></footer>
        </article>
      </div>
    </section>
  );
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
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/spain-autonomies.geojson", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then(setMap).catch((error) => { if (error.name !== "AbortError") console.error(error); });
    return () => controller.abort();
  }, []);
  const features = useMemo(() => (map?.features ?? [])
    .filter((feature) => feature?.geometry?.coordinates && !feature.properties?.acom_name?.startsWith("Territorio no asociado"))
    .map((feature) => ({ ...feature, path: coordinatesToPath(feature.geometry.coordinates) })), [map]);
  const activeId = hoveredId ?? selectedId;
  const active = useMemo(() => features.find((feature) => feature.properties?.acom_code === activeId) ?? null, [activeId, features]);
  return (
    <section id="spain-map" className="spain-map-card" aria-labelledby="spain-map-title">
      <header><div><p className="section-label">{text.mapLabel}</p><h2 id="spain-map-title">{text.mapTitle}</h2><p>{text.mapText}</p></div></header>
      <div className="spain-map-layout">
        <svg className="spain-map-svg" viewBox="0 0 710 470" role="img" aria-label={text.mapTitle} onPointerLeave={() => setHoveredId(null)}>
          {features.map((feature) => {
            const id = feature.properties?.acom_code;
            const name = feature.properties?.acom_name_local || feature.properties?.acom_name;
            const isActive = active?.properties?.acom_code === id;
            return <path key={id} d={feature.path} className={isActive ? "active" : ""} tabIndex="0" role="button" aria-label={name} onPointerEnter={() => setHoveredId(id)} onFocus={() => setHoveredId(id)} onBlur={() => setHoveredId(null)} onClick={() => setSelectedId((current) => current === id ? null : id)} />;
          })}
          {active && <path className="active-outline" d={active.path} aria-hidden="true" />}
        </svg>
        <aside className={`spain-map-detail ${active ? "has-selection" : ""}`} aria-live="polite"><span>{active ? text.selected : text.choose}</span><h3>{active?.properties?.acom_name_local || active?.properties?.acom_name || "—"}</h3>{active && <dl><div><dt>{text.coverage}</dt><dd>{text.preparing}</dd></div></dl>}<small>{text.mapDisclaimer}</small></aside>
      </div>
      <p className="spain-map-source">{text.mapSource}: <a href={map?.attribution?.sourceUrl ?? "https://public.opendatasoft.com/explore/dataset/georef-spain-comunidad-autonoma/"} target="_blank" rel="noreferrer">BDLJE · IGN.es / Opendatasoft · CC BY 4.0</a></p>
    </section>
  );
}

const SPAIN_ISSUE_DETAIL = {
  sourceUrl: "https://www.cis.es/es/w/vivienda-preocupacion-barometro-abril-2026",
  studyUrl: "https://www.cis.es/documents/20117/13932083/es3557mar.pdf/ce0bfd41-b61a-1c1c-d930-b1b55b8790b5?t=1778162215842&version=1.0",
  personal: [
    { id: "economy", value: 38.8, color: "#dd6b20" },
    { id: "housing", value: 25.6, color: "#805ad5" },
    { id: "health", value: 19.5, color: "#278a78" },
  ],
  economy: {
    personal: { good: 64.7, regular: 9.9, bad: 24.8 },
    country: { good: 37.1, regular: 7, bad: 52.8 },
  },
  interviews: 4020,
  fieldworkStart: "2026-04-06",
  fieldworkEnd: "2026-04-10",
};

function issuePageLanguage(locale) {
  const labels = locale === "es"
    ? { housing: "Vivienda", economy: "Problemas económicos", jobs: "Calidad del empleo", health: "Sanidad" }
    : locale === "de"
      ? { housing: "Wohnen", economy: "Wirtschaftliche Probleme", jobs: "Qualität der Arbeit", health: "Gesundheitswesen" }
      : { housing: "Housing", economy: "Economic problems", jobs: "Job quality", health: "Healthcare" };
  if (locale === "es") return {
    labels, back: "Volver a España", eyebrow: "Barómetro del CIS · abril de 2026", title: "Qué preocupa a España", intro: "Una lectura compacta de lo que la población menciona como problema del país, lo que le afecta personalmente y cómo valora la economía.",
    national: "Problemas de España", nationalIntro: "Respuestas espontáneas más citadas cuando se pregunta por los principales problemas del país.", personal: "Preocupaciones personales", personalIntro: "Respuestas más citadas cuando se pregunta qué problemas afectan personalmente.",
    chartInfoTitle: "Cómo se obtienen estos porcentajes", chartInfo: "Cada persona podía dar hasta tres respuestas espontáneas. Por eso los porcentajes son menciones y no suman 100. Pollframe muestra las tres respuestas más citadas publicadas por el CIS.",
    gapTitle: "El país y la vida diaria no se perciben igual", gapText: "La vivienda aparece más como problema nacional (41,3 %) que como preocupación personal (25,6 %). Los problemas económicos muestran el patrón inverso: 24,9 % a escala nacional y 38,8 % en lo personal. Son dos preguntas distintas; la diferencia no mide intensidad.",
    economyEyebrow: "Percepción económica", economyTitle: "La economía personal se valora mejor que la del país", personalEconomy: "Situación económica personal", countryEconomy: "Situación económica de España", good: "Buena o muy buena", regular: "Regular", bad: "Mala o muy mala", remainder: "Las categorías mostradas no alcanzan siempre el 100 % por no sabe/no contesta y redondeo.",
    methodTitle: "Qué conviene saber", method: "Barómetro mensual del CIS, estudio 3557. Entrevistas telefónicas a población adulta en España. Los datos describen respuestas en el momento del trabajo de campo y no demuestran por qué cambian las opiniones.", interviews: "entrevistas", fieldwork: "Trabajo de campo", source: "Resultados del CIS", study: "Tabulación completa del estudio",
  };
  if (locale === "de") return {
    labels, back: "Zurück zu Spanien", eyebrow: "CIS-Barometer · April 2026", title: "Was Spanien beschäftigt", intro: "Ein kompakter Blick darauf, was die Bevölkerung als Problem des Landes nennt, was sie persönlich betrifft und wie sie die Wirtschaft einschätzt.",
    national: "Probleme Spaniens", nationalIntro: "Die häufigsten spontanen Antworten auf die Frage nach den wichtigsten Problemen des Landes.", personal: "Persönliche Sorgen", personalIntro: "Die häufigsten Antworten auf die Frage, welche Probleme die Befragten persönlich betreffen.",
    chartInfoTitle: "So entstehen die Prozentwerte", chartInfo: "Jede Person konnte bis zu drei spontane Antworten geben. Die Werte sind daher Nennungen und summieren sich nicht auf 100. Pollframe zeigt die drei vom CIS veröffentlichten häufigsten Antworten.",
    gapTitle: "Land und Alltag werden unterschiedlich wahrgenommen", gapText: "Wohnen wird häufiger als nationales Problem genannt (41,3 %) als als persönliche Sorge (25,6 %). Bei wirtschaftlichen Problemen ist es umgekehrt: 24,9 % national und 38,8 % persönlich. Es sind zwei unterschiedliche Fragen; die Differenz misst keine Stärke.",
    economyEyebrow: "Wirtschaftliche Wahrnehmung", economyTitle: "Die eigene Wirtschaftslage wird besser bewertet als die des Landes", personalEconomy: "Eigene wirtschaftliche Lage", countryEconomy: "Wirtschaftslage Spaniens", good: "Gut oder sehr gut", regular: "Mittelmäßig", bad: "Schlecht oder sehr schlecht", remainder: "Die gezeigten Kategorien erreichen wegen Weiß nicht/keine Angabe und Rundung nicht immer 100 %.",
    methodTitle: "Was man wissen sollte", method: "Monatliches CIS-Barometer, Studie 3557. Telefoninterviews mit Erwachsenen in Spanien. Die Daten beschreiben Antworten zum Befragungszeitpunkt und erklären nicht, warum sich Meinungen verändern.", interviews: "Interviews", fieldwork: "Feldzeit", source: "CIS-Ergebnisse", study: "Vollständige Auswertung der Studie",
  };
  return {
    labels, back: "Back to Spain", eyebrow: "CIS barometer · April 2026", title: "What concerns Spain", intro: "A compact view of what people name as a national problem, what affects them personally and how they judge the economy.",
    national: "Problems facing Spain", nationalIntro: "The most-cited spontaneous answers when people were asked about the country’s main problems.", personal: "Personal concerns", personalIntro: "The most-cited answers when people were asked which problems affect them personally.",
    chartInfoTitle: "How these percentages are produced", chartInfo: "Each person could give up to three spontaneous answers. The figures are therefore mentions and do not add to 100. Pollframe shows the three leading responses published by CIS.",
    gapTitle: "The country and daily life look different", gapText: "Housing is cited more often as a national problem (41.3%) than a personal concern (25.6%). Economic problems show the reverse pattern: 24.9% nationally and 38.8% personally. These are separate questions; the gap is not a measure of intensity.",
    economyEyebrow: "Economic perceptions", economyTitle: "People rate their own finances more positively than the country’s", personalEconomy: "Personal economic situation", countryEconomy: "Spain’s economic situation", good: "Good or very good", regular: "Fair", bad: "Bad or very bad", remainder: "The displayed categories may not reach 100% because of don’t know/no answer responses and rounding.",
    methodTitle: "What to know", method: "Monthly CIS barometer, study 3557. Telephone interviews with adults in Spain. The figures describe answers during the fieldwork period and do not establish why opinions change.", interviews: "interviews", fieldwork: "Fieldwork", source: "CIS results", study: "Full study tables",
  };
}

function ConcernBars({ locale, title, intro, items, labels, info }) {
  const maximum = Math.max(...items.map((item) => item.value));
  return (
    <article className="spain-concern-panel">
      <header><div><h2>{title}</h2><p>{intro}</p></div><MiniGraphInfo locale={locale} title={info.title} text={info.text} /></header>
      <div className="spain-concern-ranking">{items.map((item, index) => <div key={item.id}><b>{index + 1}</b><span>{labels[item.id] ?? item.label}</span><div><i style={{ width: `${(item.value / maximum) * 100}%`, background: item.color }} /></div><strong>{formatNumber(item.value, locale)}%</strong></div>)}</div>
    </article>
  );
}

function EconomicPerception({ label, values, text, locale }) {
  const total = values.good + values.regular + values.bad;
  return (
    <div className="economic-perception-row">
      <div><strong>{label}</strong><span>{formatNumber(values.good, locale)}% {text.good}</span></div>
      <div className="economic-perception-bar" aria-label={`${label}: ${formatNumber(values.good, locale)}% ${text.good}, ${formatNumber(values.regular, locale)}% ${text.regular}, ${formatNumber(values.bad, locale)}% ${text.bad}`}>
        <i className="good" style={{ width: `${(values.good / total) * 100}%` }} /><i className="regular" style={{ width: `${(values.regular / total) * 100}%` }} /><i className="bad" style={{ width: `${(values.bad / total) * 100}%` }} />
      </div>
      <div className="economic-perception-legend"><span><i className="good" />{text.good} <b>{formatNumber(values.good, locale)}%</b></span><span><i className="regular" />{text.regular} <b>{formatNumber(values.regular, locale)}%</b></span><span><i className="bad" />{text.bad} <b>{formatNumber(values.bad, locale)}%</b></span></div>
    </div>
  );
}

export function SpainIssuesPage({ locale, summary, formatDate, numberLocale }) {
  const text = issuePageLanguage(locale);
  const national = summary.issues.items;
  const info = { title: text.chartInfoTitle, text: text.chartInfo };
  const fieldwork = `${formatDate(SPAIN_ISSUE_DETAIL.fieldworkStart, locale, { year: true })} – ${formatDate(SPAIN_ISSUE_DETAIL.fieldworkEnd, locale, { year: true })}`;
  return (
    <main id="top" className="germany-country-overview spain-country-overview spain-issues-page">
      <nav className="region-breadcrumb country-breadcrumb" aria-label="Navigation"><a href="/?country=es">← {text.back}</a></nav>
      <section className="spain-issues-hero"><div><p className="section-label">{text.eyebrow}</p><h1>{text.title}</h1><p>{text.intro}</p></div><aside><span>{formatDate(summary.issues.date, locale, { year: true })}</span><strong>{SPAIN_ISSUE_DETAIL.interviews.toLocaleString(numberLocale)}</strong><small>{text.interviews}</small></aside></section>
      <section className="spain-concern-grid" aria-label={text.title}>
        <ConcernBars locale={locale} title={text.national} intro={text.nationalIntro} items={national} labels={text.labels} info={info} />
        <ConcernBars locale={locale} title={text.personal} intro={text.personalIntro} items={SPAIN_ISSUE_DETAIL.personal} labels={text.labels} info={info} />
      </section>
      <aside className="spain-concern-insight"><span>01</span><div><h2>{text.gapTitle}</h2><p>{text.gapText}</p></div></aside>
      <section className="spain-economy-panel">
        <header><div><p className="section-label">{text.economyEyebrow}</p><h2>{text.economyTitle}</h2></div><MiniGraphInfo locale={locale} title={text.economyTitle} text={text.remainder} /></header>
        <EconomicPerception label={text.personalEconomy} values={SPAIN_ISSUE_DETAIL.economy.personal} text={text} locale={locale} />
        <EconomicPerception label={text.countryEconomy} values={SPAIN_ISSUE_DETAIL.economy.country} text={text} locale={locale} />
        <small>{text.remainder}</small>
      </section>
      <section className="spain-issues-method"><div><p className="section-label">CIS · 3557</p><h2>{text.methodTitle}</h2><p>{text.method}</p></div><dl><div><dt>{text.fieldwork}</dt><dd>{fieldwork}</dd></div><div><dt>{text.interviews}</dt><dd>{SPAIN_ISSUE_DETAIL.interviews.toLocaleString(numberLocale)}</dd></div></dl><nav><a href={SPAIN_ISSUE_DETAIL.sourceUrl} target="_blank" rel="noreferrer">{text.source} ↗</a><a href={SPAIN_ISSUE_DETAIL.studyUrl} target="_blank" rel="noreferrer">{text.study} ↗</a></nav></section>
    </main>
  );
}

export function SpainCountryOverview({ locale, summary, formatDate, numberLocale }) {
  const text = language(locale);
  const congress = summary.congress;
  const issueMax = Math.max(...summary.issues.items.map((item) => item.value));
  const issueLabels = {
    housing: locale === "es" ? "Vivienda" : locale === "de" ? "Wohnen" : "Housing",
    economy: locale === "es" ? "Crisis económica" : locale === "de" ? "Wirtschaftslage" : "Economic situation",
    jobs: locale === "es" ? "Calidad del empleo" : locale === "de" ? "Qualität der Arbeit" : "Job quality",
  };
  return (
    <main id="top" className="germany-country-overview spain-country-overview">
      <nav className="region-breadcrumb country-breadcrumb" aria-label="Navigation"><strong>España</strong></nav>
      <section className="germany-country-hero spain-country-hero"><div><div className="eyebrow"><span />{text.label}</div><h1>🇪🇸 {text.title}</h1><p>{text.intro}</p></div></section>
      <section className="spain-overview-grid" aria-label={text.title}>
        <a className="spain-polling-entry" href="/?region=spain-congress"><div><span>{text.pollingEyebrow}</span><h2>{text.pollingTitle}</h2><p>{text.pollingText}</p></div><dl><div><dt>{text.polls}</dt><dd>{congress.pollCount.toLocaleString(numberLocale)}</dd></div><div><dt>{text.since}</dt><dd>{congress.firstDate.slice(0, 4)}</dd></div><div><dt>{text.updated}</dt><dd>{formatDate(congress.latestDate, locale)}</dd></div></dl><b aria-hidden="true">→</b></a>
        <a className="spain-issues-card" href="/?country=es&view=spain-issues"><header><span>{text.issuesEyebrow}</span><h2>{text.issuesTitle}</h2><p>{text.issuesText}</p></header><div className="spain-issue-bars">{summary.issues.items.map((item) => <div key={item.id}><span>{issueLabels[item.id] ?? item.label}</span><div><i style={{ width: `${(item.value / issueMax) * 100}%`, background: item.color }} /></div><strong>{item.value.toLocaleString(numberLocale)}%</strong></div>)}</div><footer><span>{text.answers}</span><b>{text.exploreIssues} →</b></footer></a>
      </section>
      <SpainMap locale={locale} />
    </main>
  );
}
