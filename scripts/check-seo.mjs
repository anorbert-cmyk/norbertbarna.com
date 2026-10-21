#!/usr/bin/env node
/** Site-wide SEO relationships, complementing check-site's asset/layout checks.
 * This is a project regression guard, not Google's Rich Results Test or a full
 * schema.org validator. Reviewed against current primary documentation:
 * https://developers.google.com/search/docs/appearance/structured-data/profile-page
 * https://developers.google.com/search/docs/appearance/structured-data/article
 * https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
 * https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
 * https://schema.org/Service and https://schema.org/FAQPage
 * Google Article properties are recommended, not required. We preserve this
 * site's known author/image/modified data. FAQ markup is checked for factual
 * parity only: Google retired FAQ rich results in May 2026.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { UTILITY_PAGES, SERVICE_PAGES, WRITING_PAGES, WRITING_LANGUAGE_LINKS, baseOf, HU_PAGES, isWritingList, isWritingPage, urlOf } from "./service-pages.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://www.barnanorbert.com";
const files = ["index.html", "works.html", "about.html", ...UTILITY_PAGES,
  ...readdirSync(join(root, "work")).filter(f => f.endsWith(".html")).map(f => `work/${f}`), ...HU_PAGES, ...WRITING_PAGES];
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const decode = value => String(value).replace(/&#x([0-9a-f]+);|&#(\d+);|&(amp|quot|apos|nbsp|lt|gt);/gi,
  (_, hex, number, name) => hex || number ? String.fromCodePoint(parseInt(hex || number, hex ? 16 : 10)) :
    ({ amp: "&", quot: '"', apos: "'", nbsp: " ", lt: "<", gt: ">" })[name.toLowerCase()]);
const text = value => decode(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(([, key, , value]) => [key.toLowerCase(), decode(value)]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map(([tag]) => attrs(tag));
const types = node => [node?.["@type"]].flat().filter(Boolean);
const walk = value => value && typeof value === "object" ? [value, ...Object.values(value).flatMap(walk)] : [];
const isoDateTime = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const day = value => typeof value === "string" ? value.slice(0, 10) : "";
const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(`${day(value)}T00:00:00Z`).toISOString().startsWith(day(value));
const url = value => { try { return new URL(value); } catch { return null; } };
const today = new Date().toISOString().slice(0, 10);
const pages = files.map(file => {
  const html = readFileSync(join(root, file), "utf8");
  const route = urlOf(file);
  const meta = tags(html, "meta");
  const roots = [];
  for (const [, source] of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const value = JSON.parse(source);
      check(value["@context"] === "https://schema.org", `${file}: schema.org context`);
      roots.push(...(value["@graph"] || [value]));
    } catch { errors.push(`${file}: malformed JSON-LD`); }
  }
  return { file, html, route, canonical: origin + route, roots, nodes: roots.flatMap(walk),
    links: tags(html, "link"), anchors: tags(html, "a"),
    main: text(html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)?.[0] || ""),
    body: text(html.match(/<body\b[^>]*>[\s\S]*?<\/body>/i)?.[0] || ""),
    h1: text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || ""),
    ids: new Set(tags(html, "[a-z][\\w:-]*").map(tag => tag.id).filter(Boolean)),
    language: tags(html, "html")[0]?.lang,
    metas: key => meta.filter(tag => tag.name === key || tag.property === key).map(tag => tag.content),
  };
});
const byUrl = new Map(pages.map(page => [page.canonical, page]));
const definitions = new Map();
const titles = new Set(), descriptions = new Set();
const allowedTypes = new Set(["ProfilePage", "Person", "Occupation", "Organization", "ImageObject", "WebSite", "CollectionPage", "ItemList", "ListItem", "AboutPage", "Article", "WebPage", "BreadcrumbList", "FAQPage", "Question", "Answer", "Service", "ContactPage"]);
check(pages.length === files.length && byUrl.size === files.length && files.length === 28 + WRITING_PAGES.length, "expected twenty-eight distinct indexable content routes (14 English, 14 Hungarian) plus the generated writing pages");
for (const page of pages) for (const node of page.nodes) {
  if (node["@id"] && types(node).length) {
    const previous = definitions.get(node["@id"]);
    check(!previous || types(previous).join() === types(node).join(), `${page.file}: conflicting types for ${node["@id"]}`);
    definitions.set(node["@id"], node);
  }
}

for (const page of pages) {
  const { file, html, canonical, roots, nodes } = page;
  const titleTags = [...(html.split(/<\/head>/i)[0]).matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
  const title = text(titleTags[0]?.[1] || "");
  const description = page.metas("description");
  check(titleTags.length === 1 && title && !titles.has(title.toLowerCase()), `${file}: one unique nonempty title`);
  check(description.length === 1 && description[0]?.trim() && !descriptions.has(description[0].toLowerCase()), `${file}: one unique nonempty description`);
  titles.add(title.toLowerCase()); descriptions.add(description[0]?.toLowerCase());
  // Snippet budgets (SEO plan 2026-10-21): Google cuts titles near 600 px and
  // descriptions near 920 px on desktop; 60 and 105-135 characters keep both
  // whole in Hungarian and English. Social cards repeat the same pair.
  const length = value => [...String(value || "")].length;
  check(length(title) <= 60, `${file}: title is ${length(title)} characters, keep it at 60 or fewer`);
  check(length(description[0]) >= 105 && length(description[0]) <= 135, `${file}: description is ${length(description[0])} characters, keep it within 105-135`);
  for (const key of ["og:title", "twitter:title"]) check(page.metas(key).length === 1 && page.metas(key)[0] === title, `${file}: ${key} repeats the title`);
  for (const key of ["og:description", "twitter:description"]) check(page.metas(key).length === 1 && page.metas(key)[0] === description[0], `${file}: ${key} repeats the description`);
  const canonicals = page.links.filter(link => link.rel === "canonical");
  check(canonicals.length === 1 && canonicals[0].href === canonical, `${file}: one exact self-canonical`);
  const robots = page.metas("robots");
  check(robots.length === 1 && /\bindex\b/.test(robots[0]) && /\bfollow\b/.test(robots[0]), `${file}: explicit index/follow`);
  check(![...robots, ...page.metas("googlebot")].some(value => /\b(noindex|nofollow|none)\b/i.test(value)), `${file}: conflicting crawl directives`);
  check(page.language === (/^\/hu(?:\/|$)/.test(page.route) ? "hu" : "en"), `${file}: document language`);
  const bingVerification = page.metas("msvalidate.01");
  check(baseOf(file) === "index.html" ? bingVerification.length === 1 && /^[A-F0-9]{32}$/i.test(bingVerification[0]) : bingVerification.length === 0,
    `${file}: one provider-issued Bing verification value belongs on the homepage only`);
  const expectedType = isWritingList(file) ? "CollectionPage" : isWritingPage(file) ? "Article" : baseOf(file) === "index.html" ? "ProfilePage" : baseOf(file) === "works.html" ? "CollectionPage" : baseOf(file) === "about.html" ? "AboutPage" : baseOf(file).startsWith("work/") ? "Article" : /^(?:contact|hu\/kapcsolat)\.html$/.test(file) ? "ContactPage" : "WebPage";
  const primary = roots.filter(node => types(node).includes(expectedType));
  check(primary.length === 1, `${file}: exactly one ${expectedType}`);
  if (primary[0]) {
    check(primary[0]["@id"] === `${canonical}#${expectedType === "Article" ? "article" : "webpage"}`, `${file}: stable primary graph identity`);
    check(!primary[0].url || primary[0].url === canonical, `${file}: schema URL agrees with canonical`);
    check(primary[0].inLanguage === page.language, `${file}: schema/document languages agree`);
  }
  check(new Set(roots.map(node => node["@id"]).filter(Boolean)).size === roots.filter(node => node["@id"]).length, `${file}: duplicate top-level graph identity`);
  for (const node of nodes) {
    for (const type of types(node)) check(allowedTypes.has(type), `${file}: unreviewed schema type ${type}`);
    if (node["@id"]) check(Boolean(url(node["@id"])) && definitions.has(node["@id"]), `${file}: unresolved graph identity ${node["@id"]}`);
    for (const key of ["datePublished", "dateModified", "dateCreated"]) if (node[key]) {
      check(validDate(node[key]) && day(node[key]) <= today, `${file}: valid, non-future ${key}`);
    }
    if (node.datePublished && node.dateModified) check(Date.parse(node.datePublished) <= Date.parse(node.dateModified), `${file}: modified date predates publication`);
    for (const key of ["url", "contentUrl", "image"]) if (typeof node[key] === "string") {
      const target = url(node[key]);
      check(Boolean(target) && target.protocol === "https:", `${file}: absolute HTTPS schema ${key}`);
      if (target?.origin === origin && target.pathname.startsWith("/assets/")) check(existsSync(join(root, decodeURIComponent(target.pathname))), `${file}: missing schema asset ${target.pathname}`);
    }
    if (types(node).includes("Person")) check(node.name === "Norbert Barna" && /Norbert Barna|Barna Norbert/.test(page.body), `${file}: author/provider identity must be visible and real`);
    if (types(node).includes("ProfilePage")) {
      const person = node.mainEntity?.["@type"] ? node.mainEntity : definitions.get(node.mainEntity?.["@id"]);
      check(types(person).includes("Person") && person.name, `${file}: ProfilePage requires its named mainEntity`);
    }
    if (types(node).includes("Article")) {
      check(node.headline === title && node.headline.startsWith(page.h1), `${file}: Article headline reflects the visible case`);
      check(types(node.author).includes("Person") && node.author?.url === `${origin}/` && node.image, `${file}: preserve known recommended Article author/image`);
      check(isoDateTime(node.dateModified), `${file}: known Article modification needs a full DateTime/timezone`);
      check(!node.datePublished || isoDateTime(node.datePublished), `${file}: publish time must be evidenced full DateTime or omitted`);
      check(page.metas("article:modified_time").length === 1 && page.metas("article:modified_time")[0] === node.dateModified, `${file}: modification metadata agrees`);
      check(node.datePublished ? page.metas("article:published_time")[0] === node.datePublished : page.metas("article:published_time").length === 0, `${file}: publication metadata agrees`);
      for (const percent of node.description?.match(/\b\d+(?:[.,]\d+)?%/g) || []) check(page.main.includes(percent), `${file}: schema percentage absent from visible evidence: ${percent}`);
    }
    if (types(node).includes("Service")) check(SERVICE_PAGES.includes(file) && page.main.includes(node.name) && page.main.includes(node.description), `${file}: service describes the visible offer`);
    if (types(node).includes("BreadcrumbList") || types(node).includes("ItemList")) {
      const items = node.itemListElement;
      check(Array.isArray(items) && items.length >= 2, `${file}: ordered list needs multiple items`);
      for (const [index, item] of (Array.isArray(items) ? items : []).entries()) {
        const target = item.item?.["@id"] || item.item || item.url || (index === items.length - 1 ? canonical : "");
        check(types(item).includes("ListItem") && item.position === index + 1 && item.name && page.body.includes(item.name), `${file}: list order/names reflect visible content`);
        check(byUrl.has(target) && (target === canonical || page.anchors.some(anchor => new URL(anchor.href || "", canonical).href === target)), `${file}: list item must resolve to its native destination: ${target}`);
      }
    }
    if (types(node).includes("FAQPage")) {
      check(Array.isArray(node.mainEntity) && node.mainEntity.length > 0, `${file}: FAQ needs its existing questions`);
      // Markup only for a FAQ the reader can see: each question is its own
      // heading, summary, term or button inside <main>, outside hidden blocks.
      const mainHtml = (html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)?.[0] || "").replace(/<template\b[\s\S]*?<\/template>|<(\w+)\b[^>]*\shidden\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
      const visibleQuestions = new Set([...mainHtml.matchAll(/<(h[2-4]|summary|dt|button)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(([, , inner]) => text(inner)));
      for (const question of Array.isArray(node.mainEntity) ? node.mainEntity : []) {
        check(visibleQuestions.has(text(question.name || "")), `${file}: FAQ question is not a visible question element: ${question.name}`);
      }
      for (const question of Array.isArray(node.mainEntity) ? node.mainEntity : []) {
        check(types(question).includes("Question") && types(question.acceptedAnswer).includes("Answer"), `${file}: FAQ question/answer types`);
        check(question.name && question.acceptedAnswer?.text && page.main.includes(text(question.name)) && page.main.includes(text(question.acceptedAnswer.text)), `${file}: FAQ markup must match visible questions and answers`);
      }
    }
  }
  for (const anchor of page.anchors) {
    if (!anchor.href || /^(?:mailto:|tel:)/i.test(anchor.href)) continue;
    let target;
    try { target = new URL(anchor.href, canonical); } catch { errors.push(`${file}: malformed native href ${anchor.href}`); continue; }
    if (target.origin !== origin) continue;
    const destination = byUrl.get(target.origin + target.pathname);
    if (!destination) {
      check((target.pathname.startsWith("/assets/") || /^\/(?:hu\/irasok|writing)\/feed\.xml$/.test(target.pathname)) && existsSync(join(root, decodeURIComponent(target.pathname))), `${file}: noncanonical or missing internal destination ${anchor.href}`);
      continue;
    }
    if (target.hash) check(destination.ids.has(decodeURIComponent(target.hash.slice(1))), `${file}: missing native fragment ${anchor.href}`);
  }
}

// Every page has a reciprocal language pair (owner request, 2026-10-06).
const LANGUAGE_PAIRS = [["/ai-integration", "/hu/ai-tanacsadas-fejlesztes"], ["/web-development", "/hu/webfejlesztes"], ["/privacy", "/hu/adatvedelem"], ["/contact", "/hu/kapcsolat"],
  ...HU_PAGES.map(page => [urlOf(baseOf(page)), urlOf(page)]),
  ...Object.entries(WRITING_LANGUAGE_LINKS).filter(([page, link]) => link.alternate && page.startsWith("writing/")).map(([page, link]) => [urlOf(page), urlOf(link.file)])];
// A page outside every pair (a new page whose translation is not live yet)
// carries no hreflang at all: a half pair is ignored by Google and confuses
// Bing. Every alternate a page names must be a canonical page of this site.
const paired = new Set(LANGUAGE_PAIRS.flat());
for (const page of pages) {
  const alternates = page.links.filter(link => link.rel === "alternate" && link.hreflang);
  if (!paired.has(page.route)) check(alternates.length === 0, `${page.file}: hreflang without a registered language pair`);
  for (const link of alternates) check(byUrl.has(link.href), `${page.file}: hreflang ${link.hreflang} points outside the canonical pages: ${link.href}`);
}
for (const [english, hungarian] of LANGUAGE_PAIRS) {
  const expected = { en: origin + english, hu: origin + hungarian, "x-default": origin + english };
  for (const route of [english, hungarian]) {
    const page = byUrl.get(origin + route);
    const alternates = page.links.filter(link => link.rel === "alternate" && link.hreflang);
    check(alternates.length === 3 && alternates.every(link => expected[link.hreflang] === link.href) && new Set(alternates.map(link => link.hreflang)).size === 3, `${page.file}: reciprocal/self-inclusive en/hu/x-default`);
  }
}

// A writing page without a translation declares no hreflang at all, so no
// one-sided alternate can point at a page that does not point back.
for (const [file, link] of Object.entries(WRITING_LANGUAGE_LINKS)) {
  if (link.alternate) continue;
  const page = byUrl.get(origin + urlOf(file));
  check(!page.links.some(tag => tag.rel === "alternate" && tag.hreflang), `${file}: no translation, so no hreflang alternates`);
}

const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => ({
  loc: decode(entry.match(/<loc>(.*?)<\/loc>/)?.[1] || ""), lastmod: entry.match(/<lastmod>(.*?)<\/lastmod>/)?.[1],
}));
check(/<urlset\b[^>]*xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/.test(sitemap) && /<\/urlset>\s*$/.test(sitemap), "sitemap protocol/root");
check(entries.length === pages.length && new Set(entries.map(entry => entry.loc)).size === pages.length, "sitemap has exactly every canonical once");
// Every public HTML file in the repository is a checked page: a new page that
// is missing from the inventory above would also be missing from the sitemap.
const NON_PAGES = new Set(["404.html"]);
const PRIVATE_DIRS = /^(?:node_modules|docs|scripts|tests|tools|lib|indicators|assets|test-results|playwright-report|blob-report|\.)/;
const htmlFiles = (dir = "") => readdirSync(join(root, dir), { withFileTypes: true }).flatMap(entry => {
  const relative = dir ? `${dir}/${entry.name}` : entry.name;
  if (entry.isDirectory()) return PRIVATE_DIRS.test(relative) ? [] : htmlFiles(relative);
  return entry.name.endsWith(".html") && !NON_PAGES.has(relative) ? [relative] : [];
});
for (const file of htmlFiles()) check(files.includes(file), `${file}: public HTML page is missing from the SEO inventory and the sitemap`);
for (const entry of entries) {
  const page = byUrl.get(entry.loc);
  check(Boolean(page), `sitemap includes a noncanonical/noncontent URL: ${entry.loc}`);
  check(validDate(entry.lastmod) && day(entry.lastmod) <= today, `sitemap invalid/future lastmod for ${entry.loc}`);
  for (const node of page?.nodes || []) if (node.dateModified) check(day(entry.lastmod) >= day(node.dateModified), `${page.file}: sitemap lastmod predates known schema modification`);
}
check(readFileSync(join(root, "robots.txt"), "utf8").includes(`Sitemap: ${origin}/sitemap.xml`), "robots.txt must advertise the canonical sitemap");
if (errors.length) { for (const error of errors) console.error(`FAIL: ${error}`); process.exit(1); }
console.log(`OK: ${pages.length} pages have coherent canonical/schema identities, language pairs, content-backed fields, dates, sitemap entries and native fragments (static guard; not rich-result validation)`);
