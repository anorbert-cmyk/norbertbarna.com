const express = require("express");
const compression = require("compression");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

// Enable gzip compression
app.use(compression());

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "interest-cohort=()");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      // scheme-less hosts so both the http dev server and https prod match;
      // data: fonts are embedded in the Webflow CSS
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "font-src 'self' fonts.gstatic.com data:",
      "img-src 'self' data:",
      "media-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
    ].join("; ")
  );
  next();
});

// Redirects: legacy .html URLs -> canonical clean URLs, plus the fixed
// /work/raiffesen misspelling. Keeps one canonical URL per page.
const REDIRECTS = {
  "/index.html": "/",
  "/works.html": "/works",
  "/work/raiffesen": "/work/raiffeisen",
  "/work/raiffesen.html": "/work/raiffeisen",
};
for (const slug of ["benker", "bitpanda", "instructure", "onrobot", "raiffeisen", "sportsgambit"]) {
  REDIRECTS[`/work/${slug}.html`] = `/work/${slug}`;
}
app.use((req, res, next) => {
  const target = REDIRECTS[req.path];
  if (target) return res.redirect(301, target);
  next();
});

// Cache static assets for 1 year (filenames are content-hashed or immutable)
app.use(
  "/assets",
  express.static(path.join(__dirname, "assets"), {
    maxAge: "1y",
    immutable: true,
  })
);

// Serve pages; extensions:["html"] maps clean URLs (/works, /work/benker)
// onto the .html files, so no custom path handling is needed.
app.use(
  express.static(__dirname, {
    extensions: ["html"],
    maxAge: "1h",
  })
);

// Anything unmatched is a 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "404.html"), (err) => {
    if (err && !res.headersSent) res.status(404).send("Page not found");
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Portfolio running on http://localhost:${PORT}`);
});
