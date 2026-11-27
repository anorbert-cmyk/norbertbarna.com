import crypto from 'node:crypto';
import { DEPARTMENTS, SITES } from './data.js';

// Demo users. In production these come from the tenant table, with passwords
// hashed (scrypt) or SSO through Entra ID.
export const USERS = [
  { id: 'u1', login: 'vezetoseg', name: 'Demó Vezérigazgató', role: 'owner', roleLabel: 'Vezetőség', departments: null, sites: ['bp', 'gy'] },
  { id: 'u2', login: 'hr', name: 'Demó HR vezető', role: 'hr', roleLabel: 'HR', departments: null, sites: ['bp', 'gy'] },
  { id: 'u3', login: 'raktarvezeto', name: 'Demó Raktárvezető', role: 'manager', roleLabel: 'Csoportvezető (Raktár)', departments: ['raktar'], sites: ['gy'] },
  { id: 'u4', login: 'biztonsag', name: 'Demó Biztonsági vezető', role: 'security', roleLabel: 'Vagyonvédelem', departments: null, sites: ['bp', 'gy'] },
];

export const ROLE_INFO = {
  owner: 'Mindent lát: események, munkaidő, riasztások, hozzáférési napló, összekötő állapota.',
  hr: 'Minden dolgozó munkaideje és eseményei, export a bérszámfejtéshez.',
  manager: 'Csak a saját csoportja, a saját telephelyén.',
  security: 'Események és riasztások minden ajtón, munkaidő-adatok nélkül.',
};

export function scopeFor(user) {
  const deps = user.departments;
  const canSeeDepartment = (id) => !deps || deps.includes(id);
  const canSeeAnyPerson = (p) => canSeeDepartment(p.departmentId) && user.sites.includes(p.siteId);
  const canSeePerson = (p) => p.active && canSeeAnyPerson(p);
  return {
    sites: user.sites,
    canSeeDepartment,
    canSeePerson,
    canSeeAttendance: user.role !== 'security',
    canSeeAudit: user.role === 'owner',
    canSeeConnector: user.role === 'owner',
    canSeeEvent: (e, p, door) => {
      if (!user.sites.includes(door.siteId)) return false;
      if (p) return canSeeAnyPerson(p);
      // Door-only events (alarms, unknown cards): managers see only their own department's door.
      if (!deps) return true;
      return DEPARTMENTS.some((d) => deps.includes(d.id) && d.door === door.id);
    },
  };
}

export function publicUser(u) {
  return {
    id: u.id, name: u.name, role: u.role, roleLabel: u.roleLabel, roleInfo: ROLE_INFO[u.role],
    sites: SITES.filter((s) => u.sites.includes(s.id)).map((s) => s.name),
    departments: u.departments ? DEPARTMENTS.filter((d) => u.departments.includes(d.id)).map((d) => d.name) : null,
  };
}

const SESSION_TTL = 8 * 3600 * 1000;
export class Sessions {
  constructor() { this.map = new Map(); }
  create(user) {
    const sid = crypto.randomBytes(32).toString('base64url');
    const csrf = crypto.randomBytes(18).toString('base64url');
    this.map.set(sid, { userId: user.id, csrf, exp: Date.now() + SESSION_TTL });
    return { sid, csrf };
  }
  get(sid) {
    if (!sid) return null;
    const s = this.map.get(sid);
    if (!s) return null;
    if (s.exp < Date.now()) { this.map.delete(sid); return null; }
    s.exp = Date.now() + SESSION_TTL;
    return s;
  }
  destroy(sid) { this.map.delete(sid); }
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Simple fixed-window limiter for login and ingest.
export function rateLimiter({ windowMs, max }) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const h = hits.get(key);
    if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + windowMs }); return true; }
    h.n++;
    if (hits.size > 10000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return h.n <= max;
  };
}
