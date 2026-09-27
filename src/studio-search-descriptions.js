// Search-only editorial metadata. Describe the actual design, not every design
// with every adjective. Shared renderers inherit the same visual vocabulary.
export const SEARCH_STYLES = {
  modern:
    "modern contemporary sleek polished elegant stylish fresh modern minimalista moderno moderna modernos zeitgemäß zeitgemaess zeitgenössisch zeitgenoessisch elegant edel aktuelle zeitgemäße elegante contemporáneo contemporánea elegante actual limpio",
  simple:
    "simple simplicity minimal minimalist minimalistic clean clear uncluttered understated restrained straightforward easy readable einfach einfache schlicht schlichte minimalistisch minimalistische reduziert übersichtlich uebersichtlich aufgeräumt aufgeraeumt verständlich verstaendlich sencillo sencilla simple sencillo minimalista limpio limpia claro clara legible sobrio",
  traditional:
    "traditional classic classical conventional familiar timeless established conservative traditional design traditionell traditionelle klassisch klassische vertraut konventionell zeitlos bewährt bewaehrt tradicional clásico clásica clásicos convencional familiar atemporal",
  detailed:
    "detailed detail informative information comprehensive thorough analytical analysis precise exact granular breakdown rich data detailreich detailliert detaillierte ausführlich ausfuehrlich informativ genau präzise praezise analyse analytisch fakten datenreich aufschlüsselung aufschluesselung detallado detallada detalles completo completa informativo analítico análisis preciso desglose cifras",
  bold: "bold striking expressive dramatic creative experimental playful colourful colorful eye catching standout attention impact large big auffällig auffaellig ausdrucksstark kräftig kraeftig kreativ experimentell spielerisch bunt plakativ groß gross llamativo llamativa creativo creativa experimental expresivo colorido vistoso grande impactante",
  editorial:
    "editorial professional serious newsroom newspaper journalist article report reporting publication press redaktion redaktionell professionell seriös serioes sachlich journalist journalistisch zeitung artikel bericht veröffentlichung veroeffentlichung presse editorial profesional periodístico periodística periodista periódico artículo informe prensa sobrio",
  technical:
    "technical precise structured systematic dashboard numeric numbers grid technical technisch technische strukturiert systematisch dashboard zahlen raster numerisch técnico técnica estructurado sistemático numérico cuadrícula",
  compact:
    "compact concise quick overview summary glance small space saving short kompakt kompakte knapp kurz übersicht ueberblick zusammenfassung platzsparend klein compacto compacta conciso breve resumen vistazo pequeño",
  comparison:
    "compare comparison comparing versus side by side contrast differences vergleich vergleichen vergleichend gegenüberstellung gegenueberstellung unterschied unterschiede nebeneinander comparación comparar comparativo frente diferencias contraste",
  change:
    "change changes changing movement shifts evolution progression development gains losses before after over time increase decrease change over time veränderung veraenderung veränderungen veraenderungen änderung aenderung entwicklung bewegung zuwachs gewinne verluste vorher nachher anstieg rückgang rueckgang cambio cambios evolución variación variaciones aumento caída antes después ganancias pérdidas",
};

const designs = {
  classic: [
    "simple traditional editorial",
    "Familiar horizontal bars with directly labelled values. Vertraute waagerechte Balken mit direkt beschrifteten Werten. Barras horizontales familiares con valores etiquetados.",
  ],
  pie: [
    "traditional compact",
    "Circular slices show shares of the whole. Kreisanteile zeigen die Zusammensetzung. Sectores circulares muestran las partes del total.",
  ],
  material: [
    "modern bold",
    "Sculptural three-dimensional party-colour blocks with depth and shaded faces. Räumliche dreidimensionale Blöcke in Parteifarben. Bloques tridimensionales con volumen y caras sombreadas.",
  ],
  news: [
    "modern simple editorial",
    "Restrained typography and clear geometry for an article. Ruhige Typografie und klare Formen für Zeitungsartikel. Tipografía sobria y formas claras para artículos.",
  ],
  paper: [
    "traditional detailed editorial",
    "Newspaper typography and factual labels for print. Zeitungstypografie und präzise Beschriftungen für Druck. Tipografía de periódico y etiquetas precisas para impresión.",
  ],
  broadcast: [
    "modern bold",
    "Vertical columns for screens and presentations. Senkrechte Säulen für Bildschirm und Präsentation. Columnas verticales para pantallas y presentaciones.",
  ],
  lollipop: [
    "modern simple comparison",
    "Thin stems and round endpoints reduce visual weight. Dünne Linien und runde Endpunkte. Líneas finas y extremos circulares.",
  ],
  dotplot: [
    "modern simple comparison",
    "Lightweight dots make differences easy to compare. Leichte Punkte zum Vergleich von Abständen. Puntos ligeros para comparar diferencias.",
  ],
  table: [
    "traditional detailed editorial technical",
    "Aligned rows and columns put exact figures first. Geordnete Zeilen und Spalten stellen genaue Zahlen in den Mittelpunkt. Filas y columnas alineadas con cifras exactas.",
  ],
  cards: [
    "modern compact bold",
    "Separate number cards for a quick social-media overview. Einzelne Zahlenkarten für einen schnellen Überblick. Tarjetas con cifras para redes sociales.",
  ],
  poster: [
    "modern bold",
    "Large typography with a prominent graphic for a social post. Große Schrift und präsente Grafik für soziale Medien. Tipografía grande y gráfica destacada para publicaciones sociales.",
  ],
  signal: [
    "technical modern",
    "Technical-looking labels and a structured visual rhythm. Technische Beschriftung und strukturierter Aufbau. Etiquetas técnicas y estructura visual ordenada.",
  ],
  ladder: [
    "modern comparison compact",
    "A ranked value ladder puts relative positions first. Eine Rangfolge zeigt die Positionen im Vergleich. Una escala ordenada muestra posiciones relativas.",
  ],
  original: [
    "traditional editorial",
    "Familiar Pollframe curves with an outline and labelled timeline. Vertraute Pollframe-Kurven mit Kontur und beschrifteter Zeitachse. Curvas habituales de Pollframe con contorno y eje temporal.",
  ],
  print: [
    "traditional detailed editorial",
    "Serif type and monochrome lines for newspaper printing. Serifenschrift und einfarbige Linien für Zeitungsdruck. Tipografía con serifa y líneas monocromas para prensa impresa.",
  ],
  panels: [
    "detailed comparison editorial",
    "Separate small panels make individual series easy to inspect. Einzelne kleine Diagramme zum genauen Vergleichen. Paneles separados para comparar cada serie.",
  ],
  rail: [
    "detailed comparison editorial",
    "A historical curve next to a readable column of endpoint values. Verlauf neben einer lesbaren Spalte mit Endwerten. Curva histórica junto a una columna legible de valores finales.",
  ],
  briefing: [
    "detailed editorial comparison",
    "Chart plus a table of first values, last values and differences. Verlauf mit Tabelle für Anfangswerte, Endwerte und Differenzen. Gráfica y tabla de valores iniciales, finales y diferencias.",
  ],
  neon: [
    "modern bold technical",
    "Glowing luminous curves with a futuristic feel. Leuchtende Kurven und futuristischer Eindruck. Curvas luminosas con aspecto futurista.",
  ],
  focus: [
    "modern simple",
    "One highlighted series and a shaded area put the subject in focus. Eine hervorgehobene Reihe mit Flächenfüllung. Una serie destacada con área sombreada.",
  ],
  atlas: [
    "traditional detailed editorial comparison",
    "Geographic map beside a table of state values and dates. Geografische Karte mit Länderwerten und Datenständen. Mapa geográfico con valores y fechas regionales.",
  ],
  "map-poster": [
    "modern detailed",
    "Tall geographic map with regional labels beneath it. Hohe geografische Karte mit Länderwerten darunter. Mapa vertical con etiquetas regionales debajo.",
  ],
  "map-tiles": [
    "modern compact comparison technical",
    "Equal-size state tiles for comparison without geographic area bias. Gleich große Länderkacheln zum Vergleich. Mosaico de regiones del mismo tamaño para comparar.",
  ],
  bars: [
    "traditional simple comparison editorial",
    "Directly labelled horizontal bars make quantities comparable. Direkt beschriftete horizontale Balken. Barras horizontales con etiquetas directas.",
  ],
  strip: [
    "simple compact comparison",
    "A stacked horizontal strip shows the whole composition. Eine gestapelte Leiste zeigt die gesamte Zusammensetzung. Una franja apilada muestra toda la composición.",
  ],
  dots: [
    "modern simple comparison compact",
    "A sparse point comparison with clearly labelled answers. Reduzierter Punktvergleich mit klaren Antwortbeschriftungen. Comparación de puntos con respuestas claramente etiquetadas.",
  ],
  hemicycle: [
    "traditional editorial",
    "Parliament semicircle with a dot for each modelled seat. Parlamentshalbkreis mit einem Punkt je modelliertem Sitz. Hemiciclo con un punto por cada escaño modelizado.",
  ],
  waffle: [
    "modern detailed technical",
    "Countable seat dots in an aligned grid. Zählbare Sitzpunkte in einem ausgerichteten Raster. Puntos contables de escaños en una cuadrícula.",
  ],
  columns: [
    "traditional simple",
    "Upright columns compare modelled seat counts. Senkrechte Säulen vergleichen modellierte Sitzanzahlen. Columnas verticales comparan escaños modelizados.",
  ],
  ring: [
    "modern compact",
    "A doughnut ring shows the composition of parliament. Ein Ringdiagramm zeigt die Zusammensetzung des Parlaments. Un anillo muestra la composición parlamentaria.",
  ],
  "coalition-bars": [
    "traditional editorial comparison",
    "Stacked coalition bars and a clear majority threshold. Gestapelte Koalitionsbalken mit Mehrheitsmarke. Barras apiladas de coaliciones con umbral de mayoría.",
  ],
  distance: [
    "simple comparison compact",
    "Shortfall or surplus relative to the majority threshold. Fehlende Sitze oder Überschuss gegenüber der Mehrheit. Escaños que faltan o sobran respecto a la mayoría.",
  ],
  "coalition-cards": [
    "modern compact bold",
    "Large coalition totals in separate cards. Große Koalitionssummen in einzelnen Karten. Totales grandes de coaliciones en tarjetas separadas.",
  ],
  duel: [
    "simple compact comparison",
    "Two coalition options compared directly. Zwei Koalitionsoptionen direkt gegenübergestellt. Comparación directa de dos opciones de coalición.",
  ],
  "coalition-table": [
    "traditional detailed editorial technical",
    "A coalition fact sheet with seats and majority margins. Koalitionstabelle mit Sitzen und Mehrheitsabständen. Tabla de coaliciones con escaños y márgenes de mayoría.",
  ],
  diverging: [
    "simple comparison editorial",
    "Signed gains and losses on opposite sides of zero. Gewinne und Verluste beiderseits der Null. Ganancias y pérdidas a ambos lados del cero.",
  ],
  dumbbell: [
    "modern simple comparison",
    "Linked pairs of dots show previous and current values. Verbundene Punktpaare zeigen vorherige und aktuelle Werte. Pares de puntos conectados muestran valores anteriores y actuales.",
  ],
  "change-table": [
    "traditional detailed editorial technical",
    "Exact before-and-after figures and percentage-point differences. Genaue Vorher-Nachher-Zahlen und Prozentpunktdifferenzen. Cifras exactas de antes y después y diferencias en puntos porcentuales.",
  ],
  "change-cards": [
    "modern compact bold",
    "Large signed changes on individual party cards. Große Veränderungen mit Vorzeichen auf Parteikarten. Cambios grandes con signo en tarjetas de partidos.",
  ],
  "change-poster": [
    "modern bold",
    "A vertical social-media graphic highlighting gains and losses. Vertikale Social-Media-Grafik für Gewinne und Verluste. Gráfica vertical para redes sociales con ganancias y pérdidas.",
  ],
};

export function searchDescription(item) {
  if (item.design === "aligned")
    return {
      description:
        "Compare chancellors or governments from the start of each term. Amtszeiten ab ihrem jeweiligen Beginn vergleichen. Compara gobiernos desde el inicio de cada mandato.",
      concepts: ["detailed", "editorial", "comparison"],
      vocabulary: [
        SEARCH_STYLES.detailed,
        SEARCH_STYLES.editorial,
        SEARCH_STYLES.comparison,
      ].join(" "),
    };
  const [tags = "", description = ""] =
    designs[item.design] ||
    (["native", "map-original"].includes(item.design)
      ? [
          "traditional editorial simple",
          "Original Pollframe website layout. Vertraute Darstellung der Pollframe-Webseite mit Originalwerten. Diseño original de la web de Pollframe.",
        ]
      : []);
  const concepts = new Set(tags.split(" ").filter(Boolean));
  if (["history", "party", "approval", "tendencies"].includes(item.topic))
    concepts.add("change");
  return {
    description,
    concepts: [...concepts],
    vocabulary: [...concepts].map((tag) => SEARCH_STYLES[tag]).join(" "),
  };
}
