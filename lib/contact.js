// Contact form API: a stateless proof-of-work challenge plus a validated,
// rate-limited relay to Resend. The destination address never reaches the
// browser; it lives only in the CONTACT_TO environment variable.
//
// Environment:
//   RESEND_API_KEY   Resend API key (required to send)
//   CONTACT_TO       destination inbox (required to send)
//   CONTACT_FROM     verified sender, e.g. "Barna Norbert <hello@barnanorbert.com>"
//   CONTACT_SECRET   HMAC key for challenges, at least 32 characters (random per boot otherwise)
//   CONTACT_POW_BITS proof-of-work difficulty in leading zero bits (12..22, default 18)
//   CONTACT_DAILY_CAP messages per day for the whole site (default 80, under Resend's free daily quota)
//   CONTACT_DRY_RUN  "1" accepts valid messages without calling Resend (tests)
const crypto = require("crypto");
const net = require("net");
const fs = require("fs");
const path = require("path");
const express = require("express");

const TOPICS = {
  web: { en: "Website or app development", hu: "Weboldal- vagy alkalmazásfejlesztés" },
  ai: { en: "AI integration", hu: "AI-integráció" },
  role: { en: "A product leadership role", hu: "Termékvezetői pozíció" },
  other: { en: "Something else", hu: "Valami más" },
};

const MIN_FILL_MS = 3000;
const CHALLENGE_TTL_MS = 2 * 60 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SENDS_PER_IP = 5;
const MAX_SENDS_PER_IP_DAY = 3;
// The site-wide cap counts in 6-hour buckets so one burst cannot close the
// form for a whole day.
const GLOBAL_WINDOW_MS = 6 * 60 * 60 * 1000;
const MAX_CHALLENGES_PER_IP = 40;
const MAX_TRACKED_KEYS = 50000;
const MAX_LINKS = 3;
const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const LINK_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;
const HAS_LINK = /\b(?:https?:\/\/|www\.)\S+/i;
// C0/C1 controls except tab and newline (carriage returns are normalized
// first), plus zero-width and bidirectional controls that could disguise a
// subject line in the inbox.
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u00AD\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B-\u200F\u2028-\u202E\u2060-\u2069\u3164\uFE00-\uFE0F\uFEFF\uFFA0\uFFF9-\uFFFB\u{E0000}-\u{E007F}]/gu;

const secret = (() => {
  const configured = String(process.env.CONTACT_SECRET || "");
  if (configured.length >= 32) return Buffer.from(configured);
  if (process.env.RAILWAY_ENVIRONMENT) console.warn("contact: CONTACT_SECRET missing or short; challenges expire on restart");
  return crypto.randomBytes(32);
})();

function dailyCap() {
  const cap = Number.parseInt(process.env.CONTACT_DAILY_CAP || "80", 10);
  return Number.isInteger(cap) && cap > 0 ? cap : 80;
}

function powBits() {
  const bits = Number.parseInt(process.env.CONTACT_POW_BITS || "18", 10);
  return Number.isInteger(bits) ? Math.min(22, Math.max(12, bits)) : 18;
}

const b64url = (buffer) => Buffer.from(buffer).toString("base64url");
const sign = (payload) => crypto.createHmac("sha256", secret).update(payload).digest();

function issueChallenge(now = Date.now()) {
  const salt = crypto.randomBytes(16).toString("hex");
  const difficulty = powBits();
  const payload = b64url(JSON.stringify({ s: salt, d: difficulty, t: now }));
  return { token: `${payload}.${b64url(sign(payload))}`, salt, difficulty };
}

// Only the canonical encoding of a signature is accepted: base64url decoding
// ignores padding and stray characters, so a lenient check would let one
// solved challenge be replayed under endless spellings.
function readChallenge(token) {
  if (typeof token !== "string" || token.length > 256) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(payload) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return null;
  const given = Buffer.from(signature, "base64url");
  if (given.length !== 32 || b64url(given) !== signature) return null;
  if (!crypto.timingSafeEqual(given, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.s !== "string" || !/^[a-f0-9]{32}$/.test(data.s) || !Number.isInteger(data.d) || !Number.isInteger(data.t)) return null;
    return data;
  } catch {
    return null;
  }
}

function leadingZeroBits(buffer) {
  let bits = 0;
  for (const byte of buffer) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    bits += Math.clz32(byte) - 24;
    break;
  }
  return bits;
}

function solves(challenge, nonce) {
  if (typeof nonce !== "string" || !/^\d{1,12}$/.test(nonce)) return false;
  const digest = crypto.createHash("sha256").update(`${challenge.s}:${nonce}`, "utf8").digest();
  return leadingZeroBits(digest) >= challenge.d;
}

// Small fixed-window counters keyed by client address. In-memory is enough for
// one Railway instance; a restart only forgives the current window. The map is
// bounded so a flood of distinct keys cannot exhaust memory: when full, new
// keys are refused until old windows expire.
function createLimiter(limit, windowMs) {
  const hits = new Map();
  const prune = (now) => { for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key); };
  return {
    take(key, now = Date.now()) {
      const entry = hits.get(key);
      if (!entry && hits.size >= MAX_TRACKED_KEYS) {
        prune(now);
        // Still full: forget the oldest window rather than lock everyone out.
        if (hits.size >= MAX_TRACKED_KEYS) hits.delete(hits.keys().next().value);
      }
      if (!entry || entry.reset <= now) {
        hits.set(key, { count: 1, reset: now + windowMs });
        return true;
      }
      if (entry.count >= limit) return false;
      entry.count += 1;
      return true;
    },
    prune(now = Date.now()) {
      prune(now);
    },
  };
}

// Railway's edge documents X-Real-IP as the client address and appends the
// connecting client to X-Forwarded-For; outside Railway only the socket
// counts. Anything that is not an IP falls back to the socket, and IPv6 is
// grouped per /64 so one host cannot rotate through its own subnet.
function v6Prefix(ip) {
  const [head, tail = ""] = ip.split("::");
  const a = head ? head.split(":") : [];
  const b = tail ? tail.split(":") : [];
  const groups = [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill("0"), ...b]
    .map((group) => Number.parseInt(group || "0", 16).toString(16));
  return `${groups.slice(0, 4).join(":").toLowerCase()}::/64`;
}

function clientAddress(req) {
  const socket = req.socket.remoteAddress || "";
  let ip = socket;
  if (process.env.RAILWAY_ENVIRONMENT) {
    const real = String(req.headers["x-real-ip"] || "").trim();
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",").map((part) => part.trim()).filter(Boolean).pop() || "";
    ip = net.isIP(real) ? real : forwarded;
  }
  if (!net.isIP(ip)) ip = socket;
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (!net.isIP(ip)) return "unknown";
  return net.isIPv6(ip) ? v6Prefix(ip) : ip;
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function clean(value, max) {
  if (typeof value !== "string") return null;
  const text = value.replace(/\r\n?/g, "\n").replace(CONTROL_CHARS, "").trim();
  return text.length > max ? null : text;
}

// Each invalid field carries a reason code so the page can name the exact
// problem: empty, short, long, format or links.
function validate(body) {
  const invalid = [];
  const reasons = {};
  const flag = (field, reason) => { invalid.push(field); reasons[field] = reason; };
  const name = clean(body.name, 100);
  if (name === null) flag("name", typeof body.name === "string" ? "long" : "empty");
  else if (!name) flag("name", "empty");
  else if (name.length < 2) flag("name", "short");
  else if (/\n/.test(name)) flag("name", "format");
  else if (HAS_LINK.test(name)) flag("name", "links");
  const email = clean(body.email, 254);
  if (email === null) flag("email", typeof body.email === "string" ? "long" : "empty");
  else if (!email) flag("email", "empty");
  else if (!EMAIL_PATTERN.test(email)) flag("email", "format");
  const topic = typeof body.topic === "string" && Object.hasOwn(TOPICS, body.topic) ? body.topic : null;
  if (!topic) flag("topic", "empty");
  const message = clean(body.message, 5000);
  const links = message ? (message.match(LINK_PATTERN) || []).length : 0;
  if (message === null) flag("message", typeof body.message === "string" ? "long" : "empty");
  else if (!message) flag("message", "empty");
  else if (message.length < 20) flag("message", "short");
  else if (links > MAX_LINKS) flag("message", "links");
  const lang = body.lang === "hu" ? "hu" : "en";
  return { invalid, reasons, fields: { name, email, topic, message, lang } };
}

// The notification uses lib/contact-email.html, the same markup published as
// the "Contact form message" template in Resend. Every visitor value is
// HTML-escaped here before it reaches the markup, so a message can never add
// tags, links or styles to the owner's inbox.
const EMAIL_TEMPLATE = fs.readFileSync(path.join(__dirname, "contact-email.html"), "utf8");
const escapeHtml = (value) => String(value)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function receivedAt(now) {
  try {
    return new Intl.DateTimeFormat("hu-HU", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Budapest" }).format(now);
  } catch {
    return now.toISOString();
  }
}

function composeEmail({ name, email, topic, message, lang }, now = new Date()) {
  const topicLabel = TOPICS[topic].hu;
  const language = lang === "hu" ? "magyar" : "angol";
  const when = receivedAt(now);
  const subject = `Új üzenet a weboldalról: ${topicLabel}, ${name}`.slice(0, 180);
  const replyUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Re: ${topicLabel}`)}`;
  const values = {
    NAME: escapeHtml(name),
    SENDER_EMAIL: escapeHtml(email),
    TOPIC: escapeHtml(topicLabel),
    MESSAGE: escapeHtml(message).replace(/\n/g, "<br>"),
    LANGUAGE: language,
    RECEIVED_AT: escapeHtml(when),
    REPLY_URL: escapeHtml(replyUrl),
  };
  const html = EMAIL_TEMPLATE.replace(/\{\{\{([A-Z_]+)\}\}\}/g, (match, key) => (Object.hasOwn(values, key) ? values[key] : ""));
  const text = [
    "Új üzenet a barnanorbert.com kapcsolati űrlapjáról",
    "",
    `Név: ${name}`,
    `E-mail: ${email}`,
    `Téma: ${topicLabel}`,
    `Oldal nyelve: ${language}`,
    `Érkezett: ${when}`,
    "",
    "Az üzenet:",
    message,
    "",
    "A Válasz gomb közvetlenül a feladónak ír.",
  ].join("\n");
  return { subject, text, html };
}

async function sendWithResend({ apiKey, from, to, replyTo, subject, text, html, idempotencyKey }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject, text, html }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const error = new Error(`Resend responded ${response.status}`);
    error.status = response.status;
    throw error;
  }
}

function createContactRouter({ send = sendWithResend, now = () => Date.now() } = {}) {
  const router = express.Router();
  const challengeLimiter = createLimiter(MAX_CHALLENGES_PER_IP, WINDOW_MS);
  const sendLimiter = createLimiter(MAX_SENDS_PER_IP, WINDOW_MS);
  const dailyLimiter = createLimiter(MAX_SENDS_PER_IP_DAY, DAY_MS);
  const globalLimiter = createLimiter(Math.max(1, Math.round(dailyCap() / 4)), GLOBAL_WINDOW_MS);
  // Spent challenges are keyed by their signed salt and expire with the
  // challenge itself; the map is bounded like the limiters.
  const spent = new Map();
  // Returns false when the map is full of live entries; the caller then
  // refuses to deliver rather than accept a challenge it cannot mark spent.
  const remember = (salt, expires, current) => {
    if (spent.size >= MAX_TRACKED_KEYS) for (const [key, at] of spent) if (at <= current) spent.delete(key);
    if (spent.size >= MAX_TRACKED_KEYS) return false;
    spent.set(salt, expires);
    return true;
  };

  const prune = () => {
    const current = now();
    challengeLimiter.prune(current);
    sendLimiter.prune(current);
    dailyLimiter.prune(current);
    globalLimiter.prune(current);
    for (const [key, expires] of spent) if (expires <= current) spent.delete(key);
  };
  setInterval(prune, 5 * 60 * 1000).unref();

  router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex");
    next();
  });

  router.get("/challenge", (req, res) => {
    if (!challengeLimiter.take(clientAddress(req), now())) return res.status(429).json({ error: "rate" });
    res.json(issueChallenge(now()));
  });

  router.post(
    "/",
    (req, res, next) => {
      if (!sameOrigin(req)) return res.status(403).json({ error: "origin" });
      if (!req.is("application/json")) return res.status(415).json({ error: "type" });
      next();
    },
    express.json({ limit: "16kb", strict: true }),
    async (req, res) => {
      const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
      const current = now();

      const challenge = readChallenge(body.token);
      if (
        !challenge ||
        challenge.d < powBits() ||
        current - challenge.t > CHALLENGE_TTL_MS ||
        spent.has(challenge.s) ||
        !solves(challenge, body.nonce)
      ) {
        return res.status(403).json({ error: "challenge" });
      }
      const expires = challenge.t + CHALLENGE_TTL_MS;

      const { invalid, reasons, fields } = validate(body);
      if (invalid.length) return res.status(400).json({ ok: false, error: "invalid", fields: invalid, reasons });

      const ip = clientAddress(req);
      if (!sendLimiter.take(ip, current) || !dailyLimiter.take(ip, current)) {
        return res.status(429).json({ error: "rate" });
      }

      // A filled honeypot or an inhumanly fast submit is a bot. It has already
      // passed the same checks as a person, so answer as if it worked and send
      // nothing; the bot learns nothing about which check caught it.
      const honeypot = [body.hp_7f3, body.website].some((value) => typeof value === "string" && value.trim());
      if (honeypot || current - challenge.t < MIN_FILL_MS) {
        remember(challenge.s, expires, current);
        return res.json({ ok: true });
      }

      // The site-wide cap protects the delivery quota; when it trips the page
      // offers LinkedIn instead of blaming the visitor.
      if (!globalLimiter.take("all", current)) return res.status(503).json({ error: "unavailable" });

      const dryRun = process.env.CONTACT_DRY_RUN === "1";
      const apiKey = process.env.RESEND_API_KEY;
      const to = process.env.CONTACT_TO;
      if (!dryRun && (!apiKey || !to)) return res.status(503).json({ error: "unavailable" });

      if (!remember(challenge.s, expires, current)) return res.status(503).json({ error: "unavailable" });
      if (dryRun) return res.json({ ok: true });

      const { subject, text, html } = composeEmail(fields, new Date(current));
      try {
        await send({
          apiKey,
          from: process.env.CONTACT_FROM || "Barna Norbert portfolio <onboarding@resend.dev>",
          to,
          replyTo: fields.email,
          subject,
          text,
          html,
          idempotencyKey: crypto.createHash("sha256").update(challenge.s).digest("hex"),
        });
      } catch (error) {
        spent.delete(challenge.s);
        console.error(`contact: delivery failed (${error && error.status ? error.status : "network"})`);
        return res.status(503).json({ error: "unavailable" });
      }
      res.json({ ok: true });
    }
  );

  // Malformed JSON or an oversized body lands here instead of the site-wide
  // handler so the client always gets a JSON answer.
  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, next) => {
    const status = err && (err.type === "entity.too.large" ? 413 : err.status === 400 ? 400 : err.status === 415 ? 415 : 500);
    res.status(status).json({ error: status === 500 ? "unavailable" : status === 415 ? "type" : "invalid" });
  });

  return router;
}

module.exports = { createContactRouter, issueChallenge, readChallenge, solves, leadingZeroBits, validate, composeEmail, TOPICS };
