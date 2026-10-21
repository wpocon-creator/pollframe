import React from "react";
import { MATCH_COPY } from "./party-match-copy.js";
import { localText } from "./party-match-text.js";
import { SPECTRUM_COPY } from "./party-match-spectrum.js";

// Shared by the development preview and the explicitly opted-in release.
// Do not ship historical setup notes or claim that enabled accounts are a lab.
export default function PartyMatchLegal({ locale = "de", privacy = false }) {
  const c = (key) => localText(MATCH_COPY[key], locale),
    l = (de, en, es) => (locale === "de" ? de : locale === "es" ? es : en);
  return (
    <section data-party-match-legal>
      <h2>
        Wahlframe ·{" "}
        {l(
          privacy ? "Datenschutz" : "Quellen und Methode",
          privacy ? "Privacy" : "Sources and method",
          privacy ? "Privacidad" : "Fuentes y método",
        )}
      </h2>
      {privacy ? (
        <>
          <p>{c("privacy")}</p>
          <p>{c("savePrivacy")}</p>
          <p>
            {l(
              "Für diese Kontospeicherung musst du mindestens 16 Jahre alt sein und ausdrücklich zustimmen. Die Bestätigung wird zusammen mit Version und Zeitpunkt der Einwilligung verschlüsselt gespeichert, nicht dein Geburtsdatum oder ein Ausweis. Für unter 16-Jährige bieten wir derzeit keine elternbestätigte Ergebnisspeicherung an. Antworten, Vergleichen und Exportieren funktionieren auch ohne diese Speicherung.",
              "This account storage requires you to be at least 16 and give explicit consent. The confirmation is stored encrypted with the consent version and timestamp, not a date of birth or identity document. We do not currently offer parent-authorised result storage for under-16s. Answering, comparing and exporting work without this storage.",
              "Para guardar estos resultados en la cuenta debes tener al menos 16 años y consentir expresamente. La confirmación se guarda cifrada con la versión y fecha del consentimiento, no la fecha de nacimiento ni un documento de identidad. Actualmente no ofrecemos almacenamiento autorizado por los padres para menores de 16. Responder, comparar y exportar funciona sin este almacenamiento.",
            )}
          </p>
          <p>
            {l(
              "Die gesonderte Speicherung politischer Ergebnisse erfolgt für deinen freiwillig angeforderten geräteübergreifenden Abruf auf Grundlage deiner ausdrücklichen Einwilligung (Art. 6 Abs. 1 lit. a und Art. 9 Abs. 2 lit. a DSGVO). Sie ist nicht für Werbung, den Handel mit Profilen oder Besuchsstatistiken bestimmt.",
              "Separate political-result storage serves your voluntarily requested access across devices, based on explicit consent (GDPR Articles 6(1)(a) and 9(2)(a)). It is not used for advertising, profile trading or visit analytics.",
              "Los resultados políticos se guardan por separado para el acceso entre dispositivos que solicitas voluntariamente, con consentimiento expreso (artículos 6.1.a y 9.2.a del RGPD). No se usan para publicidad, compraventa de perfiles ni estadísticas de visitas.",
            )}
          </p>
          <p>
            {l(
              "Kontospeicherung ist freiwillig und nur bei freigeschalteter Funktion möglich. Ohne Einwilligung kannst du weiter antworten, vergleichen, gestalten und exportieren. Die Einwilligung gilt getrennt vom normalen Konto: gespeichert werden Ergebniswerte, Themen- und Profilwerte, berechnete Vergleiche, Belegabdeckung, die gewählte Ausgabe und Gestaltung. Einzelne Antworten bleiben im Tab. Löschen eines gespeicherten Ergebnisses widerruft dessen weitere Speicherung; eigene Downloads bleiben unabhängig. Die Verarbeitung von Konto-, Sicherheits- und Versanddaten sowie Sicherungs- und Löschfristen sind im Abschnitt zu Konten beschrieben.",
              "Account storage is optional and available only when enabled. Without consent you can still answer, compare, design and export. Consent is separate from an ordinary account: saved summaries contain result, topic and profile scores, calculated comparisons, evidence coverage, edition and design. Individual answers stay in the tab. Deleting a saved result withdraws consent to its continued storage; your own downloads remain independent. Account, security and mail processing, backup and deletion periods are explained in the account section.",
              "El almacenamiento es voluntario y solo está disponible cuando se activa. Sin consentir puedes responder, comparar, diseñar y exportar. El consentimiento es separado de la cuenta: se guardan puntuaciones, valores temáticos y de perfil, comparaciones, cobertura, edición y diseño. Las respuestas individuales permanecen en la pestaña. Borrar un resultado retira el consentimiento para conservarlo; tus descargas son independientes. El tratamiento de cuenta, seguridad y correo y los plazos de copias y borrado se explican en el apartado de cuentas.",
            )}
          </p>
          <p>
            {l(
              "Die automatisierte Besuchsstatistik ist für Wahlframe und den persönlichen Ergebnis-Editor ausgeschlossen. Antworten und Ergebnisse sind kein Bestandteil von Analyse-Ereignissen, E-Mails oder öffentlichen Links. Die technische Auslieferung der Website durch den Hostinganbieter ist davon zu unterscheiden. Exportdateien entstehen auf deinem Gerät; Pollframe erhält dadurch keine Kopie. Externe Quellen öffnen erst auf deinen Klick und unterliegen dann den Regeln ihres Anbieters.",
              "Automated visit analytics exclude Wahlframe and the personal-results editor. Answers and results are not included in analytics events, emails or public links. Technical website delivery by the hosting provider is a separate process. Export files are created on your device; exporting does not send Pollframe a copy. External sources open only when clicked and their providers’ rules then apply.",
              "Las estadísticas automáticas excluyen Wahlframe y el editor de resultados personales. Respuestas y resultados no se incluyen en eventos analíticos, correos ni enlaces públicos. La entrega técnica del sitio por el alojamiento es un proceso distinto. Los archivos se crean en tu dispositivo; exportarlos no envía una copia a Pollframe. Las fuentes externas se abren solo al pulsarlas y se aplican las reglas de su proveedor.",
            )}
          </p>
        </>
      ) : (
        <>
          <p>
            {c("scope")}. {c("edition")}
          </p>
          <p>{c("methodology")}</p>
          <p>{c("formula")}</p>
          <p>{localText(SPECTRUM_COPY.info, locale)}</p>
          <p>{c("ai")}</p>
          <p>
            {l(
              "Die Texte sind eigene Zusammenfassungen, keine übernommenen Antwortdaten des Wahl-O-Mat. Wir verlinken die Originalprogramme und ergänzende amtliche beziehungsweise offizielle Parteiquellen; PDF-Seiten zählen ab dem Deckblatt. Ergebnis und Quellen lassen sich in Studio nicht verändern. Für einen Korrekturhinweis nenne bitte Frage, Partei und Originalquelle über den Kontaktweg; deine persönlichen Antworten werden nicht automatisch angehängt.",
              "These are our own summaries, not copied Wahl-O-Mat response data. We link original programmes and supplementary parliamentary or official party sources; PDF pages count from the cover. Result values and sources cannot be edited in Studio. To request a correction, identify the question, party and original source via Contact; personal answers are not automatically attached.",
              "Son resúmenes propios, no respuestas copiadas de Wahl-O-Mat. Enlazamos programas originales y fuentes parlamentarias u oficiales de partidos; las páginas PDF cuentan desde la portada. Studio no permite modificar resultados ni fuentes. Para corregir algo, indica pregunta, partido y fuente original mediante Contacto; no se adjuntan automáticamente respuestas personales.",
            )}
          </p>
        </>
      )}
    </section>
  );
}
