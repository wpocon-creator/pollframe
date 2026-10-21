// Called by the daily account cron, never by an unauthenticated HTTP endpoint.
// Better Auth's current D1 adapter uses ISO dates; tolerate numeric millisecond
// dates from older migrations too. Unknown formats fail closed (are retained).
const milliseconds = field => `(CASE WHEN typeof("${field}") IN ('integer','real') THEN "${field}" ELSE (julianday("${field}")-2440587.5)*86400000 END)`;
export async function cleanupAccounts(db, now = Date.now()) {
  if (!Number.isFinite(now) || now <= 0) throw Error("Invalid account cleanup time");
  const day = 86_400_000;
  const oldBudget = new Date(now - 90 * day).toISOString().slice(0,10);
  const statements = [
    db.prepare(`DELETE FROM session WHERE ${milliseconds("expiresAt")} < ?`).bind(now),
    db.prepare(`DELETE FROM verification WHERE ${milliseconds("expiresAt")} < ?`).bind(now),
    // Retain a full day: never shorten even the longest current one-hour limit.
    db.prepare('DELETE FROM rateLimit WHERE lastRequest < ?').bind(now-day),
    db.prepare('DELETE FROM mail_budget WHERE period < ?').bind(oldBudget),
    db.prepare(`DELETE FROM user WHERE emailVerified=0 AND ${milliseconds("createdAt")} < ?`).bind(now-7*day),
  ];
  const results = await db.batch(statements);
  // Counts only. Never expose user IDs, addresses, tokens, IPs or document names.
  return Object.fromEntries(["expiredSessions","expiredVerifications","oldRateLimits","oldBudgets","unverifiedAccounts"].map((name,index)=>[name,results[index].meta.changes]));
}
