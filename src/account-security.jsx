import React, { useEffect, useState } from "react";
import NewPassword from "./account-password.jsx";

export default function AccountSecurity({ user, api, run, busy, refresh, l }) {
  const [enrollment, setEnrollment] = useState(null),
    [qr, setQr] = useState(""),
    [codes, setCodes] = useState([]),
    [sessions, setSessions] = useState([]),
    [newPasswordAccepted, setNewPasswordAccepted] = useState(false),
    [passwordOpen, setPasswordOpen] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    api("/api/account/sessions")
      .then((result) => {
        if (active) setSessions(result.items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user.id]);
  useEffect(() => {
    let active = true;
    setQr("");
    if (enrollment?.totpURI)
      import("qrcode")
        .then((q) =>
          (q.default || q).toDataURL(enrollment.totpURI, {
            width: 240,
            margin: 2,
            errorCorrectionLevel: "M",
          }),
        )
        .then((value) => {
          if (active) setQr(value);
        })
        .catch(() => {
          if (active)
            setMessage(
              l(
                "QR-Code konnte nicht erstellt werden. Du kannst den Einrichtungsschlüssel unten verwenden.",
                "Could not create the QR code. You can use the setup key below.",
                "No se pudo crear el QR. Puedes usar la clave de configuración de abajo.",
              ),
            );
        });
    return () => {
      active = false;
    };
  }, [enrollment]);
  const submit = (task) => (event) => {
    event.preventDefault();
    const form = event.currentTarget,
      data = Object.fromEntries(new FormData(form));
    run(async () => {
      await task(data);
      form.reset();
    });
  };
  const factor = () => user.twoFactorEnabled && <FactorInput l={l} />;
  const password = () => (
    <label>
      {l("Aktuelles Passwort", "Current password", "Contraseña actual")}
      <input
        name="password"
        type="password"
        autoComplete="current-password"
        required
        maxLength={128}
      />
    </label>
  );
  const reloadSessions = async () =>
    setSessions((await api("/api/account/sessions")).items);
  return (
    <section
      className="account-security"
      aria-label={l(
        "Kontoeinstellungen",
        "Account settings",
        "Ajustes de cuenta",
      )}
    >
      <h3>
        {l("Kontoeinstellungen", "Account settings", "Ajustes de cuenta")}
      </h3>
      {message && <p role="status">{message}</p>}
      <details name="account-settings">
        <summary>
          {l("Profil & E-Mail", "Profile & email", "Perfil y correo")}
        </summary>
        <form
          className="studio-account-form"
          onSubmit={submit(async ({ name }) => {
            await api("/api/auth/update-user", { name: name.trim() });
            await refresh();
            setMessage(
              l(
                "Profil aktualisiert.",
                "Profile updated.",
                "Perfil actualizado.",
              ),
            );
          })}
        >
          <label>
            {l("Anzeigename", "Display name", "Nombre visible")}
            <input
              name="name"
              defaultValue={user.name}
              maxLength={80}
              required
              autoComplete="nickname"
            />
          </label>
          <button className="secondary-button" disabled={busy}>
            {l("Namen speichern", "Save name", "Guardar nombre")}
          </button>
        </form>
        <p>{user.email}</p>
        <form
          className="studio-account-form"
          onSubmit={submit(async ({ newEmail, factorCode, recoveryCode }) => {
            await api("/api/auth/change-email", {
              newEmail,
              factorCode,
              recoveryCode,
              callbackURL: location.origin + "/?account=sign-in",
            });
            setMessage(
              l(
                "Bestätige die Änderung zuerst im bisherigen Postfach und anschließend an der neuen Adresse.",
                "Confirm the change in your current inbox first, then verify the new address.",
                "Confirma primero en tu buzón actual y después verifica la nueva dirección.",
              ),
            );
          })}
        >
          <label>
            {l("Neue E-Mail-Adresse", "New email address", "Nuevo correo")}
            <input
              type="email"
              name="newEmail"
              required
              maxLength={254}
              autoComplete="email"
            />
          </label>
          {factor()}
          <button className="secondary-button" disabled={busy}>
            {l("E-Mail ändern", "Change email", "Cambiar correo")}
          </button>
        </form>
      </details>
      <details
        name="account-settings"
        onToggle={(e) => setPasswordOpen(e.currentTarget.open)}
      >
        <summary>
          {l("Passwort ändern", "Change password", "Cambiar contraseña")}
        </summary>
        {passwordOpen && (
          <form
            className="studio-account-form"
            onSubmit={submit(
              async ({ password, newPassword, factorCode, recoveryCode }) => {
                await api("/api/auth/change-password", {
                  currentPassword: password,
                  newPassword,
                  revokeOtherSessions: true,
                  factorCode,
                  recoveryCode,
                });
                await refresh();
                await reloadSessions();
                setMessage(
                  l(
                    "Passwort geändert. Andere Sitzungen wurden abgemeldet.",
                    "Password changed. Other sessions were signed out.",
                    "Contraseña cambiada. Las demás sesiones se han cerrado.",
                  ),
                );
              },
            )}
          >
            {password()}
            <NewPassword
              l={l}
              email={user.email}
              name="newPassword"
              onValidityChange={setNewPasswordAccepted}
              label={l("Neues Passwort", "New password", "Nueva contraseña")}
            />
            {factor()}
            <button
              className="secondary-button"
              disabled={busy || !newPasswordAccepted}
            >
              {l("Passwort ändern", "Change password", "Cambiar contraseña")}
            </button>
          </form>
        )}
      </details>
      <details
        name="account-settings"
        open={enrollment || codes.length ? true : undefined}
      >
        <summary>
          {l(
            "Zwei-Faktor-Authentifizierung",
            "Two-factor authentication",
            "Autenticación de dos factores",
          )}{" "}
          ·{" "}
          {user.twoFactorEnabled
            ? l("Aktiv", "On", "Activa")
            : l("Aus", "Off", "Desactivada")}
        </summary>
        <p>
          {l(
            "Eine Authenticator-App erzeugt einen zusätzlichen Code. Der Einrichtungsschlüssel und die Notfallcodes werden nur hier gezeigt, niemals an einen QR-Dienst geschickt.",
            "An authenticator app generates an extra code. The setup key and recovery codes are shown only here, never sent to a QR-code service.",
            "Una aplicación genera un código adicional. La clave y los códigos de recuperación solo se muestran aquí y nunca se envían a un servicio de QR.",
          )}
        </p>
        {!user.twoFactorEnabled && !enrollment && (
          <form
            className="studio-account-form"
            onSubmit={submit(async ({ password }) => {
              const result = await api("/api/auth/two-factor/enable", {
                password,
                method: "totp",
              });
              setEnrollment(result);
              setCodes(result.backupCodes || []);
            })}
          >
            {password()}
            <button className="secondary-button" disabled={busy}>
              {l(
                "Authenticator einrichten",
                "Set up authenticator",
                "Configurar autenticador",
              )}
            </button>
          </form>
        )}
        {enrollment && (
          <div className="account-factor-enrollment">
            {qr && (
              <img
                src={qr}
                alt={l(
                  "QR-Code für deine Authenticator-App",
                  "QR code for your authenticator app",
                  "Código QR para el autenticador",
                )}
                width="240"
                height="240"
              />
            )}
            <label>
              {l(
                "Alternativ: Einrichtungsschlüssel",
                "Alternatively: setup key",
                "Alternativa: clave de configuración",
              )}
              <code>
                {new URL(enrollment.totpURI).searchParams.get("secret")}
              </code>
            </label>
            <form
              className="studio-account-form"
              onSubmit={submit(async ({ code }) => {
                await api("/api/auth/two-factor/verify-totp", {
                  code,
                  trustDevice: false,
                });
                setEnrollment(null);
                await refresh();
                setMessage(
                  l(
                    "Zwei-Faktor-Schutz ist aktiv. Bewahre die Notfallcodes sicher auf.",
                    "Two-factor protection is on. Keep the recovery codes somewhere safe.",
                    "La protección está activa. Guarda los códigos de recuperación en un lugar seguro.",
                  ),
                );
              })}
            >
              <label>
                {l(
                  "Code aus der App bestätigen",
                  "Confirm the code from the app",
                  "Confirma el código de la aplicación",
                )}
                <input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                />
              </label>
              <button className="primary-button" disabled={busy}>
                {l("Aktivieren", "Enable", "Activar")}
              </button>
            </form>
          </div>
        )}
        {Boolean(codes.length) && (
          <div className="account-recovery-codes">
            <h4>
              {l(
                "Notfallcodes · jeder gilt einmal",
                "Recovery codes · each works once",
                "Códigos de recuperación · de un solo uso",
              )}
            </h4>
            <p>
              {l(
                "Mit einem Code kannst du dich anmelden, wenn du dein Handy verlierst. Teile sie mit niemandem.",
                "Use a code to sign in if you lose your phone. Do not share them.",
                "Puedes usar uno si pierdes tu teléfono. No los compartas.",
              )}
            </p>
            <ul>
              {codes.map((code) => (
                <li key={code}>
                  <code>{code}</code>
                </li>
              ))}
            </ul>
            <button
              className="secondary-button"
              onClick={() => {
                const blob = new Blob(
                    [`Pollframe recovery codes\n\n${codes.join("\n")}`],
                    { type: "text/plain" },
                  ),
                  url = URL.createObjectURL(blob),
                  a = document.createElement("a");
                a.href = url;
                a.download = "pollframe-recovery-codes.txt";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 60000);
              }}
            >
              {l("Codes herunterladen", "Download codes", "Descargar códigos")}
            </button>
            <button className="text-button" onClick={() => setCodes([])}>
              {l("Codes ausblenden", "Hide codes", "Ocultar códigos")}
            </button>
          </div>
        )}
        {user.twoFactorEnabled && (
          <>
            <form
              className="studio-account-form"
              onSubmit={submit(
                async ({ password, factorCode, recoveryCode }) => {
                  const result = await api(
                    "/api/auth/two-factor/generate-backup-codes",
                    { password, factorCode, recoveryCode },
                  );
                  setCodes(result.backupCodes);
                  setMessage(
                    l(
                      "Neue Notfallcodes erstellt. Alte Codes sind jetzt ungültig.",
                      "New recovery codes created. Old codes no longer work.",
                      "Nuevos códigos creados. Los anteriores ya no sirven.",
                    ),
                  );
                },
              )}
            >
              {password()}
              {factor()}
              <button className="secondary-button" disabled={busy}>
                {l(
                  "Neue Notfallcodes",
                  "New recovery codes",
                  "Nuevos códigos de recuperación",
                )}
              </button>
            </form>
            <form
              className="studio-account-form"
              onSubmit={submit(
                async ({ password, factorCode, recoveryCode }) => {
                  await api("/api/auth/two-factor/disable", {
                    password,
                    factorCode,
                    recoveryCode,
                  });
                  setCodes([]);
                  await refresh();
                  setMessage(
                    l(
                      "Zwei-Faktor-Schutz deaktiviert.",
                      "Two-factor protection disabled.",
                      "Protección de dos factores desactivada.",
                    ),
                  );
                },
              )}
            >
              {password()}
              {factor()}
              <button className="text-button" disabled={busy}>
                {l(
                  "Zwei-Faktor-Schutz deaktivieren",
                  "Disable two-factor protection",
                  "Desactivar protección de dos factores",
                )}
              </button>
            </form>
          </>
        )}
      </details>
      <details name="account-settings">
        <summary>
          {l(
            "Geräte & Sitzungen",
            "Devices & sessions",
            "Dispositivos y sesiones",
          )}
        </summary>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => run(reloadSessions)}
        >
          {l("Aktualisieren", "Refresh", "Actualizar")}
        </button>
        <ul className="account-sessions">
          {sessions.map((item) => (
            <li key={item.id}>
              <span>
                {item.current
                  ? l("Dieses Gerät", "This device", "Este dispositivo")
                  : l("Andere Sitzung", "Other session", "Otra sesión")}
                <small>
                  {item.userAgent ||
                    l(
                      "Browser nicht angegeben",
                      "Browser not supplied",
                      "Navegador no indicado",
                    )}{" "}
                  · {new Date(item.createdAt).toLocaleString()}
                </small>
              </span>
              {!item.current && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api(
                        "/api/account/sessions/" + encodeURIComponent(item.id),
                        null,
                        "DELETE",
                      );
                      await reloadSessions();
                    })
                  }
                >
                  {l("Abmelden", "Sign out", "Cerrar sesión")}
                </button>
              )}
            </li>
          ))}
        </ul>
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await api("/api/account/sessions/revoke-others", {});
              await reloadSessions();
            })
          }
        >
          {l(
            "Alle anderen Geräte abmelden",
            "Sign out all other devices",
            "Cerrar las demás sesiones",
          )}
        </button>
      </details>
    </section>
  );
}

export function FactorInput({ l }) {
  const [recovery, setRecovery] = useState(false);
  return (
    <div className="account-factor-input">
      <label>
        {recovery
          ? l(
              "Ein unbenutzter Notfallcode",
              "An unused recovery code",
              "Un código de recuperación sin usar",
            )
          : l(
              "Authenticator-Code",
              "Authenticator code",
              "Código del autenticador",
            )}
        <input
          key={String(recovery)}
          name={recovery ? "recoveryCode" : "factorCode"}
          inputMode={recovery ? "text" : "numeric"}
          pattern={recovery ? undefined : "[0-9]{6}"}
          maxLength={recovery ? 30 : 6}
          autoComplete="one-time-code"
          required
        />
      </label>
      <button
        type="button"
        className="text-button"
        onClick={() => setRecovery(!recovery)}
      >
        {recovery
          ? l(
              "Authenticator verwenden",
              "Use authenticator",
              "Usar autenticador",
            )
          : l(
              "Handy verloren? Notfallcode verwenden",
              "Lost your phone? Use a recovery code",
              "¿Has perdido el teléfono? Usa un código de recuperación",
            )}
      </button>
    </div>
  );
}
