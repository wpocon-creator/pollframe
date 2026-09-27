export function wrapEventLines(value, maxCharacters) {
  const words = String(value ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .flatMap((word) =>
        Array.from(
          word.matchAll(new RegExp(`.{1,${maxCharacters}}`, "gu")),
          (match) => match[0],
        ),
      ),
    lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || candidate.length <= maxCharacters) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}
export function eventLabelMetrics(
  label,
  { compact = false, width = 960 } = {},
) {
  const labelLines = wrapEventLines(
      label,
      compact ? 22 : width < 980 ? 27 : 30,
    ),
    longest = Math.max(...labelLines.map((s) => s.length));
  return {
    label,
    labelLines,
    labelWidth: Math.min(
      compact ? 215 : width < 980 ? 250 : 290,
      Math.max(compact ? 118 : 134, longest * (compact ? 6.5 : 6.85) + 30),
    ),
    labelHeight: 18 + labelLines.length * 15,
  };
}
