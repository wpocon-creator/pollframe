# Checkliste vor einer öffentlichen Veröffentlichung

## P0 – vor dem ersten öffentlichen Launch

- [ ] Endgültigen Projektnamen wählen und Domain sowie mögliche Namenskonflikte prüfen.
- [ ] Mit einer erziehungsberechtigten Person klären, wer Domain, Hosting, Verträge, Spenden oder Werbekonten verwaltet.
- [x] Mit einer erziehungsberechtigten Person Impressum, verantwortliche Person, ladungsfähige Anschrift und eine getrennte Redaktions-E-Mail klären.
- [ ] Schriftliche Erlaubnis für alle historischen Daten ohne klar anwendbare offene Lizenz einholen.
- [ ] ODC-ODbL-Pflichten für die DAWUM-Datenbank korrekt umsetzen: Quellenhinweis, Lizenzlink und Kennzeichnung eigener Änderungen.
- [ ] Für jede Datenquelle dokumentieren: Eigentümer, URL, Lizenz, Abrufdatum, erlaubte Nutzung und benötigte Namensnennung.
- [ ] Methodik festschreiben und versionieren: einbezogene Institute, 45-Tage-Fenster, Gewichtung, Glättung, Umgang mit fehlenden Parteien und Korrekturen.
- [ ] Die Sitzprojektion fachlich prüfen. Bis dahin deutlich als vereinfachtes Modell kennzeichnen; Grundmandate, Wahlkreise und Landeslisten werden nicht modelliert.
- [ ] Redaktionelle Regeln für Ereignisse und Kontroversen veröffentlichen. Korrekturen müssen nachvollziehbar protokolliert werden.
- [x] Automatische Datenprüfung einbauen: Wertebereich, Summe der Parteien, unbekannte Institute, falsche Daten und fehlende Felder.
- [ ] Neue oder korrigierte Umfragen automatisch auf unplausible Werte prüfen; nur Auffälligkeiten manuell freigeben.
- [ ] Kostenlose automatisierte Tests für aktuelle Chromium- und Firefox-Versionen ausführen; Safari/iPhone und Android mindestens auf echten Geräten im Familien- oder Freundeskreis prüfen.
- [ ] Tastaturbedienung, Fokusreihenfolge, Screenreader-Beschriftungen, Farbkontrast, größere Schrift und reduzierte Bewegung prüfen.
- [ ] Performance auf einem langsameren Mobilgerät testen; Ziel: Hauptansicht schnell sichtbar, keine unnötigen Drittanbieter-Skripte.
- [x] Sichere HTTP-Header, strikte CSP, Einbettungsschutz und getrennten Embed-Einstieg in den Produktions-Build integrieren.
- [ ] Cloudflare Pages mit Produktions-Build, HTTPS, Cache-Regeln und eigener Fehlerseite konfigurieren; nach dem ersten Deployment die Header aus `dist/_headers` extern verifizieren.
- [ ] GitHub-, Cloudflare-, Domain- und Proton-Konten mit Passkey oder Hardware-Key-2FA absichern; Wiederherstellungscodes offline bei den Eltern aufbewahren.
- [ ] Produktionsbranch schützen: keine Force-Pushes, erfolgreiche Checks verlangen und GitHub Actions nur mit vollständigen Commit-SHAs erlauben.
- [ ] Keine Analyse-, Werbe- oder Cookie-Dienste aktivieren, bevor Datenschutz und Einwilligung sauber gelöst sind.
- [x] Öffentlichen Korrekturweg über eine getrennte Redaktions-E-Mail und einen lokalen `mailto:`-Kontaktassistenten anbieten, der Eingaben weder überträgt noch speichert.
- [ ] Backup für Code, Datensatz und redaktionelle Ereignisliste einrichten.
- [ ] Vor dem Launch klar „Beta“ und „keine Wahlprognose“ anzeigen.

## P1 – kurz nach dem Launch

- [x] Zweimal wöchentliche automatische Aktualisierung mit fehlersicherem Abbruch und sichtbarem Datenstand.
- [ ] Benachrichtigung für fehlgeschlagene GitHub-Actions-Läufe aktivieren.
- [ ] Öffentliche Änderungsnotizen für Daten, Methodik und Ereignisse.
- [ ] Funktionierende teilbare Links für alle Filter und Zeiträume.
- [ ] Fertigen responsiven Embed mit Vorschau, fester Quellenzeile und dokumentierten Größen.
- [ ] Download als gut dokumentiertes CSV zusätzlich zu JSON.
- [ ] Instituteinzelansicht mit Feldzeit, Stichprobe, Auftraggeber und Originalquelle.
- [ ] Unsicherheit verständlich darstellen, ohne ein falsches Präzisionsgefühl zu erzeugen.
- [ ] Monitoring für Ladefehler und beschädigte Daten ohne unnötiges personenbezogenes Tracking.
- [ ] SEO-Metadaten, Social-Preview und strukturierte Seitentitel ergänzen.

## P2 – erst nach stabiler Bundesversion

- [ ] Länder-Auswahl innerhalb derselben Website statt 16 getrennte Websites.
- [ ] Pilotseiten für Sachsen-Anhalt, Berlin und Mecklenburg-Vorpommern.
- [ ] Länderspezifische Wahlregeln, Parteien, Sperrklauseln und Sitzverteilungen separat modellieren.
- [ ] Koalitionsansichten um veröffentlichte Ausschlüsse ergänzen – nur mit datierten Primärquellen und ohne eigene Wahrscheinlichkeitswertung.
- [ ] Englische redaktionelle Texte vollständig gegenlesen lassen.
- [ ] Finanzierung testen: freiwillige Unterstützung oder journalistische Embed-Dienste vor Werbung priorisieren.

## Launch-Entscheidung

Öffentlich gehen, wenn alle P0-Punkte erfüllt sind und Datenaktualisierung sowie Mobilansicht stabil laufen. Ein bezahltes Audit ist nicht nötig. Vorher kostenlos drei kurze Gegenprüfungen organisieren: eine Person prüft Zahlen und Methodik, eine die Sprache und eine die Bedienung am Handy. Wenn das nicht möglich ist, die Beta klar kennzeichnen, bekannte Grenzen veröffentlichen und Fehlerkorrekturen schnell dokumentieren.
