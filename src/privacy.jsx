import React, { lazy, Suspense } from "react";
const SpanishPrivacyPage = lazy(() => import("./privacy-es.jsx"));
export default function PrivacyPage({ locale, email: CONTACT_EMAIL }) {
  const isGerman = locale === "de";
  if (locale === "es") return <Suspense fallback={<main role="status">Cargando…</main>}><SpanishPrivacyPage email={CONTACT_EMAIL}/></Suspense>;
  if (!isGerman) {
    return (
      <main className="legal-page privacy-page" id="top">
        <a className="breadcrumb" href="/">← Back to overview</a>
        <p className="section-label">Legal</p>
        <h1>Privacy notice</h1>
        <p>You can <a href="?page=datenschutz&lang=en-GB&analytics=off">exclude this browser from our visit statistics</a> or <a href="?page=datenschutz&lang=en-GB&analytics=on">include it again</a>. Pollframe saves only an on/off preference locally; it is not an identifier and is not sent to our counters. Clearing website data removes the preference. Cloudflare's technical request statistics are unaffected.</p>
        <p className="privacy-updated">Last updated: 28 September 2026</p>

        <section>
          <h2>1. Controller</h2>
          <address>
            Katharina O&apos;Connor<br />
            Kaiserallee 2b<br />
            23570 Lübeck<br />
            Germany
          </address>
          <p>Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        </section>

        <section>
          <h2>2. Hosting and delivery</h2>
          <p>Pollframe is delivered through Cloudflare Workers with Static Assets, a service provided by Cloudflare, Inc. To deliver and protect the website, Cloudflare processes technical connection data. This may include the IP address, time of access, requested file, HTTP status, transferred data volume, browser and device information, and a referrer if the browser provides one.</p>
          <p>The legal basis is Article 6(1)(f) GDPR. Our legitimate interests are reliable delivery, protection against attacks and technical fault diagnosis. We do not operate our own visitor database or analyse raw access logs ourselves.</p>
          <p>Rate limits use salted IP hashes, separate from analytics: 60-second edge windows and 15-minute admin windows. Expired counters are deleted.</p>
          <p>Cloudflare operates a global network, so processing may also take place outside the European Economic Area. Cloudflare describes the safeguards used for these transfers in its <a href="https://www.cloudflare.com/cloudflare-customer-dpa/" target="_blank" rel="noreferrer">Data Processing Addendum</a> and <a href="https://www.cloudflare.com/policies/privacy/" target="_blank" rel="noreferrer">Privacy Policy</a>.</p>
        </section>

        <section>
          <h2>3. App and information stored on your device</h2>
          <p>Studio also stores saved designs, reusable styles, imported files and up to 40 recently opened template IDs on this device. The recent-template list supports the “Recently viewed” sort order; it is not sent to our analytics. These local drafts are not a cross-device account backup. The explanatory video is served by Pollframe itself without a third-party video player.</p>
          <p>Pollframe stores settings you actively select—language, appearance and text size—and the latest polling snapshot shown to you in your browser’s local storage. The Watchlist is offered only when Pollframe is opened as an installed app. Its entries contain only selected parliaments and parties plus the last comparison values; they are not sent to Pollframe or synchronised between devices. A session-only baseline keeps changes stable while the app remains open and expires when that browser session ends or after 24 hours. A service worker and browser cache retain the application files and core summaries needed for offline fallback. When Pollframe is opened as an installed app, it also prepares the German, UK and Spanish national polling archives, German state series, Spanish regional data, UK constituency results for offline use. An ordinary browser caches detailed datasets only after they are used.</p>
          <p>If you actively enable device alerts, your browser asks for notification permission. Pollframe checks Watchlist changes while the app is running. Changes already displayed are marked as seen locally and do not produce a delayed system alert. A local record retained for up to 14 days prevents duplicate alerts across app restarts. There is currently no background push delivery when the app is closed. No push subscription or notification endpoint is stored on a Pollframe server.</p>
          <p>These files remain on your device until they are replaced automatically or you remove the app or Pollframe’s website data. The saved library is not uploaded or used to identify you. Opening or sharing configured Studio links transmits the settings and any custom text contained in the URL to Pollframe and, when shared, the recipient. Do not include confidential information. Imported local image and font files are not included in those URLs.</p>
        </section>

        <section>
          <h2>4. Cookies, audience measurement and advertising</h2>
          <p>For each informative notice (Studio introduction or feedback invitation), our aggregate counter also records displays, explicit dismissals and link clicks separately. It does not connect these actions to a visitor. Local notice flags and a timing limit prevent repeated or simultaneous notices; these functional values are never sent to analytics. The analytics opt-out applies to these counters too.</p>
          <p>We also count a qualified reading session when a page remains visible for at least 60 seconds and receives a browser-reported interaction. Only the daily total is sent; keys, pointer positions and sequences of actions are not recorded. This is an engagement indicator, not proof of a human visitor or an ad impression. Known automated analytics submissions and explicitly configured internal IP addresses are excluded before storage; connection headers are examined transiently, not added to the analytics dataset. Unrecognised browsers and single-page visits are not automatically classified as bots.</p>
          <p>Pollframe uses Cloudflare Web Analytics, provided by Cloudflare, Inc., to measure aggregate visits and page views and to understand referrer hosts, countries, device and browser categories, page-load performance and Core Web Vitals. We use these aggregated measurements to improve Pollframe&apos;s reach, usability and technical performance. The analytics beacon is loaded from <code>static.cloudflareinsights.com</code> and sends measurements to <code>cloudflareinsights.com</code>. It is not loaded in the dedicated journalist embed.</p>
          <p>Cloudflare states that Web Analytics does not use cookies or local storage, does not track individuals across websites and does not collect or use visitors&apos; personal data. Query strings are not logged. Pollframe does not receive IP addresses or identifiers that would allow us to recognise an individual visitor. The legal basis is Article 6(1)(f) GDPR; our legitimate interests are privacy-preserving aggregate reach measurement and improving the website.</p>
          <p>Cloudflare retains unsampled beacon data for seven days and subsequently keeps aggregated data; dashboard reports are available for up to six months. Details are provided in Cloudflare&apos;s <a href="https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/" target="_blank" rel="noreferrer">Web Analytics documentation</a>. Pollframe does not use advertising networks, sell personal data or make automated decisions about visitors.</p>
          <p>Pollframe also operates a deliberately limited first-party counter for product improvement. It counts coarse page categories—country overviews, historical polling, maps, issues, government approval and the Watchlist—plus app-installation and installed-app launches, a page remaining visibly open for 60 seconds, and explicit publishing actions such as opening the share or PNG dialog, copying a link, embed code or source note, and starting a PNG or CSV export. The counter stores only the predefined event category, its total and the UTC calendar day in an EU-restricted Cloudflare Durable Object. It does not store an IP address, browser or device details, page address, query string, referrer, cookie, local-storage value or other identifier. It does not create user profiles or recognise returning visitors. The figures count actions rather than unique people; an opened iOS installation guide is not treated as an installation. Daily aggregate counts are deleted after 400 days. The legal basis is Article 6(1)(f) GDPR; our legitimate interests are understanding which parts of Pollframe are useful, checking whether installation and publishing functions work, and improving the service without profiling visitors.</p>
        </section>

        <section>
          <h2>5. Embedded charts and external links</h2>
          <p>Studio search runs locally. The “Popular” order uses daily totals of public template IDs for at most 31 calendar days, without search terms, design content, IP addresses or visitor identifiers. These count openings, not unique people. The analytics opt-out applies here too. The legal basis is Article 6(1)(f) GDPR, for improving the service. Studio fonts are served by Pollframe, not a third-party font service.</p>
          <p>Pollframe embeds load charts and maps directly from Pollframe through Cloudflare. They do not contain advertising or third-party tracking. When you follow an external source or licence link, the destination provider receives the technical data required to load its website and processes it under its own privacy notice.</p>
          <p>The UK constituency finder sends only the postcode extracted from an entered address, an outward postcode or the place term to Postcodes.io after you press “Search”. Pollframe uses the response to select the matching constituency and does not retain the search. Postcodes.io receives the technical connection data required for the request and processes it under its own <a href="https://postcodes.io/about" target="_blank" rel="noreferrer">information</a>. Constituency-name matching, including typo tolerance, remains local in your browser. Northern Ireland postcode lookup is not offered.</p>
        </section>

        <section>
          <h2>6. Bug reports</h2>
          <p>The separate bug-report form sends the selected problem type, the affected page, language, viewport size, browser user-agent string and any optional note to Pollframe. It does not request a name or email address. Cloudflare necessarily processes the connection data described in section 2. Pollframe converts the IP address into a one-way, secret-salted rate-limit value, uses it only to prevent repeated automated submissions and deletes that value after the one-hour rate-limit period.</p>
          <p>Reports are stored in a private Cloudflare Durable Object and are visible only in the password-protected editorial dashboard. We use them to reproduce, prioritise and repair technical, visual and data problems. The legal basis is Article 6(1)(f) GDPR; our legitimate interests are quality assurance and secure operation. Reports are deleted when no longer needed and automatically after no more than twelve months. Do not include personal or sensitive information in the optional note.</p>
        </section>

        <section>
          <h2>7. Contact by email</h2>
          <p>The contact assistant does not transmit entries to Pollframe or Cloudflare. It creates a prepared email and asks the browser to open your local email app. Data is transmitted only if you send the message from that app.</p>
          <p>If you contact us, your message, email address and the information you provide are processed to answer the request. Email is provided through Apple iCloud Mail. The legal basis is Article 6(1)(f) GDPR, or Article 6(1)(b) GDPR where the message concerns steps before entering into a contract. Messages are deleted when the request has been resolved unless legal retention obligations apply. Apple’s information is available in its <a href="https://www.apple.com/legal/privacy/en-ww/" target="_blank" rel="noreferrer">Privacy Policy</a>.</p>
        </section>

        <section>
          <h2>8. Retention and recipients</h2>
          <p>Local preferences and app caches remain until they are automatically replaced or you remove them. Bug reports are retained as described in section 6. Contact messages are kept only as long as necessary for the request or a legal obligation. Technical security and aggregate Web Analytics data processed by Cloudflare are retained as described above and under Cloudflare’s applicable policies. Data is disclosed only to the service providers named above where necessary, or where required by law.</p>
        </section>

        <section>
          <h2>9. Your rights</h2>
          <p>Subject to the legal requirements, you may request access, correction, deletion, restriction of processing and data portability, and you may object to processing based on legitimate interests. You may also lodge a complaint with a data-protection supervisory authority. Use the email address above to exercise these rights.</p>
        </section>

        <section>
          <h2>10. Changes</h2>
          <p>This notice will be updated before introducing advertising, user accounts, payments, additional analytics services or other services that process additional data.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="legal-page privacy-page" id="top">
      <a className="breadcrumb" href="/">← Zur Übersicht</a>
      <p className="section-label">Rechtliches</p>
      <h1>Datenschutzerklärung</h1>
      <p>Du kannst diesen Browser <a href="?page=datenschutz&analytics=off">von unserer Besuchsstatistik ausschließen</a> oder <a href="?page=datenschutz&analytics=on">wieder mitzählen lassen</a>. Dafür speichert Pollframe ausschließlich eine Ein-/Aus-Einstellung lokal; sie ist keine Kennung und wird nicht an unsere Zähler übertragen. Beim Löschen der Website-Daten entfällt die Einstellung. Cloudflares technische Anfragestatistik bleibt davon unberührt.</p>
      <p className="privacy-updated">Stand: 28. September 2026</p>

      <section>
        <h2>1. Verantwortlicher</h2>
        <address>
          Katharina O&apos;Connor<br />
          Kaiserallee 2b<br />
          23570 Lübeck<br />
          Deutschland
        </address>
        <p>E-Mail: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
      </section>

      <section>
        <h2>2. Hosting und Auslieferung</h2>
        <p>Pollframe wird über Cloudflare Workers mit Static Assets, einen Dienst der Cloudflare, Inc., ausgeliefert. Für die Auslieferung und Absicherung der Website verarbeitet Cloudflare technische Verbindungsdaten. Dazu können IP-Adresse, Zeitpunkt des Zugriffs, aufgerufene Datei, HTTP-Status, übertragene Datenmenge, Browser- und Geräteangaben sowie ein vom Browser übermittelter Referrer gehören.</p>
        <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unsere berechtigten Interessen sind eine zuverlässige Auslieferung, der Schutz vor Angriffen und die technische Fehlerdiagnose. Wir betreiben keine eigene Besucherdatenbank und werten rohe Zugriffsprotokolle nicht selbst aus.</p>
        <p>Cloudflare betreibt ein weltweites Netzwerk, sodass eine Verarbeitung auch außerhalb des Europäischen Wirtschaftsraums stattfinden kann. Die hierfür verwendeten Schutzmaßnahmen beschreibt Cloudflare in seinem <a href="https://www.cloudflare.com/cloudflare-customer-dpa/" target="_blank" rel="noreferrer">Auftragsverarbeitungszusatz</a> und seiner <a href="https://www.cloudflare.com/policies/privacy/" target="_blank" rel="noreferrer">Datenschutzerklärung</a>.</p>
        <p>Anfragelimits verwenden gesalzene IP-Hashwerte getrennt von der Statistik: Zeitfenster von 60 Sekunden am Netzwerkrand und 15 Minuten für Verwaltungszugriffe. Abgelaufene Zähler werden gelöscht.</p>
      </section>

      <section>
        <h2>3. App und auf deinem Gerät gespeicherte Informationen</h2>
        <p>Studio speichert außerdem gespeicherte Designs, wiederverwendbare Stile, importierte Dateien und bis zu 40 zuletzt geöffnete Vorlagen-IDs auf diesem Gerät. Die Vorlagenliste ermöglicht die Sortierung „Kürzlich angesehen“ und wird nicht an unsere Statistikzähler übermittelt. Diese lokalen Entwürfe sind keine geräteübergreifende Kontosicherung. Das Erklärvideo wird von Pollframe selbst ohne externen Videoplayer ausgeliefert.</p>
        <p>Pollframe speichert von dir gewählte Einstellungen – Sprache, Darstellung und Textgröße – sowie den zuletzt angezeigten Umfragestand im lokalen Speicher deines Browsers. Die Watchlist wird nur angeboten, wenn Pollframe als installierte App geöffnet ist. Ihre Einträge enthalten nur ausgewählte Parlamente und Parteien sowie die letzten Vergleichswerte; sie werden nicht an Pollframe übertragen und nicht zwischen Geräten synchronisiert. Ein nur für die laufende Sitzung gespeicherter Ausgangsstand hält Änderungen während der geöffneten App stabil und verfällt beim Ende der Browsersitzung oder spätestens nach 24 Stunden. Ein Service Worker und der Browser-Cache speichern die Anwendungsdateien und kompakten Übersichten für die Offline-Reserve. Wenn Pollframe als installierte App geöffnet wird, bereitet es zusätzlich die nationalen Umfragearchive für Deutschland, das Vereinigte Königreich und Spanien, die deutschen Länderreihen, spanische Regionaldaten, britische Wahlkreisergebnisse für die Offline-Nutzung vor. Im normalen Browser werden ausführliche Datensätze erst gespeichert, nachdem sie verwendet wurden.</p>
        <p>Wenn du Gerätehinweise aktiv einschaltest, fragt dein Browser nach der Benachrichtigungsberechtigung. Pollframe prüft Watchlist-Veränderungen, solange die App läuft. Bereits angezeigte Veränderungen werden lokal als gesehen vermerkt und lösen keinen verspäteten Systemhinweis aus. Ein lokaler Vermerk für bis zu 14 Tage verhindert doppelte Hinweise nach einem App-Neustart. Bei geschlossener App gibt es derzeit keine Push-Zustellung im Hintergrund. Auf einem Pollframe-Server wird weder ein Push-Abonnement noch ein Benachrichtigungs-Endpunkt gespeichert.</p>
        <p>Diese Dateien bleiben auf deinem Gerät, bis sie automatisch ersetzt werden oder du die App beziehungsweise die Websitedaten von Pollframe entfernst. Die gespeicherte Bibliothek wird nicht hochgeladen oder zu deiner Identifizierung verwendet. Beim Öffnen oder Teilen konfigurierter Studio-Links werden die Einstellungen und eigene Texte in der URL an Pollframe und beim Teilen an Empfänger übermittelt. Trage dort keine vertraulichen Informationen ein. Lokal importierte Bild- und Schriftdateien sind nicht in diesen URLs enthalten.</p>
      </section>

      <section>
        <h2>4. Cookies, Reichweitenmessung und Werbung</h2>
        <p>Für jeden Informationshinweis (Studio-Einführung oder Feedback-Einladung) zählen wir außerdem Einblendungen, ausdrückliches Schließen und Linkklicks getrennt als Tagessummen. Diese Handlungen werden keiner Person zugeordnet. Lokale Hinweis-Merkmale und eine Zeitbegrenzung verhindern wiederholte oder gleichzeitige Hinweise; diese funktionalen Werte werden niemals an die Statistik gesendet. Der Analyse-Widerspruch gilt auch für diese Zähler.</p>
        <p>Zusätzlich zählen wir einen qualifizierten Leseaufruf, wenn eine Seite mindestens 60 Sekunden sichtbar bleibt und eine vom Browser gemeldete Bedienhandlung stattfindet. Übermittelt wird nur der Zähler; Tasten, Zeigerpositionen und Handlungsfolgen werden nicht aufgezeichnet. Das ist ein Hinweis auf Nutzung, kein Nachweis eines menschlichen Besuchers oder einer Werbeeinblendung. Bekannte automatisierte Statistikmeldungen und ausdrücklich konfigurierte interne IP-Adressen werden vor der Speicherung ausgeschlossen; Verbindungsheader werden dafür nur kurzzeitig geprüft und nicht in den Statistikdatensatz übernommen. Unbekannte Browser und Aufrufe nur einer Seite gelten nicht automatisch als Bots.</p>
        <p>Pollframe verwendet Cloudflare Web Analytics von Cloudflare, Inc., um zusammengefasste Besuche und Seitenaufrufe zu messen und verweisende Websites, Länder, Geräte- und Browserkategorien, Ladezeiten sowie Core Web Vitals zu verstehen. Diese aggregierten Messwerte nutzen wir, um Reichweite, Bedienbarkeit und technische Leistung von Pollframe zu verbessern. Der Analyse-Beacon wird von <code>static.cloudflareinsights.com</code> geladen und übermittelt Messwerte an <code>cloudflareinsights.com</code>. Im gesonderten Journalisten-Embed wird er nicht geladen.</p>
        <p>Nach Angaben von Cloudflare verwendet Web Analytics weder Cookies noch lokalen Speicher, verfolgt keine einzelnen Personen über Websites hinweg und erhebt oder verwendet keine personenbezogenen Besucherdaten. URL-Abfrageparameter werden nicht protokolliert. Pollframe erhält keine IP-Adressen oder Kennungen, mit denen wir einzelne Besucher wiedererkennen könnten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unsere berechtigten Interessen sind eine datensparsame, aggregierte Reichweitenmessung und die Verbesserung der Website.</p>
        <p>Cloudflare bewahrt nicht hochgerechnete Beacon-Daten sieben Tage auf und speichert anschließend aggregierte Daten; Auswertungen stehen im Dashboard bis zu sechs Monate zur Verfügung. Einzelheiten beschreibt Cloudflare in seiner <a href="https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/" target="_blank" rel="noreferrer">Dokumentation zu Web Analytics</a>. Pollframe verwendet keine Werbenetzwerke, verkauft keine personenbezogenen Daten und trifft keine automatisierten Entscheidungen über Besucher.</p>
        <p>Pollframe betreibt außerdem einen bewusst begrenzten eigenen Zähler zur Produktverbesserung. Er zählt grobe Seitenbereiche – Länderübersichten, historische Umfragen, Karten, Problemthemen, Regierungszufriedenheit und Watchlist – sowie Installationshandlungen, Starts der installierten App, eine mindestens 60 Sekunden sichtbar geöffnete Seite und ausdrücklich ausgelöste Veröffentlichungsfunktionen wie das Öffnen von Teilen- oder PNG-Dialogen, das Kopieren eines Links, Embed-Codes oder Quellenhinweises und den Start eines PNG- oder CSV-Exports. Gespeichert werden ausschließlich die fest vorgegebene Ereignisart, ihre Summe und der UTC-Kalendertag in einem auf die EU beschränkten Cloudflare Durable Object. IP-Adresse, Browser- oder Geräteangaben, genaue Seitenadresse, Suchparameter, Referrer, Cookies, lokaler Speicher oder eine andere Kennung werden dort nicht gespeichert. Es entstehen keine Nutzerprofile und wiederkehrende Personen werden nicht erkannt. Die Zahlen zählen Handlungen und keine einzelnen Menschen; eine geöffnete iOS-Anleitung gilt nicht als Installation. Die täglichen Summen werden nach 400 Tagen gelöscht. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unsere berechtigten Interessen sind zu verstehen, welche Teile von Pollframe nützlich sind, die Funktion von Installation und Veröffentlichungswerkzeugen zu prüfen und den Dienst ohne Besucherprofile zu verbessern.</p>
      </section>

      <section>
        <h2>5. Eingebettete Grafiken und externe Links</h2>
        <p>Im Grafikstudio werden selbst gespeicherte Designs einschließlich eigener Texte und importierter Hintergrundbilder ausschließlich im Browser gespeichert, bis du sie oder die Websitedaten löschst. Die Bibliothek wird nicht hochgeladen; für geteilte Links gilt Abschnitt 3. Die Suche läuft lokal. Für die Sortierung „Beliebt“ zählt Pollframe ausgewählte öffentliche Vorlagen-IDs als Tagessummen für höchstens 31 Kalendertage; keine Suchbegriffe, Designinhalte, IP-Adressen oder Besucherkennungen werden in diesem Zähler gespeichert. Es sind Aufrufe, keine eindeutigen Personen. Der vorhandene Analyse-Widerspruch gilt auch hier. Rechtsgrundlage für diesen datensparsamen Zähler ist Art. 6 Abs. 1 lit. f DSGVO zur Verbesserung des Angebots. Studio-Schriftarten werden von Pollframe selbst geladen, nicht von einem externen Schriftanbieter.</p>
        <p>Pollframe-Embeds laden Diagramme und Karten direkt von Pollframe über Cloudflare. Sie enthalten keine Werbung und kein Drittanbieter-Tracking. Wenn du einem externen Quellen- oder Lizenzlink folgst, erhält der Zielanbieter die technisch zur Auslieferung seiner Website erforderlichen Daten und verarbeitet sie nach seiner eigenen Datenschutzerklärung.</p>
        <p>Die britische Wahlkreissuche übermittelt erst beim Klick auf „Suchen“ entweder nur den aus einer eingegebenen Adresse erkannten Postcode, ein Postcode-Gebiet oder den Ortsbegriff an Postcodes.io. Pollframe verwendet die Antwort zur Wahlkreisauswahl und speichert die Suche nicht. Postcodes.io erhält die für die Anfrage erforderlichen technischen Verbindungsdaten und verarbeitet sie nach seinen <a href="https://postcodes.io/about" target="_blank" rel="noreferrer">eigenen Angaben</a>. Wahlkreisnamen werden einschließlich der Tippfehlerkorrektur lokal im Browser abgeglichen. Für Nordirland wird keine Postleitzahlsuche angeboten.</p>
      </section>

      <section>
        <h2>6. Fehlermeldungen</h2>
        <p>Getrennte Missbrauchszähler mit gesalzten IP-Hashes: 60 Sekunden bei Cloudflare, 15 Minuten für Admin-Zugriffe. Abgelaufene Zähler werden gelöscht.</p>
        <p>Das getrennte Fehlerformular übermittelt die gewählte Fehlerart, die betroffene Seite, Sprache, Fenstergröße, die User-Agent-Angabe des Browsers und einen freiwilligen Hinweis an Pollframe. Name oder E-Mail-Adresse werden nicht abgefragt. Cloudflare verarbeitet technisch notwendig die in Abschnitt 2 beschriebenen Verbindungsdaten. Pollframe wandelt die IP-Adresse in einen einseitigen, mit einem geheimen Zusatz gesicherten Wert zur Begrenzung wiederholter Einsendungen um, verwendet ihn nur gegen automatisierten Missbrauch und löscht ihn nach dem einstündigen Begrenzungszeitraum.</p>
        <p>Fehlermeldungen werden in einem privaten Cloudflare Durable Object gespeichert und sind nur im passwortgeschützten Redaktions-Dashboard sichtbar. Wir verwenden sie, um technische, visuelle und Datenprobleme nachzustellen, zu priorisieren und zu beheben. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unsere berechtigten Interessen sind Qualitätssicherung und sicherer Betrieb. Meldungen werden gelöscht, sobald sie nicht mehr benötigt werden, spätestens jedoch automatisch nach zwölf Monaten. Bitte trage in das optionale Textfeld keine persönlichen oder sensiblen Informationen ein.</p>
      </section>

      <section>
        <h2>7. Kontakt per E-Mail</h2>
        <p>Der Kontaktassistent überträgt Eingaben nicht an Pollframe oder Cloudflare. Er erstellt lediglich eine vorbereitete E-Mail und fordert den Browser auf, das lokale E-Mail-Programm zu öffnen. Daten werden erst übertragen, wenn du die Nachricht dort absendest.</p>
        <p>Wenn du uns kontaktierst, werden deine Nachricht, deine E-Mail-Adresse und die von dir mitgeteilten Informationen zur Bearbeitung der Anfrage verarbeitet. Der E-Mail-Dienst wird über Apple iCloud Mail bereitgestellt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO, bei vorvertraglichen Anfragen Art. 6 Abs. 1 lit. b DSGVO. Nachrichten werden gelöscht, wenn die Anfrage abschließend erledigt ist, sofern keine gesetzlichen Aufbewahrungspflichten bestehen. Informationen von Apple stehen in dessen <a href="https://www.apple.com/legal/privacy/en-ww/" target="_blank" rel="noreferrer">Datenschutzerklärung</a>.</p>
      </section>

      <section>
        <h2>8. Speicherdauer und Empfänger</h2>
        <p>Lokale Einstellungen und App-Caches bleiben bestehen, bis sie automatisch ersetzt oder von dir entfernt werden. Fehlermeldungen werden wie in Abschnitt 6 beschrieben gespeichert. Kontaktanfragen werden nur so lange gespeichert, wie es für die Bearbeitung oder eine gesetzliche Pflicht erforderlich ist. Technische Sicherheitsdaten und aggregierte Web-Analytics-Daten bei Cloudflare werden wie oben beschrieben und nach den jeweils geltenden Richtlinien von Cloudflare gespeichert. Daten werden nur an die oben genannten Dienstleister weitergegeben, soweit dies erforderlich ist, oder wenn wir gesetzlich dazu verpflichtet sind.</p>
      </section>

      <section>
        <h2>9. Deine Rechte</h2>
        <p>Unter den gesetzlichen Voraussetzungen hast du Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit sowie ein Widerspruchsrecht gegen Verarbeitungen auf Grundlage berechtigter Interessen. Du kannst dich außerdem bei einer Datenschutzaufsichtsbehörde beschweren. Zur Ausübung deiner Rechte genügt eine Nachricht an die oben genannte E-Mail-Adresse.</p>
      </section>

      <section>
        <h2>10. Änderungen</h2>
        <p>Diese Erklärung wird vor der Einführung von Werbung, Benutzerkonten, Zahlungen, weiteren Analysediensten oder anderen Diensten aktualisiert, durch die zusätzliche Daten verarbeitet werden.</p>
      </section>
    </main>
  );
}
