export const NOTICE_IDS = ['studio-guide-v1', 'feedback-v1'];
export const noticeEvent = (id, action) => `notice_${id === 'studio-guide-v1' ? 'studio' : 'feedback'}_${action}`;
export const NOTICE_EVENTS = NOTICE_IDS.flatMap(id => ['shown', 'dismissed', 'clicked'].map(action => noticeEvent(id, action)));

// Shared slot; elapsed is visible browsing time, not background tab time.
export function chooseNotice(entries, { elapsed, lastShown = -Infinity, active = false, blocked = false }) {
  if (active || blocked || elapsed - lastShown < 60000) return null;
  return [...entries].filter(item => !item.seen && elapsed >= item.delay)
    .sort((a, b) => b.priority - a.priority)[0]?.id ?? null;
}
