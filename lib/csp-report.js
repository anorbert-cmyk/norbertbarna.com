// Browser violation reports for the security headers. Public API:
//   POST /api/csp-report
//     application/reports+json   Reporting API batches (Reporting-Endpoints, report-to)
//     application/csp-report     the legacy single report (report-uri)
//
// The endpoint answers 204 and writes one compact line per report to stdout
// (Railway logs). It stores nothing, sets no cookie and needs no Origin
// header: browsers post reports out of band, without one. A report is
// untrusted input, so only known fields are kept, URLs lose their query and
// fragment, and every value is cut to a fixed length. No address, cookie,
// referrer or full user-agent string is logged.
const express = require("express");
const { createLimiter, clientAddress } = require("./contact");

const MINUTE = 60 * 1000;
const BODY_LIMIT = "16kb";
const MAX_REPORTS_PER_POST = 10;
const REPORT_TYPES = ["application/reports+json", "application/csp-report"];
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g;

function text(value, max) {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const cleaned = String(value).replace(CONTROL_CHARS, " ").trim();
  return cleaned ? cleaned.slice(0, max) : undefined;
}

// Scheme, host and path only. Keywords the browser sends in place of a URL
// ("inline", "eval", "trusted-types-sink", "data") pass through as they are.
function place(value) {
  const raw = text(value, 2048);
  if (!raw) return undefined;
  if (/^[a-z][a-z0-9-]*$/i.test(raw)) return raw.slice(0, 40);
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return url.protocol.slice(0, 20);
    return `${url.origin}${url.pathname}`.slice(0, 200);
  } catch {
    return "invalid";
  }
}

function count(value) {
  return Number.isInteger(value) && value >= 0 && value < 1e7 ? value : undefined;
}

// Chrome, Firefox or Safari and the major version: enough to tell an old
// browser's false positive from a real regression.
function browser(userAgent) {
  const match = /\b(Edg|OPR|Firefox|Chrome|Version)\/(\d{1,4})/.exec(String(userAgent || ""));
  if (!match) return undefined;
  return `${match[1] === "Version" ? "Safari" : match[1]}/${match[2]}`;
}

function summarize(report, userAgent) {
  if (!report || typeof report !== "object" || Array.isArray(report)) return null;
  // Legacy shape: { "csp-report": { "violated-directive": ... } }.
  const legacy = report["csp-report"];
  if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) {
    return {
      type: "csp-violation",
      disposition: text(legacy.disposition, 10),
      directive: text(legacy["effective-directive"] || legacy["violated-directive"], 60),
      blocked: place(legacy["blocked-uri"]),
      page: place(legacy["document-uri"]),
      source: place(legacy["source-file"]),
      line: count(legacy["line-number"]),
      column: count(legacy["column-number"]),
      sample: text(legacy["script-sample"], 80),
      browser: browser(userAgent),
    };
  }
  const type = typeof report.type === "string" && /^[a-z][a-z0-9-]{0,39}$/.test(report.type) ? report.type : null;
  if (!type) return null;
  const body = report.body && typeof report.body === "object" && !Array.isArray(report.body) ? report.body : {};
  if (type !== "csp-violation") {
    // Deprecation, intervention and crash reports reach the "default" endpoint.
    return { type, id: text(body.id, 60), page: place(report.url), source: place(body.sourceFile), line: count(body.lineNumber), browser: browser(report.user_agent || userAgent) };
  }
  return {
    type,
    disposition: text(body.disposition, 10),
    directive: text(body.effectiveDirective, 60),
    blocked: place(body.blockedURL),
    page: place(body.documentURL || report.url),
    source: place(body.sourceFile),
    line: count(body.lineNumber),
    column: count(body.columnNumber),
    sample: text(body.sample, 80),
    browser: browser(report.user_agent || userAgent),
  };
}

function createCspReportRouter({ now = () => Date.now(), log = (line) => console.log(line) } = {}) {
  const router = express.Router();
  // One page load with a broken policy can post a handful of batches; a
  // client that keeps going, or a flood from many clients, is dropped so the
  // log stays readable.
  const clientLimiter = createLimiter(30, 5 * MINUTE);
  const globalLimiter = createLimiter(600, 60 * MINUTE);
  setInterval(() => {
    clientLimiter.prune(now());
    globalLimiter.prune(now());
  }, 5 * MINUTE).unref();

  router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex");
    next();
  });

  router.post(
    "/",
    (req, res, next) => {
      if (!REPORT_TYPES.some((type) => req.is(type))) return res.status(415).end();
      if (!clientLimiter.take(clientAddress(req), now()) || !globalLimiter.take("all", now())) return res.status(429).end();
      next();
    },
    // Raw bytes: a malformed report must not reach a JSON parser that throws
    // into the site's error handler.
    express.raw({ type: REPORT_TYPES, limit: BODY_LIMIT }),
    (req, res) => {
      let parsed;
      try {
        parsed = JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "");
      } catch {
        return res.status(400).end();
      }
      const reports = (Array.isArray(parsed) ? parsed : [parsed]).slice(0, MAX_REPORTS_PER_POST);
      for (const report of reports) {
        try {
          const summary = summarize(report, req.headers["user-agent"]);
          if (summary) log(`csp-report ${JSON.stringify(summary)}`);
        } catch {
          // A report that cannot be summarized is dropped, never an error.
        }
      }
      res.status(204).end();
    }
  );

  // Oversized or unreadable bodies end here, without a body and without the
  // site's error document.
  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, next) => {
    const status = err && Number.isInteger(err.status) && err.status >= 400 && err.status < 500 ? err.status : 400;
    if (!res.headersSent) res.status(status).end();
  });

  return router;
}

module.exports = { createCspReportRouter, summarize, REPORT_TYPES };
