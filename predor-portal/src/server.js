import express from 'express';
import crypto from 'node:crypto';
import ExcelJS from 'exceljs';
import { Store } from './store.js';
import { USERS, scopeFor, publicUser, Sessions, safeEqual, rateLimiter } from './auth.js';
import { addDays, isValidDayKey, dayKey } from './time.js';
import { EVENT_TYPES } from './data.js';
import { staticMiddleware, sendIndex } from './static.js';

const PORT = Number(process.env.PORT) || 3000;
const ACCESS_CODE = process.env.DEMO_ACCESS_CODE || '';
const INGEST_TOKEN = process.env.INGEST_TOKEN || '';
const INGEST_SECRET = process.env.INGEST_SECRET || '';
const IS_PROD = process.env.NODE_ENV === 'production';

const store = new Store();
const sessions = new Sessions();
const loginLimit = rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
const ingestLimit = rateLimiter({ windowMs: 60 * 1000, max: 120 });

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (IS_PROD) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function setSid(res, sid, maxAge) {
  res.setHeader('Set-Cookie', `sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${IS_PROD ? '; Secure' : ''}`);
}

// ---------- ingest from the on-prem connector (outbound push, HMAC signed) ----------
app.post('/api/ingest', express.raw({ type: 'application/json', limit: '2mb' }), (req, res) => {
  if (!INGEST_TOKEN || !INGEST_SECRET) return res.status(503).json({ error: 'Az adatfogadás nincs beállítva.' });
  if (!ingestLimit(req.ip)) return res.status(429).json({ error: 'Túl sok kérés.' });
  const auth = req.headers.authorization || '';
  if (!safeEqual(auth, `Bearer ${INGEST_TOKEN}`)) return res.status(401).json({ error: 'Érvénytelen token.' });
  const ts = Number(req.headers['x-timestamp']);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) return res.status(401).json({ error: 'Lejárt vagy hiányzó időbélyeg.' });
  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const expected = crypto.createHmac('sha256', INGEST_SECRET).update(`${ts}.`).update(body).digest('hex');
  if (!safeEqual(req.headers['x-signature'] || '', expected)) return res.status(401).json({ error: 'Érvénytelen aláírás.' });
  let payload;
  try { payload = JSON.parse(body.toString('utf8')); } catch { return res.status(400).json({ error: 'Hibás JSON.' }); }
  if (!Array.isArray(payload.events) || payload.events.length > 5000) return res.status(400).json({ error: 'Az events mező 1 és 5000 közötti tömb legyen.' });
  store.ensureFresh();
  const result = store.ingest(payload.events);
  if (payload.connector && typeof payload.connector === 'object') {
    const c = payload.connector;
    if (typeof c.version === 'string') store.connector.version = c.version.slice(0, 20);
    if (Number.isInteger(c.queue)) store.connector.queue = c.queue;
  }
  res.json(result);
});

app.use(express.json({ limit: '32kb' }));

// ---------- auth ----------
app.get('/api/config', (req, res) => {
  res.json({
    accessCodeRequired: Boolean(ACCESS_CODE),
    users: USERS.map((u) => ({ login: u.login, name: u.name, roleLabel: u.roleLabel })),
  });
});

app.post('/api/login', (req, res) => {
  if (!loginLimit(req.ip)) return res.status(429).json({ error: 'Túl sok próbálkozás, próbáld újra 15 perc múlva.' });
  const { login, code } = req.body || {};
  const user = USERS.find((u) => u.login === login);
  if (!user) return res.status(400).json({ error: 'Ismeretlen felhasználó.' });
  if (ACCESS_CODE && !safeEqual(code || '', ACCESS_CODE)) return res.status(401).json({ error: 'Hibás belépési kód.' });
  const { sid, csrf } = sessions.create(user);
  setSid(res, sid, 8 * 3600);
  store.log(user, 'Belépés', '');
  res.json({ user: publicUser(user), csrf });
});

function requireUser(req, res, next) {
  const sid = cookies(req).sid;
  const s = sessions.get(sid);
  if (!s) return res.status(401).json({ error: 'Lejárt munkamenet.' });
  if (req.method !== 'GET' && !safeEqual(req.headers['x-csrf-token'] || '', s.csrf)) return res.status(403).json({ error: 'Érvénytelen kérés.' });
  req.user = USERS.find((u) => u.id === s.userId);
  req.sid = sid; req.csrf = s.csrf;
  req.scope = scopeFor(req.user);
  store.ensureFresh();
  next();
}

app.get('/api/me', requireUser, (req, res) => res.json({ user: publicUser(req.user), csrf: req.csrf }));
app.post('/api/logout', requireUser, (req, res) => {
  sessions.destroy(req.sid);
  setSid(res, '', 0);
  res.json({ ok: true });
});

// ---------- filters ----------
const MAX_RANGE_DAYS = 62;
function parseFilters(q) {
  const meta = store.meta({ sites: ['bp', 'gy'], canSeePerson: () => true, canSeeDepartment: () => true });
  let to = isValidDayKey(q.to) ? q.to : store.todayKey;
  let from = isValidDayKey(q.from) ? q.from : to;
  if (to > meta.range.max) to = meta.range.max;
  if (from < meta.range.min) from = meta.range.min;
  if (from > to) [from, to] = [to, from];
  if (addDays(from, MAX_RANGE_DAYS) < to) from = addDays(to, -MAX_RANGE_DAYS);
  const list = (v) => (typeof v === 'string' && v ? v.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20) : []);
  const int = (v, lo, hi) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null; };
  const str = (v, max = 60) => (typeof v === 'string' ? v.slice(0, max) : '');
  return {
    from, to,
    site: str(q.site, 10), department: str(q.department, 20), person: str(q.person, 10),
    door: list(q.door), type: list(q.type).filter((t) => t in EVENT_TYPES), result: str(q.result, 10), direction: ['in', 'out'].includes(q.direction) ? q.direction : '',
    q: str(q.q, 60), hourFrom: int(q.hourFrom, 0, 23), hourTo: int(q.hourTo, 0, 23),
    status: list(q.status), includeWeekend: q.includeWeekend === '1', severity: ['high', 'medium', 'low'].includes(q.severity) ? q.severity : '',
    page: int(q.page, 1, 100000) || 1, pageSize: int(q.pageSize, 10, 1000) || 50,
  };
}

function describeFilters(f) {
  const parts = [`${f.from} – ${f.to}`];
  for (const k of ['site', 'department', 'person', 'result', 'direction', 'q']) if (f[k]) parts.push(`${k}=${f[k]}`);
  if (f.door.length) parts.push(`door=${f.door.join('|')}`);
  if (f.type.length) parts.push(`type=${f.type.join('|')}`);
  if (f.status.length) parts.push(`status=${f.status.join('|')}`);
  return parts.join(', ');
}

// ---------- data endpoints ----------
app.get('/api/meta', requireUser, (req, res) => res.json(store.meta(req.scope)));

app.get('/api/overview', requireUser, (req, res) => {
  const o = store.overview(req.scope);
  if (!req.scope.canSeeConnector) delete o.connector;
  if (!req.scope.canSeeAttendance) { delete o.lateToday; delete o.counts; }
  res.json(o);
});

app.get('/api/events', requireUser, (req, res) => {
  const f = parseFilters(req.query);
  const all = store.filterEvents(req.scope, f);
  const total = all.length;
  const start = Math.max(0, total - f.page * f.pageSize);
  const end = total - (f.page - 1) * f.pageSize;
  const rows = all.slice(start, Math.max(start, end)).reverse().map((e) => store.presentEvent(e));
  const byType = {};
  for (const e of all) byType[e.type] = (byType[e.type] || 0) + 1;
  res.json({ filters: f, total, page: f.page, pageSize: f.pageSize, rows, byType });
});

app.get('/api/attendance', requireUser, (req, res) => {
  if (!req.scope.canSeeAttendance) return res.status(403).json({ error: 'Ehhez a szerepkörhöz nem tartozik munkaidő-adat.' });
  const f = parseFilters(req.query);
  const rows = store.attendance(req.scope, f);
  const total = rows.length;
  const pageRows = rows.slice().reverse().slice((f.page - 1) * f.pageSize, f.page * f.pageSize);
  res.json({ filters: f, total, page: f.page, pageSize: f.pageSize, rows: pageRows, summary: store.summary(rows) });
});

app.get('/api/alerts', requireUser, (req, res) => {
  const f = parseFilters({ from: addDays(store.todayKey, -13), ...req.query });
  res.json({ filters: f, rows: store.alerts(req.scope, f).slice(0, 300) });
});

app.get('/api/person/:id', requireUser, (req, res) => {
  const f = parseFilters({ from: addDays(store.todayKey, -13), ...req.query });
  const d = store.personDetail(req.scope, String(req.params.id).slice(0, 10), f);
  if (!d) return res.status(404).json({ error: 'Nincs ilyen dolgozó, vagy nincs hozzá jogosultságod.' });
  store.log(req.user, 'Dolgozói adatlap megnyitása', d.person.name);
  res.json(d);
});

app.get('/api/audit', requireUser, (req, res) => {
  if (!req.scope.canSeeAudit) return res.status(403).json({ error: 'Nincs jogosultság.' });
  res.json({ rows: store.audit.slice(0, 200) });
});

app.get('/api/connector', requireUser, (req, res) => {
  if (!req.scope.canSeeConnector) return res.status(403).json({ error: 'Nincs jogosultság.' });
  res.json({ ...store.connector, ingestConfigured: Boolean(INGEST_TOKEN && INGEST_SECRET), eventsStored: store.events.length });
});

// ---------- saved views ----------
app.get('/api/views', requireUser, (req, res) => res.json({ rows: viewsOf(req.user) }));
app.post('/api/views', requireUser, (req, res) => {
  const { name, page, query } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.length > 60) return res.status(400).json({ error: 'Adj nevet a nézetnek (legfeljebb 60 karakter).' });
  if (!['esemenyek', 'jelenlet', 'riasztasok'].includes(page)) return res.status(400).json({ error: 'Ismeretlen oldal.' });
  if (typeof query !== 'string' || query.length > 800) return res.status(400).json({ error: 'Hibás szűrő.' });
  const list = viewsOf(req.user);
  if (list.length >= 30) return res.status(400).json({ error: 'Legfeljebb 30 mentett nézet lehet.' });
  const v = { id: crypto.randomUUID(), name: name.trim(), page, query, createdAt: Date.now() };
  list.push(v);
  res.json(v);
});
app.delete('/api/views/:id', requireUser, (req, res) => {
  const list = viewsOf(req.user);
  const i = list.findIndex((v) => v.id === req.params.id);
  if (i >= 0) list.splice(i, 1);
  res.json({ ok: true });
});

function viewsOf(user) {
  if (!store.savedViews.has(user.id)) {
    const defaults = user.role === 'security'
      ? [{ name: 'Elutasítások ma', page: 'esemenyek', query: 'result=problem' }, { name: 'Éjszakai mozgás', page: 'esemenyek', query: 'hourFrom=0&hourTo=5&from=' + addDays(store.todayKey, -6) }]
      : [{ name: 'Késők ezen a héten', page: 'jelenlet', query: `status=late&from=${addDays(store.todayKey, -6)}` }, { name: 'Hiányzó kilépések', page: 'jelenlet', query: `status=missingExit&from=${addDays(store.todayKey, -13)}` }, { name: 'Elutasított belépések', page: 'esemenyek', query: `result=problem&from=${addDays(store.todayKey, -6)}` }];
    store.savedViews.set(user.id, defaults.map((d) => ({ ...d, id: crypto.randomUUID(), createdAt: Date.now() })));
  }
  return store.savedViews.get(user.id);
}

// ---------- Excel export ----------
async function sendWorkbook(res, filename, sheetName, columns, rows, meta) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Predor adatportál';
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = columns;
  ws.addRows(rows);
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3A5F' } };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  const info = wb.addWorksheet('Szűrők');
  info.addRows([['Exportálta', meta.user], ['Időpont', new Date().toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' })], ['Szűrők', meta.filters], ['Sorok', rows.length], ['Megjegyzés', 'Demó adatok. A kártyaszámok maszkolva.']]);
  info.getColumn(1).width = 14; info.getColumn(2).width = 80;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  await wb.xlsx.write(res);
  res.end();
}

app.get('/api/export/events.xlsx', requireUser, async (req, res, next) => {
  try {
    const f = parseFilters(req.query);
    const rows = store.filterEvents(req.scope, f).slice(-50000).map((e) => store.presentEvent(e));
    store.log(req.user, 'Esemény export (Excel)', `${rows.length} sor, ${describeFilters(f)}`);
    await sendWorkbook(res, `esemenyek_${f.from}_${f.to}.xlsx`, 'Események', [
      { header: 'Dátum', key: 'day', width: 12 }, { header: 'Idő', key: 'time', width: 8 }, { header: 'Esemény', key: 'typeLabel', width: 32 },
      { header: 'Irány', key: 'direction', width: 7 }, { header: 'Dolgozó', key: 'person', width: 22 }, { header: 'Törzsszám', key: 'employeeNo', width: 11 },
      { header: 'Részleg', key: 'department', width: 20 }, { header: 'Ajtó', key: 'door', width: 22 }, { header: 'Telephely', key: 'site', width: 18 },
      { header: 'Vezérlő', key: 'controller', width: 16 }, { header: 'Kártya', key: 'card', width: 26 },
    ], rows.map((r) => ({ ...r, direction: r.direction === 'in' ? 'be' : r.direction === 'out' ? 'ki' : '' })), { user: req.user.name, filters: describeFilters(f) });
  } catch (e) { next(e); }
});

app.get('/api/export/attendance.xlsx', requireUser, async (req, res, next) => {
  try {
    if (!req.scope.canSeeAttendance) return res.status(403).json({ error: 'Nincs jogosultság.' });
    const f = parseFilters(req.query);
    const rows = store.attendance(req.scope, f);
    store.log(req.user, 'Munkaidő export (Excel)', `${rows.length} sor, ${describeFilters(f)}`);
    const h = (m) => Math.round((m / 60) * 100) / 100;
    await sendWorkbook(res, `munkaido_${f.from}_${f.to}.xlsx`, 'Munkaidő', [
      { header: 'Dátum', key: 'day', width: 12 }, { header: 'Dolgozó', key: 'person', width: 22 }, { header: 'Törzsszám', key: 'employeeNo', width: 11 },
      { header: 'Részleg', key: 'department', width: 20 }, { header: 'Beosztás', key: 'schedule', width: 20 }, { header: 'Első belépés', key: 'firstIn', width: 12 },
      { header: 'Utolsó kilépés', key: 'lastOut', width: 14 }, { header: 'Ledolgozott óra', key: 'worked', width: 15 }, { header: 'Késés (perc)', key: 'lateMin', width: 12 },
      { header: 'Túlóra (óra)', key: 'overtime', width: 12 }, { header: 'Jogcím', key: 'statusLabel', width: 22 },
    ], rows.map((r) => ({ ...r, worked: h(r.workedMin), overtime: h(r.overtimeMin) })), { user: req.user.name, filters: describeFilters(f) });
  } catch (e) { next(e); }
});

app.get('/healthz', (req, res) => res.json({ ok: true, today: dayKey(Date.now()) }));

// ---------- static front end ----------
app.use(staticMiddleware());
app.use('/api', (req, res) => res.status(404).json({ error: 'Nincs ilyen végpont.' }));
app.get('*', (req, res) => sendIndex(res));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (!res.headersSent) res.status(500).json({ error: 'Váratlan hiba történt.' });
});

app.listen(PORT, () => console.log(`Predor portál fut: http://localhost:${PORT}`));
