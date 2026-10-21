import { text, position } from "./party-match-text.js";
import { ADDITIONAL_MATCH_QUESTIONS } from "./party-match-bank.js";
import { MATCH_SOURCES as S } from "./party-match-sources.js";
import { REVISED_MATCH_QUESTIONS } from "./party-match-revisions.js";
import { MATCH_ARGUMENTS } from "./party-match-arguments-data.js";
import { scopeQuestions } from "./party-match-scope-questions.js";
export { text, localText } from "./party-match-text.js";
// Original editorial comparison of 2025 programmes and pre-election primary sources.
// Not Wahl-O-Mat data; no third-party questionnaire or response database reused.
// null means insufficient evidence for this exact statement, never disagreement.
export const MATCH_EDITION = {
  country: "de",
  programmeYear: 2025,
  reviewed: "2026-10-20",
  positionCutoff: "2025-02-23",
  version: 9,
};

export const MATCH_PARTIES = [
  {
    slug: "afd",
    name: "AfD",
    color: "#178ec5",
    source:
      "https://www.afd.de/wp-content/uploads/2025/02/AfD_Bundestagswahlprogramm2025_web.pdf",
  },
  {
    slug: "greens",
    name: "Bündnis 90/Die Grünen",
    color: "#3b9950",
    source:
      "https://cms.gruene.de/uploads/assets/Regierungsprogramm_DIGITAL_DINA5.pdf",
  },
  {
    slug: "bsw",
    name: "BSW",
    color: "#79566f",
    source:
      "https://bb.bsw-vg.de/wp-content/uploads/2025/09/BSW-Wahlprogramm-2025.pdf",
  },
  {
    slug: "union",
    name: "CDU/CSU",
    color: "var(--party-union)",
    source:
      "https://www.cdu.de/app/uploads/2025/01/km_btw_2025_wahlprogramm_langfassung_ansicht.pdf",
  },
  {
    slug: "left",
    name: "Die Linke",
    color: "#9b438b",
    source:
      "https://www.die-linke.de/fileadmin/user_upload/Wahlprogramm_Langfassung_Linke-BTW25_01.pdf",
  },
  {
    slug: "fdp",
    name: "FDP",
    color: "#ba8f00",
    source:
      "https://www.fdp.de/sites/default/files/2024-12/fdp-wahlprogramm_2025.pdf",
  },
  {
    slug: "spd",
    name: "SPD",
    color: "#d9485f",
    source:
      "https://www.spd.de/fileadmin/Dokumente/Beschluesse/Programm/2025_SPD_Regierungsprogramm.pdf",
  },
];

// Page numbers are PDF viewer pages (including the cover), not printed pages.
const ORIGINAL_QUESTIONS = [
  {
    id: "wealth",
    category: text("Steuern", "Tax", "Impuestos"),
    title: text(
      "Sehr hohe Vermögen sollen wieder mit einer jährlichen Vermögensteuer besteuert werden.",
      "A yearly wealth tax should be reintroduced for very large fortunes.",
      "Debería restablecerse un impuesto anual sobre los grandes patrimonios.",
    ),
    context: text(
      "Gemeint ist eine Steuer auf Vermögen, nicht auf das jährliche Einkommen oder eine Erbschaft. Freibeträge und Sätze unterscheiden sich zwischen den Parteien.",
      "This concerns accumulated wealth, not annual income or inheritance. Parties propose different thresholds and rates.",
      "Se trata del patrimonio acumulado, no de los ingresos anuales ni de las herencias. Los umbrales y tipos propuestos varían.",
    ),
    positions: {
      afd: position(
        -1,
        61,
        "Will die Vermögensteuer abschaffen.",
        "Would abolish the wealth tax.",
        "Propone suprimir el impuesto sobre el patrimonio.",
      ),
      bsw: position(
        1,
        17,
        "Ab 25 Millionen Euro, mit gestaffelten Sätzen.",
        "From €25 million, with graduated rates.",
        "Desde 25 millones de euros, con tipos progresivos.",
      ),
      union: position(
        -1,
        34,
        "Lehnt eine Vermögensteuer ab.",
        "Opposes a wealth tax.",
        "Rechaza un impuesto sobre el patrimonio.",
      ),
      fdp: position(
        -1,
        14,
        "Lehnt Vermögensteuer und Vermögensabgabe ab.",
        "Opposes wealth taxes and wealth levies.",
        "Rechaza los impuestos y gravámenes sobre el patrimonio.",
      ),
      greens: position(
        1,
        73,
        "Für eine nationale Steuer auf sehr hohe Vermögen.",
        "Supports a national tax on very large fortunes.",
        "Apoya un impuesto nacional sobre grandes patrimonios.",
      ),
      left: position(
        1,
        10,
        "Für eine Vermögensteuer mit persönlichen Freibeträgen.",
        "Supports a wealth tax with personal allowances.",
        "Apoya el impuesto con mínimos personales exentos.",
      ),
      spd: position(
        1,
        19,
        "Will die Steuer für sehr hohe Vermögen reaktivieren.",
        "Would reactivate the tax for very large fortunes.",
        "Propone reactivarlo para los grandes patrimonios.",
      ),
    },
  },
  {
    id: "borrowing",
    category: text("Investitionen", "Investment", "Inversión"),
    title: text(
      "Der Staat soll für Investitionen mehr Kredite aufnehmen dürfen als nach der Schuldenbremse vor der Bundestagswahl 2025.",
      "The state should be allowed to borrow more for investment than the pre-election 2025 debt brake permitted.",
      "El Estado debería poder endeudarse para invertir más de lo permitido antes de las elecciones federales de 2025.",
    ),
    context: text(
      "Verglichen werden die Wahlprogramme vor der Wahl 2025, nicht spätere Beschlüsse. Eine Reform und eine vollständige Abschaffung sind unterschiedliche Wege zur Lockerung.",
      "This compares pre-election programmes, not subsequent decisions. Reform and abolition are different ways of relaxing borrowing limits.",
      "Se comparan los programas previos a las elecciones, no decisiones posteriores. Reformar y suprimir el límite son vías distintas para flexibilizarlo.",
    ),
    positions: {
      afd: position(
        -1,
        55,
        "Lehnt eine Lockerung der Schuldenbremse ab.",
        "Opposes relaxing the debt brake.",
        "Rechaza flexibilizar el límite de deuda.",
      ),
      bsw: position(
        1,
        15,
        "Will Infrastrukturinvestitionen von der Schuldenbremse ausnehmen.",
        "Would exempt infrastructure investment from borrowing limits.",
        "Propone excluir las inversiones en infraestructuras del límite.",
      ),
      union: position(
        -1,
        77,
        "Hält im Wahlprogramm an der Schuldenbremse fest.",
        "Its election programme retains the debt brake.",
        "Su programa electoral mantiene el límite de deuda.",
      ),
      fdp: position(
        -1,
        35,
        "Will die bestehende Schuldenbremse einhalten.",
        "Would retain the existing debt brake.",
        "Propone respetar el límite de deuda vigente entonces.",
      ),
      greens: position(
        1,
        36,
        "Will die Schuldenbremse für Investitionen reformieren.",
        "Would reform the debt brake for investment.",
        "Propone reformar el límite para facilitar inversiones.",
      ),
      left: position(
        1,
        13,
        "Will die Schuldenbremse abschaffen.",
        "Would abolish the debt brake.",
        "Propone suprimir el límite de deuda.",
      ),
      spd: position(
        1,
        17,
        "Will mehr Investitionsspielraum durch eine Reform.",
        "Would reform the rules to allow more investment.",
        "Propone reformar las reglas para ampliar la inversión.",
      ),
    },
  },
  {
    id: "wage",
    category: text("Arbeit", "Work", "Trabajo"),
    title: text(
      "Die Politik soll sicherstellen, dass der Mindestlohn mindestens 15 Euro pro Stunde beträgt.",
      "Government should ensure a minimum wage of at least €15 an hour.",
      "El Gobierno debería garantizar un salario mínimo de al menos 15 euros por hora.",
    ),
    context: text(
      "Gefragt ist nach einer politischen Vorgabe. Die Alternative ist, die Höhe allein der unabhängigen Mindestlohnkommission zu überlassen. Die Aussage ist kein Hinweis auf den heute geltenden Mindestlohn.",
      "This asks about a political requirement, rather than leaving the rate solely to the independent minimum-wage commission. It does not describe today’s legal minimum.",
      "Se pregunta por una decisión política, frente a dejar la cuantía exclusivamente a la comisión independiente. No se indica el salario mínimo vigente hoy.",
    ),
    positions: {
      afd: position(
        -1,
        null,
        "Die arbeitsmarktpolitische Sprecherin Gerrit Huy lehnt politische Mindestlohnvorgaben ab und verweist auf die unabhängige Kommission. Das ist keine generelle Ablehnung von Lohnerhöhungen.",
        "Labour spokesperson Gerrit Huy opposes political minimum-wage mandates and backs the independent commission. This does not mean opposing all wage increases.",
        "La portavoz de empleo Gerrit Huy rechaza fijar políticamente el salario mínimo y defiende la comisión independiente. No equivale a rechazar cualquier subida salarial.",
        S.afdWage,
      ),
      bsw: position(
        1,
        21,
        "Fordert eine Anhebung auf 15 Euro.",
        "Calls for an increase to €15.",
        "Propone elevarlo a 15 euros.",
      ),
      union: position(
        -1,
        33,
        "Lehnt politische Festsetzung ab; setzt auf die Kommission.",
        "Opposes political rate-setting; backs the commission.",
        "Rechaza la fijación política; respalda a la comisión.",
      ),
      fdp: position(
        -1,
        18,
        "Lehnt politische Eingriffe in die Kommission ab.",
        "Opposes political intervention in the commission.",
        "Rechaza la intervención política en la comisión.",
      ),
      greens: position(
        1,
        67,
        "Fordert zunächst 15 Euro im Jahr 2025.",
        "Calls for an initial €15 in 2025.",
        "Propone inicialmente 15 euros en 2025.",
      ),
      left: position(
        1,
        26,
        "Fordert mindestens 15 Euro, bis 2026 dann 16 Euro.",
        "Calls for at least €15, then €16 by 2026.",
        "Propone al menos 15 euros y 16 para 2026.",
      ),
      spd: position(
        1,
        23,
        "Fordert 15 Euro spätestens ab 2026.",
        "Calls for €15 by 2026 at the latest.",
        "Propone 15 euros como máximo desde 2026.",
      ),
    },
  },
  {
    id: "health",
    category: text("Gesundheit", "Healthcare", "Sanidad"),
    title: text(
      "Gesetzlich und privat Krankenversicherte sollen gemeinsam an der Finanzierung einer Bürgerversicherung beteiligt werden.",
      "People with statutory and private health insurance should jointly fund a citizens’ insurance system.",
      "Las personas con seguro médico público y privado deberían financiar conjuntamente un sistema de seguro ciudadano.",
    ),
    context: text(
      "Es geht um die gemeinsame Finanzierung. Das bedeutet nicht zwingend eine einzige Krankenkasse; die Ausgestaltung unterscheidet sich.",
      "This concerns shared funding, not necessarily a single insurer. The proposed arrangements differ.",
      "Se trata de financiación compartida, no necesariamente de una única aseguradora. Los modelos propuestos varían.",
    ),
    positions: {
      afd: position(
        -1,
        6,
        "Die Fraktion wendet sich im Ausschuss ausdrücklich gegen die Bürgerversicherung und verteidigt ein eigenständiges privates Versicherungssystem im Wettbewerb mit der GKV.",
        "In committee, the parliamentary group explicitly opposes citizens’ insurance and defends a separate private insurance system competing with statutory insurers.",
        "En comisión, el grupo rechaza expresamente el seguro ciudadano y defiende un sistema privado separado que compita con el seguro público.",
        S.afdHealth,
      ),
      bsw: position(
        1,
        3,
        "Für eine Bürgerversicherung.",
        "Supports citizens’ insurance.",
        "Apoya un seguro ciudadano.",
      ),
      union: position(
        -1,
        69,
        "Will gesetzliche und private Versicherung beibehalten.",
        "Would retain statutory and private insurance systems.",
        "Propone mantener los sistemas público y privado.",
      ),
      fdp: position(
        -1,
        33,
        "Für das duale System, gegen Bürgerversicherung.",
        "Supports the dual system; opposes citizens’ insurance.",
        "Apoya el sistema dual y rechaza el seguro ciudadano.",
      ),
      greens: position(
        1,
        93,
        "Will Privatversicherte am solidarischen Ausgleich beteiligen.",
        "Would include private policyholders in shared funding.",
        "Propone incluir a los asegurados privados en la financiación solidaria.",
      ),
      left: position(
        1,
        18,
        "Für eine solidarische Versicherung, in die alle einzahlen.",
        "Supports shared insurance with contributions from everyone.",
        "Apoya un seguro solidario al que todos contribuyan.",
      ),
      spd: position(
        1,
        29,
        "Will beide Versicherungsbereiche solidarisch beteiligen.",
        "Would involve both insurance sectors in shared funding.",
        "Propone la financiación solidaria de ambos sectores.",
      ),
    },
  },
  {
    id: "ukraine",
    category: text("Außenpolitik", "Foreign policy", "Política exterior"),
    title: text(
      "Deutschland soll die Ukraine weiterhin mit Waffen unterstützen.",
      "Germany should continue supplying weapons to Ukraine.",
      "Alemania debería seguir suministrando armas a Ucrania.",
    ),
    context: text(
      "Humanitäre Hilfe ist nicht Gegenstand dieser Aussage. Zustimmung bedeutet nicht automatisch Zustimmung zu jedem Waffensystem, etwa Taurus.",
      "Humanitarian aid is not part of this statement. Agreement does not imply support for every weapons system, such as Taurus.",
      "La ayuda humanitaria no forma parte de esta afirmación. Estar de acuerdo no implica apoyar todos los sistemas de armas, como Taurus.",
    ),
    positions: {
      afd: position(
        -1,
        null,
        "Fraktionschef Tino Chrupalla spricht sich im Bundestag gegen weitere deutsche Waffenlieferungen an die Ukraine aus.",
        "Parliamentary leader Tino Chrupalla speaks against further German weapons supplies to Ukraine in the Bundestag.",
        "El líder parlamentario Tino Chrupalla se pronuncia en el Bundestag contra más suministros alemanes de armas a Ucrania.",
        S.afdUkraine,
      ),
      bsw: position(
        -1,
        5,
        "Lehnt Waffenlieferungen in Kriegsgebiete ab.",
        "Opposes supplying weapons to war zones.",
        "Rechaza suministrar armas a zonas de guerra.",
      ),
      union: position(
        1,
        47,
        "Für Waffenlieferungen zur Selbstverteidigung der Ukraine.",
        "Supports weapons supplies for Ukraine’s self-defence.",
        "Apoya el suministro de armas para la autodefensa ucraniana.",
      ),
      fdp: position(
        1,
        47,
        "Will die Unterstützung nicht an Waffenlieferungen scheitern lassen.",
        "Supports continuing weapons assistance.",
        "Apoya mantener la asistencia militar con armas.",
      ),
      greens: position(
        1,
        142,
        "Für die weitere militärische Unterstützung der Ukraine.",
        "Supports continued military assistance to Ukraine.",
        "Apoya mantener la asistencia militar a Ucrania.",
      ),
      left: position(
        -1,
        23,
        "Lehnt Waffenlieferungen in Kriegsgebiete ab.",
        "Opposes supplying weapons to war zones.",
        "Rechaza suministrar armas a zonas de guerra.",
      ),
      spd: position(
        1,
        58,
        "Für Waffenlieferungen, im Programm ausdrücklich ohne Taurus.",
        "Supports weapons supplies, explicitly excluding Taurus.",
        "Apoya suministrar armas, excluyendo expresamente Taurus.",
      ),
    },
  },
  {
    id: "nuclear",
    category: text("Energie", "Energy", "Energía"),
    title: text(
      "Der Bau neuer Atomkraftwerke zur Stromerzeugung soll in Deutschland erlaubt werden.",
      "Germany should permit new nuclear power stations for electricity generation.",
      "Alemania debería permitir construir nuevas centrales nucleares para generar electricidad.",
    ),
    context: text(
      "Gemeint sind Kernspaltungsreaktoren, einschließlich kleiner Reaktoren. Forschung zur Kernfusion und die Wiederinbetriebnahme alter Anlagen sind andere Fragen.",
      "This concerns nuclear fission, including small reactors. Fusion research and restarting existing plants are separate questions.",
      "Se trata de fisión nuclear, incluidos reactores pequeños. La investigación en fusión y reabrir centrales existentes son cuestiones distintas.",
    ),
    positions: {
      afd: position(
        1,
        166,
        "Will neue Kernkraftwerke errichten.",
        "Would build new nuclear power stations.",
        "Propone construir nuevas centrales nucleares.",
      ),
      bsw: position(
        -1,
        11,
        "Lehnt neue konventionelle Anlagen und derzeit auch SMR ab.",
        "Opposes new conventional plants and currently also SMRs.",
        "Rechaza nuevas centrales convencionales y, por ahora, reactores pequeños.",
      ),
      union: position(
        null,
        22,
        "Forschung und Wiederanlauf prüfen; Neubau nicht eindeutig festgelegt.",
        "Research and restarts proposed; new construction not clearly specified.",
        "Propone investigación y estudiar reaperturas; no concreta nuevas construcciones.",
      ),
      fdp: position(
        1,
        18,
        "Will den Bau neuer Reaktoren rechtlich ermöglichen.",
        "Would legally permit new reactors.",
        "Propone permitir legalmente nuevos reactores.",
      ),
      greens: position(
        -1,
        43,
        "Lehnt eine Rückkehr zur Atomkraft ab.",
        "Opposes returning to nuclear power.",
        "Rechaza volver a la energía nuclear.",
      ),
      left: position(
        -1,
        33,
        "Will den Atomausstieg im Grundgesetz verankern.",
        "Would enshrine the nuclear exit in the constitution.",
        "Propone blindar constitucionalmente el abandono de la energía nuclear.",
      ),
      spd: position(
        -1,
        53,
        "Hält am Ende der Atomkraft in Deutschland fest.",
        "Supports retaining Germany’s nuclear exit.",
        "Apoya mantener el abandono de la energía nuclear.",
      ),
    },
  },
  {
    id: "speed",
    category: text("Verkehr", "Transport", "Transporte"),
    title: text(
      "Auf Autobahnen soll ein allgemeines Tempolimit von höchstens 130 km/h gelten.",
      "Motorways should have a general speed limit of no more than 130 km/h.",
      "Las autopistas deberían tener un límite general de velocidad de como máximo 130 km/h.",
    ),
    context: text(
      "Auch ein niedrigeres allgemeines Limit zählt als Zustimmung. Einzelne bestehende Streckenlimits sind nicht gemeint.",
      "A lower general limit also counts as agreement. Existing limits on individual sections are not the subject here.",
      "Un límite general inferior también cuenta como acuerdo. No se trata de límites existentes en tramos concretos.",
    ),
    positions: {
      afd: position(
        -1,
        45,
        "Lehnt ein allgemeines Autobahntempolimit ab.",
        "Opposes a general motorway speed limit.",
        "Rechaza un límite general en autopistas.",
      ),
      bsw: position(
        null,
        null,
        "Im geprüften Programm nicht eindeutig festgelegt.",
        "Not clearly specified in the reviewed programme.",
        "No se concreta en el programa revisado.",
      ),
      union: position(
        -1,
        74,
        "Lehnt ein allgemeines Autobahntempolimit ab.",
        "Opposes a general motorway speed limit.",
        "Rechaza un límite general en autopistas.",
      ),
      fdp: position(
        -1,
        41,
        "Lehnt ein allgemeines Autobahntempolimit ab.",
        "Opposes a general motorway speed limit.",
        "Rechaza un límite general en autopistas.",
      ),
      greens: position(
        1,
        48,
        "Fordert ein allgemeines Limit von 130 km/h.",
        "Calls for a general 130 km/h limit.",
        "Propone un límite general de 130 km/h.",
      ),
      left: position(
        1,
        37,
        "Fordert ein allgemeines Limit von 120 km/h.",
        "Calls for a general 120 km/h limit.",
        "Propone un límite general de 120 km/h.",
      ),
      spd: position(
        1,
        36,
        "Fordert ein allgemeines Limit von 130 km/h.",
        "Calls for a general 130 km/h limit.",
        "Propone un límite general de 130 km/h.",
      ),
    },
  },
  {
    id: "asylum",
    category: text("Asylpolitik", "Asylum policy", "Política de asilo"),
    title: text(
      "Asylverfahren sollen in sichere Drittstaaten ausgelagert werden können.",
      "It should be possible to outsource asylum procedures to safe third countries.",
      "Debería ser posible externalizar los procedimientos de asilo a terceros países seguros.",
    ),
    context: text(
      "Gemeint ist die Auslagerung von Verfahren, nicht die europäische Zuständigkeitsverteilung oder die Abschiebung nach einem abgelehnten Antrag. Parteien unterscheiden sich bei Umfang und rechtlichen Bedingungen; die Quellenansicht nennt diese Unterschiede.",
      "This concerns outsourcing procedures, not allocating responsibility within Europe or returning people after rejected claims. Parties differ on scope and legal conditions; the evidence view explains these differences.",
      "Se trata de externalizar procedimientos, no del reparto de competencias dentro de Europa ni de devoluciones tras rechazar solicitudes. El alcance y las condiciones jurídicas varían; la vista de fuentes explica las diferencias.",
    ),
    positions: {
      afd: position(
        1,
        104,
        "Will Anträge und Verfahren grundsätzlich außerhalb Deutschlands bearbeiten lassen. Das Programm benennt an dieser Stelle keine konkreten Aufnahmestaaten; als Unterstützung einer Auslagerung eingeordnet.",
        "Would generally process applications outside Germany. This passage does not identify host states; coded as support for outsourcing.",
        "Propone tramitar las solicitudes fuera de Alemania. El pasaje no identifica países receptores; se clasifica como apoyo a la externalización.",
      ),
      bsw: position(
        1,
        38,
        "Will Verfahren möglichst in sicheren Drittstaaten außerhalb der EU.",
        "Favours safe third-country procedures outside the EU where possible.",
        "Prefiere realizarlos en terceros países seguros fuera de la UE.",
      ),
      union: position(
        1,
        44,
        "Will Verfahren und Schutz in sicheren Drittstaaten.",
        "Supports procedures and protection in safe third countries.",
        "Apoya los procedimientos y la protección en terceros países seguros.",
      ),
      fdp: position(
        1,
        28,
        "Für Drittstaatenverfahren mit Sicherheit und rechtsstaatlichen Garantien.",
        "Supports third-country procedures with safety and rule-of-law safeguards.",
        "Apoya procedimientos en terceros países con garantías jurídicas y de seguridad.",
      ),
      greens: position(
        -1,
        131,
        "Lehnt die Auslagerung in Drittstaaten ab.",
        "Opposes outsourcing procedures to third countries.",
        "Rechaza trasladar los procedimientos a terceros países.",
      ),
      left: position(
        -1,
        52,
        "Lehnt Verantwortungsverlagerung durch Drittstaatenregelungen ab.",
        "Opposes shifting responsibility through third-country rules.",
        "Rechaza trasladar la responsabilidad mediante estas normas.",
      ),
      spd: position(
        -1,
        56,
        "Lehnt die Auslagerung von Asylverfahren ausdrücklich ab; Verfahren sollen in der EU stattfinden.",
        "Explicitly opposes externalising asylum procedures; procedures should take place in the EU.",
        "Rechaza expresamente externalizar el asilo; los procedimientos deben realizarse en la UE.",
      ),
    },
  },
];

// Nested, fixed sets: expanding never replaces an answer or changes its meaning.
const ORDER = [
  "wealth",
  "schools",
  "asylum",
  "borrowing",
  "cash-choice",
  "capitaltax",
  "selfdetermination",
  "climate",
  "carbon",
  "wage",
  "nuclear",
  "cannabis",
  "rent",
  "defence",
  "ticket",
  "health",
  "citizenship",
  "speed",
  "abortion",
  "missiles",
  "russia",
  "rail",
  "conscription",
  "soli",
  "welfare",
  "pensions",
  "cash",
  "vote16",
  "inheritance",
  "ukraine",
];
const bank = [...ORIGINAL_QUESTIONS, ...ADDITIONAL_MATCH_QUESTIONS];
const scopeRevisions = scopeQuestions(bank);
export const MATCH_QUESTIONS = ORDER.map((id) => {
  const question =
    (id === "cash-choice" && bank.find((q) => q.id === "cash")) ||
    scopeRevisions.find((q) => q.replaces === id) ||
    REVISED_MATCH_QUESTIONS.find((q) => q.replaces === id) ||
    bank.find((q) => q.id === id);
  if (!question) throw new Error(`Missing comparison question: ${id}`);
  return {
    ...question,
    positions: Object.fromEntries(
      Object.entries(question.positions).map(([slug, position]) => [
        slug,
        {
          ...position,
          ...(MATCH_ARGUMENTS[question.id]?.[slug]
            ? { argument: MATCH_ARGUMENTS[question.id][slug] }
            : {}),
        },
      ]),
    ),
  };
});
export const MATCH_LENGTHS = [8, 16, 30];
export const questionsForLength = (length) =>
  MATCH_QUESTIONS.slice(0, MATCH_LENGTHS.includes(length) ? length : 16);
