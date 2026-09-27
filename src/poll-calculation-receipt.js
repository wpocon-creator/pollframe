// A machine-readable audit of an equal-institute point, not a new calculation.
export function pollCalculationReceipt(
  polls,
  selected,
  date,
  parties,
  pollsters = {},
) {
  const ids = new Set(selected),
    latest = new Map();
  const cutoff = Date.parse(date) - 45 * 86400000;
  for (const poll of polls) {
    if (
      !ids.has(poll.pollster) ||
      poll.date > date ||
      Date.parse(poll.date) < cutoff
    )
      continue;
    if (
      !latest.has(poll.pollster) ||
      poll.date >= latest.get(poll.pollster).date
    )
      latest.set(poll.pollster, poll);
  }
  const included = [...latest.values()].sort((a, b) =>
    a.pollster.localeCompare(b.pollster),
  );
  return {
    date,
    method:
      "Latest poll per selected institute within 45 days; equal institute weight, per-party missing values omitted",
    calculator: "Pollframe",
    provider: "DAWUM",
    license: "ODbL 1.0",
    institutes: included.length,
    polls: included.map((poll) => ({
      ...poll,
      institute:
        typeof pollsters[poll.pollster] === "string"
          ? pollsters[poll.pollster]
          : pollsters[poll.pollster]?.name || poll.pollster,
      commissioner: poll.commissioner || null,
    })),
    parties: Object.fromEntries(
      parties.map((id) => {
        const rows = included.filter((p) => Number.isFinite(p.results[id]));
        return [
          id,
          {
            value: rows.length
              ? rows.reduce((sum, p) => sum + p.results[id], 0) / rows.length
              : null,
            weights: rows.map((p) => ({
              instituteId: p.pollster,
              weight: 1 / rows.length,
            })),
          },
        ];
      }),
    ),
  };
}
