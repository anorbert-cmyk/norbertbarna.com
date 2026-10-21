// Contact API contract: proof of work, honeypot, timing, validation, origin,
// rate limits and delivery, exercised against the real router without
// touching the network. Also pins that no page ever exposes an address.
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { exposesInbox } from "./private-inbox.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const express = require("express");
const contact = require(join(ROOT, "lib", "contact.js"));
const { verifyTurnstile } = require(join(ROOT, "lib", "turnstile.js"));

let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error(`✗ ${message}`);
};
const expect = (condition, message) => {
  if (!condition) fail(message);
};

function solve({ salt, difficulty }) {
  for (let nonce = 0; ; nonce += 1) {
    const digest = createHash("sha256").update(`${salt}:${nonce}`).digest();
    if (contact.leadingZeroBits(digest) >= difficulty) return String(nonce);
  }
}

let clock = Date.parse("2026-10-06T12:00:00Z");
const sent = [];
let sendError = null;
// Turnstile is mocked at the router seam: "pass", "fail" or "down".
let captchaMode = "pass";
const captchaTokens = [];
const app = express();
app.use(
  "/api/contact",
  contact.createContactRouter({
    now: () => clock,
    send: async (mail) => {
      if (sendError) throw sendError;
      sent.push(mail);
    },
    verifyCaptcha: async ({ token }) => {
      captchaTokens.push(token);
      if (typeof token !== "string" || !token) return { ok: false, status: 400, error: "captcha_failed" };
      if (captchaMode === "fail") return { ok: false, status: 400, error: "captcha_failed" };
      if (captchaMode === "down") return { ok: false, status: 503, error: "captcha_unavailable" };
      return { ok: true };
    },
  })
);
const server = app.listen(0);
server.keepAliveTimeout = 60000;
const base = `http://127.0.0.1:${server.address().port}`;
const origin = base;

async function challenge(headers = {}) {
  const response = await fetch(`${base}/api/contact/challenge`, { headers });
  return { status: response.status, body: await response.json(), headers: response.headers };
}

async function post(body, { headers = {}, raw } = {}) {
  const response = await fetch(`${base}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, ...headers },
    body: raw ?? JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

const message = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  topic: "ai",
  message: "I would like to talk about integrating an assistant into our onboarding.",
  hp_7f3: "",
  lang: "en",
  "cf-turnstile-response": "turnstile-token",
};

async function solved(ip = "203.0.113.1") {
  const issued = await challenge({ "X-Forwarded-For": ip });
  clock += 5000;
  return { token: issued.body.token, nonce: solve(issued.body) };
}

// Behave as behind Railway's edge, where the forwarded client address counts.
process.env.RAILWAY_ENVIRONMENT = "check";
process.env.RESEND_API_KEY = "re_test_key";
process.env.CONTACT_TO = "inbox@example.test";
delete process.env.CONTACT_DRY_RUN;

try {
  // Challenge shape and headers.
  const issued = await challenge();
  expect(issued.status === 200, "challenge returns 200");
  expect(typeof issued.body.token === "string" && /^[a-f0-9]{32}$/.test(issued.body.salt), "challenge has token and salt");
  expect(issued.body.difficulty >= 12, "challenge difficulty is at least 12 bits");
  expect(issued.headers.get("cache-control") === "no-store", "challenge is no-store");
  expect(!JSON.stringify(issued.body).includes("example.test"), "challenge never leaks the destination");

  // Happy path.
  let proof = await solved();
  let result = await post({ ...message, ...proof }, { headers: { "X-Forwarded-For": "203.0.113.1" } });
  expect(result.status === 200 && result.body.ok === true, `valid message is accepted (got ${result.status})`);
  expect(sent.length === 1, "valid message is delivered once");
  const mail = sent[0] || {};
  expect(mail.to === "inbox@example.test", "delivery goes to CONTACT_TO");
  expect(mail.replyTo === "ada@example.com", "Reply-To is the visitor");
  expect(/AI-integráció/.test(mail.subject) && /Ada Lovelace/.test(mail.subject), "subject names topic and sender");
  expect(/onboarding/.test(mail.text) && /onboarding/.test(mail.html), "text and HTML bodies carry the message");
  expect(!/\{\{\{/.test(mail.html) && /mailto:ada%40example\.com/.test(mail.html), "HTML template is fully filled, with a reply link");
  expect(typeof mail.idempotencyKey === "string" && mail.idempotencyKey.length === 64, "idempotency key is set");

  // Turnstile: a missing, failed or unverifiable token never reaches delivery.
  {
    const before = sent.length;
    const tp1 = await solved("203.0.113.60");
    result = await post({ ...message, ...tp1, "cf-turnstile-response": "" }, { headers: { "X-Forwarded-For": "203.0.113.60" } });
    expect(result.status === 400 && result.body.error === "captcha_failed", "a missing Turnstile token is refused");
    captchaMode = "fail";
    const tp2 = await solved("203.0.113.61");
    result = await post({ ...message, ...tp2 }, { headers: { "X-Forwarded-For": "203.0.113.61" } });
    expect(result.status === 400 && result.body.error === "captcha_failed", "a failed Turnstile verdict is refused");
    captchaMode = "down";
    const tp3 = await solved("203.0.113.62");
    result = await post({ ...message, ...tp3 }, { headers: { "X-Forwarded-For": "203.0.113.62" } });
    expect(result.status === 503 && result.body.error === "captcha_unavailable", "an unreachable Turnstile fails closed");
    captchaMode = "pass";
    expect(sent.length === before, "no Turnstile failure is delivered");
    expect(captchaTokens.includes("turnstile-token"), "the form's Turnstile token reaches verification");
  }

  // Visitor text can never add markup to the owner's inbox.
  {
    const hostile = contact.composeEmail({ name: '<img src=x onerror=alert(1)>', email: 'a"b@example.com', topic: "web",
      message: '<a href="https://evil.example">click</a>\nsecond line', lang: "hu" });
    expect(!/<img src=x|<a href="https:\/\/evil/.test(hostile.html) && /&lt;img src=x/.test(hostile.html) && /second line/.test(hostile.html) && /<br>second line/.test(hostile.html),
      "visitor values are HTML-escaped in the notification");
  }

  // Replay of a spent challenge, including non-canonical spellings of its signature.
  result = await post({ ...message, ...proof });
  expect(result.status === 403 && result.body.error === "challenge", `a spent challenge is refused (got ${result.status} ${JSON.stringify(result.body)})`);
  {
    const [p, sig] = proof.token.split(".");
    const before = sent.length;
    for (const variant of [`${p}.${sig}=`, `${p}.${sig}!`, `${p}.${sig.slice(0, 5)}~${sig.slice(5)}`, `${p}.${sig}.x`]) {
      result = await post({ ...message, token: variant, nonce: proof.nonce }, { headers: { "X-Forwarded-For": "203.0.113.50" } });
      expect(result.status === 403, `a re-spelled spent token is refused (${variant.slice(-6)})`);
    }
    expect(sent.length === before, "no replay variant is delivered");
  }

  // Wrong nonce, forged token, missing proof.
  proof = await solved("203.0.113.2");
  result = await post({ ...message, token: proof.token, nonce: "x1" });
  expect(result.status === 403, "a non-numeric nonce is refused");
  const [payload] = proof.token.split(".");
  result = await post({ ...message, token: `${payload}.AAAA`, nonce: proof.nonce });
  expect(result.status === 403, "a forged signature is refused");
  result = await post({ ...message });
  expect(result.status === 403, "a missing proof is refused");

  // Honeypot and timing: answered as success, never delivered.
  const before = sent.length;
  proof = await solved("203.0.113.3");
  result = await post({ ...message, ...proof, website: "http://spam.example" });
  expect(result.status === 200 && sent.length === before, "a filled honeypot is silently dropped");
  const fast = await challenge({ "X-Forwarded-For": "203.0.113.4" });
  result = await post({ ...message, token: fast.body.token, nonce: solve(fast.body) });
  expect(result.status === 200 && sent.length === before, "an instant submit is silently dropped");

  // Expired challenge.
  const old = await challenge({ "X-Forwarded-For": "203.0.113.5" });
  clock += 3 * 60 * 60 * 1000;
  result = await post({ ...message, token: old.body.token, nonce: solve(old.body) });
  expect(result.status === 403, "an expired challenge is refused");

  // Validation.
  const invalidCases = [
    [{ name: "A" }, "name"],
    [{ name: "Visit https://spam.example" }, "name"],
    [{ email: "not-an-email" }, "email"],
    [{ topic: "crypto" }, "topic"],
    [{ message: "short" }, "message"],
    [{ message: "x".repeat(5001) }, "message"],
    [{ message: "a https://a.example b https://b.example c https://c.example d https://d.example" }, "message"],
  ];
  for (const [patch, field] of invalidCases) {
    proof = await solved("198.51.100.9");
    result = await post({ ...message, ...patch, ...proof });
    expect(
      result.status === 400 && Array.isArray(result.body.fields) && result.body.fields.includes(field),
      `invalid ${field} (${JSON.stringify(patch).slice(0, 40)}) is reported`
    );
  }
  expect(sent.length === before, "invalid messages are never delivered");

  // Origin, content type, body size.
  proof = await solved("198.51.100.10");
  result = await post({ ...message, ...proof }, { headers: { Origin: "https://evil.example" } });
  expect(result.status === 403 && result.body.error === "origin", "a cross-origin post is refused");
  result = await post(null, { headers: { "Content-Type": "text/plain" }, raw: "name=x" });
  expect(result.status === 415, "a non-JSON post is refused");
  result = await post(null, { raw: JSON.stringify({ ...message, message: "x".repeat(20000) }) });
  expect(result.status === 413, "an oversized body is refused");
  result = await post(null, { raw: "{broken" });
  expect(result.status === 400, "malformed JSON is refused");

  // Per-address rate limit.
  let limited = false;
  for (let i = 0; i < 7; i += 1) {
    proof = await solved("192.0.2.77");
    result = await post({ ...message, ...proof }, { headers: { "X-Forwarded-For": "192.0.2.77" } });
    if (result.status === 429) limited = true;
  }
  expect(limited, "one address cannot send more than five messages per window");

  // Unconfigured delivery and upstream failure both answer 503.
  delete process.env.RESEND_API_KEY;
  proof = await solved("192.0.2.80");
  result = await post({ ...message, ...proof }, { headers: { "X-Forwarded-For": "192.0.2.80" } });
  expect(result.status === 503 && result.body.error === "unavailable", "missing RESEND_API_KEY answers 503");
  process.env.RESEND_API_KEY = "re_test_key";
  sendError = Object.assign(new Error("upstream"), { status: 500 });
  proof = await solved("192.0.2.81");
  result = await post({ ...message, ...proof }, { headers: { "X-Forwarded-For": "192.0.2.81" } });
  expect(result.status === 503, "an upstream failure answers 503");
  sendError = null;
  result = await post({ ...message, ...proof }, { headers: { "X-Forwarded-For": "192.0.2.81" } });
  expect(result.status === 200, "a failed delivery leaves the proof usable for a retry");

  // A key pasted with whitespace, quotes or a Bearer prefix still sends,
  // and a rejected key is logged by reason and shape, never by value.
  process.env.RESEND_API_KEY = ' "Bearer re_test_key"\n';
  sent.length = 0;
  proof = await solved("192.0.2.82");
  result = await post({ ...message, ...proof }, { headers: { "X-Forwarded-For": "192.0.2.82" } });
  expect(result.status === 200 && sent[0] && sent[0].apiKey === "re_test_key", "a pasted key is normalized before it is sent");
  process.env.RESEND_API_KEY = "sk_wrong_secret_value";
  sendError = Object.assign(new Error("upstream"), { status: 401, code: "missing_api_key" });
  const logged = [];
  const consoleError = console.error;
  console.error = (...args) => logged.push(args.join(" "));
  try {
    proof = await solved("192.0.2.83");
    result = await post({ ...message, ...proof }, { headers: { "X-Forwarded-For": "192.0.2.83" } });
  } finally {
    console.error = consoleError;
  }
  const line = logged.join("\n");
  expect(result.status === 503, "a rejected key answers 503");
  expect(/401 missing_api_key/.test(line) && /no re_ prefix/.test(line), `a rejected key is logged with its reason and shape (got ${line})`);
  expect(!line.includes("sk_wrong_secret_value"), "the key value never reaches the log");
  sendError = null;
  process.env.RESEND_API_KEY = "re_test_key";
} finally {
  server.close();
}

// Turnstile verification against a mocked siteverify endpoint.
{
  const prod = "0x" + "4".repeat(33);
  const answer = (data, init = {}) => async (url, options) => {
    if (init.capture) init.capture.push({ url, body: String(options.body) });
    if (init.throws) throw init.throws;
    return { ok: init.status ? init.status < 400 : true, status: init.status || 200, json: async () => data };
  };
  const good = { success: true, hostname: "www.barnanorbert.com", action: "contact", "error-codes": [] };
  const capture = [];
  let verdict = await verifyTurnstile({ token: "t", secret: prod, remoteip: "198.51.100.7", fetchImpl: answer(good, { capture }) });
  expect(verdict.ok === true, "turnstile: a valid verdict for our hostname and action passes");
  expect(capture[0]?.url === "https://challenges.cloudflare.com/turnstile/v0/siteverify" && /secret=/.test(capture[0].body) &&
    /response=t/.test(capture[0].body) && /remoteip=198\.51\.100\.7/.test(capture[0].body) && /idempotency_key=/.test(capture[0].body),
    "turnstile: siteverify gets secret, response, remoteip and an idempotency key");
  verdict = await verifyTurnstile({ token: "t", secret: prod, fetchImpl: answer({ ...good, hostname: "evil.example" }) });
  expect(!verdict.ok && verdict.status === 400, "turnstile: a token for another hostname is refused");
  verdict = await verifyTurnstile({ token: "t", secret: prod, fetchImpl: answer({ ...good, action: "login" }) });
  expect(!verdict.ok && verdict.status === 400, "turnstile: a token for another action is refused");
  verdict = await verifyTurnstile({ token: "t", secret: prod, fetchImpl: answer({ success: false, "error-codes": ["timeout-or-duplicate"] }) });
  expect(!verdict.ok && verdict.status === 400 && verdict.error === "captcha_failed", "turnstile: a spent token is refused");
  verdict = await verifyTurnstile({ token: "t", secret: prod, fetchImpl: answer({ success: false, "error-codes": ["invalid-input-secret"] }) });
  expect(!verdict.ok && verdict.status === 503, "turnstile: a bad secret is our outage, not the visitor's fault");
  verdict = await verifyTurnstile({ token: "t", secret: prod, fetchImpl: answer(null, { throws: new TypeError("fetch failed") }) });
  expect(!verdict.ok && verdict.status === 503, "turnstile: a network error fails closed");
  verdict = await verifyTurnstile({ token: "t", secret: prod, fetchImpl: answer(null, { throws: Object.assign(new Error("t"), { name: "TimeoutError" }) }) });
  expect(!verdict.ok && verdict.status === 503 && verdict.codes[0] === "timeout", "turnstile: a timeout fails closed");
  verdict = await verifyTurnstile({ token: "t", secret: prod, fetchImpl: answer(good, { status: 502 }) });
  expect(!verdict.ok && verdict.status === 503, "turnstile: a Cloudflare 5xx fails closed");
  verdict = await verifyTurnstile({ token: "t", secret: "", fetchImpl: answer(good) });
  expect(!verdict.ok && verdict.status === 503, "turnstile: a missing secret fails closed");
  let called = false;
  verdict = await verifyTurnstile({ token: "", secret: prod, fetchImpl: async () => { called = true; return answer(good)(); } });
  expect(!verdict.ok && verdict.status === 400 && !called, "turnstile: a missing token is refused without calling Cloudflare");
  verdict = await verifyTurnstile({ token: "t", secret: "1x0000000000000000000000000000000AA", fetchImpl: answer({ success: true, hostname: "example.com", action: "" }) });
  expect(verdict.ok, "turnstile: Cloudflare's dummy pass secret works for local runs and CI");
  const source = readFileSync(join(ROOT, "lib", "turnstile.js"), "utf8") + readFileSync(join(ROOT, "lib", "contact.js"), "utf8");
  expect(!/console\.[a-z]+\([^)]*\$\{[^}]*(?:secret|token|body|turnstile-response)/i.test(source), "turnstile: neither the token nor the secret is ever logged");
}

// No page may carry an address or a mailto link; the destination is server-side only.
const pages = [];
for (const dir of [".", "work", "hu", "hu/munka"]) {
  const full = join(ROOT, dir);
  if (!existsSync(full)) continue;
  for (const name of readdirSync(full)) if (name.endsWith(".html")) pages.push(join(dir, name));
}
for (const page of pages) {
  const html = readFileSync(join(ROOT, page), "utf8");
  if (/mailto:/i.test(html)) fail(`${page} contains a mailto link`);
  if (exposesInbox(html)) fail(`${page} exposes the private inbox`);
}
// Every served asset too: retired release copies once carried the address in a comment.
for (const dir of ["assets/css", "assets/js"]) {
  for (const name of readdirSync(join(ROOT, dir))) {
    if (!/\.(?:css|js)$/.test(name)) continue;
    const source = readFileSync(join(ROOT, dir, name), "utf8");
    if (exposesInbox(source) || /mailto:/i.test(source)) fail(`${dir}/${name} exposes the inbox or a mail link`);
  }
}
const serverSource = readFileSync(join(ROOT, "server.js"), "utf8") + readFileSync(join(ROOT, "lib", "contact.js"), "utf8");
if (exposesInbox(serverSource)) fail("the destination address must come from CONTACT_TO, not source");

if (failures) {
  console.error(`check-contact: ${failures} failure(s)`);
  process.exit(1);
}
console.log("✓ check-contact: challenge, proof of work, honeypot, timing, validation, origin, limits and delivery hold");
