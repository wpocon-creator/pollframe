import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from 'cheerio/slim';
import { assertSpainArchiveContinuity, nationalVotingIntentionTables } from '../scripts/lib/spain-archive-health.mjs';

// The original publication initially had a publication-day placeholder. The
// source later supplied its actual fieldwork and additional small-party values.
const original = {
  date: '2026-10-12', fieldwork: ['2026-10-12', '2026-10-12'],
  pollster: '33', sample: null,
  results: { '401': 31.4, '402': 26.4, '403': 18.2, '404': 7.4 },
  sourceUrl: 'https://www.abc.es/espana/derecha-mantiene-mayoria-absoluta-pese-agitacion-callejera-20261012015025-nt.html',
};
const corrected = {
  ...original, pollster: '34', date: '2026-10-08', fieldwork: ['2026-10-06', '2026-10-08'], sample: 1077,
  results: { ...original.results, '406': 2.6, '407': 1.5, '408': 1.5 },
};
const baseline = Array.from({ length: 3200 }, () => ({ date: '2026-10-01' }));
const previous = [...baseline, original];
const options = { previousPollsters: { '33': 'GAD3' }, pollsters: { '34': 'GAD3', '33': 'Different institute' } };
const snapshot = (poll = corrected) => [...baseline, poll, { date: '2026-10-11' }];

test('accepts an evidenced real fieldwork correction, without keeping a duplicate placeholder', () => {
  const polls = snapshot();
  const before = JSON.stringify(polls);
  assert.deepEqual(assertSpainArchiveContinuity(polls, previous, options), [{
    pollster: 'GAD3', sourceUrl: original.sourceUrl, previousDate: original.date, correctedDate: corrected.date,
  }]);
  assert.equal(JSON.stringify(polls), before);
  assert.equal(polls.filter((poll) => poll.sourceUrl === original.sourceUrl).length, 1);
});

test('requires names, not unstable numerical pollster IDs', () => {
  assert.throws(() => assertSpainArchiveContinuity(snapshot({ ...corrected, pollster: '33' }), previous, options), /regressed/);
  assert.throws(() => assertSpainArchiveContinuity(snapshot(), previous), /regressed/);
});

test('a recent poll disappearing is still an error even with a complete historical archive', () => {
  assert.throws(() => assertSpainArchiveContinuity(snapshot({ date: '2026-10-10' }), previous, options), /regressed/);
});

test('same publisher and institute with different main results is not a correction', () => {
  assert.throws(() => assertSpainArchiveContinuity(snapshot({ ...corrected, results: { ...corrected.results, '401': 32 } }), previous, options), /regressed/);
});

test('different original publication cannot justify regression', () => {
  assert.throws(() => assertSpainArchiveContinuity(snapshot({ ...corrected, sourceUrl: 'https://www.abc.es/other-poll.html' }), previous, options), /regressed/);
});

test('shared Wikipedia archive URL cannot be used to identify a poll', () => {
  for (const sourceUrl of ['https://en.wikipedia.org/wiki/Polls', 'https://commons.wikimedia.org/polls', 'javascript:alert(1)', 'not a URL']) {
    assert.throws(() => assertSpainArchiveContinuity(snapshot({ ...corrected, sourceUrl }), [...baseline, { ...original, sourceUrl }], options), /regressed/);
  }
});

test('ambiguous matches and reused matches are rejected', () => {
  assert.throws(() => assertSpainArchiveContinuity([...snapshot(), { ...corrected }], previous, options), /regressed/);
  assert.throws(() => assertSpainArchiveContinuity(snapshot(), [...previous, { ...original }], options), /regressed/);
});

test('all observations newer than the new maximum must be accounted for', () => {
  assert.throws(() => assertSpainArchiveContinuity(snapshot(), [...previous, { ...original, sourceUrl: 'https://example.org/another-poll' }], options), /regressed/);
});

test('partial downloads remain blocked even with an evidenced correction', () => {
  assert.throws(() => assertSpainArchiveContinuity(snapshot().slice(-2900), previous, options), /incomplete/);
  assert.throws(() => assertSpainArchiveContinuity(snapshot(), Array.from({ length: 3400 }, () => original), options), /lost more/);
});

test('correction must be plausible fieldwork with an unchanged substantial vote share', () => {
  for (const poll of [
    { ...corrected, fieldwork: ['2026-10-06', '2026-10-09'] },
    { ...corrected, fieldwork: ['2026-10-09', corrected.date] },
    { ...corrected, date: '2025-10-08', fieldwork: ['2025-10-06', '2025-10-08'] },
    { ...corrected, results: { '401': 31.4, '402': 26.4 } },
  ]) assert.throws(() => assertSpainArchiveContinuity(snapshot(poll), previous, options), /regressed/);
});

test('maximum date is independent of input sorting', () => {
  assert.doesNotThrow(() => assertSpainArchiveContinuity([{ date: '2026-10-13' }, ...baseline], previous, options));
});

test('ordinary new and unchanged snapshots require no correction exception', () => {
  assert.deepEqual(assertSpainArchiveContinuity(previous, previous, options), []);
  assert.deepEqual(assertSpainArchiveContinuity([...previous, { date: '2026-10-13' }], previous, options), []);
});

test('an empty extra coalition table does not displace 2023, and hypothetical polls stay excluded', () => {
  const table = (id) => `<table class="wikitable" id="${id}"><tr><th>Polling firm/Commissioner</th></tr><tr><td>example</td></tr></table>`;
  for (const modern of [true, false]) {
    const heading = (level, text) => modern ? `<div class="mw-heading mw-heading${level}"><h${level}>${text}</h${level}></div>` : `<h${level}>${text}</h${level}>`;
    const $ = load(heading(2, 'Voting intention estimates')
      + ['2026-after', '2026-before', '2025', '2024', '2023'].map((id) => heading(3, id) + table(id)).join('')
      + heading(2, 'Voting preferences') + table('preferences')
      + heading(2, 'Hypothetical scenarios') + heading(3, 'Coalition') + table('hypothetical'));
    assert.deepEqual(nationalVotingIntentionTables($).map((_, t) => $(t).attr('id')).get(), ['2026-after', '2026-before', '2025', '2024', '2023']);
  }
});

test('a missing section is rejected instead of guessing which tables contain real polls', () => {
  const $ = load('<table class="wikitable"><tr><th>Polling firm</th></tr></table>');
  assert.equal(nationalVotingIntentionTables($).length, 0);
});

test('year-level coverage catches a lost historical table even below the overall 5% loss limit', () => {
  const history = Array.from({ length: 68 }, () => ({ date: '2023-08-01' }));
  assert.throws(() => assertSpainArchiveContinuity([...previous, { date: '2026-10-13' }], [...previous, ...history], options), /lost too many.*2023/);
});
