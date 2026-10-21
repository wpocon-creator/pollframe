import { text } from "./party-match-text.js";

// Supplementary primary evidence, all predating the 2025 federal election.
// A speaker's role and the document date are part of the citation, not endorsements.
// Dates retain their published precision: never invent a day for a monthly leaflet.
export const MATCH_SOURCES = {
  greensDebtScope: {
    kind: "party",
    date: "2024-11-20",
    url: "https://www.gruene.de/artikel/bdk-beschluesse-zu-steuersystem-und-schuldenbremse-einfach-erklaert",
    title: text(
      "Grüne · Reform, keine Abschaffung der Schuldenbremse",
      "Greens · Reform, not abolition of the debt brake",
      "Verdes · Reforma, no supresión del freno de la deuda",
    ),
  },
  spdDebtScope: {
    kind: "party",
    date: "2024-11-30",
    url: "https://olaf-scholz.spd.de/aktuelles/detail/news/rede-anlaesslich-der-wahlsiegkonferenz/30/11/2024",
    title: text(
      "SPD · Olaf Scholz, Rede zur Wahlsiegkonferenz",
      "SPD · Olaf Scholz, election conference speech",
      "SPD · Discurso de Olaf Scholz en la conferencia electoral",
    ),
  },
  spdCitizenship: {
    kind: "party",
    date: "2024-01-19",
    url: "https://www.spdfraktion.de/node/6218665",
    title: text(
      "SPD-Fraktion · Eine leichtere und schnellere Einbürgerung",
      "SPD parliamentary group · Easier, faster naturalisation",
      "Grupo parlamentario del SPD · Naturalización más sencilla y rápida",
    ),
  },
  spdCars: {
    kind: "party",
    date: "2023-02-14",
    url: "https://www.spd-europa.de/nachrichten/erfolg-fuer-klimaschonenden-strassenverkehr",
    title: text(
      "Europa-SPD · Tiemo Wölken zu den Pkw-Regeln für 2035",
      "SPD MEPs · Tiemo Wölken on the 2035 car rules",
      "SPD en el Parlamento Europeo · Tiemo Wölken sobre las normas de 2035",
    ),
  },
  spdIp: {
    kind: "parliament",
    date: "2024-12-05",
    url: "https://www.bundestag.de/dokumente/textarchiv/2024/kw49-de-mindestspeicherung-ipadressen-1032630",
    title: text(
      "Bundestag · Debatte zur IP-Speicherung, SPD-Beitrag",
      "Bundestag · IP retention debate, SPD contribution",
      "Bundestag · Debate sobre conservación de IP, intervención del SPD",
    ),
  },
  fdpSelf: {
    kind: "party",
    date: "2024-04",
    url: "https://www.fdp.de/sites/default/files/2024-04/20240412_argumente_selbstbestimmungsgesetz.pdf",
    title: text(
      "FDP · Argumente zum Selbstbestimmungsgesetz",
      "FDP · Self-determination Act policy leaflet",
      "FDP · Documento sobre la ley de autodeterminación",
    ),
  },
  spdClimate: {
    kind: "party",
    date: "2025-01-07",
    url: "https://olaf-scholz.spd.de/aktuelles/detail/news/olaf-scholz-im-gespraech-mit-stern/07/01/2025",
    title: text(
      "SPD · Olaf Scholz im STERN-Interview",
      "SPD · Olaf Scholz’s STERN interview",
      "SPD · Entrevista de STERN a Olaf Scholz",
    ),
  },
  afdWage: {
    kind: "party",
    date: "2024-04-30",
    url: "https://afdbundestag.de/gerrit-huy-spd-opfert-unabhaengige-mindestlohnkommission/",
    title: text(
      "AfD-Fraktion · Gerrit Huy zur Mindestlohnkommission",
      "AfD parliamentary group · Gerrit Huy on the Minimum Wage Commission",
      "Grupo parlamentario de AfD · Gerrit Huy sobre la comisión del salario mínimo",
    ),
  },
  afdHealth: {
    kind: "parliament",
    date: "2024-11-07",
    url: "https://dserver.bundestag.de/btd/20/136/2013675.pdf",
    title: text(
      "Bundestag · Ausschussbericht 20/13675, AfD-Stellungnahme",
      "Bundestag · Committee report 20/13675, AfD statement",
      "Bundestag · Informe de comisión 20/13675, postura de AfD",
    ),
  },
  fdpCitizenship: {
    kind: "party",
    date: "2023-01-12",
    url: "https://www.fdp.de/richtige-reihenfolge-fuer-moderne-einwanderungspolitik",
    title: text(
      "FDP · Christian Dürr zur Einwanderungspolitik",
      "FDP · Christian Dürr on immigration policy",
      "FDP · Christian Dürr sobre política migratoria",
    ),
  },
  fdpMissiles: {
    kind: "party",
    date: "2024-07-28",
    url: "https://www.fdp.de/staatsfinanzen-stabilitaetsorientiert-gestalten",
    title: text(
      "FDP · Christian Lindner, Abschnitt Verteidigungsetat",
      "FDP · Christian Lindner, defence budget section",
      "FDP · Christian Lindner, apartado de defensa",
    ),
  },
  spdSanctions: {
    kind: "party",
    date: "2024-03-19",
    url: "https://www.spdfraktion.de/system/files/documents/position-zentralasien-bruecken-bauen-chancen-bieten.pdf",
    title: text(
      "SPD-Fraktion · Positionspapier Zentralasien",
      "SPD parliamentary group · Central Asia position paper",
      "Grupo parlamentario del SPD · Documento sobre Asia Central",
    ),
  },
  cash: {
    kind: "parliament",
    date: "2024-07-04",
    url: "https://dserver.bundestag.de/btp/20/20181.pdf",
    title: text(
      "Bundestag · Plenarprotokoll 20/181, Anlage 6",
      "Bundestag · Plenary record 20/181, annex 6",
      "Bundestag · Acta plenaria 20/181, anexo 6",
    ),
  },
  fdpVote16: {
    kind: "programme",
    // The party identifies this HTML page as a 2025 programme extract.
    // The date of publication is not given; 2025 is the edition, not a timestamp.
    edition: 2025,
    url: "https://www.fdp.de/forderung/wahlrecht-ab-16",
    title: text(
      "FDP · Wahlrecht ab 16, Programmauszug 2025",
      "FDP · Voting from 16, 2025 programme extract",
      "FDP · Voto desde los 16, extracto del programa de 2025",
    ),
  },
  afdUkraine: {
    kind: "parliament",
    date: "2024-10-16",
    url: "https://www.bundestag.de/dokumente/textarchiv/2024/kw42-de-regierungserklaerung-1023756",
    title: text(
      "Bundestag · Regierungserklärung, Rede von Tino Chrupalla",
      "Bundestag · Government statement debate, Tino Chrupalla’s speech",
      "Bundestag · Debate sobre la declaración del Gobierno, intervención de Tino Chrupalla",
    ),
  },
};

export function matchSourceHref(position, party) {
  const url = position.source?.url || party.source;
  return `${url}${position.page ? `#page=${position.page}` : ""}`;
}

export function matchSourceDate(source, locale) {
  if (!source?.date) return "";
  const monthly = source.date.length === 7;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    ...(monthly ? {} : { day: "numeric" }),
    timeZone: "UTC",
  }).format(new Date(`${source.date}${monthly ? "-01" : ""}T12:00:00Z`));
}
