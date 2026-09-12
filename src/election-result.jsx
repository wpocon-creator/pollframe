import React, { useEffect, useState } from "react";
import { InfoPopover } from "./pollframe-ui.jsx";
import "./election-result.css";
import { electionAge, electionTimestamp, electionRemaining } from "./election-time.js";

export const electionText = (locale, de, en, es) =>
  locale === "de" ? de : locale === "es" ? es : en;
export function useElectionResult(archive = false) {
  const [result, setResult] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function refresh() {
      if (document.hidden) return;
      try {
        const response = await fetch(
          "/api/elections/sachsen-anhalt-2026" + (archive ? "?archive=1" : ""),
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) throw new Error("unavailable");
        const payload = await response.json(),
          value = payload.result;
        const valid =
          value &&
          Array.isArray(value.rows) &&
          (archive || Date.parse(value.expiresAt) > Date.now());
        if (active) {
          setResult(valid ? value : null);
          setError(false);
        }
      } catch {
        if (active) {
          setError(true);
          setResult((previous) =>
            previous ? { ...previous, stale: true } : null,
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    refresh();
    const timer = setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [archive]);
  return { result, loading, error };
}
export function electionStatus(result, locale) {
  return result.status === "partial"
    ? electionText(
        locale,
        "Amtlicher Zwischenstand",
        "Official partial count",
        "Recuento oficial parcial",
      )
    : result.status === "final"
      ? electionText(
          locale,
          "Endgültiges Wahlergebnis",
          "Final election result",
          "Resultado electoral definitivo",
        )
      : electionText(
          locale,
          "Vorläufiges Wahlergebnis",
          "Provisional election result",
          "Resultado electoral provisional",
        );
}
export default function ElectionResult({ locale = "de" }) {
  const { result } = useElectionResult();
  const [now, setNow] = useState(Date.now);
  const expiresAt = result?.expiresAt;
  useEffect(() => {
    if (!expiresAt || Date.now() >= Date.parse(expiresAt)) return;
    const tick = () => { if (!document.hidden) setNow(Date.now()); };
    tick();
    const timer = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [expiresAt]);
  if (!result || !Number.isFinite(Date.parse(expiresAt)) || now >= Date.parse(expiresAt)) return null;
  const l = (...text) => electionText(locale, ...text);
  return (
    <section className="federal-entry overview-classic-widget election-result-card election-teaser">
      <InfoPopover label="Info" closeLabel={l("Schließen", "Close", "Cerrar")}>
        <p>
          {l(
            "Temporäre Sonderanzeige zur Landtagswahl vom 6. September 2026. Sie verschwindet fünf Tage nach der ersten Datenübernahme. Amtliche Auszählung, keine Umfrage oder Hochrechnung. Ergebnisse, Quellen und Vergleichsmethode stehen auf der Detailseite.",
            "Temporary coverage of the state election on 6 September 2026. The notice disappears five days after the first import. Official count, not a poll or projection. Results, sources and comparison methods are on the detail page.",
            "Cobertura temporal de las elecciones regionales del 6 de septiembre de 2026. El aviso desaparece cinco días después de la primera importación. Recuento oficial, no encuesta ni proyección. Los resultados, fuentes y métodos están en la página de detalles.",
          )}
        </p>
      </InfoPopover>
      <div className="election-teaser-copy"><span className="election-temporary">
        EVENT
      </span>
      <h2>
        <a href={"/?view=election-st2026&lang=" + locale}>
          {l(
            "Sachsen-Anhalt hat gewählt",
            "Saxony-Anhalt has voted",
            "Sajonia-Anhalt ha votado",
          )}{" "}
          <span aria-hidden="true">→</span>
        </a>
      </h2>
      <p>
        {electionStatus(result, locale)}
        {result.status === "partial"
          ? " · " + result.counted + "/" + result.total
          : ""}
        {result.stale
          ? " · " +
            l(
              "Aktualisierung ausstehend",
              "Update pending",
              "Actualización pendiente",
            )
          : ""}
      </p>
      </div>
      <div className="election-teaser-countdown" role="timer" aria-live="off"
        aria-label={l("Event noch verfügbar: ", "Event available for: ", "Evento disponible durante: ") + electionRemaining(expiresAt, locale, now)}
        title={l("Diese Event-Anzeige endet am ", "This event notice ends on ", "Este aviso termina el ") + electionTimestamp(expiresAt, locale)}>
        <span className="election-countdown-caption">{l("Noch verfügbar", "Time remaining", "Tiempo restante")}</span>
        <span className="election-countdown-clock">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          {electionRemaining(expiresAt, locale, now)}
        </span>
      </div>
      <div className="election-teaser-recency"><time dateTime={result.publishedAt} title={electionTimestamp(result.publishedAt, locale)}>{l("Datenstand", "Source updated", "Datos actualizados")} {electionAge(result.publishedAt, locale)}</time></div>
    </section>
  );
}
