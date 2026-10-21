import React, { useEffect, useState } from "react";
import {
  listLegacyPrivateResults,
  openResultStudio,
} from "./party-match-storage.js";
import {
  RESULT_CONSENT_VERSION,
  resultStorageConsentText,
} from "./account-storage-policy.js";
import StudioSelect from "./studio-select.jsx";

// This panel is deliberately separate from the ordinary design/style upload.
// Mounting it does not fetch or upload any personal result until expanded.
export default function AccountPrivateResults({
  api,
  l,
  run,
  busy,
  onClose,
  consentVersion,
}) {
  const [expanded, setExpanded] = useState(false),
    [loaded, setLoaded] = useState(false);
  const [local, setLocal] = useState([]),
    [cloud, setCloud] = useState([]);
  const [selected, setSelected] = useState(""),
    [consent, setConsent] = useState(false);
  const refresh = async () => {
    const [device, saved] = await Promise.all([
      listLegacyPrivateResults(),
      api("/api/account/private-results"),
    ]);
    setLocal(device);
    setCloud(saved.items);
    setLoaded(true);
  };
  useEffect(() => {
    if (expanded && !loaded) run(refresh);
  }, [expanded, loaded]);
  const current = local.find((row) => row.id === selected);
  return (
    <details
      className="studio-account-management account-private-results"
      onToggle={(event) => {
        if (event.target === event.currentTarget)
          setExpanded(event.currentTarget.open);
      }}
    >
      <summary>
        {l(
          "Persönliche Ergebnisse im Konto",
          "Personal results in your account",
          "Resultados personales en tu cuenta",
        )}
      </summary>
      <p>
        {l(
          "Optional: Diese Ergebnisse können politische Ansichten erkennen lassen. Sie werden getrennt von normalen Designs verschlüsselt gespeichert, nicht für Werbung oder Besuchsstatistiken verwendet und nicht öffentlich geteilt. Keine Ende-zu-Ende-Verschlüsselung: berechtigte Administratoren können technisch zugreifen. Einzelne Antworten werden nicht hochgeladen.",
          "Optional: these results can reveal political opinions. They are stored encrypted, separately from ordinary designs, never used for advertising or visit statistics, and not shared publicly. This is not end-to-end encryption: authorised administrators can technically access them. Individual answers are not uploaded.",
          "Opcional: estos resultados pueden revelar opiniones políticas. Se guardan cifrados, separados de los diseños normales, no se usan para publicidad ni estadísticas de visitas y no se comparten públicamente. No es cifrado de extremo a extremo: los administradores autorizados pueden acceder técnicamente. No se suben respuestas individuales.",
        )}
      </p>
      {loaded && (
        <>
          <label>
            {l(
              "Ältere lokale Kopie übernehmen (optional)",
              "Import an older device copy (optional)",
              "Importar una copia local anterior (opcional)",
            )}
            <StudioSelect
              value={selected}
              disabled={busy}
              onChange={(e) => {
                setSelected(e.target.value);
                setConsent(false);
              }}
            >
              <option value="">
                {l(
                  "Ergebnis auswählen",
                  "Choose a result",
                  "Elige un resultado",
                )}
              </option>
              {local.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </StudioSelect>
          </label>
          {!local.length && (
            <p>
              {l(
                "Keine älteren lokalen Kopien gefunden. Neue Ergebnisse speicherst du direkt aus Wahlframe im Konto.",
                "No older device copies found. Save new results directly to your account from Wahlframe.",
                "No hay copias locales anteriores. Guarda los nuevos resultados directamente desde Wahlframe en tu cuenta.",
              )}
            </p>
          )}
          <label className="account-private-consent">
            <input
              type="checkbox"
              checked={consent}
              disabled={!current || busy}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>{resultStorageConsentText(locale)}</span>
          </label>
          <button
            className="secondary-button"
            disabled={
              busy ||
              !current ||
              !consent ||
              consentVersion !== RESULT_CONSENT_VERSION
            }
            onClick={() =>
              run(async () => {
                await api(
                  `/api/account/private-results/${encodeURIComponent(current.id)}`,
                  {
                    name: current.name,
                    payload: {
                      document: current.document,
                      design: current.design,
                    },
                    consent: {
                      accepted: true,
                      age16Confirmed: true,
                      version: RESULT_CONSENT_VERSION,
                    },
                  },
                  "PUT",
                );
                setConsent(false);
                await refresh();
              })
            }
          >
            {l(
              "Nur dieses Ergebnis im Konto sichern",
              "Save only this result to my account",
              "Guardar solo este resultado en mi cuenta",
            )}
          </button>
          <ul className="studio-account-documents">
            {cloud.map((row) => (
              <li key={row.id}>
                <span>
                  <strong>{row.name}</strong>
                  <small>
                    {l(
                      "Persönliches Ergebnis",
                      "Personal result",
                      "Resultado personal",
                    )}{" "}
                    ·{" "}
                    {new Date(row.updatedAt).toLocaleDateString(
                      l("de-DE", "en-GB", "es-ES"),
                    )}
                  </small>
                </span>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => {
                    openResultStudio(
                      row.payload.document,
                      row.payload.design,
                      null,
                      row.name,
                    );
                    onClose();
                  }}
                >
                  {l("Öffnen", "Open", "Abrir")}
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      if (
                        !window.confirm(
                          l(
                            "Dieses Ergebnis aus dem Konto löschen? Lokale Kopien bleiben erhalten.",
                            "Delete this result from your account? Local copies remain.",
                            "¿Eliminar este resultado de tu cuenta? Las copias locales se conservan.",
                          ),
                        )
                      )
                        return;
                      await api(
                        `/api/account/private-results/${encodeURIComponent(row.id)}`,
                        null,
                        "DELETE",
                      );
                      await refresh();
                    })
                  }
                >
                  {l("Löschen", "Delete", "Eliminar")}
                </button>
              </li>
            ))}
          </ul>
          {!cloud.length && (
            <p>
              {l(
                "Keine persönlichen Ergebnisse im Konto.",
                "No personal results in your account.",
                "No hay resultados personales en tu cuenta.",
              )}
            </p>
          )}
          <p>
            {l(
              "Maximal 30 Ergebnisse pro Konto. Speicherung bis zum Löschen des Ergebnisses oder Kontos; Sicherungskopien unterliegen gesonderten Löschfristen. Eigene Antworten bleiben im geöffneten Tab und sind nicht zur späteren Bearbeitung im Konto gespeichert.",
              "Up to 30 results per account, stored until you delete the result or account; backups have separate deletion periods. Individual answers stay in the open tab and are not saved to your account for later editing.",
              "Hasta 30 resultados por cuenta, guardados hasta eliminar el resultado o la cuenta; las copias de seguridad tienen plazos de borrado separados. Las respuestas individuales permanecen en la pestaña abierta y no se guardan para editarlas después.",
            )}
          </p>
          <a href="/datenschutz/" target="_blank" rel="noreferrer">
            {l("Datenschutz", "Privacy", "Privacidad")}
          </a>
        </>
      )}
      <button
        className="text-button"
        disabled={busy}
        onClick={() =>
          run(async () => {
            if (
              !window.confirm(
                l(
                  "Zustimmung widerrufen und alle persönlichen Ergebnisse aus dem Konto löschen? Lokale Kopien bleiben erhalten.",
                  "Withdraw consent and delete all personal results from your account? Local copies remain.",
                  "¿Retirar el consentimiento y eliminar todos los resultados personales de tu cuenta? Las copias locales se conservan.",
                ),
              )
            )
              return;
            await api("/api/account/private-results", null, "DELETE");
            setCloud([]);
            setConsent(false);
          })
        }
      >
        {l(
          "Zustimmung widerrufen & alle Konto-Ergebnisse löschen",
          "Withdraw consent & delete all account results",
          "Retirar consentimiento y eliminar todos los resultados de la cuenta",
        )}
      </button>
    </details>
  );
}
