import React, { useEffect, useRef, useState } from "react";
import { accountText } from "./account-copy.js";
import Dialog from "./studio-resource-dialog.jsx";
import { listDesigns } from "./studio-library.js";
import { listStyles, saveStyle } from "./studio-style-library.js";

async function api(path, body, method = body ? "POST" : "GET") {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/json", "X-Pollframe-Lab": "1" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => { throw Error("Der Kontodienst ist gerade nicht erreichbar. Bitte später erneut versuchen."); });
  if (!response.ok)
    throw Error(
      response.status === 429
        ? "Zu viele Versuche. Bitte eine Minute warten."
        : result.message || result.error || "Anfrage fehlgeschlagen.",
    );
  return result;
}

export default function AccountLab({ onClose, open, l, initialResetToken = "" }) {
  const text = value => accountText(l, value);
  const [localOnly, setLocalOnly] = useState(false);
  const [deleting,setDeleting] = useState(false);
  const requestBusy = useRef(false);
  const [user, setUser] = useState(null),
    [mode, setMode] = useState("login"),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [mail, setMail] = useState([]),
    [documents, setDocuments] = useState([]),
    [resetToken, setResetToken] = useState(initialResetToken),
    [email, setEmail] = useState(""),
    [showPassword, setShowPassword] = useState(false);
  const refresh = async () => {
    const session = await api("/api/auth/get-session");
    setUser(session?.user || null);
    setDocuments(
      session?.user ? (await api("/api/account/documents")).items : [],
    );
  };
  useEffect(() => {
    let active = true;
    api("/api/account/capabilities")
      .then(async (value) => {
        if (!(value.enabled || (value.localOnly && location.hostname === "127.0.0.1"))) throw Error("Accounts unavailable");
        if (active) {
          setLocalOnly(Boolean(value.localOnly));
          if(resetToken) {
            setMode("reset");
            const url=new URL(location.href);url.searchParams.delete("token");url.searchParams.delete("account");
            history.replaceState(history.state,"",url);
          }
          await refresh();
          if (active) setReady(true);
        }
      })
      .catch(() => {
        if (active)
          setStatus(
            text("Öffentliche Konten sind noch nicht freigeschaltet. Deine Designs bleiben weiterhin lokal verfügbar."),
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const run = async (task) => {
    if (requestBusy.current) return;
    requestBusy.current = true;
    setBusy(true);
    setStatus("");
    try {
      await task();
    } catch (error) {
      setStatus(error.name === "TimeoutError" || error.name === "AbortError" ? text("Der Kontodienst antwortet nicht rechtzeitig. Bitte noch einmal versuchen.") : error.message || text("Das hat nicht geklappt."));
    } finally {
      requestBusy.current = false;
      setBusy(false);
    }
  };
  const showMail = async () =>
    setMail((await api("/api/account/test-outbox", {})).items);
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget,
      values = new FormData(form);
    await run(async () => {
      const email = String(values.get("email") || "").trim(),
        password = String(values.get("password") || "");
      const callbackURL = location.origin + "/?view=studio";
      if (mode === "register") {
        await api("/api/auth/sign-up/email", {
          email,
          password,
          name: String(values.get("name") || "Pollframe"),
          callbackURL,
        });
        setMode("login");
        setStatus(
          localOnly ? text("Bitte die Testadresse über den lokalen Postausgang bestätigen. Es wird keine echte E-Mail verschickt.") : text("Bitte bestätige deine E-Mail-Adresse über den Link in deinem Posteingang, bevor du dich anmeldest."),
        );
        if(localOnly) await showMail();
      } else if (mode === "forgot") {
        await api("/api/auth/request-password-reset", {
          email,
          redirectTo: callbackURL + "&account=reset",
        });
        setStatus(
          localOnly ? text("Wenn dieses Testkonto existiert, liegt ein Link im lokalen Postausgang.") : text("Wenn ein Konto zu dieser Adresse existiert, erhältst du einen Link zum Zurücksetzen. Prüfe auch deinen Spamordner."),
        );
        if(localOnly) await showMail();
      } else if (mode === "reset") {
        await api("/api/auth/reset-password", {
          token: resetToken,
          newPassword: password,
        });
        setResetToken("");
        setMode("login");
        setStatus(text("Passwort geändert. Bestehende Sitzungen wurden widerrufen."));
      } else {
        await api("/api/auth/sign-in/email", { email, password });
        await refresh();
        setMail([]);
      }
      setShowPassword(false);
      form.reset();
    });
  }
  async function upload() {
    const [designs, styles] = await Promise.all([listDesigns(), listStyles()]);
    for (const [kind, items] of [
      ["design", designs],
      ["style", styles],
    ])
      for (const item of items) {
        await api(
          "/api/account/documents/" + encodeURIComponent(item.id),
          {
            kind,
            name: item.name,
            payload: kind === "style" ? item.style : item.state,
          },
          "PUT",
        );
      }
    await refresh();
    setStatus(
      l(`${designs.length} Designs und ${styles.length} Stile im Konto gesichert. Eigene Bild- und Schriftdateien bleiben auf diesem Gerät.`, `${designs.length} designs and ${styles.length} styles saved to your account. Imported images and fonts stay on this device.`, `${designs.length} diseños y ${styles.length} estilos guardados en tu cuenta. Las imágenes y tipografías importadas permanecen en este dispositivo.`),
    );
  }
  return (
    <Dialog className="studio-account-dialog" title={l("Dein Pollframe-Konto", "Your Pollframe account", "Tu cuenta de Pollframe")} l={l} onClose={onClose}>
      {localOnly ? <p className="studio-account-dev-note">
        {l("Lokale Entwicklung · Nutze eine erfundene .test-Adresse. E-Mails bleiben im Testpostausgang; es gibt keine Zahlungen.", "Local development · Use a fictional .test address. Emails stay in the test outbox; there are no payments.", "Desarrollo local · Usa una dirección ficticia terminada en .test. Los correos se quedan en la bandeja de prueba; no hay pagos.")}
      </p> : <p>{l("Speichere deine Designs und Stile für mehrere Geräte. Pollframe bleibt auch ohne Konto nutzbar.", "Save designs and styles across devices. You can still use Pollframe without an account.", "Guarda diseños y estilos para varios dispositivos. Puedes usar Pollframe sin una cuenta.")}</p>}
      {ready && !user && (
        <>
          <nav className="studio-editor-tabs" aria-label={text("Kontozugang")}>
            {[
              ["login", text("Anmelden")],
              ["register", text("Registrieren")],
              ["forgot", text("Passwort vergessen")],
            ].map(([key, label]) => (
              <button
                key={key}
                disabled={busy}
                aria-pressed={mode === key}
                onClick={() => {
                  setMode(key);
                  setShowPassword(false);
                  setStatus("");
                }}
              >
                {label}
              </button>
            ))}
          </nav>
          <form onSubmit={submit} className="studio-account-form">
            {mode === "register" && (
              <label>{text("Anzeigename")}<input
                  name="name"
                  maxLength={60}
                  autoComplete="nickname"
                  required
                />
              </label>
            )}
            {mode !== "reset" && (
              <label>
                {localOnly ? text("Test-E-Mail") : text("E-Mail")}
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  pattern={localOnly ? "[^\\s@]+@[^\\s@]+\\.test" : undefined}
                  title={localOnly ? text("Im lokalen Test nur erfundene Adressen mit .test verwenden.") : undefined}
                  placeholder={localOnly ? "name@example.test" : "name@example.com"}
                  required
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label>
                {mode === "reset" ? text("Neues Passwort") : text("Passwort")}
                <span className="studio-password-input"><input
                  aria-label={mode === "reset" ? text("Neues Passwort") : text("Passwort")}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={mode === "login" ? 1 : 15}
                  maxLength={128}
                  required
                />
                <button type="button" aria-pressed={showPassword} aria-label={showPassword ? text("Passwort verbergen") : text("Passwort anzeigen")} onClick={() => setShowPassword(value => !value)}>{showPassword ? text("Verbergen") : text("Anzeigen")}</button></span>
                <small>
                  {mode === "login" ? text("Passwortmanager und Einfügen sind möglich.") : text("Mindestens 15 Zeichen; Passwortmanager und Einfügen sind möglich.")}
                </small>
              </label>
            )}
            <button className="primary-button" disabled={busy}>
              {busy
                ? text("Bitte warten…")
                : {
                    login: text("Anmelden"),
                    register: localOnly ? text("Testkonto erstellen") : text("Konto erstellen"),
                    forgot: text("Link anfordern"),
                    reset: text("Passwort ändern"),
                  }[mode]}
            </button>
          </form>
          {localOnly && <button
            className="text-button"
            disabled={busy}
            onClick={() => run(showMail)}
          >{text("Lokalen Test-Postausgang öffnen")}</button>}
          <p className="studio-account-privacy"><a href="/datenschutz/" target="_blank" rel="noreferrer">{l("Datenschutz", "Privacy", "Privacidad")}</a> · {l("Keine Zahlungsdaten erforderlich.", "No payment details required.", "No se necesitan datos de pago.")}</p>
          {mode === "login" && <button type="button" className="text-button" disabled={busy || !email.includes('@')} onClick={() => run(async()=>{
            await api('/api/auth/send-verification-email',{email,callbackURL:location.origin+'/?view=studio'});
            setStatus(text("Falls eine Bestätigung erforderlich ist, wurde ein neuer Link angefordert."));
            if(localOnly)await showMail();
          })}>{text("Bestätigungslink erneut anfordern")}</button>}
        </>
      )}
      {user && (
        <>
          <p>{text("Angemeldet als")}<strong>{user.email}</strong>
          </p>
          <div className="studio-style-actions">
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => run(upload)}
            >{text("Lokale Designs und Stile im Konto sichern")}</button>
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api("/api/auth/sign-out", {});
                  setUser(null);
                  setDocuments([]);
                  setMail([]);
                  navigator.serviceWorker?.controller?.postMessage({
                    type: "POLLFRAME_LOGOUT",
                  });
                })
              }
            >{text("Abmelden")}</button>
          </div>
          <p>
            {l("Hochladen ist bewusst manuell. Vorhandene gleichnamige Dateien werden nur über ihre eigene ID aktualisiert; andere Konten bleiben getrennt. Beim Öffnen wird eine Arbeitskopie geladen, keine fremde Datei überschrieben.", "Uploads are manual. Existing files are updated by their own ID, not by matching names; other accounts remain separate. Opening a file loads a working copy without overwriting someone else's file.", "La subida es manual. Los archivos se actualizan por su identificador, no por coincidencia de nombre; las cuentas permanecen separadas. Al abrir un archivo se carga una copia de trabajo sin sobrescribir archivos de otras personas.")}
          </p>
          <ul className="studio-account-documents">
            {documents.map((item) => (
              <li key={item.id}>
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.kind === "style" ? text("Stil") : text("Design")} ·{" "}
                    {new Date(item.updatedAt).toLocaleString(l("de-DE", "en-GB", "es-ES"))}
                  </small>
                </span>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      if (item.kind === "style") {
                        await saveStyle(item.name, item.payload);
                        setStatus(text("Stil als neue lokale Kopie gespeichert."));
                      } else {
                        open({
                          name: item.name,
                          state: item.payload,
                          backgroundImage: "",
                          thumbnail: "",
                        });
                        onClose();
                      }
                    })
                  }
                >
                  {item.kind === "style" ? text("Lokal übernehmen") : text("Öffnen")}
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      if (
                        !window.confirm(
                          text("Nur diese Datei aus dem Konto löschen? Lokale Kopien bleiben erhalten."),
                        )
                      )
                        return;
                      await api(
                        "/api/account/documents/" + item.id,
                        null,
                        "DELETE",
                      );
                      await refresh();
                    })
                  }
                >{text("Löschen")}</button>
              </li>
            ))}
          </ul>
          {!documents.length && <p>{text("Noch keine Dateien in diesem Konto.")}</p>}
          <details className="studio-account-management"><summary>{text("Konto verwalten")}</summary>
            <button type="button" className="secondary-button" disabled={busy} onClick={() => {
              const url=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),profile:{email:user.email,name:user.name},documents},null,2)],{type:'application/json'}));
              const a=document.createElement('a');a.href=url;a.download='pollframe-konto.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
            }}>{text("Kontodaten herunterladen")}</button>
            <button type="button" className="text-button" disabled={busy} onClick={()=>setDeleting(!deleting)}>{text("Konto löschen…")}</button>
            {deleting && <form className="studio-account-form" onSubmit={event=>{
              event.preventDefault();const password=String(new FormData(event.currentTarget).get('confirmationPassword'));
              run(async()=>{await api('/api/auth/delete-user',{password});setUser(null);setDocuments([]);setMail([]);setDeleting(false);setStatus(text("Konto und gespeicherte Dateien gelöscht. Lokale Kopien auf deinem Gerät bleiben erhalten."));navigator.serviceWorker?.controller?.postMessage({type:'POLLFRAME_LOGOUT'});});
            }}>
              <p>{text("Dein Konto und seine gespeicherten Designs und Stile werden dauerhaft gelöscht. Dies lässt sich nicht rückgängig machen.")}</p>
              <label>{text("Mit deinem Passwort bestätigen")}<input name="confirmationPassword" type="password" autoComplete="current-password" required maxLength={128}/></label>
              <button type="submit" className="secondary-button" disabled={busy}>{text("Konto endgültig löschen")}</button>
            </form>}
          </details>
        </>
      )}
      {mail.length > 0 && (
        <details open>
          <summary>{text("Lokaler Test-Postausgang — keine echten E-Mails")}</summary>
          {mail
            .slice()
            .reverse()
            .filter(item => !email.trim() || item.to.toLowerCase() === email.trim().toLowerCase())
            .map((item) => (
              <p key={item.id}>
                {item.to} ·{" "}
                {item.kind === "verify"
                  ? text("Bestätigung")
                  : text("Passwort zurücksetzen")}{" "}
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      if (item.kind === "reset") {
                        setResetToken(
                          new URL(item.url).pathname.split("/").at(-1),
                        );
                        setMode("reset");
                        setMail([]);
                        setStatus(text("Neues Testpasswort eingeben."));
                      } else {
                        const url = new URL(item.url);
                        url.searchParams.set(
                          "callbackURL",
                          location.origin + "/?view=studio",
                        );
                        const response = await fetch(
                          url.pathname + url.search,
                          { credentials: "same-origin", cache: "no-store" },
                        );
                        if (
                          !response.ok ||
                          new URL(response.url).searchParams.has("error")
                        )
                          throw Error(
                            text("Bestätigungslink ungültig oder abgelaufen."),
                          );
                        setMode("login");
                        setMail([]);
                        setStatus(
                          text("Testadresse bestätigt. Du kannst dich anmelden."),
                        );
                      }
                    })
                  }
                >{text("Link verwenden")}</button>
              </p>
            ))}
        </details>
      )}
      {status && <p role="status">{text(status)}</p>}
    </Dialog>
  );
}
