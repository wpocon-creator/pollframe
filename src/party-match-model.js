import { MATCH_PARTIES, MATCH_QUESTIONS } from "./party-match-data.js";

export const MIN_MATCH_ANSWERS = 4;
export const validAnswer = (value) =>
  value === -1 || value === 0 || value === 1;
export const matchWeight = (answer) => (answer?.important === true ? 2 : 1);
export function comparePositions(answer, position) {
  if (!validAnswer(answer) || !validAnswer(position)) return null;
  return 1 - Math.abs(answer - position) / 2;
}
export const isComparable = (q, parties = MATCH_PARTIES) =>
  parties.length >= 2 &&
  parties.every((p) => validAnswer(q.positions[p.slug]?.value));

const EPSILON = 1e-9;
export const scoreLabel = (party) =>
  Number.isFinite(party.score) ? `${Math.round(party.score)}%` : "—";
export const rankLabel = (party) =>
  party.rank === null || party.rank === undefined ? "—" : String(party.rank);

// Available-evidence agreement. Each party's denominator contains only its
// documented positions on answered questions, with the SAME user weights.
// Unknown is not neutral. Coverage is always returned alongside the score.
// Bounds remain internal audit fields, never a user-facing estimate or rank.
export function calculateMatches(
  answers = {},
  questions = MATCH_QUESTIONS,
  parties = MATCH_PARTIES,
) {
  const answered = questions.filter((q) => validAnswer(answers[q.id]?.value));
  const includedIds = new Set(answered.map((q) => q.id));
  const totalWeight = answered.reduce(
    (sum, q) => sum + matchWeight(answers[q.id]),
    0,
  );
  const informative = answered.filter((q) =>
    parties.some((p) => validAnswer(q.positions[p.slug]?.value)),
  );
  const auditReady =
    informative.length >= MIN_MATCH_ANSWERS && parties.length >= 2;
  const ready =
    auditReady &&
    parties.some(
      (party) =>
        answered.filter((q) => validAnswer(q.positions[party.slug]?.value))
          .length >= MIN_MATCH_ANSWERS,
    );
  const results = parties.map((party) => {
    let earned = 0,
      minimum = 0,
      maximum = 0,
      known = 0,
      knownWeight = 0;
    const comparisons = questions.map((question) => {
      const answer = answers[question.id];
      const position = question.positions[party.slug];
      const agreement = comparePositions(answer?.value, position?.value);
      const weight = matchWeight(answer);
      const included = includedIds.has(question.id);
      const counted = included && agreement !== null;
      if (counted) {
        earned += weight * agreement;
        minimum += weight * agreement;
        maximum += weight * agreement;
        known++;
        knownWeight += weight;
      } else if (included) {
        minimum += weight * (answer.value === 0 ? 0.5 : 0);
        maximum += weight;
      }
      return {
        question,
        answer,
        position,
        agreement,
        weight,
        counted,
        included,
      };
    });
    return {
      ...party,
      comparisons,
      earned,
      known,
      knownWeight,
      missing: answered.length - known,
      score:
        ready && known >= MIN_MATCH_ANSWERS
          ? (100 * earned) / knownWeight
          : null,
      coverage: totalWeight ? knownWeight / totalWeight : 0,
      rank: null,
      lower: auditReady ? (100 * minimum) / totalWeight : null,
      upper: auditReady ? (100 * maximum) / totalWeight : null,
      rankMin: null,
      rankMax: null,
    };
  });
  if (auditReady)
    for (const party of results) {
      // Only strict, unrounded differences outrank. Overlap does NOT imply a tie.
      party.rankMin =
        1 +
        results.filter((p) => p !== party && p.lower > party.upper + EPSILON)
          .length;
      party.rankMax =
        1 +
        results.filter((p) => p !== party && p.upper > party.lower + EPSILON)
          .length;
    }
  results.sort(
    (a, b) =>
      (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name, "de"),
  );
  for (const party of results) {
    if (party.score !== null)
      party.rank =
        1 +
        results.filter(
          (other) =>
            other.score !== null && other.score > party.score + EPSILON,
        ).length;
  }
  return {
    answered: answered.length,
    counted: answered.length,
    includedIds: [...includedIds],
    omittedIds: answered.filter((q) => !includedIds.has(q.id)).map((q) => q.id),
    totalWeight,
    ready,
    results,
    fullyDocumented: answered.filter((q) => isComparable(q, parties)).length,
  };
}

export function compareOnSharedEvidence(answers, questions, parties) {
  const shared = questions.filter(
    (q) =>
      validAnswer(answers[q.id]?.value) &&
      parties.every((p) => validAnswer(q.positions[p.slug]?.value)),
  );
  return {
    ...calculateMatches(answers, shared, parties),
    sharedCount: shared.length,
  };
}

export const MATCH_TOPICS = [
  {
    id: "economy",
    label: {
      de: "Wirtschaft & Soziales",
      en: "Economy & welfare",
      es: "Economía y bienestar",
    },
    ids: [
      "wealth",
      "debt-abolition",
      "minimum-wage-abolition",
      "inheritance",
      "wage",
      "rent",
      "health",
      "soli",
      "benefit-sanctions",
      "pensions",
    ],
  },
  {
    id: "society",
    label: {
      de: "Gesellschaft & Rechte",
      en: "Society & rights",
      es: "Sociedad y derechos",
    },
    ids: [
      "asylum",
      "selfdetermination",
      "cannabis",
      "citizenship",
      "abortion",
      "cash",
      "vote16",
      "ip-retention",
    ],
  },
  {
    id: "climate",
    label: {
      de: "Klima & Mobilität",
      en: "Climate & transport",
      es: "Clima y transporte",
    },
    ids: [
      "carbon",
      "climate",
      "nuclear-restart",
      "ticket",
      "speed",
      "rail",
      "cars-2035",
    ],
  },
  {
    id: "security",
    label: {
      de: "Außenpolitik & Sicherheit",
      en: "Foreign policy & security",
      es: "Política exterior y seguridad",
    },
    ids: ["conscription", "defence", "missiles", "russia", "ukraine"],
  },
  {
    id: "education",
    label: { de: "Bildung", en: "Education", es: "Educación" },
    ids: [],
  },
];

export function topicMatches(party, topics = MATCH_TOPICS) {
  return topics.map((topic) => {
    const rows = party.comparisons.filter(
      (row) => topic.ids.includes(row.question.id) && row.counted,
    );
    const weight = rows.reduce((sum, row) => sum + row.weight, 0);
    return {
      ...topic,
      known: rows.length,
      score: rows.length >= 3 && weight
        ? (rows.reduce((sum, row) => sum + row.weight * row.agreement, 0) /
            weight) *
          100
        : null,
    };
  }).filter((topic) => topic.known >= 3);
}

export function resultDrivers(party) {
  const rows = party.comparisons.filter((row) => row.counted);
  const order = (a, b) =>
    b.weight - a.weight || a.question.id.localeCompare(b.question.id);
  return {
    agreements: rows
      .filter((row) => row.agreement === 1)
      .sort(order)
      .slice(0, 3),
    disagreements: rows
      .filter((row) => row.agreement === 0)
      .sort(order)
      .slice(0, 3),
  };
}
