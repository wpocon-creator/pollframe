// An emergency restore must happen with all account writes paused. Capture
// this boundary from the CURRENT live database before restoring an old backup.
// Never substitute an old backup/account download for this trusted boundary.
export async function accountRestoreBoundary(
  db,
  { accountsPaused = false, now = Date.now() } = {},
) {
  if (!accountsPaused)
    throw Error("Pause account writes before capturing a restore boundary");
  const users = await db.prepare('SELECT id FROM "user"').all();
  const documents = await db
    .prepare("SELECT owner,id FROM studio_document")
    .all();
  const privateResults = await db
    .prepare("SELECT owner,id FROM private_result")
    .all();
  const budgets = await db.prepare("SELECT period,n FROM mail_budget").all();
  return {
    format: "pollframe-restore-boundary-v1",
    capturedAt: now,
    users: users.results.map((x) => x.id),
    documents: documents.results,
    privateResults: privateResults.results,
    budgets: budgets.results,
  };
}
export async function reconcileAccountRestore(
  db,
  boundary,
  { accountsPaused = false, now = Date.now() } = {},
) {
  if (
    !accountsPaused ||
    boundary?.format !== "pollframe-restore-boundary-v1" ||
    !Number.isFinite(boundary.capturedAt) ||
    now < boundary.capturedAt ||
    now - boundary.capturedAt > 30 * 60_000
  )
    throw Error("A fresh trusted boundary and paused writes are required");
  const id = (value) =>
    typeof value === "string" && value.length > 0 && value.length <= 256;
  if (
    !Array.isArray(boundary.users) ||
    !boundary.users.every(id) ||
    !Array.isArray(boundary.documents) ||
    !Array.isArray(boundary.privateResults) ||
    !Array.isArray(boundary.budgets) ||
    ![...boundary.documents, ...boundary.privateResults].every(
      (x) => id(x?.owner) && id(x?.id),
    ) ||
    !boundary.budgets.every(
      (x) =>
        /^\d{4}-\d{2}(?:-\d{2})?$/.test(x?.period) &&
        Number.isSafeInteger(x.n) &&
        x.n >= 0,
    )
  )
    throw Error("Invalid restore boundary");
  const keepUsers = new Set(boundary.users),
    pair = (x) => JSON.stringify([x.owner, x.id]);
  const restoredUsers = (await db.prepare('SELECT id FROM "user"').all())
    .results;
  const commands = [];
  for (const user of restoredUsers)
    if (!keepUsers.has(user.id))
      commands.push(db.prepare('DELETE FROM "user" WHERE id=?').bind(user.id));
  for (const [table, keep] of [
    ["studio_document", boundary.documents],
    ["private_result", boundary.privateResults],
  ]) {
    const keys = new Set(keep.map(pair));
    for (const item of (await db.prepare(`SELECT owner,id FROM ${table}`).all())
      .results)
      if (!keys.has(pair(item)))
        commands.push(
          db
            .prepare(`DELETE FROM ${table} WHERE owner=? AND id=?`)
            .bind(item.owner, item.id),
        );
  }
  // Restored credentials may contain an old password. Removing them forces
  // fresh inbox proof/reset instead of silently reinstating an old password.
  commands.push(
    db.prepare("DELETE FROM session"),
    db.prepare("DELETE FROM verification"),
    db.prepare("DELETE FROM account"),
  );
  // Restore the CURRENT pre-restore mail counts, not only old backup counts,
  // so recovery never grants a second free-tier mail allowance.
  for (const { period, n } of boundary.budgets)
    commands.push(
      db
        .prepare(
          "INSERT INTO mail_budget(period,n) VALUES(?,?) ON CONFLICT(period) DO UPDATE SET n=MAX(n,excluded.n)",
        )
        .bind(period, n),
    );
  await db.batch(commands);
  return {
    reconciled: true,
    sessionsRevoked: true,
    inboxRecoveryRequired: true,
    mailBudgetPreserved: true,
  };
}
