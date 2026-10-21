import { text as t } from "./party-match-text.js";

// Product name; explanatory titles remain translated.
export const MATCH_EXPERIENCE_COPY = {
  basisShort: t(
    "Fragen beantwortet",
    "Questions answered",
    "Preguntas respondidas",
  ),
  weightedExport: t(
    "Gewählte Prioritäten zählen doppelt.",
    "Selected priorities count twice.",
    "Las prioridades seleccionadas cuentan doble.",
  ),
  graphicTitle: t("Titel", "Title", "Título"),
  exportSource: t(
    "Quellen: Wahlprogramme und offizielle Dokumente · Ausgabe 2025",
    "Sources: party programmes and official documents · 2025 edition",
    "Fuentes: programas y documentos oficiales · edición de 2025",
  ),
  selectedParty: t(
    "Ausgewählte Partei",
    "Selected party",
    "Partido seleccionado",
  ),
  backToResult: t(
    "Zurück zum Ergebnis",
    "Back to result",
    "Volver al resultado",
  ),
  wide: t("Querformat", "Landscape", "Horizontal"),
  name: t("Wahlframe", "Wahlframe", "Wahlframe"),
  title: t(
    "Welche Partei passt zu deinen Positionen?",
    "Which party matches your views?",
    "¿Qué partido coincide con tus opiniones?",
  ),
  rangeShort: t(
    "Wie viele Antworten zählen, steht bei jeder Partei.",
    "Each party shows how many of your answers were compared.",
    "Cada partido muestra cuántas respuestas se compararon.",
  ),
  place: t("Platz", "Place", "Puesto"),
  missingPosition: t(
    "Für diese Partei nicht berechnet: Die genaue Position ist noch nicht belegt. Andere belegte Antworten zählen weiter.",
    "Not scored for this party: the exact position is not yet documented. Other documented answers still count.",
    "No se puntúa para este partido: falta acreditar la postura exacta. Las demás respuestas documentadas sí cuentan.",
  ),
  rankingNote: t(
    "Die Reihenfolge beruht auf ungerundeter Übereinstimmung mit belegten Positionen. Echte Gleichstände teilen einen Platz. Verschiedene Belegabdeckung kann die Vergleichbarkeit begrenzen; der direkte Vergleich verwendet nur gemeinsam belegte Fragen.",
    "Order uses unrounded agreement on documented positions. Exact ties share a place. Different coverage can limit comparability; the direct comparison uses only jointly documented questions.",
    "El orden usa la coincidencia sin redondear sobre posturas acreditadas. Los empates exactos comparten puesto. La cobertura distinta puede limitar la comparación; la comparación directa usa solo preguntas acreditadas para ambos.",
  ),
  exportRange: t(
    "Übereinstimmung auf belegter Grundlage · Abdeckung je Partei",
    "Agreement on documented positions · coverage per party",
    "Coincidencia sobre posturas acreditadas · cobertura por partido",
  ),
  countLabel: t(
    "beantwortete Fragen",
    "answered questions",
    "preguntas respondidas",
  ),
  coverageNote: t(
    "Der Prozentwert bezieht sich nur auf deine beantworteten Fragen mit belegter Position dieser Partei. Fehlende Belege werden nur bei dieser Partei aus Zähler und Nenner entfernt, nicht als Zustimmung, Ablehnung oder neutral gewertet. Prioritäten zählen doppelt. Die Abdeckung zeigt, wie viele Antworten tatsächlich verglichen wurden.",
    "The percentage uses only your answered questions with a documented position for this party. Missing evidence is removed from that party’s numerator and denominator, never treated as agreement, disagreement or neutrality. Priorities count twice. Coverage shows how many answers were actually compared.",
    "El porcentaje usa solo tus preguntas respondidas con una postura acreditada de ese partido. Las lagunas se excluyen del numerador y denominador solo de ese partido, nunca se consideran acuerdo, desacuerdo ni neutralidad. Las prioridades cuentan doble. La cobertura indica cuántas respuestas se compararon.",
  ),
  narrow: t(
    "Ein Einzelwert mit sichtbarer Belegabdeckung, keine Wahrscheinlichkeit einer Wahlentscheidung. Bei weniger als vier belegten Antworten zeigen wir für diese Partei keinen Prozentwert.",
    "A single figure with visible evidence coverage, not a probability of voting for a party. We show no percentage for a party with fewer than four documented answers.",
    "Una cifra con cobertura visible, no una probabilidad de votar a un partido. No mostramos porcentaje para partidos con menos de cuatro respuestas acreditadas.",
  ),
  formula: t(
    "Gleiche Antworten ergeben 1 Punkt, gegensätzliche 0, teils/teils gegenüber Zustimmung oder Ablehnung 0,5. Gewählte Prioritäten zählen doppelt. Für jede Partei teilen wir die erreichten Punkte durch die maximal möglichen Punkte der tatsächlich belegten und von dir beantworteten Fragen und multiplizieren mit 100. Übersprungene Antworten und fehlende Parteipositionen zählen bei dieser Partei weder im Zähler noch im Nenner. Mindestens vier belegte Antworten sind erforderlich. Die Anzeige rundet auf ganze Prozent; die Rangfolge nutzt ungerundete Werte, echte Gleichstände teilen einen Platz. Unterschiede in der Belegabdeckung bleiben sichtbar. Dies misst weder politische Qualität noch Wahlwahrscheinlichkeit. Im direkten Vergleich verwenden beide Parteien ausschließlich dieselben gemeinsam belegten Fragen und Gewichte.",
    "Identical answers earn 1 point, opposite answers 0, and mixed versus agreement or disagreement 0.5. Selected priorities count twice. For each party, achieved points are divided by the maximum points on its documented questions you answered, then multiplied by 100. Skips and missing party positions are excluded from both numerator and denominator for that party. At least four documented answers are required. Display rounds to whole percentages; ranking uses unrounded figures, with exact ties sharing a place. Differences in evidence coverage stay visible. This measures neither political quality nor voting probability. Direct comparison uses exactly the same jointly documented questions and weights for both parties.",
    "Respuestas iguales suman 1 punto, opuestas 0 e intermedia frente a acuerdo o desacuerdo 0,5. Las prioridades cuentan doble. Para cada partido dividimos los puntos obtenidos entre los máximos posibles en sus preguntas acreditadas que has respondido y multiplicamos por 100. Las omisiones y posturas desconocidas se excluyen del numerador y denominador de ese partido. Se requieren cuatro respuestas acreditadas. Redondeamos a porcentajes enteros; el orden usa cifras sin redondear y los empates exactos comparten puesto. La cobertura permanece visible. No mide calidad política ni probabilidad de voto. La comparación directa usa las mismas preguntas acreditadas y pesos para ambos partidos.",
  ),
  proposal: t("Was sie vorschlagen", "What they propose", "Qué proponen"),
  partyArgument: t(
    "Welche Argumente sie nennen",
    "What they argue",
    "Qué argumentan",
  ),
  argumentMissing: t(
    "Hier ist noch keine zusätzliche Argumentationszusammenfassung geprüft. Du kannst die Originalquelle unten lesen; wir unterstellen keine Motive.",
    "No additional argument summary has been reviewed here yet. Read the original below; we do not infer motives.",
    "Todavía no hay otro resumen de argumentos revisado aquí. Puedes leer la fuente original abajo; no suponemos motivos.",
  ),
  research: t(
    "Was die Forschung sagt",
    "What research says",
    "Qué dice la investigación",
  ),
  researchLimit: t(
    "Einordnung & Grenzen",
    "Context & limitations",
    "Contexto y limitaciones",
  ),
  researchMissing: t(
    "Für diese genaue Frage ist hier noch keine geprüfte Forschungszusammenfassung hinterlegt. Das bedeutet nicht, dass es keine Forschung dazu gibt.",
    "No reviewed research summary for this exact question is included here yet. That does not mean no research exists.",
    "Todavía no incluimos un resumen de investigación revisado sobre esta pregunta exacta. No significa que no haya estudios.",
  ),
  researchPolicy: t(
    "Die Auswahl folgt der Frage, direkter Anwendbarkeit und Nachvollziehbarkeit der Methode, nicht der Übereinstimmung mit einer Partei. Studien belegen keine moralische Rangfolge. Wir trennen Befunde, Modelle und Werturteile; Gegenbefunde und Grenzen gehören zur Einordnung. Dies ist eine kuratierte Auswahl, keine vollständige systematische Übersichtsarbeit. Die aktuellen Forschungsstände sind von der historischen Programmausgabe 2025 getrennt.",
    "Selection follows the question, direct relevance and an inspectable method, not agreement with a party. Studies do not establish a moral ranking. We distinguish findings, models and value judgements, including counter-findings and limitations. This is a curated selection, not a complete systematic review. Research dates are separate from the historical 2025 programme edition.",
    "Seleccionamos por la pregunta, relevancia directa y método verificable, no por coincidir con un partido. Los estudios no establecen una jerarquía moral. Distinguimos resultados, modelos y valores, con hallazgos contrarios y limitaciones. Es una selección, no una revisión sistemática completa. Las fechas de investigación se separan de los programas históricos de 2025.",
  ),
  topicsTitle: t(
    "Übereinstimmung nach Thema",
    "Agreement by topic",
    "Coincidencia por tema",
  ),
  topicsInfo: t(
    "Diese Werte vergleichen deine Antworten mit der ausgewählten Partei nach Themen, nicht nach links oder rechts. Ein Balken erscheint erst ab drei beantworteten Fragen mit belegter Parteiposition in diesem Thema. Jede Frage gehört innerhalb eines Durchgangs zu genau einem Teilbereich; Prioritäten und Belegabdeckung gelten wie im Gesamtergebnis.",
    "These figures compare your answers with the selected party by topic, not left and right. A bar appears only after three answered questions with documented party positions in that topic. Each question belongs to one subtopic within a round; priorities and evidence coverage work as in the overall result.",
    "Estas cifras comparan tus respuestas con el partido por tema, no por izquierda o derecha. Una barra requiere tres preguntas respondidas con posturas documentadas en ese tema. Cada pregunta pertenece a un subtema dentro de una ronda; prioridades y cobertura funcionan como en el resultado total.",
  ),
  driversTitle: t(
    "Was dein Ergebnis prägt",
    "What drives your result",
    "Qué determina tu resultado",
  ),
  agreements: t(
    "Gemeinsame Positionen",
    "Shared positions",
    "Posturas compartidas",
  ),
  disagreements: t("Unterschiede", "Differences", "Diferencias"),
  noneHere: t(
    "Unter deinen belegten Antworten keine.",
    "None among your documented answers.",
    "Ninguna entre tus respuestas acreditadas.",
  ),
  compare: t(
    "Zwei Parteien direkt vergleichen",
    "Compare two parties directly",
    "Comparar dos partidos directamente",
  ),
  sharedBasis: t(
    "Gleiche Fragen für beide",
    "Same questions for both",
    "Las mismas preguntas para ambos",
  ),
  compareTooFew: t(
    "Für diese beiden Parteien sind weniger als vier deiner Antworten gemeinsam belegt.",
    "Fewer than four of your answers are jointly documented for these two parties.",
    "Menos de cuatro de tus respuestas están acreditadas para ambos partidos.",
  ),
  openStudio: t("In Studio gestalten", "Design in Studio", "Diseñar en Studio"),
  resultStudio: t(
    "Dein Ergebnis gestalten",
    "Design your result",
    "Diseña tu resultado",
  ),
  savePrivate: t(
    "Im Konto speichern",
    "Save to my account",
    "Guardar en mi cuenta",
  ),
  savedPrivate: t(
    "Ergebnis im Konto gespeichert.",
    "Result saved to your account.",
    "Resultado guardado en tu cuenta.",
  ),
  savePrivacy: t(
    "Dein Ergebnis kann politische Ansichten erkennen lassen. Mit deiner ausdrücklichen Zustimmung speichern wir Ergebnis, Themen- und Achsenwerte, berechnete Vergleiche und Gestaltung verschlüsselt im Konto, nicht deine einzelnen Antworten. Dazu ist eine Anmeldung nötig. Es ist keine Ende-zu-Ende-Verschlüsselung: Pollframe kann das Ergebnis für dich entschlüsseln. In „Meine Ergebnisse“ kannst du es jederzeit löschen und damit die Einwilligung widerrufen. Bereits heruntergeladene oder geteilte Kopien bleiben unabhängig davon bestehen.",
    "Your result can reveal political views. With your explicit consent, we store the result, topic and axis scores, calculated comparisons and design encrypted in your account, not individual answers. Sign-in is required. This is not end-to-end encryption: Pollframe can decrypt the result for you. Delete it in My results at any time to withdraw consent. Already downloaded or shared copies remain independent.",
    "El resultado puede revelar opiniones políticas. Con tu consentimiento expreso, guardamos cifrados el resultado, las puntuaciones temáticas y de ejes, las comparaciones y el diseño, no tus respuestas individuales. Es necesario acceder a tu cuenta. No es cifrado de extremo a extremo: Pollframe puede descifrarlo para ti. Puedes borrarlo en Mis resultados y retirar el consentimiento. Las copias descargadas o compartidas son independientes.",
  ),
  privateResults: t(
    "Private Ergebnisse · dein Konto",
    "Private results · your account",
    "Resultados privados · tu cuenta",
  ),
  designName: t("Name der Grafik", "Graphic name", "Nombre de la gráfica"),
  style: t("Design", "Design", "Diseño"),
  subtitle: t("Untertitel", "Subtitle", "Subtítulo"),
  appearance: t("Darstellung", "Appearance", "Aspecto"),
  font: t("Schriftart", "Font", "Tipografía"),
  fontSize: t("Schriftgröße", "Text size", "Tamaño del texto"),
  rounding: t("Grafikecken", "Graphic corners", "Esquinas de la gráfica"),
  resetStyle: t(
    "Gestaltung zurücksetzen",
    "Reset design",
    "Restablecer diseño",
  ),
  lockedResult: t(
    "Ergebnis, Belegabdeckung und Quellen bleiben geschützt. Ändere Antworten in Wahlframe, um das Ergebnis neu zu berechnen.",
    "Result, evidence coverage and sources stay protected. Change answers in Wahlframe to recalculate the result.",
    "El resultado, cobertura y fuentes permanecen protegidos. Cambia las respuestas en Wahlframe para recalcularlo.",
  ),
  noDraft: t(
    "Öffne ein Ergebnis aus Wahlframe oder aus „Meine Designs“. Beim Neuladen werden ungespeicherte Ergebnisse verworfen.",
    "Open a result from Wahlframe or “My designs”. Reloading discards unsaved results.",
    "Abre un resultado de Wahlframe o de «Mis diseños». Recargar descarta los resultados sin guardar.",
  ),
  privacy: t(
    "Deine einzelnen Antworten bleiben im Arbeitsspeicher dieses Tabs; Neuladen oder Schließen löscht sie. Keine Analysezähler auf den Vergleichs- und Ergebnis-Editorseiten. Ohne ausdrückliches Speichern bleibt auch dein Ergebnis nur im Tab. Speichern benötigt ein Konto und deine gesonderte ausdrückliche Einwilligung. Gespeichert werden verschlüsselte Zusammenfassungen, keine einzelnen Antworten. Löschen unter Studio → Meine Designs widerruft die Einwilligung. Heruntergeladene oder geteilte Kopien bleiben unabhängig bestehen.",
    "Individual answers stay in this tab’s memory; reloading or closing clears them. No analytics on comparison and result-editor pages. Without explicit saving, your result also stays only in this tab. Saving requires an account and separate explicit consent. We store encrypted summaries, not individual answers. Deleting under Studio → My designs withdraws consent. Downloaded or shared copies remain independent.",
    "Las respuestas individuales permanecen en la memoria de esta pestaña; recargar o cerrar las borra. No hay contadores analíticos en las páginas del comparador y editor. Sin guardarlo expresamente, el resultado también queda en la pestaña. Guardar requiere una cuenta y consentimiento expreso separado. Se guardan resúmenes cifrados, no respuestas individuales. Borrarlos en Studio → Mis diseños retira el consentimiento. Las copias descargadas o compartidas son independientes.",
  ),
};
