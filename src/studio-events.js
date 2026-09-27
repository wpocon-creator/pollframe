import { studioCatalogue } from "./studio-event-catalogue.js";
import { customEvents } from "./studio-custom-events.js";
export function studioEvents(snapshot, state) {
  const events = [
    ...(snapshot?.eventCatalogue || snapshot?.events || []),
    ...(state.country === "de" ? studioCatalogue(state.lang) : []),
    ...customEvents(state.historyCustomEvents),
  ];
  return [...new Map(events.map((event) => [event.id, event])).values()];
}
