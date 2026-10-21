import React, { useEffect, useRef, useState } from "react";
import { MatchDialog } from "./party-match-export.jsx";
import { MATCH_COPY } from "./party-match-copy.js";
import { localText } from "./party-match-text.js";
import { requireAccount, accountRequest } from "./account-client.js";
import { savePrivateResult } from "./party-match-storage.js";
import { resultStorageConsentText } from "./account-storage-policy.js";

// One save workflow for results (including phones) and Studio. Authenticate
// first: never stack a sign-in dialog over the sensitive consent dialog.
export default function ResultSave({
  documentRecord,
  design = {},
  locale,
  id = null,
  name = "",
  onSaved,
}) {
  const c = (k) => localText(MATCH_COPY[k], locale),
    l = (de, en, es) => (locale === "de" ? de : locale === "es" ? es : en);
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [consent, setConsent] = useState(false),
    [title, setTitle] = useState(name || "Wahlframe"),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const pendingAuth = useRef(false),
    active = useRef(true),
    recordId = useRef(id),
    trigger = useRef(null),
    requesting = useRef(false),
    generation = useRef(0),
    owner = useRef(null);
  useEffect(() => {
    if (recordId.current !== id) {
      recordId.current = id;
      setTitle(name || "Wahlframe");
      setConsent(false);
      setOpen(false);
      setSaved(false);
    }
  }, [id]);
  async function begin() {
    if (requesting.current) return;
    requesting.current = true;
    setError("");
    try {
      const epoch = generation.current;
      const user = await requireAccount();
      const capabilities = await accountRequest("/api/account/capabilities");
      if (!active.current || epoch !== generation.current) return;
      owner.current = user.id;
      if (!capabilities.privateResults) {
        setError(
          l(
            "Ergebnisspeicherung ist noch nicht freigeschaltet. Vergleichen und Exportieren funktionieren weiterhin.",
            "Result storage is not enabled yet. Comparing and exporting still work.",
            "Aún no se ha activado el almacenamiento de resultados. Puedes comparar y exportar.",
          ),
        );
        return;
      }
      pendingAuth.current = false;
      setConsent(false);
      setSaved(false);
      setOpen(true);
    } catch (e) {
      if (e.code === "ACCOUNT_REQUIRED") pendingAuth.current = true;
      else if (active.current)
        setError(
          l(
            "Das Konto ist gerade nicht erreichbar. Bitte erneut versuchen.",
            "Your account is temporarily unavailable. Please try again.",
            "La cuenta no está disponible ahora. Inténtalo de nuevo.",
          ),
        );
    } finally {
      requesting.current = false;
    }
  }
  useEffect(() => {
    active.current = true;
    const change = (e) => {
      if (
        e.detail?.remote ||
        e.detail?.signedIn === false ||
        (owner.current && e.detail?.userId && e.detail.userId !== owner.current)
      ) {
        generation.current++;
        setOpen(false);
        setConsent(false);
        recordId.current = null;
        setSaved(false);
        owner.current = null;
      }
    };
    const closed = async () => {
      if (!pendingAuth.current) return;
      pendingAuth.current = false;
      try {
        const session = await accountRequest("/api/auth/get-session");
        if (active.current && session?.user?.emailVerified) await begin();
      } catch {
        /* Closing or cancelling sign-in never forces it open again. */
      }
    };
    window.addEventListener("pollframe-account-changed", change);
    window.addEventListener("pollframe-account-dialog-closed", closed);
    return () => {
      active.current = false;
      generation.current++;
      window.removeEventListener("pollframe-account-changed", change);
      window.removeEventListener("pollframe-account-dialog-closed", closed);
    };
  }, [locale]);
  async function save() {
    if (busy || !consent) return;
    setBusy(true);
    setError("");
    const started = generation.current;
    try {
      const record = await savePrivateResult(
        title,
        documentRecord,
        design,
        recordId.current,
        true,
      );
      if (!active.current || started !== generation.current) return;
      recordId.current = record.id;
      setOpen(false);
      setConsent(false);
      setSaved(true);
      onSaved?.(record);
    } catch {
      if (active.current && started === generation.current)
        setError(
          l(
            "Speichern nicht möglich. Prüfe deine Anmeldung und Verbindung.",
            "Could not save. Check your sign-in and connection.",
            "No se pudo guardar. Comprueba tu sesión y conexión.",
          ),
        );
    } finally {
      if (active.current) setBusy(false);
    }
  }
  return (
    <div className="pm-result-save">
      <button
        ref={trigger}
        type="button"
        className="pm-secondary"
        onClick={begin}
      >
        {c("savePrivate")}
      </button>
      {saved && (
        <p role="status" className="pm-small">
          {c("savedPrivate")}
        </p>
      )}
      {error && !open && (
        <p role="status" className="pm-small">
          {error}
        </p>
      )}
      {open && (
        <MatchDialog
          title={c("savePrivate")}
          closeLabel={c("close")}
          onClose={() => {
            if (!busy) {
              setOpen(false);
              setConsent(false);
            }
          }}
          returnFocus={trigger.current}
        >
          <p>{c("savePrivacy")}</p>
          <label className="pm-control-toggle">
            <input
              type="checkbox"
              checked={consent}
              disabled={busy}
              onChange={(e) => setConsent(e.target.checked)}
            />
            {resultStorageConsentText(locale)}
          </label>
          <label className="pm-save-name">
            {c("designName")}
            <input
              maxLength={80}
              value={title}
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button
            type="button"
            className="pm-primary"
            disabled={busy || !consent}
            onClick={save}
          >
            {c("savePrivate")}
          </button>
        </MatchDialog>
      )}
    </div>
  );
}
