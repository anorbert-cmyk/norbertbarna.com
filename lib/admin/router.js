// The admin API, mounted at /admin/api. Every route except sign-in needs a
// live session; every state-changing route also needs a same-origin request
// with the X-Requested-With: admin header (see lib/admin/auth.js).
const express = require("express");
const auth = require("./auth");
const content = require("./content");
const github = require("./github");
const analytics = require("./analytics");
const { AI_BOTS } = require("./traffic");
const { STATUSES } = require("./store");
const { createLimiter, clientAddress, sendWithResend, normalizeApiKey, clean } = require("../contact");

const CANONICAL_ORIGIN = "https://www.barnanorbert.com";
const MINUTE = 60 * 1000;

function loginEmail(link) {
  const text = [
    "Belépés a barnanorbert.com admin felületére:",
    "",
    link,
    "",
    "A link 10 percig érvényes, és csak egyszer használható.",
    "Ha nem te kérted, nincs teendőd: a link nélkül senki nem tud belépni.",
  ].join("\n");
  const html = `<p>Belépés a barnanorbert.com admin felületére:</p><p><a href="${link}">Belépés az adminba</a></p><p>A link 10 percig érvényes, és csak egyszer használható.<br>Ha nem te kérted, nincs teendőd: a link nélkül senki nem tud belépni.</p>`;
  return { subject: "Belépés az admin felületre", text, html };
}

function createAdminRouter({ store, send = sendWithResend, now = () => Date.now() } = {}) {
  const router = express.Router();
  const loginLimiter = createLimiter(5, 15 * MINUTE);
  const loginGlobal = createLimiter(30, 24 * 60 * MINUTE);
  const verifyLimiter = createLimiter(10, 15 * MINUTE);
  const publishLimiter = createLimiter(30, 60 * MINUTE);

  const origin = (req) => (process.env.RAILWAY_ENVIRONMENT ? CANONICAL_ORIGIN : `${req.protocol}://${req.headers.host}`);
  const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
  const json = express.json({ limit: "1500kb", strict: true });
  const bodyOf = (req) => (req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {});

  router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (!auth.adminEnabled()) return res.status(503).json({ error: "disabled" });
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (!auth.sameOriginRequest(req)) return res.status(403).json({ error: "origin" });
      // req.is answers null for a request without a body (DELETE) and false for the wrong type.
      if (req.is("application/json") === false) return res.status(415).json({ error: "type" });
    }
    next();
  });
  router.use(wrap(async (req, res, next) => {
    await store.init();
    next();
  }));

  // ---- sign-in -----------------------------------------------------------
  // The answer never says whether the address was right.
  router.post("/login", json, wrap(async (req, res) => {
    const address = clientAddress(req);
    if (!loginLimiter.take(address, now()) || !loginGlobal.take("all", now())) return res.status(429).json({ error: "rate" });
    const email = String(bodyOf(req).email || "").trim().toLowerCase();
    if (email && email.length <= 254 && auth.safeEqual(email, auth.adminEmail())) {
      const token = await auth.issueLoginToken(store, now());
      const link = `${origin(req)}/admin/#/belepes/${token}`;
      const apiKey = normalizeApiKey(process.env.RESEND_API_KEY);
      const mail = loginEmail(link);
      if (apiKey || send !== sendWithResend) {
        try {
          await send({ apiKey, from: process.env.CONTACT_FROM || "Barna Norbert portfolio <onboarding@resend.dev>", to: auth.adminEmail(), subject: mail.subject, text: mail.text, html: mail.html, idempotencyKey: `admin-login-${auth.sha256(token).slice(0, 32)}` });
        } catch (error) {
          console.error("admin: sign-in mail failed:", error.message);
          return res.status(502).json({ error: "mail" });
        }
      } else if (!process.env.RAILWAY_ENVIRONMENT) {
        console.log(`admin: sign-in link (no mail relay configured): ${link}`);
      } else {
        return res.status(503).json({ error: "mail" });
      }
      await store.audit("login.link_sent", {});
    }
    res.json({ ok: true });
  }));

  router.post("/verify", json, wrap(async (req, res) => {
    if (!verifyLimiter.take(clientAddress(req), now())) return res.status(429).json({ error: "rate" });
    const token = String(bodyOf(req).token || "");
    if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !(await store.consumeLoginToken(auth.sha256(token)))) {
      await store.audit("login.failed", {});
      return res.status(401).json({ error: "token" });
    }
    const value = await auth.createSession(store, req, auth.sha256(clientAddress(req)).slice(0, 16), now());
    res.setHeader("Set-Cookie", auth.sessionCookie(req, value, Math.floor(auth.SESSION_TTL_MS / 1000)));
    await store.audit("login.success", {});
    res.json({ ok: true });
  }));

  // ---- everything below needs a session ----------------------------------
  router.use(wrap(async (req, res, next) => {
    const session = await auth.readSession(store, req);
    if (!session) return res.status(401).json({ error: "auth" });
    req.adminSession = session;
    store.touchSession(session.id).catch(() => {});
    next();
  }));

  router.get("/me", (req, res) => {
    res.json({ ok: true, email: auth.adminEmail(), expiresAt: new Date(req.adminSession.expires_at).toISOString() });
  });

  router.post("/logout", json, wrap(async (req, res) => {
    await store.revokeSession(req.adminSession.id);
    res.setHeader("Set-Cookie", auth.sessionCookie(req, "", 0));
    await store.audit("logout", {});
    res.json({ ok: true });
  }));

  router.post("/sessions/revoke-all", json, wrap(async (req, res) => {
    await store.revokeAllSessions();
    res.setHeader("Set-Cookie", auth.sessionCookie(req, "", 0));
    await store.audit("sessions.revoked_all", {});
    res.json({ ok: true });
  }));

  router.get("/overview", wrap(async (req, res) => {
    const [{ articles, coverage }, counts, traffic] = await Promise.all([
      content.listArticles(),
      store.commentCounts(),
      store.trafficSince(new Date(now() - 29 * 24 * 60 * MINUTE).toISOString().slice(0, 10)),
    ]);
    const published = articles.filter((article) => !article.draft);
    const average = (key) => (published.length ? Math.round(published.reduce((sum, article) => sum + article.scores[key], 0) / published.length) : 0);
    res.json({
      release: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.RELEASE_SHA || "",
      articles: {
        total: articles.length,
        drafts: articles.length - published.length,
        byLang: Object.fromEntries(["hu", "en", "de"].map((lang) => [lang, published.filter((article) => article.lang === lang).length])),
        scores: { seo: average("seo"), aeo: average("aeo"), geo: average("geo"), overall: average("overall") },
        weakest: [...published].sort((a, b) => a.scores.overall - b.scores.overall).slice(0, 5).map((article) => ({ file: article.file, title: article.title, lang: article.lang, scores: article.scores })),
        missingTranslations: coverage.filter((group) => group.missing.length).length,
      },
      comments: counts,
      traffic: {
        days: fillDays(traffic.days, new Date(now() - 29 * 24 * 60 * MINUTE).toISOString().slice(0, 10), new Date(now()).toISOString().slice(0, 10)),
        views: traffic.days.reduce((sum, day) => sum + day.views, 0),
        visitors: traffic.days.reduce((sum, day) => sum + day.visitors, 0),
        aiHits: traffic.bots.filter((bot) => AI_BOTS.has(bot.bot)).reduce((sum, bot) => sum + bot.hits, 0),
      },
      setup: {
        storage: store.kind,
        publishing: github.githubConfigured(),
        posthog: analytics.analyticsConfigured(),
        mail: Boolean(normalizeApiKey(process.env.RESEND_API_KEY)),
      },
    });
  }));

  // ---- articles ----------------------------------------------------------
  router.get("/articles", wrap(async (req, res) => {
    res.json(await content.listArticles());
  }));

  router.get("/articles/source", wrap(async (req, res) => {
    const found = content.articleSource(req.query.file);
    if (!found) return res.status(404).json({ error: "missing" });
    // main may be ahead of this release (a publish still deploying): edit the newest text.
    if (github.githubConfigured()) {
      try {
        const latest = await github.readFile(found.file);
        if (latest && latest.text !== found.source) return res.json({ ...found, source: latest.text, ...(await content.parseSource(latest.text)), ahead: true });
      } catch (error) {
        console.error("admin: GitHub read failed:", error.message);
      }
    }
    res.json({ ...found, ...(await content.parseSource(found.source)), ahead: false });
  }));

  router.post("/articles/validate", json, wrap(async (req, res) => {
    const { source, previousFile, cover } = bodyOf(req);
    const result = await content.validateArticle({ source, previousFile, cover });
    if (result.cover) delete result.cover.base64;
    res.status(result.ok ? 200 : 422).json(result);
  }));

  router.post("/articles/publish", json, wrap(async (req, res) => {
    if (!github.githubConfigured()) return res.status(503).json({ error: "publishing" });
    if (!publishLimiter.take("all", now())) return res.status(429).json({ error: "rate" });
    const { source, previousFile, cover } = bodyOf(req);
    const result = await content.validateArticle({ source, previousFile, cover });
    if (!result.ok) return res.status(422).json(result);
    const files = [{ path: result.file, content: result.source }];
    if (result.previousFile) files.push({ path: result.previousFile, delete: true });
    if (result.cover) files.push({ path: result.cover.path, base64: result.cover.base64 });
    const verb = previousFile ? "Update" : "Add";
    const change = await github.proposeChange({ message: `CMS: ${verb} article ${result.article.lang}/${result.article.slug}${result.article.draft ? " (draft)" : ""}`, files });
    await store.audit("article.publish", { file: result.file, branch: change.branch, draft: result.article.draft, renamedFrom: result.previousFile });
    res.json({ ok: true, branch: change.branch, file: result.file });
  }));

  router.post("/articles/delete", json, wrap(async (req, res) => {
    if (!github.githubConfigured()) return res.status(503).json({ error: "publishing" });
    if (!publishLimiter.take("all", now())) return res.status(429).json({ error: "rate" });
    const result = await content.validateRemoval(bodyOf(req).file);
    if (!result.ok) return res.status(422).json(result);
    const change = await github.proposeChange({ message: `CMS: Remove article ${result.file}`, files: [{ path: result.file, delete: true }] });
    await store.audit("article.delete", { file: result.file, branch: change.branch });
    res.json({ ok: true, branch: change.branch });
  }));

  router.get("/publishes", wrap(async (req, res) => {
    if (!github.githubConfigured()) return res.json({ configured: false, runs: [] });
    const [runs, head] = await Promise.all([github.listPublishes(15), github.mainHead()]);
    const release = process.env.RAILWAY_GIT_COMMIT_SHA || "";
    res.json({ configured: true, runs, head, release, live: !release || release === head });
  }));

  router.get("/pages", wrap(async (req, res) => {
    res.json({ pages: content.listPages() });
  }));

  // ---- comments ----------------------------------------------------------
  router.get("/comments", wrap(async (req, res) => {
    const status = STATUSES.includes(req.query.status) ? req.query.status : undefined;
    const [comments, counts, enabled] = await Promise.all([store.listComments({ status, limit: 300 }), store.commentCounts(), store.getSetting("comments_enabled", true)]);
    res.json({ comments, counts, enabled: enabled !== false, durable: store.kind === "postgres" });
  }));

  router.post("/comments/settings", json, wrap(async (req, res) => {
    const enabled = bodyOf(req).enabled === true;
    await store.setSetting("comments_enabled", enabled);
    await store.audit("comments.settings", { enabled });
    res.json({ ok: true, enabled });
  }));

  router.post("/comments/:id", json, wrap(async (req, res) => {
    const patch = {};
    const body = bodyOf(req);
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) return res.status(422).json({ error: "status" });
      patch.status = body.status;
    }
    if (body.body !== undefined) {
      const text = clean(body.body, 4000);
      if (!text) return res.status(422).json({ error: "body" });
      patch.body = text;
    }
    const updated = await store.updateComment(String(req.params.id), patch);
    if (!updated) return res.status(404).json({ error: "missing" });
    await store.audit("comment.update", { id: updated.id, status: patch.status, edited: Boolean(patch.body) });
    res.json({ ok: true, comment: updated });
  }));

  router.post("/comments/:id/reply", json, wrap(async (req, res) => {
    const parent = await store.getComment(String(req.params.id));
    if (!parent) return res.status(404).json({ error: "missing" });
    const text = clean(bodyOf(req).body, 4000);
    if (!text) return res.status(422).json({ error: "body" });
    const reply = await store.addComment({ page: parent.page, lang: parent.lang, parentId: parent.parentId || parent.id, authorName: parent.lang === "hu" ? "Barna Norbert" : "Norbert Barna", body: text, status: "approved", isAuthor: true });
    if (parent.status === "pending") await store.updateComment(parent.id, { status: "approved" });
    await store.audit("comment.reply", { id: reply.id, to: parent.id });
    res.json({ ok: true, comment: reply });
  }));

  router.delete("/comments/:id", wrap(async (req, res) => {
    const removed = await store.deleteComment(String(req.params.id));
    if (!removed) return res.status(404).json({ error: "missing" });
    await store.audit("comment.delete", { id: String(req.params.id) });
    res.json({ ok: true });
  }));

  // ---- analytics ---------------------------------------------------------
  // Every day of the range, so a quiet day shows as zero instead of a gap.
  const fillDays = (rows, since, until) => {
    const byDay = new Map(rows.map((row) => [row.day, row]));
    const out = [];
    for (let time = Date.parse(`${since}T00:00:00Z`); time <= Date.parse(`${until}T00:00:00Z`); time += 24 * 60 * MINUTE) {
      const day = new Date(time).toISOString().slice(0, 10);
      out.push(byDay.get(day) || { day, views: 0, visitors: 0 });
    }
    return out;
  };
  const rangeOf = (req) => ([7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30);

  router.get("/traffic", wrap(async (req, res) => {
    const days = rangeOf(req);
    const since = new Date(now() - (days - 1) * 24 * 60 * MINUTE).toISOString().slice(0, 10);
    const data = await store.trafficSince(since);
    const langOf = (path) => (path === "/hu" || path.startsWith("/hu/") ? "hu" : path === "/de" || path.startsWith("/de/") ? "de" : "en");
    const languages = ["hu", "en", "de"].map((lang) => {
      const rows = data.pages.filter((page) => langOf(page.path) === lang);
      return { lang, views: rows.reduce((sum, row) => sum + row.views, 0), visitors: rows.reduce((sum, row) => sum + row.visitors, 0) };
    });
    res.json({
      days,
      since,
      durable: store.kind === "postgres",
      totals: { views: data.days.reduce((sum, day) => sum + day.views, 0), visitors: data.days.reduce((sum, day) => sum + day.visitors, 0) },
      daily: fillDays(data.days, since, new Date(now()).toISOString().slice(0, 10)),
      pages: data.pages.map((page) => ({ ...page, lang: langOf(page.path) })),
      languages,
      sources: data.sources,
      bots: data.bots.map((bot) => ({ ...bot, ai: AI_BOTS.has(bot.bot) })),
      botPages: data.botPages.filter((row) => AI_BOTS.has(row.bot)).slice(0, 200),
    });
  }));

  router.get("/analytics", wrap(async (req, res) => {
    if (!analytics.analyticsConfigured()) return res.json({ configured: false });
    try {
      res.json({ configured: true, ...(await analytics.loadAnalytics(rangeOf(req))) });
    } catch (error) {
      console.error("admin: PostHog query failed:", error.message);
      res.status(502).json({ configured: true, error: "posthog", status: error.status || 0 });
    }
  }));

  // Google Search Console (through PostHog's warehouse): impressions, clicks,
  // average position, per page and per query.
  router.get("/search", wrap(async (req, res) => {
    if (!analytics.analyticsConfigured()) return res.json({ configured: false });
    try {
      res.json({ configured: true, ...(await analytics.loadSearch(rangeOf(req))) });
    } catch (error) {
      console.error("admin: Search Console query failed:", error.message);
      res.status(502).json({ configured: true, error: "posthog", status: error.status || 0 });
    }
  }));

  // ---- activity ----------------------------------------------------------
  router.get("/activity", wrap(async (req, res) => {
    const [log, sessions] = await Promise.all([store.listAudit(100), store.listSessions()]);
    res.json({
      log,
      sessions: sessions.map((session) => ({
        current: session.id === req.adminSession.id,
        createdAt: new Date(session.created_at).toISOString(),
        lastSeenAt: new Date(session.last_seen_at).toISOString(),
        expiresAt: new Date(session.expires_at).toISOString(),
        userAgent: session.user_agent || "",
      })),
    });
  }));

  router.use((req, res) => res.status(404).json({ error: "missing" }));
  // eslint-disable-next-line no-unused-vars
  router.use((error, req, res, next) => {
    if (error && error.type === "entity.too.large") return res.status(413).json({ error: "size" });
    if (error && error.type === "entity.parse.failed") return res.status(400).json({ error: "json" });
    console.error("admin: request failed:", error && error.message);
    res.status(error && error.status === 401 ? 502 : 500).json({ error: "server" });
  });

  return router;
}

module.exports = { createAdminRouter };
