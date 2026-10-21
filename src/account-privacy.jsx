import React from "react";

// Independent from Wahlframe: ordinary free accounts do not enable political
// questionnaire storage. Kept in the privacy page, not the startup bundle.
export default function AccountPrivacy({ locale = "de" }) {
  const l = (de, en, es) => (locale === "de" ? de : locale === "es" ? es : en);
  return (
    <section id="accounts" data-account-privacy>
      <h2>
        {l(
          "10. Freiwilliges Pollframe-Konto",
          "10. Optional Pollframe account",
          "10. Cuenta opcional de Pollframe",
        )}
      </h2>
      <p>
        {l(
          "Zum Speichern von Studio-Designs und Stilen brauchst du ein kostenloses Konto. Ansehen, Bearbeiten und Exportieren bleiben ohne Konto möglich. Wir speichern E-Mail-Adresse, optionalen Anzeigenamen, einen Passwort-Hash statt deines Passworts, Konten-Zeitstempel und die von dir gespeicherten Designeinstellungen, Namen und eigenen Texte. Importierte Bild- und Schriftdateien bleiben auf dem jeweiligen Gerät. Bis zu 100 Designs und Stile zusammen sind möglich. Konto-Dateien sind nicht öffentlich; berechtigte Administratoren können technisch darauf zugreifen. Es handelt sich nicht um Ende-zu-Ende-Verschlüsselung. Vertrauliche Informationen gehören nicht in eigene Texte. Persönliche Wahlframe-Ergebnisse sind eine getrennte, zusätzlich verschlüsselte Funktion und benötigen eine eigene ausdrückliche Einwilligung; einzelne Antworten werden auch dort nicht gespeichert. Abonnements, Werbemails und Zahlungen sind nicht Bestandteil des Kontos.",
          "Saving Studio designs and styles requires a free account. Viewing, editing and exporting remain available without one. We store your email address, optional display name, a password hash rather than your password, account timestamps, and the design settings, names and custom text you save. Imported images and font files stay on the respective device. You can store up to 100 designs and styles combined. Account files are not public; authorised administrators can technically access them. This is not end-to-end encryption. Do not include confidential information in custom text. Personal Wahlframe results are a separate, additionally encrypted feature and require separate explicit consent when enabled; individual answers are not stored there either. Subscriptions, marketing emails and payments are not included.",
          "Guardar diseños y estilos requiere una cuenta gratuita. Ver, editar y exportar sigue disponible sin cuenta. Guardamos el correo, nombre visible opcional, un hash de la contraseña, fechas de la cuenta y los ajustes, nombres y textos propios que guardes. Las imágenes y fuentes importadas permanecen en cada dispositivo. Puedes guardar hasta 100 diseños y estilos en total. Los archivos no son públicos; administradores autorizados pueden acceder técnicamente. No es cifrado de extremo a extremo. No incluyas información confidencial. Los resultados de Wahlframe son una función separada con cifrado adicional y requieren consentimiento expreso separado; tampoco se guardan respuestas individuales. No incluye suscripciones, correos comerciales ni pagos.",
        )}
      </p>
      <p>
        {l(
          "Wenn du Zwei-Faktor-Schutz aktivierst, speichern wir den verschlüsselten Authenticator-Schlüssel und verschlüsselte Notfallcodes sowie Sicherheitszähler. Notfallcodes gelten jeweils einmal; wir senden diese Geheimnisse nicht an einen QR-Dienst. Zum Vermeiden wiederholter Informationshinweise speichern wir in deinem Konto nur die Kennung und den Anzeigezeitpunkt des jeweiligen Hinweises. Das gilt geräteübergreifend und wird bei Kontolöschung entfernt. Klicks und Schließen dieser Hinweise werden nur als getrennte Summen ohne Konto-ID ausgewertet. Diese Hinweisspeicherung dient der angeforderten Kontofunktion, nicht Werbung oder einem Besuchsprofil.",
          "If you enable two-factor protection, we store the encrypted authenticator key, encrypted recovery codes and security counters. Each recovery code works once; these secrets are not sent to a QR-code service. To avoid repeated informational notices, your account stores only each notice’s identifier and the time it was shown. This works across devices and is removed with the account. Notice clicks and dismissals are counted separately as totals without account IDs. This notice storage supports the requested account function, not advertising or a browsing profile.",
          "Si activas la protección de dos factores, guardamos cifrados la clave del autenticador y los códigos de recuperación, además de contadores de seguridad. Cada código sirve una vez; no enviamos estos secretos a un servicio de QR. Para no repetir avisos informativos, la cuenta guarda solo su identificador y cuándo se mostraron. Se aplica entre dispositivos y se borra con la cuenta. Los clics y cierres se cuentan por separado como totales sin identificadores de cuenta. Este registro sirve a la función de cuenta solicitada, no a publicidad ni perfiles de navegación.",
        )}
      </p>
      <p>
        {l(
          "Rechtsgrundlage für Konto, Sicherung und notwendige Bestätigungs- und Rücksetz-Mails ist Art. 6 Abs. 1 lit. b DSGVO. Ohne E-Mail-Adresse ist kein Konto möglich. Zum Schutz vor Missbrauch verarbeiten wir außerdem IP-Adresse, Browserkennung und Sicherheitszähler (Art. 6 Abs. 1 lit. f DSGVO; berechtigtes Interesse: Schutz von Konten und Versanddienst). Diese Sicherheitsdaten werden nicht mit der Besuchsstatistik verbunden. Das technisch notwendige Secure-/HttpOnly-Anmelde-Cookie dient nur deiner Anmeldung (§ 25 Abs. 2 Nr. 2 TDDDG); es gilt sieben Tage und wird bei fortgesetzter Nutzung erneuert. Abmelden beendet die aktuelle Sitzung, ein Passwort-Reset alle bisherigen Sitzungen.",
          "GDPR Article 6(1)(b) is the legal basis for the account, saved files and necessary verification/reset emails. An email address is required to create an account. We also process IP addresses, browser information and security counters to prevent abuse (Article 6(1)(f); legitimate interest: protecting accounts and the mail service). These security records are not linked to visit analytics. The necessary Secure/HttpOnly sign-in cookie is used only for authentication (German TDDDG section 25(2)(2)). It lasts seven days and is renewed during continued use. Signing out ends the current session; resetting your password revokes all previous sessions.",
          "La base jurídica para la cuenta, los archivos y los correos necesarios de verificación y recuperación es el artículo 6.1.b del RGPD. El correo es necesario para crear una cuenta. También tratamos IP, información del navegador y contadores de seguridad para prevenir abusos (artículo 6.1.f; interés legítimo: proteger las cuentas y el servicio de correo). Estos registros no se vinculan a las estadísticas de visitas. La cookie necesaria Secure/HttpOnly solo sirve para autenticarte (artículo 25.2.2 de la TDDDG alemana). Dura siete días y se renueva con el uso continuado. Cerrar sesión termina la sesión actual; restablecer la contraseña revoca todas las anteriores.",
        )}
      </p>
      <p>
        {l(
          "Kontodaten liegen in Cloudflare D1 mit EU-Jurisdiktion; Auslieferung, Sicherheits- und Supportverarbeitung sind dadurch nicht vollständig auf die EU beschränkt. Bestätigungs- und Rücksetz-Mails versendet Resend (Plus Five Five, Inc.). Resend erhält Empfängeradresse und notwendigen Nachrichteninhalt, keine Designs oder Stile. Der Versand erfolgt aus Irland; gespeicherte Resend-Daten liegen laut Anbieter in den USA. Für Drittlandtransfers gelten die in den Auftragsverarbeitungsvereinbarungen beschriebenen Schutzmaßnahmen, insbesondere Standardvertragsklauseln. Der verschlüsselte Mailtransport ist verpflichtend; unsere Kontomails enthalten keine Marketinginhalte oder Trackingpixel.",
          "Account data is stored in Cloudflare D1 with EU jurisdiction; this does not restrict all delivery, security or support processing to the EU. Resend (Plus Five Five, Inc.) sends verification and reset emails. It receives the recipient address and necessary message content, not designs or styles. Emails are sent from Ireland; Resend states that its stored data is held in the USA. Transfers are subject to the safeguards in the providers’ data processing agreements, including Standard Contractual Clauses. Encrypted email transport is mandatory. Our account emails contain no marketing or tracking pixels.",
          "Los datos de cuenta se guardan en Cloudflare D1 con jurisdicción de la UE; eso no limita a la UE todas las operaciones de entrega, seguridad o soporte. Resend (Plus Five Five, Inc.) envía los correos de verificación y recuperación. Recibe el destinatario y el contenido necesario, no diseños ni estilos. El envío se realiza desde Irlanda; Resend indica que almacena sus datos en EE. UU. Las transferencias están sujetas a las garantías de los acuerdos de tratamiento, incluidas las cláusulas contractuales tipo. El transporte cifrado del correo es obligatorio. Nuestros correos de cuenta no contienen publicidad ni píxeles de seguimiento.",
        )}
      </p>
      <p>
        {l(
          "Kontodaten und gesicherte Dateien bleiben bis zu deiner Löschung gespeichert. Du kannst im Konto einzelne Dateien löschen, deine Kontodaten herunterladen oder das Konto samt zugehörigen Dateien löschen; lokale Kopien bleiben erhalten. Abgelaufene Sitzungen und Bestätigungen werden täglich bereinigt, ebenso Sicherheitszähler, die älter als einen Tag sind, und seit mehr als sieben Tagen unbestätigte Konten. Reine Mail-Summen werden nach 90 Tagen bereinigt. Resend bewahrt Mail- und Protokolldaten laut Anbieter 30 Tage auf. Cloudflare Time Travel bewahrt Datenbankstände tarifabhängig sieben Tage (Free) oder bis zu 30 Tage auf. Eine Löschung entfernt aktive Kontodaten, aber nicht sofort jeden älteren Sicherungsstand. Vor einer Wiederherstellung werden zwischenzeitliche Löschungen erneut berücksichtigt und Sitzungen widerrufen. Die oben genannten Datenschutzrechte und die Kontaktadresse gelten auch für Konten.",
          "Account data and saved files remain until you delete them. In your account you can delete individual files, download your account data, or delete the account and its associated files; local copies remain independent. Expired sessions and verification records are cleaned up daily, as are security counters older than one day and accounts unverified for more than seven days. Mail-count totals are cleaned up after 90 days. Resend states 30-day retention for email and log data. Depending on the plan, Cloudflare Time Travel retains database history for seven days (Free) or up to 30 days. Deletion removes active account data, not immediately every older backup. Restores must reconcile subsequent deletions and revoke restored sessions before reopening. The rights and contact details above also apply to accounts.",
          "Los datos y archivos se conservan hasta que los elimines. Desde tu cuenta puedes eliminar archivos, descargar tus datos o borrar la cuenta y sus archivos; las copias locales siguen independientes. Se limpian diariamente las sesiones y verificaciones caducadas, los contadores de seguridad de más de un día y las cuentas sin verificar durante más de siete días. Los totales de correos se limpian tras 90 días. Resend indica 30 días de conservación de correos y registros. Según el plan, Cloudflare Time Travel conserva el historial de la base de datos siete días (Free) o hasta 30 días. La eliminación borra los datos activos, pero no inmediatamente todas las copias antiguas. Antes de reabrir tras una restauración se deben aplicar de nuevo las eliminaciones posteriores y revocar las sesiones restauradas. Los derechos y datos de contacto anteriores también se aplican a las cuentas.",
        )}
      </p>
      <p>
        <a href="https://resend.com/legal/dpa" target="_blank" rel="noreferrer">
          Resend · DPA
        </a>
        {" · "}
        <a href="https://resend.com/security" target="_blank" rel="noreferrer">
          Resend ·{" "}
          {l(
            "Datenschutz und Aufbewahrung",
            "privacy and retention",
            "privacidad y conservación",
          )}
        </a>
        {" · "}
        <a
          href="https://www.cloudflare.com/cloudflare-customer-dpa/"
          target="_blank"
          rel="noreferrer"
        >
          Cloudflare · DPA
        </a>
        {" · "}
        <a
          href="https://developers.cloudflare.com/d1/reference/time-travel/"
          target="_blank"
          rel="noreferrer"
        >
          Cloudflare · {l("Sicherungen", "backups", "copias de seguridad")}
        </a>
      </p>
    </section>
  );
}
