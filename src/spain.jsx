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
    label: "Congreso, temas y territorios", title: "España de un vistazo", intro: "Intención de voto, preocupaciones públicas y territorios, con encuestas y resultados claramente separados.", pollingEyebrow: "Congreso de los Diputados", pollingTitle: "Intención de voto", pollingText: "Media transparente, encuestas individuales, evolución histórica y acontecimientos.", polls: "Encuestas", since: "Desde", updated: "Actualizado", issuesEyebrow: "Barómetro del CIS", issuesTitle: "Qué preocupa a España", issuesText: "Las respuestas espontáneas más citadas en el último barómetro disponible.", mentions: "Menciones", answers: "Hasta 3", source: "Fuente", mapLabel: "17 comunidades + Ceuta y Melilla", mapTitle: "Explorar el territorio", mapText: "Pasa el cursor o toca una comunidad para identificarla. Las series autonómicas solo se publican tras comprobar su cobertura y licencia.", selected: "Seleccionada", choose: "Selecciona una comunidad", coverage: "Estado de datos", preparing: "Serie autonómica en revisión", mapDisclaimer: "Esta vista solo identifica el territorio; no estima intención de voto sin una serie válida.", mapSource: "Geometría", noSum: "No suman 100: cada persona podía citar hasta tres problemas.",
  },
  de: {
    label: "Kongress, Themen und Regionen", title: "Spanien im Überblick", intro: "Wahlabsicht, öffentliche Sorgen und Regionen – Umfragen und Wahlergebnisse bleiben klar getrennt.", pollingEyebrow: "Abgeordnetenkongress", pollingTitle: "Nationale Wahlabsicht", pollingText: "Transparenter Durchschnitt, Einzelumfragen, historischer Verlauf und Ereignisse.", polls: "Umfragen", since: "Seit", updated: "Aktualisiert", issuesEyebrow: "CIS-Barometer", issuesTitle: "Was Spanien beschäftigt", issuesText: "Die häufigsten spontanen Antworten im jüngsten verfügbaren Barometer.", mentions: "Nennungen", answers: "Bis zu 3", source: "Quelle", mapLabel: "17 Gemeinschaften + Ceuta und Melilla", mapTitle: "Regionen erkunden", mapText: "Bewege den Mauszeiger über eine Region oder tippe sie an. Autonome Reihen erscheinen erst nach Prüfung von Abdeckung und Lizenz.", selected: "Ausgewählt", choose: "Region auswählen", coverage: "Datenstatus", preparing: "Autonome Reihe in Prüfung", mapDisclaimer: "Diese Ansicht identifiziert nur die Region; ohne belastbare Reihe wird keine Wahlabsicht geschätzt.", mapSource: "Kartengeometrie", noSum: "Die Werte summieren sich nicht auf 100: Jede Person konnte bis zu drei Probleme nennen.",
  },
  en: {
    label: "Congress, issues and territories", title: "Spain at a glance", intro: "Voting intention, public concerns and territories, with polls and election results kept clearly separate.", pollingEyebrow: "Congress of Deputies", pollingTitle: "National voting intention", pollingText: "A transparent average, individual polls, historical movement and events.", polls: "Polls", since: "Since", updated: "Updated", issuesEyebrow: "CIS barometer", issuesTitle: "What concerns Spain", issuesText: "The most-cited spontaneous answers in the latest available barometer.", mentions: "Mentions", answers: "Up to 3", source: "Source", mapLabel: "17 communities + Ceuta and Melilla", mapTitle: "Explore the territory", mapText: "Hover over or tap a community to identify it. Regional series appear only after coverage and licensing checks.", selected: "Selected", choose: "Select a community", coverage: "Data status", preparing: "Regional series under review", mapDisclaimer: "This view only identifies the territory; it does not estimate voting intention without a valid series.", mapSource: "Map geometry", noSum: "The values do not add to 100: each person could name up to three issues.",
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
        <article className="spain-issues-card"><header><span>{text.issuesEyebrow}</span><h2>{text.issuesTitle}</h2><p>{text.issuesText}</p></header><div className="spain-issue-bars">{summary.issues.items.map((item) => <div key={item.id}><span>{issueLabels[item.id] ?? item.label}</span><div><i style={{ width: `${(item.value / issueMax) * 100}%`, background: item.color }} /></div><strong>{item.value.toLocaleString(numberLocale)}%</strong></div>)}</div><footer><span>{text.answers}</span><a href={summary.issues.sourceUrl} target="_blank" rel="noreferrer">CIS ↗</a></footer></article>
      </section>
      <SpainMap locale={locale} />
    </main>
  );
}
