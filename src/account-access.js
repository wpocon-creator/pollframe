// Loaded with the account dialog, never by the ordinary country-page header.
import { useEffect, useState } from "react";

export function useAccountWait() {
  const [resendAt, setResendAt] = useState(0);
  const [deadlines, setDeadlines] = useState({});
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const end = Math.max(resendAt, ...Object.values(deadlines));
    if (end <= Date.now()) return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= end) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendAt, deadlines]);
  const waitFor = (path) =>
    Math.max(0, Math.ceil(((deadlines[path] || 0) - now) / 1000));
  return {
    waitFor,
    resendWait: Math.max(
      0,
      Math.ceil((resendAt - now) / 1000),
      waitFor("/api/auth/email-otp/send-verification-otp"),
    ),
    startResend() {
      const time = Date.now();
      setNow(time);
      setResendAt(time + 60000);
    },
    recordLimit(error) {
      if (error.code !== "TOO_MANY_REQUESTS" || !error.path) return;
      const time = Date.now();
      setNow(time);
      setDeadlines((old) => ({
        ...old,
        [error.path]: time + (error.retryAfter || 60) * 1000,
      }));
    },
  };
}

export async function accountApi(path, body, method = body ? "POST" : "GET") {
  if (!/^\/api\/(?:account|auth)\//.test(path))
    throw Error("Invalid account endpoint");
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      "Content-Type": "application/json",
      ...(path === "/api/account/test-outbox" &&
      location.hostname === "127.0.0.1"
        ? { "X-Pollframe-Lab": "1" }
        : {}),
      "Accept-Language": document.documentElement.lang || "en",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || (result === null && path !== "/api/auth/get-session")) {
    const error = Error(
      result?.message ||
        result?.error ||
        "Der Kontodienst ist gerade nicht erreichbar. Bitte später erneut versuchen.",
    );
    error.code = result?.code || result?.error;
    if (response.status === 429) {
      error.code = "TOO_MANY_REQUESTS";
      const after = response.headers.get("retry-after");
      const seconds = /^\d+$/.test(after || "")
        ? Number(after)
        : (Date.parse(after) - Date.now()) / 1000;
      error.retryAfter = Math.min(3600, Math.max(1, Math.ceil(seconds || 60)));
      error.path = path;
    }
    throw error;
  }
  return result;
}

export function accountAccessError(error, l) {
  const messages = {
    SESSION_NOT_RETAINED: [
      "Die Anmeldung konnte nicht gespeichert werden. Erlaube Cookies für Pollframe und versuche es in Safari, Chrome oder Firefox erneut.",
      "Your sign-in could not be kept. Allow cookies for Pollframe and try again in Safari, Chrome or Firefox.",
      "No se ha podido mantener tu sesión. Permite las cookies de Pollframe e inténtalo en Safari, Chrome o Firefox.",
    ],
    PASSWORD_LOGIN_REQUIRED: [
      "Für diese Adresse gibt es bereits ein Konto. Melde dich mit deinem Passwort an oder setze es zurück.",
      "This address already has an account. Sign in with your password, or reset it if needed.",
      "Esta dirección ya tiene una cuenta. Accede con tu contraseña o restablécela si lo necesitas.",
    ],
    EMAIL_NOT_VERIFIED: [
      "Bitte bestätige zuerst deine E-Mail-Adresse. Du kannst unten eine neue Bestätigung anfordern.",
      "Please verify your email address first. You can request another verification below.",
      "Verifica primero tu correo. Puedes solicitar otra confirmación a continuación.",
    ],
  };
  return messages[error.code] ? l(...messages[error.code]) : null;
}
