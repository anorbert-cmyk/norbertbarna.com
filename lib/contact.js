// Contact form API: a stateless proof-of-work challenge plus a validated,
// rate-limited relay to Resend. The destination address never reaches the
// browser; it lives only in the CONTACT_TO environment variable.
//
// Environment:
//   RESEND_API_KEY   Resend API key (required to send)
//   CONTACT_TO       destination inbox (required to send)
//   CONTACT_FROM     verified sender, e.g. "Barna Norbert <hello@barnanorbert.com>"
//   CONTACT_SECRET   HMAC key for challenges (optional; random per boot otherwise)
//   CONTACT_POW_BITS proof-of-work difficulty in leading zero bits (12..22, default 16)
//   CONTACT_DRY_RUN  "1" accepts valid messages without calling Resend (tests)
const crypto = require("crypto");
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
const MAX_SENDS_PER_IP = 5;
const MAX_CHALLENGES_PER_IP = 40;
const MAX_SENDS_PER_HOUR = 60;
const MAX_LINKS = 3;
const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const LINK_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;
const HAS_LINK = /\b(?:https?:\/\/|www\.)\S+/i;
// C0/C1 controls except tab and newline; carriage returns are normalized first.
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;

const secret = (() => {
  const configured = String(process.env.CONTACT_SECRET || "");
  return configured.length >= 32 ? Buffer.from(configured) : crypto.randomBytes(32);
})();

function powBits() {
  const bits = Number.parseInt(process.env.CONTACT_POW_BITS || "16", 10);
  return Number.isInteger(bits) ? Math.min(22, Math.max(12, bits)) : 16;
}

const b64url = (buffer) => Buffer.from(buffer).toString("base64url");
const sign = (payload) => crypto.createHmac("sha256", secret).update(payload).digest();

function issueChallenge(now = Date.now()) {
  const salt = crypto.randomBytes(16).toString("hex");
  const difficulty = powBits();
  const payload = b64url(JSON.stringify({ s: salt, d: difficulty, t: now }));
  return { token: `${payload}.${b64url(sign(payload))}`, salt, difficulty };
}

function readChallenge(token) {
  if (typeof token !== "string" || token.length > 512) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = sign(payload);
  let given;
  try {
    given = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.s !== "string" || !Number.isInteger(data.d) || !Number.isInteger(data.t)) return null;
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
// one Railway instance; a restart only forgives the current window.
function createLimiter(limit, windowMs) {
  const hits = new Map();
  return {
    take(key, now = Date.now()) {
      const entry = hits.get(key);
      if (!entry || entry.reset <= now) {
        hits.set(key, { count: 1, reset: now + windowMs });
        return true;
      }
      if (entry.count >= limit) return false;
      entry.count += 1;
      return true;
    },
    prune(now = Date.now()) {
      for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
    },
  };
}

function clientAddress(req) {
  // Railway's edge appends the connecting client to X-Forwarded-For; the
  // rightmost entry is the one the edge saw, earlier entries are client-set.
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return forwarded.length ? forwarded[forwarded.length - 1] : req.socket.remoteAddress || "unknown";
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

function validate(body) {
  const invalid = [];
  const name = clean(body.name, 100);
  if (!name || name.length < 2 || /\n/.test(name) || HAS_LINK.test(name)) invalid.push("name");
  const email = clean(body.email, 254);
  if (!email || !EMAIL_PATTERN.test(email)) invalid.push("email");
  const topic = typeof body.topic === "string" && Object.hasOwn(TOPICS, body.topic) ? body.topic : null;
  if (!topic) invalid.push("topic");
  const message = clean(body.message, 5000);
  const links = message ? (message.match(LINK_PATTERN) || []).length : 0;
  if (!message || message.length < 20 || links > MAX_LINKS) invalid.push("message");
  const lang = body.lang === "hu" ? "hu" : "en";
  return { invalid, fields: { name, email, topic, message, lang } };
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
  const globalLimiter = createLimiter(MAX_SENDS_PER_HOUR, 60 * 60 * 1000);
  const spent = new Map();

  const prune = () => {
    const current = now();
    challengeLimiter.prune(current);
    sendLimiter.prune(current);
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
        spent.has(body.token) ||
        !solves(challenge, body.nonce)
      ) {
        return res.status(403).json({ error: "challenge" });
      }

      // A filled honeypot or an inhumanly fast submit is a bot. Answer as if it
      // worked so the bot learns nothing, and send nothing.
      const honeypot = typeof body.website === "string" ? body.website.trim() : "";
      if (honeypot || current - challenge.t < MIN_FILL_MS) {
        spent.set(body.token, current + CHALLENGE_TTL_MS);
        return res.json({ ok: true });
      }

      const { invalid, fields } = validate(body);
      if (invalid.length) return res.status(400).json({ ok: false, error: "invalid", fields: invalid });

      if (!sendLimiter.take(clientAddress(req), current) || !globalLimiter.take("all", current)) {
        return res.status(429).json({ error: "rate" });
      }

      const dryRun = process.env.CONTACT_DRY_RUN === "1";
      const apiKey = process.env.RESEND_API_KEY;
      const to = process.env.CONTACT_TO;
      if (!dryRun && (!apiKey || !to)) return res.status(503).json({ error: "unavailable" });

      spent.set(body.token, current + CHALLENGE_TTL_MS);
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
          idempotencyKey: crypto.createHash("sha256").update(body.token).digest("hex"),
        });
      } catch (error) {
        spent.delete(body.token);
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
    const status = err && (err.type === "entity.too.large" ? 413 : err.status === 400 ? 400 : 500);
    res.status(status).json({ error: status === 500 ? "unavailable" : "invalid" });
  });

  return router;
}

module.exports = { createContactRouter, issueChallenge, readChallenge, solves, leadingZeroBits, validate, composeEmail, TOPICS };
