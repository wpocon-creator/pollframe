# Checkliste vor einer öffentlichen Veröffentlichung

## P0 – vor dem ersten öffentlichen Launch

- [ ] Endgültigen Projektnamen wählen und Domain sowie mögliche Namenskonflikte prüfen.
- [ ] Mit einer erziehungsberechtigten Person klären, wer Domain, Hosting, Verträge, Spenden oder Werbekonten verwaltet.
- [x] Mit einer erziehungsberechtigten Person Impressum, verantwortliche Person, ladungsfähige Anschrift und eine getrennte Redaktions-E-Mail klären.
- [ ] Schriftliche Erlaubnis für alle historischen Daten ohne klar anwendbare offene Lizenz einholen.
- [x] ODC-ODbL-Pflichten für die DAWUM-Datenbank korrekt umsetzen: Quellenhinweis, Lizenzlink und Kennzeichnung eigener Änderungen.
- [x] Für jede Datenquelle Eigentümer, URL, Lizenz-/Rechtestatus, Verwendung und offene Prüfung im Quellenregister dokumentieren.
- [x] Methodik festschreiben und versionieren: einbezogene Institute, 45-Tage-Fenster, Gewichtung, Glättung, Umgang mit fehlenden Parteien und Korrekturen.
- [ ] Die Sitzprojektion fachlich prüfen. Bis dahin deutlich als vereinfachtes Modell kennzeichnen; Grundmandate, Wahlkreise und Landeslisten werden nicht modelliert.
- [x] Redaktionelle Regeln für Ereignisse und Kontroversen veröffentlichen und ein öffentliches Korrektur-/Änderungsprotokoll anbieten.
- [x] Automatische Datenprüfung einbauen: Wertebereich, Summe der Parteien, unbekannte Institute, falsche Daten und fehlende Felder.
- [x] Neue oder korrigierte Umfragen automatisch auf ungewöhnlich große Einzelquellen-Sprünge prüfen und nur über deterministische Review-IDs freigeben.
- [x] Pflicht-CI für Build, Daten, Abhängigkeiten sowie Chromium, Firefox, WebKit und repräsentative Geräteprofile bereitstellen.
- [ ] Safari/iPhone und Android zusätzlich auf echten Geräten im Familien- oder Freundeskreis prüfen.
- [ ] Tastaturbedienung, Fokusreihenfolge, Screenreader-Beschriftungen, Farbkontrast, größere Schrift und reduzierte Bewegung prüfen.
- [ ] Performance auf einem langsameren Mobilgerät testen; Ziel: Hauptansicht schnell sichtbar, keine unnötigen Drittanbieter-Skripte.
- [x] Sichere HTTP-Header, strikte CSP, Einbettungsschutz und getrennten Embed-Einstieg in den Produktions-Build integrieren.
- [x] Cloudflare Workers mit Static Assets, Produktions-Build, HTTPS und Cache-Regeln konfigurieren; Header aus `dist/_headers` extern verifiziert.
- [ ] GitHub-, Cloudflare-, Domain- und Proton-Konten mit Passkey oder Hardware-Key-2FA absichern; Wiederherstellungscodes offline bei den Eltern aufbewahren.
- [ ] Produktionsbranch schützen: keine Force-Pushes, erfolgreiche Checks verlangen und GitHub Actions nur mit vollständigen Commit-SHAs erlauben.
- [ ] Keine Analyse-, Werbe- oder Cookie-Dienste aktivieren, bevor Datenschutz und Einwilligung sauber gelöst sind.
- [x] Öffentlichen Korrekturweg über eine getrennte Redaktions-E-Mail und einen lokalen `mailto:`-Kontaktassistenten anbieten, der Eingaben weder überträgt noch speichert.
- [ ] Vor dem ersten Deploy `BUG_REPORT_ADMIN_KEY` als langes zufälliges Cloudflare-Worker-Secret setzen, das interne Dashboard unter `/?page=bug-reports` testen und einen sicheren monatlichen JSON-Export der Meldungen ablegen.
- [ ] Backup für Code, Datensatz und redaktionelle Ereignisliste einrichten.
- [x] Vor dem Launch klar „Beta“ und „keine Wahlprognose“ anzeigen.

## P1 – kurz nach dem Launch

- [x] Tägliche automatische Aktualisierung mit fehlersicherem Abbruch, Auffälligkeitsstopp und sichtbarem Datenstand.
- [ ] Benachrichtigung für fehlgeschlagene GitHub-Actions-Läufe aktivieren.
- [x] Öffentliche Änderungsnotizen für Daten, Methodik und Ereignisse.
- [x] Funktionierende teilbare Links für alle Filter und Zeiträume.
- [x] Fertigen responsiven Embed mit Vorschau, fester Quellenzeile und dokumentierten Größen.
- [x] Download als gut dokumentiertes CSV zusätzlich zu JSON.
- [ ] Instituteinzelansicht mit Feldzeit, Stichprobe, Auftraggeber und Originalquelle.
- [x] Unsicherheit verständlich darstellen, ohne ein falsches Präzisionsgefühl zu erzeugen.
- [ ] Monitoring für Ladefehler und beschädigte Daten ohne unnötiges personenbezogenes Tracking.
- [x] SEO-Metadaten, Social-Preview und strukturierte Seitentitel ergänzen.

## P2 – erst nach stabiler Bundesversion

- [x] Länder-Auswahl innerhalb derselben Website statt 16 getrennte Websites.
- [x] Pilotseiten für Sachsen-Anhalt, Berlin und Mecklenburg-Vorpommern.
- [ ] Länderspezifische Wahlregeln, Parteien, Sperrklauseln und Sitzverteilungen separat modellieren.
- [ ] Koalitionsansichten um veröffentlichte Ausschlüsse ergänzen – nur mit datierten Primärquellen und ohne eigene Wahrscheinlichkeitswertung.
- [ ] Englische redaktionelle Texte vollständig gegenlesen lassen.
- [ ] Finanzierung testen: freiwillige Unterstützung oder journalistische Embed-Dienste vor Werbung priorisieren.

## Launch-Entscheidung

Öffentlich gehen, wenn alle P0-Punkte erfüllt sind und Datenaktualisierung sowie Mobilansicht stabil laufen. Ein bezahltes Audit ist nicht nötig. Vorher kostenlos drei kurze Gegenprüfungen organisieren: eine Person prüft Zahlen und Methodik, eine die Sprache und eine die Bedienung am Handy. Wenn das nicht möglich ist, die Beta klar kennzeichnen, bekannte Grenzen veröffentlichen und Fehlerkorrekturen schnell dokumentieren.

## Erneuter Pre-Publish-Check · 14. August 2026

Technisch in diesem Durchgang bestätigt:

- Produktions- und Embed-Build einschließlich Daten- und Security-Validator erfolgreich; 17 Regionen, 3.154 deutsche, 8.082 britische und 3.278 spanische Datensätze validiert.
- `npm audit --audit-level=low`: 0 bekannte Schwachstellen.
- Schreibgeschützter DAWUM-Livecheck erfolgreich; Quelle bis 11. August 2026 validiert, keine Datei geschrieben.
- 47 Integrations- und Handy-Szenarien in lokalem Chrome/Pixel-5-Profil bestanden; zusätzlich 10 gezielte PWA-, Watchlist- und Endpunktprüfungen bestanden. PNG, Embed-Vorschau, Share-URLs, Sprachen, Rechtsseiten und mobile Layouts waren enthalten.
- Neuer Regressionstest: Der rechte Endpunkt aller historischen Wahlabsichtsgraphen entspricht in Deutschland, UK und Spanien exakt der jeweils aktuellen Karte.
- Neue App-Widgets für Zufriedenheit, britische und spanische Themen, persönliche Sorgen, wirtschaftliche Wahrnehmung, Spanien seit 2023, PP–PSOE-Abstand, Institutsstreuung und auswählbare spanische Regionalstände sind in Handy und Dark Mode geprüft.
- Zufriedenheitsseite auf das historische Pollframe-Diagrammsystem umgebaut; Desktop, Handy, Dark Mode, Deutsch, Englisch und Spanisch sowie der eigenständige Embed wurden mit realen Browser-Screenshots geprüft.
- UK-Zeitleiste im Zehnjahresfenster von einer reinen Wahlauswahl auf 19 sichtbare Wahl-, Politik- und Wirtschaftskontexte erweitert; Ereignisdetails verlinken Primär- beziehungsweise Parlamentsquellen und behaupten keine Kausalität.
- Eigenständige Share-/Embed-/4K-PNG-Module für aktuellen Durchschnitt, modellierte Sitzverteilung und 90-Tage-Tendenzen ergänzt. Der irreführende Zähler „Unterhalb der 5-%-Hürde“ wurde durch konkret benannte größere erfasste Parteien ohne Sitze ersetzt.
- Hinweis für den nächsten CI-Lauf: Die neuen Browserregressionen sind eingecheckt, konnten in dieser Shell aber nicht mit Playwright ausgeführt werden, weil sie Node 18 statt der im Projekt verlangten Node-Version 22 bereitstellt. Produktions-, Daten- und Sicherheitsbuild liefen erfolgreich; Chrome-Screenshots wurden direkt erzeugt.

Noch offene P0-Punkte außerhalb des Codes:

- finalen Namen und Domainkonflikte prüfen;
- Domain, Hosting, Verträge und Konten verbindlich mit der erziehungsberechtigten Person zuordnen;
- Wiederherstellung und starke 2FA für GitHub, Cloudflare, Domain und Redaktionsmail einrichten;
- Branchschutz, Pflichtchecks, Workflow-Benachrichtigungen und Backups im jeweiligen Anbieter-Dashboard aktivieren;
- je ein kurzer externer Zahlen-, Sprach- und echter Gerätecheck auf Android sowie iPhone/iPad.

Noch offene P0-Punkte am Produkt bzw. redaktionell:

- Nutzungsrechte der Zufriedenheits-Zeitreihen und aller übrigen Quellen ohne ausdrücklich offene Lizenz schriftlich klären und den Quellenkatalog um Erlaubnis/Abrufdatum ergänzen;
- öffentliche Regeln und ein nachvollziehbares Änderungsprotokoll für Ereignisse, Kontroversen und Datenkorrekturen ergänzen;
- zusätzlich zur harten Datenvalidierung einen Auffälligkeits-Workflow definieren, der ungewöhnliche, aber formal gültige neue Umfragen vor Veröffentlichung anhält;
- vollständigen Tastatur-, Screenreader-, Kontrast-, Großschrift- und Reduced-Motion-Audit durchführen;
- reale langsame Mobilverbindung bzw. schwächeres Gerät messen. Der Hauptchunk liegt derzeit bei rund 660 kB unkomprimiert beziehungsweise 207 kB gzip und erzeugt noch eine Vite-Größenwarnung;
- Cloudflare Web Analytics ist bereits aktiv und in der Datenschutzerklärung beschrieben. Vor Launch die konkrete Konfiguration und gewählte Rechtsgrundlage nochmals fachkundig gegenprüfen; bis dahin diesen Punkt nicht als erledigt behandeln.

Ergebnis dieses damaligen Durchgangs: technisch deutlich näher am Launch, aber noch kein uneingeschränktes „Go“. Den inzwischen behobenen redaktionellen Auffälligkeits-/Korrekturprozess und den aktuellen Reststatus dokumentiert das folgende Update.

## Launch-Gate-Update · 16. August 2026

Neu abgeschlossen:

- Pflicht-Workflow für normale PRs und `main`: Produktionsbuild, Advisory-Audit,
  Chromium/Firefox/WebKit sowie getrennte Handy-, Tablet-, PWA- und
  Visualprüfungen. Branchschutz muss den Workflow im GitHub-Dashboard noch
  verbindlich verlangen.
- Deterministischer Auffälligkeitsstopp für große neue Einzelquellen-Sprünge;
  keine stillen Ausnahmen ohne Review-ID.
- Öffentliche Redaktionsregeln und Änderungsprotokoll unter `/?page=redaktion`,
  vollständigeres Quellenregister und ausdrückliche Kennzeichnung ungeklärter
  Rechte der Zufriedenheitsreihen.
- Aktualisiertes Sicherheitsmodell für Worker, Durable Object, Bugreport-API,
  Dashboard, Rate Limit und Aufbewahrung; manueller JSON-Export im Dashboard.
- Harte Transferbudgets: Haupt-JavaScript 241,8 KiB gzip, CSS 41,5 KiB gzip,
  gesamtes JavaScript 354,5 KiB gzip.
- 10/10 repräsentative Android-Geometrie/PWA/Offline/Visualtests sowie gezielte
  Desktop-Prüfungen für Rechtsseiten, Handy-Vorschau und alle empfohlenen
  Embed-Höhen bestanden. npm-Audit: 0 bekannte Schwachstellen. Worker-Dry-Run
  mit Assets und Durable-Object-Bindung erfolgreich.

Live-Befund und verbleibendes Go/No-Go:

- Die derzeitige `de.pollframe.workers.dev`-Version ist veraltet:
  `/data/approval.json` liefert die HTML-App-Shell, ein Bugreport-POST endet mit
  `405`, und der unautorisierte API-GET wird nicht vom aktuellen Worker mit
  `401` beantwortet. Vor Launch aktuellen Stand plus Worker-Migration deployen,
  `BUG_REPORT_ADMIN_KEY` setzen und die Produktionsabnahme aus
  `PRELAUNCH_RUNBOOK.md` durchführen.
- Zufriedenheitsreihen ohne geklärte Wiederverwendungsrechte bleiben aus dem Release ausgeschlossen; für FGW liegt eine Freigabe mit Quellenangabe vor.
- Verbleibende No-Gos sind weitere als „Review required“ markierte Snapshots, starke Kontosicherung,
  Branchschutz/Benachrichtigungen sowie echte iPhone-/Android- und
  Screenreader-Gegenprüfungen.
