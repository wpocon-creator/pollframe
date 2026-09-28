import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { registerNotice, releaseNotice } from './notice-scheduler.js';
import { noticeEvent } from './notice-policy.js';
import { trackAggregateEvent } from './aggregateAnalytics.js';
import './notice.css';

export default function StudioAnnouncement({ id, children, onAction, action, closeLabel, priority = 10, delay = 8000 }) {
  const [visible, setVisible] = useState(false), [engaged, setEngaged] = useState(false), [top, setTop] = useState(80);
  const measured = useRef(false), finished = useRef(false);
  useEffect(() => registerNotice(id, { priority, delay, show() {
    measured.current = true; finished.current = false;
    setVisible(true); trackAggregateEvent(noticeEvent(id, 'shown'));
  } }), [id, priority, delay]);
  useLayoutEffect(() => {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const measure = () => setTop(Math.max(0, header.getBoundingClientRect().bottom) + 8);
    const observer = new ResizeObserver(measure); observer.observe(header); measure();
    return () => observer.disconnect();
  }, []);
  const finish = action => {
    if (finished.current) return;
    finished.current = true;
    if (action && measured.current) trackAggregateEvent(noticeEvent(id, action));
    if (action === 'dismissed') try { localStorage.setItem(`pollframe-notice-dismissed:${id}`, 'yes'); } catch { /* Optional preference. */ }
    setVisible(false); releaseNotice(id);
  };
  useEffect(() => {
    if (!visible || engaged) return;
    const timer = setTimeout(() => finish(), 16000);
    return () => clearTimeout(timer);
  }, [visible, engaged]);
  useEffect(() => {
    if (id !== 'studio-guide-v1' || !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return;
    const show = event => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'i' || event.repeat) return;
      if (event.target?.isContentEditable || event.target?.closest?.('input,textarea,select,dialog[open],[role="dialog"]') || document.querySelector('.studio-announcement')) return;
      event.preventDefault(); measured.current = false; finished.current = false; setVisible(true);
    };
    window.addEventListener('keydown', show); return () => window.removeEventListener('keydown', show);
  }, [id]);
  if (!visible) return null;
  return createPortal(<aside className="studio-announcement" data-notice={id} style={{ top }} aria-label={id === 'studio-guide-v1' ? 'Studio' : action}
    onMouseEnter={() => setEngaged(true)} onMouseLeave={() => setEngaged(false)}
    onFocus={() => setEngaged(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setEngaged(false); }}>
    <span className="studio-announcement-copy">{children}{' '}<button type="button" onClick={() => { finish('clicked'); onAction(); }}>{action} <span aria-hidden="true">↗</span></button></span>
    <button type="button" className="studio-announcement-close" aria-label={closeLabel} onClick={() => finish('dismissed')}>×</button>
  </aside>, document.body);
}
