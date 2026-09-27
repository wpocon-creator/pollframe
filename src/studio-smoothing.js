import { makeTrend } from "./poll-history-calculator.js";

const daysByLevel = { none: 0, light: 35, medium: 56, strong: 112 };
export const approvalSmoothingPasses = (level) =>
  ({ none: 0, light: 1, medium: 2, strong: 3 })[level] ?? 1;

export function smoothingExplanation(snapshot, lang = "en-GB") {
  const l = (de, en, es) => (lang === "de" ? de : lang === "es" ? es : en);
  if (snapshot.kind === "approval") {
    const passes = snapshot.smoothingPasses ?? 1;
    return passes
      ? l(
          `Glättung: ${passes} ${passes === 1 ? "Durchlauf" : "Durchläufe"} mit den Gewichten 1:2:1 für benachbarte Messungen. Amtszeiten bleiben getrennt; Anfangs- und Endwerte bleiben unverändert.`,
          `Smoothing: ${passes} ${passes === 1 ? "pass" : "passes"} of 1:2:1 weighting across neighbouring readings. Terms remain separate; first and last readings are unchanged.`,
          `Suavizado: ${passes} ${passes === 1 ? "pasada" : "pasadas"} con pesos 1:2:1 entre mediciones vecinas. Los mandatos permanecen separados; la primera y última medición no cambian.`,
        )
      : l(
          "Keine Glättung: verbundene Originalmessungen; Amtszeiten bleiben getrennt.",
          "No smoothing: connected original readings; terms remain separate.",
          "Sin suavizado: mediciones originales conectadas; mandatos separados.",
        );
  }
  const days = snapshot.smoothingDays;
  return days > 14
    ? l(
        `Glättung: ±${days} Tage, mit abnehmendem Gewicht weiter entfernter Stützstellen. Der letzte Linienwert bleibt der aktuelle Institutsdurchschnitt. Rohdaten und Einzelumfrage-Punkte bleiben unverändert.`,
        `Smoothing: ±${days} days, with decreasing weight for more distant support points. The final line value remains the current institute average. Raw data and individual-poll dots are unchanged.`,
        `Suavizado: ±${days} días, con menor peso para puntos más lejanos. El último valor sigue siendo la media actual de institutos. Los datos originales y puntos de encuestas individuales no cambian.`,
      )
    : l(
        "Keine zusätzliche zeitliche Glättung: Institutsdurchschnitte an 14-tägigen Stützstellen und den Zeitraumgrenzen.",
        "No additional time smoothing: institute averages at 14-day support points and the period boundaries.",
        "Sin suavizado temporal adicional: medias de institutos cada 14 días y en los límites del periodo.",
      );
}

// Recalculate from the same immutable inputs, without another iframe request.
// Keep the replay recipe in sync so exported packages reproduce every value.
export function withHistorySmoothing(snapshot, state) {
  const days = daysByLevel[state.historySmoothing];
  if (!snapshot?.calculationInputs || days === undefined) return snapshot;
  const input = { ...snapshot.calculationInputs, smoothingDays: days };
  const result = {
    ...snapshot,
    smoothingDays: days,
    calculationInputs: input,
    trend: makeTrend(
      input.polls,
      input.selectedPollsters,
      input.start,
      input.end,
      input.parties,
      days,
    ),
  };
  if (snapshot.methodologyModes)
    result.methodologyModes = Object.fromEntries(
      Object.entries(snapshot.methodologyModes).map(([mode, paragraphs]) => [
        mode,
        // The public source's third paragraph describes the chosen series mode.
        ["trend", "both"].includes(mode)
          ? paragraphs.map((text, index) =>
              index === 2 ? smoothingExplanation(result, state.lang) : text,
            )
          : paragraphs,
      ]),
    );
  return result;
}

export function smoothApprovalReadings(averages, passes) {
  let points = averages;
  for (let pass = 0; pass < passes; pass++)
    points = points.map((p, i) => {
      const id = Object.keys(p.results)[0],
        v = p.results[id],
        a = points[i - 1]?.results[id],
        b = points[i + 1]?.results[id];
      return {
        ...p,
        results: {
          [id]: [a, v, b].every(Number.isFinite) ? (a + 2 * v + b) / 4 : v,
        },
      };
    });
  return points;
}
