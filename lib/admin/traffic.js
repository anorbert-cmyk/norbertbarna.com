// First-party, cookieless traffic counter for the admin.
//
// PostHog only sees visitors who accept analytics, so its numbers are a small
// floor. This counter reads what the server already knows about every page
// request and keeps daily totals only:
//   - no cookie, no localStorage, nothing stored on the visitor's device;
//   - the IP address and user agent are never stored. They are hashed with a
//     random salt that lives in memory and is replaced every day, so a visitor
//     cannot be recognised from one day to the next, or after a restart;
//   - only aggregates are written: views and unique visitors per page and day,
//     the referring site's host name, and crawler hits per bot.
// Crawlers are counted separately, by family, which shows how often search
// and AI engines (GPTBot, ClaudeBot, PerplexityBot...) fetch each article.
const crypto = require("crypto");
const { clientAddress } = require("../contact");

const BOTS = [
  ["GPTBot", /GPTBot/i], ["OAI-SearchBot", /OAI-SearchBot/i], ["ChatGPT-User", /ChatGPT-User/i],
  ["ClaudeBot", /ClaudeBot|anthropic-ai/i], ["Claude-User", /Claude-User|Claude-SearchBot/i],
  ["PerplexityBot", /PerplexityBot/i], ["Perplexity-User", /Perplexity-User/i],
  ["Google-Extended", /Google-Extended|GoogleOther|Google-CloudVertexBot/i], ["Googlebot", /Googlebot|Google-InspectionTool|Storebot-Google/i],
  ["Bingbot", /bingbot|BingPreview|msnbot/i], ["Applebot", /Applebot/i], ["DuckDuckBot", /DuckDuckBot|DuckAssistBot/i],
  ["Meta", /meta-externalagent|facebookexternalhit|FacebookBot/i], ["Amazonbot", /Amazonbot/i], ["Bytespider", /Bytespider/i],
  ["CCBot", /CCBot/i], ["YandexBot", /YandexBot/i], ["MistralAI", /MistralAI-User/i], ["LinkedInBot", /LinkedInBot/i],
  ["SEO tools", /AhrefsBot|SemrushBot|MJ12bot|DotBot|DataForSeoBot|SEOkicks|serpstatbot|Screaming Frog/i],
];
const AI_BOTS = new Set(["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Meta", "Amazonbot", "Bytespider", "CCBot", "MistralAI", "DuckDuckBot", "Applebot"]);
const GENERIC_BOT = /bot\b|crawl|spider|slurp|headless|lighthouse|pagespeed|curl\/|wget|python-|go-http|okhttp|axios|node-fetch|undici|java\/|libwww|httpclient|monitor|uptime|preview|scan|fetch|playwright|puppeteer|phantom/i;
const SKIP_PATH = /^\/(?:admin|api|assets)(?:\/|$)|\.(?:xml|txt|json|ico|png|jpg|jpeg|webp|svg|css|js|map|woff2?)$/i;

function classify(userAgent) {
  const ua = String(userAgent || "");
  if (!ua) return "other-bot";
  for (const [name, pattern] of BOTS) if (pattern.test(ua)) return name;
  if (GENERIC_BOT.test(ua) || !/Mozilla\//.test(ua)) return "other-bot";
  return null;
}

// Where the visit came from, as a short label. Never the full referrer URL.
function sourceOf(req) {
  const utm = String(req.query?.utm_source || "").toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40);
  if (utm) return utm;
  const referrer = String(req.headers.referer || "");
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
    if (!host || host === "barnanorbert.com" || host === req.hostname) return null;
    if (/(^|\.)google\./.test(host)) return "google";
    if (/(^|\.)bing\.com$/.test(host)) return "bing";
    if (/duckduckgo\.com$/.test(host)) return "duckduckgo";
    if (/chatgpt\.com$|openai\.com$/.test(host)) return "chatgpt";
    if (/perplexity\.ai$/.test(host)) return "perplexity";
    if (/claude\.ai$/.test(host)) return "claude";
    if (/gemini\.google\.com$/.test(host)) return "gemini";
    if (/copilot\.microsoft\.com$/.test(host)) return "copilot";
    if (/linkedin\.com$|lnkd\.in$/.test(host)) return "linkedin";
    if (/facebook\.com$|fb\.com$|instagram\.com$/.test(host)) return "meta";
    if (/(^|\.)t\.co$|twitter\.com$|x\.com$/.test(host)) return "x";
    return host.slice(0, 60);
  } catch {
    return "direct";
  }
}

function createTrafficCounter(store, { now = () => Date.now() } = {}) {
  let salt = crypto.randomBytes(32);
  let saltDay = "";
  const dayOf = (time) => new Date(time).toISOString().slice(0, 10);
  const visitorKey = (req, day) => {
    if (day !== saltDay) {
      salt = crypto.randomBytes(32);
      saltDay = day;
      Promise.resolve(store.pruneSeen(day)).catch(() => {});
    }
    return crypto.createHmac("sha256", salt).update(`${clientAddress(req)}|${req.headers["user-agent"] || ""}`).digest("base64url").slice(0, 22);
  };

  async function record(req) {
    // The tables are created on first use; a page view may be that first use.
    await store.init();
    const day = dayOf(now());
    const path = req.path.length > 1 ? req.path.replace(/\/$/, "") : "/";
    const bot = classify(req.headers["user-agent"]);
    if (bot) return store.addBotHit({ day, bot, path });
    const visitor = visitorKey(req, day);
    const [newOnSite, newOnPath] = await Promise.all([store.markSeen(day, visitor), store.markSeen(day, `${visitor}|${path}`)]);
    const source = newOnSite ? sourceOf(req) : null;
    return store.addPageView({ day, path, newOnPath, newOnSite, source });
  }

  // Counts a page once its 200 HTML response has been sent. Never delays or
  // changes the response, and a storage failure is only logged.
  function middleware(req, res, next) {
    if (req.method !== "GET" || SKIP_PATH.test(req.path) || req.path.length > 200) return next();
    // Speculative loads are not visits.
    if (/prefetch|prerender/i.test(String(req.headers["sec-purpose"] || req.headers.purpose || ""))) return next();
    res.on("finish", () => {
      if (res.statusCode !== 200 || !/^text\/html/.test(String(res.getHeader("Content-Type") || ""))) return;
      record(req).catch((error) => console.error("traffic: not recorded:", error.message));
    });
    next();
  }

  return { middleware, record };
}

module.exports = { createTrafficCounter, classify, sourceOf, AI_BOTS };
