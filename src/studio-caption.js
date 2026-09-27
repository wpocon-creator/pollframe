// A publication caption complements, never replaces, the full source receipt.
export function publicationCaption(s, state, template, l) {
  const subject =
    s.title ||
    s.region ||
    (template.topic === "map"
      ? l(
          "Landtagsumfragen in Deutschland",
          "State election polling in Germany",
          "Encuestas regionales de Alemania",
        )
      : template.topic.startsWith("approval")
        ? l(
            "Regierungs- und Kanzlerbewertung in Deutschland",
            "Government and chancellor ratings in Germany",
            "Valoración del Gobierno y canciller de Alemania",
          )
        : l(
            "Bundestagswahl: politische Umfragen",
            "German federal election polling",
            "Encuestas para las elecciones federales alemanas",
          ));
  const lines = [
    subject,
    `${l("Stand", "As of", "Datos del")}: ${s.date || "—"}${s.start && s.end ? ` · ${s.start} – ${s.end}` : ""}.`,
  ];
  if (["history", "party"].includes(template.topic))
    lines.push(
      state.mode === "polls" ? l("Punkte: Pollframes Umfragedurchschnitte, keine einzelnen Erhebungen oder Wahlprognose.", "Dots: Pollframe polling averages, not individual surveys or an election forecast.", "Puntos: medias de encuestas de Pollframe, no sondeos individuales ni predicciones electorales.") : l(
        "Linie: Pollframes Umfragedurchschnitt, keine Wahlprognose.",
        "Line: Pollframe polling average, not an election forecast.",
        "Línea: media de encuestas de Pollframe, no una predicción electoral.",
      ),
    );
  if(state.showPollOrigins) lines.push(l('Umrandete Punkte: veröffentlichte Einzelumfragen; Institut und Datum im Datennachweis.','Outlined dots: published individual polls; institutes and dates in the source record.','Puntos con contorno: encuestas individuales publicadas; institutos y fechas en el registro de fuentes.'));
  if (s.latestIndividual && !state.showPollOrigins)
    lines.push(
      `${l("Umrandeter Punkt: Einzelumfrage", "Outlined dot: individual poll", "Punto con contorno: encuesta individual")} · ${s.latestIndividual.institute} · ${s.latestIndividual.date}.`,
    );
  if (s.baselineDate)
    lines.push(
      `${l("Vergleich mit", "Compared with", "Comparación con")}: ${s.baselineDate}${s.baselineInstitute ? ` · ${s.baselineInstitute}` : ""}${s.institutesDiffer ? l(" (anderes Institut)", " (different institute)", " (instituto distinto)") : ""}.`,
    );
  if (s.kind === "map")
    lines.push(
      l(
        "Befragungstermine unterscheiden sich zwischen den Ländern; siehe Datumsangaben in der Karte.",
        "Polling dates differ between states; see the dates in the map.",
        "Las fechas de encuesta varían entre estados; véanse las fechas del mapa.",
      ),
    );
  if (["seats", "majority"].includes(template.topic))
    lines.push(
      l(
        "Vereinfachtes Sitzmodell, kein amtliches Ergebnis.",
        "Simplified seat model, not an official result.",
        "Modelo simplificado de escaños, no resultado oficial.",
      ),
    );
  lines.push(
    `${l("Daten", "Data", "Datos")}: ${[s.pollster, s.source, s.license].filter(Boolean).join(" · ") || l("siehe Quellenbeleg", "see source receipt", "véase la nota de fuentes")}. ${l("Grafik", "Graphic", "Gráfica")}: Pollframe · pollframe.com.`,
  );
  try {
    const url = new URL(s.sourceUrl);
    if (url.protocol === "https:" && !url.username && !url.password) lines.push(url.href);
  } catch {}
  return lines.join("\n");
}
