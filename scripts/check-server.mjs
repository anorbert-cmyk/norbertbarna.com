#!/usr/bin/env node
/**
 * Integration checks for production-facing Express behavior.
 * Mutable asset names must revalidate; only content-versioned files are
 * allowed to receive a one-year immutable cache policy.
 */
import { createHash } from "node:crypto";
import { once } from "node:events";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const ASSETS = join(ROOT, "assets");
const CONTENT_HASHED_ASSET = /(?:^|[._-])[a-f0-9]{8,}(?=[._-]|$)/i;
const require = createRequire(import.meta.url);
const app = require(join(ROOT, "server.js"));

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

function cacheDirectives(header) {
  const directives = new Map();
  for (const part of header.toLowerCase().split(",")) {
    const [name, value] = part.trim().split("=", 2);
    if (name) directives.set(name, value ?? true);
  }
  return directives;
}

const server = app.listen(0, "127.0.0.1");

try {
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object", "server did not expose a listening address");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const mutableAssets = allFiles(ASSETS).filter(
    (filePath) => !CONTENT_HASHED_ASSET.test(basename(filePath))
  );

  for (const filePath of mutableAssets) {
    const assetUrl = `${baseUrl}/assets/${encodeAssetPath(filePath)}`;
    const response = await fetch(assetUrl, { method: "HEAD" });
    const cache = cacheDirectives(response.headers.get("cache-control") || "");
    assert(response.ok, `${assetUrl} returned ${response.status}`);
    assert(!cache.has("immutable"), `${assetUrl} is incorrectly immutable`);
    assert(cache.get("max-age") === "0", `${assetUrl} must use max-age=0`);
    assert(cache.has("must-revalidate"), `${assetUrl} must revalidate`);
  }

  const queryProbe = await fetch(`${baseUrl}/assets/js/webfont.js?v=deadbeef`, {
    method: "HEAD",
  });
  const queryCache = cacheDirectives(queryProbe.headers.get("cache-control") || "");
  assert(queryProbe.ok, `query-string cache probe returned ${queryProbe.status}`);
  assert(!queryCache.has("immutable"), "a query string made an unversioned asset immutable");
  assert(queryCache.get("max-age") === "0", "query-string cache probe must use max-age=0");

  const versionedMotionAssets = [
    ["js/animations.js", "js", "animations"],
    ["css/case-motion.css", "css", "case-motion"],
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
    `OK: ${mutableAssets.length} mutable assets revalidate; ${versionedMotionAssets.length} versioned motion assets are immutable`
  );
} finally {
  await new Promise((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
}
