// Providers do not all return chronological rows. Never infer the previous
// measurement from array position, and never use a later poll as a baseline.
export function previousMeasurement(rows, date, matches = () => true) {
  return rows.reduce((latest, row) => row.date <= date && matches(row) && (!latest || row.date >= latest.date) ? row : latest, null);
}
