import encoded from "./studio-intent-model-q4.json" with { type: "json" };
import { inferIntent, intentFeatures } from "./studio-intent-features.js";
import { intentPrototypes } from "./studio-intent-language.js";
export { planStudioCommand as browserAssistantPlan } from "./studio-intent-planner.js";
const unpack = (p) => {
  const bytes = atob(p.data);
  return Float32Array.from(
    { length: p.length },
    (_, i) =>
      (((bytes.charCodeAt(i >> 1) >> (4 * (i % 2))) & 15) - 7) * p.scale,
  );
};
const model = { ...encoded, w1: unpack(encoded.w1), w2: unpack(encoded.w2) };
export const classifyStudioIntent = (text) => inferIntent(model, text);
const prototypes = Object.entries(intentPrototypes).flatMap(
  ([intent, phrases]) =>
    phrases.map((text) => ({ intent, vector: intentFeatures(text) })),
);
// These scores are not probabilities. Retrieval and neural predictions may only
// rank clarification suggestions, never authorise an arbitrary chart edit.
export function rankStudioRequests(text) {
  const vector = intentFeatures(text),
    scores = new Map();
  for (const p of prototypes) {
    const similarity = vector.reduce((n, v, i) => n + v * p.vector[i], 0);
    scores.set(p.intent, Math.max(scores.get(p.intent) || 0, similarity));
  }
  const neural = classifyStudioIntent(text);
  return [...scores]
    .map(([intent, similarity]) => ({
      intent,
      similarity,
      score:
        0.8 * similarity +
        0.2 * (neural.find((n) => n.intent === intent)?.score || 0),
    }))
    .sort((a, b) => b.score - a.score);
}
const labels = {
  current: ["aktuelle Umfragen", "current polls", "encuestas actuales"],
  history: ["Zeitverlauf", "polling history", "evolución histórica"],
  approval: [
    "Zustimmung zur Regierung",
    "government approval",
    "aprobación del gobierno",
  ],
  seats: ["Sitzverteilung", "seat allocation", "reparto de escaños"],
  majority: ["Koalitionen", "coalitions", "coaliciones"],
  map: ["Deutschlandkarte", "Germany map", "mapa de Alemania"],
  typography: ["Schriftart", "typeface", "tipografía"],
  appearance: [
    "Hintergrund und Ecken",
    "background and corners",
    "fondo y esquinas",
  ],
  events: ["Ereignisse", "events", "acontecimientos"],
};
export function assistantSuggestions(text, lang = "de") {
  const i = lang === "de" ? 0 : lang === "es" ? 2 : 1;
  return rankStudioRequests(text)
    .filter((r) => r.similarity >= 0.25)
    .slice(0, 3)
    .map((r) => ({
      label: labels[r.intent][i],
      text: [
        `Wie ändere ich ${labels[r.intent][i]}?`,
        `How do I change ${labels[r.intent][i]}?`,
        `¿Cómo cambio ${labels[r.intent][i]}?`,
      ][i],
    }));
}
