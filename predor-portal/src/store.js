// In-memory store with the query logic the portal needs. In production the same
// interface is backed by PostgreSQL (see docs/schema.sql); the demo keeps it in RAM.

import { buildDataset, DOORS, DEPARTMENTS, SITES, EVENT_TYPES, ACTIVITY, DAYS_BACK } from './data.js';
import { dayKey, addDays, dayStart, weekdayOf, hhmm, budapestParts } from './time.js';

const BREAK_MIN = 20; // Mt. 103. §: 20 perc munkaközi szünet 6 óra felett

export class Store {
  constructor() {
    this.reset();
    this.savedViews = new Map(); // userId -> [{id,name,page,filters}]
    this.audit = [];
    this.connector = {
      tenant: 'Demó Kft.',
      version: '0.1.0',
      source: 'Predor Integrációs API (minta)',
      predorHost: '10.0.5.12:8888',
      lastPush: Date.now() - 95 * 1000,
      pushedToday: 0,
      queue: 0,
      status: 'ok',
    };
  }

  reset() {
    const ds = buildDataset(Date.now());
    this.persons = ds.persons;
    this.events = ds.events;
    this.leave = ds.leave;
    this.todayKey = ds.todayKey;
    this.personById = new Map(this.persons.map((p) => [p.id, p]));
    this.doorById = new Map(DOORS.map((d) => [d.id, d]));
    this._attCache = new Map();
    this.builtAt = Date.now();
  }

  // Rebuild once per day so "today" always has fresh data in the demo.
  ensureFresh() {
    if (dayKey(Date.now()) !== this.todayKey) {
      const views = this.savedViews; const audit = this.audit; const conn = this.connector;
      this.reset();
      this.savedViews = views; this.audit = audit; this.connector = conn;
    }
  }

  meta(scope) {
    const persons = this.persons.filter((p) => scope.canSeePerson(p));
    return {
      sites: SITES.filter((s) => scope.sites.includes(s.id)),
      departments: DEPARTMENTS.filter((d) => scope.canSeeDepartment(d.id)).map(({ id, name, siteId }) => ({ id, name, siteId })),
      doors: DOORS.filter((d) => scope.sites.includes(d.siteId)),
      eventTypes: EVENT_TYPES,
      activity: ACTIVITY,
      persons: persons.map((p) => ({ id: p.id, name: p.name, departmentId: p.departmentId, employeeNo: p.employeeNo })),
      range: { min: addDays(this.todayKey, -DAYS_BACK), max: this.todayKey },
      today: this.todayKey,
    };
  }

  // ---------- events ----------
  filterEvents(scope, f) {
    const from = dayStart(f.from);
    const to = dayStart(addDays(f.to, 1));
    const q = (f.q || '').trim().toLowerCase();
    const out = [];
    for (const e of this.events) {
      if (e.ts < from || e.ts >= to) continue;
      const door = this.doorById.get(e.doorId);
      const p = e.personId ? this.personById.get(e.personId) : null;
      if (!scope.canSeeEvent(e, p, door)) continue;
      if (f.site && door.siteId !== f.site) continue;
      if (f.door && f.door.length && !f.door.includes(e.doorId)) continue;
      if (f.department && (!p || p.departmentId !== f.department)) continue;
      if (f.person && e.personId !== f.person) continue;
      if (f.type && f.type.length && !f.type.includes(e.type)) continue;
      if (f.result === 'granted' && e.type !== 'granted') continue;
      if (f.result === 'problem' && e.type === 'granted') continue;
      if (f.direction && e.direction !== f.direction) continue;
      if (f.hourFrom != null || f.hourTo != null) {
        const h = budapestParts(e.ts).h;
        if (f.hourFrom != null && h < f.hourFrom) continue;
        if (f.hourTo != null && h > f.hourTo) continue;
      }
      if (q && !((p && (p.name.toLowerCase().includes(q) || p.employeeNo.toLowerCase().includes(q))) || door.name.toLowerCase().includes(q))) continue;
      out.push(e);
    }
    return out;
  }

  presentEvent(e) {
    const door = this.doorById.get(e.doorId);
    const p = e.personId ? this.personById.get(e.personId) : null;
    const dep = p ? DEPARTMENTS.find((d) => d.id === p.departmentId) : null;
    return {
      id: e.id,
      ts: e.ts,
      day: dayKey(e.ts),
      time: hhmm(e.ts),
      type: e.type,
      typeLabel: EVENT_TYPES[e.type],
      direction: e.direction,
      doorId: door.id,
      door: door.name,
      site: SITES.find((s) => s.id === door.siteId).name,
      controller: door.controller,
      personId: p?.id || null,
      person: p?.name || (e.type === 'denied_unknown' ? 'Ismeretlen kártya' : 'Nincs személy'),
      employeeNo: p?.employeeNo || '',
      department: dep?.name || '',
      card: p ? `${p.card.type} ${p.card.masked}` : '',
    };
  }

  // ---------- attendance ----------
  scheduleFor(p, key) {
    const dep = DEPARTMENTS.find((d) => d.id === p.departmentId);
    if (dep.schedule === 'office') return { start: 8 * 60, len: 510, label: 'Iroda 8:00–16:30' };
    const [y, m, d] = key.split('-').map(Number);
    const weekNo = Math.floor((Date.UTC(y, m - 1, d) / 86400000 + 3) / 7);
    const morning = (weekNo % 2 === 0) === (p.shiftGroup === 'A');
    return morning ? { start: 6 * 60, len: 480, label: 'Délelőtt 6:00–14:00' } : { start: 14 * 60, len: 480, label: 'Délután 14:00–22:00' };
  }

  attendanceDay(p, key) {
    const ck = `${p.id}|${key}`;
    if (this._attCache.has(ck) && key !== this.todayKey) return this._attCache.get(ck);
    const from = dayStart(key); const to = dayStart(addDays(key, 1));
    const perim = p.siteId === 'bp' ? 'bp-fo' : 'gy-fo';
    const evs = this.eventsOfPersonBetween(p.id, from, to).filter((e) => e.doorId === perim && e.type === 'granted');
    const ins = evs.filter((e) => e.direction === 'in');
    const outs = evs.filter((e) => e.direction === 'out');
    const wd = weekdayOf(key);
    const weekend = wd === 0 || wd === 6;
    const sched = this.scheduleFor(p, key);
    const leave = this.leave.get(ck);
    const row = {
      personId: p.id, person: p.name, employeeNo: p.employeeNo,
      departmentId: p.departmentId, department: DEPARTMENTS.find((d) => d.id === p.departmentId).name,
      day: key, weekend, schedule: weekend ? 'Pihenőnap' : sched.label,
      firstIn: null, lastOut: null, workedMin: 0, lateMin: 0, overtimeMin: 0,
      status: 'absent', statusLabel: '', flags: [],
    };
    if (ins.length) {
      const first = ins[0].ts;
      row.firstIn = hhmm(first);
      const lastOut = outs.length ? outs[outs.length - 1].ts : null;
      const isToday = key === this.todayKey;
      if (lastOut && lastOut > first) {
        row.lastOut = hhmm(lastOut);
        let worked = Math.round((lastOut - first) / 60000);
        if (worked > 360) worked -= BREAK_MIN;
        row.workedMin = worked;
      } else if (isToday) {
        row.status = 'open';
        row.workedMin = Math.max(0, Math.round((Date.now() - first) / 60000));
      } else {
        row.flags.push('missingExit');
      }
      if (!weekend) {
        const fp = budapestParts(first);
        const late = fp.h * 60 + fp.min - sched.start;
        if (late > 5) { row.lateMin = late; row.flags.push('late'); }
        const ot = row.workedMin - (sched.len - (sched.len > 360 ? BREAK_MIN : 0));
        if (ot >= 15 && row.status !== 'open') { row.overtimeMin = ot; row.flags.push('overtime'); }
      } else if (row.workedMin > 0) {
        row.overtimeMin = row.workedMin; row.flags.push('overtime');
      }
      if (row.status !== 'open') row.status = row.flags.includes('missingExit') ? 'missingExit' : row.flags.includes('late') ? 'late' : 'present';
    } else if (leave) {
      row.status = leave;
    } else if (weekend) {
      row.status = 'weekend';
    } else if (key === this.todayKey) {
      const nowP = budapestParts(Date.now());
      row.status = nowP.h * 60 + nowP.min < sched.start + 30 ? 'notYet' : 'absent';
    } else {
      row.status = 'absent';
    }
    row.statusLabel = row.status === 'notYet' ? 'Még nem kezdett' : ACTIVITY[row.status];
    if (key !== this.todayKey) this._attCache.set(ck, row);
    return row;
  }

  eventsOfPersonBetween(personId, from, to) {
    if (!this._byPerson) {
      this._byPerson = new Map();
      for (const e of this.events) {
        if (!e.personId) continue;
        if (!this._byPerson.has(e.personId)) this._byPerson.set(e.personId, []);
        this._byPerson.get(e.personId).push(e);
      }
    }
    return (this._byPerson.get(personId) || []).filter((e) => e.ts >= from && e.ts < to);
  }

  attendance(scope, f) {
    const rows = [];
    const persons = this.persons.filter((p) => scope.canSeePerson(p) && (!f.department || p.departmentId === f.department) && (!f.person || p.id === f.person) && (!f.site || p.siteId === f.site));
    for (let key = f.from; key <= f.to; key = addDays(key, 1)) {
      for (const p of persons) {
        const r = this.attendanceDay(p, key);
        if (f.status && f.status.length && !f.status.some((s) => s === r.status || r.flags.includes(s))) continue;
        if (!f.includeWeekend && r.status === 'weekend') continue;
        rows.push(r);
      }
    }
    return rows;
  }

  summary(rows) {
    const s = { workdays: 0, workedMin: 0, lateCount: 0, lateMin: 0, overtimeMin: 0, absent: 0, vacation: 0, sick: 0, homeoffice: 0, missingExit: 0 };
    for (const r of rows) {
      if (['present', 'late', 'missingExit', 'open'].includes(r.status)) s.workdays++;
      s.workedMin += r.workedMin;
      if (r.lateMin) { s.lateCount++; s.lateMin += r.lateMin; }
      s.overtimeMin += r.overtimeMin;
      if (r.status in s && r.status !== 'workdays') s[r.status]++;
    }
    return s;
  }

  // ---------- overview ----------
  overview(scope) {
    const key = this.todayKey;
    const persons = this.persons.filter((p) => scope.canSeePerson(p));
    const today = persons.map((p) => this.attendanceDay(p, key));
    const counts = {};
    for (const r of today) counts[r.status] = (counts[r.status] || 0) + 1;
    const lateToday = today.filter((r) => r.lateMin > 0).sort((a, b) => b.lateMin - a.lateMin);

    // Hourly arrivals today vs. 4-week average of the same weekday.
    const arrivals = new Array(24).fill(0);
    const from = dayStart(key);
    for (const e of this.events) {
      if (e.ts < from || e.type !== 'granted' || e.direction !== 'in') continue;
      const p = e.personId && this.personById.get(e.personId);
      const door = this.doorById.get(e.doorId);
      if (!p || door.kind !== 'perimeter' || !scope.canSeePerson(p)) continue;
      arrivals[budapestParts(e.ts).h]++;
    }

    // Presence trend over the last 14 days.
    const trend = [];
    for (let i = 13; i >= 0; i--) {
      const k = addDays(key, -i);
      const rows = persons.map((p) => this.attendanceDay(p, k));
      const present = rows.filter((r) => ['present', 'late', 'missingExit', 'open'].includes(r.status)).length;
      const ho = rows.filter((r) => r.status === 'homeoffice').length;
      trend.push({ day: k, present, homeoffice: ho, weekend: rows[0]?.weekend || false });
    }

    const alerts = this.alerts(scope, { from: addDays(key, -6), to: key });
    const evToday = this.filterEvents(scope, { from: key, to: key });
    return {
      today: key,
      headcount: persons.length,
      counts,
      inside: today.filter((r) => r.status === 'open').length,
      eventsToday: evToday.length,
      deniedToday: evToday.filter((e) => e.type !== 'granted').length,
      lateToday: lateToday.slice(0, 8),
      arrivals,
      trend,
      alerts: alerts.slice(0, 6),
      alertCount: alerts.length,
      connector: this.connector,
    };
  }

  // ---------- alerts ----------
  alerts(scope, f) {
    const list = [];
    const events = this.filterEvents(scope, { from: f.from, to: f.to });
    const deniedByPersonDay = new Map();
    for (const e of events) {
      const ev = this.presentEvent(e);
      if (e.type === 'door_forced') list.push({ id: `a-${e.id}`, severity: 'high', kind: 'Erőszakos ajtónyitás', ts: e.ts, day: ev.day, time: ev.time, text: `${ev.door} (${ev.site}): az ajtó kártya nélkül nyílt ki.`, eventId: e.id });
      if (e.type === 'door_held') list.push({ id: `a-${e.id}`, severity: 'low', kind: 'Nyitva maradt ajtó', ts: e.ts, day: ev.day, time: ev.time, text: `${ev.door}: az ajtó a megengedettnél tovább maradt nyitva.`, eventId: e.id });
      if (e.type === 'denied_expired') list.push({ id: `a-${e.id}`, severity: 'medium', kind: 'Lejárt kártya használata', ts: e.ts, day: ev.day, time: ev.time, text: `${ev.person} lejárt kártyával próbált belépni: ${ev.door}.`, personId: e.personId, eventId: e.id });
      if (e.type === 'denied_unknown') {
        const h = budapestParts(e.ts).h;
        if (h < 6) list.push({ id: `a-${e.id}`, severity: 'medium', kind: 'Ismeretlen kártya éjjel', ts: e.ts, day: ev.day, time: ev.time, text: `${ev.door}: ismeretlen kártya ${ev.time}-kor.`, eventId: e.id });
      }
      if (e.type.startsWith('denied') && e.personId) {
        const k = `${e.personId}|${ev.day}|${e.doorId}`;
        deniedByPersonDay.set(k, (deniedByPersonDay.get(k) || []).concat(e));
      }
    }
    for (const [k, evs] of deniedByPersonDay) {
      if (evs.length < 3) continue;
      const ev = this.presentEvent(evs[0]);
      list.push({ id: `a-rep-${k}`, severity: 'high', kind: 'Ismételt elutasítás', ts: evs[0].ts, day: ev.day, time: ev.time, text: `${ev.person} ${evs.length}× próbált bejutni ide: ${ev.door}.`, personId: ev.personId, eventId: evs[0].id });
    }
    if (scope.canSeeAttendance) {
      const rows = this.attendance(scope, { from: f.from, to: addDays(this.todayKey, -1) < f.to ? addDays(this.todayKey, -1) : f.to, includeWeekend: true });
      for (const r of rows) {
        if (r.flags.includes('missingExit')) list.push({ id: `a-mx-${r.personId}-${r.day}`, severity: 'medium', kind: 'Hiányzó kilépés', ts: dayStart(r.day) + 23 * 3600000, day: r.day, time: '–', text: `${r.person} ${r.firstIn}-kor belépett, de kilépés nincs rögzítve. Bérszámfejtés előtt javítani kell.`, personId: r.personId });
        if (r.weekend && r.workedMin > 0) list.push({ id: `a-we-${r.personId}-${r.day}`, severity: 'low', kind: 'Hétvégi munkavégzés', ts: dayStart(r.day) + 12 * 3600000, day: r.day, time: r.firstIn, text: `${r.person} hétvégén dolgozott (${Math.round(r.workedMin / 6) / 10} óra). Jóváhagyás kell a túlórához.`, personId: r.personId });
        if (r.status === 'absent') list.push({ id: `a-ab-${r.personId}-${r.day}`, severity: 'medium', kind: 'Igazolatlan hiányzás', ts: dayStart(r.day) + 9 * 3600000, day: r.day, time: '–', text: `${r.person} nem jelent meg, és nincs rögzítve távollét.`, personId: r.personId });
      }
    }
    const order = { high: 0, medium: 1, low: 2 };
    list.sort((a, b) => b.ts - a.ts || order[a.severity] - order[b.severity]);
    if (f.severity) return list.filter((a) => a.severity === f.severity);
    return list;
  }

  personDetail(scope, personId, f) {
    const p = this.personById.get(personId);
    if (!p || !scope.canSeePerson(p)) return null;
    const dep = DEPARTMENTS.find((d) => d.id === p.departmentId);
    const ev = this.filterEvents(scope, { ...f, person: personId }).map((e) => this.presentEvent(e));
    const att = scope.canSeeAttendance ? this.attendance(scope, { ...f, person: personId, includeWeekend: false }) : [];
    return {
      person: { id: p.id, name: p.name, employeeNo: p.employeeNo, position: p.position, department: dep.name, site: SITES.find((s) => s.id === p.siteId).name, card: `${p.card.type} ${p.card.masked}`, cardValid: p.card.validUntil },
      events: ev.reverse(),
      attendance: att.reverse(),
      summary: scope.canSeeAttendance ? this.summary(att) : null,
    };
  }

  // ---------- ingest (connector push) ----------
  ingest(batch) {
    let accepted = 0; const rejected = [];
    for (const [i, raw] of batch.entries()) {
      const ts = Date.parse(raw.timestamp);
      if (!Number.isFinite(ts) || !this.doorById.has(raw.doorId) || !(raw.type in EVENT_TYPES) || (raw.personId && !this.personById.has(raw.personId))) { rejected.push(i); continue; }
      this.events.push({ id: `x${Date.now().toString(36)}${i}`, ts, personId: raw.personId || null, doorId: raw.doorId, type: raw.type, direction: raw.direction === 'out' ? 'out' : raw.direction === 'in' ? 'in' : null });
      accepted++;
    }
    if (accepted) {
      this.events.sort((a, b) => a.ts - b.ts);
      this._byPerson = null; this._attCache.clear();
    }
    this.connector.lastPush = Date.now();
    this.connector.pushedToday += accepted;
    return { accepted, rejected };
  }

  log(user, action, detail) {
    this.audit.unshift({ ts: Date.now(), user: user.name, role: user.roleLabel, action, detail });
    if (this.audit.length > 500) this.audit.length = 500;
  }
}
