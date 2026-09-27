import { pollMethodLabel } from "./poll-method-label.js";
export function safeSourceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
export function transparencyText(snapshot, state, template, l) {
  if (!snapshot) return [];
  const s = snapshot,
    lines = [],
    dates = (s.rows || [])
      .map((r) => r.date)
      .filter(Boolean)
      .sort();
  if(state.showPollOrigins)lines.push(l('Zusätzliche umrandete Punkte zeigen veröffentlichte Einzelumfragen mit Institut und Datum; sie sind keine Durchschnittspunkte.','Additional outlined dots show published individual polls with institute and date; they are not average points.','Los puntos adicionales con contorno muestran encuestas individuales publicadas, con instituto y fecha; no son medias.'));
  const dateLabel =
    s.dateKind === "fieldwork"
      ? l("Befragungsende", "Fieldwork ended", "Fin del trabajo de campo")
      : s.kind === "map"
        ? l(
            "Neuester Stand auf der Karte",
            "Newest reading on the map",
            "Dato más reciente del mapa",
          )
        : l(
            "Letzter Datenstand im verwendeten Datensatz",
            "Latest date in the dataset used",
            "Última fecha del conjunto de datos utilizado",
          );
  lines.push(
    `${dateLabel}: ${s.date || l("nicht angegeben", "not provided", "no indicada")}. ${s.pollster || s.source || ""}`,
  );
  // Present known metadata, not just a list of what is missing. Keep pollster,
  // commissioner and data supplier separate: none is a substitute for another.
  const fieldwork = Array.isArray(s.fieldwork) ? s.fieldwork.filter(Boolean).join(" – ") : typeof s.fieldwork === "string" ? s.fieldwork : "";
  const metadata = [
    fieldwork && `${l("Befragungszeitraum", "Fieldwork", "Trabajo de campo")}: ${fieldwork}`,
    Number.isFinite(s.sample) && `${l("Stichprobe", "Sample", "Muestra")}: n = ${s.sample.toLocaleString(state.lang || "de")}`,
    typeof s.method === "string" && s.method && `${l("Erhebungsmethode", "Collection method", "Método de recogida")}: ${pollMethodLabel(s.method, state.lang)}`,
    (s.client || s.commissioner) && `${l("Auftraggeber", "Commissioner", "Entidad contratante")}: ${s.client || s.commissioner}`,
  ].filter(Boolean);
  if (metadata.length) lines.push(metadata.join(". ") + ".");
  if (s.source) lines.push(`${l("Datenbereitstellung", "Data supplied by", "Datos proporcionados por")}: ${s.source}.`);
  if (/dawum/i.test(s.source || "")) lines.push(l(
    "DAWUM stellt die zusammengetragenen Umfragedaten bereit; DAWUM ist weder das erhebende Institut noch der Auftraggeber. Ein DAWUM-Link führt zum Datennachweis, der gegebenenfalls auf die ursprüngliche Veröffentlichung verweist.",
    "DAWUM supplies the compiled polling data; it is neither the polling institute nor the commissioner. A DAWUM link opens the data record, which may link onward to the original release.",
    "DAWUM proporciona los datos recopilados; no es el instituto encuestador ni la entidad contratante. El enlace lleva al registro, que puede remitir a la publicación original."
  ));
  if (s.calculationInputs) lines.push(l(
    "Das Publikationspaket enthält außerdem alle Eingangs-Umfragen, den verwendeten Rechencode und ein Prüfskript für jeden historischen Durchschnitts- und Trendpunkt. Die Zahlen können damit ohne Verbindung zu Pollframe nachgerechnet werden.",
    "The publication package also includes every input poll, the calculation code used and a verification script for every historical average and trend point. Values can be recalculated without connecting to Pollframe.",
    "El paquete incluye todas las encuestas de entrada, el código utilizado y un script que verifica cada punto histórico de medias y tendencias. Permite recalcular los valores sin conectarse a Pollframe."
  ));
  if (s.reuse?.status === "permission-unconfirmed") lines.push(l(
    "Nutzungsrechte nicht abschließend geklärt: Die FGW-Datenseite nennt Quellenangabe und Erhebungszeitraum als Zitieranforderung. Das allgemeine Impressum verlangt zugleich Zustimmung für kommerzielle Weiterverwendung. Pollframe weist hier keine bestätigte kommerzielle Freigabe aus; ein Download ersetzt diese nicht.",
    "Reuse rights are not fully cleared: the FGW data page asks for attribution and the survey period. Its general terms also require permission for commercial reuse. Pollframe does not claim confirmed commercial permission here; downloading does not grant it.",
    "Los derechos de reutilización no están plenamente aclarados: la página de datos de FGW pide citar la fuente y el periodo de encuesta. Sus condiciones generales también exigen permiso para uso comercial. Pollframe no afirma disponer de autorización comercial confirmada; descargar no la concede."
  ));
  if (s.start && s.end && !s.aligned)
    lines.push(
      `${l("Dargestellter Zeitraum", "Displayed period", "Periodo representado")}: ${s.start} – ${s.end}.`,
    );
  if (s.baselineDate)
    lines.push(
      `${l("Vergleichsbasis für Veränderungen", "Baseline for changes", "Referencia para los cambios")}: ${s.baselineDate}. ${l("Differenzen von Prozentwerten werden in Prozentpunkten angegeben, nicht als relative Prozentänderung.", "Differences between percentage shares are percentage points, not relative percentage changes.", "Las diferencias entre porcentajes se expresan en puntos porcentuales, no como cambios relativos.")}`,
    );
  if (s.baselineInstitute)
    lines.push(
      `${l("Institut der Vergleichsmessung", "Institute for the comparison reading", "Instituto de la medición de referencia")}: ${s.baselineInstitute}. ${s.institutesDiffer ? l("Vergleich unterschiedlicher Institute: Methodeneffekte können zur Differenz beitragen.", "Different institutes are compared: methodology may contribute to the difference.", "Se comparan institutos distintos: sus métodos pueden contribuir a la diferencia.") : ""}`,
    );
  if (s.kind === "map")
    lines.push(
      `${l("Die Länder haben unterschiedliche Befragungstermine. Das neueste Kartendatum gilt nicht für jedes Land.", "Regions have different polling dates. The newest map date does not apply to every region.", "Las regiones tienen distintas fechas de encuesta. La fecha más reciente del mapa no se aplica a todas.")}${dates.length ? ` ${dates[0]} – ${dates.at(-1)}.` : ""}`,
    );
  const pollsters = (s.selectedPollsters || []).map(
    (id) =>
      (typeof s.pollsters?.[id] === "string"
        ? s.pollsters[id]
        : s.pollsters?.[id]?.name) || id,
  );
  if (pollsters.length)
    lines.push(
      `${l("Ausgewählte Institute", "Selected pollsters", "Institutos seleccionados")}: ${pollsters.join(", ")}.`,
    );
  const method = s.methodologyModes?.[state.mode] || s.methodology || [];
  if (Number.isFinite(s.periodInstituteCount))
    lines.push(
      `${l("Institute mit Veröffentlichungen im Zeitraum", "Institutes publishing within the period", "Institutos con publicaciones en el periodo")}: ${s.periodInstituteCount}. ${l("Institute im letzten Durchschnitt", "Institutes in the last average", "Institutos en la última media")}: ${s.latestCalculation?.institutes ?? "–"}.`,
    );
  if (s.latestIndividual)
    lines.push(
      `${l("Letzte Einzelumfrage", "Latest individual poll", "Última encuesta individual")}: ${s.latestIndividual.institute} · ${s.latestIndividual.date}. ${l("Separater Punkt, nicht der Linienwert.", "Separate dot, not the line value.", "Punto separado, no el valor de la línea.")}`,
    );
  if (s.calculationInputs && s.latestCalculation && ["trend", "both"].includes(state.mode))
    lines.push(l("Der herunterladbare Rechenbeleg dokumentiert den letzten ungewichteten Institutsdurchschnitt vor der zeitlichen Glättung. Der geglättete Linienwert kann davon abweichen; die gezeichneten Reihen stehen zusätzlich im Publikationspaket.", "The calculation receipt documents the latest equal-institute average before time smoothing. The smoothed line value may differ; the plotted series are also included in the publication package.", "El comprobante documenta la última media con igual peso por instituto antes del suavizado temporal. La línea suavizada puede diferir; el paquete incluye también las series representadas."));
  lines.push(
    ...method
      .filter((p) => typeof p === "string" && p.trim())
      .map((p) =>
        p
          .replace(
            "stehen in der Tabelle unter der Grafik.",
            "stehen in der Tabelle auf der unten verlinkten Umfrageseite.",
          )
          .replace(
            "are listed below the chart.",
            "are listed on the polling page linked below.",
          )
          .replace(
            "figuran en la tabla bajo la gráfica.",
            "figuran en la página de encuestas enlazada más abajo.",
          ),
      ),
    s.methodLabel,
    s.smoothingNote,
    s.methodNote,
  );
  if (s.question)
    lines.push(
      `${l("Originalfrage", "Original question", "Pregunta original")}: ${s.question}`,
    );
  if (template.topic === "approval-current")
    lines.push(
      l(
        "Nettowert = positive minus negative Antworten. „Übrige Antworten / keine Angabe“ ist die rechnerische Differenz zu 100 Prozent, keine eigenständig erhobene Antwortkategorie. Gerundete Quellwerte können Rundungsabweichungen verursachen.",
        "Net rating = positive minus negative responses. “Other answers / no answer” is the residual to 100%, not a separately measured response category. Rounded source figures can introduce rounding differences.",
        "Valoración neta = respuestas positivas menos negativas. «Otras respuestas / sin respuesta» es el resto hasta el 100 %, no una categoría medida por separado. El redondeo de los datos puede causar diferencias.",
      ),
    );
  if (
    !s.synthetic &&
    ![
      "history",
      "party",
      "approval",
      "map",
      "seats",
      "majority",
      "tendencies",
    ].includes(template.topic)
  ) {
    const missing = [];
    if (!s.fieldwork?.length)
      missing.push(
        l(
          "Befragungszeitraum",
          "fieldwork dates",
          "fechas del trabajo de campo",
        ),
      );
    if (!s.sample)
      missing.push(l("Stichprobengröße", "sample size", "tamaño de muestra"));
    if (!s.method)
      missing.push(
        l("Erhebungsmethode", "collection method", "método de recogida"),
      );
    if (!s.question)
      missing.push(
        l(
          "genauer Fragewortlaut",
          "exact question wording",
          "redacción exacta de la pregunta",
        ),
      );
    if (!s.client && !s.commissioner)
      missing.push(
        l("Auftraggeber", "commissioning organisation", "entidad contratante"),
      );
    if (missing.length)
      lines.push(
        `${l("Hier nicht verfügbar", "Not available here", "No disponible aquí")}: ${missing.join(", ")}. ${l("Bitte in der verlinkten Veröffentlichung prüfen; fehlende Angaben werden nicht geschätzt.", "Check the linked publication; missing metadata is not estimated.", "Consulta la publicación enlazada; no se estiman los metadatos ausentes.")}`,
      );
  }
  lines.push(
    l(
      "Kleine Unterschiede sind nicht automatisch belastbare Veränderungen. Stichproben, Rundung, Erhebungsmethode und Institutseffekte beeinflussen Umfragewerte. Pollframe weist hier keine berechneten Konfidenzintervalle aus.",
      "Small differences are not automatically meaningful changes. Sampling, rounding, collection methods and pollster effects influence results. Pollframe does not report calculated confidence intervals here.",
      "Las pequeñas diferencias no son necesariamente cambios significativos. La muestra, el redondeo, el método y los efectos del instituto influyen en los resultados. Pollframe no muestra aquí intervalos de confianza calculados.",
    ),
  );
  if (["history", "party", "approval"].includes(template.topic))
    lines.push(
      l(
        "Ereignisse liefern zeitlichen Kontext, keinen Nachweis von Ursache und Wirkung. Eigene Ereignisse und redaktionelle Texte stammen vom Ersteller der Grafik. Eine verkürzte Y-Achse kann Unterschiede stärker erscheinen lassen.",
        "Events provide chronological context, not evidence of causation. Custom events and editorial text come from the graphic’s creator. A truncated Y-axis can magnify differences visually.",
        "Los acontecimientos aportan contexto temporal, no pruebas de causalidad. Los acontecimientos propios y los textos editoriales proceden del creador. Un eje vertical recortado puede amplificar visualmente las diferencias.",
      ),
    );
  lines.push(
    l(
      "Ein PNG hält den beim Export dargestellten Stand fest. Ein Embed lädt beim Öffnen die dann verfügbaren Daten mit den gespeicherten Einstellungen; neuere Daten können die Darstellung verändern. Gespeicherte Designs speichern Einstellungen, kein unveränderliches Datenarchiv. Für eine veröffentlichte Aussage bitte PNG und Quellenstand aufbewahren.",
      "A PNG freezes the view at export time. An embed loads the data available when opened using the saved settings; newer data may change the graphic. Saved designs retain settings, not an immutable data archive. Keep the PNG and source details to document a published claim.",
      "Un PNG fija la vista en el momento de exportar. Una inserción carga los datos disponibles al abrirse con los ajustes guardados; los datos nuevos pueden cambiar la gráfica. Los diseños guardan ajustes, no un archivo inmutable de datos. Conserva el PNG y las fuentes para documentar una afirmación publicada.",
    ),
  );
  if (s.license)
    lines.push(
      `${l("Lizenz des angegebenen Datensatzes", "Licence of the cited dataset", "Licencia del conjunto de datos citado")}: ${s.license}. ${l("Das ist keine pauschale Lizenz für Texte, Logos oder sonstige Inhalte der Quellenwebsite.", "This is not a blanket licence for text, logos or other content on the source website.", "No es una licencia general para textos, logotipos u otros contenidos del sitio fuente.")}`,
    );
  return lines.filter(Boolean);
}
