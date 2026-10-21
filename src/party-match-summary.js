import { MATCH_PARTIES } from "./party-match-data.js";
import { MATCH_TOPICS } from "./party-match-model.js";
const parties = new Set(MATCH_PARTIES.map((p) => p.slug)),
  axes = ["economy", "society", "climate"];
export function validateMatchInsights(
  input,
  answered,
  minimum = 3,
  selectedTopics = MATCH_TOPICS,
) {
  const score = (v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 100);
  const count = (v) => Number.isInteger(v) && v >= 0 && v <= answered;
  if (
    !Array.isArray(input.topics) ||
    input.topics.length > 5 ||
    !Array.isArray(input.profiles) ||
    input.profiles.length !== 8 ||
    !Array.isArray(input.pairs) ||
    input.pairs.length !== 21
  )
    throw Error("Invalid result summaries");
  const unique = (rows, key) => new Set(rows.map(key)).size === rows.length;
  if (
    !unique(input.topics, (r) => r.id) ||
    !unique(input.profiles, (r) => r.party) ||
    !unique(input.pairs, (r) => [r.first, r.second].sort().join(":"))
  )
    throw Error("Repeated summaries");
  const topics = input.topics.map((topic) => {
    if (
      !selectedTopics.some((t) => t.id === topic.id) ||
      !Array.isArray(topic.rows) ||
      topic.rows.length > 7 ||
      !unique(topic.rows, (r) => r.slug)
    )
      throw Error("Invalid topic");
    return {
      id: topic.id,
      rows: topic.rows.map((r) => {
        if (
          !parties.has(r.slug) ||
          !score(r.score) ||
          r.score === null ||
          !count(r.known) ||
          r.known < (minimum === 3 ? 3 : 1)
        )
          throw Error("Invalid topic score");
        return { slug: r.slug, score: r.score, known: r.known };
      }),
    };
  });
  const profiles = input.profiles.map((profile) => {
    if (
      (profile.party !== null && !parties.has(profile.party)) ||
      !Array.isArray(profile.axes) ||
      profile.axes.length !== 3 ||
      !unique(profile.axes, (r) => r.id)
    )
      throw Error("Invalid profile");
    return {
      party: profile.party,
      axes: axes.map((id) => {
        const a = profile.axes.find((a) => a.id === id);
        if (
          !a ||
          !count(a.count) ||
          !score(a.user) ||
          !score(a.partyScore) ||
          (a.user === null) !== a.count < minimum ||
          (a.partyScore === null) !==
            (profile.party === null || a.count < minimum)
        )
          throw Error("Invalid axis");
        return { id, count: a.count, user: a.user, partyScore: a.partyScore };
      }),
    };
  });
  const pairs = input.pairs.map((p) => {
    if (
      !parties.has(p.first) ||
      !parties.has(p.second) ||
      p.first === p.second ||
      !count(p.count) ||
      !score(p.firstScore) ||
      !score(p.secondScore) ||
      (p.firstScore === null) !== p.count < 4 ||
      (p.secondScore === null) !== p.count < 4
    )
      throw Error("Invalid pair");
    return {
      first: p.first,
      second: p.second,
      count: p.count,
      firstScore: p.firstScore,
      secondScore: p.secondScore,
    };
  });
  return { topics, profiles, pairs };
}
