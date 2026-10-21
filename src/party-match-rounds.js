import { MATCH_QUESTIONS, questionsForLength } from "./party-match-data.js";
import { TOPIC_QUESTIONS } from "./party-match-topic-bank.js";
import { topicRound } from "./party-match-topic-definitions.js";
export {
  TOPIC_ROUNDS,
  topicRound,
  roundScope,
} from "./party-match-topic-definitions.js";
const bank = new Map(
  [...MATCH_QUESTIONS, ...TOPIC_QUESTIONS].map((q) => [q.id, q]),
);
export function questionsForRound(id = "general", length = 16) {
  const round = topicRound(id);
  if (!round) return questionsForLength(length);
  return round.groups.flatMap((g) =>
    g.ids.map((id) => {
      const q = bank.get(id);
      if (!q) throw Error("Missing topic question: " + id);
      return q;
    }),
  );
}
