// Explicit columns: account downloads must never expose passwords, session
// tokens, OAuth credentials, verification values or another owner's records.
export async function exportAccountData(db, owner) {
  const profile = await db
    .prepare(
      'SELECT id,name,email,emailVerified,twoFactorEnabled,createdAt,updatedAt FROM "user" WHERE id=?',
    )
    .bind(owner)
    .first();
  const documents = await db
    .prepare(
      "SELECT id,kind,name,payload,updated_at FROM studio_document WHERE owner=? ORDER BY updated_at DESC",
    )
    .bind(owner)
    .all();
  const sessions = await db
    .prepare(
      "SELECT createdAt,updatedAt,expiresAt,ipAddress,userAgent FROM session WHERE userId=? ORDER BY createdAt DESC",
    )
    .bind(owner)
    .all();
  const notices = await db
    .prepare(
      "SELECT notice,shown_at FROM account_notice WHERE owner=? ORDER BY shown_at",
    )
    .bind(owner)
    .all();
  return {
    format: "pollframe-account-export-v1",
    exportedAt: new Date().toISOString(),
    profile,
    documents: documents.results.map(({ payload, updated_at, ...item }) => ({
      ...item,
      payload: JSON.parse(payload),
      updatedAt: updated_at,
    })),
    sessions: sessions.results,
    notices: notices.results,
  };
}

export async function removeAccountVerifications(db, user) {
  await db
    .prepare(
      "DELETE FROM verification WHERE identifier=? OR (identifier LIKE 'reset-password:%' AND value=?)",
    )
    .bind(`sign-in-otp-${user.email.toLowerCase()}`, user.id)
    .run();
}
