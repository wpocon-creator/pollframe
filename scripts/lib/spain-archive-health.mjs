// MediaWiki action=parse does not follow article moves unless redirects=1 is
// explicit. HTTP redirect policy is separate and remains restrictive.
export function wikipediaParseUrl(page) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({ action: 'parse', page: decodeURIComponent(page), prop: 'text', format: 'json', formatversion: '2', redirects: '1' });
  return url.href;
}

export function nationalVotingIntentionTables($) {
  // A new coalition/year can add a table without adding any observations yet.
  // Select the section, not the first N tables: otherwise an empty new table
  // silently pushes a whole historical year out of the imported archive.
  return $('table.wikitable').filter((_, table) => {
    // The source has nested this section at h2 and h4 at different times.
    // Ignore year subheadings, but stop at any other intervening section.
    const section = $(table).prevAll('div.mw-heading,h2,h3,h4,h5,h6')
      .map((_, heading) => $(heading).text().trim()).get()
      .find((heading) => !/^(?:19|20)\d{2}\b/.test(heading));
    return /^Voting intention estimates\b/i.test(section ?? '')
      && /Polling firm/i.test($(table).find('tr').first().text());
  });
}

function assertAnnualCoverage(polls, previousPolls) {
  const counts = (rows) => rows.reduce((years, poll) => {
    const year = poll.date.slice(0, 4);
    years.set(year, (years.get(year) ?? 0) + 1);
    return years;
  }, new Map());
  const current = counts(polls);
  for (const [year, before] of counts(previousPolls)) {
    if (before - (current.get(year) ?? 0) > Math.max(3, before * 0.05)) {
      throw new Error(`Spain archive lost too many observations for ${year}; retaining the published snapshot`);
    }
  }
}

function publicationIdentity(poll, pollsters) {
  const name = pollsters[poll.pollster];
  if (!name || !poll.sourceUrl) return null;
  try {
    const url = new URL(poll.sourceUrl);
    // An archive article is shared by many polls: it is not evidence that two
    // observations are the same publication. Numeric institute IDs also change
    // when a new name is inserted into the updater's alphabetical index.
    if (!['http:', 'https:'].includes(url.protocol) || /(^|\.)wikipedia\.org$|(^|\.)wikimedia\.org$/i.test(url.hostname)) return null;
    url.hash = '';
    return `${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()}|${url.href}`;
  } catch {
    return null;
  }
}

function isFieldworkCorrection(previous, candidate) {
  const core = Object.entries(previous.results ?? {})
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => b[1] - a[1]).slice(0, 3);
  // Require unchanged main-party shares as well as the same institute and
  // original publication. Do not identify polls from dates or URLs alone.
  if (core.length !== 3 || core.reduce((sum, [, value]) => sum + value, 0) < 60) return false;
  if (!core.every(([party, value]) => candidate.results?.[party] === value)) return false;
  const daysEarlier = (Date.parse(previous.date) - Date.parse(candidate.date)) / 86_400_000;
  return daysEarlier > 0 && daysEarlier <= 45
    && candidate.fieldwork?.[1] === candidate.date
    && candidate.fieldwork[0] <= candidate.date;
}

export function assertSpainArchiveContinuity(polls, previousPolls = [], {
  pollsters = {}, previousPollsters = {},
} = {}) {
  if (polls.length < 3000) throw new Error(`Spain archive is incomplete: ${polls.length} valid polls`);
  const latest = polls.reduce((date, poll) => poll.date > date ? poll.date : date, '');
  const previousLatest = previousPolls.reduce((date, poll) => poll.date > date ? poll.date : date, '');
  if (previousPolls.length && polls.length < previousPolls.length * 0.95) throw new Error('Spain archive lost more than 5% of its observations; retaining the published snapshot');
  if (!previousLatest || latest >= previousLatest) {
    assertAnnualCoverage(polls, previousPolls);
    return [];
  }

  const publications = new Map();
  for (const poll of polls) {
    const identity = publicationIdentity(poll, pollsters);
    if (identity) publications.set(identity, [...(publications.get(identity) ?? []), poll]);
  }
  const corrections = [];
  const matched = new Set();
  for (const previous of previousPolls.filter((poll) => poll.date > latest)) {
    const identity = publicationIdentity(previous, previousPollsters);
    const candidates = (publications.get(identity) ?? []).filter((poll) => isFieldworkCorrection(previous, poll));
    if (candidates.length !== 1 || matched.has(candidates[0])) {
      throw new Error(`Spain latest poll regressed from ${previousLatest} to ${latest} without an unambiguous source correction; retaining the published snapshot`);
    }
    matched.add(candidates[0]);
    corrections.push({ pollster: previousPollsters[previous.pollster], sourceUrl: previous.sourceUrl, previousDate: previous.date, correctedDate: candidates[0].date });
  }
  assertAnnualCoverage(polls, previousPolls);
  return corrections;
}
