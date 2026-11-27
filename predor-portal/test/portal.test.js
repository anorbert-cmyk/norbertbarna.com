import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../src/store.js';
import { USERS, scopeFor } from '../src/auth.js';
import { addDays } from '../src/time.js';

const store = new Store();
const byLogin = (l) => scopeFor(USERS.find((u) => u.login === l));

test('manager only sees own department', () => {
  const sc = byLogin('raktarvezeto');
  const rows = store.attendance(sc, { from: addDays(store.todayKey, -6), to: store.todayKey });
  assert.ok(rows.length > 0);
  assert.ok(rows.every((r) => r.departmentId === 'raktar'));
  const events = store.filterEvents(sc, { from: addDays(store.todayKey, -6), to: store.todayKey });
  assert.ok(events.every((e) => !e.personId || store.personById.get(e.personId).departmentId === 'raktar'));
});

test('security role has no attendance access', () => {
  assert.equal(byLogin('biztonsag').canSeeAttendance, false);
});

test('attendance deducts the 20 minute break above 6 hours', () => {
  const sc = byLogin('vezetoseg');
  const rows = store.attendance(sc, { from: addDays(store.todayKey, -6), to: addDays(store.todayKey, -1) });
  const r = rows.find((x) => x.firstIn && x.lastOut);
  const [h1, m1] = r.firstIn.split(':').map(Number); const [h2, m2] = r.lastOut.split(':').map(Number);
  const gross = h2 * 60 + m2 - (h1 * 60 + m1);
  assert.equal(r.workedMin, gross > 360 ? gross - 20 : gross);
});

test('ingest rejects unknown doors and accepts valid events', () => {
  const ok = store.ingest([{ timestamp: new Date().toISOString(), doorId: 'bp-fo', personId: 'p001', type: 'granted', direction: 'in' }, { timestamp: 'x', doorId: 'nope', type: 'granted' }]);
  assert.equal(ok.accepted, 1);
  assert.deepEqual(ok.rejected, [1]);
});
