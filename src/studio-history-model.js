export const HISTORY_DESIGNS = [
  [
    "history-original",
    "original",
    "landscape",
    "Pollframe Original",
    "Pollframe original",
    "Original de Pollframe",
    "vertraut standard halo original",
  ],
  [
    "history-paper",
    "print",
    "landscape",
    "Zeitungsdruck",
    "Newspaper",
    "Prensa impresa",
    "druck schwarz weiß serif monochrom zeitung print grayscale",
  ],
  [
    "history-panels",
    "panels",
    "square",
    "Parteien-Panels",
    "Party panels",
    "Paneles por partido",
    "small multiples facetten nebeneinander einzelparteien vergleich panels",
  ],
  [
    "history-briefing",
    "briefing",
    "landscape",
    "Redaktionsbriefing",
    "Editorial briefing",
    "Resumen editorial",
    "tabelle start ende differenz zahlen briefing table newsletter",
  ],
  [
    "history-square",
    "poster",
    "portrait",
    "Verlaufsplakat",
    "Timeline poster",
    "Cartel de evolución",
    "social instagram story hochkant plakat mobil groß poster",
  ],
  [
    "history-neon",
    "neon",
    "square",
    "Leuchtlinien",
    "Luminous lines",
    "Líneas luminosas",
    "social futuristisch leuchten neon technisch gaming signal",
  ],
  [
    "history-focus",
    "focus",
    "landscape",
    "Eine Partei im Fokus",
    "One party in focus",
    "Un partido en foco",
    "hervorheben fokus fläche area highlight spotlight",
  ],
].map(([id, design, preset, ...fields]) => ({
  id,
  design,
  preset,
  name: fields.slice(0, 3),
  keywords: fields[3],
  topic: "history",
  profile: "chart",
  country: "de",
  art: "lines",
  detail: [
    "Historische Bundestagsumfragen",
    "Historical German polling",
    "Encuestas históricas alemanas",
  ],
}));

export function historySegments(points, id, offset = 0) {
  const segments = [];
  let active = [];
  for (const point of points) {
    const value = point.results?.[id];
    if (!Number.isFinite(value)) {
      if (active.length) segments.push(active);
      active = [];
      continue;
    }
    active.push({ date: point.date, value: value - offset });
  }
  if (active.length) segments.push(active);
  return segments;
}
export function historyScale(
  values,
  { difference = false, zero = false, max = 0, reference = 0 } = {},
) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return difference ? [-5, 5] : [0, 50];
  let lo = Math.min(...finite),
    hi = Math.max(...finite);
  if (difference) {
    const extent = Math.max(
      2,
      Math.ceil(Math.max(Math.abs(lo), Math.abs(hi)) / 5) * 5,
    );
    return [-extent, extent];
  }
  lo = zero ? 0 : Math.max(0, Math.floor((lo - 2) / 5) * 5);
  hi = Math.min(100, Math.ceil((hi + 2) / 5) * 5);
  if (max) hi = Math.max(hi, max);
  if (reference) {
    lo = Math.min(lo, reference);
    hi = Math.max(hi, reference);
  }
  return [lo, Math.max(lo + 5, hi)];
}
export function historyCsv(snapshot, rows, state) {
  const cell = (v) =>
    '"' +
    (typeof v === "number"
      ? String(v)
      : String(v ?? "").replace(/^(?=\s*[=+@\-])/, "'")
    ).replaceAll('"', '""') +
    '"';
  const groups =
    state.mode === "both"
      ? [
          ["trend", snapshot.trend],
          ["average", snapshot.averages],
        ]
      : [
          [
            state.mode === "trend" ? "trend" : "average",
            state.mode === "trend" ? snapshot.trend : snapshot.averages,
          ],
        ];
  const difference = state.template === "history-change";
  const bases = Object.fromEntries(
    rows.map((row) => [
      row.id,
      groups[0][1].find((point) => Number.isFinite(point.results[row.id])),
    ]),
  );
  return (
    "\uFEFF" +
    [
      [
        "date",
        "series_name",
        snapshot.unit === "pp" ? "net_pp" : "share_percent",
        "series",
        "source",
        "license",
        ...(difference ? ["change_pp", "baseline_date"] : []),
      ],
      ...groups.flatMap(([type, points]) =>
        points.flatMap((point) =>
          rows
            .filter((row) => Number.isFinite(point.results[row.id]))
            .map((row) => [
              point.date,
              row.name,
              point.results[row.id],
              type,
              snapshot.sourceUrl,
              snapshot.license,
              ...(difference
                ? [
                    point.results[row.id] -
                      (bases[row.id]?.results[row.id] ?? 0),
                    bases[row.id]?.date || "",
                  ]
                : []),
            ]),
        ),
      ),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}

export function historyMethodDetail(snapshot, lang) {
  if (snapshot.kind === "approval")
    return `${snapshot.methodLabel}. ${snapshot.smoothingNote || ''} ${snapshot.methodNote} ${snapshot.question}`;
  const days = snapshot.smoothingDays;
  const texts = {
    de: `Je Zeitpunkt wird die neueste Umfrage jedes gewählten Instituts aus den vorherigen 45 Tagen verwendet. Jedes Institut mit einem Wert für die jeweilige Partei zählt gleich. Der Trend verwendet Stützstellen alle 14 Tage sowie die Zeitraumgrenzen.${days > 14 ? ` Die Glättung gewichtet benachbarte Stützstellen nach ihrem Abstand, bis zu ${days} Tage davor und danach.` : ""} Der Trend läuft am rechten Rand in das un­geglättete Institutsmittel aus, nicht in die letzte Einzelumfrage. Punkte zeigen berechnete Mittelwerte an Veröffentlichungstagen, keine Einzelumfragen. Stichprobe und Feldzeit sind in den Originalumfragen bei DAWUM zu prüfen.`,
    en: `At each date, the latest poll from each selected institute within the preceding 45 days is used. Institutes reporting a value for a party have equal weight. The trend uses 14-day support points and the range boundaries.${days > 14 ? ` Smoothing weights neighbouring support points by distance, up to ${days} days before and after.` : ""} At the right edge, the trend converges to the unsmoothed institute average, not the latest individual poll. Dots are calculated averages on publication dates, not individual polls. Check sample sizes and fieldwork in the original DAWUM records.`,
    es: `En cada fecha se utiliza la última encuesta de cada instituto seleccionado de los 45 días anteriores. Los institutos con un valor para un partido tienen el mismo peso. La tendencia usa puntos cada 14 días y los límites del periodo.${days > 14 ? ` El suavizado pondera los puntos vecinos por distancia, hasta ${days} días antes y después.` : ""} En el extremo derecho, la tendencia converge a la media sin suavizar, no a la última encuesta individual. Los puntos son medias calculadas en fechas de publicación, no encuestas individuales. Consulta las muestras y el trabajo de campo en los registros originales de DAWUM.`,
  };
  return texts[lang] || texts.en;
}
