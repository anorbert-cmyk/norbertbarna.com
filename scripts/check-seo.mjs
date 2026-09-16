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
import { UTILITY_PAGES, SERVICE_PAGES } from "./service-pages.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://www.barnanorbert.com";
const files = ["index.html", "works.html", "about.html", ...UTILITY_PAGES,
  ...readdirSync(join(root, "work")).filter(f => f.endsWith(".html")).map(f => `work/${f}`)];
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
  const route = file === "index.html" ? "/" : `/${file.replace(/\.html$/, "")}`;
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
const allowedTypes = new Set(["ProfilePage", "Person", "Occupation", "Organization", "ImageObject", "WebSite", "CollectionPage", "ItemList", "ListItem", "AboutPage", "Article", "WebPage", "BreadcrumbList", "FAQPage", "Question", "Answer", "Service"]);
check(pages.length === 14 && byUrl.size === 14, "expected fourteen distinct indexable content routes");
for (const page of pages) for (const node of page.nodes) {
  if (node["@id"] && types(node).length) {
    const previous = definitions.get(node["@id"]);
    check(!previous || types(previous).join() === types(node).join(), `${page.file}: conflicting types for ${node["@id"]}`);
    definitions.set(node["@id"], node);
  }
}

for (const page of pages) {
  const { file, html, canonical, roots, nodes } = page;
  const titleTags = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
  const title = text(titleTags[0]?.[1] || "");
  const description = page.metas("description");
  check(titleTags.length === 1 && title && !titles.has(title.toLowerCase()), `${file}: one unique nonempty title`);
  check(description.length === 1 && description[0]?.trim() && !descriptions.has(description[0].toLowerCase()), `${file}: one unique nonempty description`);
  titles.add(title.toLowerCase()); descriptions.add(description[0]?.toLowerCase());
  const canonicals = page.links.filter(link => link.rel === "canonical");
  check(canonicals.length === 1 && canonicals[0].href === canonical, `${file}: one exact self-canonical`);
  const robots = page.metas("robots");
  check(robots.length === 1 && /\bindex\b/.test(robots[0]) && /\bfollow\b/.test(robots[0]), `${file}: explicit index/follow`);
  check(![...robots, ...page.metas("googlebot")].some(value => /\b(noindex|nofollow|none)\b/i.test(value)), `${file}: conflicting crawl directives`);
  check(page.language === (page.route.startsWith("/hu/") ? "hu" : "en"), `${file}: document language`);
  const bingVerification = page.metas("msvalidate.01");
  check(file === "index.html" ? bingVerification.length === 1 && /^[A-F0-9]{32}$/i.test(bingVerification[0]) : bingVerification.length === 0,
    `${file}: one provider-issued Bing verification value belongs on the homepage only`);
  const expectedType = file === "index.html" ? "ProfilePage" : file === "works.html" ? "CollectionPage" : file === "about.html" ? "AboutPage" : file.startsWith("work/") ? "Article" : "WebPage";
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
      check(target.pathname.startsWith("/assets/") && existsSync(join(root, decodeURIComponent(target.pathname))), `${file}: noncanonical or missing internal destination ${anchor.href}`);
      continue;
    }
    if (target.hash) check(destination.ids.has(decodeURIComponent(target.hash.slice(1))), `${file}: missing native fragment ${anchor.href}`);
  }
}

for (const [english, hungarian] of [["/ai-integration", "/hu/ai-integracio"], ["/privacy", "/hu/adatvedelem"]]) {
  const expected = { en: origin + english, hu: origin + hungarian, "x-default": origin + english };
  for (const route of [english, hungarian]) {
    const page = byUrl.get(origin + route);
    const alternates = page.links.filter(link => link.rel === "alternate" && link.hreflang);
    check(alternates.length === 3 && alternates.every(link => expected[link.hreflang] === link.href) && new Set(alternates.map(link => link.hreflang)).size === 3, `${page.file}: reciprocal/self-inclusive en/hu/x-default`);
  }
}

const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => ({
  loc: decode(entry.match(/<loc>(.*?)<\/loc>/)?.[1] || ""), lastmod: entry.match(/<lastmod>(.*?)<\/lastmod>/)?.[1],
}));
check(/<urlset\b[^>]*xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/.test(sitemap) && /<\/urlset>\s*$/.test(sitemap), "sitemap protocol/root");
check(entries.length === pages.length && new Set(entries.map(entry => entry.loc)).size === pages.length, "sitemap has exactly every canonical once");
for (const entry of entries) {
  const page = byUrl.get(entry.loc);
  check(Boolean(page), `sitemap includes a noncanonical/noncontent URL: ${entry.loc}`);
  check(validDate(entry.lastmod) && day(entry.lastmod) <= today, `sitemap invalid/future lastmod for ${entry.loc}`);
  for (const node of page?.nodes || []) if (node.dateModified) check(day(entry.lastmod) >= day(node.dateModified), `${page.file}: sitemap lastmod predates known schema modification`);
}
check(readFileSync(join(root, "robots.txt"), "utf8").includes(`Sitemap: ${origin}/sitemap.xml`), "robots.txt must advertise the canonical sitemap");
if (errors.length) { for (const error of errors) console.error(`FAIL: ${error}`); process.exit(1); }
console.log(`OK: ${pages.length} pages have coherent canonical/schema identities, language pairs, content-backed fields, dates, sitemap entries and native fragments (static guard; not rich-result validation)`);
