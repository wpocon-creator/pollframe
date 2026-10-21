// Brief, bounded RAM reuse when switching Pollframe ↔ Studio. ONLY snapshots
// produced by public polling calculators belong here, never personal results,
// account files, imported assets or editor text. A fresh mount after 30 s reads
// the source again; nothing is persisted or sent to analytics.
const recent = new Map(),
  TTL = 30000,
  MAX = 4;
const PUBLIC_KINDS = new Set(['current','history','seats','map','tendencies']);
export function recentSnapshots(kind, now = Date.now()) {
  if (!PUBLIC_KINDS.has(kind)) return new Map();
  const result = new Map();
  for (const [id, item] of recent) {
    if (item.until <= now) {
      recent.delete(id);
      continue;
    }
    if (item.kind === kind) result.set(item.key, item.data);
  }
  return result;
}
export function rememberSnapshot(kind, key, data, now = Date.now()) {
  if (!PUBLIC_KINDS.has(kind)) throw new TypeError('Only public polling snapshots can be reused');
  const id = `${kind}:${key}`;
  recent.delete(id);
  recent.set(id, { kind, key, data, until: now + TTL });
  while (recent.size > MAX) recent.delete(recent.keys().next().value);
}
