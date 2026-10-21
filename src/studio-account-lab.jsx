import React, {
  lazy,
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { accountText } from "./account-copy.js";
import { WAHLFRAME_UI_ENABLED } from "./wahlframe-feature.js";
import Dialog from "./studio-resource-dialog.jsx";
import NewPassword from "./account-password.jsx";
import {
  accountApi as api,
  accountAccessError,
  useAccountWait,
} from "./account-access.js";
const PrivateResults = WAHLFRAME_UI_ENABLED
  ? lazy(() => import("./account-private-results.jsx"))
  : null;
const Security = lazy(() => import("./account-security.jsx"));
const FactorInput = lazy(() =>
  import("./account-security.jsx").then((module) => ({
    default: module.FactorInput,
  })),
);

function accountLanguage(locale) {
  const language = locale || document.documentElement.lang;
  return ["de", "en-GB", "en-US", "es"].includes(language) ? language : "en-GB";
}
function resetReturnURL(locale) {
  return (
    location.origin +
    "/?" +
    new URLSearchParams({
      view: "studio",
      account: "reset",
      lang: accountLanguage(locale),
    })
  );
}

export default function AccountLab({
  locale,
  onClose,
  open,
  l,
  initialResetToken = "",
  initialRecoveryError = false,
  purpose = null,
}) {
  const text = (value) => accountText(l, value);
  const passwordId = useId();
  const [localOnly, setLocalOnly] = useState(false);
  const [factorChallenge, setFactorChallenge] = useState(false),
    [useRecovery, setUseRecovery] = useState(false);
  const [privateCapability, setPrivateCapability] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const requestBusy = useRef(false);
  const formRef = useRef(null);
  const confirmedCode = useRef("");
  const [code, setCode] = useState("");
  const { resendWait, waitFor, startResend, recordLimit } = useAccountWait();
  const [passwordSetup, setPasswordSetup] = useState(false);
  const [accountSection, setAccountSection] = useState("library");
  const [passwordAccepted, setPasswordAccepted] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [user, setUser] = useState(null),
    [mode, setMode] = useState(initialRecoveryError ? "forgot" : "email"),
    [status, setStatus] = useState(
      initialRecoveryError
        ? l(
            "Dieser Rücksetz-Link ist ungültig oder abgelaufen. Fordere bitte einen neuen an.",
            "This reset link is invalid or has expired. Please request a new one.",
            "El enlace no es válido o ha caducado. Solicita uno nuevo.",
          )
        : "",
    ),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [mail, setMail] = useState([]),
    [documents, setDocuments] = useState([]),
    [resetToken, setResetToken] = useState(initialResetToken),
    [email, setEmail] = useState(""),
    [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (!ready || (user && mode !== "reset")) return;
    formRef.current
      ?.querySelector(
        mode === "login"
          ? 'input[name="password"]'
          : 'input:not([type="hidden"])',
      )
      ?.focus({ preventScroll: true });
  }, [mode, ready, user]);
  const refresh = async (notifyOtherTabs = true, requireSession = false) => {
    const session = await api("/api/auth/get-session");
    if (requireSession && !session?.user?.emailVerified) {
      const error = Error("Session could not be retained");
      error.code = "SESSION_NOT_RETAINED";
      throw error;
    }
    setUser(session?.user || null);
    window.dispatchEvent(
      new CustomEvent("pollframe-account-changed", {
        detail: {
          signedIn: session?.user?.emailVerified === true,
          userId: session?.user?.id || null,
          notifyOtherTabs,
        },
      }),
    );
    setDocuments(
      session?.user ? (await api("/api/account/documents")).items : [],
    );
  };
  useEffect(() => {
    let active = true;
    api("/api/account/capabilities")
      .then(async (value) => {
        if (
          !(
            value.enabled ||
            (value.localOnly && location.hostname === "127.0.0.1")
          )
        )
          throw Error("Accounts unavailable");
        if (active) {
          setLocalOnly(Boolean(value.localOnly));
          setPrivateCapability(
            value.privateResults ? value.privateResultsConsent : null,
          );
          if (resetToken) {
            setMode("reset");
            const url = new URL(location.href);
            url.searchParams.delete("token");
            url.searchParams.delete("account");
            history.replaceState(history.state, "", url);
          }
          // An email recovery link does not require an existing session. Do
          // not hold this form behind an unrelated session/database lookup.
          if (resetToken || initialRecoveryError) {
            setReady(true);
            return;
          }
          await refresh(false);
          if (active) setReady(true);
        }
      })
      .catch(() => {
        if (active)
          setStatus(
            text(
              "Der Kontodienst ist gerade nicht erreichbar. Bitte später erneut versuchen.",
            ),
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
    setCodeError(false);
    try {
      await task();
    } catch (error) {
      setNeedsVerification(error.code === "EMAIL_NOT_VERIFIED");
      recordLimit(error);
      const accountErrors = {
        PASSWORD_TOO_WEAK: l(
          "Dieses Passwort ist zu leicht zu erraten. Verwende eine längere, ungewöhnliche Wortfolge (mindestens 15 Zeichen).",
          "This password is too predictable. Use a longer, unusual phrase (at least 15 characters).",
          "Esta contraseña es demasiado predecible. Usa una frase larga y poco habitual (al menos 15 caracteres).",
        ),
        SECOND_FACTOR_REQUIRED: l(
          "Bitte bestätige die Änderung mit deinem Authenticator oder einem Notfallcode.",
          "Confirm this change with your authenticator or a recovery code.",
          "Confirma el cambio con tu autenticador o un código de recuperación.",
        ),
        INVALID_SECOND_FACTOR: l(
          "Der Sicherheitscode stimmt nicht. Prüfe ihn und die Uhrzeit deiner Authenticator-App.",
          "The security code is incorrect. Check it and your authenticator app’s clock.",
          "El código no es correcto. Compruébalo y revisa la hora de tu autenticador.",
        ),
        INVALID_CODE: l(
          "Der Code stimmt nicht oder wurde bereits verwendet.",
          "The code is incorrect or has already been used.",
          "El código no es correcto o ya se ha utilizado.",
        ),
        TOO_MANY_REQUESTS: l(
          `Zu viele Versuche. Bitte warte ${error.retryAfter || 60} Sekunden.`,
          `Too many attempts. Please wait ${error.retryAfter || 60} seconds.`,
          `Demasiados intentos. Espera ${error.retryAfter || 60} segundos.`,
        ),
        TWO_FACTOR_LOCKED: l(
          "Zu viele falsche Sicherheitscodes. Bitte warte 15 Minuten.",
          "Too many incorrect security codes. Please wait 15 minutes.",
          "Demasiados códigos incorrectos. Espera 15 minutos.",
        ),
        ACCOUNT_CHANGED: l(
          "Das angemeldete Konto hat gewechselt. Öffne die Datei bitte erneut.",
          "The signed-in account has changed. Please reopen the file.",
          "La cuenta ha cambiado. Vuelve a abrir el archivo.",
        ),
        INVALID_EMAIL_OR_PASSWORD: l(
          "E-Mail-Adresse oder Passwort stimmt nicht.",
          "The email address or password is incorrect.",
          "El correo o la contraseña no son correctos.",
        ),
        INVALID_PASSWORD: l(
          "Das Passwort stimmt nicht.",
          "That password is incorrect.",
          "La contraseña no es correcta.",
        ),
        INVALID_TOKEN: l(
          "Dieser Link ist ungültig oder abgelaufen. Fordere einen neuen an.",
          "This link is invalid or has expired. Request a new one.",
          "El enlace no es válido o ha caducado. Solicita uno nuevo.",
        ),
        SESSION_EXPIRED: l(
          "Bitte melde dich erneut an und versuche es noch einmal.",
          "Please sign in again and retry.",
          "Vuelve a iniciar sesión e inténtalo de nuevo.",
        ),
      };
      setCodeError(
        ["INVALID_OTP", "OTP_EXPIRED", "TOO_MANY_ATTEMPTS"].includes(
          error.code,
        ),
      );
      if (error.code === "PASSWORD_LOGIN_REQUIRED") {
        confirmedCode.current = "";
        setPasswordSetup(false);
        setMode("login");
      }
      setStatus(
        accountAccessError(error, l) ||
          accountErrors[error.code] ||
          (error.code === "EMAIL_DELIVERY_UNAVAILABLE"
            ? l(
                "Der E-Mail-Versand ist gerade nicht verfügbar. Bitte versuche es später erneut.",
                "Email delivery is temporarily unavailable. Please try again later.",
                "El envío de correos no está disponible temporalmente. Inténtalo de nuevo más tarde.",
              )
            : ["INVALID_OTP", "OTP_EXPIRED", "TOO_MANY_ATTEMPTS"].includes(
                  error.code,
                )
              ? l(
                  "Dieser Code ist ungültig oder abgelaufen. Prüfe ihn oder fordere einen neuen an.",
                  "That code is invalid or has expired. Check it or request a new one.",
                  "El código no es válido o ha caducado. Revísalo o solicita otro.",
                )
              : error.name === "TimeoutError" || error.name === "AbortError"
                ? text(
                    "Der Kontodienst antwortet nicht rechtzeitig. Bitte noch einmal versuchen.",
                  )
                : error instanceof TypeError
                  ? l(
                      "Keine Verbindung zum Kontodienst. Prüfe deine Internetverbindung und versuche es erneut.",
                      "Could not reach the account service. Check your connection and try again.",
                      "No se ha podido conectar con el servicio de cuentas. Comprueba tu conexión e inténtalo de nuevo.",
                    )
                  : error.message || text("Das hat nicht geklappt.")),
      );
    } finally {
      requestBusy.current = false;
      setBusy(false);
    }
  };
  const showMail = async () =>
    setMail((await api("/api/account/test-outbox", {})).items);
  const sendCode = async () => {
    await api("/api/auth/email-otp/send-verification-otp", {
      email: email.trim(),
      type: "sign-in",
    });
    confirmedCode.current = "";
    setCode("");
    startResend();
    setMode("code");
    if (localOnly) await showMail();
  };
  const changeEmail = () => {
    confirmedCode.current = "";
    setCode("");
    setMail([]);
    setStatus("");
    setShowPassword(false);
    setNeedsVerification(false);
    setMode("email");
  };
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget,
      values = new FormData(form);
    await run(async () => {
      const address = email.trim(),
        password = String(values.get("password") || "");
      if (mode === "email") {
        // Local navigation only: do not send mail or reveal account existence
        // merely because someone wants to sign in.
        setMode("login");
      } else if (mode === "code") {
        try {
          await api("/api/auth/email-otp/check-verification-otp", {
            email: address,
            otp: code,
            type: "sign-in",
          });
          // Inbox proof can distinguish a returning user, but is not their
          // login factor. Never exchange it for a returning user's session.
          setMode("login");
          setStatus(
            l(
              "Du hast bereits ein Konto. Melde dich mit deinem Passwort an. Falls du noch keines festgelegt hast, nutze „Passwort vergessen“.",
              "You already have an account. Sign in with your password. If you never finished setting one, choose Forgot password.",
              "Ya tienes una cuenta. Accede con tu contraseña. Si no terminaste de crearla, elige ¿Has olvidado tu contraseña?",
            ),
          );
          confirmedCode.current = "";
        } catch (error) {
          if (error.code !== "USER_NOT_FOUND") throw error;
          confirmedCode.current = code;
          setMode("register");
        }
        setCode("");
        setMail([]);
      } else if (mode === "register") {
        // Inbox ownership is proven before registration. The code is consumed
        // by Better Auth, then the fresh session may set its initial password.
        if (!passwordSetup)
          await api("/api/auth/sign-in/email-otp", {
            email: address,
            otp: confirmedCode.current,
            name: String(values.get("name") || "Pollframe"),
          });
        confirmedCode.current = "";
        setPasswordSetup(true);
        try {
          await api("/api/account/initial-password", { password });
        } catch (error) {
          if (error.code !== "PASSWORD_ALREADY_SET") throw error;
          setStatus(
            l(
              "Dein Konto hat bereits ein Passwort. Es wurde nicht geändert.",
              "Your account already has a password. It has not been changed.",
              "Tu cuenta ya tiene una contraseña. No se ha cambiado.",
            ),
          );
        }
        setPasswordSetup(false);
        await refresh(true, true);
        setMail([]);
      } else if (mode === "forgot") {
        await api("/api/auth/request-password-reset", {
          email: address,
          redirectTo: resetReturnURL(locale),
        });
        setStatus(
          localOnly
            ? text(
                "Wenn dieses Testkonto existiert, liegt ein Link im lokalen Postausgang.",
              )
            : text(
                "Wenn ein Konto zu dieser Adresse existiert, erhältst du einen Link zum Zurücksetzen. Prüfe auch deinen Spamordner.",
              ),
        );
        if (localOnly) await showMail();
      } else if (mode === "reset") {
        await api("/api/auth/reset-password", {
          token: resetToken,
          newPassword: password,
        });
        setResetToken("");
        confirmedCode.current = "";
        setUser(null);
        window.dispatchEvent(
          new CustomEvent("pollframe-account-changed", {
            detail: { signedIn: false },
          }),
        );
        setMode("login");
        setStatus(
          text("Passwort geändert. Bestehende Sitzungen wurden widerrufen."),
        );
      } else {
        const signed = await api("/api/auth/sign-in/email", {
          email: address,
          password,
        });
        if (signed.twoFactorRedirect) setFactorChallenge(true);
        else await refresh(true, true);
        setMail([]);
      }
      setShowPassword(false);
      form.reset();
    });
  }
  async function upload() {
    // Opening sign-in must not load the Studio recipe/renderer dependency tree.
    const [{ listLegacyDesigns }, { listLegacyStyles }] = await Promise.all([
      import("./studio-library.js"),
      import("./studio-style-library.js"),
    ]);
    const [designs, styles] = await Promise.all([
      listLegacyDesigns(),
      listLegacyStyles(),
    ]);
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
      l(
        `${designs.length} Designs und ${styles.length} Stile im Konto gesichert. Eigene Bild- und Schriftdateien bleiben auf diesem Gerät.`,
        `${designs.length} designs and ${styles.length} styles saved to your account. Imported images and fonts stay on this device.`,
        `${designs.length} diseños y ${styles.length} estilos guardados en tu cuenta. Las imágenes y tipografías importadas permanecen en este dispositivo.`,
      ),
    );
  }
  const shortcut = mode === "login" && !confirmedCode.current;
  const actionPath = {
    login: "/api/auth/sign-in/email",
    code: "/api/auth/email-otp/check-verification-otp",
    register: passwordSetup
      ? "/api/account/initial-password"
      : "/api/auth/sign-in/email-otp",
    forgot: "/api/auth/request-password-reset",
    reset: "/api/auth/reset-password",
  }[mode];
  const actionWait = waitFor(actionPath);
  const startRegistration = () => {
    const field = formRef.current?.querySelector('input[name="email"]');
    if (!field?.reportValidity()) return;
    run(sendCode);
  };
  const recovery = ["forgot", "reset"].includes(mode);
  const registration = ["code", "register"].includes(mode);
  const step = recovery
    ? mode === "reset"
      ? 1
      : 0
    : mode === "login"
      ? 1
      : mode === "email"
        ? 0
        : mode === "code"
          ? 1
          : 2;
  const steps = recovery
    ? [text("E-Mail"), text("Neues Passwort")]
    : registration
      ? [
          text("E-Mail"),
          l("Bestätigen", "Verify", "Verificar"),
          text("Passwort"),
        ]
      : [text("E-Mail"), text("Passwort")];
  return (
    <Dialog
      className={`studio-account-dialog ${user && mode !== "reset" ? "is-account-home" : "is-account-access"}`}
      title={l(
        "Dein Pollframe-Konto",
        "Your Pollframe account",
        "Tu cuenta de Pollframe",
      )}
      l={l}
      onClose={onClose}
    >
      {ready && !factorChallenge && (!user || mode === "reset") && (
        <ol
          className="account-progress"
          aria-label={l("Dein Fortschritt", "Your progress", "Tu progreso")}
        >
          {steps.map((label, index) => (
            <li
              key={index}
              className={
                index < step
                  ? "is-complete"
                  : index === step
                    ? "is-current"
                    : ""
              }
              aria-current={index === step ? "step" : undefined}
            >
              <span aria-hidden="true">
                {index < step ? "✓" : String(index + 1).padStart(2, "0")}
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      )}
      {localOnly ? (
        <p className="studio-account-dev-note">
          {l(
            "Lokaler Kontotest · Nur erfundene .test-Adressen. Keine echten E-Mails.",
            "Local account test · Fictional .test addresses only. No real email.",
            "Prueba local · Solo direcciones ficticias .test. Sin correos reales.",
          )}
        </p>
      ) : null}
      {status && (
        <div role="status" className="studio-account-message">
          {text(status)}
          {codeError && mode === "register" && (
            <button
              className="text-button"
              disabled={busy || resendWait > 0}
              onClick={() => run(sendCode)}
            >
              {l(
                "Neuen Code anfordern",
                "Request a new code",
                "Solicitar otro código",
              )}
            </button>
          )}
        </div>
      )}
      {!ready && !status && (
        <p className="account-loading" role="status">
          {l(
            "Dein Konto wird geladen…",
            "Loading your account…",
            "Cargando tu cuenta…",
          )}
        </p>
      )}
      {factorChallenge && (
        <form
          className="studio-account-form"
          onSubmit={(event) => {
            event.preventDefault();
            const code = String(
              new FormData(event.currentTarget).get("factor"),
            );
            run(async () => {
              await api(
                useRecovery
                  ? "/api/auth/two-factor/verify-backup-code"
                  : "/api/auth/two-factor/verify-totp",
                { code, trustDevice: false },
              );
              setFactorChallenge(false);
              setUseRecovery(false);
              await refresh();
            });
          }}
        >
          <h3>
            {l(
              "Zweiter Sicherheitsschritt",
              "Second security step",
              "Segundo paso de seguridad",
            )}
          </h3>
          <p>
            {l(
              "Dein Passwort wurde bestätigt. Gib jetzt den Code aus deiner Authenticator-App ein.",
              "Your password was verified. Now enter the code from your authenticator app.",
              "Se ha verificado tu contraseña. Introduce ahora el código de tu aplicación autenticadora.",
            )}
          </p>
          <label>
            {useRecovery
              ? l("Notfallcode", "Recovery code", "Código de recuperación")
              : l(
                  "Authenticator-Code",
                  "Authenticator code",
                  "Código del autenticador",
                )}
            <input
              name="factor"
              inputMode={useRecovery ? "text" : "numeric"}
              autoComplete="one-time-code"
              pattern={useRecovery ? undefined : "[0-9]{6}"}
              maxLength={useRecovery ? 80 : 6}
              required
              autoFocus
            />
          </label>
          <button className="primary-button" disabled={busy}>
            {l("Anmeldung bestätigen", "Complete sign-in", "Completar acceso")}
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => setUseRecovery(!useRecovery)}
          >
            {useRecovery
              ? l(
                  "Authenticator verwenden",
                  "Use authenticator",
                  "Usar autenticador",
                )
              : l(
                  "Handy verloren? Notfallcode verwenden",
                  "Lost your phone? Use a recovery code",
                  "¿Has perdido tu teléfono? Usa un código de recuperación",
                )}
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setFactorChallenge(false);
              setMode("email");
            }}
          >
            {l("Zurück", "Back", "Volver")}
          </button>
        </form>
      )}
      {purpose === "save" && !user && (
        <p className="account-save-prompt">
          {l(
            "Melde dich an oder erstelle kostenlos ein Konto, um dein Design, deinen Stil oder dein Wahlframe-Ergebnis zu speichern. Ansehen, Gestalten und Exportieren geht auch ohne Konto.",
            "Sign in or create a free account to save your design, style or Wahlframe result. Viewing, editing and exporting do not require an account.",
            "Accede o crea una cuenta gratuita para guardar tu diseño, estilo o resultado de Wahlframe. Puedes ver, editar y exportar sin cuenta.",
          )}
        </p>
      )}
      {ready && !factorChallenge && (!user || mode === "reset") && (
        <>
          <div className="studio-account-intro">
            <h3>
              {mode === "email"
                ? l(
                    "Dein nächstes Design beginnt hier.",
                    "Your next design starts here.",
                    "Tu próximo diseño empieza aquí.",
                  )
                : mode === "code"
                  ? l(
                      "Ein kurzer Blick ins Postfach.",
                      "Check your inbox.",
                      "Revisa tu correo.",
                    )
                  : mode === "register"
                    ? l(
                        "Deine Grafiken. Dein Konto.",
                        "Your graphics. Your account.",
                        "Tus gráficas. Tu cuenta.",
                      )
                    : mode === "forgot"
                      ? l(
                          "Wieder Zugang bekommen",
                          "Get back into your account",
                          "Recupera el acceso",
                        )
                      : mode === "reset"
                        ? l(
                            "Ein neues Passwort festlegen",
                            "Set a new password",
                            "Elige una contraseña nueva",
                          )
                        : l(
                            "Willkommen zurück",
                            "Welcome back",
                            "Te damos la bienvenida",
                          )}
            </h3>
            <p>
              {mode === "code"
                ? l(
                    "Bestätige deine E-Mail-Adresse für dein neues Konto. Der Code gilt zehn Minuten. Prüfe auch den Spamordner. Danach legst du dein Passwort fest.",
                    "Verify your email address for your new account. The code is valid for ten minutes. Check your spam folder too. Then you’ll set your password.",
                    "Verifica tu correo para crear tu cuenta. El código es válido durante diez minutos. Revisa también la carpeta de spam. Después crearás tu contraseña.",
                  )
                : mode === "forgot"
                  ? l(
                      "Wir schicken dir einen Link zum Zurücksetzen. Dein Passwort wird nie per E-Mail versendet.",
                      "We’ll send a reset link. Your password is never sent by email.",
                      "Te enviaremos un enlace para restablecerla. Nunca enviamos tu contraseña por correo.",
                    )
                  : mode === "reset"
                    ? l(
                        "Wähle ein langes, einzigartiges Passwort für dein Konto.",
                        "Choose a long, unique password for your account.",
                        "Elige una contraseña larga y única para tu cuenta.",
                      )
                    : l(
                        "Designs und Stile speichern und auf deinen Geräten weiterarbeiten.",
                        "Save designs and styles and pick up on another device.",
                        "Guarda diseños y estilos y sigue desde otro dispositivo.",
                      )}
            </p>
          </div>
          {!["email", "reset", "forgot"].includes(mode) && !shortcut && (
            <div className="account-email-chip">
              <span>{email}</span>
              <button
                type="button"
                disabled={busy || passwordSetup}
                onClick={changeEmail}
              >
                {l("Ändern", "Change", "Cambiar")}
              </button>
            </div>
          )}
          {["forgot", "reset"].includes(mode) && (
            <button
              type="button"
              className="text-button account-back"
              disabled={busy}
              onClick={() => {
                setMode("login");
                setShowPassword(false);
                setStatus("");
              }}
            >
              {l(
                "← Zur Anmeldung",
                "← Back to sign in",
                "← Volver al inicio de sesión",
              )}
            </button>
          )}
          <form
            ref={formRef}
            key={mode}
            onSubmit={submit}
            className="studio-account-form"
            aria-busy={busy}
          >
            {(["email", "forgot"].includes(mode) || shortcut) && (
              <label>
                {localOnly ? text("Test-E-Mail") : text("E-Mail")}
                <input
                  disabled={busy}
                  name="email"
                  type="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  pattern={localOnly ? "[^\\s@]+@[^\\s@]+\\.test" : undefined}
                  title={
                    localOnly
                      ? text(
                          "Im lokalen Test nur erfundene Adressen mit .test verwenden.",
                        )
                      : undefined
                  }
                  placeholder={
                    localOnly ? "name@example.test" : "name@example.com"
                  }
                  required
                />
              </label>
            )}
            {["register", "login"].includes(mode) && !shortcut && (
              <input
                name="email"
                type="hidden"
                value={email}
                autoComplete="username"
              />
            )}
            {mode === "code" && (
              <label>
                {l(
                  "Bestätigungscode",
                  "Confirmation code",
                  "Código de confirmación",
                )}
                <input
                  disabled={busy}
                  name="code"
                  className="account-code-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  required
                />
              </label>
            )}
            {["register", "reset"].includes(mode) && (
              <NewPassword
                key={mode}
                l={l}
                email={email}
                id={passwordId}
                disabled={busy}
                onValidityChange={setPasswordAccepted}
                label={
                  mode === "reset" ? text("Neues Passwort") : text("Passwort")
                }
              />
            )}
            {mode === "login" && (
              <div className="studio-account-field">
                <span className="studio-password-label">
                  <label htmlFor={passwordId}>
                    {mode === "reset"
                      ? text("Neues Passwort")
                      : text("Passwort")}
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => {
                        setMode("forgot");
                        setShowPassword(false);
                        setStatus("");
                      }}
                    >
                      {text("Passwort vergessen")}
                    </button>
                  )}
                </span>
                <span className="studio-password-input">
                  <input
                    disabled={busy}
                    id={passwordId}
                    aria-label={
                      mode === "reset"
                        ? text("Neues Passwort")
                        : text("Passwort")
                    }
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={mode === "login" ? 1 : 15}
                    maxLength={128}
                    required
                  />
                  <button
                    type="button"
                    aria-pressed={showPassword}
                    aria-label={
                      showPassword
                        ? text("Passwort verbergen")
                        : text("Passwort anzeigen")
                    }
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? text("Verbergen") : text("Anzeigen")}
                  </button>
                </span>
              </div>
            )}
            <button
              className="primary-button"
              disabled={
                busy ||
                actionWait > 0 ||
                (["register", "reset"].includes(mode) && !passwordAccepted)
              }
            >
              {busy
                ? text("Bitte warten…")
                : actionWait > 0
                  ? l(
                      `Erneut versuchen in ${actionWait} s`,
                      `Try again in ${actionWait}s`,
                      `Reintentar en ${actionWait} s`,
                    )
                  : {
                      login: text("Anmelden"),
                      email: l(
                        "Mit E-Mail weiter",
                        "Continue with email",
                        "Continuar con correo",
                      ),
                      code: l(
                        "Code bestätigen",
                        "Verify code",
                        "Verificar código",
                      ),
                      register: localOnly
                        ? text("Testkonto erstellen")
                        : text("Konto erstellen"),
                      forgot: text("Link anfordern"),
                      reset: text("Passwort ändern"),
                    }[mode]}
            </button>
            {mode === "register" && (
              <details className="account-display-name">
                <summary>
                  {text("Anzeigename")}{" "}
                  {l("hinzufügen (optional)", "(optional)", "(opcional)")}
                </summary>
                <label>
                  {text("Anzeigename")}
                  <input
                    name="name"
                    maxLength={60}
                    autoComplete="nickname"
                    placeholder={l(
                      "Wie sollen wir dich nennen?",
                      "What should we call you?",
                      "¿Cómo quieres que te llamemos?",
                    )}
                  />
                </label>
              </details>
            )}
          </form>
          {mode === "code" && (
            <button
              className="text-button account-resend"
              disabled={busy || resendWait > 0}
              onClick={() => run(sendCode)}
            >
              {resendWait > 0
                ? l(
                    `Neuer Code in ${resendWait} s`,
                    `Resend in ${resendWait}s`,
                    `Reenviar en ${resendWait} s`,
                  )
                : l("Code erneut senden", "Resend code", "Reenviar código")}
            </button>
          )}
          {mode === "login" && needsVerification && (
            <button
              className="text-button account-resend"
              disabled={
                busy ||
                resendWait > 0 ||
                waitFor("/api/auth/send-verification-email") > 0
              }
              onClick={() =>
                run(async () => {
                  await api("/api/auth/send-verification-email", {
                    email: email.trim(),
                    callbackURL: `${location.origin}/?lang=${encodeURIComponent(accountLanguage(locale))}`,
                  });
                  startResend();
                  setStatus(
                    text(
                      "Falls eine Bestätigung erforderlich ist, wurde ein neuer Link angefordert.",
                    ),
                  );
                })
              }
            >
              {l(
                "Bestätigungs-E-Mail anfordern",
                "Request verification email",
                "Solicitar correo de verificación",
              )}
            </button>
          )}
          {mode === "email" && (
            <>
              <p className="account-email-hint">
                {l(
                  "Mit deinem Passwort anmelden oder kostenlos ein Konto erstellen.",
                  "Sign in with your password, or create a free account.",
                  "Accede con tu contraseña o crea una cuenta gratuita.",
                )}
              </p>
              <button
                className="text-button account-password-shortcut"
                disabled={busy || resendWait > 0}
                onClick={startRegistration}
              >
                {l(
                  "Kostenloses Konto erstellen",
                  "Create a free account",
                  "Crear una cuenta gratuita",
                )}
              </button>
            </>
          )}
          {shortcut && (
            <button
              className="text-button account-back"
              disabled={busy || resendWait > 0}
              onClick={startRegistration}
            >
              {l(
                "Noch kein Konto? Kostenlos registrieren",
                "New here? Create a free account",
                "¿Aún no tienes cuenta? Crea una gratis",
              )}
            </button>
          )}
          {localOnly && (
            <button
              className="text-button"
              disabled={busy}
              onClick={() => run(showMail)}
            >
              {text("Lokalen Test-Postausgang öffnen")}
            </button>
          )}
          <p className="studio-account-privacy">
            <a
              href={`/?page=datenschutz&lang=${encodeURIComponent(accountLanguage(locale))}#accounts`}
              target="_blank"
              rel="noreferrer"
            >
              {l("Datenschutz", "Privacy", "Privacidad")}
            </a>{" "}
            ·{" "}
            {l(
              "Keine Zahlungsdaten erforderlich.",
              "No payment details required.",
              "No se necesitan datos de pago.",
            )}
          </p>
        </>
      )}
      {user && mode !== "reset" && (
        <>
          <div className="account-identity">
            <span className="account-avatar" aria-hidden="true">
              {(user.name || user.email).slice(0, 1).toLocaleUpperCase()}
            </span>
            <div>
              <small>{text("Angemeldet als")}</small>
              <strong>{user.email}</strong>
              <span className="account-protection-state">
                {user.twoFactorEnabled
                  ? l(
                      "Zwei-Faktor-Schutz aktiv",
                      "Two-factor protection on",
                      "Protección de dos factores activa",
                    )
                  : l(
                      "E-Mail bestätigt",
                      "Email verified",
                      "Correo verificado",
                    )}
              </span>
            </div>
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api("/api/auth/sign-out", {});
                  setUser(null);
                  setMode("email");
                  confirmedCode.current = "";
                  setPasswordSetup(false);
                  setShowPassword(false);
                  window.dispatchEvent(
                    new CustomEvent("pollframe-account-changed", {
                      detail: { signedIn: false },
                    }),
                  );
                  setDocuments([]);
                  setMail([]);
                  navigator.serviceWorker?.controller?.postMessage({
                    type: "POLLFRAME_LOGOUT",
                  });
                })
              }
            >
              {text("Abmelden")}
            </button>
          </div>
          <nav
            className="account-section-nav"
            aria-label={l(
              "Kontobereiche",
              "Account sections",
              "Secciones de cuenta",
            )}
          >
            {[
              ["library", l("Gespeichert", "Saved", "Guardado")],
              [
                "security",
                l(
                  "Konto & Sicherheit",
                  "Account & security",
                  "Cuenta y seguridad",
                ),
              ],
              [
                "privacy",
                l("Datenschutz", "Data & privacy", "Datos y privacidad"),
              ],
            ].map(([id, title]) => (
              <button
                type="button"
                key={id}
                aria-current={accountSection === id ? "page" : undefined}
                aria-controls={`account-section-${id}`}
                onClick={() => setAccountSection(id)}
              >
                {title}
              </button>
            ))}
          </nav>
          <section
            id="account-section-library"
            hidden={accountSection !== "library"}
            className="account-library"
          >
            <h3>
              {l(
                "Deine gespeicherten Inhalte",
                "Your saved work",
                "Tu contenido guardado",
              )}
            </h3>
            <ul className="studio-account-documents">
              {documents.map((item) => (
                <li key={item.id}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.kind === "style" ? text("Stil") : text("Design")} ·{" "}
                      {new Date(item.updatedAt).toLocaleString(
                        l("de-DE", "en-GB", "es-ES"),
                      )}
                    </small>
                  </span>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        if (item.kind === "style") {
                          location.assign(
                            `/?view=studio&library=styles&style=${encodeURIComponent(item.id)}`,
                          );
                          onClose();
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
                    {item.kind === "style" ? text("Öffnen") : text("Öffnen")}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        if (
                          !window.confirm(
                            text(
                              "Nur diese Datei aus dem Konto löschen? Lokale Kopien bleiben erhalten.",
                            ),
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
                  >
                    {text("Löschen")}
                  </button>
                </li>
              ))}
            </ul>
            {!documents.length && (
              <p>{text("Noch keine Dateien in diesem Konto.")}</p>
            )}
            <details className="account-local-import">
              <summary>
                {l(
                  "Ältere Dateien von diesem Gerät übernehmen",
                  "Import older files from this device",
                  "Importar archivos anteriores de este dispositivo",
                )}
              </summary>
              <p className="studio-account-sync-note">
                {l(
                  "Übernimmt deine älteren lokalen Designs und Stile. Eigene Bild- und Schriftdateien bleiben auf diesem Gerät.",
                  "Copy your older local designs and styles to your account. Imported images and fonts stay on this device.",
                  "Copia tus diseños y estilos locales anteriores a tu cuenta. Las imágenes y fuentes importadas permanecen en este dispositivo.",
                )}
              </p>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => run(upload)}
              >
                {text("Lokale Designs und Stile im Konto sichern")}
              </button>
            </details>
            {PrivateResults && privateCapability && (
              <Suspense fallback={null}>
                <PrivateResults
                  key={user.id}
                  api={api}
                  l={l}
                  run={run}
                  busy={busy}
                  onClose={onClose}
                  consentVersion={privateCapability}
                />
              </Suspense>
            )}
          </section>
          <section
            id="account-section-security"
            hidden={accountSection !== "security"}
          >
            {accountSection === "security" && (
              <Suspense
                fallback={<p>{l("Wird geladen…", "Loading…", "Cargando…")}</p>}
              >
                <Security
                  user={user}
                  api={api}
                  run={run}
                  busy={busy}
                  refresh={refresh}
                  l={l}
                />
              </Suspense>
            )}
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api("/api/auth/request-password-reset", {
                    email: user.email,
                    redirectTo: resetReturnURL(locale),
                  });
                  setEmail(user.email);
                  setStatus(
                    l(
                      "Link zum Festlegen eines neuen Passworts angefordert. Schau in dein Postfach.",
                      "A link to set a new password has been requested. Check your inbox.",
                      "Se ha solicitado un enlace para crear una contraseña nueva. Revisa tu correo.",
                    ),
                  );
                  if (localOnly) await showMail();
                })
              }
            >
              {l(
                "Passwort festlegen oder ändern",
                "Set or change your password",
                "Crear o cambiar la contraseña",
              )}
            </button>
          </section>
          <section
            id="account-section-privacy"
            hidden={accountSection !== "privacy"}
            className="studio-account-management"
          >
            <h3>
              {l(
                "Deine Daten, deine Entscheidung",
                "Your data, your choice",
                "Tus datos, tú decides",
              )}
            </h3>
            <p>
              {l(
                "Lade eine Kopie deiner Kontodaten herunter oder lösche dein Konto. Deine gespeicherten Inhalte sind nicht öffentlich.",
                "Download a copy of your account data or delete your account. Your saved work is not public.",
                "Descarga una copia de tus datos o elimina tu cuenta. Tu contenido guardado no es público.",
              )}
            </p>
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const accountExport = await api("/api/account/export");
                  const privateResults = privateCapability
                    ? (await api("/api/account/private-results")).items
                    : [];
                  const url = URL.createObjectURL(
                    new Blob(
                      [
                        JSON.stringify(
                          {
                            ...accountExport,
                            privateResults,
                          },
                          null,
                          2,
                        ),
                      ],
                      { type: "application/json" },
                    ),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "pollframe-konto.json";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 30000);
                })
              }
            >
              {text("Kontodaten herunterladen")}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => setDeleting(!deleting)}
            >
              {text("Konto löschen…")}
            </button>
            {deleting && (
              <form
                className="studio-account-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const password = String(
                    new FormData(event.currentTarget).get(
                      "confirmationPassword",
                    ),
                  );
                  const factorCode = String(
                    new FormData(event.currentTarget).get("factorCode") || "",
                  );
                  const recoveryCode = String(
                    new FormData(event.currentTarget).get("recoveryCode") || "",
                  );
                  run(async () => {
                    await api("/api/auth/delete-user", {
                      password,
                      factorCode,
                      recoveryCode,
                    });
                    setUser(null);
                    setMode("email");
                    confirmedCode.current = "";
                    setPasswordSetup(false);
                    setShowPassword(false);
                    window.dispatchEvent(
                      new CustomEvent("pollframe-account-changed", {
                        detail: { signedIn: false },
                      }),
                    );
                    setDocuments([]);
                    setMail([]);
                    setDeleting(false);
                    setStatus(
                      text(
                        "Konto und gespeicherte Dateien gelöscht. Lokale Kopien auf deinem Gerät bleiben erhalten.",
                      ),
                    );
                    navigator.serviceWorker?.controller?.postMessage({
                      type: "POLLFRAME_LOGOUT",
                    });
                  });
                }}
              >
                <p>
                  {text(
                    "Dein Konto und seine gespeicherten Designs und Stile werden dauerhaft gelöscht. Dies lässt sich nicht rückgängig machen.",
                  )}
                </p>
                <label>
                  {text("Mit deinem Passwort bestätigen")}
                  <input
                    name="confirmationPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                    maxLength={128}
                  />
                </label>
                {user.twoFactorEnabled && (
                  <Suspense fallback={null}>
                    <FactorInput l={l} />
                  </Suspense>
                )}
                <button
                  type="submit"
                  className="secondary-button"
                  disabled={busy}
                >
                  {text("Konto endgültig löschen")}
                </button>
              </form>
            )}
          </section>
        </>
      )}
      {mail.length > 0 && (
        <details open>
          <summary>
            {text("Lokaler Test-Postausgang — keine echten E-Mails")}
          </summary>
          {mail
            .slice()
            .reverse()
            .filter(
              (item) =>
                !email.trim() ||
                item.to.toLowerCase() === email.trim().toLowerCase(),
            )
            .map((item) => (
              <p key={item.id}>
                {item.to} ·{" "}
                {item.kind === "code"
                  ? l(
                      "Bestätigungscode",
                      "Confirmation code",
                      "Código de confirmación",
                    )
                  : item.kind === "verify"
                    ? text("Bestätigung")
                    : text("Passwort zurücksetzen")}{" "}
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      if (item.kind === "code") {
                        setCode(item.otp);
                        setMode("code");
                        setMail([]);
                      } else if (item.kind === "reset") {
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
                          text(
                            "Testadresse bestätigt. Du kannst dich anmelden.",
                          ),
                        );
                      }
                    })
                  }
                >
                  {item.kind === "code"
                    ? l("Code übernehmen", "Use code", "Usar código")
                    : text("Link verwenden")}
                </button>
              </p>
            ))}
        </details>
      )}
    </Dialog>
  );
}
