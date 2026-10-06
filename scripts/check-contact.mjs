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
const app = express();
app.use(
  "/api/contact",
  contact.createContactRouter({
    now: () => clock,
    send: async (mail) => {
      if (sendError) throw sendError;
      sent.push(mail);
    },
  })
);
const server = app.listen(0);
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
  website: "",
  lang: "en",
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

  // Visitor text can never add markup to the owner's inbox.
  {
    const hostile = contact.composeEmail({ name: '<img src=x onerror=alert(1)>', email: 'a"b@example.com', topic: "web",
      message: '<a href="https://evil.example">click</a>\nsecond line', lang: "hu" });
    expect(!/<img src=x|<a href="https:\/\/evil/.test(hostile.html) && /&lt;img src=x/.test(hostile.html) && /second line/.test(hostile.html) && /<br>second line/.test(hostile.html),
      "visitor values are HTML-escaped in the notification");
  }

  // Replay of a spent challenge, including non-canonical spellings of its signature.
  result = await post({ ...message, ...proof });
  expect(result.status === 403 && result.body.error === "challenge", "a spent challenge is refused");
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
} finally {
  server.close();
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
