// Prefer one row when every label has a readable slot; otherwise split the
// ranking into two rows whose counts differ by at most one.
export function columnPlan(count, width, minimum = 108, gap = 12) {
  if (count <= 1) return { columns: 1, rows: 1 };
  const fits = count * minimum + (count - 1) * gap <= width;
  return { columns: fits ? count : Math.ceil(count / 2), rows: fits ? 1 : 2 };
}
