import {
  MATCH_EDITION,
  MATCH_PARTIES,
  MATCH_QUESTIONS,
  localText,
} from "./party-match-data.js";
import { MATCH_COPY } from "./party-match-copy.js";
import { matchSourceHref } from "./party-match-sources.js";

// Public editorial evidence only. Deliberately accepts no personal answers or results.
export function matchEvidenceReceipt(
  locale,
  questions = MATCH_QUESTIONS,
  scope = null,
) {
  const l = (value) => localText(value, locale);
  return {
    format: "pollframe-policy-evidence-v1",
    edition: MATCH_EDITION,
    language: locale,
    ...(scope ? { scope } : {}),
    explanation: l(MATCH_COPY.methodology),
    calculation: l(MATCH_COPY.formula),
    editorialStatus: l(MATCH_COPY.ai),
    positions: { agree: 1, mixed: 0, disagree: -1, unknown: null },
    questions: questions.map((q) => ({
      id: q.id,
      statement: l(q.title),
      context: l(q.context),
      parties: MATCH_PARTIES.map((party) => {
        const p = q.positions[party.slug];
        return {
          party: party.name,
          position: p.value,
          interpretation: l(p.note),
          source: matchSourceHref(p, party),
          sourceTitle: p.source
            ? l(p.source.title)
            : `${party.name} · ${l(MATCH_COPY.programmeYear)}`,
          sourceDate: p.source?.date ?? null,
          programmeYear:
            p.source && p.source.kind !== "programme" ? null : 2025,
          pdfPage: p.page ?? null,
          conclusive: p.value !== null,
        };
      }),
    })),
  };
}
