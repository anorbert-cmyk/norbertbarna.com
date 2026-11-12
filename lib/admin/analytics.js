// Visitor analytics for the admin, read from PostHog (EU project 265707) with
// HogQL. The browser never talks to PostHog's query API and never sees the
// key: the admin asks this server, which caches each answer for ten minutes.
//
// Only consenting visitors are measured (the site's consent banner gates
// analytics.js), so every number here is a floor, not a census.
//
// Environment:
//   POSTHOG_PERSONAL_API_KEY  personal API key with the "Query: read" scope,
//                             limited to project 265707
const PROJECT_ID = 265707;
const HOST = "https://eu.posthog.com";
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();

const analyticsConfigured = () => /^phx_[A-Za-z0-9]{20,}$/.test(String(process.env.POSTHOG_PERSONAL_API_KEY || "").trim());

async function hogql(query, fetchImpl = fetch) {
  const response = await fetchImpl(`${HOST}/api/projects/${PROJECT_ID}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${String(process.env.POSTHOG_PERSONAL_API_KEY).trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const error = new Error(`PostHog query answered ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  return data.results || [];
}

// Language from the path: the event's own page_language predates /de.
const LANG = "multiIf(startsWith(properties.$pathname, '/hu'), 'hu', startsWith(properties.$pathname, '/de'), 'de', 'en')";
const BASE = (days) => `timestamp >= now() - INTERVAL ${days} DAY AND coalesce(properties.is_test, false) != true AND properties.$host = 'www.barnanorbert.com'`;

async function loadAnalytics(days, fetchImpl = fetch) {
  const range = [7, 30, 90].includes(days) ? days : 30;
  const hit = cache.get(range);
  if (hit && hit.at > Date.now() - CACHE_MS) return hit.data;
  const base = BASE(range);
  const [totals, previous, daily, pages, languages, sources, devices, clicks, clickPages] = await Promise.all([
    hogql(`SELECT countIf(event = '$pageview'), uniqIf(properties.$session_id, event = '$pageview'), countIf(event = 'contact_intent'), countIf(event = 'contact_form_submitted') FROM events WHERE ${base}`, fetchImpl),
    hogql(`SELECT countIf(event = '$pageview'), uniqIf(properties.$session_id, event = '$pageview'), countIf(event = 'contact_intent'), countIf(event = 'contact_form_submitted') FROM events WHERE timestamp >= now() - INTERVAL ${range * 2} DAY AND timestamp < now() - INTERVAL ${range} DAY AND coalesce(properties.is_test, false) != true AND properties.$host = 'www.barnanorbert.com'`, fetchImpl),
    hogql(`SELECT toDate(timestamp) AS day, count(), uniq(properties.$session_id) FROM events WHERE event = '$pageview' AND ${base} GROUP BY day ORDER BY day`, fetchImpl),
    hogql(`SELECT properties.$pathname AS path, count() AS views, uniq(properties.$session_id) AS visitors FROM events WHERE event = '$pageview' AND ${base} GROUP BY path ORDER BY views DESC LIMIT 200`, fetchImpl),
    hogql(`SELECT ${LANG} AS lang, count(), uniq(properties.$session_id) FROM events WHERE event = '$pageview' AND ${base} GROUP BY lang ORDER BY 2 DESC`, fetchImpl),
    hogql(`SELECT coalesce(properties.acquisition_channel, 'unknown') AS channel, coalesce(properties.acquisition_source, '') AS source, uniq(properties.$session_id) AS visitors FROM events WHERE event = '$pageview' AND ${base} GROUP BY channel, source ORDER BY visitors DESC LIMIT 25`, fetchImpl),
    hogql(`SELECT coalesce(properties.$device_type, 'unknown') AS device, uniq(properties.$session_id) FROM events WHERE event = '$pageview' AND ${base} GROUP BY device ORDER BY 2 DESC`, fetchImpl),
    hogql(`SELECT coalesce(properties.cta_location, 'unknown') AS location, coalesce(properties.cta_id, '') AS cta, count() FROM events WHERE event = 'contact_intent' AND ${base} GROUP BY location, cta ORDER BY 3 DESC LIMIT 25`, fetchImpl),
    hogql(`SELECT properties.$pathname AS path, count() FROM events WHERE event = 'contact_intent' AND ${base} GROUP BY path ORDER BY 2 DESC LIMIT 50`, fetchImpl),
  ]);
  const shape = (row) => ({ pageviews: Number(row?.[0] || 0), visitors: Number(row?.[1] || 0), contactClicks: Number(row?.[2] || 0), contactForms: Number(row?.[3] || 0) });
  const data = {
    days: range,
    generatedAt: new Date().toISOString(),
    totals: shape(totals[0]),
    previous: shape(previous[0]),
    daily: daily.map(([day, views, visitors]) => ({ day: String(day).slice(0, 10), pageviews: Number(views), visitors: Number(visitors) })),
    pages: pages.map(([path, views, visitors]) => ({ path: String(path || ""), pageviews: Number(views), visitors: Number(visitors) })),
    languages: languages.map(([lang, views, visitors]) => ({ lang, pageviews: Number(views), visitors: Number(visitors) })),
    sources: sources.map(([channel, source, visitors]) => ({ channel, source, visitors: Number(visitors) })),
    devices: devices.map(([device, visitors]) => ({ device, visitors: Number(visitors) })),
    clicks: clicks.map(([location, cta, count]) => ({ location, cta, count: Number(count) })),
    clickPages: clickPages.map(([path, count]) => ({ path: String(path || ""), count: Number(count) })),
  };
  cache.set(range, { at: Date.now(), data });
  return data;
}

// Google Search Console, synced into PostHog's warehouse (tables
// bn_gscgooglesearchconsole_search_analytics_by_*). Position is weighted by
// impressions; aliases differ from column names on purpose (HogQL rejects an
// alias that shadows a column inside an aggregate).
const GSC = "bn_gscgooglesearchconsole_search_analytics_by";
const searchCache = new Map();
async function loadSearch(days, fetchImpl = fetch) {
  const range = [7, 30, 90].includes(days) ? days : 30;
  const hit = searchCache.get(range);
  if (hit && hit.at > Date.now() - CACHE_MS) return hit.data;
  const where = `date >= today() - INTERVAL ${range} DAY AND search_type = 'web'`;
  const pos = "sum(position * impressions) / nullIf(sum(impressions), 0)";
  const [daily, pages, queries, queryPages] = await Promise.all([
    hogql(`SELECT date AS d, sum(clicks) AS c, sum(impressions) AS i, ${pos} AS p FROM ${GSC}_date WHERE ${where} GROUP BY d ORDER BY d`, fetchImpl),
    hogql(`SELECT page AS pg, sum(clicks) AS c, sum(impressions) AS i, ${pos} AS p FROM ${GSC}_page WHERE ${where} GROUP BY pg ORDER BY i DESC LIMIT 300`, fetchImpl),
    hogql(`SELECT query AS q, sum(clicks) AS c, sum(impressions) AS i, ${pos} AS p FROM ${GSC}_query WHERE ${where} GROUP BY q ORDER BY i DESC LIMIT 100`, fetchImpl),
    hogql(`SELECT page AS pg, query AS q, sum(clicks) AS c, sum(impressions) AS i, ${pos} AS p FROM ${GSC}_query_page WHERE ${where} GROUP BY pg, q ORDER BY i DESC LIMIT 1000`, fetchImpl),
  ]);
  const pathOf = (url) => String(url || "").replace(/^https?:\/\/[^/]+/, "") || "/";
  const round = (value) => (value === null || value === undefined ? null : Math.round(Number(value) * 10) / 10);
  const data = {
    days: range,
    generatedAt: new Date().toISOString(),
    totals: { clicks: daily.reduce((sum, row) => sum + Number(row[1]), 0), impressions: daily.reduce((sum, row) => sum + Number(row[2]), 0) },
    daily: daily.map(([day, clicks, impressions, position]) => ({ day: String(day).slice(0, 10), clicks: Number(clicks), impressions: Number(impressions), position: round(position) })),
    pages: pages.map(([page, clicks, impressions, position]) => ({ path: pathOf(page), clicks: Number(clicks), impressions: Number(impressions), position: round(position) })),
    queries: queries.map(([query, clicks, impressions, position]) => ({ query, clicks: Number(clicks), impressions: Number(impressions), position: round(position) })),
    queryPages: queryPages.map(([page, query, clicks, impressions, position]) => ({ path: pathOf(page), query, clicks: Number(clicks), impressions: Number(impressions), position: round(position) })),
  };
  searchCache.set(range, { at: Date.now(), data });
  return data;
}

module.exports = { analyticsConfigured, loadAnalytics, loadSearch, PROJECT_ID };
