// Reader comments on the articles. Public API at /api/comments:
//   GET  /api/comments?page=/hu/irasok/<slug>   approved comments of one article
//   GET  /api/comments/challenge                proof-of-work challenge (as the contact form)
//   POST /api/comments                          submit a comment; it waits for moderation
//
// Nothing a reader sends is shown until it is approved in the admin. A comment
// carries a display name and the text only: no email address, no cookie, and
// the client address is kept only as a salted hash for rate limiting.
const crypto = require("crypto");
const express = require("express");
const { createLimiter, clientAddress, sameOrigin, clean, issueChallenge, readChallenge, solves, powBits, CHALLENGE_TTL_MS, sendWithResend, normalizeApiKey } = require("./contact");

const ARTICLE_PATH = /^\/(?:hu\/irasok|writing|de\/wissen)\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MINUTE = 60 * 1000;
const MIN_FILL_MS = 4000;
const LINK = /\b(?:https?:\/\/|www\.)\S+/gi;

const langOfPath = (page) => (page.startsWith("/hu/") ? "hu" : page.startsWith("/de/") ? "de" : "en");

function validateComment(body) {
  const fields = {};
  const name = clean(body.name, 60);
  const text = clean(body.body, 2000);
  if (!name) fields.name = typeof body.name === "string" && body.name.trim() ? "long" : "empty";
  else if (name.length < 2) fields.name = "short";
  else if (LINK.test(name) || /[<>]/.test(name)) fields.name = "format";
  LINK.lastIndex = 0;
  if (!text) fields.body = typeof body.body === "string" && body.body.trim() ? "long" : "empty";
  else if (text.length < 5) fields.body = "short";
  else if ((text.match(LINK) || []).length > 2) fields.body = "links";
  return { ok: !Object.keys(fields).length, fields, value: { name, body: text } };
}

function createCommentsRouter({ store, now = () => Date.now(), send = sendWithResend } = {}) {
  const router = express.Router();
  const readLimiter = createLimiter(120, 5 * MINUTE);
  const challengeLimiter = createLimiter(30, 15 * MINUTE);
  const postLimiter = createLimiter(3, 15 * MINUTE);
  const dayLimiter = createLimiter(8, 24 * 60 * MINUTE);
  const globalLimiter = createLimiter(150, 24 * 60 * MINUTE);
  const notifyLimiter = createLimiter(20, 24 * 60 * MINUTE);
  const spent = new Map();
  const hashSalt = crypto.createHash("sha256").update(`comments|${process.env.CONTACT_SECRET || process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(16).toString("hex")}`).digest();
  const clientHash = (req) => crypto.createHmac("sha256", hashSalt).update(clientAddress(req)).digest("base64url").slice(0, 22);
  // Comments need storage that survives a deploy; without it the feature is off.
  const durable = () => store.kind === "postgres" || !process.env.RAILWAY_ENVIRONMENT;
  const enabled = async () => durable() && (await store.getSetting("comments_enabled", true)) !== false;

  setInterval(() => {
    const current = now();
    for (const limiter of [readLimiter, challengeLimiter, postLimiter, dayLimiter, globalLimiter, notifyLimiter]) limiter.prune(current);
    for (const [key, expires] of spent) if (expires <= current) spent.delete(key);
  }, 5 * MINUTE).unref();

  const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

  router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex");
    next();
  });

  router.get("/challenge", (req, res) => {
    if (!challengeLimiter.take(clientAddress(req), now())) return res.status(429).json({ error: "rate" });
    res.json(issueChallenge(now()));
  });

  router.get("/", wrap(async (req, res) => {
    const page = String(req.query.page || "");
    if (!ARTICLE_PATH.test(page)) return res.status(400).json({ error: "page" });
    if (!readLimiter.take(clientAddress(req), now())) return res.status(429).json({ error: "rate" });
    await store.init();
    if (!(await enabled())) return res.json({ enabled: false, comments: [] });
    const comments = await store.publicComments(page);
    res.json({
      enabled: true,
      comments: comments.map((comment) => ({ id: comment.id, parentId: comment.parentId, name: comment.authorName, body: comment.body, author: comment.isAuthor, at: comment.createdAt })),
    });
  }));

  router.post(
    "/",
    (req, res, next) => {
      if (!sameOrigin(req)) return res.status(403).json({ error: "origin" });
      if (!req.is("application/json")) return res.status(415).json({ error: "type" });
      next();
    },
    express.json({ limit: "12kb", strict: true }),
    wrap(async (req, res) => {
      const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
      const current = now();
      const page = String(body.page || "");
      if (!ARTICLE_PATH.test(page)) return res.status(400).json({ error: "page" });
      await store.init();
      if (!(await enabled())) return res.status(503).json({ error: "closed" });

      const challenge = readChallenge(body.token);
      if (!challenge || challenge.d < powBits() || current - challenge.t > CHALLENGE_TTL_MS || challenge.t > current + MINUTE || !solves(challenge, String(body.nonce ?? ""))) {
        return res.status(400).json({ error: "challenge" });
      }
      if (spent.has(challenge.s)) return res.status(400).json({ error: "challenge" });

      // Honeypot and a too-fast fill: answer as if it worked, store nothing.
      if ((typeof body.website === "string" && body.website.trim()) || current - challenge.t < MIN_FILL_MS) {
        spent.set(challenge.s, challenge.t + CHALLENGE_TTL_MS);
        return res.json({ ok: true, status: "pending" });
      }

      const checked = validateComment(body);
      if (!checked.ok) return res.status(422).json({ error: "invalid", fields: checked.fields });

      let parentId = null;
      if (body.parentId !== undefined && body.parentId !== null) {
        const parent = await store.getComment(String(body.parentId).slice(0, 40));
        if (!parent || parent.page !== page || parent.status !== "approved") return res.status(422).json({ error: "invalid", fields: { parentId: "format" } });
        parentId = parent.parentId || parent.id;
      }

      const address = clientAddress(req);
      if (!postLimiter.take(address, current) || !dayLimiter.take(address, current) || !globalLimiter.take("all", current)) {
        return res.status(429).json({ error: "rate" });
      }
      spent.set(challenge.s, challenge.t + CHALLENGE_TTL_MS);

      const saved = await store.addComment({ page, lang: langOfPath(page), parentId, authorName: checked.value.name, body: checked.value.body, status: "pending", clientHash: clientHash(req) });
      res.json({ ok: true, status: "pending" });

      // Tell the owner there is something to moderate; never blocks the reader.
      const apiKey = normalizeApiKey(process.env.RESEND_API_KEY);
      const to = process.env.ADMIN_EMAIL || process.env.CONTACT_TO;
      if ((apiKey || send !== sendWithResend) && to && notifyLimiter.take("all", current)) {
        const text = `Új hozzászólás vár jóváhagyásra.\n\nCikk: https://www.barnanorbert.com${page}\nNév: ${saved.authorName}\n\n${saved.body}\n\nModerálás: https://www.barnanorbert.com/admin/#/hozzaszolasok`;
        Promise.resolve(send({ apiKey, from: process.env.CONTACT_FROM || "Barna Norbert portfolio <onboarding@resend.dev>", to, subject: "Új hozzászólás vár jóváhagyásra", text, html: undefined, idempotencyKey: `comment-${saved.id}` }))
          .catch((error) => console.error("comments: notification failed:", error.message));
      }
    })
  );

  // eslint-disable-next-line no-unused-vars
  router.use((error, req, res, next) => {
    if (error && error.type === "entity.too.large") return res.status(413).json({ error: "size" });
    if (error && error.type === "entity.parse.failed") return res.status(400).json({ error: "json" });
    console.error("comments: request failed:", error && error.message);
    res.status(503).json({ error: "unavailable" });
  });

  return router;
}

module.exports = { createCommentsRouter, validateComment, ARTICLE_PATH };
