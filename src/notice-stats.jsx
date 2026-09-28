import React from 'react';
export default function NoticeStats({ days = {}, locale = 'en-GB' }) {
  const de = locale === 'de';
  const totals = Object.entries(days).filter(([day]) => Date.now() - Date.parse(`${day}T23:59:59Z`) < 7 * 86400000).reduce((sum, [, counts]) => {
    for (const [key, value] of Object.entries(counts)) sum[key] = (sum[key] || 0) + value;
    return sum;
  }, {});
  const percentage = (value, total) => total ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / total * 100)} %` : '—';
  return <article className="notice-stats"><h3>{de ? 'Informationshinweise · letzte 7 Tage' : 'Informative notices · last 7 days'}</h3>
    <table><thead><tr><th>{de ? 'Hinweis' : 'Notice'}</th><th>{de ? 'Angezeigt' : 'Shown'}</th><th>{de ? 'Per X geschlossen' : 'Dismissed with X'}</th><th>{de ? 'Link geöffnet' : 'Link clicked'}</th></tr></thead><tbody>
      {[['studio', 'Studio-Video'], ['feedback', 'Feedback']].map(([id, label]) => {
        const shown = totals[`notice_${id}_shown`] || 0, closed = totals[`notice_${id}_dismissed`] || 0, clicked = totals[`notice_${id}_clicked`] || 0;
        return <tr key={id}><td>{label}</td><td>{shown}</td><td>{closed} · {percentage(closed, shown)}</td><td>{clicked} · {percentage(clicked, shown)}</td></tr>;
      })}
    </tbody></table><p className="analytics-privacy-note">{de ? 'Prozente beziehen sich auf erfasste Einblendungen, nicht auf Personen. Automatisches Ausblenden zählt nicht als Schließen. Linkklick heißt nicht, dass Feedback abgeschickt oder das Video angesehen wurde. Keine rückwirkenden Daten; Opt-out und blockierte Anfragen können Zähler unvollständig machen.' : 'Percentages are relative to recorded impressions, not people. Auto-hide is not a dismissal. Clicking does not prove a report was submitted or a video watched. No historical backfill; opt-outs and blocked requests can leave counts incomplete.'}</p>
  </article>;
}
