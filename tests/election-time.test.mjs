import { test } from 'node:test';
import assert from 'node:assert/strict';
import { electionAge } from '../src/election-time.js';
test('source age uses minutes and hours, not retrieval date', () => {
  const now = Date.parse('2026-09-07T12:00:00Z');
  assert.equal(electionAge('2026-09-07T11:55:00Z', 'de', now), 'vor 5 Minuten');
  assert.equal(electionAge('2026-09-07T10:00:00Z', 'de', now), 'vor 2 Stunden');
  assert.equal(electionAge('2026-09-07T11:59:55Z', 'de', now), 'gerade eben');
  assert.equal(electionAge('invalid', 'de', now), '—');
  assert.equal(electionAge('2026-09-07T11:55:00Z', 'es', now), 'hace 5 minutos');
});
