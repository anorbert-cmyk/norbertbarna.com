// Cloudflare Turnstile verification for the contact form. Runs on top of the
// proof of work, honeypot, timing and rate limits; it never replaces them.
//
// Environment:
//   TURNSTILE_SECRET_KEY  widget secret (Railway only; never commit or log it)
//   TURNSTILE_HOSTNAMES   accepted hostnames (default www.barnanorbert.com,barnanorbert.com)
//
// Cloudflare's documented dummy secrets (1x…AA pass, 2x…AA fail, 3x…AA spent)
// answer with a placeholder hostname and no action, so for them only the
// success flag counts. They are for local runs and CI, never production.
const crypto = require("crypto");

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const ACTION = "contact";
const TIMEOUT_MS = 5000;
const DUMMY_SECRET = /^[123]x0{31}AA$/;
const MAX_TOKEN_LENGTH = 2048;

function acceptedHostnames() {
  return String(process.env.TURNSTILE_HOSTNAMES || "www.barnanorbert.com,barnanorbert.com")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

// Result: { ok: true } or { ok: false, status: 400 | 503, error, codes }.
async function verifyTurnstile({ token, remoteip, secret = process.env.TURNSTILE_SECRET_KEY, fetchImpl = fetch, timeoutMs = TIMEOUT_MS }) {
  if (typeof token !== "string" || !token.trim() || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, status: 400, error: "captcha_failed", codes: ["missing-input-response"] };
  }
  if (!secret) return { ok: false, status: 503, error: "captcha_unavailable", codes: ["missing-input-secret"] };

  const body = new URLSearchParams({ secret, response: token, idempotency_key: crypto.randomUUID() });
  if (remoteip) body.set("remoteip", remoteip);

  let data;
  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return { ok: false, status: 503, error: "captcha_unavailable", codes: [`http-${response.status}`] };
    data = await response.json();
  } catch (error) {
    const timedOut = error && (error.name === "TimeoutError" || error.name === "AbortError");
    return { ok: false, status: 503, error: "captcha_unavailable", codes: [timedOut ? "timeout" : "network"] };
  }

  const codes = Array.isArray(data && data["error-codes"]) ? data["error-codes"].map(String).slice(0, 8) : [];
  if (!data || data.success !== true) {
    // A bad secret is our configuration problem, not the visitor's.
    if (codes.some((code) => /secret/.test(code))) return { ok: false, status: 503, error: "captcha_unavailable", codes };
    return { ok: false, status: 400, error: "captcha_failed", codes };
  }
  if (!DUMMY_SECRET.test(secret)) {
    if (!acceptedHostnames().includes(String(data.hostname || "").toLowerCase())) {
      return { ok: false, status: 400, error: "captcha_failed", codes: ["hostname-mismatch"] };
    }
    if (data.action !== ACTION) return { ok: false, status: 400, error: "captcha_failed", codes: ["action-mismatch"] };
  }
  return { ok: true };
}

module.exports = { verifyTurnstile, SITEVERIFY_URL, ACTION };
