import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { UTILITY_PAGES } from './service-pages.mjs';
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const pages = ['index.html', 'works.html', ...UTILITY_PAGES, ...readdirSync(new URL('work/', root)).filter(p => p.endsWith('.html')).map(p => 'work/' + p)];
for (const page of pages) {
  const html = read(page);
  assert.equal((html.match(/src="\/assets\/js\/analytics-config.js"/g) || []).length, 1, `${page}: one release gate`);
  assert(/<script defer src="\/assets\/js\/analytics-config.js"><\/script>/.test(html), `${page}: gate deferred`);
  assert(html.indexOf('src="/assets/js/analytics-config.js"') < html.indexOf('src="/assets/js/consent.js"'), `${page}: gate before consumers`);
  assert(/data-consent-settings hidden>/.test(html), `${page}: settings start hidden until the consent owner reveals them`);
  assert.equal((html.match(/src="\/assets\/js\/consent.js"/g) || []).length, 1, `${page}: one consent owner`);
  assert.equal((html.match(/src="\/assets\/js\/analytics.js"/g) || []).length, 1, `${page}: one analytics owner`);
  assert(html.indexOf('src="/assets/js/consent.js"') < html.indexOf('src="/assets/js/analytics.js"'), `${page}: consent first`);
  assert(/<script defer src="\/assets\/js\/analytics.js"><\/script>/.test(html), `${page}: analytics deferred`);
  assert.equal((html.match(/href="\/assets\/css\/consent.css"/g) || []).length, 1, `${page}: consent stylesheet`);
  const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] || '';
  assert(footer.includes('data-consent-settings') && footer.includes('href="/privacy"') && footer.includes('href="/hu/adatvedelem"'), `${page}: withdrawal and privacy always reachable`);
  assert(!/posthog-js|eu-assets\.i\.posthog|googletagmanager|oaipixel/i.test(html), `${page}: no duplicate vendor tracker`);
}
const consent = read('assets/js/consent.js');
const analytics = read('assets/js/analytics.js');
assert(read('assets/js/analytics-config.js').includes('Object.freeze({ enabled: true })'), 'release is explicitly ON');
assert(read('server.js').includes('const GOOGLE_SITE_VERIFICATION = ""'), 'GSC paste-once constant must stay empty until issued');
for (const [name, js] of [['consent', consent], ['analytics', analytics]]) {
  assert(js.includes('window.PortfolioAnalyticsConfig?.enabled !== true'), `${name}: exact-true fail-closed gate`);
}
assert(read('server.js').includes("https://eu.i.posthog.com"), 'ON release CSP must allow EU Capture API');
assert(!/connect-src[^"]*eu-assets/i.test(read('server.js')), 'CSP must not allow the official snippet asset host');
assert(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|document\.cookie/.test(consent), 'consent owner must be network-free');
assert(!/sendBeacon|XMLHttpRequest|localStorage|captureException|sessionRecording|setInterval/.test(analytics), 'no background SDK queue or persistent analytics ID');
assert(analytics.includes('$process_person_profile: false') && analytics.includes('$geoip_disable: true'), 'fixed privacy sentinels');
assert(analytics.includes("credentials: 'omit'") && analytics.includes("referrerPolicy: 'no-referrer'") && analytics.includes('keepalive: false'), 'bounded transport');
assert.equal((analytics.match(/phc_[A-Za-z0-9]+/g) || []).length, 1, 'one public project ingestion key');
assert(!/phx_|phs_|lead_received|lead_qualified|meeting_booked/.test(analytics), 'no secret or fabricated business conversion');
for (const [page, lang, route] of [['privacy.html', 'en', '/privacy'], ['hu/adatvedelem.html', 'hu', '/hu/adatvedelem']]) {
  const html = read(page);
  assert(html.includes(`<html lang="${lang}">`), `${page}: language`);
  assert(html.includes(`rel="canonical" href="https://www.barnanorbert.com${route}"`), `${page}: self canonical`);
  for (const value of ['en', 'hu', 'x-default']) assert(html.includes(`hreflang="${value}"`), `${page}: translation links`);
  assert(!html.includes('"@type": "Service"'), `${page}: not an offer page`);
  assert(html.includes(lang === 'en' ? 'Optional, consent-gated PostHog analytics' : 'Opcionális, hozzájáruláshoz kötött PostHog-mérés'), `${page}: truthful consent-gated metadata`);
  assert(!html.includes(lang === 'en' ? 'Visitor analytics is currently off' : 'A látogatottságmérés jelenleg kikapcsolva'), `${page}: inactive copy must not remain`);
}
console.log(`OK: consent/analytics ownership and privacy invariants on ${pages.length} pages`);
