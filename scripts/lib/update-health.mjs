export function needsFreshnessFailure(row) {
  if (["missing", "future", "manual-snapshot"].includes(row.status))
    return true;
  // These are frequent national series. A successful HTTP download of a frozen
  // file must not turn a month-long outage green. Sparse regions stay warnings.
  return (
    row.status === "stale" && ["de", "uk", "es", "es/issues"].includes(row.id)
  );
}
