import React, { useEffect, useRef, useState } from "react";
import { validateAssistantPlan } from "./studio-assistant-contract.js";
import { STUDIO_TEMPLATES } from "./studio-model.js";
import "./studio-assistant.css";
import {
  browserAssistantPlan,
  assistantSuggestions,
} from "./studio-intent-assistant.js";
export default function StudioAssistant({
  state,
  snapshot,
  onApply,
  l,
  gallery = false,
  messages,
  setMessages,
  onCollapse,
}) {
  const localModel =
    ["127.0.0.1", "localhost"].includes(location.hostname) &&
    new URLSearchParams(location.search).get("localAI") === "1";
  const [status, setStatus] = useState(
      localModel
        ? null
        : { available: true, model: "Pollframe Intent · Browser" },
    ),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef(null),
    latest = useRef(state),
    scroll = useRef(null);
  latest.current = state;
  useEffect(() => {
    if (!localModel) return;
    let alive = true;
    fetch("/api/studio-assistant/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (alive) setStatus(s);
      })
      .catch(() => {
        if (alive) setStatus({ available: false });
      });
    return () => {
      alive = false;
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages, busy, error]);
  async function send(e, suggestedMessage) {
    e.preventDefault();
    const message = (suggestedMessage ?? input).trim();
    if (!message || busy || !status?.available) return;
    const original = JSON.stringify(state),
      controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setInput("");
    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.text }));
    setMessages((v) => [...v, { role: "user", text: message }]);
    const events = (snapshot?.eventCatalogue || snapshot?.events || []).filter(
      (e) =>
        !snapshot?.start ||
        (e.date >= snapshot.start && e.date <= snapshot.end),
    );
    const terms = snapshot?.availableTerms || [];
    try {
      const response = localModel
        ? await fetch("/api/studio-assistant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              message,
              history,
              state,
              events: events.map((e) => ({
                id: e.id,
                label: e.label,
                date: e.date,
              })),
              terms,
              device: `${innerWidth}×${innerHeight}; ${matchMedia("(pointer:coarse)").matches ? "touch" : "mouse"}; ${innerWidth < 768 ? "phone, no editor" : "desktop/tablet"}`,
              gallery,
            }),
          })
        : null;
      if (response && !response.ok) throw Error("service");
      // Only use a previous, confirmed edit as referent while its values remain
      // active. Manual changes and Undo must not create stale "make it bigger" actions.
      const previousEdit =
        messages.findLast((m) => m.confirmed && m.appliedPatch)?.appliedPatch ||
        {};
      const lastPatch = Object.fromEntries(
        Object.entries(previousEdit).filter(
          ([key, value]) => state[key] === value,
        ),
      );
      const result = response
        ? await response.json()
        : {
            plan: browserAssistantPlan(message, state, {
              events,
              terms,
              gallery,
              lastPatch,
              device: String(innerWidth),
            }),
          };
      if (controller.signal.aborted) return;
      if (JSON.stringify(latest.current) !== original) throw Error("stale");
      const valid = validateAssistantPlan(result.plan, state, {
        eventIds: events.map((e) => e.id),
        termIds: terms.map((t) => t.id),
      });
      if (valid.kind !== "edit") {
        setMessages((v) => [
          ...v,
          {
            role: "assistant",
            text: valid.message,
            suggestions:
              !localModel && valid.kind === "clarify"
                ? assistantSuggestions(message, state.lang)
                : [],
          },
        ]);
        return;
      }
      if (!Object.keys(valid.patch).length) {
        setMessages((v) => [
          ...v,
          {
            role: "assistant",
            text: l(
              "Diese Einstellungen sind bereits aktiv.",
              "These settings are already active.",
              "Estos ajustes ya están activos.",
            ),
          },
        ]);
        return;
      }
      await onApply(valid.patch);
      // Confirm against committed React state, not the model's success claim.
      const until = performance.now() + 8000;
      let confirmed = false;
      while (performance.now() < until) {
        await new Promise((r) => setTimeout(r, 80));
        try {
          const current = JSON.parse(
            document.querySelector("[data-assistant-state]")?.dataset
              .assistantState || "null",
          );
          if (
            current &&
            Object.entries(valid.patch).every(
              ([k, v]) => JSON.stringify(current[k]) === JSON.stringify(v),
            )
          ) {
            confirmed = true;
            break;
          }
        } catch {}
      }
      const changes = Object.entries(valid.patch).map(
        ([key, value]) =>
          `${key}: ${key === "template" ? STUDIO_TEMPLATES.find((t) => t.id === value)?.name[state.lang === "de" ? 0 : state.lang === "es" ? 2 : 1] || value : value}`,
      );
      setMessages((v) => [
        ...v,
        {
          role: "assistant",
          text: confirmed
            ? l(
                "Die Einstellungen sind angewendet. Du kannst sie mit Rückgängig zurücknehmen. Werte und Quellen bleiben unverändert.",
                "The settings are applied. You can undo them. Values and sources remain unchanged.",
                "Los ajustes están aplicados. Puedes deshacerlos. Los valores y las fuentes no cambian.",
              )
            : l(
                "Die Einstellungen wurden übergeben, aber die fertige Darstellung konnte ich noch nicht bestätigen. Bitte prüfe die Vorschau.",
                "Settings were submitted, but I could not confirm the finished view yet. Please check the preview.",
                "Se enviaron los ajustes, pero todavía no pude confirmar la vista final. Comprueba la vista previa.",
              ),
          changes,
          confirmed,
          appliedPatch: confirmed ? valid.patch : undefined,
        },
      ]);
    } catch (err) {
      setError(
        err.name === "AbortError"
          ? l(
              "Abgebrochen. Kein KI-Vorschlag übernommen.",
              "Cancelled. No AI proposal applied.",
              "Cancelado. No se aplicó ninguna propuesta.",
            )
          : err.message === "stale"
            ? l(
                "Du hast inzwischen selbst etwas geändert. Der KI-Vorschlag wurde deshalb nicht übernommen.",
                "You made changes while I was working, so I did not apply the AI proposal.",
                "Has cambiado el diseño mientras trabajaba. No se aplicó la propuesta.",
              )
            : l(
                "Keine gültige Antwort erhalten. Dein Design wurde nicht verändert. Bitte erneut versuchen.",
                "No valid response received. Your design was not changed. Please try again.",
                "No se recibió una respuesta válida. Tu diseño no cambió. Inténtalo de nuevo.",
              ),
      );
    } finally {
      setBusy(false);
      request.current = null;
    }
  }
  return (
    <aside
      className="studio-assistant"
      aria-label={l("KI-Assistent", "AI assistant", "Asistente de IA")}
    >
      <header>
        <strong>
          {l("Studio-Assistent", "Studio assistant", "Asistente de Studio")}
        </strong>
        {onCollapse && (
          <button
            className="icon-button"
            onClick={onCollapse}
            aria-label={l(
              "Assistent minimieren",
              "Minimise assistant",
              "Minimizar asistente",
            )}
          >
            −
          </button>
        )}
      </header>
      <small className="studio-assistant-disclosure">
        {status?.model || "Lokale KI · Qwen"} ·{" "}
        {l(
          "Begrenzter Gestaltungsassistent",
          "Limited design assistant",
          "Asistente de diseño limitado",
        )}
      </small>
      <div
        className="studio-assistant-messages"
        ref={scroll}
        role="log"
        aria-live="polite"
      >
        {!messages.length && (
          <p>
            {l(
              "Welche Grafik möchtest du gestalten? Ich kann Einstellungen anpassen oder dir zeigen, wo du sie findest.",
              "What would you like to create? I can adjust settings or explain where to find them.",
              "¿Qué gráfica quieres crear? Puedo ajustar el diseño o explicar dónde encontrar las opciones.",
            )}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`studio-assistant-message is-${m.role}`}>
            <p>{m.text}</p>
            {m.suggestions?.length > 0 && i === messages.length - 1 && (
              <div
                className="studio-assistant-suggestions"
                aria-label={l(
                  "Passende Hilfe",
                  "Related help",
                  "Ayuda relacionada",
                )}
              >
                {m.suggestions.map((suggestion) => (
                  <button
                    type="button"
                    className="secondary-button"
                    key={suggestion.label}
                    disabled={busy}
                    onClick={(e) => send(e, suggestion.text)}
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            )}
            {m.changes && (
              <details>
                <summary>
                  {l(
                    "Geänderte Einstellungen",
                    "Changed settings",
                    "Ajustes modificados",
                  )}
                </summary>
                <ul>
                  {m.changes.map((c, j) => (
                    <li key={j}>{c}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
        {busy && (
          <p role="status">
            {l(
              "Ich prüfe die Einstellungen und übernehme sie in die Vorschau…",
              "Checking settings and applying them to the preview…",
              "Comprobando los ajustes y aplicándolos a la vista previa…",
            )}
          </p>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
      {!status?.available && (
        <p className="studio-assistant-offline">
          {l(
            "Lokales Modell nicht bereit. Starte den Studio-KI-Dienst auf diesem Rechner; der normale Editor funktioniert weiterhin.",
            "Local model not ready. Start the Studio AI service on this computer; the manual editor still works.",
            "Modelo local no disponible. Inicia el servicio de IA en este equipo; el editor manual sigue funcionando.",
          )}
        </p>
      )}
      <form onSubmit={send}>
        <textarea
          aria-label={l(
            "Nachricht an den Studio-Assistenten",
            "Message the Studio assistant",
            "Mensaje al asistente de Studio",
          )}
          placeholder={l(
            "Zum Beispiel: moderner Verlauf für einen Zeitungsartikel…",
            "For example: a modern timeline for a news article…",
            "Por ejemplo: una evolución moderna para un artículo…",
          )}
          rows={3}
          maxLength={2000}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              send(e);
            }
          }}
        />
        <div>
          {busy ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => request.current?.abort()}
            >
              {l("Abbrechen", "Cancel", "Cancelar")}
            </button>
          ) : (
            <button
              className="primary-button"
              disabled={!input.trim() || !status?.available}
            >
              {l("Senden", "Send", "Enviar")}
            </button>
          )}
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={() => setMessages([])}
          >
            {l("Leeren", "Clear", "Vaciar")}
          </button>
        </div>
      </form>
      <small>
        {l(
          "Läuft im Browser. Erkennt Gestaltungswünsche, kein allgemeines Sprachmodell. Kein Bildgenerator.",
          "Runs in your browser. Recognises design requests; not a general language model. No image generator.",
          "Funciona en tu navegador. Reconoce peticiones de diseño; no es un modelo de lenguaje general. Sin generador de imágenes.",
        )}
      </small>
    </aside>
  );
}
