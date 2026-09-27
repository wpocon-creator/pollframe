import { eventImportance } from "./event-selection.js";
import { studioEvents } from "./studio-events.js";
import { eventIds } from "./studio-event-ids.js";
export { eventIds, cleanEventIds } from "./studio-event-ids.js";


// Explicit editorial decisions are separate from the automatic packing budget.
// The catalogue remains complete even when an event is not an automatic choice.
export function selectStudioEvents(snapshot, state) {
  const categories = eventIds(state.events ?? "national,germany,europe,global");
  const manual = state.historyEventIds != null;
  const selected = eventIds(state.historyEventIds);
  const pinned = eventIds(state.historyEventPinned);
  const excluded = eventIds(state.historyEventExcluded);
  const removed = eventIds(state.historySeedRemoved);
  const eligible = studioEvents(snapshot, state).filter(
    (event) =>
      event.date >= snapshot.start &&
      event.date <= snapshot.end &&
      (event.custom || categories.has(event.category)) &&
      !excluded.has(event.id) &&
      !removed.has(event.id) &&
      (!manual || selected.has(event.id) || event.custom),
  );
  const forced = eligible
    .filter(
      (event) =>
        !event.election && (pinned.has(event.id) || manual),
    )
    .map((event) => ({ ...event, forced: true }));
  const forcedIds = new Set(forced.map((event) => event.id));
  // Public-chart curation is not an editor visibility rule. Every catalogue
  // item must be selectable. Seed only breaks equal importance tiers.
  const seed = Number(state.historyEventSeed) || 0;
  const tie = (id) => {
    let hash = 2166136261 ^ seed;
    for (const c of id) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
    return hash >>> 0;
  };
  const automatic = eligible.filter(event => !event.election && !forcedIds.has(event.id))
    .sort((a, b) => eventImportance(b) - eventImportance(a) ||
      (seed ? tie(a.id) - tie(b.id) : a.date.localeCompare(b.date)) || a.id.localeCompare(b.id));
  return {
    candidates: [...forced, ...automatic],
    elections: eligible.filter((event) => event.election),
  };
}
