// Beléptetési adatportál, front end. Vanilla JS, no build step.
// All data is rendered with textContent (no innerHTML with data), CSP blocks inline scripts.

const root = document.getElementById('root');
const state = { user: null, csrf: '', meta: null, views: [] };

// ---------- helpers ----------
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
const svgNS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(state.csrf ? { 'X-CSRF-Token': state.csrf } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  });
  if (res.status === 401 && path !== '/api/login') { state.user = null; renderLogin(); throw new Error('auth'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Hiba történt.');
  return data;
}

function toast(msg) {
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

const fmtMin = (m) => { if (!m) return '0:00'; const sign = m < 0 ? '-' : ''; m = Math.abs(m); return `${sign}${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
const fmtHours = (m) => `${(m / 60).toLocaleString('hu-HU', { maximumFractionDigits: 1 })} óra`;
const DOW = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];
const fmtDay = (key) => { const d = new Date(key + 'T12:00:00Z'); return `${key.slice(5).replace('-', '.')}. ${DOW[d.getUTCDay()]}`; };
const addDays = (key, n) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const weekStart = (key) => { const d = new Date(key + 'T12:00:00Z').getUTCDay(); return addDays(key, -((d + 6) % 7)); };

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const parts = (path || 'attekintes').split('/');
  return { page: parts[0] || 'attekintes', arg: parts[1], params: new URLSearchParams(qs || '') };
}
function go(page, params) {
  const qs = params && [...params].length ? `?${params}` : '';
  location.hash = `#/${page}${qs}`;
}

const STATUS_CLASS = { present: 'ok', open: 'info', late: 'warn', missingExit: 'bad', absent: 'bad', vacation: '', sick: '', homeoffice: 'info', weekend: '', notYet: '' };
const TYPE_CLASS = (t) => (t === 'granted' ? 'ok' : t === 'door_forced' ? 'bad' : t === 'door_held' ? 'warn' : 'bad');

function mount(...children) {
  mainEl.replaceChildren(...children.flat(2).filter((c) => c != null && c !== false));
}

// ---------- icons ----------
const ICONS = {
  attekintes: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  esemenyek: 'M4 6h16M4 12h16M4 18h10',
  jelenlet: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z',
  riasztasok: 'M12 3l9 16H3L12 3zM12 10v4M12 17v.5',
  tobb: 'M5 12h.01M12 12h.01M19 12h.01',
};
function icon(name) {
  return s('svg', { class: 'nav-ico', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, s('path', { d: ICONS[name] }));
}

// ---------- login ----------
async function renderLogin(errMsg = '') {
  const cfg = await fetch('/api/config').then((r) => r.json());
  const err = h('p', { class: 'error', role: 'alert' }, errMsg);
  const code = h('input', { type: 'password', id: 'code', autocomplete: 'off', inputmode: 'text' });
  const roleInfo = {
    vezetoseg: 'Mindent lát, hozzáférési naplóval és az összekötő állapotával.',
    hr: 'Munkaidő és események minden dolgozóra, bérszámfejtési exporttal.',
    raktarvezeto: 'Csak a saját csapatát látja a győri raktárban.',
    biztonsag: 'Ajtók, elutasítások, riasztások, munkaidő nélkül.',
  };
  const login = async (l) => {
    err.textContent = '';
    try {
      const r = await api('/api/login', { method: 'POST', body: { login: l, code: code.value } });
      state.user = r.user; state.csrf = r.csrf;
      await boot();
    } catch (e) { if (e.message !== 'auth') err.textContent = e.message; }
  };
  root.replaceChildren(h('div', { class: 'login' }, h('div', { class: 'login-card' },
    h('div', { class: 'brand' }, h('div', { class: 'brand-mark', 'aria-hidden': 'true' }, 'B'), h('h1', {}, 'Beléptetési adatportál')),
    h('p', { class: 'muted' }, 'Demó Kft. · Predor beléptető és munkaidő-nyilvántartás adatai'),
    cfg.accessCodeRequired ? h('div', { class: 'field' }, h('label', { for: 'code' }, 'Belépési kód'), code) : null,
    h('p', { class: 'small muted' }, 'Válaszd ki, melyik szerepkörben nézed meg a portált:'),
    h('div', { class: 'role-list' }, cfg.users.map((u) => h('button', { class: 'role-btn', type: 'button', onclick: () => login(u.login) },
      h('strong', {}, u.roleLabel), h('span', { class: 'small muted' }, roleInfo[u.login] || '')))),
    err,
    h('div', { class: 'notice' }, 'Bemutató verzió kitalált adatokkal. Éles használatban a belépés céges fiókkal (Microsoft Entra ID) vagy jelszó és kétlépcsős azonosítás után történik.'),
  )));
}

// ---------- shell ----------
const NAV = [
  ['attekintes', 'Áttekintés'],
  ['esemenyek', 'Események'],
  ['jelenlet', 'Munkaidő'],
  ['riasztasok', 'Riasztások'],
  ['tobb', 'Több'],
];
let mainEl; let navLinks = [];
function renderShell() {
  const navItems = NAV.filter(([id]) => id !== 'jelenlet' || state.user.role !== 'security');
  const mk = (cls) => h('nav', { class: cls, 'aria-label': 'Fő navigáció' }, navItems.map(([id, label]) => h('a', { href: `#/${id}`, dataset: { page: id } }, icon(id), h('span', {}, label))));
  const side = mk('sidenav'); const bottom = mk('bottomnav');
  if (navItems.length === 4) bottom.style.gridTemplateColumns = 'repeat(4, 1fr)';
  navLinks = [...side.querySelectorAll('a'), ...bottom.querySelectorAll('a')];
  mainEl = h('main', { id: 'main', tabindex: '-1' });
  root.replaceChildren(h('div', { class: 'app' },
    h('div', {},
      h('div', { class: 'demo-ribbon' }, 'Demó adatok · minden név és esemény kitalált'),
      h('header', { class: 'topbar' }, h('div', { class: 'brand-mark', 'aria-hidden': 'true' }, 'B'), h('div', { class: 'title' }, 'Demó Kft.'), h('span', { class: 'chip-user', title: state.user.name }, state.user.roleLabel))),
    h('div', { class: 'layout' }, side, mainEl),
    bottom));
}

async function route() {
  if (!state.user) return;
  const { page, arg, params } = parseHash();
  const navPage = page === 'dolgozo' ? 'esemenyek' : ['naplo', 'osszekoto', 'nezetek'].includes(page) ? 'tobb' : page;
  for (const a of navLinks) {
    if (a.dataset.page === navPage) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  mount(h('div', { class: 'loading' }, 'Betöltés…'));
  try {
    const pages = { attekintes: pageOverview, esemenyek: pageEvents, jelenlet: pageAttendance, riasztasok: pageAlerts, tobb: pageMore, dolgozo: pagePerson, naplo: pageAudit, osszekoto: pageConnector, nezetek: pageViews };
    await (pages[page] || pageOverview)(params, arg);
    window.scrollTo(0, 0);
  } catch (e) {
    if (e.message !== 'auth') mount(h('div', { class: 'card' }, h('p', { class: 'error' }, e.message)));
  }
}

// ---------- charts ----------
function barChart(values, { labels, height = 140, values2, labelEvery = 1 }) {
  const w = 600; const pad = 22; const n = values.length;
  const max = Math.max(1, ...values, ...(values2 || []));
  const bw = (w - pad) / n;
  const svg = s('svg', { class: 'chart', viewBox: `0 0 ${w} ${height + 18}`, role: 'img' });
  svg.append(s('line', { class: 'axis', x1: pad, x2: w, y1: height, y2: height }));
  svg.append(s('text', { x: 0, y: 10 }, String(max)));
  values.forEach((v, i) => {
    const x = pad + i * bw;
    if (values2) {
      const v2 = values2[i]; const h2 = (v2 / max) * (height - 12);
      const h1 = (v / max) * (height - 12);
      svg.append(s('rect', { class: 'b1', x: x + bw * 0.15, y: height - h1, width: bw * 0.7, height: h1, rx: 2 }, s('title', {}, `${labels[i]}: ${v} bent`)));
      svg.append(s('rect', { class: 'b2', x: x + bw * 0.15, y: height - h1 - h2, width: bw * 0.7, height: h2, rx: 2 }, s('title', {}, `${labels[i]}: ${v2} home office`)));
    } else {
      const bh = (v / max) * (height - 12);
      svg.append(s('rect', { class: 'b1', x: x + bw * 0.12, y: height - bh, width: bw * 0.76, height: bh, rx: 2 }, s('title', {}, `${labels[i]}: ${v}`)));
    }
    if (i % labelEvery === 0) svg.append(s('text', { x: x + bw / 2, y: height + 13, 'text-anchor': 'middle' }, labels[i]));
  });
  return svg;
}

// ---------- overview ----------
async function pageOverview() {
  const o = await api('/api/overview');
  const c = o.counts || {};
  const wk = weekStart(o.today);
  const p = (obj) => new URLSearchParams(obj);
  const kpi = (v, l, cls, href) => h('a', { class: `kpi ${cls || ''}`, href }, h('span', { class: 'v' }, v), h('span', { class: 'l' }, l));
  const att = state.user.role !== 'security';
  const kpis = h('div', { class: 'kpis' },
    kpi(o.inside, 'Most bent van', 'good', att ? `#/jelenlet?${p({ status: 'open' })}` : '#/esemenyek'),
    att ? kpi((c.present || 0) + (c.late || 0) + (c.open || 0) + (c.missingExit || 0), `Megjelent ma (${o.headcount} főből)`, '', `#/jelenlet`) : null,
    att ? kpi(c.late || 0, 'Késett ma', (c.late ? 'warn' : ''), `#/jelenlet?${p({ status: 'late' })}`) : null,
    att ? kpi((c.vacation || 0) + (c.sick || 0) + (c.homeoffice || 0), 'Szabadság, beteg, home office', '', `#/jelenlet?${p({ status: 'vacation,sick,homeoffice' })}`) : null,
    kpi(o.deniedToday, 'Elutasított belépés ma', o.deniedToday ? 'bad' : '', `#/esemenyek?${p({ result: 'problem' })}`),
    kpi(o.alertCount, 'Riasztás az elmúlt 7 napban', o.alertCount ? 'warn' : '', `#/riasztasok?${p({ from: addDays(o.today, -6) })}`),
    att ? null : kpi(o.eventsToday, 'Esemény ma', '', '#/esemenyek'),
  );
  const hours = o.arrivals.map((_, i) => String(i));
  const arrivalsCard = h('section', { class: 'card' }, h('h2', {}, 'Érkezések óránként, ma'), barChart(o.arrivals, { labels: hours, labelEvery: 3 }));
  const trendCard = h('section', { class: 'card' }, h('h2', {}, 'Jelenlét az elmúlt 14 napban'),
    barChart(o.trend.map((t) => t.present), { labels: o.trend.map((t) => t.day.slice(8)), values2: o.trend.map((t) => t.homeoffice) }),
    h('div', { class: 'legend' }, h('span', {}, h('i', { class: 'lg1' }), 'Bent'), h('span', {}, h('i', { class: 'lg2' }), 'Home office')));

  const late = o.lateToday && o.lateToday.length
    ? h('div', { class: 'list' }, o.lateToday.map((r) => h('a', { class: 'item', href: `#/dolgozo/${r.personId}` }, h('span', { class: 't' }, r.firstIn), h('div', { class: 'main' }, h('div', { class: 'n' }, r.person), h('div', { class: 's' }, r.department)), h('span', { class: 'pill warn' }, `+${r.lateMin} perc`))))
    : h('p', { class: 'muted' }, 'Ma senki nem késett.');
  const alerts = o.alerts.length ? h('div', { class: 'list' }, o.alerts.map(alertItem)) : h('p', { class: 'muted' }, 'Nincs riasztás.');

  mount(
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Áttekintés'), h('div', { class: 'muted small' }, `${fmtDay(o.today)} · ${state.user.roleInfo}`)),
      h('div', { class: 'actions' }, h('a', { class: 'btn', href: `#/jelenlet?${p({ from: wk })}` }, 'Heti munkaidő'))),
    kpis,
    h('div', { class: 'two' }, arrivalsCard, trendCard),
    h('div', { class: 'two' }, att ? h('section', { class: 'card' }, h('h2', {}, 'Mai késések'), late) : null, h('section', { class: 'card' }, h('h2', {}, 'Legutóbbi riasztások'), alerts, h('div', { class: 'more' }, h('a', { class: 'btn btn-sm', href: '#/riasztasok' }, 'Összes riasztás')))),
    o.connector ? h('section', { class: 'card' }, h('h2', {}, 'Adatkapcsolat'), h('p', {}, h('span', { class: 'status-dot' }), `Az összekötő ${relTime(o.connector.lastPush)} küldött adatot. Forrás: ${o.connector.source}.`), h('a', { class: 'btn btn-sm', href: '#/osszekoto' }, 'Részletek')) : null,
  );
  mainEl.querySelectorAll('.two').forEach((el) => { el.style.marginBottom = '12px'; });
}

function relTime(ts) {
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 60) return 'néhány másodperce';
  if (sec < 3600) return `${Math.round(sec / 60)} perce`;
  return `${Math.round(sec / 3600)} órája`;
}

function alertItem(a) {
  const sev = { high: ['bad', 'Magas'], medium: ['warn', 'Közepes'], low: ['', 'Alacsony'] }[a.severity];
  return h(a.personId ? 'a' : 'div', { class: `item alert ${a.severity}`, href: a.personId ? `#/dolgozo/${a.personId}` : null },
    h('div', { class: 'main' },
      h('div', { class: 'n' }, a.kind),
      h('div', { class: 'meta' }, `${fmtDay(a.day)}${a.time && a.time !== '–' ? ` · ${a.time}` : ''}`),
      h('div', { class: 'wrap' }, a.text)),
    h('span', { class: `pill ${sev[0]}` }, sev[1]));
}

// ---------- filters ----------
function datePresets(today) {
  const ws = weekStart(today);
  return [
    ['Ma', today, today],
    ['Tegnap', addDays(today, -1), addDays(today, -1)],
    ['Ez a hét', ws, today],
    ['Előző hét', addDays(ws, -7), addDays(ws, -1)],
    ['Elmúlt 30 nap', addDays(today, -29), today],
  ];
}

function filterBar(params, { onChange, showDoorFilters = true, showStatus = false, exportPath, viewPage }) {
  const meta = state.meta;
  const from = params.get('from') || (showStatus ? weekStart(meta.today) : meta.today);
  const to = params.get('to') || meta.today;
  const set = (k, v) => { if (v == null || v === '') params.delete(k); else params.set(k, v); params.delete('page'); onChange(params); };

  const presetSel = h('select', { 'aria-label': 'Időszak' }, h('option', { value: '' }, 'Egyedi időszak'),
    datePresets(meta.today).map(([l, f, t]) => h('option', { value: `${f}|${t}`, selected: f === from && t === to ? true : null }, l)));
  presetSel.addEventListener('change', () => { if (!presetSel.value) return; const [f, t] = presetSel.value.split('|'); params.set('from', f); params.set('to', t); params.delete('page'); onChange(params); });
  const fromIn = h('input', { type: 'date', value: from, min: meta.range.min, max: meta.range.max, 'aria-label': 'Kezdő nap' });
  const toIn = h('input', { type: 'date', value: to, min: meta.range.min, max: meta.range.max, 'aria-label': 'Záró nap' });
  fromIn.addEventListener('change', () => set('from', fromIn.value));
  toIn.addEventListener('change', () => set('to', toIn.value));
  const search = h('input', { type: 'search', placeholder: 'Név, törzsszám vagy ajtó', value: params.get('q') || '', 'aria-label': 'Keresés' });
  let t; search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => set('q', search.value.trim()), 350); });

  const activeKeys = ['site', 'department', 'person', 'door', 'type', 'result', 'direction', 'hourFrom', 'hourTo', 'status', 'severity'];
  const activeCount = activeKeys.filter((k) => params.get(k)).length;
  const moreBtn = h('button', { class: 'btn', type: 'button', onclick: () => openSheet(params, { onChange, showDoorFilters, showStatus }) }, 'Szűrők', activeCount ? h('span', { class: 'badge' }, activeCount) : null);
  const exportBtn = exportPath ? h('a', { class: 'btn', href: `${exportPath}?${params}`, download: '', onclick: () => toast('Az Excel fájl letöltése elindult.') }, 'Excel') : null;
  const saveBtn = viewPage ? h('button', { class: 'btn', type: 'button', onclick: () => saveView(viewPage, params) }, 'Nézet mentése') : null;

  const chips = h('div', { class: 'chips' });
  const label = (k, v) => {
    const find = (arr, id) => arr.find((x) => x.id === id)?.name || id;
    switch (k) {
      case 'site': return find(meta.sites, v);
      case 'department': return find(meta.departments, v);
      case 'person': return find(meta.persons, v);
      case 'door': return v.split(',').map((d) => find(meta.doors, d)).join(', ');
      case 'type': return v.split(',').map((x) => meta.eventTypes[x]).join(', ');
      case 'result': return v === 'granted' ? 'Csak engedélyezett' : 'Csak elutasítás és riasztás';
      case 'direction': return v === 'in' ? 'Csak belépés' : 'Csak kilépés';
      case 'hourFrom': return `${v} órától`;
      case 'hourTo': return `${v} óráig`;
      case 'status': return v.split(',').map((x) => STATUS_LABELS[x] || x).join(', ');
      case 'severity': return { high: 'Magas', medium: 'Közepes', low: 'Alacsony' }[v];
      default: return v;
    }
  };
  for (const k of activeKeys) {
    const v = params.get(k);
    if (!v) continue;
    chips.append(h('button', { class: 'chip', type: 'button', 'aria-label': `Szűrő törlése: ${label(k, v)}`, onclick: () => set(k, null) }, label(k, v), h('span', { class: 'x', 'aria-hidden': 'true' }, '×')));
  }
  return h('div', {},
    h('div', { class: 'filterbar' },
      h('div', { class: 'row' }, presetSel, fromIn, toIn),
      h('div', { class: 'row' }, search, moreBtn, exportBtn, saveBtn)),
    chips);
}

const STATUS_LABELS = { present: 'Megjelent', late: 'Késés', overtime: 'Túlóra', missingExit: 'Hiányzó kilépés', absent: 'Igazolatlan', vacation: 'Szabadság', sick: 'Beteg', homeoffice: 'Home office', open: 'Bent van' };

function openSheet(params, { onChange, showDoorFilters, showStatus }) {
  const meta = state.meta;
  const draft = new URLSearchParams(params);
  const sel = (name, label, options, allLabel = 'Mind') => {
    const el = h('select', { id: `f-${name}` }, h('option', { value: '' }, allLabel), options.map(([v, l]) => h('option', { value: v, selected: draft.get(name) === v ? true : null }, l)));
    el.addEventListener('change', () => (el.value ? draft.set(name, el.value) : draft.delete(name)));
    return h('div', { class: 'field' }, h('label', { for: `f-${name}` }, label), el);
  };
  const multi = (name, label, options) => {
    const current = new Set((draft.get(name) || '').split(',').filter(Boolean));
    const boxes = options.map(([v, l]) => {
      const cb = h('input', { type: 'checkbox', value: v, checked: current.has(v) ? true : null });
      cb.addEventListener('change', () => { cb.checked ? current.add(v) : current.delete(v); current.size ? draft.set(name, [...current].join(',')) : draft.delete(name); });
      return h('label', {}, cb, l);
    });
    return h('fieldset', {}, h('legend', {}, label), h('div', { class: 'checks' }, boxes));
  };
  const visibleDeps = meta.departments.filter((d) => !draft.get('site') || d.siteId === draft.get('site'));
  const body = h('div', {},
    meta.sites.length > 1 ? sel('site', 'Telephely', meta.sites.map((x) => [x.id, x.name])) : null,
    meta.departments.length > 1 ? sel('department', 'Részleg', visibleDeps.map((x) => [x.id, x.name])) : null,
    sel('person', 'Dolgozó', meta.persons.slice().sort((a, b) => a.name.localeCompare(b.name, 'hu')).map((x) => [x.id, `${x.name} (${x.employeeNo})`]), 'Mindenki'),
    showStatus ? multi('status', 'Jogcím, eltérés', Object.entries(STATUS_LABELS)) : null,
    showDoorFilters ? sel('result', 'Eredmény', [['granted', 'Csak engedélyezett'], ['problem', 'Csak elutasítás és riasztás']]) : null,
    showDoorFilters ? sel('direction', 'Irány', [['in', 'Belépés'], ['out', 'Kilépés']]) : null,
    showDoorFilters ? h('div', { class: 'row' }, ...[['hourFrom', 'Órától'], ['hourTo', 'Óráig']].map(([k, l]) => sel(k, l, Array.from({ length: 24 }, (_, i) => [String(i), `${i}:00`]), '–'))) : null,
    showDoorFilters ? multi('door', 'Ajtók', meta.doors.map((d) => [d.id, d.name])) : null,
    showDoorFilters ? multi('type', 'Eseménytípus', Object.entries(meta.eventTypes)) : null,
  );
  body.querySelectorAll('.row').forEach((r) => { r.style.display = 'flex'; r.style.gap = '8px'; [...r.children].forEach((c) => { c.style.flex = '1'; }); });
  const close = () => { backdrop.remove(); sheet.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const backdrop = h('div', { class: 'sheet-backdrop', onclick: close });
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Szűrők' },
    h('div', { class: 'sheet-head' }, h('h2', {}, 'Szűrők'), h('button', { class: 'btn btn-ghost', type: 'button', onclick: close, 'aria-label': 'Bezárás' }, '✕')),
    body,
    h('div', { class: 'sheet-foot' },
      h('button', { class: 'btn', type: 'button', onclick: () => { const keep = new URLSearchParams(); for (const k of ['from', 'to', 'q']) if (params.get(k)) keep.set(k, params.get(k)); close(); onChange(keep); } }, 'Törlés'),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { draft.delete('page'); close(); onChange(draft); } }, 'Alkalmaz')));
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop, sheet);
  sheet.querySelector('select, input, button')?.focus();
}

async function saveView(page, params) {
  const name = window.prompt('Mi legyen a nézet neve?');
  if (!name) return;
  try {
    const p = new URLSearchParams(params); p.delete('page');
    await api('/api/views', { method: 'POST', body: { name, page, query: p.toString() } });
    toast('Nézet elmentve. A Több menüben találod.');
  } catch (e) { toast(e.message); }
}

// ---------- events ----------
async function pageEvents(params) {
  const page = Number(params.get('page') || 1);
  const pageSize = 50;
  const qs = new URLSearchParams(params); qs.set('pageSize', String(pageSize * page)); qs.delete('page');
  const data = await api(`/api/events?${qs}`);
  const onChange = (p) => go('esemenyek', p);
  const bar = filterBar(params, { onChange, exportPath: '/api/export/events.xlsx', viewPage: 'esemenyek' });
  const typeChips = h('div', { class: 'chips' }, Object.entries(data.byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => {
    const on = (params.get('type') || '') === t;
    return h('button', { class: 'chip', type: 'button', 'aria-pressed': on ? 'true' : 'false', onclick: () => { const p = new URLSearchParams(params); on ? p.delete('type') : p.set('type', t); p.delete('page'); onChange(p); } }, `${state.meta.eventTypes[t]}: ${n}`);
  }));
  const rows = data.rows;
  const list = h('div', { class: 'list responsive' }, rows.map((r) => h(r.personId ? 'a' : 'div', { class: 'item', href: r.personId ? `#/dolgozo/${r.personId}` : null },
    h('span', { class: 't' }, h('div', {}, r.time), h('div', { class: 'muted small' }, fmtDay(r.day))),
    h('div', { class: 'main' }, h('div', { class: 'n' }, r.person), h('div', { class: 's' }, `${r.direction === 'in' ? '→ ' : r.direction === 'out' ? '← ' : ''}${r.door} · ${r.site}`)),
    h('span', { class: `pill ${TYPE_CLASS(r.type)}` }, r.type === 'granted' ? (r.direction === 'out' ? 'Ki' : 'Be') : r.typeLabel.replace('Elutasítva: ', '')))));
  const table = h('div', { class: 'table-wrap' }, h('table', {},
    h('thead', {}, h('tr', {}, ['Dátum', 'Idő', 'Dolgozó', 'Részleg', 'Ajtó', 'Irány', 'Esemény', 'Kártya'].map((x) => h('th', { scope: 'col' }, x)))),
    h('tbody', {}, rows.map((r) => h('tr', {},
      h('td', {}, fmtDay(r.day)), h('td', {}, r.time),
      h('td', {}, r.personId ? h('a', { href: `#/dolgozo/${r.personId}` }, r.person) : r.person),
      h('td', {}, r.department), h('td', {}, `${r.door}`), h('td', {}, r.direction === 'in' ? 'be' : r.direction === 'out' ? 'ki' : ''),
      h('td', {}, h('span', { class: `pill ${TYPE_CLASS(r.type)}` }, r.typeLabel)), h('td', { class: 'muted' }, r.card))))));
  const more = rows.length < data.total ? h('div', { class: 'more' }, h('button', { class: 'btn', type: 'button', onclick: () => { const p = new URLSearchParams(params); p.set('page', String(page + 1)); history.replaceState(null, '', `#/esemenyek?${p}`); route(); } }, `Továbbiak (${data.total - rows.length})`)) : null;
  mount(
    h('div', { class: 'page-head' }, h('h1', {}, 'Események')),
    bar,
    h('div', { class: 'count-line' }, `${data.total.toLocaleString('hu-HU')} esemény · ${data.filters.from === data.filters.to ? fmtDay(data.filters.from) : `${fmtDay(data.filters.from)} – ${fmtDay(data.filters.to)}`}`),
    typeChips,
    rows.length ? [list, table, more] : h('div', { class: 'card empty' }, 'Nincs a szűrésnek megfelelő esemény.'),
  );
}

// ---------- attendance ----------
async function pageAttendance(params) {
  if (state.user.role === 'security') return go('attekintes');
  const page = Number(params.get('page') || 1);
  const pageSize = 60;
  const qs = new URLSearchParams(params);
  if (!qs.get('from')) qs.set('from', weekStart(state.meta.today));
  qs.set('pageSize', String(Math.min(200, pageSize * page))); qs.delete('page');
  const data = await api(`/api/attendance?${qs}`);
  const onChange = (p) => go('jelenlet', p);
  const bar = filterBar(params, { onChange, showDoorFilters: false, showStatus: true, exportPath: '/api/export/attendance.xlsx', viewPage: 'jelenlet' });
  const sm = data.summary;
  const statusChip = (k, label, n) => {
    const on = (params.get('status') || '') === k;
    return h('button', { class: 'chip', type: 'button', 'aria-pressed': on ? 'true' : 'false', onclick: () => { const p = new URLSearchParams(params); on ? p.delete('status') : p.set('status', k); p.delete('page'); onChange(p); } }, `${label}: ${n}`);
  };
  const kp = (v, l, cls) => h('div', { class: `kpi ${cls || ''}` }, h('span', { class: 'v' }, v), h('span', { class: 'l' }, l));
  const rows = data.rows;
  const list = h('div', { class: 'list responsive' }, rows.map((r) => h('a', { class: 'item', href: `#/dolgozo/${r.personId}` },
    h('span', { class: 't' }, h('div', {}, fmtDay(r.day)), h('div', { class: 'muted small' }, r.firstIn ? `${r.firstIn}–${r.lastOut || '…'}` : '')),
    h('div', { class: 'main' }, h('div', { class: 'n' }, r.person), h('div', { class: 's' }, `${r.department} · ${r.workedMin ? fmtMin(r.workedMin) + ' ledolgozva' : r.schedule}${r.overtimeMin ? ` · túlóra ${fmtMin(r.overtimeMin)}` : ''}`)),
    h('span', { class: `pill ${STATUS_CLASS[r.status] || ''}` }, r.lateMin ? `Késés ${r.lateMin}p` : r.statusLabel))));
  const table = h('div', { class: 'table-wrap' }, h('table', {},
    h('thead', {}, h('tr', {}, ['Dátum', 'Dolgozó', 'Részleg', 'Beosztás', 'Be', 'Ki', 'Ledolgozott', 'Késés', 'Túlóra', 'Jogcím'].map((x, i) => h('th', { scope: 'col', class: i >= 6 && i <= 8 ? 'num' : null }, x)))),
    h('tbody', {}, rows.map((r) => h('tr', {},
      h('td', {}, fmtDay(r.day)), h('td', {}, h('a', { href: `#/dolgozo/${r.personId}` }, r.person)), h('td', {}, r.department), h('td', { class: 'muted' }, r.schedule),
      h('td', {}, r.firstIn || ''), h('td', {}, r.lastOut || ''), h('td', { class: 'num' }, r.workedMin ? fmtMin(r.workedMin) : ''),
      h('td', { class: 'num' }, r.lateMin ? `${r.lateMin} p` : ''), h('td', { class: 'num' }, r.overtimeMin ? fmtMin(r.overtimeMin) : ''),
      h('td', {}, h('span', { class: `pill ${STATUS_CLASS[r.status] || ''}` }, r.statusLabel)))))));
  const more = rows.length < data.total && rows.length < 200 ? h('div', { class: 'more' }, h('button', { class: 'btn', type: 'button', onclick: () => { const p = new URLSearchParams(params); p.set('page', String(page + 1)); history.replaceState(null, '', `#/jelenlet?${p}`); route(); } }, `Továbbiak (${data.total - rows.length})`))
    : rows.length < data.total ? h('p', { class: 'muted small' }, `Itt az első 200 sor látszik. A teljes listát (${data.total} sor) az Excel exportban kapod meg.`) : null;
  mount(
    h('div', { class: 'page-head' }, h('h1', {}, 'Munkaidő')),
    bar,
    h('div', { class: 'kpis' },
      kp(fmtHours(sm.workedMin), 'Ledolgozott idő'), kp(fmtHours(sm.overtimeMin), 'Túlóra', sm.overtimeMin ? 'warn' : ''),
      kp(sm.lateCount, `Késés (${sm.lateMin} perc)`, sm.lateCount ? 'warn' : ''), kp(sm.missingExit, 'Hiányzó kilépés', sm.missingExit ? 'bad' : ''),
      kp(sm.absent, 'Igazolatlan hiányzás', sm.absent ? 'bad' : ''), kp(sm.vacation + sm.sick + sm.homeoffice, 'Szabadság, beteg, HO')),
    h('div', { class: 'chips' }, statusChip('late', 'Késés', sm.lateCount), statusChip('overtime', 'Túlóra', rows.length ? '…' : 0), statusChip('missingExit', 'Hiányzó kilépés', sm.missingExit), statusChip('absent', 'Igazolatlan', sm.absent), statusChip('homeoffice', 'Home office', sm.homeoffice)),
    h('div', { class: 'count-line' }, `${data.total.toLocaleString('hu-HU')} sor · munkaközi szünet (20 perc) levonva 6 óra felett`),
    rows.length ? [list, table, more] : h('div', { class: 'card empty' }, 'Nincs a szűrésnek megfelelő nap.'),
  );
  // Overtime chip count is not in the summary as a count; replace the placeholder with total overtime hours.
  mainEl.querySelectorAll('.chips .chip').forEach((c) => { if (c.textContent.startsWith('Túlóra')) c.textContent = `Túlóra: ${fmtHours(sm.overtimeMin)}`; });
}

// ---------- alerts ----------
async function pageAlerts(params) {
  const qs = new URLSearchParams(params);
  if (!qs.get('from')) qs.set('from', addDays(state.meta.today, -13));
  const data = await api(`/api/alerts?${qs}`);
  const onChange = (p) => go('riasztasok', p);
  const sevChip = (k, l) => { const on = params.get('severity') === k; return h('button', { class: 'chip', type: 'button', 'aria-pressed': on ? 'true' : 'false', onclick: () => { const p = new URLSearchParams(params); on ? p.delete('severity') : p.set('severity', k); onChange(p); } }, l); };
  const p2 = new URLSearchParams(params); if (!p2.get('from')) p2.set('from', addDays(state.meta.today, -13));
  mount(
    h('div', { class: 'page-head' }, h('h1', {}, 'Riasztások')),
    filterBar(p2, { onChange, showDoorFilters: false, viewPage: 'riasztasok' }),
    h('div', { class: 'chips' }, sevChip('high', 'Magas'), sevChip('medium', 'Közepes'), sevChip('low', 'Alacsony')),
    h('p', { class: 'muted small' }, 'A szabályok testre szabhatók: például értesítés Teamsbe vagy e-mailben, ha valaki háromszor elutasítást kap ugyanannál az ajtónál.'),
    data.rows.length ? h('div', { class: 'list' }, data.rows.map(alertItem)) : h('div', { class: 'card empty' }, 'Nincs riasztás ebben az időszakban.'),
  );
}

// ---------- person ----------
async function pagePerson(params, id) {
  const qs = new URLSearchParams(params);
  if (!qs.get('from')) qs.set('from', addDays(state.meta.today, -13));
  const d = await api(`/api/person/${encodeURIComponent(id)}?${qs}`);
  const p = d.person;
  const sm = d.summary;
  const evByDay = new Map();
  for (const e of d.events) { if (!evByDay.has(e.day)) evByDay.set(e.day, []); evByDay.get(e.day).push(e); }
  const timeline = [...evByDay.entries()].slice(0, 14).map(([day, evs]) => h('section', { class: 'card' },
    h('h2', {}, fmtDay(day)),
    h('div', { class: 'list' }, evs.slice().reverse().map((e) => h('div', { class: 'item' }, h('span', { class: 't' }, e.time), h('div', { class: 'main' }, h('div', { class: 'n' }, e.door), h('div', { class: 's' }, e.site)), h('span', { class: `pill ${TYPE_CLASS(e.type)}` }, e.type === 'granted' ? (e.direction === 'out' ? 'Ki' : 'Be') : e.typeLabel.replace('Elutasítva: ', '')))))));
  const kp = (v, l, cls) => h('div', { class: `kpi ${cls || ''}` }, h('span', { class: 'v' }, v), h('span', { class: 'l' }, l));
  const evParams = new URLSearchParams({ person: p.id, from: qs.get('from') });
  mount(
    h('div', { class: 'page-head' }, h('div', { class: 'person-head' }, h('h1', {}, p.name), h('div', { class: 'muted' }, `${p.position} · ${p.department} · ${p.site}`)),
      h('div', { class: 'actions' }, h('a', { class: 'btn', href: `#/esemenyek?${evParams}` }, 'Események'), state.user.role !== 'security' ? h('a', { class: 'btn', href: `#/jelenlet?${evParams}` }, 'Munkaidő') : null)),
    h('section', { class: 'card' }, h('dl', { class: 'kv' }, h('dt', {}, 'Törzsszám'), h('dd', {}, p.employeeNo), h('dt', {}, 'Kártya'), h('dd', {}, p.card), h('dt', {}, 'Érvényes'), h('dd', {}, p.cardValid), h('dt', {}, 'Időszak'), h('dd', {}, `${fmtDay(qs.get('from'))} – ${fmtDay(qs.get('to') || state.meta.today)}`))),
    sm ? h('div', { class: 'kpis' }, kp(sm.workdays, 'Munkanap'), kp(fmtHours(sm.workedMin), 'Ledolgozott'), kp(fmtHours(sm.overtimeMin), 'Túlóra', sm.overtimeMin ? 'warn' : ''), kp(sm.lateCount, 'Késés', sm.lateCount ? 'warn' : ''), kp(sm.vacation + sm.sick, 'Szabadság, beteg'), kp(sm.homeoffice, 'Home office')) : null,
    h('h2', {}, 'Napok eseményei'),
    timeline.length ? h('div', { class: 'grid' }, timeline) : h('div', { class: 'card empty' }, 'Ebben az időszakban nincs esemény.'),
  );
  mainEl.querySelector('.kv')?.parentElement.style.setProperty('margin-bottom', '12px');
  mainEl.querySelectorAll('h2').forEach((x) => { if (x.parentElement === mainEl) x.style.margin = '16px 0 10px'; });
}

// ---------- more ----------
async function pageMore() {
  const u = state.user;
  mount(
    h('div', { class: 'page-head' }, h('h1', {}, 'Több')),
    h('section', { class: 'card' }, h('h2', {}, u.name), h('p', { class: 'muted' }, `${u.roleLabel}: ${u.roleInfo}`), h('p', { class: 'small muted' }, `Telephely: ${u.sites.join(', ')}${u.departments ? ` · Részleg: ${u.departments.join(', ')}` : ''}`)),
    h('div', { class: 'menu-list' },
      h('a', { class: 'btn', href: '#/nezetek' }, 'Mentett nézetek', h('span', { 'aria-hidden': 'true' }, '›')),
      u.role === 'owner' ? h('a', { class: 'btn', href: '#/naplo' }, 'Hozzáférési napló', h('span', { 'aria-hidden': 'true' }, '›')) : null,
      u.role === 'owner' ? h('a', { class: 'btn', href: '#/osszekoto' }, 'Adatkapcsolat (összekötő)', h('span', { 'aria-hidden': 'true' }, '›')) : null,
      h('button', { class: 'btn', type: 'button', onclick: installHint }, 'Kitétel a kezdőképernyőre', h('span', { 'aria-hidden': 'true' }, '›')),
      h('button', { class: 'btn', type: 'button', onclick: logout }, 'Kijelentkezés', h('span', { 'aria-hidden': 'true' }, '›'))),
    h('p', { class: 'small muted' }, 'Adatkezelés: az adatok EU-s adatközpontban, titkosítva tárolódnak. Fényképet nem tárolunk, a kártyaszámok maszkolva érkeznek. Minden megtekintés és export naplózva van.'),
  );
  mainEl.querySelector('.card').style.marginBottom = '12px';
}

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
function installHint() {
  if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; return; }
  toast(/iPhone|iPad/.test(navigator.userAgent) ? 'Safariban: Megosztás, majd „Főképernyőhöz adás”.' : 'A böngésző menüjében: „Alkalmazás telepítése” vagy „Hozzáadás a kezdőképernyőhöz”.');
}

async function logout() {
  try { await api('/api/logout', { method: 'POST' }); } catch { /* ignore */ }
  state.user = null; state.csrf = '';
  location.hash = '';
  renderLogin();
}

async function pageViews() {
  const data = await api('/api/views');
  const titles = { esemenyek: 'Események', jelenlet: 'Munkaidő', riasztasok: 'Riasztások' };
  const render = (rows) => h('div', { class: 'list' }, rows.map((v) => h('div', { class: 'item' },
    h('span', { class: 'pill info' }, titles[v.page]),
    h('a', { class: 'main', href: `#/${v.page}?${v.query}` }, h('div', { class: 'n' }, v.name), h('div', { class: 's' }, v.query.replace(/&/g, ' · ') || 'alapértelmezett')),
    h('button', { class: 'btn btn-sm btn-ghost', type: 'button', 'aria-label': `Törlés: ${v.name}`, onclick: async () => { await api(`/api/views/${v.id}`, { method: 'DELETE' }); route(); } }, 'Törlés'))));
  mount(
    h('div', { class: 'page-head' }, h('h1', {}, 'Mentett nézetek')),
    h('p', { class: 'muted small' }, 'Bármelyik szűrést elmentheted az Események, Munkaidő vagy Riasztások oldalon a „Nézet mentése” gombbal.'),
    data.rows.length ? render(data.rows) : h('div', { class: 'card empty' }, 'Még nincs mentett nézet.'),
  );
}

async function pageAudit() {
  const data = await api('/api/audit');
  mount(
    h('div', { class: 'page-head' }, h('h1', {}, 'Hozzáférési napló')),
    h('p', { class: 'muted small' }, 'A GDPR és a munkáltatói ellenőrzés szabályai miatt rögzítjük, ki mikor mit nézett meg vagy exportált. Ez a napló nem törölhető a portálról.'),
    data.rows.length ? h('div', { class: 'list' }, data.rows.map((r) => h('div', { class: 'item' },
      h('span', { class: 't' }, new Date(r.ts).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Budapest' })),
      h('div', { class: 'main' }, h('div', { class: 'n' }, r.action), h('div', { class: 's' }, `${r.user} (${r.role})${r.detail ? ' · ' + r.detail : ''}`)),
      h('span', {}, '')))) : h('div', { class: 'card empty' }, 'Még nincs bejegyzés.'),
  );
}

async function pageConnector() {
  const c = await api('/api/connector');
  mount(
    h('div', { class: 'page-head' }, h('h1', {}, 'Adatkapcsolat')),
    h('section', { class: 'card' },
      h('p', {}, h('span', { class: 'status-dot' }), `Működik. Utolsó adatküldés: ${relTime(c.lastPush)}.`),
      h('dl', { class: 'kv' },
        h('dt', {}, 'Ügyfél'), h('dd', {}, c.tenant),
        h('dt', {}, 'Forrás'), h('dd', {}, c.source),
        h('dt', {}, 'Predor szerver'), h('dd', {}, `${c.predorHost} (az ügyfél belső hálózatán)`),
        h('dt', {}, 'Összekötő verzió'), h('dd', {}, c.version),
        h('dt', {}, 'Várakozó sor'), h('dd', {}, String(c.queue)),
        h('dt', {}, 'Tárolt események'), h('dd', {}, c.eventsStored.toLocaleString('hu-HU')),
        h('dt', {}, 'Élő adatfogadás'), h('dd', {}, c.ingestConfigured ? 'bekapcsolva' : 'demó módban kikapcsolva'))),
    h('section', { class: 'card' }, h('h2', {}, 'Hogyan érkezik az adat?'),
      h('ol', {},
        h('li', {}, 'Az ügyfél szerverén egy kis Docker konténer fut (az összekötő).'),
        h('li', {}, 'Percenként lekéri az új eseményeket a Predor Integrációs API-ból, vagy feldolgozza a Predor időzített Excel exportját.'),
        h('li', {}, 'A kártyaszámot maszkolja, a felesleges mezőket eldobja.'),
        h('li', {}, 'Aláírt, titkosított HTTPS kéréssel feltölti ide. Csak kifelé kommunikál, nem kell portot nyitni.'),
        h('li', {}, 'Ha megszakad a net, helyben sorba állítja és később pótolja.'))),
  );
  mainEl.querySelectorAll('.card').forEach((x) => { x.style.marginBottom = '12px'; });
}

// ---------- boot ----------
async function boot() {
  state.meta = await api('/api/meta');
  renderShell();
  if (!location.hash || location.hash === '#') location.hash = '#/attekintes';
  else route();
}

window.addEventListener('hashchange', route);
(async () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  try {
    const me = await api('/api/me');
    state.user = me.user; state.csrf = me.csrf;
    await boot();
  } catch (e) { if (e.message !== 'auth' && !state.user) renderLogin(); }
})();
