// Server-side PostHog events for AI agent traffic.
//
// The browser snippet only sees people who accept analytics, and agents run
// no script at all. Three things they do are visible to the server alone:
//   - agent_search: a query to /.well-known/search;
//   - agent_markdown_request: a page asked for as Markdown (Accept: text/markdown);
//   - ai_bot_request: a known AI crawler or assistant fetching a page or llms.txt.
//
// Nothing personal is sent: no IP address, no cookie, no full user agent and
// no referrer URL. The "who" is the crawler family (GPTBot, ClaudeBot...) and
// that family name is the PostHog distinct id, so no person profile is made
// and one visitor cannot be told from another. Queries are cut short and have
// e-mail addresses and long digit runs masked before they leave the server.
//
// Events are queued in memory and posted in batches after the response has
// been sent. A PostHog outage costs events, never a page.
const { AI_BOTS, classify } = require("./admin/traffic");
const { SEARCH_PATH } = require("./agent-search");

// The project key is the public one the browser snippet already ships
// (assets/js/analytics.js); it can only write events.
const PROJECT_KEY = "phc_A6NZzdAmwhiRd9yXKevru3nqDWX5eqmNvzhxMHCn4T3Q";
const HOST = "https://eu.i.posthog.com";
const MAX_QUEUE = 500;
const BATCH = 50;
const FLUSH_MS = 10000;

// Agents that announce themselves without being one of the crawler families.
const TOOLS = [
  ["Claude Code", /claude-code|claude-cli/i],
  ["ChatGPT", /ChatGPT|OpenAI/i],
  ["Gemini", /Gemini|Google-Agent/i],
  ["Cursor", /Cursor/i],
  ["curl", /^curl\//i],
  ["Python", /python-|aiohttp|httpx/i],
  ["Node", /node-fetch|undici|axios|^node$/i],
  ["Go", /Go-http-client/i],
];

function agentOf(userAgent) {
  const ua = String(userAgent || "");
  const family = classify(ua);
  if (family && family !== "other-bot") return { agent: family, kind: AI_BOTS.has(family) ? "ai-bot" : "crawler" };
  for (const [name, pattern] of TOOLS) if (pattern.test(ua)) return { agent: name, kind: "tool" };
  return family ? { agent: "other-bot", kind: "other" } : { agent: "browser", kind: "browser" };
}

function redact(text) {
  return String(text || "")
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[number]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

async function postBatch(batch, { key, host }) {
  const response = await fetch(`${host}/batch/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, batch }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`PostHog answered ${response.status}`);
}

function createAgentAnalytics({
  // Only the deployed site reports; local runs, CI and tests stay silent.
  enabled = Boolean(process.env.RAILWAY_ENVIRONMENT) && process.env.AGENT_ANALYTICS !== "0",
  key = process.env.POSTHOG_PROJECT_KEY || PROJECT_KEY,
  host = process.env.POSTHOG_HOST || HOST,
  send = postBatch,
  now = () => new Date(),
} = {}) {
  let queue = [];
  let timer = null;

  async function flush() {
    if (timer) clearTimeout(timer);
    timer = null;
    while (queue.length) {
      const batch = queue.splice(0, BATCH);
      try {
        await send(batch, { key, host });
      } catch (error) {
        console.error("agent analytics: batch not sent:", error.message);
        return;
      }
    }
  }

  function capture(event, agent, properties) {
    if (!enabled) return;
    if (queue.length >= MAX_QUEUE) queue.shift();
    queue.push({
      event,
      distinct_id: `agent:${agent}`,
      timestamp: now().toISOString(),
      properties: {
        ...properties,
        agent,
        $process_person_profile: false,
        $geoip_disable: true,
        $ip: null,
        $lib: "barnanorbert-server",
      },
    });
    if (queue.length >= BATCH) {
      flush();
    } else if (!timer) {
      timer = setTimeout(flush, FLUSH_MS);
      timer.unref?.();
    }
  }

  // Mounted ahead of every route; it only reads the finished response.
  function middleware(req, res, next) {
    if (!enabled) return next();
    // Read now: inside a mounted route req.path is relative to the mount.
    const requested = req.path;
    res.on("finish", () => {
      try {
        const { agent, kind } = agentOf(req.headers["user-agent"]);
        const type = String(res.getHeader("Content-Type") || "");
        const path = requested.slice(0, 200);
        const base = { agent_kind: kind, status: res.statusCode, method: req.method };
        if (path === SEARCH_PATH) {
          if (req.method === "OPTIONS") return;
          const found = res.locals.agentSearch;
          capture("agent_search", agent, {
            ...base,
            query: found ? redact(found.query) : "",
            results: found ? found.results : 0,
            top_result: found?.top || null,
            answered: Boolean(found),
          });
        } else if (res.statusCode === 200 && /^text\/markdown/.test(type)) {
          capture("agent_markdown_request", agent, { ...base, path });
        } else if (kind === "ai-bot" && res.statusCode === 200 && (/^text\/html/.test(type) || path === "/llms.txt")) {
          capture("ai_bot_request", agent, { ...base, path });
        }
      } catch (error) {
        console.error("agent analytics: not recorded:", error.message);
      }
    });
    next();
  }

  return { middleware, capture, flush, pending: () => queue.length };
}

module.exports = { createAgentAnalytics, agentOf, redact };
