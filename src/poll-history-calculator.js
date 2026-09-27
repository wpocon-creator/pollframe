const DAY = 86400000;
const timestamps = new Map();
const parseDate = value => {
  if (!timestamps.has(value)) timestamps.set(value, Date.parse(value + "T12:00:00Z"));
  return timestamps.get(value);
};
const toIso = value => new Date(value).toISOString().slice(0, 10);
export const POLL_CALCULATOR_VERSION = "equal-institute-45d-triangular-endpoint-v1";

export function makeAverageSeries(polls, pollsterIds, dates, partyIds) {
  if (!dates.length || !pollsterIds.length) return [];
  const selectedPollsters = new Set(pollsterIds);
  const orderedDates = [...new Set(dates)].sort();
  const relevantPolls = polls.filter((poll) => selectedPollsters.has(poll.pollster));
  const latestByPollster = new Map();
  const output = [];
  let pollIndex = 0;

  for (const date of orderedDates) {
    const target = parseDate(date);
    const cutoff = target - (45 * DAY);
    while (pollIndex < relevantPolls.length && parseDate(relevantPolls[pollIndex].date) <= target) {
      const poll = relevantPolls[pollIndex];
      latestByPollster.set(poll.pollster, poll);
      pollIndex += 1;
    }
    const currentPolls = [...latestByPollster.values()]
      .filter((poll) => parseDate(poll.date) >= cutoff);
    if (!currentPolls.length) continue;
    const results = {};
    for (const partyId of partyIds) {
      let sum = 0;
      let count = 0;
      for (const poll of currentPolls) {
        const value = poll.results[partyId];
        if (!Number.isFinite(value)) continue;
        sum += value;
        count += 1;
      }
      if (count) results[partyId] = sum / count;
    }
    output.push({ date, results, pollsterCount: currentPolls.length });
  }
  return output;
}

export function smoothTrendSeries(series, partyIds, windowDays) {
  if (windowDays <= 14 || series.length < 3) return series;
  const windowMs = windowDays * DAY;
  return series.map((point, pointIndex) => {
    const pointTime = parseDate(point.date);
    const results = {};
    for (const partyId of partyIds) {
      let weightedTotal = 0;
      let totalWeight = 0;
      const addPoint = (index) => {
        const distance = Math.abs(parseDate(series[index].date) - pointTime);
        const value = series[index].results[partyId];
        if (!Number.isFinite(value)) return;
        const weight = 1 - (distance / (windowMs + 1));
        weightedTotal += value * weight;
        totalWeight += weight;
      };
      for (let index = pointIndex; index >= 0; index -= 1) {
        if (pointTime - parseDate(series[index].date) > windowMs) break;
        addPoint(index);
      }
      for (let index = pointIndex + 1; index < series.length; index += 1) {
        if (parseDate(series[index].date) - pointTime > windowMs) break;
        addPoint(index);
      }
      if (totalWeight) results[partyId] = weightedTotal / totalWeight;
    }
    return { ...point, results, pollsterCount: series[pointIndex].pollsterCount };
  });
}

export function makeTrend(polls, pollsterIds, startDate, endDate, partyDefinitions, smoothingDays = 14) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const dates = [startDate];
  let cursor = start + (14 * DAY);
  while (cursor < end) {
    dates.push(toIso(cursor));
    cursor += 14 * DAY;
  }
  if (dates.at(-1) !== endDate) dates.push(endDate);

  const partyIds = partyDefinitions.map((party) => party.id);
  const raw = makeAverageSeries(
    polls,
    pollsterIds,
    dates,
    partyIds,
  );
  const smoothed = smoothTrendSeries(raw, partyIds, smoothingDays);
  // The right edge is read as the current value. Ease the smoothed series into
  // that exact value over the final few support points instead of creating a
  // visible last-segment kink.
  if (raw.length && smoothed.length) {
    const blendCount = Math.min(5, smoothed.length);
    for (const partyId of partyIds) {
      const target = raw.at(-1).results[partyId];
      const currentEnd = smoothed.at(-1).results[partyId];
      if (!Number.isFinite(target) || !Number.isFinite(currentEnd)) continue;
      const correction = target - currentEnd;
      for (let offset = 0; offset < blendCount; offset += 1) {
        const index = smoothed.length - blendCount + offset;
        const value = smoothed[index].results[partyId];
        if (!Number.isFinite(value)) continue;
        const progress = blendCount === 1 ? 1 : offset / (blendCount - 1);
        smoothed[index] = {
          ...smoothed[index],
          results: { ...smoothed[index].results, [partyId]: value + (correction * progress * progress) },
        };
      }
    }
    smoothed[smoothed.length - 1] = raw.at(-1);
  }
  return smoothed;
}
