#!/usr/bin/env node
/**
 * Live QA for the deployed site. Runs from the Live QA workflow (GitHub
 * Actions) or any machine that can reach the production host:
 *   node scripts/live-qa.mjs                 against https://www.barnanorbert.com
 *   LIVE_BASE=https://host node scripts/live-qa.mjs
 *
 * It proves the release that is live is this checkout (every sitemap page is
 * served byte for byte as committed), then checks what the SEO setup and the
 * owner's decisions depend on: redirects, status codes, security headers,
 * the IndexNow key, llms.txt, FAQ counts, employer naming rules and every
 * internal link and asset the pages reference. Findings go to stdout and to
 * the job summary; a failing check exits 1.
 */
import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SERVICE_PAGES, urlOf } from "./service-pages.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.LIVE_BASE || "https://www.barnanorbert.com").replace(/\/$/, "");
const HOST = new URL(BASE).host;
const APEX = HOST.replace(/^www\./, "");
const KEY = "4cf59849855778fd47f78e60a9143478";
const UA = "barnanorbert-live-qa/1.0 (+https://github.com/anorbert-cmyk/norbertbarna.com)";

// LIVE_QA_COMPARE=0 (pull request runs): a page that differs from this
// checkout is a note, since the checkout is not what was deployed.
const compare = process.env.LIVE_QA_COMPARE !== "0";
const failures = [];
const notes = [];
const passes = [];
const fail = (message) => { failures.push(message); console.log(`FAIL ${message}`); };
const pass = (message) => { passes.push(message); console.log(`ok   ${message}`); };
const note = (message) => { notes.push(message); console.log(`note ${message}`); };

async function get(url, { redirect = "manual", method = "GET" } = {}) {
  const started = Date.now();
  const response = await fetch(url, { redirect, method, headers: { "user-agent": UA, "cache-control": "no-cache" } });
  const body = method === "HEAD" ? "" : await response.text();
  return { status: response.status, headers: response.headers, body, ms: Date.now() - started };
}

async function expectRedirect(from, to, status = 301) {
  const { status: got, headers } = await get(from);
  const location = headers.get("location") || "";
  if (got !== status || location !== to) fail(`${from} -> ${got} ${location} (expected ${status} ${to})`);
  else pass(`${from} -> ${status} ${to}`);
}

// 0. Which commit the live release reports (X-Release, set from Railway's
// RAILWAY_GIT_COMMIT_SHA). A mismatch explains every "differs" below.
const home = await get(`${BASE}/`);
const release = home.headers.get("x-release") || "";
const expected = process.env.EXPECTED_SHA || "";
note(`live release: ${release || "unknown (no X-Release header)"}${expected ? `, this checkout: ${expected}` : ""}`);
if (expected && release && release !== expected) fail(`live release ${release.slice(0, 7)} is not this checkout ${expected.slice(0, 7)} (deploy pending or failed)`);

// 1. Every sitemap page is live and identical to this checkout.
const sitemap = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, loc]) => loc);
const pages = {};
let stale = 0;
for (const url of urls) {
  const path = new URL(url).pathname;
  const file = path === "/" ? "index.html" : existsSync(join(ROOT, `${path.slice(1)}.html`)) ? `${path.slice(1)}.html` : `${path.slice(1)}/index.html`;
  const local = readFileSync(join(ROOT, file), "utf8");
  const live = await get(`${BASE}${path}`);
  pages[path] = live;
  if (live.status !== 200) { fail(`${path} returned ${live.status}`); continue; }
  if (live.body !== local) { stale++; (compare ? fail : note)(`${path} differs from ${file} in this checkout (stale deploy or wrong build)`); continue; }
  if (!/<h1[\s>]/.test(live.body)) fail(`${path} has no H1`);
  if (!/<title>[^<]+<\/title>/.test(live.body)) fail(`${path} has no title`);
  if (live.ms > 3000) note(`${path} took ${live.ms} ms`);
}
if (!stale) pass(`all ${urls.length} sitemap pages are live and byte-identical to this checkout`);
const lastmods = [...sitemap.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map(([, d]) => d);
note(`sitemap lastmod values: ${[...new Set(lastmods)].sort().join(", ")} (${urls.length} URLs)`);
const liveSitemap = await get(`${BASE}/sitemap.xml`);
if (liveSitemap.status !== 200 || liveSitemap.body !== sitemap) (compare ? fail : note)("live sitemap.xml differs from this checkout");
else pass("sitemap.xml live and current");

// 2. Service pages: H1, eight visible questions, one FAQPage.
for (const page of SERVICE_PAGES) {
  const path = urlOf(page);
  const body = pages[path]?.body || "";
  const details = (body.match(/<details\b/g) || []).length;
  const faqPage = (body.match(/"@type":\s*"FAQPage"/g) || []).length;
  if (details !== 8 || faqPage !== 1) fail(`${path}: ${details} questions, ${faqPage} FAQPage (expected 8 and 1)`);
  else pass(`${path}: H1 + 8 questions + FAQPage`);
}

// 3. Redirects the SEO setup relies on.
await expectRedirect(`${BASE}/hu/ai-integracio`, `/hu/ai-tanacsadas-fejlesztes`);
await expectRedirect(`${BASE}/hu/ai-integracio/`, `/hu/ai-tanacsadas-fejlesztes`);
await expectRedirect(`${BASE}/about.html`, `/about`);
await expectRedirect(`${BASE}/works.html`, `/works`);
await expectRedirect(`${BASE}/de/`, `/de`);
await expectRedirect(`${BASE}/de/wissen/`, `/de/wissen`);
await expectRedirect(`${BASE}/de/wissen/was-kostet-eine-website.html`, `/de/wissen/was-kostet-eine-website`);
await expectRedirect(`${BASE}/hu/irasok/index.html`, `/hu/irasok`);
await expectRedirect(`${BASE}/kineticare`, `/work/kineticare`);
await expectRedirect(`${BASE}/work/raiffesen`, `/work/raiffeisen`);
if (HOST.startsWith("www.")) {
  await expectRedirect(`https://${APEX}/works`, `${BASE}/works`);
  // The apex is answered at the edge, which keeps the path; the app then
  // moves a legacy path in a second hop. One hop straight to the canonical
  // page is the ideal, two is accepted (measured live 2026-10-22).
  const apexLegacy = await get(`https://${APEX}/hu/ai-integracio`);
  const apexTarget = apexLegacy.headers.get("location") || "";
  if (apexLegacy.status !== 301 || ![`${BASE}/hu/ai-tanacsadas-fejlesztes`, `${BASE}/hu/ai-integracio`].includes(apexTarget)) fail(`https://${APEX}/hu/ai-integracio -> ${apexLegacy.status} ${apexTarget}`);
  else if (apexTarget.endsWith("/hu/ai-integracio")) note(`https://${APEX}/hu/ai-integracio reaches the canonical page in two hops (edge keeps the path)`);
  else pass(`https://${APEX}/hu/ai-integracio -> 301 canonical in one hop`);
  // Plain http: the edge or the app may answer, either way one hop lands on https.
  const http = await get(`http://${HOST}/about.html`);
  const location = http.headers.get("location") || "";
  if (![301, 302, 307, 308].includes(http.status) || !location.startsWith(`https://${HOST}/`)) fail(`http://${HOST}/about.html -> ${http.status} ${location}`);
  else {
    const hop = location === `${BASE}/about` ? null : await get(location);
    if (hop && !(hop.status === 301 && hop.headers.get("location") === "/about")) fail(`http://${HOST}/about.html does not reach /about in two hops (${hop.status} ${hop.headers.get("location")})`);
    else pass(`http://${HOST}/about.html reaches https /about`);
  }
}

// 4. Status codes: 404 page, private paths, key file, robots, llms.txt, RSS.
for (const path of ["/does-not-exist", "/server.js", "/package.json", "/scripts/live-qa.mjs", "/.git/config", "/docs/", "/content/"]) {
  const { status } = await get(`${BASE}${path}`);
  if (status !== 404) fail(`${path} returned ${status}, expected 404`); else pass(`${path} -> 404`);
}
const key = await get(`${BASE}/${KEY}.txt`);
if (key.status !== 200 || key.body.trim() !== KEY) fail(`IndexNow key file not served (${key.status})`); else pass("IndexNow key file live");
for (const path of ["/robots.txt", "/llms.txt"]) {
  const local = readFileSync(join(ROOT, path.slice(1)), "utf8");
  const live = await get(`${BASE}${path}`);
  if (live.status !== 200) fail(`${path} -> ${live.status}`);
  else if (live.body !== local) (compare ? fail : note)(`${path} differs from this checkout`);
  else pass(`${path} live and current`);
}
for (const path of ["/writing/feed.xml", "/hu/irasok/feed.xml", "/de/wissen/feed.xml"]) {
  if (!existsSync(join(ROOT, path.slice(1)))) continue;
  const live = await get(`${BASE}${path}`);
  if (live.status !== 200 || !/xml/.test(live.headers.get("content-type") || "")) fail(`${path} -> ${live.status} ${live.headers.get("content-type")}`);
  else pass(`${path} -> 200 ${live.headers.get("content-type")}`);
}

// 5. Security headers on a page, a contact page and an asset.
const REQUIRED_HEADERS = {
  "strict-transport-security": /max-age=\d{7,}/,
  "content-security-policy": /default-src 'self'/,
  "x-content-type-options": /^nosniff$/,
  "x-frame-options": /^SAMEORIGIN$/i,
  "referrer-policy": /strict-origin-when-cross-origin/,
  "cross-origin-opener-policy": /same-origin/,
};
for (const path of ["/", "/hu/kapcsolat", "/de/kontakt"]) {
  const { headers } = pages[path];
  for (const [name, pattern] of Object.entries(REQUIRED_HEADERS)) {
    const value = headers.get(name) || "";
    if (!pattern.test(value)) fail(`${path}: header ${name} = "${value}"`);
  }
  const csp = headers.get("content-security-policy") || "";
  const contact = path !== "/";
  if (contact !== csp.includes("challenges.cloudflare.com")) fail(`${path}: CSP Turnstile allowance wrong for this page`);
  if (/unsafe-eval/.test(csp)) fail(`${path}: CSP allows unsafe-eval`);
  if (headers.get("x-powered-by")) fail(`${path}: X-Powered-By leaks the stack`);
}
pass("security headers (HSTS, CSP, nosniff, SAMEORIGIN, referrer, COOP) on page and contact pages");

// 6. Employer naming rules (owner decision 2026-10-22): the name may appear on
// the home and About pages only, never on client-facing or German service pages or llms.txt.
const EMPLOYER = /BlackRock/;
const allowed = new Set(["/", "/hu", "/about", "/hu/rolam", "/de/ueber-mich"]);
for (const [path, { body }] of Object.entries(pages)) {
  const present = EMPLOYER.test(body);
  if (present && !allowed.has(path)) fail(`${path} names the employer`);
  if (!present && ["/", "/about"].includes(path)) fail(`${path} should still name the employer`);
}
if (EMPLOYER.test((await get(`${BASE}/llms.txt`)).body)) fail("llms.txt names the employer");
pass("employer named only on home and About pages");

// 7. Contact: every contact page carries the Turnstile mount and the API refuses
// an unverified submission without a server error (no real enquiry is sent).
for (const path of ["/contact", "/hu/kapcsolat", "/de/kontakt"]) {
  const body = pages[path].body;
  if (!/data-contact-turnstile/.test(body) || !/<form\b/.test(body)) fail(`${path}: contact form or Turnstile mount missing`);
}
const probe = await fetch(`${BASE}/api/contact`, { method: "POST", headers: { "content-type": "application/json", "user-agent": UA }, body: JSON.stringify({}) });
if (probe.status >= 500 || probe.status === 404) fail(`/api/contact empty POST -> ${probe.status}`); else pass(`/api/contact rejects an empty submission with ${probe.status}`);

// 8. Every internal link and asset referenced by a live page resolves.
const seen = new Map();
const refs = new Set();
for (const [path, { body }] of Object.entries(pages)) {
  for (const [, raw] of body.matchAll(/\b(?:href|src|poster|content)="([^"#?]+)/g)) {
    // content="" belongs to meta tags: only its URL values count.
    if (!/^(?:\/|https?:\/\/)/.test(raw) && !/^(?:\.\.?\/|assets\/)/.test(raw)) continue;
    if (/^(?:mailto:|tel:|javascript:|data:)/.test(raw)) continue;
    let target;
    try { target = new URL(raw, `${BASE}${path}`); } catch { continue; }
    if (target.host !== HOST) continue;
    refs.add(target.pathname);
  }
  for (const [, raw] of body.matchAll(/\bsrcset="([^"]+)"/g)) {
    for (const candidate of raw.split(",")) {
      const src = candidate.trim().split(/\s+/)[0];
      if (src) refs.add(new URL(src, `${BASE}${path}`).pathname);
    }
  }
}
let broken = 0;
for (const path of [...refs].sort()) {
  if (seen.has(path)) continue;
  let { status } = await get(`${BASE}${path}`, { method: "HEAD" });
  if (status === 405) ({ status } = await get(`${BASE}${path}`));
  seen.set(path, status);
  if (status >= 400) { broken++; fail(`internal link ${path} -> ${status}`); }
  else if (status >= 300) note(`internal link ${path} -> ${status} (a page links a non-canonical URL)`);
}
if (!broken) pass(`${seen.size} internal links and assets resolve`);

// Summary
const summary = [
  `## Live QA against ${BASE}`,
  "",
  `${failures.length ? "❌" : "✅"} ${passes.length} checks passed, ${failures.length} failed, ${notes.length} notes`,
  "",
  ...failures.map((f) => `- ❌ ${f}`),
  ...notes.map((n) => `- ℹ️ ${n}`),
  "",
].join("\n");
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(`\n${passes.length} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
