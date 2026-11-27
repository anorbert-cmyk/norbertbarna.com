// Predor connector: runs inside the customer's network, outbound HTTPS only.
import { log, loadState, saveState, spool, readSpool, clearSpool, push } from './lib.js';

const VERSION = '0.1.0';
const env = process.env;
for (const k of ['PORTAL_URL', 'INGEST_TOKEN', 'INGEST_SECRET']) {
  if (!env[k]) { log('error', `missing env ${k}`); process.exit(1); }
}
if (!env.PORTAL_URL.startsWith('https://') && env.ALLOW_HTTP !== '1') { log('error', 'PORTAL_URL must be https'); process.exit(1); }

const source = env.SOURCE === 'csv' ? await import('./adapters/csv.js') : await import('./adapters/predor-api.js');
const doorMap = JSON.parse(env.DOOR_MAP || '{}');
const pollMs = Math.max(15, Number(env.POLL_SECONDS) || 60) * 1000;
let backoff = 0;

async function tick() {
  const state = loadState();
  try {
    const { events, cursor } = await source.fetchNew(state.cursor, env, doorMap);
    // Write to the local spool first, then advance the cursor: nothing is lost if the portal is down.
    spool(events.map(({ card, ...e }) => e)); // card stays on-prem; the portal does not need it for events
    saveState({ ...state, cursor });
  } catch (e) {
    log('warn', 'read from Predor failed', { error: e.message });
  }
  for (;;) {
    const queued = readSpool();
    if (!queued.length) break;
    const batch = queued.slice(0, 1000);
    try {
      const r = await push(batch, { url: env.PORTAL_URL, token: env.INGEST_TOKEN, secret: env.INGEST_SECRET, version: VERSION });
      clearSpool(batch.length);
      log('info', 'pushed', { accepted: r.accepted, rejected: r.rejected?.length || 0 });
      backoff = 0;
    } catch (e) {
      backoff = Math.min(backoff ? backoff * 2 : 30000, 15 * 60 * 1000);
      log('warn', 'push failed, will retry', { error: e.message, retryInMs: backoff, queued: queued.length });
      break;
    }
  }
  setTimeout(tick, backoff || pollMs);
}

log('info', 'connector started', { version: VERSION, source: env.SOURCE || 'predor-api' });
tick();
