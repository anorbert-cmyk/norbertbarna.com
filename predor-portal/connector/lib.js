import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = process.env.DATA_DIR || './data';
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const SPOOL_FILE = path.join(DATA_DIR, 'spool.jsonl');

export function log(level, msg, extra) {
  // Structured logs, never log card numbers or API keys.
  console.log(JSON.stringify({ t: new Date().toISOString(), level, msg, ...(extra || {}) }));
}

export function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { cursor: '0' }; }
}
export function saveState(state) {
  const tmp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, STATE_FILE);
}

// Card UID masking happens here, before anything leaves the customer's network.
export function maskCard(uid) {
  const s = String(uid || '').replace(/[^0-9a-f]/gi, '').toUpperCase();
  return s ? `•••• ${s.slice(-4)}` : '';
}

// Map Predor event codes/texts to portal event types. Extend once the API doc is available.
export function mapEventType(raw) {
  const t = String(raw || '').toLowerCase();
  if (/forced|erőszak|feltör/.test(t)) return 'door_forced';
  if (/held|nyitva/.test(t)) return 'door_held';
  if (/expired|lejárt/.test(t)) return 'denied_expired';
  if (/unknown|ismeretlen/.test(t)) return 'denied_unknown';
  if (/time|időzón|idősáv/.test(t)) return 'denied_time';
  if (/denied|elutasít|nincs jog/.test(t)) return 'denied_rights';
  return 'granted';
}

export function spool(events) {
  if (!events.length) return;
  fs.appendFileSync(SPOOL_FILE, events.map((e) => JSON.stringify(e)).join('\n') + '\n');
}
export function readSpool() {
  try { return fs.readFileSync(SPOOL_FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; }
}
export function clearSpool(n) {
  const rest = readSpool().slice(n);
  fs.writeFileSync(SPOOL_FILE, rest.map((e) => JSON.stringify(e)).join('\n') + (rest.length ? '\n' : ''));
}

export async function push(events, { url, token, secret, version }) {
  const body = JSON.stringify({ connector: { version, queue: Math.max(0, readSpool().length - events.length) }, events });
  const ts = Date.now();
  const sig = crypto.createHmac('sha256', secret).update(`${ts}.`).update(body).digest('hex');
  const res = await fetch(new URL('/api/ingest', url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Timestamp': String(ts), 'X-Signature': sig },
    body,
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Portal responded ${res.status}`);
  return res.json();
}
