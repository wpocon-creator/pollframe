// MediaWiki action=parse does not follow article moves unless redirects=1 is
// explicit. HTTP redirect policy is separate and remains restrictive.
export function wikipediaParseUrl(page) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({ action: 'parse', page: decodeURIComponent(page), prop: 'text', format: 'json', formatversion: '2', redirects: '1' });
  return url.href;
}

export function assertSpainArchiveContinuity(polls, previousPolls = []) {
  if (polls.length < 3000) throw new Error(`Spain archive is incomplete: ${polls.length} valid polls`);
  const latest = polls.at(-1)?.date;
  const previousLatest = previousPolls.reduce((date, poll) => poll.date > date ? poll.date : date, '');
  if (previousLatest && latest < previousLatest) throw new Error(`Spain latest poll regressed from ${previousLatest} to ${latest}; retaining the published snapshot`);
  if (previousPolls.length && polls.length < previousPolls.length * 0.95) throw new Error('Spain archive lost more than 5% of its observations; retaining the published snapshot');
}
