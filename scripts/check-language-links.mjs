#!/usr/bin/env node
/**
 * A page keeps its reader in the page's language (owner request, 2026-10-22:
 * "if the page is German, everything is German"). Every internal link of a
 * page, in the menu, the footer, the body or a CTA, must lead to a page of the
 * same language. The only exceptions are the explicit language switches: the
 * language menu (a.lang-switch) and an inline "This page in English" link that
 * names its language with matching hreflang and lang attributes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONTENT_PAGES, ERROR_PAGES, languageOf } from "./service-pages.mjs";
import { ROOT } from "./writing-content.mjs";

const ORIGIN = /^https?:\/\/(?:www\.)?barnanorbert\.com/;
const urlLanguage = (path) => /^\/hu(?:\/|$)/.test(path) ? "hu" : /^\/de(?:\/|$)/.test(path) ? "de" : "en";
const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

let failures = 0;
let links = 0;
const PAGES = [...CONTENT_PAGES, ...ERROR_PAGES];
for (const page of PAGES) {
  const lang = languageOf(page);
  const html = readFileSync(join(ROOT, page), "utf8");
  if (!html.includes(`<html lang="${lang}"`)) {
    failures++;
    console.error(`FAIL: ${page}: <html lang> must be ${lang}`);
  }
  for (const [tag] of html.matchAll(/<a\b[^>]*>/g)) {
    let href = attribute(tag, "href");
    if (!href) continue;
    if (ORIGIN.test(href)) href = href.replace(ORIGIN, "") || "/";
    else if (/^(?:[a-z]+:|#|\/\/)/i.test(href)) continue;
    if (!href.startsWith("/")) href = new URL(href, `https://x/${page}`).pathname;
    const path = href.split(/[?#]/)[0];
    if (!path || /^\/(?:assets|api)\//.test(path) || /\.(?:xml|txt|pdf|jpe?g|png|svg|webp)$/.test(path)) continue;
    links++;
    const target = urlLanguage(path);
    if (target === lang) continue;
    const hreflang = attribute(tag, "hreflang");
    const switchLink = /\bclass="[^"]*\blang-switch\b/.test(tag) || (hreflang === target && attribute(tag, "lang") === target);
    if (switchLink) continue;
    failures++;
    console.error(`FAIL: ${page} (${lang}) links ${href} (${target}); keep the reader in ${lang} or mark an explicit language switch with hreflang and lang`);
  }
}
if (failures) {
  console.error(`\n${failures} cross-language link(s)`);
  process.exit(1);
}
console.log(`OK: ${links} internal links on ${PAGES.length} pages stay in their page's language`);
