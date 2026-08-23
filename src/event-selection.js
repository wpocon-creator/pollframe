const DAY = 86_400_000;

const EDITORIAL_OMIT_EVENT_IDS = new Set([
  "eu-election-2019",
  "climate-programme-2030",
  "brexit",
  "scholz",
  "gas-alert",
  "nuclear-exit",
  "eu-migration-pact",
  "eu-election-2024",
  "east-state-elections",
  "border-controls",
  "uk-tehran",
  "uk-coalition",
  "uk-may-prime-minister",
  "uk-chequers-resignations",
  "uk-leaves-eu",
  "uk-lockdown",
  "uk-cummings-lockdown",
  "uk-paterson-standards",
  "uk-johnson-resigns",
  "uk-truss-resigns",
  "uk-sunak-prime-minister",
  "uk-starmer-prime-minister",
  "uk-winter-fuel",
  "uk-autumn-budget-2024",
  "uk-welfare-reform-2025",
  "uk-welfare-revision-2025",
  "uk-local-elections-2025",
  "uk-rwanda-judgment",
  "uk-budget-2025",
  "uk-burnham-prime-minister",
  "es-euro-cash",
  "es-snap-election-called",
  "es-feijoo-vote",
  "es-eu-election-2024",
]);

export function includeHistoricalEvent(event) {
  return !event.editorialOmit && !EDITORIAL_OMIT_EVENT_IDS.has(event.id);
}

export const EVENT_SELECTION_PROFILES = {
  balanced: {
    id: "balanced",
    importance: 1,
    spacing: 0,
    category: 0,
    movement: 0,
    edges: 0,
  },
  editorial: {
    id: "editorial",
    importance: 0.58,
    spacing: 0.21,
    category: 0.12,
    movement: 0.06,
    edges: 0.03,
  },
  coverage: {
    id: "coverage",
    importance: 0.34,
    spacing: 0.37,
    category: 0.19,
    movement: 0.06,
    edges: 0.04,
  },
  movement: {
    id: "movement",
    importance: 0.37,
    spacing: 0.24,
    category: 0.15,
    movement: 0.20,
    edges: 0.04,
  },
};

function time(date) {
  const value = Date.parse(`${date}T12:00:00Z`);
  return Number.isFinite(value) ? value : Number.NaN;
}

function eventWords(event) {
  return `${event.id ?? ""} ${event.category ?? ""} ${event.labelDe ?? ""} ${event.labelEn ?? ""} ${event.labelEs ?? ""} ${event.de ?? ""} ${event.en ?? ""} ${event.es ?? ""}`.toLowerCase();
}

export function isElectionEvent(event) {
  const category = String(event.category ?? "").toLowerCase();
  if (category === "national" || category === "state-election" || category.endsWith("-election")) return true;
  return /(?:bundestagswahl|unterhauswahl|europawahl|general election|federal election|european election|elecciones (?:generales|federales|europeas)|elección (?:general|federal|europea))/.test(eventWords(event));
}

export function isPrimaryElectionEvent(event) {
  if (event.electionLevel === "national" || event.electionLevel === "primary") return true;
  if (event.electionLevel) return false;
  const category = String(event.category ?? "").toLowerCase();
  if (category === "national" || category === "spain-election" || category === "state-election") return true;
  return category === "uk-election" && /^uk-election-\d{4}-\d{2}-\d{2}$/.test(String(event.id ?? ""));
}

export function eventImportance(event) {
  const words = eventWords(event);
  const explicit = Number(event.priority);
  if (Number.isFinite(explicit)) return [1, 0.82, 0.62, 0.4][Math.max(0, Math.min(3, explicit))];
  if (/pandemic|pandemie|invasion|ukraine|world war|weltkrieg|financial crisis|finanzkrise|oil (?:shock|crisis)|ölpreis|energy crisis|energiekrise/.test(words)) return 0.98;
  if (/brexit referendum|eu referendum|referendum|coalition (?:ends|collapse)|koalitionsbruch|government collapse|regierung zerbricht/.test(words)) return 0.91;
  if (/prime minister|chancellor|kanzler|resign|rücktritt|war|krieg|lockdown/.test(words)) return 0.82;
  if (/court|gericht|budget|haushalt|major reform|große reform|crisis|krise/.test(words)) return 0.66;
  if (/revision|revises|kurswechsel|contact restriction|kontaktbeschränkung|controvers|skandal|affair|streit|report|bericht/.test(words)) return 0.43;
  return 0.52;
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * fraction))];
}

/**
 * Scores whether an event is shortly followed by an unusually large movement.
 * This is deliberately directional (after the event) but is context only, not
 * a causal estimate. Sparse series automatically receive little or no signal.
 */
export function calculateMovementScores(events, series, { horizonDays = 70 } = {}) {
  const points = series
    .map((point) => ({ ...point, timestamp: time(point.date), values: (point.values ?? []).map(Number) }))
    .filter((point) => Number.isFinite(point.timestamp) && point.values.some(Number.isFinite))
    .sort((a, b) => a.timestamp - b.timestamp);
  if (points.length < 3) return new Map();
  const horizon = Math.max(14, horizonDays) * DAY;
  const raw = new Map();
  for (const event of events) {
    const eventTime = time(event.date);
    const before = [...points].reverse().find((point) => point.timestamp <= eventTime && eventTime - point.timestamp <= horizon * 0.55);
    if (!before) { raw.set(event.id, 0); continue; }
    const after = points.filter((point) => point.timestamp > eventTime && point.timestamp <= eventTime + horizon);
    if (!after.length) { raw.set(event.id, 0); continue; }
    const changes = after.map((point) => Math.max(...before.values.map((value, index) => (
      Number.isFinite(value) && Number.isFinite(point.values[index]) ? Math.abs(point.values[index] - value) : 0
    ))));
    raw.set(event.id, percentile(changes, 0.8));
  }
  const scale = Math.max(1, percentile([...raw.values()].filter(Number.isFinite), 0.85));
  return new Map([...raw].map(([id, value]) => [id, Math.min(1, value / scale)]));
}

/**
 * Editorial order only. Geometry decides which of these candidates actually
 * fits in the two label lanes. This prevents a minor event from outranking a
 * major crisis merely to fill a category quota or sit near a chart movement.
 */
export function rankHistoricalEvents(events, {
  limit,
  startTime,
  endTime,
  movementScores: _movementScores = new Map(),
  profile: _profile = "balanced",
} = {}) {
  const candidates = events
    .filter((event) => includeHistoricalEvent(event) && !isPrimaryElectionEvent(event) && Number.isFinite(time(event.date)))
    .map((event) => ({ ...event, timestamp: time(event.date) }));
  if (!candidates.length || !limit) return [];
  const from = Number.isFinite(startTime) ? startTime : Math.min(...candidates.map((event) => event.timestamp));
  const to = Number.isFinite(endTime) ? endTime : Math.max(...candidates.map((event) => event.timestamp));
  const eligible = candidates
    .filter((event) => event.timestamp >= from && event.timestamp <= to)
    .map((event) => ({ ...event, selectionScore: eventImportance(event), selectionReasons: { importance: eventImportance(event) } }))
  if (!eligible.length) return [];
  const editorialSort = (a, b) => b.selectionScore - a.selectionScore
    || Number(a.priority ?? 99) - Number(b.priority ?? 99)
    || a.timestamp - b.timestamp
    || String(a.id).localeCompare(String(b.id));
  const ranked = [];
  const binCount = Math.max(1, Math.min(12, Math.max(1, limit)));
  const span = Math.max(1, to - from);
  const bins = Array.from({ length: binCount }, () => []);
  for (const event of eligible) {
    const index = Math.min(binCount - 1, Math.max(0, Math.floor(((event.timestamp - from) / span) * binCount)));
    bins[index].push(event);
  }
  bins.forEach((bin) => bin.sort(editorialSort));
  const coverageRound = bins.map((bin) => {
    const index = bin.findIndex((event) => event.selectionScore >= 0.65);
    return index >= 0 ? bin.splice(index, 1)[0] : null;
  }).filter(Boolean).sort(editorialSort);
  ranked.push(...coverageRound);
  for (const [minimum, maximum] of [[0.9, Infinity], [0.65, 0.9], [-Infinity, 0.65]]) {
    while (bins.some((bin) => bin.some((event) => event.selectionScore >= minimum && event.selectionScore < maximum))) {
      const round = bins.map((bin) => {
        const index = bin.findIndex((event) => event.selectionScore >= minimum && event.selectionScore < maximum);
        return index >= 0 ? bin.splice(index, 1)[0] : null;
      }).filter(Boolean).sort(editorialSort);
      ranked.push(...round);
    }
  }
  return ranked;
}

export function splitHistoricalEvents(events, options) {
  const elections = events.filter(isPrimaryElectionEvent).sort((a, b) => time(a.date) - time(b.date));
  const ranked = rankHistoricalEvents(events, options);
  const labelled = ranked.slice(0, options.limit);
  const labelledIds = new Set(labelled.map((event) => event.id));
  const unlabelled = ranked.filter((event) => !labelledIds.has(event.id)).sort((a, b) => time(a.date) - time(b.date));
  return { elections, labelled, unlabelled, ranked };
}
