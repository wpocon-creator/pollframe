import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseNotice, NOTICE_EVENTS } from '../src/notice-policy.js';
const entries = [{ id: 'feedback', delay: 60000, priority: 1 }, { id: 'studio', delay: 8000, priority: 10 }];
test('Studio wins eligible ties; feedback waits one visible minute', () => {
  assert.equal(chooseNotice(entries, { elapsed: 7999 }), null);
  assert.equal(chooseNotice(entries, { elapsed: 8000 }), 'studio');
  assert.equal(chooseNotice(entries, { elapsed: 60000 }), 'studio');
  assert.equal(chooseNotice(entries.slice(0,1), { elapsed: 59999 }), null);
});
test('No overlap, repeats or early second notices', () => {
  const seen = entries.map(e => ({ ...e, seen: e.id === 'studio' }));
  for (const state of [{active:true}, {blocked:true}, {lastShown:8001}]) assert.equal(chooseNotice(seen, {elapsed:68000, ...state}), null);
  assert.equal(chooseNotice(seen, {elapsed:68000,lastShown:8000}), 'feedback');
  assert.equal(chooseNotice(entries.map(e=>({...e,seen:true})), {elapsed:999999}), null);
  assert.equal(new Set(NOTICE_EVENTS).size, 6);
});
