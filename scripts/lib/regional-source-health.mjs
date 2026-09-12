export function regionalElectionLink(href, currentPage) {
  try {
    const url = new URL(href, 'https://en.wikipedia.org');
    if (url.protocol !== 'https:' || url.hostname !== 'en.wikipedia.org' || url.search || url.hash) return null;
    const title = decodeURIComponent(url.pathname.replace(/^\/wiki\//, '')).replaceAll(' ', '_');
    const family = currentPage.replace(/^(?:Next|\d{4})_/, '');
    if (!url.pathname.startsWith('/wiki/') || !/^(?:Next|\d{4})_/.test(title) || title.replace(/^(?:Next|\d{4})_/, '') !== family || title === currentPage) return null;
    return title;
  } catch { return null; }
}

export function validateRegionalRefresh(next, previous) {
  if (!next.polls.length || !next.parties.length) throw Error('No usable polling table: preserving the previous snapshot');
  if (previous?.polls?.length && next.polls.length < previous.polls.length * .8) throw Error('More than 20% of the regional archive disappeared');
  if (previous?.coverage?.latestDate && next.coverage.latestDate < previous.coverage.latestDate) throw Error('Latest regional poll moved backwards');
  if (previous?.lastElection?.date && (!next.lastElection || next.lastElection.date < previous.lastElection.date)) throw Error('Latest regional election disappeared');
  return next;
}
