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
import { dirname, join, relative, resolve, sep } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const ASSETS = join(ROOT, "assets");
const require = createRequire(import.meta.url);
const serverModulePath = join(ROOT, "server.js");
const app = require(serverModulePath);

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

  let match = null;
  if (directory === "js") {
    match = fileName.match(/^(?:animations|media)\.([a-f0-9]{12})\.js$/i);
  } else if (directory === "css") {
    match = fileName.match(/^(?:case-motion|responsive)\.([a-f0-9]{12})\.css$/i);
  }
  if (!match) return false;

  const actual = createHash("sha256").update(readFileSync(filePath)).digest("hex").slice(0, 12);
  return match[1].toLowerCase() === actual;
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

  const queryProbe = await fetch(`${baseUrl}/assets/js/webfont.js?v=deadbeef`, {
    method: "HEAD",
  });
  const queryCache = cacheDirectives(queryProbe.headers.get("cache-control") || "");
  assert(queryProbe.ok, `query-string cache probe returned ${queryProbe.status}`);
  assert(!queryCache.has("immutable"), "a query string made an unversioned asset immutable");
  assert(queryCache.get("max-age") === "0", "query-string cache probe must use max-age=0");

  for (const pagePath of ["/", "/works", "/work/instructure", "/ai-integration", "/hu/ai-integracio"]) {
    const page = await fetch(`${baseUrl}${pagePath}`, { method: "HEAD" });
    const pageCache = cacheDirectives(page.headers.get("cache-control") || "");
    const contentSecurityPolicy = page.headers.get("content-security-policy") || "";
    assert(page.ok, `${pagePath} returned ${page.status}`);
    assert(!pageCache.has("immutable"), `${pagePath} is incorrectly immutable`);
    assert(pageCache.get("max-age") === "0", `${pagePath} must use max-age=0`);
    assert(pageCache.has("must-revalidate"), `${pagePath} must revalidate after a deploy`);
    assert(
      /connect-src\s+'self'\s+fonts\.googleapis\.com(?:;|$)/i.test(contentSecurityPolicy),
      `${pagePath} blocks the WebFont stylesheet request`
    );
  }

  const llms = await fetch(`${baseUrl}/llms.txt`);
  const llmsCache = cacheDirectives(llms.headers.get("cache-control") || "");
  assert(llms.ok, `/llms.txt returned ${llms.status}`);
  assert(/text\/plain/i.test(llms.headers.get("content-type") || ""), "/llms.txt is not text/plain");
  assert((await llms.text()).includes("Norbert Barna — Product VP Portfolio"), "/llms.txt content is incomplete");
  assert(llmsCache.get("max-age") === "0", "/llms.txt must revalidate after a deploy");

  for (const [legacyPath, expectedLocation] of [
    ["/ai-integration.html?utm_source=test", "/ai-integration?utm_source=test"],
    ["/ai-integration/", "/ai-integration"],
    ["/hu/ai-integracio.html", "/hu/ai-integracio"],
    ["/hu/ai-integracio/?utm_campaign=ai", "/hu/ai-integracio?utm_campaign=ai"],
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

  for (const notFoundPath of [
    "/404",
    "/404.html",
    "/contact",
    "/cv",
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

  const versionedMotionAssets = [
    ["js/animations.js", "js", "animations"],
    ["js/media.js", "js", "media"],
    ["css/case-motion.css", "css", "case-motion"],
    ["css/responsive.css", "css", "responsive"],
  ];

  for (const [sourcePath, directory, stem] of versionedMotionAssets) {
    const source = readFileSync(join(ASSETS, sourcePath));
    const version = createHash("sha256").update(source).digest("hex").slice(0, 12);
    const versionedUrl = `${baseUrl}/assets/${directory}/${stem}.${version}.${directory}`;
    const versioned = await fetch(versionedUrl, { method: "HEAD" });
    const versionedCache = cacheDirectives(versioned.headers.get("cache-control") || "");
    assert(versioned.ok, `${versionedUrl} returned ${versioned.status}`);
    assert(versionedCache.has("immutable"), `${versionedUrl} is not immutable`);
    assert(
      versionedCache.get("max-age") === "31536000",
      `${versionedUrl} does not have a one-year cache lifetime`
    );
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
