#!/usr/bin/env node
// Client acquisition contracts: readable offers, equivalent languages, honest entities.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SERVICE_PAGES } from "./service-pages.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://www.barnanorbert.com";
const home = readFileSync(join(root, "index.html"), "utf8");
const languages = { "ai-integration.html": "en", "hu/ai-integracio.html": "hu" };
const alternates = { en: `${origin}/ai-integration`, hu: `${origin}/hu/ai-integracio`, "x-default": `${origin}/ai-integration` };
const attr = (tag, key) => tag.match(new RegExp(`\\b${key}="([^"]*)"`, "i"))?.[1];
const text = (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const flatten = (value) => !value || typeof value !== "object" ? [] :
  [...(value["@type"] ? [value] : []), ...Object.values(value).flatMap(flatten)];

for (const file of SERVICE_PAGES) {
  const html = readFileSync(join(root, file), "utf8");
  const url = `${origin}/${file.replace(/\.html$/, "")}`;
  const language = languages[file];
  const body = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)?.[0] || "";
  const h1 = text(body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
  assert.equal(attr(html.match(/<html\b[^>]*>/i)?.[0] || "", "lang"), language, `${file}: document language`);
  assert(h1 && /AI/i.test(h1), `${file}: visible AI service subject`);
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => tag);
  const translations = links.filter(tag => attr(tag, "rel") === "alternate" && attr(tag, "hreflang"));
  assert.equal(translations.length, 3, `${file}: exactly en, hu and x-default alternates`);
  assert.deepEqual(Object.fromEntries(translations.map(tag => [attr(tag, "hreflang"), attr(tag, "href")])), alternates, `${file}: reciprocal, self-inclusive hreflang`);
  const canonical = links.filter(tag => attr(tag, "rel") === "canonical");
  assert.equal(canonical.length, 1, `${file}: one canonical`);
  assert.equal(attr(canonical[0], "href"), url, `${file}: self canonical, not English canonical for Hungarian content`);
  assert(home.includes(`href="/${file.replace(/\.html$/, "")}"`), `${file}: crawlable home entry link`);
  const other = language === "en" ? "/hu/ai-integracio" : "/ai-integration";
  assert(body.includes(`href="${other}"`), `${file}: visible language switch`);
  for (const slug of ["instructure", "raiffeisen", "kineticare"]) {
    assert(body.includes(`href="/work/${slug}"`), `${file}: linked first-hand evidence ${slug}`);
  }
  assert(/<button\b[^>]*\btype="button"[^>]*\bclass="[^"]*\bfooter-email\b/.test(body), `${file}: native contact action in main content`);
  assert(!/mailto:|anorbert@pm\.me|<form\b|G-[A-Z0-9]{6,}|googletagmanager|analytics\.google|oaipixel/i.test(html), `${file}: no exposed email, form or unapproved tracking`);
  const graph = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(([, json]) => flatten(JSON.parse(json)));
  const pages = graph.filter(node => node["@type"] === "WebPage");
  const services = graph.filter(node => node["@type"] === "Service");
  assert.equal(pages.length, 1, `${file}: one WebPage`);
  assert.equal(services.length, 1, `${file}: one Service`);
  assert.equal(pages[0].url, url, `${file}: WebPage URL`);
  assert.equal(pages[0].inLanguage, language, `${file}: schema language`);
  assert.equal(pages[0].isPartOf?.["@id"], `${origin}/#website`, `${file}: shared website identity`);
  assert.equal(services[0].provider?.["@id"], `${origin}/#person`, `${file}: real provider identity`);
  assert(text(body).includes(services[0].name), `${file}: Service name must be visible`);
  assert(text(body).includes(services[0].description), `${file}: Service description must match visible copy`);
  assert(!graph.some(node => ["Article", "FAQPage", "AggregateRating", "Review"].includes(node["@type"])), `${file}: not a case article or fabricated review/rich result`);
}

console.log("OK: two client landing pages have reciprocal languages, visible service data, proof links and native contact actions with separate consent-gated analytics");
