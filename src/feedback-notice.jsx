import React from 'react';
import StudioAnnouncement from './studio-announcement.jsx';
export default function FeedbackNotice({ locale, href }) {
  const query = new URLSearchParams(location.search);
  if (query.has('page') || query.has('account') || query.has('token') || query.has('embed') || /\/(?:pf-ops|api|sources|editorial-standards)/.test(location.pathname)) return null;
  const copy = locale === 'de' ? ['Eine Idee oder etwas entdeckt?', 'Feedback geben', 'Hinweis schließen'] : locale === 'es' ? ['¿Una idea o algo que mejorar?', 'Enviar comentarios', 'Cerrar aviso'] : ['An idea or something we could improve?', 'Share feedback', 'Dismiss notice'];
  return <StudioAnnouncement id="feedback-v1" priority={1} delay={60000} action={copy[1]} closeLabel={copy[2]} onAction={() => { location.href = href; }}>{copy[0]}</StudioAnnouncement>;
}
