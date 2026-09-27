// Shared, bounded, offline query matching. No telemetry and no model download.
export const normalizeSearch = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function searchDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  if (a.length === b.length) {
    const different = [...a].flatMap((c, i) => (c === b[i] ? [] : [i]));
    if (
      different.length === 2 &&
      different[1] === different[0] + 1 &&
      a[different[0]] === b[different[1]] &&
      a[different[1]] === b[different[0]]
    )
      return 1;
  }
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        next[j - 1] + 1,
        row[j] + 1,
        row[j - 1] + Number(a[i - 1] !== b[j - 1]),
      );
    if (Math.min(...next) > 2) return 3;
    row = next;
  }
  return row[b.length];
}
const ignored = new Set(
  "eine einen ein der die das fur mit und the a an for with and un una el la los las para con y grafik graphic graphics grafico grafica diagramm chart".split(
    " ",
  ),
);
export const searchTokens = (value) =>
  normalizeSearch(value)
    .slice(0, 160)
    .split(" ")
    .filter((t) => t && !ignored.has(t))
    .slice(0, 12);
export function matchWord(token, word) {
  if (token === word) return 10;
  if (token.length >= 2 && word.startsWith(token)) return 7;
  if (
    token.length >= 4 &&
    searchDistance(token, word) <= (token.length > 7 ? 2 : 1)
  )
    return 4;
  return 0;
}
export function conceptFor(token, groups) {
  const ranked = Object.entries(groups)
    .map(([id, words]) => ({
      id,
      score: Math.max(
        0,
        ...normalizeSearch(words)
          .split(" ")
          .map((word) => matchWord(token, word)),
      ),
    }))
    .sort((a, b) => b.score - a.score);
  // Ambiguous partial words must not silently force an unrelated category.
  return ranked[0]?.score >= 4 && ranked[0].score > (ranked[1]?.score || 0)
    ? ranked[0].id
    : null;
}
export function searchRows(rows, query, describe) {
  const tokens = searchTokens(query);
  if (!tokens.length) return rows;
  return rows
    .map((item, index) => {
      const words = [...new Set(normalizeSearch(describe(item)).split(" "))];
      const scores = tokens.map((token) =>
        Math.max(0, ...words.map((word) => matchWord(token, word))),
      );
      return {
        item,
        index,
        coverage: scores.filter(Boolean).length,
        score: scores.reduce((a, b) => a + b, 0),
      };
    })
    .filter((r) => r.coverage)
    .sort(
      (a, b) =>
        b.coverage - a.coverage || b.score - a.score || a.index - b.index,
    )
    .map((r) => r.item);
}
