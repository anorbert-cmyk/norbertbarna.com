// Persistent state for the admin and the public comments: Postgres when
// DATABASE_URL is set (Railway), otherwise an in-memory store for local runs
// and tests. Articles are NOT stored here: they live in content/*.md in git.
//
// Tables (created on first use, idempotent):
//   comments      reader comments and the author's replies, moderated
//   admin_sessions  signed-in admin browsers (revocable)
//   login_tokens  single-use magic-link tokens (only their SHA-256 is kept)
//   audit_log     who did what in the admin, for the activity view
//   kv            small settings (e.g. comments on/off)
const crypto = require("crypto");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  page TEXT NOT NULL,
  lang TEXT NOT NULL,
  parent_id TEXT,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  is_author BOOLEAN NOT NULL DEFAULT FALSE,
  client_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_page_idx ON comments (page, status, created_at);
CREATE INDEX IF NOT EXISTS comments_status_idx ON comments (status, created_at DESC);
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  user_agent TEXT,
  client_hash TEXT
);
CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL,
  detail JSONB
);
CREATE TABLE IF NOT EXISTS traffic_pages (
  day DATE NOT NULL,
  path TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path)
);
CREATE TABLE IF NOT EXISTS traffic_days (
  day DATE PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS traffic_sources (
  day DATE NOT NULL,
  source TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, source)
);
CREATE TABLE IF NOT EXISTS traffic_bots (
  day DATE NOT NULL,
  bot TEXT NOT NULL,
  path TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, bot, path)
);
CREATE TABLE IF NOT EXISTS traffic_seen (
  day DATE NOT NULL,
  key TEXT NOT NULL,
  PRIMARY KEY (day, key)
);
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

const STATUSES = ["pending", "approved", "spam", "trash"];
const newId = () => crypto.randomBytes(12).toString("base64url");

function rowToComment(row) {
  return {
    id: row.id,
    page: row.page,
    lang: row.lang,
    parentId: row.parent_id || null,
    authorName: row.author_name,
    body: row.body,
    status: row.status,
    isAuthor: Boolean(row.is_author),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function createMemoryStore() {
  const comments = new Map();
  const sessions = new Map();
  const tokens = new Map();
  const audit = [];
  const kv = new Map();
  const traffic = { seen: new Set(), pages: new Map(), days: new Map(), sources: new Map(), bots: new Map() };
  let auditId = 0;
  return {
    kind: "memory",
    async init() {},
    async close() {},
    async addComment(input) {
      const now = new Date().toISOString();
      const row = { id: newId(), page: input.page, lang: input.lang, parent_id: input.parentId || null, author_name: input.authorName, body: input.body, status: input.status || "pending", is_author: Boolean(input.isAuthor), client_hash: input.clientHash || null, created_at: now, updated_at: now };
      comments.set(row.id, row);
      return rowToComment(row);
    },
    async getComment(id) {
      const row = comments.get(id);
      return row ? rowToComment(row) : null;
    },
    async listComments({ status, page, limit = 200 } = {}) {
      return [...comments.values()]
        .filter((row) => (!status || row.status === status) && (!page || row.page === page))
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
        .slice(0, limit).map(rowToComment);
    },
    async publicComments(page) {
      return [...comments.values()].filter((row) => row.page === page && row.status === "approved")
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)).map(rowToComment);
    },
    async updateComment(id, patch) {
      const row = comments.get(id);
      if (!row) return null;
      if (patch.status) row.status = patch.status;
      if (typeof patch.body === "string") row.body = patch.body;
      row.updated_at = new Date().toISOString();
      return rowToComment(row);
    },
    async deleteComment(id) {
      for (const row of comments.values()) if (row.parent_id === id) comments.delete(row.id);
      return comments.delete(id);
    },
    async commentCounts() {
      const counts = { pending: 0, approved: 0, spam: 0, trash: 0 };
      for (const row of comments.values()) counts[row.status] = (counts[row.status] || 0) + 1;
      return counts;
    },
    async recentCommentsFrom(clientHash, sinceMs) {
      return [...comments.values()].filter((row) => row.client_hash === clientHash && Date.parse(row.created_at) >= sinceMs).length;
    },
    async createSession({ id, expiresAt, userAgent, clientHash }) {
      sessions.set(id, { id, created_at: new Date().toISOString(), last_seen_at: new Date().toISOString(), expires_at: new Date(expiresAt).toISOString(), revoked_at: null, user_agent: userAgent || null, client_hash: clientHash || null });
    },
    async getSession(id) {
      const row = sessions.get(id);
      return row ? { ...row } : null;
    },
    async touchSession(id) {
      const row = sessions.get(id);
      if (row) row.last_seen_at = new Date().toISOString();
    },
    async listSessions() {
      return [...sessions.values()].filter((row) => !row.revoked_at && Date.parse(row.expires_at) > Date.now()).map((row) => ({ ...row }));
    },
    async revokeSession(id) {
      const row = sessions.get(id);
      if (row && !row.revoked_at) row.revoked_at = new Date().toISOString();
    },
    async revokeAllSessions() {
      for (const row of sessions.values()) if (!row.revoked_at) row.revoked_at = new Date().toISOString();
    },
    async saveLoginToken(tokenHash, expiresAt) {
      tokens.set(tokenHash, { expires_at: expiresAt, used_at: null });
    },
    // Atomically marks the token used; true only for the first, unexpired use.
    async consumeLoginToken(tokenHash) {
      const row = tokens.get(tokenHash);
      if (!row || row.used_at || row.expires_at <= Date.now()) return false;
      row.used_at = Date.now();
      return true;
    },
    // ---- first-party traffic counters (lib/admin/traffic.js) ----
    async markSeen(day, key) {
      const id = `${day}|${key}`;
      if (traffic.seen.has(id)) return false;
      for (const old of traffic.seen) if (!old.startsWith(day)) traffic.seen.delete(old);
      traffic.seen.add(id);
      return true;
    },
    async pruneSeen() {},
    async addPageView({ day, path, newOnPath, newOnSite, source }) {
      const page = traffic.pages.get(`${day}|${path}`) || { day, path, views: 0, visitors: 0 };
      page.views += 1; page.visitors += newOnPath ? 1 : 0;
      traffic.pages.set(`${day}|${path}`, page);
      const total = traffic.days.get(day) || { day, views: 0, visitors: 0 };
      total.views += 1; total.visitors += newOnSite ? 1 : 0;
      traffic.days.set(day, total);
      if (newOnSite && source) {
        const row = traffic.sources.get(`${day}|${source}`) || { day, source, visits: 0 };
        row.visits += 1;
        traffic.sources.set(`${day}|${source}`, row);
      }
    },
    async addBotHit({ day, bot, path }) {
      const row = traffic.bots.get(`${day}|${bot}|${path}`) || { day, bot, path, hits: 0 };
      row.hits += 1;
      traffic.bots.set(`${day}|${bot}|${path}`, row);
    },
    async trafficSince(sinceDay) {
      const from = (row) => row.day >= sinceDay;
      const sum = (rows, key, fields) => {
        const out = new Map();
        for (const row of rows) {
          const entry = out.get(row[key]) || { [key]: row[key], ...Object.fromEntries(fields.map((field) => [field, 0])) };
          for (const field of fields) entry[field] += row[field];
          out.set(row[key], entry);
        }
        return [...out.values()];
      };
      return {
        days: [...traffic.days.values()].filter(from).sort((a, b) => a.day.localeCompare(b.day)),
        pages: sum([...traffic.pages.values()].filter(from), "path", ["views", "visitors"]).sort((a, b) => b.views - a.views),
        sources: sum([...traffic.sources.values()].filter(from), "source", ["visits"]).sort((a, b) => b.visits - a.visits),
        bots: sum([...traffic.bots.values()].filter(from), "bot", ["hits"]).sort((a, b) => b.hits - a.hits),
        botPages: [...traffic.bots.values()].filter(from).reduce((list, row) => {
          const entry = list.find((item) => item.bot === row.bot && item.path === row.path);
          if (entry) entry.hits += row.hits; else list.push({ bot: row.bot, path: row.path, hits: row.hits });
          return list;
        }, []).sort((a, b) => b.hits - a.hits),
      };
    },
    async audit(action, detail = {}) {
      audit.unshift({ id: ++auditId, at: new Date().toISOString(), action, detail });
      if (audit.length > 1000) audit.length = 1000;
    },
    async listAudit(limit = 100) {
      return audit.slice(0, limit);
    },
    async getSetting(key, fallback = null) {
      return kv.has(key) ? kv.get(key) : fallback;
    },
    async setSetting(key, value) {
      kv.set(key, value);
    },
  };
}

function createPostgresStore(connectionString) {
  // Required lazily so the public site never needs the driver to boot.
  const { Pool } = require("pg");
  const internal = /\.railway\.internal(?::|\/|$)/.test(connectionString) || /localhost|127\.0\.0\.1/.test(connectionString);
  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ...(internal ? {} : { ssl: { rejectUnauthorized: false } }),
  });
  pool.on("error", (error) => console.error("store: idle client error", error.message));
  const q = (text, params) => pool.query(text, params);
  let ready = null;
  return {
    kind: "postgres",
    init() {
      ready ||= q(SCHEMA).catch((error) => { ready = null; throw error; });
      return ready;
    },
    async close() { await pool.end(); },
    async addComment(input) {
      const { rows } = await q(
        `INSERT INTO comments (id, page, lang, parent_id, author_name, body, status, is_author, client_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [newId(), input.page, input.lang, input.parentId || null, input.authorName, input.body, input.status || "pending", Boolean(input.isAuthor), input.clientHash || null]
      );
      return rowToComment(rows[0]);
    },
    async getComment(id) {
      const { rows } = await q("SELECT * FROM comments WHERE id = $1", [id]);
      return rows[0] ? rowToComment(rows[0]) : null;
    },
    async listComments({ status, page, limit = 200 } = {}) {
      const where = [];
      const params = [];
      if (status) { params.push(status); where.push(`status = $${params.length}`); }
      if (page) { params.push(page); where.push(`page = $${params.length}`); }
      params.push(Math.min(500, Math.max(1, limit)));
      const { rows } = await q(`SELECT * FROM comments ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT $${params.length}`, params);
      return rows.map(rowToComment);
    },
    async publicComments(page) {
      const { rows } = await q("SELECT * FROM comments WHERE page = $1 AND status = 'approved' ORDER BY created_at ASC LIMIT 500", [page]);
      return rows.map(rowToComment);
    },
    async updateComment(id, patch) {
      const { rows } = await q(
        `UPDATE comments SET status = COALESCE($2, status), body = COALESCE($3, body), updated_at = now() WHERE id = $1 RETURNING *`,
        [id, patch.status || null, typeof patch.body === "string" ? patch.body : null]
      );
      return rows[0] ? rowToComment(rows[0]) : null;
    },
    async deleteComment(id) {
      await q("DELETE FROM comments WHERE parent_id = $1", [id]);
      const { rowCount } = await q("DELETE FROM comments WHERE id = $1", [id]);
      return rowCount > 0;
    },
    async commentCounts() {
      const { rows } = await q("SELECT status, count(*)::int AS n FROM comments GROUP BY status");
      const counts = { pending: 0, approved: 0, spam: 0, trash: 0 };
      for (const row of rows) counts[row.status] = row.n;
      return counts;
    },
    async recentCommentsFrom(clientHash, sinceMs) {
      const { rows } = await q("SELECT count(*)::int AS n FROM comments WHERE client_hash = $1 AND created_at >= $2", [clientHash, new Date(sinceMs)]);
      return rows[0].n;
    },
    async createSession({ id, expiresAt, userAgent, clientHash }) {
      await q("INSERT INTO admin_sessions (id, expires_at, user_agent, client_hash) VALUES ($1,$2,$3,$4)", [id, new Date(expiresAt), userAgent || null, clientHash || null]);
    },
    async getSession(id) {
      const { rows } = await q("SELECT * FROM admin_sessions WHERE id = $1", [id]);
      return rows[0] || null;
    },
    async touchSession(id) {
      await q("UPDATE admin_sessions SET last_seen_at = now() WHERE id = $1", [id]);
    },
    async listSessions() {
      const { rows } = await q("SELECT * FROM admin_sessions WHERE revoked_at IS NULL AND expires_at > now() ORDER BY last_seen_at DESC");
      return rows;
    },
    async revokeSession(id) {
      await q("UPDATE admin_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL", [id]);
    },
    async revokeAllSessions() {
      await q("UPDATE admin_sessions SET revoked_at = now() WHERE revoked_at IS NULL");
    },
    async saveLoginToken(tokenHash, expiresAt) {
      await q("DELETE FROM login_tokens WHERE expires_at < now() - interval '1 day'");
      await q("INSERT INTO login_tokens (token_hash, expires_at) VALUES ($1,$2)", [tokenHash, new Date(expiresAt)]);
    },
    async consumeLoginToken(tokenHash) {
      const { rowCount } = await q("UPDATE login_tokens SET used_at = now() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()", [tokenHash]);
      return rowCount === 1;
    },
    // ---- first-party traffic counters (lib/admin/traffic.js) ----
    async markSeen(day, key) {
      const { rowCount } = await q("INSERT INTO traffic_seen (day, key) VALUES ($1,$2) ON CONFLICT DO NOTHING", [day, key]);
      return rowCount === 1;
    },
    async pruneSeen(beforeDay) {
      await q("DELETE FROM traffic_seen WHERE day < $1", [beforeDay]);
    },
    async addPageView({ day, path, newOnPath, newOnSite, source }) {
      await q(
        `INSERT INTO traffic_pages (day, path, views, visitors) VALUES ($1,$2,1,$3)
         ON CONFLICT (day, path) DO UPDATE SET views = traffic_pages.views + 1, visitors = traffic_pages.visitors + EXCLUDED.visitors`,
        [day, path, newOnPath ? 1 : 0]
      );
      await q(
        `INSERT INTO traffic_days (day, views, visitors) VALUES ($1,1,$2)
         ON CONFLICT (day) DO UPDATE SET views = traffic_days.views + 1, visitors = traffic_days.visitors + EXCLUDED.visitors`,
        [day, newOnSite ? 1 : 0]
      );
      if (newOnSite && source) {
        await q(
          `INSERT INTO traffic_sources (day, source, visits) VALUES ($1,$2,1)
           ON CONFLICT (day, source) DO UPDATE SET visits = traffic_sources.visits + 1`,
          [day, source]
        );
      }
    },
    async addBotHit({ day, bot, path }) {
      await q(
        `INSERT INTO traffic_bots (day, bot, path, hits) VALUES ($1,$2,$3,1)
         ON CONFLICT (day, bot, path) DO UPDATE SET hits = traffic_bots.hits + 1`,
        [day, bot, path]
      );
    },
    async trafficSince(sinceDay) {
      const [days, pages, sources, bots, botPages] = await Promise.all([
        q("SELECT to_char(day, 'YYYY-MM-DD') AS day, views, visitors FROM traffic_days WHERE day >= $1 ORDER BY day", [sinceDay]),
        q("SELECT path, sum(views)::int AS views, sum(visitors)::int AS visitors FROM traffic_pages WHERE day >= $1 GROUP BY path ORDER BY views DESC LIMIT 300", [sinceDay]),
        q("SELECT source, sum(visits)::int AS visits FROM traffic_sources WHERE day >= $1 GROUP BY source ORDER BY visits DESC LIMIT 50", [sinceDay]),
        q("SELECT bot, sum(hits)::int AS hits FROM traffic_bots WHERE day >= $1 GROUP BY bot ORDER BY hits DESC LIMIT 50", [sinceDay]),
        q("SELECT bot, path, sum(hits)::int AS hits FROM traffic_bots WHERE day >= $1 GROUP BY bot, path ORDER BY hits DESC LIMIT 500", [sinceDay]),
      ]);
      return { days: days.rows, pages: pages.rows, sources: sources.rows, bots: bots.rows, botPages: botPages.rows };
    },
    async audit(action, detail = {}) {
      await q("INSERT INTO audit_log (action, detail) VALUES ($1,$2)", [action, JSON.stringify(detail)]);
    },
    async listAudit(limit = 100) {
      const { rows } = await q("SELECT id, at, action, detail FROM audit_log ORDER BY id DESC LIMIT $1", [Math.min(500, limit)]);
      return rows.map((row) => ({ ...row, at: new Date(row.at).toISOString() }));
    },
    async getSetting(key, fallback = null) {
      const { rows } = await q("SELECT value FROM kv WHERE key = $1", [key]);
      return rows[0] ? rows[0].value : fallback;
    },
    async setSetting(key, value) {
      await q("INSERT INTO kv (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()", [key, JSON.stringify(value)]);
    },
  };
}

let shared = null;
function getStore() {
  if (!shared) shared = process.env.DATABASE_URL ? createPostgresStore(process.env.DATABASE_URL) : createMemoryStore();
  return shared;
}

module.exports = { getStore, createMemoryStore, createPostgresStore, STATUSES };
