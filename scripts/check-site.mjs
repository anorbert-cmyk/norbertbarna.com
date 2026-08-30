#!/usr/bin/env node
/**
 * Static site sanity checks, run by `npm test` and CI.
 * Verifies SEO invariants (one H1, unique title/description, canonical,
 * valid JSON-LD) and that every local link/asset reference resolves.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PAGES = [
  "index.html",
  "works.html",
  "404.html",
  ...readdirSync(join(ROOT, "work")).filter((f) => f.endsWith(".html")).map((f) => `work/${f}`),
];

const CLEAN_URLS = { "/": "index.html", "/works": "works.html" };
for (const f of readdirSync(join(ROOT, "work"))) {
  if (f.endsWith(".html")) CLEAN_URLS[`/work/${f.replace(".html", "")}`] = `work/${f}`;
}

const animationsSource = readFileSync(join(ROOT, "assets/js/animations.js"));
const animationsVersion = createHash("sha256").update(animationsSource).digest("hex").slice(0, 12);
const animationsFile = `animations.${animationsVersion}.js`;
const versionedAnimationsPath = join(ROOT, "assets/js", animationsFile);

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`FAIL: ${msg}`);
};

const titles = new Map();
const descriptions = new Map();

if (!existsSync(versionedAnimationsPath)) {
  fail(`missing versioned custom animation asset: assets/js/${animationsFile}`);
} else if (!readFileSync(versionedAnimationsPath).equals(animationsSource)) {
  fail(`assets/js/${animationsFile} does not match assets/js/animations.js`);
}

for (const page of PAGES) {
  const html = readFileSync(join(ROOT, page), "utf8");
  const is404 = page === "404.html";

  const h1s = html.match(/<h1\b/g) || [];
  if (h1s.length !== 1) fail(`${page}: expected exactly 1 <h1>, found ${h1s.length}`);

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  if (!title) fail(`${page}: missing <title>`);
  else if (titles.has(title)) fail(`${page}: duplicate title (also on ${titles.get(title)})`);
  else titles.set(title, page);

  const desc = html.match(/<meta content="([^"]*)" name="description"\/>/)?.[1];
  if (!desc) fail(`${page}: missing meta description`);
  else if (descriptions.has(desc)) fail(`${page}: duplicate description (also on ${descriptions.get(desc)})`);
  else descriptions.set(desc, page);

  if (!is404 && !html.includes('rel="canonical"')) fail(`${page}: missing canonical`);
  if (/cdnjs\.cloudflare\.com|unpkg\.com|cdn\.jsdelivr\.net/.test(html))
    fail(`${page}: references an external JS CDN (should be self-hosted)`);
  if (/href="[^"]*raiffesen[^"]*"/.test(html)) fail(`${page}: links to misspelled raiffesen URL`);
  if (!is404) {
    const animationScripts = [
      ...html.matchAll(/<script[^>]*src="([^"]*assets\/js\/animations[^"]*)"[^>]*><\/script>/g),
    ];
    const expectedSrc = `${page.startsWith("work/") ? "../" : ""}assets/js/${animationsFile}`;
    if (animationScripts.length !== 1) {
      fail(`${page}: expected exactly one versioned custom animation script`);
    } else if (animationScripts[0][1] !== expectedSrc) {
      fail(`${page}: expected custom animation script ${expectedSrc}, found ${animationScripts[0][1]}`);
    }
  }

  // JSON-LD must exist on content pages and must parse
  const ldBlocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)];
  if (!is404 && ldBlocks.length === 0) fail(`${page}: no JSON-LD structured data`);
  for (const [, block] of ldBlocks) {
    try {
      JSON.parse(block);
    } catch (e) {
      fail(`${page}: invalid JSON-LD (${e.message})`);
    }
  }

  // Every local reference must resolve to a real file (not a directory):
  // href/src, srcset candidates, Webflow video data attributes, inline url()
  const refs = [];
  for (const [, attr, url] of html.matchAll(/(href|src)="([^"]+)"/g)) refs.push([attr, url]);
  for (const [, list] of html.matchAll(/srcset="([^"]+)"/g))
    for (const cand of list.split(",")) refs.push(["srcset", cand.trim().split(/\s+/)[0]]);
  for (const [, list] of html.matchAll(/data-video-urls="([^"]+)"/g))
    for (const u of list.split(",")) refs.push(["data-video-urls", u.trim()]);
  for (const [, u] of html.matchAll(/data-poster-url="([^"]+)"/g)) refs.push(["data-poster-url", u]);
  for (const [, , u] of html.matchAll(/url\((["']?)([^"')]+)\1\)/g)) refs.push(["url()", u]);
  for (const [attr, url] of refs) {
    if (!url || /^(https?:|mailto:|tel:|#|data:)/.test(url)) continue;
    const bare = url.split("#")[0].split("?")[0];
    if (bare === "") continue;
    let target;
    if (bare.startsWith("/")) {
      target = CLEAN_URLS[bare] ?? bare.slice(1);
    } else {
      target = join(dirname(page), bare);
    }
    const st = statSync(join(ROOT, target), { throwIfNoEntry: false });
    if (!st || !st.isFile()) fail(`${page}: broken ${attr} -> ${url}`);
  }
}

// sitemap URLs must map to real pages
const sitemap = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
for (const [, loc] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const path = new URL(loc).pathname.replace(/\/$/, "") || "/";
  const file = CLEAN_URLS[path];
  if (!file || !existsSync(join(ROOT, file))) fail(`sitemap.xml: ${loc} does not resolve to a page`);
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log(`OK: ${PAGES.length} pages checked, all invariants hold`);
