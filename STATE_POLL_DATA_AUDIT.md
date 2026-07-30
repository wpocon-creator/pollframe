# Datenprüfung: Landtagsumfragen

Stand: 28. Juli 2026. Quelle ist die öffentliche DAWUM-API unter ODC-ODbL.
Die Tabelle zählt genau die acht Institute, die auch Pollframe anzeigt:
Allensbach, Forsa, Forschungsgruppe Wahlen, INSA, Infratest dimap, Ipsos,
Verian und YouGov. Sie bewertet Dichte und Aktualität, nicht einzelne Institute.

„Aktuell“ entspricht dem 45-Tage-Fenster der Berechnung. Die Karten-Einstufung
ist reproduzierbar: gut ab 45, brauchbar ab 25, begrenzt unter 25 Umfragen seit
2017. Sie sagt ausdrücklich nichts darüber aus, ob gerade mehrere Institute
veröffentlichen.

| Bundesland | Zeitraum | Umfragen | aktuell | Institute aktuell | Kartenstatus |
|---|---:|---:|---:|---:|---|
| Baden-Württemberg | 2017–2026 | 62 | 0 | 0 | gut |
| Bayern | 2017–2026 | 63 | 0 | 0 | gut |
| Berlin | 2017–2026 | 100 | 3 | 2 | gut, aktuelles Mittel möglich |
| Brandenburg | 2017–2026 | 54 | 1 | 1 | gut, aktuell nur ein Institut |
| Bremen | 2018–2026 | 20 | 0 | 0 | begrenzt |
| Hamburg | 2018–2026 | 24 | 1 | 1 | begrenzt |
| Hessen | 2018–2026 | 46 | 0 | 0 | gut |
| Mecklenburg-Vorpommern | 2017–2026 | 47 | 2 | 2 | gut, aktuelles Mittel möglich |
| Niedersachsen | 2017–2026 | 50 | 0 | 0 | gut |
| Nordrhein-Westfalen | 2017–2026 | 75 | 1 | 1 | gut, aktuell nur ein Institut |
| Rheinland-Pfalz | 2017–2026 | 53 | 0 | 0 | gut |
| Saarland | 2017–2025 | 23 | 0 | 0 | begrenzt |
| Sachsen | 2017–2026 | 37 | 0 | 0 | brauchbar |
| Sachsen-Anhalt | 2017–2026 | 31 | 2 | 1 | brauchbar, aktuell nur ein Institut |
| Schleswig-Holstein | 2017–2026 | 30 | 1 | 1 | brauchbar, aktuell nur ein Institut |
| Thüringen | 2017–2026 | 80 | 1 | 1 | gut, aktuell nur ein Institut |

## Umsetzung

Alle Länder haben eine Archivansicht in derselben App. Bei weniger als zwei
Instituten im aktuellen 45-Tage-Fenster warnt die Oberfläche, dass kein
belastbarer Mehrinstitutsdurchschnitt vorliegt. Landes-Sitzmodelle werden noch
nicht angezeigt, weil Sperrklauseln, Parlamentgrößen und Sonderregeln jeweils
separat umgesetzt und geprüft werden müssten.

Die Länderansichten beginnen mit Landeswahlen als Ereignisebene. Bundespolitik,
Europa und Weltgeschehen lassen sich optional ergänzen. Frühere und kommende
Wahltermine stammen von der Bundeswahlleiterin.

## Kommende Landtagswahlen

Laut Bundeswahlleiterin folgen Sachsen-Anhalt am 6. September 2026 sowie Berlin
und Mecklenburg-Vorpommern am 20. September 2026. Diese Länder sind deshalb
redaktionell besonders relevant; eine aktuelle Mehrinstitutsbasis besteht
derzeit in Berlin und Mecklenburg-Vorpommern, nicht in Sachsen-Anhalt.
