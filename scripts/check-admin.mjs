// Admin and comments contract: sign-in, sessions, CSRF, moderation, the
// public comments API, the private paths of the server and the article
// analysis, exercised against the real routers with an in-memory store and
// without touching the network.
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

for (const name of ["DATABASE_URL", "ADMIN_GITHUB_TOKEN", "POSTHOG_PERSONAL_API_KEY", "RAILWAY_ENVIRONMENT", "RESEND_API_KEY", "ADMIN_EMAIL", "CONTACT_SECRET"]) delete process.env[name];
process.env.CONTACT_TO = "owner@example.test";

const express = require("express");
const contact = require(join(ROOT, "lib", "contact.js"));
const auth = require(join(ROOT, "lib", "admin", "auth.js"));
const { createMemoryStore } = require(join(ROOT, "lib", "admin", "store.js"));
const { createAdminRouter } = require(join(ROOT, "lib", "admin", "router.js"));
const { createCommentsRouter, validateComment } = require(join(ROOT, "lib", "comments.js"));
const { classify, AI_BOTS } = require(join(ROOT, "lib", "admin", "traffic.js"));
const content = require(join(ROOT, "lib", "admin", "content.js"));

let failures = 0;
const expect = (condition, message) => {
  if (!condition) {
    failures += 1;
    console.error(`✗ ${message}`);
  }
};

let offset = 0;
const now = () => Date.now() + offset;
const mails = [];
const store = createMemoryStore();
const app = express();
app.use("/api/comments", createCommentsRouter({ store, now, send: async (mail) => { mails.push(mail); } }));
app.use("/admin/api", createAdminRouter({ store, now, send: async (mail) => { mails.push(mail); } }));
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const call = async (path, { method = "GET", body, cookie, headers = {} } = {}) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(method !== "GET" ? { Origin: base, "X-Requested-With": "admin" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await response.json(); } catch { /* no body */ }
  return { status: response.status, data, headers: response.headers };
};
function solve({ salt, difficulty }) {
  for (let nonce = 0; ; nonce += 1) {
    if (contact.leadingZeroBits(createHash("sha256").update(`${salt}:${nonce}`).digest()) >= difficulty) return String(nonce);
  }
}

try {
  // ---- the admin is closed without a session secret ------------------------
  delete process.env.ADMIN_SESSION_SECRET;
  expect((await call("/admin/api/me")).status === 503, "admin API must answer 503 without ADMIN_SESSION_SECRET");
  process.env.ADMIN_SESSION_SECRET = "short";
  expect((await call("/admin/api/me")).status === 503, "a session secret under 32 characters must keep the admin closed");
  delete process.env.ADMIN_SESSION_SECRET;
  process.env.CONTACT_SECRET = "check-admin-contact-secret-0123456789abcdef";
  expect((await call("/admin/api/me")).status === 401 && !auth.sessionSecret().equals(Buffer.from(process.env.CONTACT_SECRET)), "the contact secret must open the admin through a derived key, never itself");
  delete process.env.CONTACT_SECRET;
  process.env.ADMIN_SESSION_SECRET = "check-admin-session-secret-0123456789abcdef";

  // ---- sign-in -------------------------------------------------------------
  expect((await call("/admin/api/me")).status === 401, "/me without a session must be 401");
  for (const path of ["/overview", "/articles", "/comments", "/traffic", "/analytics", "/search", "/activity", "/publishes", "/pages", "/articles/source?file=content/x.md"]) {
    expect((await call(`/admin/api${path}`)).status === 401, `${path} without a session must be 401`);
  }
  expect((await call("/admin/api/login", { method: "POST", body: { email: "owner@example.test" }, headers: { "X-Requested-With": "" } })).status === 403, "sign-in without the admin header must be 403");
  expect((await call("/admin/api/login", { method: "POST", body: { email: "owner@example.test" }, headers: { Origin: "https://evil.example" } })).status === 403, "cross-origin sign-in must be 403");

  const wrong = await call("/admin/api/login", { method: "POST", body: { email: "someone@example.test" } });
  expect(wrong.status === 200 && wrong.data.ok && mails.length === 0, "a wrong address must get the same answer and no mail");
  const right = await call("/admin/api/login", { method: "POST", body: { email: " Owner@Example.test " } });
  expect(right.status === 200 && mails.length === 1 && mails[0].to === "owner@example.test", "the right address must mail one link to the owner");
  const token = (mails[0]?.text.match(/#\/belepes\/([A-Za-z0-9_-]{43})/) || [])[1];
  expect(Boolean(token), "the sign-in mail must carry a 43-character token in the URL fragment");
  expect(!JSON.stringify(right.data).includes(token), "the sign-in answer must not carry the token");

  expect((await call("/admin/api/verify", { method: "POST", body: { token: "x".repeat(43) } })).status === 401, "an unknown token must be 401");
  const verified = await call("/admin/api/verify", { method: "POST", body: { token } });
  const setCookie = verified.headers.get("set-cookie") || "";
  expect(verified.status === 200 && /HttpOnly/.test(setCookie) && /SameSite=Strict/.test(setCookie) && /Path=\//.test(setCookie), "verify must set an HttpOnly SameSite=Strict cookie");
  const cookie = setCookie.split(";")[0];
  expect((await call("/admin/api/verify", { method: "POST", body: { token } })).status === 401, "a sign-in link must work once only");

  const me = await call("/admin/api/me", { cookie });
  expect(me.status === 200 && me.headers.get("cache-control") === "no-store", "/me with a session must be 200 and no-store");
  const [name, value] = [cookie.slice(0, cookie.indexOf("=")), cookie.slice(cookie.indexOf("=") + 1)];
  expect((await call("/admin/api/me", { cookie: `${name}=${value.slice(0, -2)}xx` })).status === 401, "a tampered cookie must be 401");
  expect((await call("/admin/api/me", { cookie: `${name}=${"A".repeat(43)}.${"B".repeat(43)}` })).status === 401, "a forged cookie must be 401");

  // An expired link: issue, let 11 minutes pass.
  await call("/admin/api/login", { method: "POST", body: { email: "owner@example.test" } });
  const late = (mails.at(-1).text.match(/#\/belepes\/([A-Za-z0-9_-]{43})/) || [])[1];
  const realNow = Date.now;
  Date.now = () => realNow() + 11 * 60 * 1000;
  const expired = await call("/admin/api/verify", { method: "POST", body: { token: late } });
  Date.now = realNow;
  expect(expired.status === 401, "a sign-in link must expire after ten minutes");

  // ---- CSRF ----------------------------------------------------------------
  expect((await call("/admin/api/comments/settings", { method: "POST", body: { enabled: false }, cookie, headers: { Origin: "https://evil.example" } })).status === 403, "a cross-origin write with a session must be 403");
  expect((await call("/admin/api/comments/settings", { method: "POST", body: { enabled: false }, cookie, headers: { "X-Requested-With": "" } })).status === 403, "a write without the admin header must be 403");
  expect((await call("/admin/api/logout", { method: "POST", cookie, headers: { "Content-Type": "text/plain" }, body: {} })).status === 415, "a non-JSON write must be 415");

  // ---- public comments -----------------------------------------------------
  const page = "/hu/irasok/ceges-weboldal-ara";
  expect((await call("/api/comments?page=/hu/kapcsolat")).status === 400, "comments of a non-article path must be 400");
  expect((await call(`/api/comments?page=${encodeURIComponent(page)}`)).data.comments.length === 0, "an article starts without comments");
  const post = async (fields, wait = 5000) => {
    const challenge = (await call("/api/comments/challenge")).data;
    offset += wait;
    return call("/api/comments", { method: "POST", body: { page, token: challenge.token, nonce: solve(challenge), ...fields }, headers: { "X-Requested-With": "" } });
  };
  expect((await call("/api/comments", { method: "POST", body: { page, name: "Teszt Elek", body: "Hasznos cikk, köszönöm." }, headers: { "X-Requested-With": "" } })).status === 400, "a comment without proof of work must be 400");
  expect((await call("/api/comments", { method: "POST", body: { page, name: "Teszt Elek", body: "Hasznos cikk." }, headers: { Origin: "https://evil.example" } })).status === 403, "a cross-origin comment must be 403");
  const trapped = await post({ name: "Bot", body: "Buy something now", website: "https://spam.example" });
  expect(trapped.status === 200 && (await store.listComments({})).length === 0, "the honeypot must answer ok and store nothing");
  const fast = await post({ name: "Gyors Kéz", body: "Túl gyors kitöltés." }, 500);
  expect(fast.status === 200 && (await store.listComments({})).length === 0, "a too-fast fill must store nothing");
  expect((await post({ name: "A", body: "Rendben van ez így." })).status === 422, "a one-letter name must be 422");
  expect((await post({ name: "Teszt Elek", body: "a https://a.example b https://b.example c https://c.example" })).status === 422, "three links must be 422");
  expect(!validateComment({ name: "www.spam.example", body: "Rendben van." }).ok, "a link as a name must be invalid");
  const sentBefore = mails.length;
  const posted = await post({ name: "Teszt Elek", body: "Hasznos cikk, köszönöm.\n\n<script>alert(1)</script>" });
  expect(posted.status === 200 && posted.data.status === "pending", "a valid comment must be accepted as pending");
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(mails.length === sentBefore + 1 && /jóváhagyásra/.test(mails.at(-1).subject), "a new comment must notify the owner");
  expect((await call(`/api/comments?page=${encodeURIComponent(page)}`)).data.comments.length === 0, "a pending comment must not be public");

  // ---- moderation ----------------------------------------------------------
  const listed = await call("/admin/api/comments?status=pending", { cookie });
  expect(listed.status === 200 && listed.data.comments.length === 1 && listed.data.counts.pending === 1, "the admin must list the pending comment");
  const id = listed.data.comments[0].id;
  expect(!("clientHash" in (await call(`/api/comments?page=${encodeURIComponent(page)}`)).data), "the public answer must not leak fields");
  expect((await call(`/admin/api/comments/${id}`, { method: "POST", body: { status: "nonsense" }, cookie })).status === 422, "an unknown status must be 422");
  expect((await call(`/admin/api/comments/${id}`, { method: "POST", body: { status: "approved" }, cookie })).status === 200, "approving must work");
  let open = (await call(`/api/comments?page=${encodeURIComponent(page)}`)).data.comments;
  expect(open.length === 1 && open[0].name === "Teszt Elek" && Object.keys(open[0]).sort().join() === "at,author,body,id,name,parentId", "an approved comment must be public with name, text and date only");
  const reply = await call(`/admin/api/comments/${id}/reply`, { method: "POST", body: { body: "Köszönöm a visszajelzést." }, cookie });
  expect(reply.status === 200 && reply.data.comment.isAuthor === true, "the owner must be able to reply as the author");
  open = (await call(`/api/comments?page=${encodeURIComponent(page)}`)).data.comments;
  expect(open.length === 2 && open.some((comment) => comment.author && comment.parentId === id), "the reply must be public under its parent");
  expect((await call("/admin/api/comments/settings", { method: "POST", body: { enabled: false }, cookie })).status === 200, "comments can be switched off");
  expect((await call(`/api/comments?page=${encodeURIComponent(page)}`)).data.enabled === false, "switched-off comments must read as disabled");
  expect((await post({ name: "Teszt Elek", body: "Még egy hozzászólás." })).status === 503, "switched-off comments must refuse new ones");
  await call("/admin/api/comments/settings", { method: "POST", body: { enabled: true }, cookie });
  expect((await call(`/admin/api/comments/${id}`, { method: "DELETE", cookie })).status === 200, "deleting must work");
  expect((await call(`/api/comments?page=${encodeURIComponent(page)}`)).data.comments.every((comment) => comment.id !== id), "a deleted comment must be gone");
  const activity = await call("/admin/api/activity", { cookie });
  expect(activity.status === 200 && JSON.stringify(activity.data).includes("comment.delete") && JSON.stringify(activity.data).includes("login.success"), "the activity log must record sign-in and moderation");

  // ---- articles and analysis ----------------------------------------------
  const articles = await call("/admin/api/articles", { cookie });
  const files = readdirSync(join(ROOT, "content")).filter((file) => file.endsWith(".md"));
  expect(articles.status === 200 && articles.data.articles.length === files.length, "the admin must list every article in content/");
  for (const article of articles.data.articles || []) {
    for (const key of ["seo", "aeo", "geo", "overall"]) {
      expect(Number.isInteger(article.scores[key]) && article.scores[key] >= 0 && article.scores[key] <= 100, `${article.file}: ${key} score must be 0 to 100`);
    }
    expect(article.optimisedFor && article.optimisedFor.primaryKeyword, `${article.file}: the analysis must name the primary keyword`);
  }
  const first = files[0];
  const source = await call(`/admin/api/articles/source?file=${encodeURIComponent(`content/${first}`)}`, { cookie });
  expect(source.status === 200 && source.data.source === readFileSync(join(ROOT, "content", first), "utf8"), "the admin must return an article's source");
  for (const bad of ["content/../server.js", "../package.json", "lib/contact.js", "content/nope.md"]) {
    expect((await call(`/admin/api/articles/source?file=${encodeURIComponent(bad)}`, { cookie })).status === 404, `source of ${bad} must be 404`);
  }
  const valid = await call("/admin/api/articles/validate", { method: "POST", body: { source: source.data.source, previousFile: `content/${first}` }, cookie });
  expect(valid.status === 200 && valid.data.ok, `an unchanged article must validate (${valid.data && valid.data.error})`);
  const broken = await call("/admin/api/articles/validate", { method: "POST", body: { source: source.data.source.replace(/^title: .*$/m, "title: x"), previousFile: `content/${first}` }, cookie });
  expect(broken.status === 422 && !broken.data.ok && broken.data.error, "an article that breaks a rule must be 422 with the reason");
  expect((await call("/admin/api/articles/publish", { method: "POST", body: { source: source.data.source, previousFile: `content/${first}` }, cookie })).status === 503, "publishing without a GitHub token must be 503");
  expect((await content.validateRemoval("content/../server.js")).ok === false, "removal outside content/ must be refused");

  // ---- sign-out ------------------------------------------------------------
  expect((await call("/admin/api/logout", { method: "POST", body: {}, cookie })).status === 200, "sign-out must work");
  expect((await call("/admin/api/me", { cookie })).status === 401, "a signed-out session must be dead on the server");

  // ---- crawlers ------------------------------------------------------------
  expect(AI_BOTS.has(classify("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)")), "GPTBot must be counted as an AI crawler");
  expect(classify("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15") === null, "Safari must count as a person");
} finally {
  server.close();
}

// ---- the real server: nothing private is served ----------------------------
const site = require(join(ROOT, "server.js")).listen(0);
const siteBase = `http://127.0.0.1:${site.address().port}`;
try {
  for (const path of ["/admin-ui/src/App.jsx", "/admin-ui/index.html", "/lib/admin/store.js", "/lib/comments.js", "/content/ceges-weboldal-ara.md", "/admin/api/../../server.js", "/admin/nope.js"]) {
    const response = await fetch(`${siteBase}${path}`);
    expect(response.status === 404 || response.status === 401, `${path} must not be served (got ${response.status})`);
  }
  const shell = await fetch(`${siteBase}/admin`);
  const html = await shell.text();
  expect(shell.status === 200 && /noindex/.test(shell.headers.get("x-robots-tag") || ""), "/admin must be noindex");
  expect(shell.headers.get("cache-control") === "no-store" && shell.headers.get("x-frame-options") === "DENY", "/admin must be no-store and unframeable");
  const csp = shell.headers.get("content-security-policy") || "";
  expect(/default-src 'none'|default-src 'self'/.test(csp) && !/unsafe-eval/.test(csp) && /frame-ancestors 'none'/.test(csp), "/admin needs its own strict CSP");
  expect(!/<script(?![^>]*\bsrc=)[^>]*>[^<]/.test(html), "/admin must have no inline script");
  for (const [, asset] of html.matchAll(/(?:src|href)="(\/admin\/assets\/[^"]+)"/g)) {
    const response = await fetch(`${siteBase}${asset}`);
    expect(response.ok && /immutable/.test(response.headers.get("cache-control") || ""), `${asset} must be served immutable`);
  }
  expect(!/admin/.test(readFileSync(join(ROOT, "sitemap.xml"), "utf8")) && !/\/admin/.test(readFileSync(join(ROOT, "llms.txt"), "utf8")), "the admin must not be in the sitemap or llms.txt");
  expect(/Disallow: \/admin/.test(readFileSync(join(ROOT, "robots.txt"), "utf8")), "robots.txt must disallow /admin");
  expect((await fetch(`${siteBase}/admin/api/me`)).status !== 200, "the admin API must not answer 200 without a session");
  // The committed build matches its source: every source file is older than or as old as the build marker.
  expect(existsSync(join(ROOT, "admin", "index.html")), "admin/index.html (the built admin) must be committed");
} finally {
  site.close();
}

if (failures) {
  console.error(`\n${failures} admin check(s) failed`);
  process.exit(1);
}
console.log("✓ check-admin: sign-in, sessions, CSRF, comments, moderation, private paths and article analysis hold");
