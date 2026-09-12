export const ELECTION_DAY = "2026-09-06";
export const ELECTION_PARTIES = {
  CDU: { id: "101", color: "#25282b" },
  AfD: { id: "7", color: "#159cd5" },
  SPD: { id: "2", color: "#e34461" },
  GRÜNE: { id: "4", color: "#38984d" },
  "Die Linke": { id: "5", color: "#c62973" },
  BSW: { id: "23", color: "#803a72" },
  FDP: { id: "3", color: "#cfac16" },
  "FREIE WÄHLER": { id: "8", color: "#ed861a" },
};
export function lastPreElectionPolls(data) {
  const eligible = (data?.polls || []).filter(
    (poll) =>
      /^\d{4}-\d{2}-\d{2}$/.test(poll.date) &&
      poll.date < ELECTION_DAY &&
      poll.results &&
      (!poll.fieldwork?.[1] || poll.fieldwork[1] < ELECTION_DAY),
  );
  const date = eligible.reduce(
    (max, poll) => (poll.date > max ? poll.date : max),
    "",
  );
  return eligible
    .filter((poll) => poll.date === date)
    .sort((a, b) => String(a.pollster).localeCompare(String(b.pollster)));
}
export function comparisonRows(result, poll, baseline) {
  return (result?.rows || []).map((row) => {
    const id = ELECTION_PARTIES[row.name]?.id;
    const value =
      baseline === "poll"
        ? id
          ? poll?.results?.[id]
          : null
        : row.previousShare;
    const previous = Number.isFinite(value) ? value : null;
    return {
      ...row,
      previous,
      delta:
        previous === null ? null : Math.round((row.share - previous) * 10) / 10,
    };
  });
}
// Editorial order, not probabilities. Same proximity approach as the main
// calculator, plus explicit CDU exclusions and minimal winning combinations.
const position = {
  "Die Linke": 0,
  BSW: 0.5,
  SPD: 1,
  GRÜNE: 2,
  FDP: 3,
  CDU: 4,
  AfD: 5,
};
export function coalitionRestriction(parties) {
  const names = parties.map((party) => party.name);
  if (
    names.includes("CDU") &&
    names.some((name) => name === "AfD" || name === "Die Linke")
  )
    return "cdu";
  return names.includes("AfD") && names.some(name => name !== "AfD" && name !== "BSW") ? "afd" : null;
}
export function electionMajorities(allParties, total) {
  const parties = allParties.filter((party) => party.seats > 0);
  if (parties.length > 12 || !Number.isSafeInteger(total) || total <= 0)
    return [];
  const threshold = Math.floor(total / 2) + 1,
    combinations = [];
  for (let mask = 1; mask < 2 ** parties.length; mask++) {
    const selected = parties.filter((_, i) => mask & (1 << i)),
      seats = selected.reduce((sum, party) => sum + party.seats, 0);
    if (
      seats < threshold ||
      selected.some((party) => seats - party.seats >= threshold)
    )
      continue;
    const restriction = coalitionRestriction(selected);
    let proximity = 0;
    for (let a = 0; a < selected.length; a++)
      for (let b = a + 1; b < selected.length; b++)
        proximity += Math.abs(
          (position[selected[a].name] ?? 2.5) -
            (position[selected[b].name] ?? 2.5),
        );
    combinations.push({
      parties: selected,
      seats,
      restriction,
      score: (restriction ? 100 : 0) + proximity,
    });
  }
  return combinations.sort(
    (a, b) =>
      a.score - b.score ||
      a.parties.length - b.parties.length ||
      b.seats - a.seats,
  );
}
