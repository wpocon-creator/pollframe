import { load } from "cheerio/slim";

export const UK_WIKI_PAGE = "Opinion_polling_for_the_next_United_Kingdom_general_election";
export const UK_WIKI_URL = `https://en.wikipedia.org/wiki/${UK_WIKI_PAGE}`;
const PARTIES = { Lab: "Labour", Con: "Conservative", Ref: "Reform UK", LD: "Liberal Democrats", Grn: "Green Party", SNP: "SNP", PC: "Plaid Cymru" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const iso = (day, month, year) => `${year}-${String(MONTHS.findIndex((name) => month.startsWith(name)) + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export function parseUkSupplement(html, afterDate, now = new Date()) {
  const $ = load(html);
  const rows = [];
  const today = now.toISOString().slice(0, 10);
  $("table.wikitable").each((_, table) => {
    const header = $(table).find("tr").first().children("th,td").map((_, cell) => $(cell).text().replace(/\s+/g, "").trim()).get();
    if (header[0] !== "Date(s)conducted" || header[1] !== "Pollster" || header[3] !== "Area" || !header.includes("Lab")) return;
    $(table).find("tr").slice(1).each((_, row) => {
      const cells = $(row).children("td");
      if (cells.length !== header.length || cells.toArray().some((cell) => Number($(cell).attr("colspan") || 1) !== 1)) return;
      const end = cells.eq(0).attr("data-sort-value");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(end ?? "") || end <= afterDate || end > today) return;
      const clean = (cell) => $(cell).clone().find("sup,style,.hidden-content").remove().end().text().trim();
      if (clean(cells.eq(3)) !== "GB") return;
      const pollster = clean(cells.eq(1));
      if (/ipsos|mori/i.test(pollster)) return;
      const reference = cells.eq(1).find('a[href^="#cite_note"]').first().attr("href");
      const citation = reference ? $(reference).find("cite").first() : null;
      const sourceUrl = citation?.find('a.external[href^="https://"]').first().attr("href");
      if (!sourceUrl) return;
      const textDate = clean(cells.eq(0));
      const startParts = textDate.match(/^(\d{1,2})(?:\s+([A-Z][a-z]{2}))?/);
      const endMonth = MONTHS[Number(end.slice(5, 7)) - 1];
      const start = startParts ? iso(startParts[1], startParts[2] ?? endMonth, end.slice(0, 4)) : end;
      if (start > end || Date.parse(end) - Date.parse(start) > 60 * 86_400_000) return;
      const citationDate = citation.text().match(/(?:^|[.])\s*(\d{1,2})\s+([A-Z][a-z]+)\s+(20\d{2})[.]/);
      const published = citationDate ? iso(citationDate[1], citationDate[2], citationDate[3]) : null;
      const sample = Number(clean(cells.eq(4)).replace(/,/g, ""));
      if (!Number.isInteger(sample) || sample <= 0) return;
      const values = [];
      let other = 0;
      header.forEach((label, index) => {
        if (index < 5 || label === "Lead") return;
        const value = /^\s*(\d+(?:\.\d+)?)%/.exec(clean(cells.eq(index)));
        if (!value) return;
        const percent = Number(value[1]);
        if (PARTIES[label]) values.push([PARTIES[label], percent]);
        else other += percent;
      });
      const total = values.reduce((sum, [, value]) => sum + value, other);
      if (values.length < 5 || total < 94 || total > 106) return;
      values.push(["Other", other]);
      values.forEach(([party_name, voting_intention]) => rows.push({
        start_date: start, end_date: end, pollster_name: ({ "Find Out Now": "FindOutNow", "BMG Research": "BMG", "Lord Ashcroft Polls": "Lord Ashcroft" })[pollster] ?? pollster,
        poll_series: "standard", client: clean(cells.eq(2)) === "N/A" ? "" : clean(cells.eq(2)), country_name: "Great Britain",
        sample_size: String(sample), party_name, voting_intention: String(voting_intention),
        sourceUrl, published: published && published >= end && published <= today ? published : null,
        compilationUrl: UK_WIKI_URL,
      }));
    });
    // Only the newest national table; subsequent tables include alternative
    // leadership scenarios and subnational samples with similar columns.
    return false;
  });
  return rows;
}

export function assertFreshUkPolls(polls, now = new Date()) {
  const latest = polls.map((poll) => poll.date).filter(Boolean).sort().at(-1);
  const age = (now.getTime() - Date.parse(`${latest}T00:00:00Z`)) / 86_400_000;
  if (!Number.isFinite(age) || age > 21 || age < -1) throw new Error(`UK voting-intention source is stale or invalid: latest ${latest}, age ${Math.floor(age)} days. A successful download is not a fresh update.`);
}
