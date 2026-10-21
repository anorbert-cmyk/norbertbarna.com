#!/usr/bin/env node
// Client acquisition contracts: readable offers, equivalent languages, honest entities.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EXTENDED_SERVICE_PAGES, SERVICE_PAGES, SERVICE_PAIRS } from "./service-pages.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://www.barnanorbert.com";
const home = readFileSync(join(root, "index.html"), "utf8");
const route = (file) => `/${file.replace(/\.html$/, "")}`;
const attr = (tag, key) => tag.match(new RegExp(`\\b${key}="([^"]*)"`, "i"))?.[1];
const text = (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const flatten = (value) => !value || typeof value !== "object" ? [] :
  [...(value["@type"] ? [value] : []), ...Object.values(value).flatMap(flatten)];

for (const file of SERVICE_PAGES) {
  const html = readFileSync(join(root, file), "utf8");
  const url = `${origin}/${file.replace(/\.html$/, "")}`;
  const language = file.startsWith("hu/") ? "hu" : "en";
  const pair = SERVICE_PAIRS[file];
  const english = language === "en" ? file : pair;
  const hungarian = language === "hu" ? file : pair;
  const body = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)?.[0] || "";
  const h1 = text(body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
  assert.equal(attr(html.match(/<html\b[^>]*>/i)?.[0] || "", "lang"), language, `${file}: document language`);
  assert(/<head>\s*<meta charset="utf-8"\/>/.test(html) && /href="\/assets\/css\/fonts\.[a-f0-9]{12}\.css"/.test(html), `${file}: charset first and the self-hosted fonts stylesheet`);
  assert(h1 && (file.includes("webfejlesztes") ? /weboldal készítés/i.test(h1) : /AI/i.test(h1)), `${file}: visible service subject`);
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => tag);
  const translations = links.filter(tag => attr(tag, "rel") === "alternate" && attr(tag, "hreflang"));
  if (pair) {
    const alternates = { en: origin + route(english), hu: origin + route(hungarian), "x-default": origin + route(english) };
    assert.equal(translations.length, 3, `${file}: exactly en, hu and x-default alternates`);
    assert.deepEqual(Object.fromEntries(translations.map(tag => [attr(tag, "hreflang"), attr(tag, "href")])), alternates, `${file}: reciprocal, self-inclusive hreflang`);
  } else {
    // A page without a translation carries no hreflang until its pair exists.
    assert.equal(translations.length, 0, `${file}: no hreflang before the English pair exists`);
  }
  const canonical = links.filter(tag => attr(tag, "rel") === "canonical");
  assert.equal(canonical.length, 1, `${file}: one canonical`);
  assert.equal(attr(canonical[0], "href"), url, `${file}: self canonical, not English canonical for Hungarian content`);
  // The homepage has no acquisition pitch. Its existing AI-products heading
  // provides the English entry; the equivalent Hungarian offer is one visible
  // language-switch link away, checked in both directions below.
  assert(/<h3\b[^>]*class="home-service-card-title"[^>]*><a\b[^>]*href="\/ai-integration"[^>]*>AI products<\/a><\/h3>/.test(home), `${file}: factual, crawlable AI-products entry`);
  if (pair) assert(body.includes(`href="${route(pair)}"`), `${file}: visible language switch`);
  for (const slug of ["instructure", "raiffeisen", "kineticare"]) {
    assert(body.includes(`href="${language === "hu" ? "/hu/munka/" : "/work/"}${slug}"`), `${file}: linked first-hand evidence ${slug}`);
  }
  assert(new RegExp(`<a\\b[^>]*\\bclass="[^"]*\\bfooter-email\\b[^"]*"[^>]*href="${language === "hu" ? "/hu/kapcsolat" : "/contact"}"`).test(body), `${file}: project action in main content leads to the contact form`);
  // GA identifiers are uppercase; case-insensitive matching mistakes closing-passage.webp for a tracker.
  assert(!/mailto:|<form\b|googletagmanager|analytics\.google|oaipixel/i.test(html) && !/\bG-[A-Z0-9]{6,}\b/.test(html), `${file}: no exposed email, form or unapproved tracking`);
  const graph = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(([, json]) => flatten(JSON.parse(json)));
  const pages = graph.filter(node => node["@type"] === "WebPage");
  const services = graph.filter(node => node["@type"] === "Service");
  assert.equal(pages.length, 1, `${file}: one WebPage`);
  assert.equal(services.length, 1, `${file}: one Service`);
  assert.equal(pages[0].url, url, `${file}: WebPage URL`);
  assert.equal(pages[0].inLanguage, language, `${file}: schema language`);
  assert.equal(pages[0].isPartOf?.["@id"], `${origin}/#website`, `${file}: shared website identity`);
  assert.equal(services[0].provider?.["@id"], `${origin}/#person`, `${file}: real provider identity`);
  assert.equal(services[0].provider?.["@type"], "Person", `${file}: provider is the home Person`);
  assert.equal(services[0].provider?.jobTitle, "Product VP", `${file}: provider jobTitle lock`);
  assert(!Object.hasOwn(services[0], "offers"), `${file}: do not invent Offer or pricing`);
  assert(!/"@type":\s*"(?:Aggregate)?Offer"|priceCurrency|"price"\s*:/.test(JSON.stringify(services[0])), `${file}: no invented price`);
  assert(text(body).includes(services[0].name), `${file}: Service name must be visible`);
  assert(text(body).includes(services[0].description), `${file}: Service description must match visible copy`);
  assert(!graph.some(node => ["Article", "AggregateRating", "Review", "Offer", "AggregateOffer"].includes(node["@type"])), `${file}: not a case article or fabricated review/rich result`);
  // The extended Hungarian pages mark up their visible questions (2026-10-21);
  // check-seo verifies each question and answer against the visible text.
  const faqs = graph.filter(node => node["@type"] === "FAQPage");
  if (EXTENDED_SERVICE_PAGES.includes(file)) {
    const visible = (body.match(/<details\b/g) || []).length;
    assert.equal(faqs.length, 1, `${file}: one FAQPage for the visible questions`);
    assert.equal(faqs[0].mainEntity?.length, visible, `${file}: every visible question is marked up once`);
    assert(visible >= 6 && visible <= 8, `${file}: six to eight questions`);
  } else {
    assert.equal(faqs.length, 0, `${file}: no FAQPage on this service page`);
  }
  assert(!/\d[\d\s.]*(?:Ft|HUF|forint|EUR|€)/i.test(text(body)), `${file}: no invented price in the copy`);
}

console.log(`OK: ${SERVICE_PAGES.length} client landing pages have reciprocal languages, visible service data, proof links and native contact actions with separate consent-gated analytics`);
