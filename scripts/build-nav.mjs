#!/usr/bin/env node
/**
 * Writes the shared primary navigation and footer link columns into every
 * static page from scripts/site-chrome.mjs (the generated writing pages get
 * theirs from scripts/build-writing.mjs, which runs after this).
 *
 *   npm run build:nav                 write the pages
 *   node scripts/build-nav.mjs --check  fail if any page is stale (npm test)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, loadArticles, writingLanguageLinks } from "./writing-content.mjs";
import { STATIC_PAGES, applyChrome, pairsOf } from "./site-chrome.mjs";

const CHECK = process.argv.includes("--check");
const articles = loadArticles();
const writingLinks = writingLanguageLinks(articles);
const stale = [];
for (const [page, { kind, current }] of Object.entries(STATIC_PAGES)) {
  const file = join(ROOT, page);
  const html = readFileSync(file, "utf8");
  const next = applyChrome(html, { page, kind, current, pairs: pairsOf(page, writingLinks), articles });
  if (next === html) continue;
  if (CHECK) stale.push(page);
  else writeFileSync(file, next);
}
if (CHECK && stale.length) {
  for (const page of stale) console.error(`FAIL: ${page} navigation or footer columns are out of date; run npm run build:nav`);
  process.exit(1);
}
console.log(CHECK ? `OK: navigation and footer columns match site-chrome.mjs on ${Object.keys(STATIC_PAGES).length} pages` : `Wrote navigation on ${Object.keys(STATIC_PAGES).length} pages`);
