const express = require("express");
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const { createContactRouter } = require("./lib/contact");

const GOOGLE_SITE_VERIFICATION = "";
const GSC_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;
const GSC_PLACEHOLDER = /replace_with|placeholder|example_token|your_gsc|changeme/i;

function googleSiteVerificationToken() {
  const token = String(
    process.env.GOOGLE_SITE_VERIFICATION ||
      process.env.GSC_VERIFICATION ||
      GOOGLE_SITE_VERIFICATION ||
      ""
  ).trim();
  if (!GSC_TOKEN_PATTERN.test(token) || GSC_PLACEHOLDER.test(token)) return "";
  return token;
}

function injectGoogleSiteVerification(html) {
  const token = googleSiteVerificationToken();
  if (!token || /name=["']google-site-verification["']/i.test(html)) return html;
  return html.replace(
    /<meta charset="utf-8"\s*\/>/i,
    `<meta charset="utf-8"/>\n<meta name="google-site-verification" content="${token}"/>`
  );
}

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

// Enable gzip compression
app.use(compression());

const TURNSTILE_PAGES = new Set(["/contact", "/hu/kapcsolat"]);

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // The site uses no sensor, camera, payment or ad-measurement API; deny them
  // all so a future third-party script cannot opt in silently.
  res.setHeader(
    "Permissions-Policy",
    "accelerometer=(), browsing-topics=(), camera=(), geolocation=(), gyroscope=(), interest-cohort=(), magnetometer=(), microphone=(), payment=(), usb=()"
  );
  // No popup or OAuth flow needs an opener; isolate the browsing context group.
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  // The contact pages alone load Cloudflare Turnstile (script and iframe).
  const turnstile = TURNSTILE_PAGES.has(req.path);
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // Exactly two executable inline scripts exist: the Webflow w-mod touch
      // class setter (first script on every page except About and 404) and the
      // home mast morph gate inside .home-mast in index.html. Hash them so no
      // other inline script can run. JSON-LD blocks are data, not scripts, and
      // need no hash. check-server must fail when either body changes.
      `script-src 'self' 'sha256-mjdgHR9aXy+6OwAGlNS/XgNcYG1Uhd2U4pl8vi7+XCY=' 'sha256-ajNAYd+0yNgPcpVjs2eysG1wKi43JcdHSYQTNWQc3WE='${turnstile ? " https://challenges.cloudflare.com" : ""}`,
      // Inline style attributes and GSAP-driven styles need 'unsafe-inline';
      // fonts are self-hosted (assets/fonts) and the Webflow CSS still embeds
      // data: fonts. Google Fonts is no longer referenced by any page.
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data:",
      "media-src 'self'",
      "connect-src 'self' https://eu.i.posthog.com",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      // Cloudflare Turnstile runs on the two contact pages only.
      ...(turnstile ? ["frame-src https://challenges.cloudflare.com"] : []),
    ].join("; ")
  );
  next();
});

// One canonical URL per page. The same map is used by both host and path
// canonicalization so an apex + legacy request never needs two redirects.
const WORK_SLUGS = ["benker", "bitpanda", "instructure", "kineticare", "onrobot", "raiffeisen", "sportsgambit"];
const REDIRECTS = {
  "/index.html": "/",
  "/index": "/",
  "/favicon.ico": "/assets/icons/68f923d010d274634c966a6e_favicon.png",
  "/works.html": "/works",
  "/works/": "/works",
  "/about.html": "/about",
  "/about/": "/about",
  "/ai-integration.html": "/ai-integration",
  "/ai-integration/": "/ai-integration",
  "/hu/ai-integracio.html": "/hu/ai-integracio",
  "/hu/ai-integracio/": "/hu/ai-integracio",
  "/privacy.html": "/privacy",
  "/privacy/": "/privacy",
  "/hu/adatvedelem.html": "/hu/adatvedelem",
  "/hu/adatvedelem/": "/hu/adatvedelem",
  "/work/raiffesen": "/work/raiffeisen",
  "/work/raiffesen/": "/work/raiffeisen",
  "/work/raiffesen.html": "/work/raiffeisen",
};
// Pages added with the Hungarian mirror and the contact form (2026-10-06)
// need the same .html and trailing-slash variants as every other page.
for (const page of ["/contact", "/hu/kapcsolat", "/hu/munkak", "/hu/rolam", ...WORK_SLUGS.map((slug) => `/hu/munka/${slug}`)]) {
  REDIRECTS[`${page}.html`] = page;
  REDIRECTS[`${page}/`] = page;
}
REDIRECTS["/hu/"] = "/hu";
REDIRECTS["/hu/index"] = "/hu";
REDIRECTS["/hu/index.html"] = "/hu";
for (const slug of WORK_SLUGS) {
  REDIRECTS[`/work/${slug}.html`] = `/work/${slug}`;
  REDIRECTS[`/work/${slug}/`] = `/work/${slug}`;
  REDIRECTS[`/${slug}`] = `/work/${slug}`;
  REDIRECTS[`/${slug}/`] = `/work/${slug}`;
  REDIRECTS[`/${slug}.html`] = `/work/${slug}`;
}

function querySuffix(req) {
  const queryIndex = req.originalUrl.indexOf("?");
  return queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : "";
}

// Canonical host: www.barnanorbert.com. Apex always 301s to www (any path,
// not homepage-only). Railway preview hosts stay on *.up.railway.app unless
// CANONICAL_REDIRECT=1. Localhost never redirects.
const CANONICAL_HOST = "www.barnanorbert.com";

function redirectToCanonical(req, res) {
  const pathName = REDIRECTS[req.path] || req.path;
  return res.redirect(301, `https://${CANONICAL_HOST}${pathName}${querySuffix(req)}`);
}

app.use((req, res, next) => {
  const host = req.hostname;
  if (host === CANONICAL_HOST || host === "localhost" || host === "127.0.0.1") {
    return next();
  }
  if (host === "barnanorbert.com") {
    return redirectToCanonical(req, res);
  }
  if (process.env.CANONICAL_REDIRECT === "1" && host.endsWith(".up.railway.app")) {
    return redirectToCanonical(req, res);
  }
  next();
});

// Redirects: legacy .html URLs, /index, and bare /{slug} → /work/{slug}.
// Also the fixed /work/raiffesen misspelling. One canonical URL per page.
app.use((req, res, next) => {
  const target = REDIRECTS[req.path];
  if (target) {
    return res.redirect(301, `${target}${querySuffix(req)}`);
  }
  next();
});

// The page mount below serves the repo root, so explicitly refuse paths that
// are deployment internals rather than site content (server source, manifests,
// docs, dotfiles). Decode first: express.static decodes percent-encoding when
// resolving, so the filter must see the same path it would serve.
const PRIVATE_PATH =
  /^\/(?:\.|node_modules(?:\/|$)|docs(?:\/|$)|scripts(?:\/|$)|tests(?:\/|$)|test-results(?:\/|$)|playwright-report(?:\/|$)|blob-report(?:\/|$)|indicators(?:\/|$)|server\.js$|playwright\.config\.mjs$|package(?:-lock)?\.json$|railway\.json$|nixpacks\.toml$|dockerfile$|claude\.md$|readme\.md$|design\.md$|agents\.md$|tools(?:\/|$)|lib(?:\/|$))/i;
app.use((req, res, next) => {
  let decoded;
  try {
    decoded = decodeURIComponent(req.path);
  } catch {
    return res.status(400).send("Bad request");
  }
  const slashPath = decoded.replaceAll("\\", "/");
  if (slashPath.includes("\0") || /(?:^|\/)\.{1,2}(?:\/|$)/.test(slashPath)) {
    return sendNotFound(res);
  }
  const normalizedPath = path.posix.normalize(slashPath);
  if (PRIVATE_PATH.test(normalizedPath)) return sendNotFound(res);
  next();
});

// Contact form: proof-of-work challenge and the Resend relay. Mounted after
// the private-path filter so /api can never expose repository files.
app.use("/api/contact", createContactRouter());

// A native form post (no JavaScript) must never put a message in a URL or a
// log: answer the page itself without reading the body.
app.post(["/contact", "/hu/kapcsolat"], (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.redirect(303, req.path);
});

// Only release files whose names contain the first 12 characters of their
// SHA-256 digest are immutable. check-motion and check-editorial-media verify
// these release families; check-server independently verifies every digest. Webflow
// object IDs and generated source-image hashes are not output-content hashes,
// so those assets must revalidate after a deployment.
const ASSET_ROOT = path.join(__dirname, "assets");
const CONTENT_HASHED_ASSET =
  /^(?:js\/(?:animations|media|arrival|hero-scene|home-composition|immersive-navigation|case-opening|story-motion|ai-motion|contact)\.[a-f0-9]{12}\.js|css\/(?:case-motion|responsive|arrival|home-composition|case-opening|editorial-sections|compact-navigation|project-index|story|ai-integration|fonts|contact)\.[a-f0-9]{12}\.css|fonts\/(?:inter|funnel-display)-latin(?:-ext)?\.[a-f0-9]{12}\.woff2)$/i;

function isContentHashedAsset(filePath) {
  const relativePath = path.relative(ASSET_ROOT, filePath).split(path.sep).join("/");
  return !relativePath.startsWith("../") && CONTENT_HASHED_ASSET.test(relativePath);
}

app.use(
  "/assets",
  express.static(ASSET_ROOT, {
    setHeaders(res, filePath) {
      if (isContentHashedAsset(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      }
    },
  })
);

// The error document itself must never become a successful, indexable page.
app.use((req, res, next) => {
  if (req.path === "/404" || req.path === "/404.html") return sendNotFound(res);
  next();
});

app.get("/", (req, res, next) => {
  if (!googleSiteVerificationToken()) return next();
  fs.readFile(path.join(__dirname, "index.html"), "utf8", (err, html) => {
    if (err) return next(err);
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.type("html").send(injectGoogleSiteVerification(html));
  });
});

// The Hungarian home lives at hu/index.html. express.static only tries the
// .html extension when a path is missing, and /hu is a directory, so route it.
app.get("/hu", (req, res, next) => {
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.sendFile(path.join(__dirname, "hu", "index.html"), (err) => {
    if (err) next(err.status === 404 || err.code === "ENOENT" ? undefined : err);
  });
});

// Serve pages; extensions:["html"] maps clean URLs (/works, /work/benker)
// onto the .html files, so no custom path handling is needed.
app.use(
  express.static(__dirname, {
    extensions: ["html"],
    // A bare directory path (/work, /hu) must not 301 to a trailing-slash
    // URL that then 404s; fall through to the error document in one hop.
    redirect: false,
    maxAge: 0,
    setHeaders(res, filePath) {
      if (path.extname(filePath).toLowerCase() === ".html") {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      }
    },
  })
);

// Anything unmatched is a 404
function sendNotFound(res) {
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.status(404).sendFile(path.join(__dirname, "404.html"), (err) => {
    if (err && !res.headersSent) res.status(404).send("Page not found");
  });
}
app.use((req, res) => sendNotFound(res));

// Express's default error handler echoes a stack trace unless NODE_ENV is
// production. Keep failures generic; the header middleware already ran.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err && Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status === 404) return sendNotFound(res);
  res.setHeader("Cache-Control", "no-store");
  res.status(status).type("text").send(status >= 500 ? "Internal server error" : "Request failed");
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Portfolio running on http://localhost:${PORT}`);
  });
}

module.exports = app;
