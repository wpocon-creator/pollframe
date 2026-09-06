# Ladegeschwindigkeit – 6. September 2026

## Ergebnis

Deutschland: rund 10 % kürzere Ladezeit beim ersten Aufruf und rund 8 % bei
zwischengespeicherten Dateien im abschließenden Live-Vergleich. Das liegt ungefähr
am unteren Rand des zuletzt vereinbarten Ziels von 10–15 %, nicht bei den
ursprünglich angestrebten 50 %. Keine Zusage für jedes Gerät oder jede Verbindung.

| Live-Messung: Bundestagsgraph | Vorher | Nachher | Kürzere Ladezeit |
| --- | ---: | ---: | ---: |
| Neuer Browserkontext, kalter Cache | 4.051 ms | 3.664 ms | 9,6 % |
| Zweiter Aufruf, warmer Cache | 1.964 ms | 1.812 ms | 7,7 % |
| Erste sichtbare aktuelle Umfrage, kalt | 3.957 ms | 3.593 ms | 9,2 % |
| Erste sichtbare aktuelle Umfrage, warm | 1.900 ms | 1.755 ms | 7,6 % |

Das anfängliche JavaScript-Paket schrumpfte von 259,9 auf 211,9 KiB gzip
(18,5 %). Das ist nicht gleichbedeutend mit 18,5 % kürzerer Seitenladezeit.
Das automatische Budget wurde auf 220 KiB gesenkt, um die Einsparung zu schützen.

## Messmethode und Grenzen

- Gleicher Host https://pollframe.com, Chromium, 390 × 844 CSS-Pixel,
  vierfach verlangsamte CPU, 4 Mbit/s Download und 80 ms Netzwerklatenz.
- Drei unabhängige Browserkontexte, jeweils erster und wiederholter Aufruf;
  die Tabelle zeigt Mediane. Gemessen vom Navigationsstart bis zur sichtbaren
  aktuellen Umfrage beziehungsweise zur vorhandenen SVG-Trendlinie.
- Das ist ein reproduzierbarer Funktions-/Geschwindigkeitstest, kein Lighthouse-
  Score, kein LCP und keine Auswertung echter Besucher.
- Service Worker waren für die vergleichbare Cache-Messung blockiert. Die
  Offline-App wurde zusätzlich funktional geprüft, nicht als Ladezeitbenchmark.
- Analytik-Anfragen im Benchmark blockiert; keine neuen Besucherprofile,
  Cookies, Tracking-IDs oder Produktions-Trackingfunktionen eingebaut.
- Vorher: Commit 00cd09a, Worker 849c40c5-1f42-468f-80da-e21461b9fb2a.
  Nachher: Code 96501bd, Worker 7d376167-9c74-4cd2-8ac5-c9e37e979c7b, App v40.
- Schwankungen bleiben relevant: kalte Graph-Aufrufe vorher
  4.136 / 4.051 / 3.851 ms, nachher 4.037 / 3.664 / 3.567 ms;
  warme vorher 1.964 / 2.491 / 1.919 ms, nachher 1.775 / 1.812 / 2.200 ms.

Der lokale Kontrollvergleich ohne Worker-Datenpreloads zeigte kleinere Effekte:
Deutschland kalt 3.801 → 3.585 ms, warm 1.658 → 1.603 ms. Die Live-Zahlen dürfen
nicht direkt mit lokalen Zahlen verglichen werden. Die frühe UK-/Spanien-
Zwischenmessung war vorläufig; auf Wunsch wurden weitere Optimierungen dort
beendet und die abschließende Messung auf Deutschland konzentriert.

Wiederholen (Node 22, Playwright-Browser installiert):

```sh
POLLFRAME_BENCH_REGIONS=bundestag node scripts/measure-page-speed.mjs
```

Optional: `POLLFRAME_BENCH_URL`, `POLLFRAME_BENCH_RUNS`,
`POLLFRAME_BENCH_RESOURCES=1`. Ohne Regionsangabe werden DE, UK und ES gemessen.

## Änderungen

1. Spanische Ansichten und Parteiporträts werden getrennt geladen. Die
   Verfügbarkeit der Porträts bleibt über einen kleinen, getesteten Index bekannt.
2. Geschlossene Umfragentabellen bauen ihre unsichtbaren Karten und Tabellenzeilen
   erst beim Öffnen auf. CSV und vollständige Quellen bleiben zugänglich.
3. Hauptschrift und passende öffentliche Daten werden früher angefordert.
   Vorladen verwendet dieselben URLs und Aktualitätsregeln, keinen neuen Langzeitcache.
4. Die spanischen Vergleiche suchen gezielt im unveränderten 45-Tage-Fenster.
   Ein Referenzvergleich über historische Zeitpunkte prüft identische Ergebnisse.
5. Nicht mehr angebotene Sprachtexte entfernt; Deutsch, Spanisch und beide
   englischen Varianten bleiben erhalten.
6. Offline-Cache erkennt jetzt auch Vites `assets/...`-Abhängigkeiten, insbesondere
   nachgeladene CSS-Dateien. Ein dabei gefundener Bundesländer-Regressionsfehler
   wurde vor dem Deployment korrigiert.
7. PNG-Datumszeilen unterscheiden Veröffentlichung, Befragungsende und
   Datenstand. Quellen und statistische Berechnungsmethoden bleiben erhalten.

## Prüfung

- Produktionsbuild mit Daten-, Sicherheits-, SEO- und Größenprüfungen bestanden.
- Gezielte Desktop-/Handytests für Parteiporträts, Abbrechen beim Laden,
  Fokus-Rückgabe, echte PNGs und responsives Embed-/Spaltenlayout bestanden.
- Deutsche und spanische Integrationsabläufe auf Desktop und Handygröße bestanden.
- Kalter Offline-App-Start für Länderansichten, spanische Regionen, Bayern,
  Wahlkreise und Regierungszufriedenheit bestanden; neue CSS-/Chunk-Cache-Prüfung.
- Unit-Checks für Vorladeziele, Profilindex, identische Spanienwerte,
  Offline-Abhängigkeitsauflösung und ausgeglichene Spaltenlayouts bestanden.
- Live-Verifikation: ausgelieferte Assets, neun zentrale Datendateien, HTTPS,
  Weiterleitungen, Metadaten, isolierte Embeds und geschützte APIs bestanden.
- Export-Stichproben visuell angesehen. WebKit war auf diesem Rechner wegen
  fehlender Systembibliotheken nicht ausführbar; kein behaupteter Safari-
  oder physischer iPhone-Nachweis. Nicht die gesamte historische Testsuite ausgeführt.

Die letzte Prüfserie enthielt veraltete Erwartungen an die frühere Domain,
Dialog-Attribute, Handy-Hover und mobile Navigation. Diese wurden auf das aktuelle
Verhalten angepasst; vorhandene Überlappungs- und Quellenprüfungen bleiben erhalten.
