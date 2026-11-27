// Europe/Budapest helpers without external dependencies.
const TZ = 'Europe/Budapest';
const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short',
});

export function budapestParts(epoch) {
  const parts = Object.fromEntries(fmt.formatToParts(new Date(epoch)).map((p) => [p.type, p.value]));
  return {
    y: Number(parts.year), m: Number(parts.month), d: Number(parts.day),
    h: Number(parts.hour), min: Number(parts.minute), s: Number(parts.second),
    weekday: parts.weekday,
  };
}

function offsetMinutes(epoch) {
  const p = budapestParts(epoch);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
  return Math.round((asUtc - Math.floor(epoch / 1000) * 1000) / 60000);
}

// Local Budapest wall time to epoch ms. Minutes may overflow (e.g. 6:-8).
export function budapestToEpoch(y, m, d, h, min) {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const off = offsetMinutes(guess);
  const first = guess - off * 60000;
  const off2 = offsetMinutes(first);
  return guess - off2 * 60000;
}

export function dayKey(epoch) {
  const p = budapestParts(epoch);
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function dayStart(key) {
  const [y, m, d] = key.split('-').map(Number);
  return budapestToEpoch(y, m, d, 0, 0);
}

export function weekdayOf(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function hhmm(epoch) {
  const p = budapestParts(epoch);
  return `${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`;
}

export function isValidDayKey(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}
