// Versioned separately from the optional browser-only storage permission.
export const RESULT_CONSENT_VERSION = "private-results-2026-10-20-age16";
// No date of birth or identity document is collected. This attestation applies
// only to political-result cloud storage, not browsing, answering or export.
export function resultStorageConsentText(locale) {
  return locale === "de"
    ? "Ich bin mindestens 16 Jahre alt und willige ausdrücklich ein, dieses politische Ergebnis und seine Gestaltung für den Zugriff auf meinen Geräten in meinem Konto zu speichern. Durch Löschen kann ich die Einwilligung jederzeit widerrufen."
    : locale === "es"
      ? "Tengo al menos 16 años y consiento expresamente guardar este resultado político y su diseño en mi cuenta para acceder desde mis dispositivos. Puedo retirar el consentimiento en cualquier momento eliminándolo."
      : "I am at least 16 and explicitly consent to storing this political result and its design in my account for access across my devices. I can withdraw consent at any time by deleting it.";
}
