// Admin sign-in: a single-use magic link mailed to one fixed inbox, then a
// revocable server-side session behind an HttpOnly cookie.
//
// Environment:
//   ADMIN_EMAIL           the only inbox a link is ever sent to (falls back to CONTACT_TO)
//   ADMIN_SESSION_SECRET  HMAC key for the session cookie, at least 32 characters.
//                         Without it a key derived from CONTACT_SECRET is used;
//                         with neither, the admin stays closed.
//   RESEND_API_KEY / CONTACT_FROM  the same mail relay as the contact form
//
// Nothing here trusts the browser: the address typed on the sign-in page is
// only compared with ADMIN_EMAIL, and the answer is the same either way.
const crypto = require("crypto");

const SESSION_COOKIE = "__Host-admin";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LINK_TTL_MS = 10 * 60 * 1000;
const b64url = (buffer) => Buffer.from(buffer).toString("base64url");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function sessionSecret() {
  const configured = String(process.env.ADMIN_SESSION_SECRET || "");
  if (configured.length >= 32) return Buffer.from(configured);
  // No own secret: derive a separate key from the contact form's, so the admin
  // works wherever the contact form is set up. The two keys never coincide.
  const contact = String(process.env.CONTACT_SECRET || "");
  return contact.length >= 32 ? crypto.createHmac("sha256", contact).update("admin-session-v1").digest() : null;
}

function adminEmail() {
  return String(process.env.ADMIN_EMAIL || process.env.CONTACT_TO || "").trim().toLowerCase();
}

// The admin exists only when both a secret and a destination inbox are set.
function adminEnabled() {
  return Boolean(sessionSecret() && adminEmail());
}

function sign(value) {
  return b64url(crypto.createHmac("sha256", sessionSecret()).update(value).digest());
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function readCookie(req, name) {
  const header = String(req.headers.cookie || "");
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return "";
}

// __Host- cookies need Secure and Path=/ and no Domain; over plain http on
// localhost the prefix is dropped so local runs and tests still work.
function cookieName(req) {
  return isSecure(req) ? SESSION_COOKIE : "admin";
}
function isSecure(req) {
  return req.secure || req.get("x-forwarded-proto") === "https";
}
function sessionCookie(req, value, maxAgeSeconds) {
  return `${cookieName(req)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${isSecure(req) ? "; Secure" : ""}`;
}

async function issueLoginToken(store, now = Date.now()) {
  const token = b64url(crypto.randomBytes(32));
  await store.saveLoginToken(sha256(token), now + LINK_TTL_MS);
  return token;
}

async function createSession(store, req, clientHash, now = Date.now()) {
  const id = b64url(crypto.randomBytes(32));
  await store.createSession({ id: sha256(id), expiresAt: now + SESSION_TTL_MS, userAgent: String(req.headers["user-agent"] || "").slice(0, 200), clientHash });
  return `${id}.${sign(id)}`;
}

// Resolves the session row for a request, or null.
async function readSession(store, req) {
  if (!adminEnabled()) return null;
  const raw = readCookie(req, cookieName(req));
  const dot = raw.indexOf(".");
  if (dot < 1) return null;
  const id = raw.slice(0, dot);
  if (!/^[A-Za-z0-9_-]{43}$/.test(id) || !safeEqual(raw.slice(dot + 1), sign(id))) return null;
  const row = await store.getSession(sha256(id));
  if (!row || row.revoked_at || Date.parse(row.expires_at) <= Date.now()) return null;
  return row;
}

// State-changing admin requests must come from this origin and carry the
// custom header a cross-site form cannot set (SameSite=Strict is the first
// line, this is the second).
function sameOriginRequest(req) {
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return false;
    } catch {
      return false;
    }
  } else if (req.headers["sec-fetch-site"] && req.headers["sec-fetch-site"] !== "same-origin") {
    return false;
  }
  return req.headers["x-requested-with"] === "admin";
}

module.exports = {
  SESSION_TTL_MS, LINK_TTL_MS, adminEnabled, adminEmail, sessionSecret, sha256, safeEqual,
  issueLoginToken, createSession, readSession, sessionCookie, cookieName, sameOriginRequest,
};
