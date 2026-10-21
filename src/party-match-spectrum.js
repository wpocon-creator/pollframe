import { text as t } from "./party-match-text.js";
import { MATCH_PARTIES } from "./party-match-data.js";
import { topicRound } from "./party-match-topic-definitions.js";
import {
  validAnswer,
  matchWeight,
  topicMatches,
  compareOnSharedEvidence,
  MATCH_TOPICS,
} from "./party-match-model.js";

// Pollframe's explicit, editorial issue scales. These are NOT CHES scores, a
// validated personality instrument, or a statistical estimate of ideology.
// Reversed statements are reversed here too. Foreign policy and nuclear power
// are deliberately not treated as proxies for social freedom or climate concern.
export const MATCH_AXES = [
  {
    id: "economy",
    name: t("Wirtschaft", "Economy", "Economía"),
    low: t("Mehr Umverteilung", "More redistribution", "Más redistribución"),
    high: t("Mehr Markt", "More market", "Más mercado"),
    items: {
      wealth: -1,
      "debt-abolition": -1,
      "minimum-wage-abolition": 1,
      inheritance: 1,
      wage: -1,
      rent: -1,
      health: -1,
      soli: 1,
      pensions: -1,
    },
    groups: {
      tax: ["wealth", "inheritance", "soli"],
      budget: ["debt-abolition"],
      work: ["wage", "minimum-wage-abolition"],
      housing: ["rent"],
      insurance: ["health", "pensions"],
    },
  },
  {
    id: "society",
    name: t(
      "Freiheit & staatliche Vorgaben",
      "Freedom & state requirements",
      "Libertad y exigencias estatales",
    ),
    low: t(
      "Mehr persönliche Freiheit",
      "More personal freedom",
      "Más libertad personal",
    ),
    high: t(
      "Mehr staatliche Vorgaben",
      "More state requirements",
      "Más exigencias estatales",
    ),
    items: {
      asylum: 1,
      selfdetermination: 1,
      cannabis: 1,
      citizenship: -1,
      abortion: -1,
      "ip-retention": 1,
      vote16: -1,
      cash: -1,
    },
    groups: {
      migration: ["asylum", "citizenship"],
      personal: ["selfdetermination", "cannabis", "abortion"],
      privacy: ["ip-retention", "cash"],
      participation: ["vote16"],
    },
  },
  {
    id: "climate",
    name: t("Klimaambition", "Climate ambition", "Ambición climática"),
    low: t("Geringere Vorgaben", "Fewer requirements", "Menos requisitos"),
    high: t("Stärkere Vorgaben", "Stronger requirements", "Más requisitos"),
    items: { carbon: 1, climate: 1, speed: 1, ticket: 1, "cars-2035": 1 },
    groups: {
      pricing: ["carbon"],
      targets: ["climate", "cars-2035"],
      transport: ["speed", "ticket"],
    },
  },
];
export const SPECTRUM_COPY = {
  title: t(
    "Du im politischen Spektrum",
    "You on the political spectrum",
    "Tú en el espectro político",
  ),
  info: t(
    "Die Grafik ordnet die ausgewählten politischen Maßnahmen ein, nicht deine gesamte politische Identität. Jede separat wählbare Skala zeigt einen Bereich: Umverteilung und Marktregeln, persönliche Freiräume und staatliche Vorgaben oder Klimavorgaben. Die Wirtschaft enthält jetzt auch Fragen zur Reichweite staatlicher Regeln: Eine Reform ist nicht dasselbe wie eine vollständige Abschaffung. Innerhalb jeder Achse werden verwandte Fragen zuerst zusammengefasst: Steuern, Haushalt, Löhne, Wohnen und Versicherungen beziehungsweise Migration, persönliche Rechte, Datenschutz/Zahlungswahl und Wahlrechte. Diese Themenfamilien zählen gleich viel, damit viele ähnliche Fragen nicht die ganze Achse bestimmen. Prioritäten zählen innerhalb einer Familie doppelt; ihr durchschnittliches Prioritätsgewicht bestimmt dann das Gewicht der Familie. Mindestens drei belegte Antworten sind nötig. Alle Richtungen stehen unten. Parteienvergleiche verwenden für beide dieselben gemeinsam belegten Antworten; dadurch kann auch dein Punkt wechseln. Fehlende Positionen werden ausgelassen, nie als Mitte gewertet. Die Skala ist redaktionell festgelegt, nicht wissenschaftlich validiert; sie misst weder Extremismus noch die Übereinstimmungs-Prozente der Rangliste. Es wird niemand nachträglich in die Mitte geschoben. Vor Version 7 gespeicherte Grafiken behalten ihre damalige Berechnung.",
    "The chart positions the selected policy measures, not your whole political identity. Each independently selectable scale covers one area: redistribution and market rules, personal freedom and state requirements, or climate requirements. Economic questions now distinguish the reach of regulation: reform is not the same as complete abolition. Related questions are averaged first: tax, budgets, wages, housing and insurance, or migration, personal rights, privacy/payment choice and voting rights. These families count equally, preventing numerous similar questions from dominating an axis. Priorities count twice within a family; its average priority weight then weights that family. At least three documented answers are needed. Every direction is listed below. Party comparisons use the same jointly documented answers for both of you, so your point may change too. Missing positions are omitted, never scored as the centre. The scale is editorial, not scientifically validated; it measures neither extremism nor the ranking’s agreement percentages. Nobody is moved towards the centre afterwards. Graphics saved before version 7 retain their original calculation.",
    "La gráfica sitúa las medidas políticas seleccionadas, no toda tu identidad política. Cada escala seleccionable por separado cubre un ámbito: redistribución y mercado, libertad personal y exigencias estatales, o requisitos climáticos. Las preguntas económicas distinguen el alcance: reformar no equivale a suprimir por completo. Primero se promedian las preguntas relacionadas: impuestos, presupuesto, salarios, vivienda y seguros, o migración, derechos personales, privacidad/elección de pago y voto. Estas familias pesan igual para que muchas preguntas similares no dominen un eje. Las prioridades cuentan doble dentro de la familia; su peso medio pondera después esa familia. Hacen falta al menos tres respuestas documentadas. Abajo se indican las direcciones. Comparar partidos usa las mismas preguntas documentadas para ambos; tu punto puede variar. Las posturas desconocidas se omiten, nunca cuentan como centro. La escala es editorial, no está validada científicamente: no mide extremismo ni los porcentajes del ranking. Nadie se mueve después hacia el centro. Las gráficas guardadas antes de la versión 7 conservan su cálculo original.",
  ),
  onlyMe: t("Nur meine Antworten", "My answers only", "Solo mis respuestas"),
  shared: t("Gemeinsame Grundlage", "Shared basis", "Base común"),
  tooFew: t(
    "Diese Skala erscheint erst ab drei berücksichtigten Antworten – beim Vergleich müssen auch die Parteipositionen belegt sein.",
    "This scale appears after three included answers; comparisons also require documented party positions.",
    "Esta escala aparece a partir de tres respuestas incluidas; las comparaciones requieren también posturas documentadas del partido.",
  ),
  you: t("Du", "You", "Tú"),
  method: t(
    "Achsen & berücksichtigte Fragen",
    "Axes & included questions",
    "Ejes y preguntas incluidas",
  ),
};
export function politicalProfile(answers, questions, partySlug = null) {
  if (partySlug && !MATCH_PARTIES.some((p) => p.slug === partySlug))
    throw Error("Unknown party");
  return {
    party: partySlug,
    axes: MATCH_AXES.map((axis) => {
      const rows = questions.filter(
        (q) =>
          axis.items[q.id] &&
          validAnswer(answers[q.id]?.value) &&
          (!partySlug || validAnswer(q.positions[partySlug]?.value)),
      );
      // Tax questions must not count as several independent measures of the
      // whole economy just because that subject has more items in this set.
      const groups = Object.values(axis.groups)
        .map((ids) => rows.filter((q) => ids.includes(q.id)))
        .filter((group) => group.length);
      const groupWeight = (group) =>
        group.reduce((n, q) => n + matchWeight(answers[q.id]), 0) /
        group.length;
      const weight = groups.reduce((n, group) => n + groupWeight(group), 0);
      const value = (get) =>
        rows.length < 3
          ? null
          : groups.reduce((sum, group) => {
              const weighted = group.reduce(
                (n, q) =>
                  n +
                  (get(q) * axis.items[q.id] + 1) *
                    50 *
                    matchWeight(answers[q.id]),
                0,
              );
              const total = group.reduce(
                (n, q) => n + matchWeight(answers[q.id]),
                0,
              );
              return sum + (weighted / total) * groupWeight(group);
            }, 0) / weight;
      return {
        id: axis.id,
        count: rows.length,
        user: value((q) => answers[q.id].value),
        partyScore: partySlug
          ? value((q) => q.positions[partySlug].value)
          : null,
        questionIds: rows.map((q) => q.id),
      };
    }),
  };
}
export function buildMatchInsights(
  result,
  answers,
  questions,
  round = "general",
) {
  const topics = topicRound(round)?.groups || MATCH_TOPICS;
  return {
    topics: topics.map((topic) => ({
      id: topic.id,
      rows: result.results.flatMap((p) => {
        const row = topicMatches(p, topics).find((r) => r.id === topic.id);
        return row
          ? [{ slug: p.slug, score: row.score, known: row.known }]
          : [];
      }),
    })),
    profiles: [null, ...MATCH_PARTIES.map((p) => p.slug)].map((slug) => {
      const p = politicalProfile(answers, questions, slug);
      return { party: slug, axes: p.axes.map(({ questionIds, ...a }) => a) };
    }),
    pairs: MATCH_PARTIES.flatMap((a, i) =>
      MATCH_PARTIES.slice(i + 1).map((b) => {
        const pair = compareOnSharedEvidence(answers, questions, [a, b]);
        return {
          first: a.slug,
          second: b.slug,
          count: pair.sharedCount,
          firstScore: pair.results.find((p) => p.slug === a.slug).score,
          secondScore: pair.results.find((p) => p.slug === b.slug).score,
        };
      }),
    ),
  };
}
