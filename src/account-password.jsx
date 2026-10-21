import React, { useEffect, useId, useRef, useState } from "react";
import bundledWorkerUrl from "./password-strength-worker.js?worker&url";
let workerPolicy;
function workerSource() {
  const url = new URL(bundledWorkerUrl, import.meta.url).href;
  if (!globalThis.trustedTypes) return url;
  workerPolicy ||= trustedTypes.createPolicy("pollframe-password-worker", {
    createScriptURL(value) {
      if (value !== url || new URL(value).origin !== location.origin)
        throw new TypeError("Unexpected password worker");
      return value;
    },
  });
  return workerPolicy.createScriptURL(url);
}

// Dictionaries load only while choosing a NEW password, never at page startup
// or for existing sign-in passwords. No telemetry, persistence or external API.
export default function NewPassword({
  l,
  label,
  email = "",
  name = "password",
  id: suppliedId,
  disabled = false,
  onValidityChange,
}) {
  const generatedId = useId(),
    id = suppliedId || generatedId;
  const input = useRef(null),
    checker = useRef(null),
    revision = useRef(0),
    timer = useRef(null);
  const [result, setResult] = useState(null),
    [visible, setVisible] = useState(false),
    [failed, setFailed] = useState(false);
  const evaluate = () => {
    if (!input.current) return;
    const value = input.current.value;
    setResult(null);
    onValidityChange?.(false);
    const currentRevision = ++revision.current;
    clearTimeout(timer.current);
    input.current.setCustomValidity(
      !value
        ? ""
        : l(
            "Wähle ein längeres, weniger vorhersehbares Passwort (mindestens 15 Zeichen).",
            "Choose a longer, less predictable password (at least 15 characters).",
            "Elige una contraseña más larga y menos predecible (al menos 15 caracteres).",
          ),
    );
    timer.current = setTimeout(
      () =>
        checker.current?.postMessage({
          id: currentRevision,
          password: value,
          email,
        }),
      120,
    );
  };
  useEffect(() => {
    let worker;
    try {
      worker = new Worker(workerSource(), { type: "module" });
    } catch {
      setFailed(true);
      onValidityChange?.(false);
      return;
    }
    checker.current = worker;
    worker.onmessage = ({ data }) => {
      if (data.id !== revision.current || !input.current) return;
      setResult(input.current.value ? data.result : null);
      onValidityChange?.(data.result.accepted);
      input.current.setCustomValidity(
        data.result.accepted || !input.current.value
          ? ""
          : l(
              "Wähle ein längeres, weniger vorhersehbares Passwort (mindestens 15 Zeichen).",
              "Choose a longer, less predictable password (at least 15 characters).",
              "Elige una contraseña más larga y menos predecible (al menos 15 caracteres).",
            ),
      );
    };
    worker.onerror = () => setFailed(true);
    evaluate();
    return () => {
      checker.current = null;
      clearTimeout(timer.current);
      worker.terminate();
    };
  }, [email]);
  const description = !input.current?.value
    ? l(
        "Eine ungewöhnliche Wortfolge oder ein Passwortmanager hilft. Keine Sonderzeichenpflicht.",
        "Try an unusual phrase or a password manager. No special characters required.",
        "Prueba una frase poco habitual o un gestor. No se exigen caracteres especiales.",
      )
    : !result
      ? l(
          "Stärke wird geprüft…",
          "Checking strength…",
          "Comprobando seguridad…",
        )
      : result.reason === "length"
        ? l(
            "Noch zu kurz – verwende mindestens 15 Zeichen.",
            "Too short – use at least 15 characters.",
            "Demasiado corta: usa al menos 15 caracteres.",
          )
        : result.accepted
          ? l(
              "Gute Wahl. Die Stärke ist eine Schätzung, keine Garantie.",
              "Good choice. Strength is an estimate, not a guarantee.",
              "Buena elección. Es una estimación, no una garantía.",
            )
          : l(
              "Zu leicht zu erraten. Ergänze ungewöhnliche Wörter statt nur Zahlen oder Zeichen.",
              "Too predictable. Add unusual words, not just numbers or symbols.",
              "Demasiado predecible. Añade palabras poco habituales, no solo números o símbolos.",
            );
  return (
    <div className="studio-account-field account-new-password">
      <label htmlFor={id}>{label}</label>
      <span className="studio-password-input">
        <input
          ref={input}
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          minLength={15}
          maxLength={128}
          required
          disabled={disabled}
          onInput={evaluate}
          onChange={evaluate}
          aria-describedby={`${id}-strength`}
        />
        <button
          type="button"
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          aria-label={
            visible
              ? l("Passwort verbergen", "Hide password", "Ocultar contraseña")
              : l("Passwort anzeigen", "Show password", "Mostrar contraseña")
          }
        >
          {visible
            ? l("Verbergen", "Hide", "Ocultar")
            : l("Anzeigen", "Show", "Mostrar")}
        </button>
      </span>
      <div
        className="account-password-strength"
        id={`${id}-strength`}
        aria-live="polite"
        data-score={
          result?.accepted ? result.score : Math.min(result?.score || 0, 2)
        }
      >
        <div className="account-strength-bars" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              data-filled={Boolean(result && i < Math.max(1, result.score))}
            />
          ))}
        </div>
        <span>
          {failed
            ? l(
                "Stärkeprüfung nicht geladen. Bitte öffne dieses Fenster erneut.",
                "Strength checker did not load. Please reopen this window.",
                "No se cargó la comprobación. Vuelve a abrir esta ventana.",
              )
            : description}
        </span>
      </div>
      <a
        className="account-password-credits"
        href="/licenses/password-strength.txt"
        target="_blank"
        rel="noreferrer"
      >
        {l(
          "Passwortprüfung: zxcvbn · Wörterlisten & Lizenz",
          "Password check: zxcvbn · word lists & licence",
          "Comprobación: zxcvbn · listas y licencia",
        )}
      </a>
    </div>
  );
}
