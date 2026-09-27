import { approvalSmoothingPasses, smoothApprovalReadings, smoothingExplanation } from './studio-smoothing.js';
const answerValue = (p, answer) =>
  answer === "net"
    ? Number.isFinite(p.positive) && Number.isFinite(p.negative)
      ? p.positive - p.negative
      : null
    : p[answer];
const text = (state, de, en, es) =>
  state.lang === "de" ? de : state.lang === "es" ? es : en;

// Government ratings begin during Merkel IV, not with Merkel's first cabinet.
// Start dates: bundesregierung.de, election/appointment records, 14 March 2018,
// 8 December 2021 and 6 May 2025. Earlier cabinets have no comparable series here.
export const GOVERNMENT_TERMS = [
  {start:"2018-03-14", end:"2021-12-07", leader:"Merkel IV", color:"#64748b"},
  {start:"2021-12-08", end:"2025-05-05", leader:"Scholz", color:"#e3000f"},
  {start:"2025-05-06", end:null, leader:"Merz", color:"#181818"},
];

export function approvalSnapshot(data, state, events = []) {
  const item = data.countries.de,
    all = item.series[state.metric] || [],
    latest = all.at(-1);
  if (!latest) return null;
  const answer = state.answer || "positive";
  const names = {
    positive: text(state, "Eher gut", "Rather good", "Más bien bien"),
    negative: text(state, "Eher schlecht", "Rather bad", "Más bien mal"),
    rest: text(
      state,
      "Übrige Antworten / keine Angabe",
      "Other answers / no answer",
      "Otras respuestas / sin respuesta",
    ),
  };
  const subject =
    state.metric === "government"
      ? text(
          state,
          "Bewertung der Bundesregierung",
          "German government rating",
          "Valoración del Gobierno alemán",
        )
      : text(
          state,
          "Bewertung des Bundeskanzlers",
          "German chancellor rating",
          "Valoración del canciller alemán",
        );
  const common = {
    kind: "approval",
    date: latest.date,
    archiveStart: all[0].date,
    source: item.source.label,
    sourceUrl: item.source.href,
    license: "",
    reuse: {status:"permission-unconfirmed", checkedAt:"2026-09-20", attribution:"Forschungsgruppe Wahlen: Politbarometer", termsUrl:"https://www.forschungsgruppe.de/Imprint/", dataTermsUrl:item.source.href},
    question: item.questions[state.metric],
    title: subject,
    unit: answer === "net" ? "pp" : "%",
    metric: state.metric,
  };
  const currentRows = [
    {
      id: "positive",
      name: names.positive,
      color: "#15734d",
      value: latest.positive,
    },
    {
      id: "negative",
      name: names.negative,
      color: "#b13c54",
      value: latest.negative,
    },
  ];
  if (currentRows.every((row) => Number.isFinite(row.value)))
    currentRows.push({
      id: "rest",
      name: names.rest,
      color: "#8a95a4",
      value: Math.max(0, 100 - latest.positive - latest.negative),
    });
  if (state.template?.startsWith("approval-current-"))
    return {
      ...common,
      kind: "approval-current",
      unit: "%",
      rows: currentRows,
      leader: latest.leader,
      net: answerValue(latest, "net"),
    };
  if (state.template === "approval-aligned") {
    const administrations = state.metric === "government" ? GOVERNMENT_TERMS : item.administrations;
    const snapshot = approvalSnapshot({ ...data, countries:{...data.countries, de:{...item, administrations}}}, {...state, template:"approval-original", range:"all"});
    const availableTerms = administrations.filter(term => all.some(p => p.date >= term.start && (!term.end || p.date <= term.end))).map((term,i) => ({...term, id:"term-"+term.start, name: term.leader, color: i === 0 ? "#64748b" : term.color}));
    const selected = state.approvalTerms == null ? availableTerms : availableTerms.filter(t => state.approvalTerms.split(",").includes(t.id));
    const origin = Date.UTC(2000,0,1);
    const convert = points => points.flatMap(p => {
      const term = selected.find(t => Number.isFinite(p.results[t.id]));
      if (!term) return [];
      const elapsed = Date.parse(p.date) - Date.parse(term.start);
      return [{...p, observedDate:p.date, elapsedDays:elapsed/86400000, date:new Date(origin+elapsed).toISOString().slice(0,10)}];
    });
    const averages=convert(snapshot.averages), trend=convert(snapshot.trend);
    const end = Math.max(origin+86400000, ...averages.map(p=>Date.parse(p.date)));
    return {...snapshot, aligned:true, availableTerms, rows:selected, selectedParties:selected.map(t=>t.id), averages, trend, terms:[], events:[],
      start:"2000-01-01", end:new Date(end).toISOString().slice(0,10),
      title: text(state, state.metric === "government" ? "Regierungen im Amtszeitvergleich" : "Kanzler im Amtszeitvergleich", state.metric === "government" ? "Governments compared by time in office" : "Chancellors compared by time in office", state.metric === "government" ? "Gobiernos por tiempo en el cargo" : "Cancilleres por tiempo en el cargo"),
      methodNote:text(state,"Gemeinsamer Zeitnullpunkt: Amtsantritt. Fehlende Anfangswerte werden nicht ergänzt.","Shared time zero: taking office. Missing early readings are not imputed.","Origen común: toma de posesión. No se inventan datos iniciales."),
    };
  }
  let end = state.range === "custom" ? state.end : latest.date;
  end = end && end < latest.date ? end : latest.date;
  const years = { year: 1, two: 2, five: 5, ten: 10 },
    months = { month: 1, three: 3, six: 6 };
  let start = all[0].date;
  const d = new Date(end + "T12:00:00Z");
  if (years[state.range]) {
    d.setUTCFullYear(d.getUTCFullYear() - years[state.range]);
    start = d.toISOString().slice(0, 10);
  }
  if (months[state.range]) {
    d.setUTCMonth(d.getUTCMonth() - months[state.range]);
    start = d.toISOString().slice(0, 10);
  }
  if (state.range === "ytd") start = end.slice(0, 4) + "-01-01";
  if (state.range === "election") start = "2025-02-23";
  if (state.range === "custom") start = state.start;
  start = start > all[0].date ? start : all[0].date;
  const points = all.filter((p) => p.date >= start && p.date <= end),
    rows = [],
    averages = [],
    terms = [];
  for (const p of points) {
    const term = item.administrations.find(
      (t) => p.date >= t.start && (!t.end || p.date <= t.end),
    );
    const id = "term-" + (term?.start || p.leader).replace(/[^\w-]/g, "");
    if (!rows.some((row) => row.id === id)) {
      rows.push({
        id,
        name: p.leader || term?.leader || subject,
        color: term?.color || "#2863c9",
      });
      terms.push({
        id,
        date: p.date,
        label: p.leader,
        actualStart: term?.start,
      });
    }
    averages.push({ date: p.date, results: { [id]: answerValue(p, answer) } });
  }
  // Automatic/light match the public chart. Extra passes never cross terms.
  const smoothingPasses=approvalSmoothingPasses(state.historySmoothing);
  const trend=smoothApprovalReadings(averages,smoothingPasses);
  const answerName =
    answer === "net"
      ? text(state, "Nettobewertung", "Net rating", "Valoración neta")
      : names[answer];
  return {
    ...common,
    title: `${subject} · ${answerName}`,
    rows,
    selectedParties: rows.map((r) => r.id),
    averages,
    trend,
    start,
    end,
    terms,
    events: events.filter((e) => e.date >= start && e.date <= end),
    eventCatalogue: events,
    categories: [
      { id: "national", de: "Wahlen", en: "Elections", es: "Elecciones" },
      { id: "germany", de: "Deutschland", en: "Germany", es: "Alemania" },
      { id: "europe", de: "Europa", en: "Europe", es: "Europa" },
      { id: "global", de: "Welt", en: "World", es: "Mundo" },
    ],
    pollsters: { fgw: { name: item.source.label } },
    selectedPollsters: ["fgw"],
    smoothingDays: 0,
    smoothingPasses,
    smoothingNote: ['trend','both'].includes(state.mode) ? smoothingExplanation({kind:'approval',smoothingPasses},state.lang) : '',
    methodLabel:
      state.mode === "trend" || state.mode === "both"
        ? text(state, smoothingPasses ? `Politbarometer · Glättung 1:2:1 × ${smoothingPasses}` : "Politbarometer · ohne Glättung", smoothingPasses ? `Politbarometer · smoothing 1:2:1 × ${smoothingPasses}` : "Politbarometer · no smoothing", smoothingPasses ? `Politbarometer · suavizado 1:2:1 × ${smoothingPasses}` : "Politbarometer · sin suavizado")
        : text(
            state,
            "Politbarometer · veröffentlichte Einzelmessungen",
            "Politbarometer · published individual readings",
            "Politbarometer · mediciones individuales publicadas",
          ),
    methodNote: text(
      state,
      "Amtszeiten werden nicht verbunden. Nettowert = eher gut minus eher schlecht.",
      "Terms are not connected. Net = rather good minus rather bad.",
      "No se conectan mandatos. Neto = más bien bien menos más bien mal.",
    ),
  };
}
