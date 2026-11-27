#!/usr/bin/env node
/**
 * Integration checks for production-facing Express behavior.
 * Mutable asset names must revalidate; only content-versioned files are
 * allowed to receive a one-year immutable cache policy.
 */
import { createHash } from "node:crypto";
import { once } from "node:events";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { createRequire } from "node:module";
import { urlOf, WRITING_PAGES } from "./service-pages.mjs";
import { dirname, join, relative, resolve, sep } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const ASSETS = join(ROOT, "assets");
const require = createRequire(import.meta.url);
const serverModulePath = join(ROOT, "server.js");
const app = require(serverModulePath);

// Canonical releases verified by check-motion and check-editorial-media.
// Keep this inventory independent of the server's filename classifier.
const RELEASE_SOURCES = [
  "js/animations.js", "js/media.js", "js/arrival.js", "js/hero-scene.js",
  "js/home-composition.js", "js/immersive-navigation.js", "js/case-opening.js",
  "js/story-motion.js", "css/case-motion.css", "css/responsive.css",
  "css/arrival.css", "css/home-composition.css", "css/case-opening.css",
  "css/editorial-sections.css", "css/compact-navigation.css", "css/project-index.css",
  "css/story.css", "js/ai-motion.js", "css/ai-integration.css", "css/fonts.css", "css/base.css", "css/components.css",
  "css/contact.css", "js/contact.js", "js/physics.js", "css/writing.css",
  // Written by build-writing.mjs from contact.js (proof of work) and article-comments.js.
  "js/comments.js",
];
// Font binaries are distributed once, under their digest-bearing names. Their
// manifest replaces the unhashed source/release pair used by authored CSS/JS.
const FONT_FAMILIES = [
  "fonts/inter-latin.woff2", "fonts/inter-latin-ext.woff2",
  "fonts/funnel-display-latin.woff2", "fonts/funnel-display-latin-ext.woff2",
];
const FONT_RELEASES = JSON.parse(readFileSync(join(ASSETS, "fonts/manifest.json"), "utf8")).fonts;
const approvedReleaseSources = new Set([...RELEASE_SOURCES, ...FONT_FAMILIES]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function allFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const filePath = join(directory, name);
    return statSync(filePath).isDirectory() ? allFiles(filePath) : [filePath];
  });
}

function encodeAssetPath(filePath) {
  return relative(ASSETS, filePath)
    .split(sep)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function assetPath(filePath) {
  return relative(ASSETS, filePath).split(sep).join("/");
}

// This intentionally does not import or duplicate the server classifier.
// A release is immutable only when it belongs to an approved family and the
// embedded token is the real SHA-256 prefix of the bytes being served.
function hasVerifiedReleaseDigest(filePath) {
  const [directory, fileName, extra] = assetPath(filePath).split("/");
  if (extra || !directory || !fileName) return false;

  const match = fileName.match(/^(.+)\.([a-f0-9]{12})\.(js|css|woff2)$/i);
  if (!match) return false;
  if (!approvedReleaseSources.has(`${directory}/${match[1]}.${match[3]}`)) return false;

  const actual = createHash("sha256").update(readFileSync(filePath)).digest("hex").slice(0, 12);
  return match[2].toLowerCase() === actual;
}

function cacheDirectives(header) {
  const directives = new Map();
  for (const part of header.toLowerCase().split(",")) {
    const [name, value] = part.trim().split("=", 2);
    if (name) directives.set(name, value ?? true);
  }
  return directives;
}

function rawGet(port, requestPath, headers = {}) {
  return new Promise((resolveResponse, rejectResponse) => {
    const request = httpRequest(
      {
        hostname: "127.0.0.1",
        port,
        path: requestPath,
        method: "GET",
        headers,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.once("end", () => {
          resolveResponse({
            statusCode: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );
    request.once("error", rejectResponse);
    request.end();
  });
}

const server = app.listen(0, "127.0.0.1");

try {
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object", "server did not expose a listening address");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const assetFiles = allFiles(ASSETS);
  let immutableAssetCount = 0;

  for (const filePath of assetFiles) {
    const assetUrl = `${baseUrl}/assets/${encodeAssetPath(filePath)}`;
    const response = await fetch(assetUrl, { method: "HEAD" });
    const cache = cacheDirectives(response.headers.get("cache-control") || "");
    const shouldBeImmutable = hasVerifiedReleaseDigest(filePath);
    assert(response.ok, `${assetUrl} returned ${response.status}`);
    // nosniff is sent on every response, so an AVIF must state its type.
    if (filePath.endsWith(".avif")) {
      assert(response.headers.get("content-type") === "image/avif", `${assetUrl} must be served as image/avif`);
    }

    if (shouldBeImmutable) {
      immutableAssetCount += 1;
      assert(cache.has("immutable"), `${assetUrl} is a verified release but is not immutable`);
      assert(cache.get("max-age") === "31536000", `${assetUrl} needs a one-year cache lifetime`);
    } else {
      assert(!cache.has("immutable"), `${assetUrl} is not output-content-hashed but is immutable`);
      assert(cache.get("max-age") === "0", `${assetUrl} must use max-age=0`);
      assert(cache.has("must-revalidate"), `${assetUrl} must revalidate`);
    }
  }

  assert(immutableAssetCount > 0, "no verified immutable release assets were found");

  const queryProbe = await fetch(`${baseUrl}/assets/js/navigation.js?v=deadbeef`, {
    method: "HEAD",
  });
  const queryCache = cacheDirectives(queryProbe.headers.get("cache-control") || "");
  assert(queryProbe.ok, `query-string cache probe returned ${queryProbe.status}`);
  assert(!queryCache.has("immutable"), "a query string made an unversioned asset immutable");
  assert(queryCache.get("max-age") === "0", "query-string cache probe must use max-age=0");

  for (const pagePath of ["/", "/works", "/about", "/work/instructure", "/ai-integration", "/web-development", "/hu/ai-tanacsadas-fejlesztes", "/hu/webfejlesztes", "/privacy", "/hu/adatvedelem",
    "/contact", "/hu/kapcsolat", "/hu", "/hu/munkak", "/hu/rolam", "/hu/munka/instructure",
    "/de", "/de/webentwicklung", "/de/ki-beratung-entwicklung", "/de/datenschutz", "/de/kontakt", "/de/arbeiten", "/de/arbeit/instructure", "/de/ueber-mich", ...WRITING_PAGES.map(urlOf)]) {
    const page = await fetch(`${baseUrl}${pagePath}`, { method: "HEAD" });
    const pageCache = cacheDirectives(page.headers.get("cache-control") || "");
    const contentSecurityPolicy = page.headers.get("content-security-policy") || "";
    assert(page.ok, `${pagePath} returned ${page.status}`);
    assert(!pageCache.has("immutable"), `${pagePath} is incorrectly immutable`);
    assert(pageCache.get("max-age") === "0", `${pagePath} must use max-age=0`);
    assert(pageCache.has("must-revalidate"), `${pagePath} must revalidate after a deploy`);
    assert(
      /connect-src\s+'self'\s+https:\/\/eu\.i\.posthog\.com(?:;|$)/i.test(contentSecurityPolicy),
      `${pagePath} must keep only the EU PostHog capture host`
    );
    assert(!contentSecurityPolicy.includes("eu-assets"), `${pagePath}: must not allow the PostHog JS SDK asset host`);
    // Cloudflare Turnstile (script + iframe) is allowed on the contact pages alone.
    const turnstilePage = ["/contact", "/hu/kapcsolat", "/de/kontakt"].includes(pagePath);
    assert(/script-src[^;]*https:\/\/challenges\.cloudflare\.com/.test(contentSecurityPolicy) === turnstilePage &&
      /frame-src https:\/\/challenges\.cloudflare\.com(?:;|$)/.test(contentSecurityPolicy) === turnstilePage,
      `${pagePath}: Turnstile hosts belong to the contact pages only`);
    assert(!/unsafe-(?:inline|eval)[^;]*;?/.test(contentSecurityPolicy.match(/script-src[^;]*/)?.[0] || ""), `${pagePath}: script-src stays hash-based`);
    assert(!/script-src[^;]*posthog/i.test(contentSecurityPolicy), `${pagePath}: PostHog must not be on script-src`);
  }

  const llms = await fetch(`${baseUrl}/llms.txt`);
  const llmsCache = cacheDirectives(llms.headers.get("cache-control") || "");
  assert(llms.ok, `/llms.txt returned ${llms.status}`);
  assert(/text\/plain/i.test(llms.headers.get("content-type") || ""), "/llms.txt is not text/plain");
  assert((await llms.text()).includes("# Norbert Barna, Product VP"), "/llms.txt content is incomplete");
  assert(llmsCache.get("max-age") === "0", "/llms.txt must revalidate after a deploy");

  // Search and Markdown for agents (lib/agent-search.js).
  const searchUrl = `${baseUrl}/.well-known/search`;
  const found = await fetch(`${searchUrl}?q=${encodeURIComponent("human in the loop AI patterns")}`);
  const foundBody = await found.text();
  assert(found.status === 200 && /^text\/markdown/.test(found.headers.get("content-type") || ""), "/.well-known/search must answer a query in Markdown");
  assert(foundBody.startsWith('# Search results for: "human in the loop AI patterns"'), "search results must open with the query");
  assert(/^## https:\/\/www\.barnanorbert\.com\/writing\/human-in-the-loop-ai \(score: 1\.000\)$/m.test(foundBody), "the human-in-the-loop article must lead its own query");
  assert((foundBody.match(/^## https:\/\//gm) || []).length <= 10, "search returns at most ten passages");
  assert(found.headers.get("cross-origin-resource-policy") === "cross-origin" && found.headers.get("access-control-allow-origin") === "*", "search results must be readable from any origin");
  assert(/noindex/.test(found.headers.get("x-robots-tag") || ""), "search results must not be indexed as pages");
  for (const [query, expectedPath] of [["mennyibe kerül egy weboldal", "/hu/irasok/ceges-weboldal-ara"], ["Was kostet eine Website", "/de/wissen/was-kostet-eine-website"], ["KYC onboarding banking", "/work/benker"]]) {
    const first = (await (await fetch(`${searchUrl}?q=${encodeURIComponent(query)}`)).text()).match(/^## (\S+) /m)?.[1];
    assert(first === `https://www.barnanorbert.com${expectedPath}`, `search "${query}" must lead with ${expectedPath}, got ${first}`);
  }
  const queryText = await fetch(searchUrl, { method: "QUERY", headers: { "content-type": "text/plain" }, body: "Was kostet eine Website" });
  assert(queryText.status === 200 && (await queryText.text()).includes("/de/wissen/was-kostet-eine-website"), "HTTP QUERY with a text body must search");
  const queryJson = await fetch(searchUrl, { method: "QUERY", headers: { "content-type": "application/json" }, body: JSON.stringify({ q: "KYC onboarding" }) });
  assert(queryJson.status === 200 && (await queryJson.text()).includes("/work/benker"), "HTTP QUERY with a JSON body must search");
  const nothing = await fetch(`${searchUrl}?q=xyzzyqwerty`);
  assert(nothing.status === 200 && (await nothing.text()).includes("No matching content"), "a query without matches is an empty result, not an error");
  assert((await fetch(searchUrl)).status === 400, "search without a query is a 400 with usage");
  assert((await fetch(searchUrl, { method: "POST", body: "x" })).status === 405, "search refuses methods that are not GET or QUERY");
  assert((await fetch(searchUrl, { method: "QUERY", body: "x".repeat(5000) })).status === 413, "search refuses an oversized QUERY body");
  assert((await fetch(`${baseUrl}/.well-known/security.txt`)).status === 404 && (await fetch(`${searchUrl}/x`)).status === 404, "only the search lives under /.well-known");
  const employer = await (await fetch(`${searchUrl}?q=${encodeURIComponent("web development company website")}`)).text();
  assert(!/<script|<div|aria-hidden/i.test(employer), "search results are Markdown, never page markup");

  for (const pagePath of ["/", "/hu/webfejlesztes", "/de/wissen/was-kostet-eine-website", "/work/benker", "/writing"]) {
    const markdown = await fetch(`${baseUrl}${pagePath}`, { headers: { accept: "text/markdown, text/html;q=0.9" } });
    const text = await markdown.text();
    assert(markdown.status === 200 && /^text\/markdown/.test(markdown.headers.get("content-type") || ""), `${pagePath}: Accept: text/markdown must return Markdown`);
    assert(text.startsWith("---\ntitle: ") && text.includes('  endpoint: "https://www.barnanorbert.com/.well-known/search?q={query}"'), `${pagePath}: Markdown opens with front matter that names the search`);
    assert(/^# \S/m.test(text) && !/<\/?(?:div|span|script|svg|section)\b/i.test(text), `${pagePath}: Markdown has a heading and no page markup`);
    assert(/\bAccept\b/i.test(markdown.headers.get("vary") || ""), `${pagePath}: Markdown response must vary on Accept`);
    const html = await fetch(`${baseUrl}${pagePath}`, { headers: { accept: "text/html,application/xhtml+xml,*/*;q=0.8" } });
    assert(/^text\/html/.test(html.headers.get("content-type") || "") && /\bAccept\b/i.test(html.headers.get("vary") || ""), `${pagePath}: browsers still get HTML, varying on Accept`);
    assert((await html.text()).includes('<meta content="https://www.barnanorbert.com/.well-known/search?q={query}" name="agent:endpoint"/>'), `${pagePath}: page advertises the search endpoint`);
  }
  const missingMarkdown = await fetch(`${baseUrl}/does-not-exist`, { headers: { accept: "text/markdown" } });
  assert(missingMarkdown.status === 404, "an unknown page asked for as Markdown is still a 404");
  const privateMarkdown = await fetch(`${baseUrl}/server.js`, { headers: { accept: "text/markdown" } });
  assert(privateMarkdown.status === 404, "private paths stay private when asked for as Markdown");

  const homeWithoutToken = await fetch(`${baseUrl}/`);
  assert(homeWithoutToken.ok, "homepage without GSC token did not return 200");
  assert(
    !/google-site-verification/i.test(await homeWithoutToken.text()),
    "empty GSC config must not invent a verification token"
  );

  const previousGsc = process.env.GOOGLE_SITE_VERIFICATION;
  const previousGscAlias = process.env.GSC_VERIFICATION;
  delete process.env.GSC_VERIFICATION;
  process.env.GOOGLE_SITE_VERIFICATION = "abcdefghijklmnopqrstuvwxyz0123456789abcd";
  try {
    const verified = await fetch(`${baseUrl}/`);
    const verifiedHtml = await verified.text();
    assert(verified.ok, "homepage with GSC token did not return 200");
    assert(
      verifiedHtml.includes(
        '<meta name="google-site-verification" content="abcdefghijklmnopqrstuvwxyz0123456789abcd"/>'
      ),
      "valid GSC token must be injected on the homepage"
    );
    const verifiedCache = cacheDirectives(verified.headers.get("cache-control") || "");
    assert(verifiedCache.get("max-age") === "0", "GSC homepage must revalidate");
    assert(verifiedCache.has("must-revalidate"), "GSC homepage must revalidate after a deploy");
  } finally {
    if (previousGsc === undefined) delete process.env.GOOGLE_SITE_VERIFICATION;
    else process.env.GOOGLE_SITE_VERIFICATION = previousGsc;
    if (previousGscAlias === undefined) delete process.env.GSC_VERIFICATION;
    else process.env.GSC_VERIFICATION = previousGscAlias;
  }

  process.env.GOOGLE_SITE_VERIFICATION = "REPLACE_WITH_GSC_TOKEN";
  try {
    const placeholder = await fetch(`${baseUrl}/`);
    assert(
      !/google-site-verification/i.test(await placeholder.text()),
      "placeholder GSC values must not be injected"
    );
  } finally {
    if (previousGsc === undefined) delete process.env.GOOGLE_SITE_VERIFICATION;
    else process.env.GOOGLE_SITE_VERIFICATION = previousGsc;
    if (previousGscAlias === undefined) delete process.env.GSC_VERIFICATION;
    else process.env.GSC_VERIFICATION = previousGscAlias;
  }

  for (const [legacyPath, expectedLocation] of [
    ["/about.html?utm_source=story", "/about?utm_source=story"],
    ["/about/", "/about"],
    ["/ai-integration.html?utm_source=test", "/ai-integration?utm_source=test"],
    ["/ai-integration/", "/ai-integration"],
    ["/privacy.html", "/privacy"],
    ["/hu/adatvedelem/", "/hu/adatvedelem"],
    ["/hu/ai-tanacsadas-fejlesztes.html", "/hu/ai-tanacsadas-fejlesztes"],
    ["/hu/ai-tanacsadas-fejlesztes/?utm_campaign=ai", "/hu/ai-tanacsadas-fejlesztes?utm_campaign=ai"],
    ["/hu/ai-integracio", "/hu/ai-tanacsadas-fejlesztes"],
    ["/hu/ai-integracio?utm_campaign=ai", "/hu/ai-tanacsadas-fejlesztes?utm_campaign=ai"],
    ["/hu/ai-integracio.html", "/hu/ai-tanacsadas-fejlesztes"],
    ["/hu/ai-integracio/", "/hu/ai-tanacsadas-fejlesztes"],
    ["/hu/webfejlesztes.html", "/hu/webfejlesztes"],
    ["/hu/webfejlesztes/", "/hu/webfejlesztes"],
    ["/web-development.html", "/web-development"],
    ["/de/", "/de"],
    ["/de/index.html?utm_source=de", "/de?utm_source=de"],
    ["/de/webentwicklung.html", "/de/webentwicklung"],
    ["/de/ki-beratung-entwicklung/?utm_campaign=ki", "/de/ki-beratung-entwicklung?utm_campaign=ki"],
    ["/de/datenschutz/", "/de/datenschutz"],
    ["/de/kontakt.html", "/de/kontakt"],
    ["/web-development/?utm_campaign=web", "/web-development?utm_campaign=web"],
    ["/favicon.ico", "/assets/icons/68f923d010d274634c966a6e_favicon.png"],
    ["/index", "/"],
    ["/index?utm_source=home", "/?utm_source=home"],
    ["/raiffeisen", "/work/raiffeisen"],
    ["/raiffeisen/?ref=old", "/work/raiffeisen?ref=old"],
    ["/instructure", "/work/instructure"],
    ["/instructure.html", "/work/instructure"],
    ["/bitpanda", "/work/bitpanda"],
    ["/benker", "/work/benker"],
    ["/sportsgambit", "/work/sportsgambit"],
    ["/kineticare", "/work/kineticare"],
    ["/onrobot", "/work/onrobot"],
    ["/works/?utm_source=portfolio", "/works?utm_source=portfolio"],
    ["/work/benker/?ref=case", "/work/benker?ref=case"],
    ["/work/raiffesen?utm_campaign=legacy", "/work/raiffeisen?utm_campaign=legacy"],
    ["/work/raiffesen/?utm_campaign=legacy", "/work/raiffeisen?utm_campaign=legacy"],
  ]) {
    const redirect = await fetch(`${baseUrl}${legacyPath}`, { redirect: "manual" });
    assert(redirect.status === 301, `${legacyPath} did not return a permanent redirect`);
    assert(redirect.headers.get("location") === expectedLocation, `${legacyPath} lost its canonical path or query`);
  }

  // Every canonical page in the sitemap has exactly one URL: its .html and
  // trailing-slash spellings permanently redirect there (no duplicate 200s).
  const sitemapXml = (await import("node:fs")).readFileSync(new URL("../sitemap.xml", import.meta.url), "utf8");
  const sitemapPaths = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((match) => new URL(match[1]).pathname).filter((pathname) => pathname !== "/");
  assert(sitemapPaths.length >= 25, "sitemap lists every canonical page");
  for (const pathname of sitemapPaths) {
    // /hu is served from hu/index.html, so its file spellings are the index ones.
    // /hu and the writing list pages are served from <dir>/index.html, so their index spellings redirect too.
    const variants = ["/hu", "/de"].includes(pathname) ? [`${pathname}/`, `${pathname}/index.html`, `${pathname}/index`] :
      ["/writing", "/hu/irasok", "/de/wissen"].includes(pathname) ? [`${pathname}.html`, `${pathname}/`, `${pathname}/index.html`, `${pathname}/index`] :
      [`${pathname}.html`, `${pathname}/`];
    for (const variant of variants) {
      const redirect = await fetch(`${baseUrl}${variant}?ref=check`, { redirect: "manual" });
      assert(redirect.status === 301, `${variant} must 301 to ${pathname}, got ${redirect.status}`);
      assert(redirect.headers.get("location") === `${pathname}?ref=check`, `${variant} must keep its query on ${pathname}`);
    }
    const canonical = await fetch(`${baseUrl}${pathname}`, { redirect: "manual" });
    assert(canonical.status === 200, `${pathname} must serve 200`);
  }

  // Writing feeds are RSS that revalidates; the Markdown sources are not served.
  for (const feedPath of WRITING_PAGES.filter((page) => page.endsWith("/index.html")).map((page) => `${urlOf(page)}/feed.xml`)) {
    const feed = await fetch(`${baseUrl}${feedPath}`);
    assert(feed.ok, `${feedPath} returned ${feed.status}`);
    assert(/^application\/rss\+xml/.test(feed.headers.get("content-type") || ""), `${feedPath} must be served as RSS`);
    assert(cacheDirectives(feed.headers.get("cache-control") || "").has("must-revalidate"), `${feedPath} must revalidate`);
    assert((await feed.text()).includes("<rss version=\"2.0\""), `${feedPath} is not an RSS 2.0 document`);
  }
  for (const sourcePath of ["/content/human-in-the-loop-ai.md", "/content/", "/Content/ceges-weboldal-ara.md"]) {
    const source = await fetch(`${baseUrl}${sourcePath}`, { redirect: "manual" });
    assert(source.status === 404, `${sourcePath} must not expose the writing sources (${source.status})`);
  }

  const apexRobots = await rawGet(address.port, "/robots.txt", {
    host: "barnanorbert.com",
  });
  assert(apexRobots.statusCode === 301, "apex robots.txt must catch-all redirect to www");
  assert(
    apexRobots.headers.location === "https://www.barnanorbert.com/robots.txt",
    "apex robots.txt must keep its path on www"
  );

  const apexWorks = await rawGet(address.port, "/works", {
    host: "barnanorbert.com",
  });
  assert(apexWorks.statusCode === 301, "apex must catch-all redirect to www without CANONICAL_REDIRECT");
  assert(
    apexWorks.headers.location === "https://www.barnanorbert.com/works",
    "apex /works must 301 to www /works, not homepage-only"
  );

  const apexWithoutFlag = await rawGet(address.port, "/raiffeisen?utm_source=apex", {
    host: "barnanorbert.com",
  });
  assert(apexWithoutFlag.statusCode === 301, "apex must redirect to www without CANONICAL_REDIRECT");
  assert(
    apexWithoutFlag.headers.location ===
      "https://www.barnanorbert.com/work/raiffeisen?utm_source=apex",
    "apex must canonicalize host and path in one hop without the flag"
  );

  const apexAbout = await rawGet(address.port, "/about.html?ref=story", {
    host: "barnanorbert.com",
  });
  assert(apexAbout.statusCode === 301, "apex About alias must redirect permanently");
  assert(
    apexAbout.headers.location === "https://www.barnanorbert.com/about?ref=story",
    "apex About alias must preserve the query and canonicalize host and path in one hop"
  );

  // Plain http on the canonical host lands on the https URL in a single hop.
  const plainHttp = await rawGet(address.port, "/about.html?ref=http", {
    host: "www.barnanorbert.com",
    "x-forwarded-proto": "http",
  });
  assert(plainHttp.statusCode === 301, "http on the canonical host must redirect to https");
  assert(plainHttp.headers.location === "https://www.barnanorbert.com/about?ref=http", "http redirect keeps path canonicalization and query");
  const secure = await rawGet(address.port, "/about", { host: "www.barnanorbert.com", "x-forwarded-proto": "https" });
  assert(secure.statusCode === 200, "https on the canonical host serves the page");

  const previousCanonicalRedirect = process.env.CANONICAL_REDIRECT;
  process.env.CANONICAL_REDIRECT = "1";
  delete require.cache[require.resolve(serverModulePath)];
  const canonicalApp = require(serverModulePath);
  const canonicalServer = canonicalApp.listen(0, "127.0.0.1");
  try {
    await once(canonicalServer, "listening");
    const canonicalAddress = canonicalServer.address();
    assert(canonicalAddress && typeof canonicalAddress === "object", "canonical server did not start");
    const canonicalBase = `http://127.0.0.1:${canonicalAddress.port}`;
    // WHATWG fetch protects the Host header in newer Node versions. Use the
    // low-level client so this test exercises the exact reverse-proxy input.
    const canonicalRedirect = await new Promise((resolveResponse, rejectResponse) => {
      const request = httpRequest(`${canonicalBase}/work/raiffesen/?utm_source=apex`, {
        method: "GET",
        headers: { host: "barnanorbert.com" },
      }, (response) => {
        response.resume();
        response.once("end", () => resolveResponse(response));
      });
      request.once("error", rejectResponse);
      request.end();
    });
    assert(canonicalRedirect.statusCode === 301, "apex legacy URL did not redirect permanently");
    assert(
      canonicalRedirect.headers.location ===
        "https://www.barnanorbert.com/work/raiffeisen?utm_source=apex",
      "apex legacy URL did not canonicalize host and path in one hop"
    );
  } finally {
    await new Promise((resolveClose, rejectClose) => {
      canonicalServer.close((error) => (error ? rejectClose(error) : resolveClose()));
    });
    if (previousCanonicalRedirect === undefined) delete process.env.CANONICAL_REDIRECT;
    else process.env.CANONICAL_REDIRECT = previousCanonicalRedirect;
    delete require.cache[require.resolve(serverModulePath)];
  }

  // The error document answers in the language of the request path
  // (2026-10-22): hu/404.html under /hu/..., de/404.html under /de/..., the
  // English one elsewhere, each with its own chrome and language links.
  for (const [path, lang, home] of [
    ["/does-not-exist", "en", "/"], ["/hu/nincs-ilyen-oldal", "hu", "/hu"], ["/de/gibt-es-nicht", "de", "/de"],
    ["/hu/munka/nincs", "hu", "/hu"], ["/de/arbeit/x/y", "de", "/de"], ["/work/", "en", "/"], ["/hungary", "en", "/"],
  ]) {
    const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    const body = await response.text();
    assert(response.status === 404, `${path} returned ${response.status} instead of 404`);
    assert(body.includes(`<html lang="${lang}">`), `${path} must answer with the ${lang} error document`);
    assert(/noindex,\s*follow/i.test(body), `${path}: the ${lang} error document must noindex`);
    assert(/id="primary-navigation"/.test(body) && /class="footer-nav"/.test(body), `${path}: the error document carries the site chrome`);
    assert(new RegExp(`<a class="footer-brand" href="${home.replace(/\//g, "\\/")}"`).test(body), `${path}: the error document links the ${lang} home`);
  }

  // A native form post (the page's script had not run) never reads the body
  // and never dead-ends: it answers the page at its "not sent" notice.
  for (const formPath of ["/contact", "/hu/kapcsolat", "/de/kontakt"]) {
    const response = await fetch(`${baseUrl}${formPath}`, {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "name=Ada&email=ada%40example.com&topic=ai&message=A+native+post+must+never+be+delivered",
    });
    assert(response.status === 303, `POST ${formPath} returned ${response.status} instead of 303`);
    assert(response.headers.get("location") === `${formPath}#contact-unsent`, `POST ${formPath} must land on the page's not-sent notice`);
    assert(/no-store/.test(response.headers.get("cache-control") || ""), `POST ${formPath} must not be stored`);
  }

  // Speculation Rules: every page names the rule set, the rule set is served
  // under the media type browsers require, and it only ever prefetches.
  for (const pagePath of ["/", "/hu", "/de/wissen", "/work/benker", "/does-not-exist"]) {
    const response = await fetch(`${baseUrl}${pagePath}`, { redirect: "manual" });
    await response.arrayBuffer();
    assert(response.headers.get("speculation-rules") === '"/assets/speculation-rules.json"', `${pagePath} must name the speculation rule set`);
  }
  for (const quietPath of ["/admin", "/assets/speculation-rules.json", "/api/contact/nope"]) {
    const response = await fetch(`${baseUrl}${quietPath}`, { redirect: "manual" });
    await response.arrayBuffer();
    assert(!response.headers.has("speculation-rules"), `${quietPath} must not name a speculation rule set`);
  }
  {
    const response = await fetch(`${baseUrl}/assets/speculation-rules.json`);
    const rules = await response.json();
    assert(response.status === 200, "the speculation rule set must be served");
    assert(/^application\/speculationrules\+json\b/.test(response.headers.get("content-type") || ""), "the speculation rule set needs the application/speculationrules+json media type");
    assert(cacheDirectives(response.headers.get("cache-control") || "").has("must-revalidate"), "the speculation rule set must revalidate");
    assert(Object.keys(rules).join() === "prefetch", "speculation rules may only prefetch: a prerender would run page scripts and analytics before the visit");
    const excluded = JSON.stringify(rules.prefetch.map((rule) => rule.where));
    for (const privatePath of ["/admin", "/admin/*", "/api/*"]) {
      assert(excluded.includes(`"${privatePath}"`), `speculation rules must exclude ${privatePath}`);
    }
    assert(rules.prefetch.every((rule) => rule.eagerness === "moderate" || rule.eagerness === "conservative"), "speculation rules must wait for a pointer signal");
  }

  for (const notFoundPath of [
    "/404",
    "/404.html",
    "/hu/404",
    "/hu/404.html",
    "/de/404",
    "/de/404.html",
    "/cv",
    "/lib/contact.js",
    "/lib/contact",
    "/api/contact/nope",
    "/definitely-not-a-real-page",
    "/tests/portfolio.spec.mjs",
    "/playwright.config.mjs",
  ]) {
    const response = await fetch(`${baseUrl}${notFoundPath}`, { redirect: "manual" });
    const cache = cacheDirectives(response.headers.get("cache-control") || "");
    const body = await response.text();
    assert(response.status === 404, `${notFoundPath} returned ${response.status} instead of 404`);
    assert(/text\/html/i.test(response.headers.get("content-type") || ""), `${notFoundPath} is not HTML`);
    assert(/noindex,\s*follow/i.test(body), `${notFoundPath} did not serve the noindex error document`);
    assert(cache.get("max-age") === "0", `${notFoundPath} must use max-age=0`);
    assert(cache.has("must-revalidate"), `${notFoundPath} must revalidate`);
  }

  for (const traversalPath of [
    "/assets/../server.js",
    "/assets/%2e%2e/server.js",
    "/foo/%2e%2e/server.js",
    "/assets/%2e%2e/package.json",
    "/assets/%2E%2E%2Fserver.js",
    "/assets/%2e%2e%5cserver.js",
  ]) {
    const response = await rawGet(address.port, traversalPath);
    assert(response.statusCode === 404, `${traversalPath} returned ${response.statusCode} instead of 404`);
    assert(
      /noindex,\s*follow/i.test(response.body),
      `${traversalPath} did not serve the noindex error document`
    );
  }

  for (const sourcePath of RELEASE_SOURCES) {
    const [directory, fileName] = sourcePath.split("/");
    const stem = fileName.slice(0, -(directory.length + 1));
    const source = readFileSync(join(ASSETS, sourcePath));
    const version = createHash("sha256").update(source).digest("hex").slice(0, 12);
    const versionedUrl = `${baseUrl}/assets/${directory}/${stem}.${version}.${directory}`;
    const versioned = await fetch(versionedUrl);
    const versionedCache = cacheDirectives(versioned.headers.get("cache-control") || "");
    assert(versioned.ok, `${versionedUrl} returned ${versioned.status}`);
    assert(Buffer.from(await versioned.arrayBuffer()).equals(source), `${versionedUrl} differs from its canonical source`);
    assert(versionedCache.has("immutable"), `${versionedUrl} is not immutable`);
    assert(
      versionedCache.get("max-age") === "31536000",
      `${versionedUrl} does not have a one-year cache lifetime`
    );
  }

  assert(FONT_RELEASES.length === FONT_FAMILIES.length, "font manifest must list the four supported subsets");
  const seenFonts = new Set();
  for (const font of FONT_RELEASES) {
    const sourceFamily = `fonts/${font.file.replace(/\.[a-f0-9]{12}(?=\.woff2$)/i, "")}`;
    assert(FONT_FAMILIES.includes(sourceFamily) && !seenFonts.has(sourceFamily), `${font.file}: unexpected or duplicate font subset`);
    seenFonts.add(sourceFamily);
    const bytes = readFileSync(join(ASSETS, "fonts", font.file));
    const digest = createHash("sha256").update(bytes).digest("hex");
    assert(digest === font.sha256 && bytes.length === font.bytes, `${font.file}: manifest must describe actual distributed bytes`);
    assert(hasVerifiedReleaseDigest(join(ASSETS, "fonts", font.file)), `${font.file}: filename must contain the actual digest`);
  }

  for (const inventedRelease of ["js/hero-scene.000000000000.js", "css/story.000000000000.css", "fonts/inter-latin.000000000000.woff2"]) {
    const response = await fetch(`${baseUrl}/assets/${inventedRelease}`, { method: "HEAD" });
    const cache = cacheDirectives(response.headers.get("cache-control") || "");
    assert(response.status === 404, `${inventedRelease} unexpectedly exists`);
    assert(!cache.has("immutable"), `${inventedRelease}: an invented hash must not cache a missing release`);
    assert(cache.get("max-age") === "0" && cache.has("must-revalidate"), `${inventedRelease} must revalidate`);
  }

  // Security headers (2026-11-15). Every public response carries the same
  // companion headers; the page policy enforces Trusted Types everywhere but
  // on the three contact pages, where Cloudflare's Turnstile script runs and
  // the same rule is report-only.
  const REPORT_PATH = "/api/csp-report";
  const TRUSTED_TYPES_REPORT_ONLY = `require-trusted-types-for 'script'; trusted-types contact-turnstile; report-uri ${REPORT_PATH}; report-to csp`;
  const directivesOf = (policy) => policy.split(";").map((directive) => directive.trim()).filter(Boolean);
  for (const pagePath of ["/", "/hu", "/de", "/works", "/work/benker", "/writing", "/contact", "/hu/kapcsolat", "/de/kontakt", "/does-not-exist"]) {
    const page = await fetch(`${baseUrl}${pagePath}`, { redirect: "manual" });
    await page.arrayBuffer();
    const header = (name) => page.headers.get(name) || "";
    const directives = directivesOf(header("content-security-policy"));
    const turnstilePage = ["/contact", "/hu/kapcsolat", "/de/kontakt"].includes(pagePath);
    assert(header("strict-transport-security") === "max-age=63072000; includeSubDomains; preload", `${pagePath}: HSTS must be two years, includeSubDomains, preload`);
    assert(header("x-content-type-options") === "nosniff", `${pagePath}: nosniff is missing`);
    assert(header("x-frame-options") === "SAMEORIGIN", `${pagePath}: X-Frame-Options must match frame-ancestors 'self'`);
    assert(header("referrer-policy") === "strict-origin-when-cross-origin", `${pagePath}: Referrer-Policy changed`);
    assert(header("cross-origin-opener-policy") === "same-origin", `${pagePath}: COOP changed`);
    assert(header("cross-origin-resource-policy") === "same-origin", `${pagePath}: a page is a same-origin resource`);
    for (const feature of ["camera", "geolocation", "microphone", "payment", "usb"]) {
      assert(header("permissions-policy").includes(`${feature}=()`), `${pagePath}: Permissions-Policy must deny ${feature}`);
    }
    assert(header("reporting-endpoints") === `csp="${REPORT_PATH}", default="${REPORT_PATH}"`, `${pagePath}: Reporting-Endpoints must name the first-party report endpoint`);
    for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'none'", "frame-ancestors 'self'", "form-action 'self'", `report-uri ${REPORT_PATH}`, "report-to csp"]) {
      assert(directives.includes(directive), `${pagePath}: CSP must carry "${directive}"`);
    }
    assert(/^script-src 'self' 'report-sample' /.test(directives.find((directive) => directive.startsWith("script-src")) || ""), `${pagePath}: script-src must ask for report samples`);
    // Plain http exists on localhost only; there an upgrade would break every asset.
    assert(!directives.includes("upgrade-insecure-requests"), `${pagePath}: localhost must not upgrade requests`);
    if (turnstilePage) {
      assert(!directives.some((directive) => /trusted-types/.test(directive)), `${pagePath}: Trusted Types must not be enforced where Turnstile runs`);
      assert(header("content-security-policy-report-only") === TRUSTED_TYPES_REPORT_ONLY, `${pagePath}: Trusted Types must be report-only with the contact-turnstile policy`);
    } else {
      assert(directives.includes("require-trusted-types-for 'script'") && directives.includes("trusted-types 'none'"), `${pagePath}: Trusted Types must be enforced with no policy allowed`);
      assert(!page.headers.has("content-security-policy-report-only"), `${pagePath}: no report-only policy outside the contact pages`);
    }
  }
  {
    const live = await rawGet(address.port, "/about", { host: "www.barnanorbert.com", "x-forwarded-proto": "https" });
    assert(directivesOf(live.headers["content-security-policy"] || "").includes("upgrade-insecure-requests"), "the production host must upgrade insecure requests");
    const apex = await rawGet(address.port, "/about", { host: "barnanorbert.com", "x-forwarded-proto": "https" });
    assert(apex.headers["strict-transport-security"] === "max-age=63072000; includeSubDomains; preload", "the apex redirect must carry HSTS (the preload list reads it there)");
  }

  // Cross-Origin-Resource-Policy per path class: only what other sites are
  // meant to load (social previews, icons, crawler files, feeds) is open.
  const indexNowKey = readdirSync(ROOT).find((name) => /^[a-f0-9]{32}\.txt$/.test(name));
  assert(indexNowKey, "the IndexNow key file is missing");
  const immutableScript = assetFiles.map(assetPath).find((name) => /^js\/animations\.[a-f0-9]{12}\.js$/.test(name));
  const immutableStyle = assetFiles.map(assetPath).find((name) => /^css\/responsive\.[a-f0-9]{12}\.css$/.test(name));
  for (const [resourcePath, expected] of [
    ["/assets/images/og/forest-olive-folds.jpg", "cross-origin"],
    ["/assets/images/og/writing/human-in-the-loop-ai.jpg", "cross-origin"],
    ["/assets/icons/68f923d010d274634c966a6e_favicon.png", "cross-origin"],
    ["/assets/icons/68f9237058b27cb0adfe0e4b_webclip.svg", "cross-origin"],
    ["/favicon.ico", "cross-origin"],
    ["/robots.txt", "cross-origin"],
    ["/llms.txt", "cross-origin"],
    ["/.well-known/search?q=website", "cross-origin"],
    ["/sitemap.xml", "cross-origin"],
    [`/${indexNowKey}`, "cross-origin"],
    ["/writing/feed.xml", "cross-origin"],
    ["/hu/irasok/feed.xml", "cross-origin"],
    ["/de/wissen/feed.xml", "cross-origin"],
    [`/assets/${immutableScript}`, "same-origin"],
    [`/assets/${immutableStyle}`, "same-origin"],
    [`/assets/fonts/${FONT_RELEASES[0].file}`, "same-origin"],
    ["/assets/js/vendor/gsap.min.js", "same-origin"],
    ["/assets/images/hero-final.webp", "same-origin"],
    ["/assets/speculation-rules.json", "same-origin"],
    ["/api/contact/challenge", "same-origin"],
    ["/api/comments/challenge", "same-origin"],
    ["/admin", "same-origin"],
    ["/admin/api/session", "same-origin"],
  ]) {
    const response = await fetch(`${baseUrl}${resourcePath}`, { redirect: "manual" });
    await response.arrayBuffer();
    // The admin API answers 503 until it is configured; the header is there regardless.
    assert(response.status < 400 || resourcePath.startsWith("/admin/api/"), `${resourcePath} returned ${response.status}`);
    assert(response.headers.get("cross-origin-resource-policy") === expected, `${resourcePath}: Cross-Origin-Resource-Policy must be ${expected}`);
  }
  // Every image a page offers to other sites (og:image, twitter:image) must
  // sit in a path class that other origins may load.
  const serverSourceText = readFileSync(serverModulePath, "utf8");
  const crossOriginPattern = new RegExp(/const CROSS_ORIGIN_RESOURCE =\s*\/(.+)\/;/.exec(serverSourceText)[1]);
  const htmlFiles = allFiles(ROOT).filter((file) => file.endsWith(".html") && !/[\\/](?:node_modules|admin|admin-ui|lib|docs|tests|test-results|playwright-report)[\\/]/.test(file));
  assert(htmlFiles.length >= 70, "the page inventory for the header checks is incomplete");
  let previewImages = 0;
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    for (const [tag] of html.matchAll(/<meta\b[^>]*(?:og:image|twitter:image)"[^>]*>/g)) {
      const content = /content="(https?:[^"]+)"/.exec(tag)?.[1];
      if (!content || /(?:og:image:|twitter:image:)/.test(tag)) continue;
      previewImages += 1;
      assert(crossOriginPattern.test(new URL(content).pathname), `${relative(ROOT, file)}: preview image ${content} is not in a cross-origin path class`);
    }
  }
  assert(previewImages >= 100, "preview images were not found in the pages");

  // The report endpoint: both report media types are accepted without an
  // Origin header, each report becomes one log line without query strings,
  // and nothing that is not a small report gets in.
  {
    const lines = [];
    const originalLog = console.log;
    console.log = (line) => lines.push(String(line));
    const post = (type, body) => fetch(`${baseUrl}${REPORT_PATH}`, { method: "POST", headers: { "Content-Type": type }, body });
    try {
      const batch = await post("application/reports+json", JSON.stringify([{
        type: "csp-violation", age: 10, url: "https://www.barnanorbert.com/contact?email=ada%40example.com", user_agent: "Mozilla/5.0 (X11) Chrome/141.0.0.0 Safari/537.36",
        body: {
          documentURL: "https://www.barnanorbert.com/contact?email=ada%40example.com#sent", blockedURL: "trusted-types-sink", effectiveDirective: "require-trusted-types-for",
          disposition: "report", sourceFile: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", lineNumber: 1, columnNumber: 2345,
          sample: `Element innerHTML|<div>\n${"x".repeat(300)}`, referrer: "https://referrer.example/secret", originalPolicy: "require-trusted-types-for 'script'",
        },
      }, { type: "deprecation", url: "https://www.barnanorbert.com/?token=abc", body: { id: "UnloadHandler", message: "ignored" } }]));
      assert(batch.status === 204 && (await batch.text()) === "", "a Reporting API batch must be answered 204 with no body");
      assert(batch.headers.get("cache-control") === "no-store", "report answers must not be cached");
      const legacy = await post("application/csp-report", JSON.stringify({ "csp-report": {
        "document-uri": "https://www.barnanorbert.com/hu?utm_source=x", "violated-directive": "script-src-elem", "blocked-uri": "inline", "line-number": 12, "script-sample": "alert(1)",
      } }));
      assert(legacy.status === 204, "a legacy report-uri report must be answered 204");
      assert(lines.length === 3 && lines.every((line) => /^csp-report \{.*\}$/.test(line) && !line.includes("\n")), "each report must become one csp-report log line");
      const [first, deprecation, old] = lines.map((line) => JSON.parse(line.slice("csp-report ".length)));
      assert(first.page === "https://www.barnanorbert.com/contact" && first.source === "https://challenges.cloudflare.com/turnstile/v0/api.js", "report URLs must lose their query and fragment");
      assert(first.directive === "require-trusted-types-for" && first.blocked === "trusted-types-sink" && first.disposition === "report" && first.line === 1 && first.column === 2345, "the report summary keeps what is needed to debug");
      assert(first.sample.length <= 80 && !/[\n\r]/.test(first.sample) && first.browser === "Chrome/141", "samples are cut and the browser is reduced to name and major version");
      assert(deprecation.type === "deprecation" && deprecation.id === "UnloadHandler" && deprecation.page === "https://www.barnanorbert.com/", "other report types are summarized without their query");
      assert(old.directive === "script-src-elem" && old.blocked === "inline" && old.page === "https://www.barnanorbert.com/hu" && old.sample === "alert(1)", "the legacy report is summarized the same way");
      assert(!lines.join("").includes("ada") && !lines.join("").includes("secret") && !lines.join("").includes("token"), "query strings, referrers and addresses must never be logged");

      const oversized = await post("application/csp-report", JSON.stringify({ "csp-report": { "script-sample": "x".repeat(20000) } }));
      assert(oversized.status === 413 && (await oversized.text()) === "", "an oversized report must be refused with 413 and no body");
      const malformed = await post("application/reports+json", "{not json");
      assert(malformed.status === 400, "a malformed report must be refused with 400");
      const wrongType = await post("application/json", "{}");
      assert(wrongType.status === 415, "only the two report media types are accepted");
      const odd = await post("application/reports+json", JSON.stringify([null, 7, "text", { type: 5 }, { body: "x" }, []]));
      assert(odd.status === 204, "reports with unexpected shapes are dropped, not errors");
      assert(lines.length === 3, "rejected and shapeless reports must not be logged");
      const read = await fetch(`${baseUrl}${REPORT_PATH}`);
      await read.arrayBuffer();
      assert(read.status === 404, "the report endpoint only answers POST");

      // One client cannot fill the log: the per-client window closes.
      let limited = false;
      for (let attempt = 0; attempt < 40 && !limited; attempt += 1) {
        const response = await post("application/csp-report", "{}");
        await response.arrayBuffer();
        limited = response.status === 429;
      }
      assert(limited, "the report endpoint must rate-limit a client");
    } finally {
      console.log = originalLog;
    }
  }

  console.log(
    `OK: HTML and ${assetFiles.length - immutableAssetCount} mutable assets revalidate; ` +
      `${immutableAssetCount} verified release assets are immutable; direct error URLs return 404`
  );
} finally {
  await new Promise((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
}

// Script CSP is hash-based (2026-10-06). Every executable inline script on a
// served page must carry a hash in server.js, or the browser blocks it and the
// feature fails silently (for example the home opening's layout decision).
{
  const { createHash } = await import("node:crypto");
  const { readFileSync: readText, readdirSync: listDir, existsSync: exists } = await import("node:fs");
  const serverSource = readText(new URL("../server.js", import.meta.url), "utf8");
  const root = new URL("../", import.meta.url);
  const pages = [];
  for (const dir of ["", "work/", "hu/", "hu/munka/", "de/", "de/arbeit/"]) {
    const url = new URL(dir, root);
    if (!exists(url)) continue;
    for (const name of listDir(url)) if (name.endsWith(".html")) pages.push(dir + name);
  }
  const missing = new Set();
  for (const page of pages) {
    const html = readText(new URL(page, root), "utf8");
    for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc=/.test(attrs) || /application\/ld\+json/.test(attrs)) continue;
      const hash = `'sha256-${createHash("sha256").update(body).digest("base64")}'`;
      if (!serverSource.includes(hash)) missing.add(`${page}: ${hash}`);
    }
  }
  if (missing.size) {
    console.error(`FAIL: inline scripts without a CSP hash in server.js:\n${[...missing].join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log("OK: every executable inline script has its CSP hash");
  }
}

// Trusted Types (2026-11-15). The page policy refuses HTML and script strings
// at DOM sinks, so a first-party script that writes one breaks its feature.
// Fail here instead: no script a page loads may contain a string-to-code
// sink, and the only Trusted Types policy is the one server.js allows.
{
  const { readFileSync: readText, readdirSync: listDir, statSync: stat } = await import("node:fs");
  const root = new URL("../", import.meta.url);
  const pages = [];
  (function collect(dir) {
    for (const name of listDir(new URL(dir, root))) {
      if (dir === "" && /^(?:node_modules|admin|admin-ui|lib|docs|tests|scripts|content|tools|indicators|assets|test-results|playwright-report|blob-report)$/.test(name)) continue;
      if (name.startsWith(".")) continue;
      if (stat(new URL(dir + name, root)).isDirectory()) collect(`${dir}${name}/`);
      else if (name.endsWith(".html")) pages.push(dir + name);
    }
  })("");
  const scripts = new Set();
  const failures = [];
  for (const page of pages) {
    const html = readText(new URL(page, root), "utf8");
    for (const [, src] of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi)) {
      const resolved = new URL(src, new URL(page, "https://site.invalid/"));
      if (resolved.origin !== "https://site.invalid") failures.push(`${page}: third-party script tag ${src}`);
      else scripts.add(resolved.pathname.slice(1));
    }
    if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(html.replace(/<script\b[\s\S]*?<\/script>/gi, ""))) failures.push(`${page}: inline event handler attribute`);
    if (/\b(?:href|src|action)\s*=\s*["']?\s*javascript:/i.test(html)) failures.push(`${page}: javascript: URL`);
  }
  // The editable sources ship as hashed copies; check both spellings.
  for (const script of [...scripts]) scripts.add(script.replace(/\.[a-f0-9]{12}\.js$/, ".js"));
  const SINKS = [
    [/\.(?:innerHTML|outerHTML)\b/, "innerHTML/outerHTML"],
    [/\binsertAdjacentHTML\b/, "insertAdjacentHTML"],
    [/\bdocument\.write(?:ln)?\s*\(/, "document.write"],
    [/\b(?:DOMParser|createContextualFragment|setHTMLUnsafe|parseHTMLUnsafe)\b/, "HTML string parser"],
    [/\bsrcdoc\b/, "iframe srcdoc"],
    [/\beval\s*\(/, "eval"],
    [/\bnew\s+Function\b|[^.\w]Function\s*\(\s*["'`]/, "Function constructor"],
    [/\bset(?:Timeout|Interval)\s*\(\s*["'`]/, "timer with a string"],
    [/setAttribute\(\s*["'`]on/i, "event handler attribute"],
    [/["'`]\s*javascript:/i, "javascript: URL"],
    [/\b(?:Shared)?Worker\s*\(|\bimportScripts\s*\(/, "worker script URL"],
  ];
  const policies = [];
  let checked = 0;
  for (const script of [...scripts].sort()) {
    let source;
    try {
      source = readText(new URL(script, root), "utf8");
    } catch {
      failures.push(`${script}: referenced by a page but missing`);
      continue;
    }
    checked += 1;
    const vendor = script.startsWith("assets/js/vendor/");
    for (const [pattern, label] of SINKS) {
      const hit = pattern.exec(source);
      if (hit) failures.push(`${script}: ${label} (${JSON.stringify(source.slice(Math.max(0, hit.index - 30), hit.index + 50))})`);
    }
    for (const [, name] of source.matchAll(/createPolicy\(\s*["'`]([^"'`]+)["'`]/g)) policies.push(`${name} in ${script.replace(/\.[a-f0-9]{12}\.js$/, ".js")}`);
    if (/createPolicy\(\s*[^"'`\s]/.test(source)) failures.push(`${script}: Trusted Types policy with a computed name`);
    // A script element is only ever created to load Turnstile, through the policy.
    const createsScript = /createElement\(\s*["'`]script["'`]\s*\)/i.test(source);
    if (createsScript && (vendor || !/assets\/js\/contact(?:\.[a-f0-9]{12})?\.js$/.test(script))) failures.push(`${script}: creates a script element`);
    if (createsScript && !/script\.src = turnstileScriptUrl\(\);/.test(source)) failures.push(`${script}: the injected script URL must come from the contact-turnstile policy`);
    if (/\bscript\.(?:text|textContent|innerText)\s*=/.test(source)) failures.push(`${script}: writes script text`);
  }
  if (checked < 15) failures.push(`only ${checked} page scripts were found; the inventory is incomplete`);
  const uniquePolicies = [...new Set(policies)].sort().join("; ");
  if (uniquePolicies !== "contact-turnstile in assets/js/contact.js") failures.push(`unexpected Trusted Types policies: ${uniquePolicies || "none"}`);
  const contact = readText(new URL("assets/js/contact.js", root), "utf8");
  if (!/createScriptURL: function \(url\) \{\s*if \(url !== TURNSTILE\.script\) throw new TypeError/.test(contact)) failures.push("assets/js/contact.js: the contact-turnstile policy must accept the Turnstile URL only");
  if (/create(?:HTML|Script):/.test(contact)) failures.push("assets/js/contact.js: the contact-turnstile policy may only create script URLs");
  const serverSource = readText(new URL("server.js", root), "utf8");
  if (!serverSource.includes('`trusted-types ${turnstile ? "contact-turnstile" : "\'none\'"}`')) failures.push("server.js: the trusted-types allow-list must be contact-turnstile on the contact pages and 'none' elsewhere");
  if (failures.length) {
    console.error(`FAIL: Trusted Types readiness:\n${failures.join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${checked} page scripts contain no string-to-code sink; one Trusted Types policy (contact-turnstile)`);
  }
}
