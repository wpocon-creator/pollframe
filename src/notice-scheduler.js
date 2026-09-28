import { chooseNotice } from './notice-policy.js';

const entries = new Map(), seen = new Set();
let active = null, elapsed = 0, lastShown = -Infinity, lastTick = 0, timer;
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Memory prevents repeats too. */ } };
const seenKey = id => `pollframe-notice-seen:${id}`;
function saveSession() {
  try { sessionStorage.setItem('pollframe-notice-timing', JSON.stringify({ elapsed, lastShown: Number.isFinite(lastShown) ? lastShown : null })); } catch { /* Optional functional storage only. */ }
}
function tick() {
  const now = performance.now();
  if (document.visibilityState === 'visible') elapsed += Math.min(now - lastTick, 1500);
  lastTick = now;
  if (document.visibilityState !== 'visible') return;
  if (active) { write('pollframe-notice-active-until', String(Date.now() + 3000)); return; }
  const blocked = !!document.querySelector('dialog[open], [aria-modal="true"], [role="listbox"], [role="menu"], .studio-announcement');
  const wallGap = Date.now() - Number(read('pollframe-notice-last-shown') || 0);
  const studioLoading = new URLSearchParams(location.search).get('view') === 'studio' && !entries.has('studio-guide-v1');
  const id = chooseNotice([...entries].map(([id, entry]) => ({ ...entry, id, seen: seen.has(id) || read(seenKey(id)) === 'yes' || read(`pollframe-notice-dismissed:${id}`) === 'yes' })), { elapsed, lastShown, blocked: blocked || studioLoading || wallGap < 60000 || Number(read('pollframe-notice-active-until') || 0) > Date.now() });
  if (!id) return;
  active = id; seen.add(id); lastShown = elapsed;
  write('pollframe-notice-active-until', String(Date.now() + 3000));
  write(seenKey(id), 'yes'); write('pollframe-notice-last-shown', String(Date.now())); saveSession();
  entries.get(id)?.show();
}
export function registerNotice(id, { priority, delay, show }) {
  if (!timer) {
    try { const state = JSON.parse(sessionStorage.getItem('pollframe-notice-timing')); if (state && Number.isFinite(state.elapsed)) { elapsed = state.elapsed; lastShown = state.lastShown ?? -Infinity; } } catch { /* Fresh visit. */ }
    lastTick = performance.now(); timer = setInterval(() => {
      // Serialize cross-tab reservations where Web Locks is supported.
      if (navigator.locks?.request) navigator.locks.request('pollframe-notice-slot', { ifAvailable: true }, lock => { if (lock) tick(); }).catch(() => {});
      else tick();
    }, 500);
    window.addEventListener('pagehide', saveSession);
    document.addEventListener('visibilitychange', saveSession);
  }
  entries.set(id, { priority, delay, show });
  return () => { entries.delete(id); releaseNotice(id); };
}
export function releaseNotice(id) { if (active === id) { active = null; write('pollframe-notice-active-until', '0'); } }
