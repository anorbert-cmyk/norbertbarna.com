// Server-side PostHog events for AI agent traffic.
//
// The browser snippet only sees people who accept analytics, and agents run
// no script at all. Three things they do are visible to the server alone:
//   - agent_search: a query to /.well-known/search;
//   - agent_markdown_request: a page asked for as Markdown (Accept: text/markdown);
//   - ai_bot_request: a known AI crawler or assistant fetching a page or llms.txt.
// A fourth event counts people without asking them, because it cannot tell
// them apart:
//   - server_pageview: a browser was served a page. Every such event carries
//     the same distinct id, so there is no visitor, session or return visit in
//     the data, only how often a page was opened, in which language, on what
//     class of device and from which kind of site the visit arrived.
//
// Nothing personal is sent: no IP address, no cookie, no full user agent and
// no referrer URL. The "who" is the crawler family (GPTBot, ClaudeBot...) and
// that family name is the PostHog distinct id, so no person profile is made
// and one visitor cannot be told from another. Queries are cut short and have
// e-mail addresses and long digit runs masked before they leave the server.
//
// Events are queued in memory and posted in batches after the response has
// been sent. A PostHog outage costs events, never a page.
const { AI_BOTS, classify, sourceOf } = require("./admin/traffic");
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

// One id for every person: PostHog cannot separate one visitor from another.
const ANONYMOUS = "anonymous-visitor";
const NOT_A_PAGE = /^\/(?:admin|api|assets)(?:\/|$)|\.[a-z0-9]{2,5}$/i;
const SEARCH = new Set(["google", "bing", "duckduckgo"]);
const ASSISTANTS = new Set(["chatgpt", "perplexity", "claude", "gemini", "copilot"]);
const SOCIAL = new Set(["linkedin", "meta", "x"]);

function languageOf(path) {
  return /^\/hu(?:\/|$)/.test(path) ? "hu" : /^\/de(?:\/|$)/.test(path) ? "de" : "en";
}

// The same page types the browser snippet reports (assets/js/analytics.js).
function pageTypeOf(path) {
  const local = path.replace(/^\/(?:hu|de)(?=\/|$)/, "") || "/";
  if (local === "/") return "home";
  if (/^\/(?:works|munkak|arbeiten)$/.test(local)) return "work_index";
  if (/^\/(?:work|munka|arbeit)\//.test(local)) return "case_study";
  if (/^\/(?:about|rolam|ueber-mich)$/.test(local)) return "about";
  if (/^\/(?:contact|kapcsolat|kontakt)$/.test(local)) return "contact";
  if (/^\/(?:privacy|adatvedelem|datenschutz)$/.test(local)) return "privacy";
  if (/^\/(?:writing|irasok|wissen)$/.test(local)) return "writing_index";
  if (/^\/(?:writing|irasok|wissen)\//.test(local)) return "article";
  return "service";
}

// Where a visit starts and what kind of site sent it. A move between two
// pages of this site is not a new visit and has no source.
function arrivalOf(req) {
  const site = String(req.headers["sec-fetch-site"] || "");
  const source = sourceOf(req);
  const internal = site ? site === "same-origin" : source === null;
  if (internal) return { entry: false, source: "internal", channel: "internal" };
  const from = source || "direct";
  const medium = String(req.query?.utm_medium || "").toLowerCase();
  const channel = ["cpc", "ppc", "paid", "paid_search", "paid_social", "display"].includes(medium) ? "paid"
    : ASSISTANTS.has(from) ? "ai_referral"
    : SEARCH.has(from) ? "organic_search"
    : SOCIAL.has(from) ? "social_referral"
    : from === "direct" ? "direct_or_unknown" : "other_referral";
  return { entry: true, source: from, channel };
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

  function capture(event, agent, properties, distinctId = `agent:${agent}`) {
    if (!enabled) return;
    if (queue.length >= MAX_QUEUE) queue.shift();
    queue.push({
      event,
      distinct_id: distinctId,
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
        } else if (kind === "browser" && req.method === "GET" && res.statusCode === 200 && /^text\/html/.test(type) && !NOT_A_PAGE.test(path)
          && !/prefetch|prerender/i.test(String(req.headers["sec-purpose"] || req.headers.purpose || ""))) {
          const clean = path.length > 1 ? path.replace(/\/$/, "") : "/";
          const { entry, source, channel } = arrivalOf(req);
          capture("server_pageview", "browser", {
            path: clean,
            $pathname: clean,
            $current_url: `https://www.barnanorbert.com${clean}`,
            $host: "www.barnanorbert.com",
            page_language: languageOf(clean),
            page_type: pageTypeOf(clean),
            is_entry: entry,
            acquisition_source: source,
            acquisition_channel: channel,
            $device_type: /Mobi|Android|iPhone/i.test(String(req.headers["user-agent"] || "")) ? "Mobile" : "Desktop",
          }, ANONYMOUS);
        }
      } catch (error) {
        console.error("agent analytics: not recorded:", error.message);
      }
    });
    next();
  }

  return { middleware, capture, flush, pending: () => queue.length };
}

module.exports = { createAgentAnalytics, agentOf, redact, languageOf, pageTypeOf, arrivalOf };
