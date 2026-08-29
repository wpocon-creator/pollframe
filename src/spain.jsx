import React, { useEffect, useMemo, useRef, useState } from "react";
import { PartyInfoButton, regionalSpainPartyProfile } from "./party-profiles.jsx";
import { useDismissOnlyDetails } from "./pollframe-ui.jsx";
import { PngExportButton } from "./png-export-button.jsx";

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
  { id: "es-madrid-attacks", category: "spain-crisis", date: "2004-03-11", de: "Anschläge von Madrid", en: "Madrid train bombings", es: "Atentados de Madrid", shortDe: "Anschläge Madrid", shortEn: "Madrid attacks", shortEs: "11-M", detailDe: "Bombenanschläge auf Pendlerzüge in Madrid fordern 193 Todesopfer.", detailEn: "Bomb attacks on commuter trains in Madrid killed 193 people.", detailEs: "Los atentados contra trenes de cercanías en Madrid causaron 193 víctimas mortales.", source: "https://www.lamoncloa.gob.es/presidente/actividades/paginas/2021/110321-sanchez-victimas.aspx" },
  { id: "es-election-2004", category: "spain-election", date: "2004-03-14", de: "Parlamentswahl 2004", en: "2004 general election", es: "Elecciones generales de 2004", shortDe: "Wahl 2004", shortEn: "2004 election", shortEs: "Elecciones 2004", detailDe: "Wahl zu den Cortes Generales.", detailEn: "Election to the Cortes Generales.", detailEs: "Elección a las Cortes Generales.", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/" },
  { id: "es-election-2008", category: "spain-election", date: "2008-03-09", de: "Parlamentswahl 2008", en: "2008 general election", es: "Elecciones generales de 2008", shortDe: "Wahl 2008", shortEn: "2008 election", shortEs: "Elecciones 2008", detailDe: "Wahl zu den Cortes Generales.", detailEn: "Election to the Cortes Generales.", detailEs: "Elección a las Cortes Generales.", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/" },
  { id: "es-financial-crisis", category: "global", date: "2008-09-15", globalKey: "financial-crisis-2008", de: "Globale Finanzkrise", en: "Global financial crisis", es: "Crisis financiera mundial", shortDe: "Finanzkrise", shortEn: "Financial crisis", shortEs: "Crisis financiera", detailDe: "Die Insolvenz von Lehman Brothers markiert eine Eskalation der weltweiten Finanzkrise.", detailEn: "The collapse of Lehman Brothers marked an escalation of the global financial crisis.", detailEs: "La quiebra de Lehman Brothers marcó una escalada de la crisis financiera mundial.", source: "https://www.ecb.europa.eu/press/key/date/2009/html/sp090122.en.html" },
  { id: "es-eta-end", category: "spain-politics", date: "2011-10-20", de: "ETA beendet bewaffnete Aktivitäten", en: "ETA ends armed activity", es: "ETA cesa su actividad armada", shortDe: "Ende ETA-Gewalt", shortEn: "ETA ends violence", shortEs: "Fin de ETA", detailDe: "ETA erklärt die endgültige Beendigung ihrer bewaffneten Aktivitäten.", detailEn: "ETA announced the definitive end of its armed activity.", detailEs: "ETA anunció el cese definitivo de su actividad armada.", source: "https://www.lamoncloa.gob.es/presidente/intervenciones/paginas/2011/prdi20111020.aspx" },
  { id: "es-election-2011", category: "spain-election", date: "2011-11-20", de: "Parlamentswahl 2011", en: "2011 general election", es: "Elecciones generales de 2011", shortDe: "Wahl 2011", shortEn: "2011 election", shortEs: "Elecciones 2011", detailDe: "Wahl zu den Cortes Generales.", detailEn: "Election to the Cortes Generales.", detailEs: "Elección a las Cortes Generales.", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/" },
  { id: "es-abdication-2014", category: "spain-politics", date: "2014-06-02", de: "Juan Carlos I. kündigt Abdankung an", en: "Juan Carlos I announces abdication", es: "Juan Carlos I anuncia su abdicación", shortDe: "Abdankung", shortEn: "Abdication", shortEs: "Abdicación", detailDe: "König Juan Carlos I. kündigt seine Abdankung an; Felipe VI. folgt ihm im Juni.", detailEn: "King Juan Carlos I announced his abdication; Felipe VI succeeded him later that month.", detailEs: "El rey Juan Carlos I anunció su abdicación; Felipe VI le sucedió ese mismo mes.", source: "https://www.boe.es/buscar/doc.php?id=BOE-A-2014-6476" },
  { id: "es-election-2015", category: "spain-election", date: "2015-12-20", de: "Parlamentswahl 2015", en: "2015 general election", es: "Elecciones generales de 2015", shortDe: "Wahl 2015", shortEn: "2015 election", shortEs: "Elecciones 2015", detailDe: "Wahl zu den Cortes Generales; erstmals entsteht keine tragfähige Regierungsmehrheit.", detailEn: "Election to the Cortes Generales; no viable governing majority emerged.", detailEs: "Elección a las Cortes Generales; no surgió una mayoría de gobierno viable.", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/" },
  { id: "es-election-2016", category: "spain-election", date: "2016-06-26", de: "Parlamentswahl 2016", en: "2016 general election", es: "Elecciones generales de 2016", shortDe: "Wahl 2016", shortEn: "2016 election", shortEs: "Elecciones 2016", detailDe: "Vorgezogene Neuwahl zu den Cortes Generales.", detailEn: "A repeat election to the Cortes Generales.", detailEs: "Repetición electoral a las Cortes Generales.", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/" },
  { id: "es-catalonia-155", category: "spain-politics", date: "2017-10-27", de: "Artikel 155 in Katalonien", en: "Article 155 applied in Catalonia", es: "Aplicación del artículo 155 en Cataluña", shortDe: "Artikel 155", shortEn: "Article 155", shortEs: "Artículo 155", detailDe: "Der Senat billigt Maßnahmen nach Artikel 155; die katalanische Regierung wird abgesetzt und eine Regionalwahl angesetzt.", detailEn: "The Senate authorised Article 155 measures; Catalonia's government was dismissed and a regional election called.", detailEs: "El Senado autorizó las medidas del artículo 155; se cesó al Govern y se convocaron elecciones autonómicas.", source: "https://www.boe.es/eli/es/rd/2017/10/27/946" },
  { id: "es-no-confidence-2018", category: "spain-politics", date: "2018-06-01", de: "Misstrauensvotum gegen Rajoy", en: "No-confidence vote removes Rajoy", es: "Moción de censura contra Rajoy", shortDe: "Misstrauensvotum", shortEn: "No-confidence vote", shortEs: "Moción de censura", detailDe: "Der Kongress nimmt das Misstrauensvotum an; Pedro Sánchez erhält das Vertrauen der Kammer.", detailEn: "Congress passed the no-confidence motion and granted Pedro Sánchez its confidence.", detailEs: "El Congreso aprobó la moción de censura y otorgó su confianza a Pedro Sánchez.", source: "https://www.congreso.es/es/notas-de-prensa?_notasprensa_mvcPath=detalle&_notasprensa_notaId=28789&p_p_id=notasprensa" },
  { id: "es-election-2019-apr", category: "spain-election", date: "2019-04-28", de: "Parlamentswahl April 2019", en: "April 2019 general election", es: "Elecciones generales de abril de 2019", shortDe: "Wahl Apr. 2019", shortEn: "Apr 2019 election", shortEs: "Elecciones abr. 2019", detailDe: "Wahl zu den Cortes Generales.", detailEn: "Election to the Cortes Generales.", detailEs: "Elección a las Cortes Generales.", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/" },
  { id: "es-election-2019-nov", category: "spain-election", date: "2019-11-10", de: "Parlamentswahl November 2019", en: "November 2019 general election", es: "Elecciones generales de noviembre de 2019", shortDe: "Wahl Nov. 2019", shortEn: "Nov 2019 election", shortEs: "Elecciones nov. 2019", detailDe: "Erneute Wahl zu den Cortes Generales.", detailEn: "A repeat election to the Cortes Generales.", detailEs: "Repetición electoral a las Cortes Generales.", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/" },
  { id: "es-covid-emergency", category: "spain-crisis", date: "2020-03-14", de: "COVID-Notstand", en: "COVID state of alarm", es: "Estado de alarma por la COVID", shortDe: "COVID-Notstand", shortEn: "COVID emergency", shortEs: "Alarma COVID", detailDe: "Spanien ruft wegen der COVID-19-Pandemie den Alarmzustand aus.", detailEn: "Spain declared a state of alarm in response to the COVID-19 pandemic.", detailEs: "España declaró el estado de alarma ante la pandemia de COVID-19.", source: "https://www.boe.es/eli/es/rd/2020/03/14/463" },
  { id: "es-covid-pandemic", category: "global", date: "2020-03-11", priority: 0, globalKey: "covid-pandemic", de: "WHO stuft COVID-19 als Pandemie ein", en: "WHO characterises COVID-19 as a pandemic", es: "La OMS caracteriza la COVID-19 como pandemia", shortDe: "COVID-19-Pandemie", shortEn: "COVID-19 pandemic", shortEs: "Pandemia de COVID-19", detailDe: "Die WHO bezeichnete den weltweiten COVID-19-Ausbruch als Pandemie.", detailEn: "The WHO characterised the worldwide COVID-19 outbreak as a pandemic.", detailEs: "La OMS caracterizó el brote mundial de COVID-19 como una pandemia.", source: "https://www.who.int/news-room/speeches/item/who-director-general-s-opening-remarks-at-the-media-briefing-on-covid-19---11-march-2020" },
  { id: "es-ukraine-invasion", category: "global", date: "2022-02-24", priority: 0, globalKey: "ukraine-invasion", de: "Russlands Großinvasion der Ukraine", en: "Russia invades Ukraine", es: "Invasión rusa de Ucrania", shortDe: "Ukraine-Invasion", shortEn: "Ukraine invasion", shortEs: "Invasión de Ucrania", detailDe: "Russland beginnt seine großangelegte Invasion der Ukraine.", detailEn: "Russia began its full-scale invasion of Ukraine.", detailEs: "Rusia inició su invasión a gran escala de Ucrania.", source: "https://www.consilium.europa.eu/en/policies/eu-response-russia-military-aggression-against-ukraine/" },
  { id: "es-israel-gaza", category: "global", date: "2023-10-07", globalKey: "israel-gaza-war", de: "Hamas-Angriff auf Israel und Gaza-Krieg", en: "Hamas attack on Israel and Gaza war", es: "Ataque de Hamás contra Israel y guerra de Gaza", shortDe: "7. Oktober / Gaza", shortEn: "7 October / Gaza", shortEs: "7 de octubre / Gaza", detailDe: "Der Großangriff der Hamas auf Israel und die folgende israelische Militäroperation markierten eine neue Phase des Konflikts.", detailEn: "The large-scale Hamas attack on Israel and subsequent Israeli military operation marked a new phase of the conflict.", detailEs: "El ataque a gran escala de Hamás contra Israel y la posterior operación militar israelí marcaron una nueva fase del conflicto.", source: "https://www.un.org/unispal/document/october-2023-monthly-bulletin/" },
  { id: "es-us-election-2024", category: "global", date: "2024-11-05", priority: 2, editorialOmit: true, globalKey: "us-election-2024", de: "Donald Trump gewinnt die US-Präsidentschaftswahl", en: "Donald Trump wins the US presidential election", es: "Donald Trump gana las elecciones presidenciales de Estados Unidos", shortDe: "US-Wahl 2024", shortEn: "2024 US election", shortEs: "Elecciones de EE. UU. 2024", detailDe: "Donald Trump gewann die Präsidentschaftswahl und kehrte im Januar 2025 ins Weiße Haus zurück.", detailEn: "Donald Trump won the presidential election and returned to the White House in January 2025.", detailEs: "Donald Trump ganó las elecciones presidenciales y regresó a la Casa Blanca en enero de 2025.", source: "https://www.archives.gov/electoral-college/2024" },
  { id: "es-hormuz-oil-crisis", category: "global", date: "2026-03-13", priority: 0, globalKey: "hormuz-oil-crisis", de: "Ölpreiskrise nach Sperrung der Straße von Hormus", en: "Oil-price crisis after Strait of Hormuz closure", es: "Crisis del petróleo tras el cierre del estrecho de Ormuz", shortDe: "Hormus-Ölkrise", shortEn: "Hormuz oil shock", shortEs: "Crisis del petróleo", detailDe: "Die faktische Sperrung der wichtigen Schifffahrtsroute ließ die Energie- und Kraftstoffpreise steigen.", detailEn: "The effective closure of the major shipping route pushed up energy and fuel prices.", detailEs: "El cierre efectivo de esta importante ruta marítima hizo subir los precios de la energía y los combustibles.", source: "https://www.bundesregierung.de/breg-de/service/newsletter-und-abos/bundesregierung-aktuell/ausgabe-10-2026-maerz-13-2410162?view=renderNewsletterHtml" },
  { id: "es-snap-election-called", category: "spain-politics", date: "2023-05-29", de: "Vorgezogene Wahl angekündigt", en: "Snap election called", es: "Convocatoria electoral anticipada", shortDe: "Wahl angekündigt", shortEn: "Election called", shortEs: "Elecciones convocadas", detailDe: "Pedro Sánchez kündigt die Auflösung des Parlaments und eine Wahl am 23. Juli an.", detailEn: "Pedro Sánchez announced the dissolution of parliament and an election for 23 July.", detailEs: "Pedro Sánchez anunció la disolución de las Cortes y elecciones para el 23 de julio.", source: "https://www.lamoncloa.gob.es/presidente/actividades/Paginas/2023/290523-sanchez-declaracion-institucional.aspx" },
  { id: "es-election-2023", category: "spain-election", date: "2023-07-23", de: "Parlamentswahl 2023", en: "2023 general election", es: "Elecciones generales de 2023", shortDe: "Wahl 2023", shortEn: "2023 election", shortEs: "Elecciones 2023", detailDe: "Wahl zum Abgeordnetenkongress und Senat.", detailEn: "Election to the Congress of Deputies and Senate.", detailEs: "Elección al Congreso de los Diputados y al Senado.", source: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-18907" },
  { id: "es-feijoo-vote", category: "spain-politics", date: "2023-09-29", de: "Feijóos Investitur scheitert", en: "Feijóo investiture fails", es: "Investidura fallida de Feijóo", shortDe: "Investitur Feijóo", shortEn: "Feijóo vote", shortEs: "Investidura Feijóo", detailDe: "Der Kongress erteilt Alberto Núñez Feijóo nicht das Vertrauen.", detailEn: "Congress did not grant Alberto Núñez Feijóo its confidence.", detailEs: "El Congreso no otorgó su confianza a Alberto Núñez Feijóo.", source: "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaPrensaId=44837" },
  { id: "es-sanchez-investiture", category: "spain-politics", date: "2023-11-16", de: "Sánchez wiedergewählt", en: "Sánchez re-elected", es: "Sánchez, reelegido", shortDe: "Investitur Sánchez", shortEn: "Sánchez vote", shortEs: "Investidura Sánchez", detailDe: "Der Kongress wählt Pedro Sánchez im ersten Wahlgang mit absoluter Mehrheit zum Ministerpräsidenten.", detailEn: "Congress elected Pedro Sánchez prime minister by absolute majority in the first ballot.", detailEs: "El Congreso eligió a Pedro Sánchez presidente del Gobierno por mayoría absoluta en primera votación.", source: "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaPrensaId=45350" },
  { id: "es-amnesty-law", category: "spain-politics", date: "2024-05-30", de: "Amnestiegesetz verabschiedet", en: "Amnesty law approved", es: "Aprobación de la ley de amnistía", shortDe: "Amnestiegesetz", shortEn: "Amnesty law", shortEs: "Ley de amnistía", detailDe: "Der Kongress verabschiedet das Amnestiegesetz nach Aufhebung des Vetos des Senats.", detailEn: "Congress gave final approval to the amnesty law after overriding the Senate's veto.", detailEs: "El Congreso aprobó definitivamente la ley de amnistía tras levantar el veto del Senado.", source: "https://www.congreso.es/gl/notas-de-prensa?_notasprensa_mvcPath=detalle&_notasprensa_notaId=46873&p_p_id=notasprensa" },
  { id: "es-eu-election-2024", category: "europe", date: "2024-06-09", de: "Europawahl 2024", en: "2024 European election", es: "Elecciones europeas de 2024", shortDe: "Europawahl", shortEn: "EU election", shortEs: "Elecciones UE", detailDe: "Wahl der spanischen Mitglieder des Europäischen Parlaments.", detailEn: "Election of Spain's members of the European Parliament.", detailEs: "Elección de los miembros españoles del Parlamento Europeo.", source: "https://results.elections.europa.eu/en/spain/" },
  { id: "es-valencia-floods", category: "spain-crisis", date: "2024-10-29", de: "Flutkatastrophe in Valencia", en: "Valencia floods", es: "DANA de Valencia", shortDe: "Flut Valencia", shortEn: "Valencia floods", shortEs: "DANA Valencia", detailDe: "Schwere Überschwemmungen treffen vor allem die Provinz Valencia.", detailEn: "Severe flooding struck mainly the province of Valencia.", detailEs: "Graves inundaciones afectaron principalmente a la provincia de Valencia.", source: "https://www.lamoncloa.gob.es/info-dana/paginas/2024/051124-informacion-ayudas.aspx" },
  { id: "es-iberian-blackout", category: "spain-crisis", date: "2025-04-28", de: "Stromausfall auf der Iberischen Halbinsel", en: "Iberian power outage", es: "Apagón ibérico", shortDe: "Stromausfall", shortEn: "Power outage", shortEs: "Apagón", detailDe: "Ein großflächiger Stromausfall trifft Spanien und Portugal.", detailEn: "A widespread power outage affected Spain and Portugal.", detailEs: "Un apagón generalizado afectó a España y Portugal.", source: "https://www.lamoncloa.gob.es/presidente/intervenciones/Paginas/2025/20250428-sanchez-reunion-consej-seguridad-nacional.aspx" },
  { id: "es-cerdan-resignation", category: "spain-politics", date: "2025-06-12", de: "PSOE-Organisationssekretär tritt zurück", en: "PSOE organisation secretary resigns", es: "Dimite el secretario de Organización del PSOE", shortDe: "PSOE-Rücktritt", shortEn: "PSOE resignation", shortEs: "Dimisión en el PSOE", detailDe: "Santos Cerdán legt nach Korruptionsvorwürfen seine Parteiämter und sein Abgeordnetenmandat nieder; die Vorwürfe waren zu diesem Zeitpunkt nicht gerichtlich entschieden.", detailEn: "Santos Cerdán resigned his party posts and parliamentary seat following corruption allegations; the allegations had not been adjudicated at the time.", detailEs: "Santos Cerdán dimitió de sus cargos en el partido y de su escaño tras acusaciones de corrupción; las acusaciones no habían sido juzgadas en ese momento.", source: "https://efe.com/espana/2025-06-12/santos-cerdan-dimision-psoe-acta-diputado/" },
  { id: "es-15m", category: "spain-politics", date: "2011-05-15", priority: 0, de: "Beginn der 15-M-Proteste", en: "15-M protest movement begins", es: "Comienza el movimiento 15-M", shortDe: "15-M-Proteste", shortEn: "15-M movement", shortEs: "Movimiento 15-M", detailDe: "Proteste und Platzbesetzungen der Indignados machten politische Repräsentation, Arbeitslosigkeit und die Folgen der Krise zu zentralen öffentlichen Themen.", detailEn: "The Indignados protests and square occupations put political representation, unemployment and the effects of the crisis at the centre of public debate.", detailEs: "Las protestas y acampadas de los indignados situaron la representación política, el paro y los efectos de la crisis en el centro del debate público.", source: "https://www.lamoncloa.gob.es/consejodeministros/Paginas/enlacetranscripciones/170611rpcmrespuestas.aspx" },
  { id: "es-bank-assistance", category: "spain-crisis", date: "2012-06-25", priority: 0, de: "Spanien beantragt Hilfen für den Bankensektor", en: "Spain requests bank-sector assistance", es: "España solicita ayuda para el sector bancario", shortDe: "Bankenhilfen 2012", shortEn: "Bank assistance", shortEs: "Ayuda bancaria", detailDe: "Spanien beantragte europäische Finanzhilfen zur Rekapitalisierung und Restrukturierung seines Bankensektors.", detailEn: "Spain requested European financial assistance to recapitalise and restructure its banking sector.", detailEs: "España solicitó asistencia financiera europea para recapitalizar y reestructurar su sector bancario.", source: "https://economy-finance.ec.europa.eu/eu-financial-assistance/euro-area-countries/financial-assistance-spain_en" },
];

const UI = {
  es: {
    label: "Congreso, temas y territorios", title: "España de un vistazo", intro: "Encuestas electorales e intención de voto, preocupaciones públicas y territorios, con encuestas y resultados claramente separados.", pollingEyebrow: "Congreso de los Diputados", pollingTitle: "Encuestas electorales: intención de voto", pollingText: "Media transparente, encuestas individuales, evolución histórica y acontecimientos.", polls: "Encuestas", since: "Desde", updated: "Actualizado", issuesEyebrow: "Barómetro del CIS", issuesTitle: "Qué preocupa a España", issuesText: "Las respuestas espontáneas más citadas en el último barómetro disponible.", mentions: "Menciones", answers: "Hasta 3 menciones por persona", source: "Fuente", exploreIssues: "Explorar los datos", mapLabel: "17 comunidades + Ceuta y Melilla", mapTitle: "Explorar el territorio", mapText: "El color muestra la primera fuerza en las últimas elecciones autonómicas. Pasa el cursor o toca una comunidad para abrir sus datos.", selected: "Seleccionada", choose: "Selecciona una comunidad", coverage: "Estado de datos", preparing: "Serie autonómica en revisión", mapDisclaimer: "Los colores son resultados electorales, no una estimación de intención de voto actual.", mapSource: "Geometría", noSum: "No suman 100: cada persona podía citar hasta tres problemas.",
  },
  de: {
    label: "Kongress, Themen und Regionen", title: "Spanien im Überblick", intro: "Aktuelle Wahlumfragen und Wahlabsicht, öffentliche Sorgen und Regionen – Umfragen und Wahlergebnisse bleiben klar getrennt.", pollingEyebrow: "Abgeordnetenkongress", pollingTitle: "Aktuelle Wahlumfragen: nationale Wahlabsicht", pollingText: "Transparenter Durchschnitt, Einzelumfragen, historischer Verlauf und Ereignisse.", polls: "Umfragen", since: "Seit", updated: "Aktualisiert", issuesEyebrow: "CIS-Barometer", issuesTitle: "Was Spanien beschäftigt", issuesText: "Die häufigsten spontanen Antworten im jüngsten verfügbaren Barometer.", mentions: "Nennungen", answers: "Bis zu 3 Nennungen pro Person", source: "Quelle", exploreIssues: "Daten genauer ansehen", mapLabel: "17 Gemeinschaften + Ceuta und Melilla", mapTitle: "Regionen erkunden", mapText: "Die Farbe zeigt die stärkste Kraft bei der letzten Regionalwahl. Fahre über eine Region oder tippe sie an, um ihre Daten zu öffnen.", selected: "Ausgewählt", choose: "Region auswählen", coverage: "Datenstatus", preparing: "Autonome Reihe in Prüfung", mapDisclaimer: "Die Farben zeigen Wahlergebnisse, keine Schätzung der aktuellen Wahlabsicht.", mapSource: "Kartengeometrie", noSum: "Die Werte summieren sich nicht auf 100: Jede Person konnte bis zu drei Probleme nennen.",
  },
  en: {
    label: "Congress, issues and territories", title: "Spain at a glance", intro: "Latest election polls and voting intention, public concerns and territories, with polls and election results kept clearly separate.", pollingEyebrow: "Congress of Deputies", pollingTitle: "Latest election polls: voting intention", pollingText: "A transparent average, individual polls, historical movement and events.", polls: "Polls", since: "Since", updated: "Updated", issuesEyebrow: "CIS barometer", issuesTitle: "What concerns Spain", issuesText: "The most-cited spontaneous answers in the latest available barometer.", mentions: "Mentions", answers: "Up to 3 mentions per person", source: "Source", exploreIssues: "Explore the data", mapLabel: "17 communities + Ceuta and Melilla", mapTitle: "Explore the territory", mapText: "Colour shows the largest party at the last regional election. Hover over or tap a community to open its data.", selected: "Selected", choose: "Select a community", coverage: "Data status", preparing: "Regional series under review", mapDisclaimer: "Colours show election results, not an estimate of current voting intention.", mapSource: "Map geometry", noSum: "The values do not add to 100: each person could name up to three issues.",
  },
};

function language(locale) {
  return locale === "es" ? UI.es : locale === "de" ? UI.de : UI.en;
}

function MiniGraphInfo({ locale, title, text, paragraphs, dataDate = null }) {
  const label = locale === "es" ? "Cómo leer este gráfico" : locale === "de" ? "So wird diese Grafik gelesen" : "How to read this chart";
  const close = locale === "es" ? "Cerrar explicación" : locale === "de" ? "Erklärung schließen" : "Close explanation";
  const status = locale === "es" ? "Fecha de los datos" : locale === "de" ? "Datenstand" : "Data status";
  const closePopover = (event) => event.currentTarget.closest("details")?.removeAttribute("open");
  return (
    <details className="graph-info-popover graph-info-compact" data-export-ignore="true">
      <summary aria-label={label} title={label}><span className="info-glyph" aria-hidden="true">i</span></summary>
      <button className="graph-info-backdrop" type="button" tabIndex="-1" aria-label={close} onClick={closePopover} />
      <div className="graph-info-card" role="dialog" aria-modal="true" aria-label={`${title} · Info`}>
        <header><strong>Info</strong><button type="button" aria-label={close} onClick={closePopover}>×</button></header>
        <p>{(paragraphs ?? [text]).filter(Boolean).join(" ")}</p>
        {dataDate && <p className="graph-info-data-age"><strong>{status}:</strong> {new Intl.DateTimeFormat(locale === "de" ? "de-DE" : locale === "es" ? "es-ES" : "en-GB", { dateStyle: "medium" }).format(new Date(`${dataDate}T12:00:00Z`))} · {dataAgeLabel(dataDate, locale)}</p>}
      </div>
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
    agreementEyebrow: "Comparación de encuestas", agreementTitle: "Dispersión entre institutos", agreementIntro: "Para cada partido, cada instituto aporta solo su encuesta más reciente de los últimos 45 días. Una línea corta significa resultados más parecidos.", polls: "institutos", range: "rango", spreadNote: "Línea: valor más bajo–más alto · punto: media simple. No es un margen de error.",
    changeInfo: "Compara la media actual con el punto de referencia elegido. El valor de la derecha es la diferencia en puntos porcentuales, no el cambio relativo.", raceInfo: "Para cada mes se calcula una media comparable de PP y PSOE. El eje vertical es PP menos PSOE: valores positivos significan ventaja del PP y valores negativos, ventaja del PSOE. Mueva el cursor o toque para ver un mes exacto.", agreementInfo: "Esta vista no mide quién acierta más. Compara las últimas publicaciones disponibles dentro de la misma ventana de 45 días. Para cada partido, la línea va del resultado más bajo al más alto y el punto marca la media simple. Una línea más larga puede reflejar fechas, métodos o muestras distintas; no es un intervalo de confianza ni un margen de error.",
    combinedNote: "Sumar + Podemos se agrupan para mantener una comparación coherente con la candidatura Sumar de 2023.", spreadValue: "puntos de dispersión", axisLabel: "Eje: PP menos PSOE", ppAlwaysAhead: "PP va por delante en todos los puntos mostrados", psoeAlwaysAhead: "PSOE va por delante en todos los puntos mostrados", leadChanged: "La ventaja cambia de partido", exportTitle: "Qué está cambiando en España",
  },
  de: {
    eyebrow: "Schneller Überblick", title: "Was sich gerade verändert", intro: "Drei ergänzende Blicke auf dasselbe Archiv: Bewegung, Abstand der beiden größten Parteien und Übereinstimmung der Institute.",
    compare: "Veränderung seit", election: "Wahl am 23. Juli 2023", year: "Vor 12 Monaten", yearStart: "Jahresbeginn", now: "jetzt", electionResult: "amtliches Ergebnis", pollingAverage: "vergleichbarer Durchschnitt", currentAverage: "Aktueller Durchschnitt", points: "Pkt.",
    raceEyebrow: "Rennen um Platz eins", raceTitle: "Abstand PP–PSOE", ahead: "vorn", tied: "Im Durchschnitt praktisch gleichauf", sinceElection: "Entwicklung des Abstands seit der Wahl 2023", ppLead: "PP vorn", psoeLead: "PSOE vorn",
    agreementEyebrow: "Umfragen vergleichen", agreementTitle: "Streuung zwischen Instituten", agreementIntro: "Für jede Partei zählt je Institut nur die jüngste Umfrage der letzten 45 Tage. Eine kurze Linie bedeutet ähnlichere Ergebnisse.", polls: "Institute", range: "Spanne", spreadNote: "Linie: niedrigster–höchster Wert · Punkt: einfacher Mittelwert. Keine Fehlerspanne.",
    changeInfo: "Verglichen wird der aktuelle Mittelwert mit dem gewählten Ausgangspunkt. Rechts steht die Differenz in Prozentpunkten, nicht die relative Veränderung.", raceInfo: "Für jeden Monat wird ein vergleichbarer Mittelwert für PP und PSOE berechnet. Die Y-Achse zeigt PP minus PSOE: positive Werte sind ein PP-Vorsprung, negative ein PSOE-Vorsprung. Fahre über die Linie oder tippe sie an, um einen Monat genau zu sehen.", agreementInfo: "Diese Ansicht bewertet nicht, welches Institut genauer ist. Sie vergleicht die jüngsten Veröffentlichungen innerhalb desselben 45-Tage-Fensters. Für jede Partei reicht die Linie vom niedrigsten bis zum höchsten Wert; der Punkt ist der einfache Mittelwert. Eine längere Linie kann durch unterschiedliche Feldzeiten, Methoden oder Stichproben entstehen. Sie ist weder Konfidenzintervall noch Fehlerspanne.",
    combinedNote: "Sumar und Podemos werden zusammengefasst, damit der Vergleich mit der gemeinsamen Sumar-Kandidatur von 2023 sinnvoll bleibt.", spreadValue: "Prozentpunkte Streuung", axisLabel: "Achse: PP minus PSOE", ppAlwaysAhead: "PP liegt an jedem gezeigten Messpunkt vorn", psoeAlwaysAhead: "PSOE liegt an jedem gezeigten Messpunkt vorn", leadChanged: "Die Führung wechselt im gezeigten Zeitraum", exportTitle: "Was sich in Spanien verändert",
  },
  en: {
    eyebrow: "Quick read", title: "What is changing", intro: "Three complementary readings of the same archive: movement, the gap between the two largest parties and pollster agreement.",
    compare: "Change since", election: "23 July 2023 election", year: "12 months ago", yearStart: "Start of year", now: "now", electionResult: "official result", pollingAverage: "comparable average", currentAverage: "Current average", points: "pts",
    raceEyebrow: "The race for first place", raceTitle: "PP–PSOE gap", ahead: "ahead", tied: "Effectively level in the average", sinceElection: "How the gap has moved since the 2023 election", ppLead: "PP ahead", psoeLead: "PSOE ahead",
    agreementEyebrow: "Poll comparison", agreementTitle: "Spread between pollsters", agreementIntro: "For each party, every pollster contributes only its latest poll from the last 45 days. A shorter line means more similar results.", polls: "pollsters", range: "range", spreadNote: "Line: lowest–highest result · dot: simple mean. This is not a margin of error.",
    changeInfo: "The current average is compared with the selected baseline. The figure on the right is a percentage-point difference, not a relative change.", raceInfo: "A comparable PP and PSOE average is calculated for each month. The vertical axis is PP minus PSOE: positive values are a PP lead and negative values a PSOE lead. Hover or tap to inspect an exact month.", agreementInfo: "This view does not score which pollster is more accurate. It compares the latest releases available inside the same 45-day window. For each party, the line runs from the lowest to the highest result and the dot marks the simple mean. A longer line can reflect different fieldwork dates, methods or samples; it is neither a confidence interval nor a margin of error.",
    combinedNote: "Sumar and Podemos are grouped to keep the comparison consistent with the joint Sumar candidacy in 2023.", spreadValue: "percentage points spread", axisLabel: "Axis: PP minus PSOE", ppAlwaysAhead: "PP leads at every point shown", psoeAlwaysAhead: "PSOE leads at every point shown", leadChanged: "The lead changes hands in this period", exportTitle: "What is changing in Spain",
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

export function buildSpainPollingInsights(pollData, currentResults, latestDate, selectedPollsters) {
  if (!pollData?.polls?.length || !latestDate) return null;
  const groups = SPAIN_COMPARISON_GROUPS.map((group) => ({
    ...group,
    current: groupValue(currentResults, group.partyIds),
  })).filter((group) => Number.isFinite(group.current));
  const election = pollData.metadata?.electionResults?.["2023-07-23"] ?? {};
  const electionResults = Object.fromEntries(SPAIN_COMPARISON_GROUPS.map((group) => [group.id, groupValue(election, group.partyIds)]));
  const latestSnapshot = pollingSnapshot(pollData.polls, selectedPollsters, latestDate);
  const spread = groups.map((group) => {
    const values = latestSnapshot.polls.map((poll) => groupValue(poll.results, group.partyIds)).filter(Number.isFinite);
    return values.length ? {
      ...group,
      min: Math.min(...values),
      max: Math.max(...values),
      mean: values.reduce((sum, value) => sum + value, 0) / values.length,
      count: values.length,
    } : null;
  }).filter(Boolean);
  const dates = [];
  const end = isoTime(latestDate);
  const cursor = new Date(isoTime("2023-07-23"));
  while (cursor.getTime() < end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  dates.push(latestDate);
  const raceSeries = dates.map((date) => {
    const snapshot = pollingSnapshot(pollData.polls, selectedPollsters, date);
    return Number.isFinite(snapshot.results.pp) && Number.isFinite(snapshot.results.psoe)
      ? { date, gap: snapshot.results.pp - snapshot.results.psoe }
      : null;
  }).filter(Boolean);
  return {
    groups,
    electionResults,
    spread,
    raceSeries,
    gap: (groupValue(currentResults, ["401"]) ?? 0) - (groupValue(currentResults, ["402"]) ?? 0),
  };
}

function formatNumber(value, locale, digits = 1) {
  return value.toLocaleString(locale === "es" ? "es-ES" : locale === "de" ? "de-DE" : "en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function dataAgeLabel(date, locale) {
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(`${date}T00:00:00Z`)) / DAY));
  if (locale === "es") return days === 0 ? "Los datos son de hoy" : `Los datos tienen ${days} ${days === 1 ? "día" : "días"}`;
  if (locale === "de") return days === 0 ? "Die Daten sind von heute" : `Die Daten sind ${days} ${days === 1 ? "Tag" : "Tage"} alt`;
  return days === 0 ? "The data is from today" : `The data is ${days} ${days === 1 ? "day" : "days"} old`;
}

function dataDateLabel(date, locale) {
  if (!date) return "—";
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : locale === "es" ? "es-ES" : "en-GB", { dateStyle: "medium" }).format(new Date(`${date}T12:00:00Z`));
}

function comparisonGroups(results) {
  return SPAIN_COMPARISON_GROUPS.map((group) => ({ ...group, value: groupValue(results, group.partyIds) })).filter((group) => Number.isFinite(group.value));
}

function RaceSparkline({ series, locale, text }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  if (series.length < 2) return null;
  const width = 620;
  const height = 224;
  const left = 42;
  const right = 14;
  const top = 18;
  const bottom = 38;
  const start = isoTime(series[0].date);
  const end = isoTime(series.at(-1).date);
  const span = Math.max(DAY, end - start);
  const gaps = series.map((point) => point.gap);
  const rawMin = Math.min(...gaps);
  const rawMax = Math.max(...gaps);
  const padding = Math.max(1, (rawMax - rawMin) * .18);
  const floor = Math.floor((rawMin - padding) / 2) * 2;
  const ceiling = Math.ceil((rawMax + padding) / 2) * 2;
  const domainSpan = Math.max(2, ceiling - floor);
  const x = (index) => left + ((isoTime(series[index].date) - start) / span) * (width - left - right);
  const y = (gap) => top + ((ceiling - gap) / domainSpan) * (height - top - bottom);
  const path = series.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(point.gap).toFixed(1)}`).join(" ");
  const final = series.at(-1);
  const activeIndex = hoveredIndex ?? series.length - 1;
  const active = series[activeIndex];
  const activeX = x(activeIndex);
  const activeY = y(active.gap);
  const tooltipWidth = 142;
  const tooltipX = Math.min(width - right - tooltipWidth, Math.max(left, activeX - (tooltipWidth / 2)));
  const dateLabel = (date, short = false) => new Intl.DateTimeFormat(locale === "es" ? "es-ES" : locale === "de" ? "de-DE" : "en-GB", short ? { month: "short", year: "2-digit" } : { month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00Z`));
  const tickIndexes = [...new Set([0, Math.round((series.length - 1) / 3), Math.round(((series.length - 1) * 2) / 3), series.length - 1])];
  const yTicks = [floor, floor + (domainSpan / 2), ceiling];
  const allPpAhead = rawMin > 0;
  const allPsoeAhead = rawMax < 0;
  const moveHover = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * width;
    let nearest = 0;
    for (let index = 1; index < series.length; index += 1) if (Math.abs(x(index) - pointerX) < Math.abs(x(nearest) - pointerX)) nearest = index;
    setHoveredIndex(nearest);
  };
  return (
    <div className="spain-race-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${text.raceTitle}: ${formatNumber(final.gap, locale)} ${text.points}`} onPointerMove={moveHover} onPointerDown={moveHover} onPointerLeave={() => setHoveredIndex(null)}>
        <defs><linearGradient id="spain-race-gradient" gradientUnits="userSpaceOnUse" x1="0" y1={top} x2="0" y2={height - bottom}><stop offset="0" stopColor="#1479c9" /><stop offset={`${Math.max(0, Math.min(100, ((ceiling / domainSpan) * 100) - .4))}%`} stopColor="#1479c9" /><stop offset={`${Math.max(0, Math.min(100, ((ceiling / domainSpan) * 100) + .4))}%`} stopColor="#e0272f" /><stop offset="100%" stopColor="#e0272f" /></linearGradient></defs>
        {yTicks.map((value) => <g className="race-grid" key={value}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} /><text x={left - 7} y={y(value) + 4} textAnchor="end">{value > 0 ? "+" : ""}{formatNumber(value, locale, 0)}</text></g>)}
        {floor <= 0 && ceiling >= 0 && <g className="race-zero-axis"><line x1={left} x2={width - right} y1={y(0)} y2={y(0)} /><text x={left - 7} y={y(0) + 4} textAnchor="end">0</text></g>}
        <line className="race-y-axis" x1={left} x2={left} y1={top} y2={height - bottom} />
        {tickIndexes.map((index) => <g className="race-x-tick" key={series[index].date}><line x1={x(index)} x2={x(index)} y1={height - bottom} y2={height - bottom + 4} /><text x={x(index)} y={height - 14} textAnchor={index === 0 ? "start" : index === series.length - 1 ? "end" : "middle"}>{dateLabel(series[index].date, true)}</text></g>)}
        <path className="race-halo" d={path} />
        <path className="race-line" d={path} style={{ stroke: allPpAhead ? "#1479c9" : allPsoeAhead ? "#e0272f" : "url(#spain-race-gradient)" }} />
        <circle cx={x(series.length - 1)} cy={y(final.gap)} r="5" fill={final.gap >= 0 ? "#1479c9" : "#e0272f"} />
        <g className="race-hover" aria-hidden="true"><line x1={activeX} x2={activeX} y1={top} y2={height - bottom} /><circle cx={activeX} cy={activeY} r="5" style={{ fill: active.gap >= 0 ? "#1479c9" : "#e0272f" }} /><rect x={tooltipX} y={top + 4} width={tooltipWidth} height="39" rx="7" /><text x={tooltipX + 9} y={top + 19}>{dateLabel(active.date)}</text><text className="value" x={tooltipX + 9} y={top + 35}>{active.gap >= 0 ? "PP" : "PSOE"} +{formatNumber(Math.abs(active.gap), locale)} {text.points}</text></g>
        <rect className="race-hit-area" x={left} y={top} width={width - left - right} height={height - top - bottom} />
      </svg>
      <div className="spain-race-caption"><span>{text.axisLabel}</span><strong>{allPpAhead ? text.ppAlwaysAhead : allPsoeAhead ? text.psoeAlwaysAhead : text.leadChanged}</strong></div>
    </div>
  );
}

export function SpainPollingInsights({ locale, pollData, current, latestDate, selectedPollsters, exportControl = null }) {
  const text = insightLanguage(locale);
  const [comparison, setComparison] = useState("election");
  const insights = useMemo(() => buildSpainPollingInsights(pollData, current.results, latestDate, selectedPollsters), [pollData, current.results, latestDate, selectedPollsters]);
  const groups = insights?.groups ?? [];
  const snapshots = useMemo(() => {
    const latestTime = isoTime(latestDate);
    return {
      election: { results: insights?.electionResults ?? {}, pollsterCount: null, kind: "election" },
      year: { ...pollingSnapshot(pollData.polls, selectedPollsters, isoDate(latestTime - (365 * DAY))), kind: "average" },
      yearStart: { ...pollingSnapshot(pollData.polls, selectedPollsters, `${new Date(latestTime).getUTCFullYear()}-01-01`), kind: "average" },
    };
  }, [insights, latestDate, pollData.polls, selectedPollsters]);
  const spread = insights?.spread ?? [];
  const raceSeries = insights?.raceSeries ?? [];
  const activeSnapshot = snapshots[comparison];
  const gap = insights?.gap ?? 0;
  const axisMax = Math.max(40, Math.ceil(Math.max(...spread.map((item) => item.max), 40) / 5) * 5);
  const tabs = [["election", text.election], ["year", text.year], ["yearStart", text.yearStart]];
  return (
    <section id="spain-pulse" className="spain-pulse-section" aria-labelledby="spain-pulse-title">
      <header className="spain-pulse-heading"><div><p className="section-label">{text.eyebrow}</p><h2 id="spain-pulse-title">{text.title}</h2><p>{text.intro}</p></div>{exportControl}</header>
      <div className="spain-pulse-grid">
        <article className="spain-change-card">
          <small className="widget-data-age">{dataAgeLabel(latestDate, locale)}</small>
          <header><div className="widget-info-heading"><MiniGraphInfo locale={locale} title={text.compare} text={text.changeInfo} dataDate={latestDate} /><div><span>{text.compare}</span><h3>{tabs.find(([id]) => id === comparison)?.[1]}</h3></div></div><div className="spain-period-tabs" data-export-ignore="true">{tabs.map(([id, label]) => <button key={id} type="button" className={comparison === id ? "active" : ""} aria-pressed={comparison === id} onClick={() => setComparison(id)}>{label}</button>)}</div></header>
          <div className="spain-change-list">{groups.map((group) => {
            const baseline = activeSnapshot.results[group.id];
            const delta = Number.isFinite(baseline) ? group.current - baseline : null;
            const extent = Math.min(50, (Math.abs(delta ?? 0) / 12) * 50);
            return <div className="spain-change-row" key={group.id}><span className="party-dot" style={{ background: group.color }} /><strong>{group.name}</strong><div className="delta-track" aria-hidden="true"><i className={delta >= 0 ? "positive" : "negative"} style={{ left: `${delta >= 0 ? 50 : 50 - extent}%`, width: `${extent}%`, background: group.color }} /></div><b>{formatNumber(group.current, locale)}%</b><em className={delta > 0 ? "up" : delta < 0 ? "down" : "flat"}>{Number.isFinite(delta) ? `${delta > 0 ? "+" : ""}${formatNumber(delta, locale)} ${text.points}` : "—"}</em></div>;
          })}</div>
          <footer><span>{activeSnapshot.kind === "election" ? text.electionResult : `${activeSnapshot.pollsterCount} ${text.polls} · ${text.pollingAverage}`}</span><small>{text.combinedNote}</small></footer>
        </article>
        <article className="spain-race-card">
          <small className="widget-data-age">{dataAgeLabel(latestDate, locale)}</small>
          <div className="spain-race-summary"><div className="widget-info-heading"><MiniGraphInfo locale={locale} title={text.raceTitle} text={text.raceInfo} dataDate={latestDate} /><div><span>{text.raceEyebrow}</span><h3>{text.raceTitle}</h3><p>{text.sinceElection}</p></div></div><strong className={Math.abs(gap) < .15 ? "tied" : gap > 0 ? "pp" : "psoe"}>{Math.abs(gap) < .15 ? "≈ 0" : `${formatNumber(Math.abs(gap), locale)} ${text.points}`}<small>{Math.abs(gap) < .15 ? text.tied : `${gap > 0 ? "PP" : "PSOE"} ${text.ahead}`}</small></strong></div>
          <RaceSparkline series={raceSeries} locale={locale} text={text} />
        </article>
        <article className="spain-agreement-card">
          <small className="widget-data-age">{dataAgeLabel(latestDate, locale)}</small>
          <header><div className="widget-info-heading"><MiniGraphInfo locale={locale} title={text.agreementTitle} text={text.agreementInfo} dataDate={latestDate} /><div><span>{text.agreementEyebrow}</span><h3>{text.agreementTitle}</h3><p>{text.agreementIntro}</p></div></div></header>
          <div className="spain-range-axis" aria-hidden="true"><span>0%</span><span>{formatNumber(axisMax / 2, locale, 0)}%</span><span>{axisMax}%</span></div>
          <div className="spain-range-list">{spread.map((item) => <div key={item.id}><div className="range-label"><span className="party-dot" style={{ background: item.color }} /><strong>{item.name}</strong><small>{item.count} {text.polls}</small><em>{formatNumber(item.max - item.min, locale)} {text.spreadValue}</em><b>{formatNumber(item.min, locale)}–{formatNumber(item.max, locale)}%</b></div><div className="range-track"><i style={{ left: `${(item.min / axisMax) * 100}%`, width: `${((item.max - item.min) / axisMax) * 100}%`, background: item.color }} /><span style={{ left: `${(item.mean / axisMax) * 100}%`, borderColor: item.color }} title={`${text.currentAverage}: ${formatNumber(item.mean, locale)}%`} /></div></div>)}</div>
          <footer><small>{text.spreadNote}</small></footer>
        </article>
      </div>
    </section>
  );
}

function coordinatesToPath(coordinates) {
  const ring = (points) => points.map((point, index) => `${index ? "L" : "M"}${projectSpainPoint(point).map((value) => value.toFixed(1)).join(" ")}`).join(" ") + "Z";
  if (!Array.isArray(coordinates?.[0]?.[0]?.[0])) return coordinates.map(ring).join(" ");
  return coordinates.flatMap((polygon) => polygon.map(ring)).join(" ");
}

function projectSpainPoint([longitude, latitude]) {
  if (longitude < -12) return [25 + ((longitude + 18.5) * 28), 405 + ((29.6 - latitude) * 28)];
  return [35 + ((longitude + 10) * 44), 18 + ((44.5 - latitude) * 45)];
}

function spainFeatureLabelPoint(coordinates) {
  const points = [];
  const collect = (value) => {
    if (Array.isArray(value) && Number.isFinite(value[0]) && Number.isFinite(value[1])) points.push(projectSpainPoint(value));
    else if (Array.isArray(value)) value.forEach(collect);
  };
  collect(coordinates);
  if (!points.length) return null;
  const xs = points.map(([x]) => x); const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
}

const SPAIN_MAP_PARTIES = [
  { id: "pp", name: "PP", color: "#1479c9", matches: (id) => id === "pp" },
  { id: "psoe", name: "PSOE", color: "#e0272f", matches: (id) => /^(psoe(?:-|$)|psc$|pspv$|psib-psoe$|psdeg-psoe$|psn-psoe$|pse-ee-psoe$)/.test(id) },
  { id: "vox", name: "Vox", color: "#63a62f", matches: (id) => id === "vox" },
];

function spainPartyProfileParty(party) {
  if (!party) return party;
  const aliases = {
    pp: "pp", vox: "vox", sumar: "sumar", cca: "cca", junts: "junts", erc: "erc", cup: "cup", "alianca-cat": "alianca", compromis: "compromis", bng: "bng", upn: "upn", "eh-bildu": "eh-bildu", pnv: "pnv", iu: "iu", iucyl: "iu", "adelante-andalucia-2021": "adelante", "se-acabo-la-fiesta": "salf", cs: "ciudadanos", c: "ciudadanos",
  };
  let slug = party.slug ?? aliases[party.id];
  if (/^(psoe(?:-|$)|psc$|pspv$|psib-psoe$|psdeg-psoe$|psn-psoe$|pse-ee-psoe$)/.test(party.id)) slug = "psoe";
  if (/^(podemos|podem|unidas-podemos)/.test(party.id)) slug = "podemos-up";
  return slug ? { ...party, slug } : party;
}

function spainPartyInfoProps(party, electionSource) {
  return {
    party: spainPartyProfileParty(party),
    country: "es",
    fallbackProfile: regionalSpainPartyProfile(party, electionSource),
  };
}

function SpainMapSelect({ label, value, onChange, options }) {
  const detailsRef = useRef(null);
  useDismissOnlyDetails(detailsRef);
  const selected = options.find((option) => option.value === value) ?? options[0];
  return <details ref={detailsRef} className="select-control spain-map-select"><summary><span><small>{label}</small><strong>{selected.label}</strong></span><b aria-hidden="true">⌄</b></summary><div className="select-menu">{options.map((option) => <button key={option.value} type="button" className={option.value === value ? "selected" : ""} onClick={(event) => { onChange(option.value); event.currentTarget.closest("details")?.removeAttribute("open"); }}><span>{option.label}</span>{option.value === value && <b aria-hidden="true">✓</b>}</button>)}</div></details>;
}

function openSpainRegion(event, href) {
  const touchRelease = event.type === "pointerup"
    && (event.pointerType === "touch" || navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches);
  if (event.type !== "click" && !touchRelease) return;
  if (event.type === "click" && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
  event.preventDefault();
  event.stopPropagation();
  // Consume the compatibility click emitted after a touch pointerup. Once the
  // region page has rendered, that click must not activate its new controls.
  const swallowClick = (clickEvent) => {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    clickEvent.stopImmediatePropagation?.();
    document.removeEventListener("click", swallowClick, true);
    window.clearTimeout(timeout);
  };
  const timeout = window.setTimeout(() => document.removeEventListener("click", swallowClick, true), 700);
  if (touchRelease) document.addEventListener("click", swallowClick, true);
  const target = new URL(href, window.location.href);
  const next = `${target.pathname}${target.search}${target.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) window.history.pushState({}, "", next);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
}

export function SpainMiniMap({ geojson }) {
  const features = geojson?.features?.filter((feature) => feature?.geometry?.coordinates && !feature.properties?.acom_name?.startsWith("Territorio no asociado")) ?? [];
  return <svg className="watch-mini-map watch-mini-map-es" viewBox="0 0 710 470" aria-hidden="true">{features.map((feature) => <path key={feature.properties?.acom_code} d={coordinatesToPath(feature.geometry.coordinates)} />)}</svg>;
}

let spainMapAssetsRequest;

function loadSpainMapAssets() {
  if (!spainMapAssetsRequest) {
    spainMapAssetsRequest = Promise.all([
      "/data/spain-autonomies.geojson",
      "/data/spain-regions.json",
    ].map((url) => fetch(url).then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))))
      .catch((error) => {
        spainMapAssetsRequest = undefined;
        throw error;
      });
  }
  return spainMapAssetsRequest;
}

function SpainMap({ locale, formatDate }) {
  const text = language(locale);
  const [map, setMap] = useState(null);
  const [regionData, setRegionData] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [mode, setMode] = useState("winner");
  const [partyId, setPartyId] = useState("pp");
  const [showPointerAdvice, setShowPointerAdvice] = useState(() => navigator.maxTouchPoints === 0 && window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  useEffect(() => {
    let active = true;
    let pageIsLeaving = false;
    const markPageLeaving = () => { pageIsLeaving = true; };
    const markPageActive = () => { pageIsLeaving = false; };
    const stopWatchingPage = () => {
      window.removeEventListener("beforeunload", markPageLeaving);
      window.removeEventListener("pagehide", markPageLeaving);
      window.removeEventListener("pageshow", markPageActive);
    };
    window.addEventListener("beforeunload", markPageLeaving);
    window.addEventListener("pagehide", markPageLeaving);
    window.addEventListener("pageshow", markPageActive);
    loadSpainMapAssets()
      .then(([geometry, regions]) => {
        if (!active) return;
        setMap(geometry);
        setRegionData(regions);
      })
      .catch((error) => { if (active && !pageIsLeaving) console.error("Spain map data failed", error); })
      .finally(stopWatchingPage);
    // These are small same-origin static assets. Let them populate the browser
    // cache when the route changes; WebKit can surface aborting them as a false
    // access-control page error even when the rejection itself is handled.
    return () => {
      active = false;
      stopWatchingPage();
    };
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setShowPointerAdvice(navigator.maxTouchPoints === 0 && media.matches);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  const features = useMemo(() => (map?.features ?? [])
    .filter((feature) => feature?.geometry?.coordinates && !feature.properties?.acom_name?.startsWith("Territorio no asociado"))
    .map((feature) => ({ ...feature, path: coordinatesToPath(feature.geometry.coordinates), labelPoint: spainFeatureLabelPoint(feature.geometry.coordinates) })), [map]);
  // A region is highlighted only while it is actually hovered/focused. On
  // touch, the first tap follows the region link instead of silently selecting
  // Madrid (the former default) or requiring a second tap.
  const activeId = hoveredId;
  const active = useMemo(() => features.find((feature) => feature.properties?.acom_code === activeId) ?? null, [activeId, features]);
  const activeData = regionData?.regions?.find((region) => region.code === activeId) ?? null;
  const activeName = activeData?.names?.[locale] ?? activeData?.names?.en ?? active?.properties?.acom_name_local ?? active?.properties?.acom_name;
  const electionLeader = (data) => data?.parties?.map((party) => ({ ...party, value: data.lastElection?.results?.[party.id] })).filter((party) => Number.isFinite(party.value)).sort((a, b) => b.value - a.value)[0] ?? null;
  const partyValue = (data, selectedParty) => {
    const match = data?.parties?.find((party) => selectedParty.matches(party.id) && Number.isFinite(data.lastElection?.results?.[party.id]));
    return match ? { ...match, value: data.lastElection.results[match.id] } : null;
  };
  const activeResults = activeData?.parties?.map((party) => ({ ...party, value: activeData.lastElection?.results?.[party.id], seats: activeData.lastElection?.seats?.[party.id] })).filter((party) => Number.isFinite(party.value)).sort((a, b) => b.value - a.value) ?? [];
  const mapLeaders = [...new Map((regionData?.regions ?? []).map((region) => {
    const party = electionLeader(region);
    return party ? { ...party, electionSource: region.sourceUrl } : null;
  }).filter(Boolean).map((party) => [party.id, party])).values()];
  const selectedParty = SPAIN_MAP_PARTIES.find((party) => party.id === partyId) ?? SPAIN_MAP_PARTIES[0];
  const maximumPartyShare = Math.max(1, ...(regionData?.regions ?? []).map((region) => partyValue(region, selectedParty)?.value ?? 0));
  const copy = locale === "es" ? { historical: "Resultado histórico · últimas elecciones autonómicas · no es una encuesta actual", title: "Resultados de las últimas elecciones autonómicas", intro: "Resultado electoral por comunidad autónoma, con Ceuta y Melilla.", pointer: "Pasa el cursor sobre una comunidad para ver sus cifras.", winner: "Primera fuerza", compare: "Comparar partido", party: "Partido", under: "Bajo el cursor · resultado electoral", selected: "Seleccionada · resultado electoral", votes: "Porcentaje de voto en las últimas elecciones autonómicas; no es una encuesta actual.", method: "Cada comunidad muestra su última elección autonómica; no es una encuesta nacional.", open: "Abrir página regional" } : locale === "de" ? { historical: "Historisches Ergebnis · letzte Regionalwahl · keine aktuelle Umfrage", title: "Ergebnisse der letzten Regionalwahlen", intro: "Wahlergebnis nach autonomer Gemeinschaft sowie für Ceuta und Melilla.", pointer: "Fahre mit der Maus über eine Region, um ihre Werte zu sehen.", winner: "Stärkste Partei", compare: "Partei vergleichen", party: "Partei", under: "Unter dem Zeiger · Wahlergebnis", selected: "Ausgewählt · Wahlergebnis", votes: "Stimmenanteile der letzten Regionalwahl; keine aktuelle Umfrage.", method: "Jede Region zeigt ihre letzte Regionalwahl; dies ist keine nationale Umfrage.", open: "Regionalseite öffnen" } : { historical: "Historical result · latest regional election · not current polling", title: "Latest regional election results", intro: "Election result by autonomous community, plus Ceuta and Melilla.", pointer: "Move the pointer over a community to inspect its figures.", winner: "Largest party", compare: "Compare party", party: "Party", under: "Under pointer · election result", selected: "Selected · election result", votes: "Vote shares at the latest regional election; not a current poll.", method: "Each community shows its latest regional election; this is not national polling.", open: "Open regional page" };
  return (
    <section id="spain-map" className="spain-map-card uk-map-card" aria-labelledby="spain-map-title">
      <div className="uk-map-heading spain-map-heading">
        <div><p className="section-label uk-historical-label">{copy.historical}</p><h2 id="spain-map-title">{copy.title}</h2><p>{copy.intro} {showPointerAdvice && <span className="spain-map-pointer-advice">{copy.pointer}</span>}</p></div>
        <div className="uk-map-controls spain-map-controls" aria-label={locale === "es" ? "Vista del mapa" : locale === "de" ? "Kartenansicht" : "Map view"}><div className="segmented"><button className={mode === "winner" ? "selected" : ""} onClick={() => setMode("winner")}>{copy.winner}</button><button className={mode === "party" ? "selected" : ""} onClick={() => setMode("party")}>{copy.compare}</button></div>{mode === "party" && <SpainMapSelect label={copy.party} value={partyId} onChange={setPartyId} options={SPAIN_MAP_PARTIES.map((party) => ({ value: party.id, label: party.name }))} />}</div>
      </div>
      <div className="spain-map-layout uk-map-layout">
        <div className="spain-map-visual">
        <svg className="spain-map-svg" viewBox="0 0 710 470" role="img" aria-label={copy.title} onPointerLeave={() => setHoveredId(null)}>
          {features.map((feature) => {
            const id = feature.properties?.acom_code;
            const data = regionData?.regions?.find((region) => region.code === id);
            const name = data?.names?.[locale] ?? data?.names?.en ?? feature.properties?.acom_name_local ?? feature.properties?.acom_name;
            const isActive = active?.properties?.acom_code === id;
            const leader = electionLeader(data);
            const comparison = partyValue(data, selectedParty);
            const fill = mode === "winner" ? leader?.color : comparison ? `color-mix(in srgb, ${selectedParty.color} ${Math.round(38 + (62 * comparison.value / maximumPartyShare))}%, white)` : "#edf0f2";
            const href = data ? `/?country=es&view=spain-region&area=${data.slug}` : null;
            return <a key={id} href={href ?? undefined} aria-label={`${name}: ${mode === "winner" ? leader ? `${leader.name} ${formatNumber(leader.value, locale)}%` : "—" : comparison ? `${selectedParty.name} ${formatNumber(comparison.value, locale)}%` : "—"}`} onPointerEnter={(event) => { if (event.pointerType !== "touch") setHoveredId(id); }} onFocus={() => setHoveredId(id)} onBlur={() => setHoveredId(null)} onPointerUp={(event) => href && openSpainRegion(event, href)} onClick={(event) => href && openSpainRegion(event, href)}><path d={feature.path} className={isActive ? "active" : ""} style={{ "--region-party": fill }}><title>{name}</title></path></a>;
          })}
          {mode === "party" && features.map((feature) => { const data = regionData?.regions?.find((region) => region.code === feature.properties?.acom_code); const result = partyValue(data, selectedParty); const point = feature.labelPoint; return result && point && point.width >= 24 && point.height >= 14 ? <text key={`label-${data.code}`} className="spain-map-value-label" x={point.x} y={point.y + 4} textAnchor="middle">{formatNumber(result.value, locale, 0)}%</text> : null; })}
          {active && <path className="active-outline" d={active.path} aria-hidden="true" />}
        </svg>
        </div>
        <aside className={`spain-map-detail uk-map-detail ${activeData ? "has-selection" : ""}`} aria-live="polite"><span>{hoveredId ? copy.under : (locale === "es" ? "Ninguna comunidad seleccionada" : locale === "de" ? "Keine Region ausgewählt" : "No region selected")}</span><h3>{activeName || "—"}</h3>{activeData?.lastElection?.date && <time dateTime={activeData.lastElection.date}>{formatDate(activeData.lastElection.date, locale, { year: true })}</time>}<div className="uk-map-party-list">{activeResults.slice(0, 5).map((party) => <div className={mode === "party" && selectedParty.matches(party.id) ? "focused" : ""} key={party.id}><PartyInfoButton {...spainPartyInfoProps(party, activeData?.sourceUrl)} includeDot as="span" /><strong>{formatNumber(party.value, locale)}%</strong></div>)}</div>{activeData && <small>{copy.votes}</small>}{activeData && <a className="spain-region-open" href={`/?country=es&view=spain-region&area=${activeData.slug}`}>{copy.open} →</a>}</aside>
      </div>
      {mode === "winner" && <div className="spain-map-party-legend"><strong>{copy.winner}</strong>{mapLeaders.map((party) => <PartyInfoButton key={party.id} {...spainPartyInfoProps(party, party.electionSource)} includeDot as="span" />)}</div>}
      <p className="uk-map-method spain-map-method"><span className="info-glyph" aria-hidden="true">i</span>{copy.method}</p>
      <p className="spain-map-source uk-map-source">{text.mapSource}: <a href={map?.attribution?.sourceUrl ?? "https://public.opendatasoft.com/explore/dataset/georef-spain-comunidad-autonoma/"} target="_blank" rel="noreferrer">BDLJE · IGN.es / Opendatasoft · CC BY 4.0</a> · <a href={activeData?.sourceUrl ?? "https://en.wikipedia.org/wiki/2023_Spanish_local_elections"} target="_blank" rel="noreferrer">{locale === "es" ? "Resultados y fuentes" : locale === "de" ? "Ergebnisse und Quellen" : "Results and sources"}</a></p>
    </section>
  );
}

function issuePageLanguage(locale) {
  const labels = locale === "es"
    ? { housing: "Vivienda", economy: "Problemas económicos", jobs: "Calidad del empleo", immigration: "Inmigración", unemployment: "Paro", politics: "Problemas políticos", health: "Sanidad", government: "Gobierno y partidos", politicians: "Malos políticos", youth: "Problemas de la juventud", corruption: "Corrupción", extremism: "Extremismo político", insecurity: "Inseguridad ciudadana" }
    : locale === "de"
      ? { housing: "Wohnen", economy: "Wirtschaftliche Probleme", jobs: "Qualität der Arbeit", immigration: "Einwanderung", unemployment: "Arbeitslosigkeit", politics: "Politische Probleme", health: "Gesundheitswesen", government: "Regierung und Parteien", politicians: "Schlechte Politiker", youth: "Probleme junger Menschen", corruption: "Korruption", extremism: "Politischer Extremismus", insecurity: "Kriminalität und Sicherheit" }
      : { housing: "Housing", economy: "Economic problems", jobs: "Job quality", immigration: "Immigration", unemployment: "Unemployment", politics: "Political problems", health: "Healthcare", government: "Government and parties", politicians: "Poor politicians", youth: "Problems facing young people", corruption: "Corruption", extremism: "Political extremism", insecurity: "Crime and public safety" };
  if (locale === "es") return {
    labels, back: "Volver a España", eyebrow: "Barómetro del CIS · abril de 2026", title: "Qué preocupa a España", intro: "Una lectura compacta de lo que la población menciona como problema del país, lo que le afecta personalmente y cómo valora la economía.",
    national: "Problemas de España", nationalIntro: "Respuestas espontáneas más citadas cuando se pregunta por los principales problemas del país.", personal: "Preocupaciones personales", personalIntro: "Respuestas más citadas cuando se pregunta qué problemas afectan personalmente.",
    nationalInfoTitle: "Qué significa una mención nacional", nationalInfo: "El porcentaje es la parte de personas que citó el tema entre los principales problemas de España. La respuesta era espontánea y cada persona podía dar hasta tres; por eso las barras no son partes de un total y pueden sumar más de 100 %.",
    personalInfoTitle: "Qué significa una preocupación personal", personalInfo: "Esta es otra pregunta: qué problemas afectan personalmente a la persona entrevistada. También admitía hasta tres respuestas espontáneas. Un valor menor que en el gráfico nacional no significa que el problema sea menos grave.",
    economyEyebrow: "Percepción económica", economyTitle: "La economía propia y la del país", personalEconomy: "Mi situación económica", countryEconomy: "La situación económica de España", good: "Buena o muy buena", veryGood: "Muy buena", regular: "Regular", bad: "Mala o muy mala", goodOnly: "Buena", badOnly: "Mala", veryBad: "Muy mala", dontKnow: "No sabe", noAnswer: "No contesta", grouped: "Vista agrupada", allAnswers: "Todas las respuestas", economyGap: "Son dos preguntas distintas: el 64,7 % valora positivamente su propia situación y el 38,1 % la economía española.", economyInfoTitle: "Cómo leer la diferencia", economyInfo: ["Primero: esta no es una comparación entre ingresos personales y PIB. Son dos valoraciones subjetivas hechas a las mismas personas.", "Después: abra «Todas las respuestas» para comprobar cuánto corresponde a cada opción. La vista agrupada suma muy buena + buena y mala + muy mala; no duplica respuestas.", "La distancia puede reflejar experiencias personales, expectativas y la información general sobre el país. El gráfico muestra que existe; no demuestra su causa.", "Control de fuente: la tabla completa del CIS da 2,9 % «muy buena» + 35,2 % «buena» = 38,1 %. La nota de prensa dice 37,1 %; Pollframe usa la tabla desglosada porque permite comprobar la suma."], remainder: "Las siete opciones se conservan y los totales pueden diferir una décima de 100 por redondeo.",
    clockEyebrow: "Otra pregunta del mismo barómetro", clockTitle: "Dos de cada tres quieren terminar con el cambio de hora", clockIntro: "Y, si hubiera que mantener una hora todo el año, la mayoría escogería la de verano.", endChange: "Terminar el cambio", continueChange: "Mantenerlo", summerTime: "Hora de verano", winterTime: "Hora de invierno", indifferent: "Indiferente", clockInfoTitle: "Qué se preguntó exactamente", clockInfo: ["Esta sección continúa con otra pregunta del mismo barómetro, no con una comparación entre preocupaciones nacionales y personales.", "Primero se preguntó si conviene acabar con el cambio estacional de hora. Después, qué horario permanente se preferiría. La segunda pregunta se muestra por separado porque su base y significado son distintos."],
    methodTitle: "Qué conviene saber", method: "Barómetro mensual del CIS, estudio 3557. Entrevistas telefónicas a población adulta en España. Los datos describen respuestas en el momento del trabajo de campo y no demuestran por qué cambian las opiniones.", interviews: "entrevistas", fieldwork: "Trabajo de campo", source: "Resultados del CIS", study: "Tabulación completa del estudio",
  };
  if (locale === "de") return {
    labels, back: "Zurück zu Spanien", eyebrow: "CIS-Barometer · April 2026", title: "Was Spanien beschäftigt", intro: "Ein kompakter Blick darauf, was die Bevölkerung als Problem des Landes nennt, was sie persönlich betrifft und wie sie die Wirtschaft einschätzt.",
    national: "Probleme Spaniens", nationalIntro: "Die häufigsten spontanen Antworten auf die Frage nach den wichtigsten Problemen des Landes.", personal: "Persönliche Sorgen", personalIntro: "Die häufigsten Antworten auf die Frage, welche Probleme die Befragten persönlich betreffen.",
    nationalInfoTitle: "Was eine nationale Nennung bedeutet", nationalInfo: "Der Prozentwert ist der Anteil, der das Thema als eines der wichtigsten Probleme Spaniens nannte. Die Antwort war spontan und bis zu drei Nennungen waren möglich. Die Balken sind daher keine Teile eines Ganzen und können zusammen über 100 % liegen.",
    personalInfoTitle: "Was eine persönliche Sorge bedeutet", personalInfo: "Hier wurde separat gefragt, welche Probleme die Befragten persönlich betreffen. Auch dabei waren bis zu drei spontane Antworten möglich. Ein kleinerer Wert als im Länderdiagramm bedeutet nicht, dass das Problem weniger schwerwiegend ist.",
    economyEyebrow: "Wirtschaftliche Wahrnehmung", economyTitle: "Eigene Lage und Wirtschaft des Landes", personalEconomy: "Meine wirtschaftliche Lage", countryEconomy: "Wirtschaftslage Spaniens", good: "Gut oder sehr gut", veryGood: "Sehr gut", regular: "Mittelmäßig", bad: "Schlecht oder sehr schlecht", goodOnly: "Gut", badOnly: "Schlecht", veryBad: "Sehr schlecht", dontKnow: "Weiß nicht", noAnswer: "Keine Angabe", grouped: "Gruppiert", allAnswers: "Alle Antworten", economyGap: "Es sind zwei verschiedene Fragen: 64,7 % bewerten die eigene Lage positiv, 38,1 % Spaniens Wirtschaft.", economyInfoTitle: "So ist der Unterschied zu lesen", economyInfo: ["Hier werden weder persönliches Einkommen noch das BIP gemessen, sondern zwei subjektive Einschätzungen derselben Befragten.", "Unter „Alle Antworten“ ist jede Antwortkategorie sichtbar. Die gruppierte Ansicht addiert sehr gut + gut sowie schlecht + sehr schlecht; sie zählt niemanden doppelt.", "Der Abstand kann persönliche Erfahrung, Erwartungen und den Blick auf die Gesamtlage spiegeln. Die Grafik belegt den Abstand, nicht dessen Ursache.", "Quellenkontrolle: In der vollständigen CIS-Tabelle ergeben 2,9 % „sehr gut“ + 35,2 % „gut“ zusammen 38,1 %. Die Pressemitteilung nennt 37,1 %; Pollframe verwendet die nachprüfbare Summe aus der Detailtabelle."], remainder: "Alle sieben Antwortmöglichkeiten bleiben erhalten; Rundung kann den Gesamtwert um eine Zehntelstelle verschieben.",
    clockEyebrow: "Eine weitere Frage desselben Barometers", clockTitle: "Zwei von drei wollen den Uhrwechsel beenden", clockIntro: "Bei einer dauerhaften Zeit würde die Mehrheit die Sommerzeit wählen.", endChange: "Zeitwechsel beenden", continueChange: "Beibehalten", summerTime: "Sommerzeit", winterTime: "Winterzeit", indifferent: "Egal", clockInfoTitle: "Was genau gefragt wurde", clockInfo: ["Dieser Abschnitt zeigt eine andere Frage desselben Barometers und ersetzt den alten Vergleich zwischen nationalen und persönlichen Sorgen.", "Zuerst ging es um das Ende des saisonalen Uhrwechsels, danach um die bevorzugte dauerhafte Zeit. Beide Ergebnisse stehen getrennt, weil sie unterschiedliche Fragen beantworten."],
    methodTitle: "Was man wissen sollte", method: "Monatliches CIS-Barometer, Studie 3557. Telefoninterviews mit Erwachsenen in Spanien. Die Daten beschreiben Antworten zum Befragungszeitpunkt und erklären nicht, warum sich Meinungen verändern.", interviews: "Interviews", fieldwork: "Feldzeit", source: "CIS-Ergebnisse", study: "Vollständige Auswertung der Studie",
  };
  return {
    labels, back: "Back to Spain", eyebrow: "CIS barometer · April 2026", title: "What concerns Spain", intro: "A compact view of what people name as a national problem, what affects them personally and how they judge the economy.",
    national: "Problems facing Spain", nationalIntro: "The most-cited spontaneous answers when people were asked about the country’s main problems.", personal: "Personal concerns", personalIntro: "The most-cited answers when people were asked which problems affect them personally.",
    nationalInfoTitle: "What a national mention means", nationalInfo: "The percentage is the share who named the topic as one of Spain’s main problems. Answers were unprompted and each person could name up to three, so these bars are not slices of one total and may add to more than 100%.",
    personalInfoTitle: "What a personal concern means", personalInfo: "This was a separate question about problems affecting the respondent personally. It also allowed up to three unprompted answers. A lower figure than in the national chart does not mean the issue is less serious.",
    economyEyebrow: "Economic perceptions", economyTitle: "Personal economic situation and Spain’s economy", personalEconomy: "My economic situation", countryEconomy: "Spain’s economic situation", good: "Good or very good", veryGood: "Very good", regular: "Fair", bad: "Bad or very bad", goodOnly: "Good", badOnly: "Bad", veryBad: "Very bad", dontKnow: "Don’t know", noAnswer: "No answer", grouped: "Grouped view", allAnswers: "All answers", economyGap: "These are two separate questions: 64.7% rate their own situation positively, compared with 38.1% for Spain’s economy.", economyInfoTitle: "How to read the gap", economyInfo: ["This does not compare personal income with GDP. It compares two subjective assessments given by the same respondents.", "Open “All answers” to see every response. The grouped view adds very good + good and bad + very bad; nobody is counted twice.", "The gap may reflect personal experience, expectations and wider news about the country. The chart establishes the gap, not its cause.", "Source check: the full CIS table gives 2.9% “very good” + 35.2% “good” = 38.1%. Its press release says 37.1%; Pollframe uses the auditable sum from the detailed table."], remainder: "All seven answer options are retained; rounding can move the total by one tenth of a point.",
    clockEyebrow: "Another question in the same barometer", clockTitle: "Two in three want to end the clock change", clockIntro: "If Spain kept one time all year, most would choose summer time.", endChange: "End clock changes", continueChange: "Keep changing", summerTime: "Summer time", winterTime: "Winter time", indifferent: "Indifferent", clockInfoTitle: "What was actually asked", clockInfo: ["This section continues with a different question from the same barometer. It replaces the old national-versus-personal comparison.", "CIS first asked whether seasonal clock changes should end, then which permanent time people preferred. They are shown separately because they answer different questions."],
    methodTitle: "What to know", method: "Monthly CIS barometer, study 3557. Telephone interviews with adults in Spain. The figures describe answers during the fieldwork period and do not establish why opinions change.", interviews: "interviews", fieldwork: "Fieldwork", source: "CIS results", study: "Full study tables",
  };
}

function ConcernBars({ id, locale, title, intro, items, labels, info, dataDate }) {
  const exportRef = useRef(null);
  const exportLabel = locale === "es" ? "Exportar PNG" : locale === "de" ? "PNG exportieren" : "Export PNG";
  return (
    <article ref={exportRef} id={id} className="spain-concern-panel">
      <small className="widget-data-age">{dataAgeLabel(dataDate, locale)}</small>
      <header><div className="widget-info-heading"><MiniGraphInfo locale={locale} title={info.title} text={info.text} dataDate={dataDate} /><div><h2>{title}</h2><p>{intro}</p></div></div><PngExportButton elementRef={exportRef} filename={`pollframe-${id}`} title={title} subtitle="España · CIS" locale={locale} label={exportLabel} credit="Centro de Investigaciones Sociológicas · Pollframe" profile="issues" className="widget-share-trigger spain-concern-png" /></header>
      <div className="spain-concern-ranking">{items.map((item, index) => <div key={item.id}><b>{index + 1}</b><span>{labels[item.id] ?? item.label}</span><div><i style={{ width: `${item.value}%`, background: item.color }} /></div><strong>{formatNumber(item.value, locale)}%</strong></div>)}</div>
    </article>
  );
}

const ECONOMY_COLORS = { veryGood: "#15734f", good: "#45a879", regular: "#d2a63e", bad: "#d96a73", veryBad: "#9f3547", dontKnow: "#8f99a5", noAnswer: "#c6cbd1" };

function EconomicPerception({ label, values, text, locale, detailed }) {
  const segments = detailed
    ? [["veryGood", values.veryGood], ["goodOnly", values.good, "good"], ["regular", values.regular], ["badOnly", values.bad, "bad"], ["veryBad", values.veryBad], ["dontKnow", values.dontKnow], ["noAnswer", values.noAnswer]]
    : [["good", values.veryGood + values.good, "good"], ["regular", values.regular, "regular"], ["bad", values.bad + values.veryBad, "bad"], ["dontKnow", values.dontKnow + values.noAnswer, "dontKnow"]];
  const legendSegments = detailed ? segments : segments.filter(([key]) => key !== "dontKnow");
  return (
    <div className="economic-perception-row">
      <strong>{label}</strong>
      <div className="economic-perception-bar" aria-label={segments.map(([key, value]) => `${text[key]} ${formatNumber(value, locale)}%`).join(", ")}>
        {segments.map(([key, value, colorKey]) => <i key={key} style={{ width: `${value}%`, background: ECONOMY_COLORS[colorKey ?? key] }} />)}
      </div>
      <div className={`economic-perception-legend ${detailed ? "is-detailed" : ""}`} style={detailed ? undefined : { gridTemplateColumns: legendSegments.map(([, value]) => `${value}fr`).join(" ") }}>
        {legendSegments.map(([key, value, colorKey]) => <span key={key}><i style={{ background: ECONOMY_COLORS[colorKey ?? key] }} /><span>{text[key]}</span><b>{formatNumber(value, locale)}%</b></span>)}
      </div>
    </div>
  );
}

export function SpainIssuesPage({ locale, summary, formatDate, numberLocale }) {
  const text = issuePageLanguage(locale);
  const national = summary.issues.items;
  const issue = summary.issues;
  const [economyDetail, setEconomyDetail] = useState(false);
  const fieldwork = `${formatDate(issue.fieldwork[0], locale, { year: true })} – ${formatDate(issue.fieldwork[1], locale, { year: true })}`;
  return (
    <main id="top" className="germany-country-overview spain-country-overview spain-issues-page">
      <nav className="region-breadcrumb country-breadcrumb" aria-label="Navigation"><a href="/?country=es">← {text.back}</a></nav>
      <section className="spain-issues-hero"><div><p className="section-label">{text.eyebrow}</p><h1>{text.title}</h1><p>{text.intro}</p></div><aside><span>{formatDate(issue.fieldwork[1], locale, { year: true })} · {dataAgeLabel(issue.fieldwork[1], locale)}</span><strong>{issue.interviews.toLocaleString(numberLocale)}</strong><small>{text.interviews}</small></aside></section>
      <section className="spain-concern-grid" aria-label={text.title}>
        <ConcernBars id="spain-national-concerns" locale={locale} title={text.national} intro={text.nationalIntro} items={national.slice(0, 5)} labels={text.labels} info={{ title: text.nationalInfoTitle, text: text.nationalInfo }} dataDate={issue.fieldwork[1]} />
        <ConcernBars id="spain-personal-concerns" locale={locale} title={text.personal} intro={text.personalIntro} items={issue.personal} labels={text.labels} info={{ title: text.personalInfoTitle, text: text.personalInfo }} dataDate={issue.fieldwork[1]} />
      </section>
      <section id="spain-economy" className="spain-economy-panel">
        <small className="widget-data-age">{dataAgeLabel(issue.fieldwork[1], locale)}</small>
        <header><div className="widget-info-heading"><MiniGraphInfo locale={locale} title={text.economyInfoTitle} paragraphs={text.economyInfo} dataDate={issue.fieldwork[1]} /><div><p className="section-label">{text.economyEyebrow}</p><h2>{text.economyTitle}</h2><p className="spain-economy-summary">{text.economyGap}</p></div></div></header>
        <div className="economy-view-toggle"><button type="button" className={!economyDetail ? "active" : ""} aria-pressed={!economyDetail} onClick={() => setEconomyDetail(false)}>{text.grouped}</button><button type="button" className={economyDetail ? "active" : ""} aria-pressed={economyDetail} onClick={() => setEconomyDetail(true)}>{text.allAnswers}</button></div>
        <EconomicPerception label={text.personalEconomy} values={issue.economy.personal} text={text} locale={locale} detailed={economyDetail} />
        <EconomicPerception label={text.countryEconomy} values={issue.economy.country} text={text} locale={locale} detailed={economyDetail} />
        <small>{text.remainder}</small>
      </section>
      <section className="spain-issues-method"><div><p className="section-label">CIS · {issue.study}</p><h2>{text.methodTitle}</h2><p>{text.method}</p></div><dl><div><dt>{text.fieldwork}</dt><dd>{fieldwork}</dd></div><div><dt>{text.interviews}</dt><dd>{issue.interviews.toLocaleString(numberLocale)}</dd></div></dl><nav><a href={issue.sourceUrl} target="_blank" rel="noreferrer">{text.source} ↗</a><a href={issue.studyUrl} target="_blank" rel="noreferrer">{text.study} ↗</a></nav></section>
    </main>
  );
}

function regionLanguage(locale) {
  if (locale === "es") return { back: "Todas las regiones", eyebrow: "Encuestas autonómicas", current: "Foto más reciente", currentText: "Media de la última encuesta de cada instituto en los 180 días anteriores a la última publicación.", noCurrent: "Todavía no hay suficientes encuestas posteriores a la última elección para llamar a esto una foto actual.", election: "Últimas elecciones", history: "Histórico de encuestas", historyText: "Cada punto es una encuesta publicada, no una predicción. Las líneas solo ayudan a seguir cada partido entre publicaciones.", coverage: "¿Sirven estos datos?", useful: "Útiles para seguir una tendencia", limited: "Útiles con cautela", archive: "Útiles como archivo, no como actualidad", unavailable: "Sin serie utilizable", polls: "encuestas utilizables", pollsters: "institutos", post: "posteriores a la elección", source: "Tabla y fuentes originales", qualityUseful: "Hay suficientes publicaciones posteriores a la elección para mostrar dirección y una foto agregada. Aun así, una encuesta autonómica sigue teniendo incertidumbre.", qualityLimited: "La página aporta contexto, pero hay muy pocos puntos recientes para interpretar pequeños movimientos como una tendencia.", qualityArchive: "La serie conserva la campaña y el resultado anterior, pero no describe la situación política actual. Mostramos explícitamente esta limitación.", alternatives: "Mientras faltan encuestas", alternativeText: "Los indicadores regionales oficiales pueden aportar contexto sin fingir que son intención de voto.", cis: "CIS · estudios por comunidad", ine: "INE · calidad de vida regional", updated: "Datos generados" };
  if (locale === "de") return { back: "Alle Regionen", eyebrow: "Regionale Wahlumfragen", current: "Jüngster Stand", currentText: "Mittel der je Institut jüngsten Umfrage in den 180 Tagen vor der letzten Veröffentlichung.", noCurrent: "Seit der letzten Wahl gibt es noch nicht genug Umfragen für einen aktuellen Durchschnitt.", election: "Letzte Wahl", history: "Umfragen im Zeitverlauf", historyText: "Jeder Punkt ist eine veröffentlichte Umfrage, keine Prognose. Die Linien verbinden nur die Veröffentlichungen einer Partei.", coverage: "Wie brauchbar sind die Daten?", useful: "Für einen Trend brauchbar", limited: "Mit Vorsicht brauchbar", archive: "Als Archiv brauchbar, nicht aktuell", unavailable: "Keine brauchbare Reihe", polls: "brauchbare Umfragen", pollsters: "Institute", post: "nach der Wahl", source: "Tabelle und Originalquellen", qualityUseful: "Nach der letzten Wahl liegen genug Veröffentlichungen vor, um Richtung und Durchschnitt zu zeigen. Regionale Umfragen bleiben dennoch unsicher.", qualityLimited: "Die Seite liefert Kontext, aber für kleine Bewegungen gibt es zu wenige aktuelle Punkte.", qualityArchive: "Die Reihe dokumentiert den früheren Wahlkampf und das Ergebnis, beschreibt aber nicht die heutige Lage. Diese Grenze wird deshalb klar ausgewiesen.", alternatives: "Wenn Umfragen fehlen", alternativeText: "Amtliche Regionalindikatoren liefern Kontext, ohne Wahlabsicht vorzutäuschen.", cis: "CIS · Regionalstudien", ine: "INE · regionale Lebensqualität", updated: "Daten erzeugt" };
  return { back: "All regions", eyebrow: "Regional election polling", current: "Latest snapshot", currentText: "Average of each pollster’s latest poll in the 180 days before the latest publication.", noCurrent: "There are not yet enough post-election polls to describe this as a current snapshot.", election: "Last election", history: "Polling history", historyText: "Each dot is a published poll, not a forecast. Lines only help follow each party between publications.", coverage: "How useful is this data?", useful: "Useful for following a trend", limited: "Useful with caution", archive: "Useful as an archive, not as current data", unavailable: "No usable series", polls: "usable polls", pollsters: "pollsters", post: "after the election", source: "Table and original sources", qualityUseful: "There are enough post-election publications to show direction and an aggregate snapshot. Regional polling still carries uncertainty.", qualityLimited: "The page adds context, but there are too few recent observations to read small movements as a trend.", qualityArchive: "The series documents the previous campaign and result but does not describe politics today. That limitation is shown explicitly.", alternatives: "When polls are sparse", alternativeText: "Official regional indicators can add context without pretending to measure voting intention.", cis: "CIS · studies by region", ine: "INE · regional quality of life", updated: "Data generated" };
}

function RegionResults({ results, parties, locale, seats = null, sourceUrl = null }) {
  const rows = parties.map((party) => ({ ...party, value: results?.[party.id] })).filter((party) => Number.isFinite(party.value)).sort((a, b) => b.value - a.value).slice(0, 7);
  return <div className="region-results">{rows.map((party) => <div key={party.id}><span><PartyInfoButton {...spainPartyInfoProps(party, sourceUrl)} includeDot />{Number.isInteger(seats?.[party.id]) && <small>{seats[party.id]} {locale === "es" ? "esc." : locale === "de" ? "Sitze" : "seats"}</small>}</span><div><i style={{ width: `${Math.min(100, party.value * 2)}%`, background: party.color }} /></div><b>{formatNumber(party.value, locale)}%</b></div>)}</div>;
}

function RegionTrend({ region, locale }) {
  const width = 760; const height = 310; const left = 38; const right = 14; const top = 18; const bottom = 36;
  const polls = region.polls;
  if (!polls?.length) return null;
  const start = Date.parse(`${polls[0].date}T00:00:00Z`); const end = Date.parse(`${polls.at(-1).date}T00:00:00Z`); const span = Math.max(1, end - start);
  const leaders = region.parties.map((party) => ({ ...party, value: region.current?.results?.[party.id] ?? region.lastElection?.results?.[party.id] ?? 0 })).sort((a, b) => b.value - a.value).slice(0, 6);
  const ceiling = Math.max(35, Math.ceil(Math.max(...polls.flatMap((poll) => leaders.map((party) => poll.results[party.id] ?? 0))) / 10) * 10);
  const x = (date) => left + ((Date.parse(`${date}T00:00:00Z`) - start) / span) * (width - left - right); const y = (value) => top + (1 - value / ceiling) * (height - top - bottom);
  return <div className="region-trend"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={region.names[locale] ?? region.names.en}>{[0, ceiling / 2, ceiling].map((value) => <g key={value}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} /><text x={left - 7} y={y(value) + 4}>{value}%</text></g>)}{leaders.map((party) => { const values = polls.filter((poll) => Number.isFinite(poll.results[party.id])); const d = values.map((poll, index) => `${index ? "L" : "M"}${x(poll.date).toFixed(1)} ${y(poll.results[party.id]).toFixed(1)}`).join(" "); return <g key={party.id} className="region-series"><path d={d} stroke={party.color} />{values.map((poll) => <circle key={`${poll.date}-${poll.pollster}`} cx={x(poll.date)} cy={y(poll.results[party.id])} r="2.6" fill={party.color}><title>{poll.pollster} · {poll.date} · {poll.results[party.id]}%</title></circle>)}</g>; })}<text className="date" x={left} y={height - 8}>{polls[0].date.slice(0, 4)}</text><text className="date end" x={width - right} y={height - 8}>{polls.at(-1).date.slice(0, 4)}</text></svg><div>{leaders.map((party) => <PartyInfoButton key={party.id} {...spainPartyInfoProps(party, region.sourceUrl)} includeDot as="span" />)}</div></div>;
}

export function SpainRegionPage({ locale, regions, area, formatDate }) {
  const text = regionLanguage(locale); const region = regions?.regions?.find((item) => item.slug === area);
  if (!region) return <main className="spain-region-page"><p>{text.unavailable}</p></main>;
  const status = region.coverage.status; const statusLabel = text[status] ?? text.unavailable;
  const electionDate = region.lastElection?.date;
  const postElectionPolls = region.polls.filter((poll) => !electionDate || poll.date > electionDate);
  const latestPublished = postElectionPolls.at(-1) ?? null;
  const trendEligible = Boolean(region.coverage.trendEligible);
  const currentAge = region.current?.date ? dataAgeLabel(region.current.date, locale) : null;
  const recentStart = region.current?.date ? new Date(Date.parse(`${region.current.date}T00:00:00Z`) - 365 * DAY).toISOString().slice(0, 10) : null;
  const recentTrendPolls = recentStart ? postElectionPolls.filter((poll) => poll.date >= recentStart) : [];
  const seatTotal = Object.values(region.lastElection?.seats ?? {}).reduce((sum, value) => sum + value, 0);
  const winner = region.parties.map((party) => ({ ...party, value: region.lastElection?.results?.[party.id], seats: region.lastElection?.seats?.[party.id] })).filter((party) => Number.isFinite(party.value)).sort((a, b) => b.value - a.value)[0] ?? null;
  const copy = locale === "es" ? {
    live: "Seguimiento periódico", latest: "Última encuesta publicada", noLive: "Sin una media continua", trend: "Movimiento reciente", trendText: "Solo los últimos doce meses. Cada punto es una encuesta publicada y la línea conecta observaciones; no es una predicción.", electionInfo: "Composición surgida de las últimas elecciones", majority: "Mayoría absoluta", represented: "Fuerzas con escaños", cadence: "Frecuencia comprobada", cadenceGood: "Esta comunidad ha publicado en al menos cuatro meses del último año y ninguno de los seis últimos intervalos supera 120 días. Por eso mostramos una media y una tendencia recientes.", cadenceThin: "Hay encuestas, pero llegan en ráfagas o con intervalos superiores a cuatro meses. Mostramos la última publicación como tal, sin convertirla en una tendencia continua.", cadenceArchive: "La serie disponible termina con las elecciones. Sirve para documentar la campaña, pero no para describir la situación actual.", months: "meses con datos en 12 meses", last12: "encuestas en 12 meses", gap: "mayor intervalo reciente", days: "días", single: "Una encuesta, no una media", electionWinner: "Primera fuerza",
  } : locale === "de" ? {
    live: "Regelmäßige Beobachtung", latest: "Jüngste veröffentlichte Umfrage", noLive: "Kein laufender Durchschnitt", trend: "Jüngste Entwicklung", trendText: "Nur die letzten zwölf Monate. Jeder Punkt ist eine veröffentlichte Umfrage; die Linie verbindet Beobachtungen und ist keine Prognose.", electionInfo: "Zusammensetzung aus der letzten Regionalwahl", majority: "Absolute Mehrheit", represented: "Parteien mit Sitzen", cadence: "Geprüfte Veröffentlichungsfrequenz", cadenceGood: "In mindestens vier Monaten des letzten Jahres wurden Umfragen veröffentlicht, und keiner der sechs jüngsten Abstände überschreitet 120 Tage. Daher zeigen wir aktuellen Mittelwert und Trend.", cadenceThin: "Es gibt Umfragen, aber in Schüben oder mit Abständen von mehr als vier Monaten. Die jüngste Veröffentlichung bleibt deshalb eine Einzelumfrage und wird nicht als laufender Trend dargestellt.", cadenceArchive: "Die verfügbare Reihe endet mit der Wahl. Sie dokumentiert den Wahlkampf, beschreibt aber nicht die heutige Lage.", months: "Monate mit Daten in 12 Monaten", last12: "Umfragen in 12 Monaten", gap: "größter jüngster Abstand", days: "Tage", single: "Eine Umfrage, kein Mittelwert", electionWinner: "Stärkste Kraft",
  } : {
    live: "Regular polling", latest: "Latest published poll", noLive: "No continuous average", trend: "Recent movement", trendText: "The last twelve months only. Every point is a published poll and lines connect observations; this is not a forecast.", electionInfo: "Composition produced by the last regional election", majority: "Majority threshold", represented: "Parties with seats", cadence: "Verified publication cadence", cadenceGood: "Polls appeared in at least four months of the past year and none of the six latest intervals exceeds 120 days. A recent average and trend are therefore shown.", cadenceThin: "Polls exist, but arrive in bursts or with gaps longer than four months. The latest publication is shown as a single poll rather than being turned into a continuous trend.", cadenceArchive: "The available series ends at the election. It documents the campaign but does not describe politics now.", months: "months with data in 12 months", last12: "polls in 12 months", gap: "largest recent interval", days: "days", single: "One poll, not an average", electionWinner: "Largest party",
  };
  const cadenceText = trendEligible ? copy.cadenceGood : status === "archive" ? copy.cadenceArchive : copy.cadenceThin;
  return (
    <main id="top" className="germany-country-overview spain-country-overview spain-region-page">
      <nav className="region-breadcrumb country-breadcrumb"><a href="/?country=es#spain-map">← {text.back}</a></nav>
      <section className="spain-region-hero"><p className="section-label">{text.eyebrow}</p><h1>{region.names[locale] ?? region.names.en}</h1><div className={`region-status ${status}`}><strong>{trendEligible ? copy.live : statusLabel}</strong><span>{region.coverage.usablePolls} {text.polls} · {region.coverage.postElectionPolls} {text.post}{currentAge ? ` · ${currentAge}` : ""}</span></div></section>
      <section className="spain-region-snapshot">
        <article><header><h2>{text.election}</h2><p>{region.lastElection ? formatDate(region.lastElection.date, locale, { year: true }) : "—"}</p></header>{region.lastElection ? <><RegionResults results={region.lastElection.results} seats={region.lastElection.seats} parties={region.parties} locale={locale} sourceUrl={region.sourceUrl} /><dl className="region-election-facts">{winner && <div><dt>{copy.electionWinner}</dt><dd><i style={{ background: winner.color }} /><PartyInfoButton {...spainPartyInfoProps(winner, region.sourceUrl)} as="span" /></dd></div>}{seatTotal > 0 && <><div><dt>{copy.majority}</dt><dd>{Math.floor(seatTotal / 2) + 1}</dd></div><div><dt>{copy.represented}</dt><dd>{Object.values(region.lastElection.seats).filter((value) => value > 0).length}</dd></div></>}</dl></> : <div className="region-empty">{text.unavailable}</div>}</article>
        <article><header><h2>{trendEligible ? text.current : latestPublished ? copy.latest : copy.noLive}</h2><p>{trendEligible ? `${text.currentText} ${currentAge}.` : latestPublished ? `${latestPublished.pollster} · ${formatDate(latestPublished.date, locale, { year: true })} · ${dataAgeLabel(latestPublished.date, locale)}. ${copy.single}.` : cadenceText}</p></header>{trendEligible ? <RegionResults results={region.current.results} parties={region.parties} locale={locale} sourceUrl={region.sourceUrl} /> : latestPublished ? <RegionResults results={latestPublished.results} parties={region.parties} locale={locale} sourceUrl={region.sourceUrl} /> : <div className="region-election-leader">{winner && <><i style={{ background: winner.color }} /><span>{copy.electionWinner}</span><strong><PartyInfoButton {...spainPartyInfoProps(winner, region.sourceUrl)} as="span" /></strong><b>{formatNumber(winner.value, locale)}%</b></>}</div>}</article>
      </section>
      {trendEligible && <section className="spain-region-history is-recent"><header><div className="widget-info-heading"><MiniGraphInfo locale={locale} title={copy.trend} paragraphs={[copy.trendText, copy.cadenceGood]} dataDate={region.current?.date} /><div><h2>{copy.trend}</h2><p>{copy.trendText}</p></div></div><div className="current-widget-meta"><small className="data-age-label">{dataDateLabel(region.current?.date, locale)} · {dataAgeLabel(region.current?.date, locale)}</small></div></header><RegionTrend region={{ ...region, polls: recentTrendPolls }} locale={locale} /></section>}
      <section className="spain-region-quality"><div><p className="section-label">{copy.cadence}</p><h2>{trendEligible ? copy.live : statusLabel}</h2><p>{cadenceText}</p><dl><div><dt>{copy.last12}</dt><dd>{region.coverage.pollsLast12Months ?? 0}</dd></div><div><dt>{copy.months}</dt><dd>{region.coverage.activeMonthsLast12Months ?? 0}</dd></div><div><dt>{copy.gap}</dt><dd>{region.coverage.maxRecentGapDays ? `${region.coverage.maxRecentGapDays} ${copy.days}` : "—"}</dd></div></dl></div><aside><h3>{text.alternatives}</h3><p>{text.alternativeText}</p><a href="https://www.cis.es/catalogo-estudios/resultados-definiciones-busqueda" target="_blank" rel="noreferrer">{text.cis} ↗</a><a href="https://www.ine.es/experimental/multidimensional-indicator-quality-life/index.html" target="_blank" rel="noreferrer">{text.ine} ↗</a></aside></section>
      <footer className="spain-region-source"><span>{text.updated}: {formatDate(regions.metadata.generatedAt.slice(0, 10), locale, { year: true })} · {dataAgeLabel(regions.metadata.generatedAt.slice(0, 10), locale)}</span><a href={region.sourceUrl} target="_blank" rel="noreferrer">{text.source} ↗</a></footer>
    </main>
  );
}

export function SpainCountryOverview({ locale, summary, formatDate, numberLocale }) {
  const text = language(locale);
  const congress = summary.congress;
  return (
    <main id="top" className="germany-country-overview spain-country-overview">
      <nav className="region-breadcrumb country-breadcrumb" aria-label="Navigation"><strong>España</strong></nav>
      <section className="germany-country-hero spain-country-hero"><div><div className="eyebrow"><span />{text.label}</div><h1>🇪🇸 {text.title}</h1><p>{text.intro}</p></div></section>
      <section className="spain-overview-grid" aria-label={text.title}>
        <a className="spain-polling-entry" href="/?region=spain-congress"><div><span>{text.pollingEyebrow}</span><h2>{text.pollingTitle}</h2><p>{text.pollingText}</p></div><dl><div><dt>{text.polls}</dt><dd>{congress.pollCount.toLocaleString(numberLocale)}</dd></div><div><dt>{text.since}</dt><dd>{congress.firstDate.slice(0, 4)}</dd></div><div><dt>{text.updated}</dt><dd>{formatDate(congress.latestDate, locale)}<small className="data-age-label">{dataAgeLabel(congress.latestDate, locale)}</small></dd></div></dl><b aria-hidden="true">→</b></a>
        <a className="spain-polling-entry spain-issues-entry" href="/?country=es&view=spain-issues"><div><span>{text.issuesEyebrow}</span><h2>{text.issuesTitle}</h2><p>{text.issuesText}</p></div><b aria-hidden="true">→</b></a>
      </section>
      <SpainMap locale={locale} formatDate={formatDate} />
    </main>
  );
}
