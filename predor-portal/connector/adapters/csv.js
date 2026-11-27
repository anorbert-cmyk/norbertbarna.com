// Reads Predor scheduled Excel/CSV exports dropped into /data/inbox, then archives them.
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, maskCard, mapEventType, log } from '../lib.js';

const INBOX = path.join(DATA_DIR, 'inbox');
const ARCHIVE = path.join(DATA_DIR, 'archive');

function parseCsv(text, delim) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true; else if (c === delim) { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// Column names as they appear in a Hungarian Predor export. Adjust after seeing a real file.
const COLS = { date: ['Dátum', 'Date'], time: ['Idő', 'Time'], employee: ['Törzsszám', 'Azonosító'], card: ['Kártyaszám', 'Kártya'], reader: ['Olvasó', 'Ajtó', 'Eszköz'], direction: ['Irány'], event: ['Esemény', 'Eseménytípus'] };

export async function fetchNew(_cursor, env, doorMap) {
  fs.mkdirSync(INBOX, { recursive: true }); fs.mkdirSync(ARCHIVE, { recursive: true });
  const files = fs.readdirSync(INBOX).filter((f) => f.toLowerCase().endsWith('.csv')).sort();
  const events = [];
  for (const f of files) {
    const full = path.join(INBOX, f);
    const text = fs.readFileSync(full, 'utf8').replace(/^﻿/, '');
    const [header, ...rows] = parseCsv(text, env.CSV_DELIMITER || ';');
    const idx = Object.fromEntries(Object.entries(COLS).map(([k, names]) => [k, header.findIndex((h) => names.includes(h.trim()))]));
    for (const r of rows) {
      if (r.length < 2) continue;
      const get = (k) => (idx[k] >= 0 ? (r[idx[k]] || '').trim() : '');
      const ts = new Date(`${get('date').replace(/\.\s?/g, '-').replace(/-$/, '')}T${get('time') || '00:00'}`);
      if (Number.isNaN(ts.getTime())) continue;
      events.push({ timestamp: ts.toISOString(), doorId: doorMap[get('reader')] || get('reader'), personId: get('employee') || null, card: maskCard(get('card')), type: mapEventType(get('event')), direction: /ki|out/i.test(get('direction')) ? 'out' : /be|in/i.test(get('direction')) ? 'in' : null });
    }
    fs.renameSync(full, path.join(ARCHIVE, `${Date.now()}_${f}`));
    log('info', 'csv processed', { file: f, rows: rows.length });
  }
  return { events, cursor: _cursor };
}
