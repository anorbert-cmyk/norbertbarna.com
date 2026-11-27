// Reads new events from the Predor Integration API (licensed module, per-operator API key).
// The endpoint path and field names are placeholders until Predor's API documentation
// is received through the customer. Everything else (cursor, masking, spooling) is final.
import { maskCard, mapEventType } from '../lib.js';

export async function fetchNew(cursor, env, doorMap) {
  const url = new URL(env.PREDOR_EVENTS_PATH.replace('{cursor}', encodeURIComponent(cursor)), env.PREDOR_API_URL);
  const res = await fetch(url, { headers: { 'X-Api-Key': env.PREDOR_API_KEY, Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Predor API responded ${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data) ? data : data.items || data.events || [];
  let last = cursor;
  const events = items.map((it) => {
    last = String(it.id ?? last);
    return {
      timestamp: new Date(it.timestamp || it.time || it.date).toISOString(),
      doorId: doorMap[it.readerName || it.door || it.reader] || String(it.readerId || it.doorId || ''),
      personId: it.employeeNumber || it.personId || null,
      card: maskCard(it.cardNumber || it.card),
      type: mapEventType(it.eventType || it.type || it.result),
      direction: /out|ki/i.test(String(it.direction || '')) ? 'out' : /in|be/i.test(String(it.direction || '')) ? 'in' : null,
    };
  });
  return { events, cursor: last };
}
