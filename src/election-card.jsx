import React, { useRef } from "react";
import { electionAge, electionTimestamp } from "./election-time.js";
import { electionText, electionStatus } from "./election-result.jsx";

export default function ElectionCard({ kind, title, locale, result, ShareTools, options, embed, children }) {
  const ref = useRef(null);
  const l = (...values) => electionText(locale, ...values);
  return <section ref={ref} className="election-result-card election-data-widget" id={`election-${kind}`} data-election-widget={kind}>
    {!embed && ShareTools && <ShareTools elementRef={ref} kind={kind} title={title} locale={locale} options={options} />}
    <time className="election-data-age" dateTime={result.publishedAt} title={electionTimestamp(result.publishedAt, locale)} data-election-time={electionTimestamp(result.publishedAt, locale)}>{l("Datenstand", "Source updated", "Datos actualizados")} {electionAge(result.publishedAt, locale)}</time>
    <p className="election-export-context">{l("Sachsen-Anhalt", "Saxony-Anhalt", "Sajonia-Anhalt")} · 2026 · {electionStatus(result, locale)}</p>
    {children}
  </section>;
}
