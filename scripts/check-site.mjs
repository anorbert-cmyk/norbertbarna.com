#!/usr/bin/env node
/**
 * Static site sanity checks, run by `npm test` and CI.
 * Verifies SEO invariants (one H1, unique title/description, canonical,
 * valid JSON-LD) and that every local link/asset reference resolves.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { UTILITY_PAGES, HU_PAGES, assetPrefix, baseOf, isHungarian, urlOf } from "./service-pages.mjs";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PAGES = [
  "index.html",
  "works.html",
  "about.html",
  ...UTILITY_PAGES,
  "404.html",
  ...readdirSync(join(ROOT, "work")).filter((f) => f.endsWith(".html")).map((f) => `work/${f}`),
  ...HU_PAGES,
];

const CLEAN_URLS = { "/": "index.html", "/works": "works.html", "/about": "about.html" };
for (const page of UTILITY_PAGES) CLEAN_URLS[`/${page.replace(/\.html$/, "")}`] = page;
for (const page of HU_PAGES) CLEAN_URLS[urlOf(page)] = page;
for (const f of readdirSync(join(ROOT, "work"))) {
  if (f.endsWith(".html")) CLEAN_URLS[`/work/${f.replace(".html", "")}`] = `work/${f}`;
}

const animationsSource = readFileSync(join(ROOT, "assets/js/animations.js"));
const animationsVersion = createHash("sha256").update(animationsSource).digest("hex").slice(0, 12);
const animationsFile = `animations.${animationsVersion}.js`;
const versionedAnimationsPath = join(ROOT, "assets/js", animationsFile);
const responsiveSource = readFileSync(join(ROOT, "assets/css/responsive.css"));
const responsiveVersion = createHash("sha256").update(responsiveSource).digest("hex").slice(0, 12);
const responsiveFile = `responsive.${responsiveVersion}.css`;
const versionedResponsivePath = join(ROOT, "assets/css", responsiveFile);

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`FAIL: ${msg}`);
};

const titles = new Map();
const descriptions = new Map();

const decodeEntities = (value) => value
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#(?:39|x27);/gi, "'")
  .replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));

const visibleText = (value) => decodeEntities(value)
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const schemaNodes = (value, found = []) => {
  if (!value || typeof value !== "object") return found;
  if (!Array.isArray(value) && value["@type"]) found.push(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === "object") schemaNodes(child, found);
  }
  return found;
};

const metaContent = (html, attribute, value) => {
  for (const [, tag] of html.matchAll(/<(meta\b[^>]*)>/gi)) {
    const identity = tag.match(new RegExp(`\\b${attribute}=["']([^"']+)["']`, "i"))?.[1];
    if (identity !== value) continue;
    return tag.match(/\bcontent=["']([^"']*)["']/i)?.[1];
  }
  return undefined;
};

if (!existsSync(versionedAnimationsPath)) {
  fail(`missing versioned custom animation asset: assets/js/${animationsFile}`);
} else if (!readFileSync(versionedAnimationsPath).equals(animationsSource)) {
  fail(`assets/js/${animationsFile} does not match assets/js/animations.js`);
}
if (!existsSync(versionedResponsivePath)) {
  fail(`missing versioned responsive asset: assets/css/${responsiveFile}`);
} else if (!readFileSync(versionedResponsivePath).equals(responsiveSource)) {
  fail(`assets/css/${responsiveFile} does not match assets/css/responsive.css`);
}

for (const page of PAGES) {
  const html = readFileSync(join(ROOT, page), "utf8");
  const is404 = page === "404.html";
  const base = baseOf(page);
  const hungarian = isHungarian(page);
  const isBiography = base === "about.html";

  const h1s = html.match(/<h1\b/g) || [];
  if (h1s.length !== 1) fail(`${page}: expected exactly 1 <h1>, found ${h1s.length}`);

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  if (!title) fail(`${page}: missing <title>`);
  else if (titles.has(title)) fail(`${page}: duplicate title (also on ${titles.get(title)})`);
  else titles.set(title, page);

  const h1 = visibleText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] || "");
  if (base === "works.html") {
    if (h1 !== (hungarian ? "Válogatott munkák" : "Selected work")) {
      fail("TitleDrift: /works H1 must be Selected work");
    } else if (!title.startsWith(h1)) {
      fail("TitleDrift: /works <title> must start with the H1");
    }
  }
  if (base.startsWith("work/") && h1) {
    if (!title.startsWith(`${h1}: `)) {
      fail(`TitleDrift: ${page} <title> must start with the case H1`);
    }
    const ogTitle = metaContent(html, "property", "og:title");
    const twitterTitle = metaContent(html, "name", "twitter:title");
    if (ogTitle !== title) fail(`${page}: og:title must match <title>`);
    if (twitterTitle !== title) fail(`${page}: twitter:title must match <title>`);
  }
  if (!is404 && metaContent(html, "name", "twitter:site")) {
    fail("InventedSocial: twitter:site must stay omitted until a documented X handle exists");
  }
  const robotsMeta = metaContent(html, "name", "robots");
  if (is404) {
    if (!/noindex/i.test(robotsMeta || "")) fail(`${page}: error document must noindex`);
  } else if (!robotsMeta) {
    fail(`${page}: content page must include robots meta`);
  } else if (!/\bindex\b/i.test(robotsMeta) || !/\bfollow\b/i.test(robotsMeta)) {
    fail(`${page}: content page robots must include index,follow`);
  } else if (/\bnoindex\b/i.test(robotsMeta)) {
    fail(`${page}: content page must not noindex`);
  }

  if (!is404 && metaContent(html, "name", "google-site-verification")) {
    fail("InventedSocial: do not invent a Google Search Console token");
  }

  const desc = metaContent(html, "name", "description");
  if (!desc) fail(`${page}: missing meta description`);
  else if (descriptions.has(desc)) fail(`${page}: duplicate description (also on ${descriptions.get(desc)})`);
  else descriptions.set(desc, page);

  if (!is404 && !html.includes('rel="canonical"')) fail(`${page}: missing canonical`);
  if (isBiography) {
    const canonicalTags = [...html.matchAll(/<link\b[^>]*>/gi)]
      .map(match => match[0]).filter(tag => /\brel=["']canonical["']/i.test(tag));
    if (canonicalTags.length !== 1 ||
        !new RegExp(`\\bhref=["']https://www\\.barnanorbert\\.com${urlOf(page)}["']`, "i").test(canonicalTags[0])) {
      fail(`${page}: the biography must retain one self-canonical https://www.barnanorbert.com${urlOf(page)}`);
    }
  }
  if (/cdnjs\.cloudflare\.com|unpkg\.com|cdn\.jsdelivr\.net/.test(html))
    fail(`${page}: references an external JS CDN (should be self-hosted)`);
  if (/<script[^>]+src=["'][^"']*(?:jquery|webflow(?:\.[^"']*)?\.js)[^"']*["']/i.test(html))
    fail(`${page}: legacy jQuery/Webflow runtime returned`);
  if (/href="[^"]*raiffesen[^"]*"/.test(html)) fail(`${page}: links to misspelled raiffesen URL`);
  if (!is404) {
    const animationScripts = [
      ...html.matchAll(/<script[^>]*src="([^"]*assets\/js\/animations[^"]*)"[^>]*><\/script>/g),
    ];
    const expectedSrc = `${assetPrefix(page)}assets/js/${animationsFile}`;
    if (animationScripts.length !== 1) {
      fail(`${page}: expected exactly one versioned custom animation script`);
    } else if (animationScripts[0][1] !== expectedSrc) {
      fail(`${page}: expected custom animation script ${expectedSrc}, found ${animationScripts[0][1]}`);
    }
    const responsiveLinks = [
      ...html.matchAll(/<link[^>]*href="([^"]*assets\/css\/responsive[^"]*)"[^>]*>/g),
    ];
    const expectedResponsiveHref = `${assetPrefix(page)}assets/css/${responsiveFile}`;
    if (responsiveLinks.length !== 1) {
      fail(`${page}: expected exactly one versioned responsive stylesheet`);
    } else if (responsiveLinks[0][1] !== expectedResponsiveHref) {
      fail(`${page}: expected responsive stylesheet ${expectedResponsiveHref}, found ${responsiveLinks[0][1]}`);
    }

    if (/(?:5\.2M|€140M|Dell[^<]{0,80}(?:\$|&#36;)?100M|"alumniOf")/i.test(html)) {
      fail(`${page}: a removed or misattributed portfolio claim returned`);
    }
  }

  // JSON-LD must exist on content pages and must parse
  const ldBlocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)];
  if (!is404 && ldBlocks.length === 0) fail(`${page}: no JSON-LD structured data`);
  const parsedSchemas = [];
  for (const [, block] of ldBlocks) {
    try {
      parsedSchemas.push(JSON.parse(block));
    } catch (e) {
      fail(`${page}: invalid JSON-LD (${e.message})`);
    }
  }

  if (isBiography) {
    const aboutPages = parsedSchemas.flatMap(schema => schemaNodes(schema)).filter(node => node["@type"] === "AboutPage");
    if (aboutPages.length !== 1 || aboutPages[0].url !== `https://www.barnanorbert.com${urlOf(page)}`) {
      fail(`${page}: the biography needs one AboutPage schema with its self-canonical URL`);
    }
  }

  if (!is404) {
    const navigation = html.match(/<nav\b[^>]*\bid=["']primary-navigation["'][^>]*>[\s\S]*?<\/nav>/i)?.[0] || "";
    const aboutHref = hungarian ? "/hu/rolam" : "/about";
    const aboutLinks = [...navigation.matchAll(new RegExp(`<a\\b[^>]*\\bhref=["']${aboutHref}["'][^>]*>([\\s\\S]*?)<\\/a>`, "gi"))];
    if (aboutLinks.length !== 1 || visibleText(aboutLinks[0][1]) !== (hungarian ? "Rólam" : "About")) {
      fail(`${page}: primary navigation must have one native About link to ${aboutHref}`);
    }
    // The EN | HU switch (owner request, 2026-10-06) links both languages of
    // this page and marks the current one.
    const pairHref = (lang) => [...navigation.matchAll(new RegExp(`<a\\b[^>]*\\bhreflang="${lang}"[^>]*>`, "g"))].map(([tag]) => tag);
    const enSwitch = pairHref("en").filter(tag => />$/.test(tag) && /\blang="en"/.test(tag));
    const huSwitch = pairHref("hu").filter(tag => /\blang="hu"/.test(tag));
    if (!/class="[^"]*\blang-switch\b/.test(navigation) || enSwitch.length !== 1 || huSwitch.length !== 1) {
      fail(`${page}: primary navigation needs one EN | HU language switch`);
    } else if (!(hungarian ? huSwitch[0] : enSwitch[0]).includes('aria-current="page"')) {
      fail(`${page}: the language switch must mark the current language`);
    }
    const contactHref = hungarian ? "/hu/kapcsolat" : "/contact";
    if (!new RegExp(`<a\\b[^>]*\\bhref="${contactHref}"[^>]*>${hungarian ? "Kapcsolat" : "Contact"}</a>`).test(navigation)) {
      fail(`${page}: primary navigation must link the contact page ${contactHref}`);
    }
    if (hungarian) {
      for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="(\/(?:works|about|contact|work\/[a-z]+)?)(?:#[^"]*)?"[^>]*>/g)) {
        fail(`${page}: Hungarian page links the English page ${href || "/"} instead of its Hungarian counterpart`);
      }
    }
  }

  if (page === "index.html") {
    const nodes = parsedSchemas.flatMap((schema) => schemaNodes(schema));
    const websites = nodes.filter((node) => node["@type"] === "WebSite");
    if (websites.length !== 1) {
      fail(`${page}: expected exactly one WebSite schema, found ${websites.length}`);
    } else {
      const website = websites[0];
      if (website["@id"] !== "https://www.barnanorbert.com/#website")
        fail(`${page}: WebSite must use the stable #website identifier`);
      if (website.name !== "Norbert Barna")
        fail(`${page}: WebSite name must match the visible site identity`);
      if (website.url !== "https://www.barnanorbert.com/")
        fail(`${page}: WebSite url must match the canonical home page`);
      if (!Array.isArray(website.alternateName) ||
          !website.alternateName.includes("Barna Norbert") ||
          !website.alternateName.includes("barnanorbert.com"))
        fail(`${page}: WebSite alternateName must retain the verified name and domain forms`);
    }
    const profile = nodes.find((node) => node["@type"] === "ProfilePage");
    if (profile?.isPartOf?.["@id"] !== "https://www.barnanorbert.com/#website")
      fail(`${page}: ProfilePage must link to the canonical WebSite entity`);
    if (profile?.name !== "Norbert Barna, Product VP")
      fail(`${page}: ProfilePage name must be Norbert Barna, Product VP`);
    // Google ProfilePage expects DateTime, unlike schema.org's broader Date range.
    // Omit this optional field when the exact profile modification time is unknown.
    // https://developers.google.com/search/docs/appearance/structured-data/profile-page
    if (profile && Object.hasOwn(profile, "dateModified")) {
      const modified = profile.dateModified;
      const fullDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
      if (typeof modified !== "string" || !fullDateTime.test(modified) || !Number.isFinite(Date.parse(modified)))
        fail(`${page}: ProfilePage dateModified must be a full ISO 8601 DateTime with timezone, or omitted; date-only values are invalid`);
    }
    const person = nodes.find((node) => node["@type"] === "Person");
    if (person?.name !== "Norbert Barna")
      fail(`${page}: Person name must be Norbert Barna, not a job title`);
    if (person?.jobTitle !== "Product VP")
      fail(`${page}: Person jobTitle must be Product VP`);
    const personImage = typeof person?.image === "string" ? person.image : person?.image?.url;
    const ogImage = metaContent(html, "property", "og:image");
    const previewImage = "https://www.barnanorbert.com/assets/images/og/forest-olive-folds.jpg";
    if (ogImage !== previewImage || metaContent(html, "name", "twitter:image") !== previewImage ||
        profile?.image !== previewImage || profile?.primaryImageOfPage?.url !== previewImage ||
        profile?.primaryImageOfPage?.width !== 1200 || profile?.primaryImageOfPage?.height !== 630)
      fail(`${page}: social and page JSON-LD images must share the approved 1200x630 forest/olive crop`);
    if (personImage)
      fail(`${page}: omit Person.image until a real profile portrait is provided; page artwork is not a portrait`);
  }

  if (base.startsWith("work/")) {
    const nodes = parsedSchemas.flatMap((schema) => schemaNodes(schema));
    const schemaTypes = (node) => {
      const value = node["@type"];
      return Array.isArray(value) ? value : [value];
    };
    const article = nodes.find((node) => schemaTypes(node).includes("Article"));
    const creativeWorks = nodes.filter((node) =>
      schemaTypes(node).some((type) => type === "Article" || type === "CreativeWork"));
    if (!article) {
      fail(`${page}: missing Article schema`);
    } else {
      if (article.inLanguage !== (hungarian ? "hu" : "en")) fail(`${page}: Article inLanguage must be ${hungarian ? "hu" : "en"}`);
      for (const work of creativeWorks) {
        if (Object.hasOwn(work, "headline") && work.headline !== title)
          fail(`${page}: Article/CreativeWork headline must match <title>`);
      }
      // Modification timestamps have source-commit provenance. Historical
      // publication times are optional: do not manufacture midnight precision.
      const isoDateTime = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(value || "") && Number.isFinite(Date.parse(value));
      if (article.datePublished !== undefined && !isoDateTime(article.datePublished))
        fail(`${page}: Article datePublished must use an evidenced full DateTime/timezone, or be omitted`);
      if (!isoDateTime(article.dateModified))
        fail(`${page}: Article dateModified must retain an evidenced full DateTime/timezone`);
      if (metaContent(html, "property", "article:published_time") !== article.datePublished)
        fail(`${page}: article:published_time must match Article datePublished`);
      if (metaContent(html, "property", "article:modified_time") !== article.dateModified)
        fail(`${page}: article:modified_time must match Article dateModified`);
      // Authorship and dates live in meta tags and JSON-LD only; the visible
      // blog byline (Written by / Published) is a named anti-pattern.
      if (/class="case-byline"|Written by/.test(html))
        fail(`${page}: visible blog byline must not return`);
    }

    const breadcrumb = nodes.find((node) => node["@type"] === "BreadcrumbList");
    const firstCrumb = breadcrumb?.itemListElement?.find((item) => item.position === 1);
    if (firstCrumb?.name !== (hungarian ? "Munkák" : "Works") ||
        firstCrumb?.item !== `https://www.barnanorbert.com${hungarian ? "/hu/munkak" : "/works"}`)
      fail(`${page}: BreadcrumbList must match the visible Works breadcrumb in the header bar`);

    if (!html.includes('<article aria-labelledby="case-title" class="case-study-article">') ||
        !html.includes('<h1 id="case-title"'))
      fail(`${page}: case-study article must be named by its H1`);
    if (!html.includes(`<section class="case-facts-section" aria-label="${hungarian ? "A projekt adatai" : "Project facts"}">`))
      fail(`${page}: missing recruiter-friendly project facts`);

    if (base === "work/kineticare.html") {
      const faq = nodes.find((node) => node["@type"] === "FAQPage");
      if (!faq || !Array.isArray(faq.mainEntity)) {
        fail(`${page}: missing FAQPage entities`);
      } else {
        const visibleQa = new Map(
          [...html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>\s*<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
            .map(([, question, answer]) => [visibleText(question), visibleText(answer)]),
        );
        for (const entity of faq.mainEntity) {
          const question = visibleText(entity.name || "");
          const answer = visibleText(entity.acceptedAnswer?.text || "");
          if (!visibleQa.has(question)) fail(`${page}: FAQ question is not visible: ${question}`);
          else if (visibleQa.get(question) !== answer)
            fail(`${page}: FAQ schema answer drifts from visible content: ${question}`);
        }
      }
    } else if (nodes.some((node) => node["@type"] === "FAQPage")) {
      fail(`${page}: FAQPage is reserved for Kineticare while a visible FAQ remains`);
    }
  }

  if (/(?:35% first-day activation|70% of wagers from AI picks)/i.test(html))
    fail(`${page}: removed unsupported SportsGambit metrics returned`);

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

const llmsPath = join(ROOT, "llms.txt");
if (!existsSync(llmsPath)) {
  fail("llms.txt is missing");
} else {
  const llms = readFileSync(llmsPath, "utf8");
  if (!llms.includes("https://www.barnanorbert.com/works") ||
      !llms.includes("portfolio case-study statements") ||
      !llms.includes("https://www.linkedin.com/in/barna-norbert/") ||
      !llms.includes("https://www.barnanorbert.com/privacy") ||
      !llms.includes("https://www.barnanorbert.com/hu/adatvedelem") ||
      !llms.includes("Product VP") ||
      !llms.includes("https://www.barnanorbert.com/ai-integration") ||
      !llms.includes("https://www.barnanorbert.com/hu/ai-integracio") ||
      !llms.includes("https://www.barnanorbert.com/work/kineticare")) {
    fail("llms.txt is missing canonical portfolio, attribution, privacy or contact guidance");
  }
  if (!llms.includes("https://www.barnanorbert.com/contact") || !llms.includes("https://www.barnanorbert.com/hu/kapcsolat") ||
      !llms.includes("https://www.barnanorbert.com/hu/munkak")) {
    fail("llms.txt must list the contact pages and the Hungarian portfolio");
  }
}

const robots = readFileSync(join(ROOT, "robots.txt"), "utf8");
if (!/^Allow:\s*\/llms\.txt$/m.test(robots)) {
  fail("robots.txt must list /llms.txt");
}
if (!/Sitemap:\s*https:\/\/www\.barnanorbert\.com\/sitemap\.xml/.test(robots)) {
  fail("robots.txt must list the canonical sitemap");
}

// sitemap URLs must map to real pages, in hiring order
const sitemap = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => {
  const path = new URL(loc).pathname.replace(/\/$/, "") || "/";
  const file = CLEAN_URLS[path];
  if (!file || !existsSync(join(ROOT, file))) fail(`sitemap.xml: ${loc} does not resolve to a page`);
  return path;
});
const hiringSitemap = [
  "/",
  "/works",
  "/work/raiffeisen",
  "/work/instructure",
  "/work/bitpanda",
  "/work/benker",
  "/work/sportsgambit",
  "/work/kineticare",
  "/work/onrobot",
  "/about",
  ...UTILITY_PAGES.map(page => `/${page.replace(/\.html$/, "")}`),
  "/hu",
  "/hu/munkak",
  ...["raiffeisen", "instructure", "bitpanda", "benker", "sportsgambit", "kineticare", "onrobot"].map(slug => `/hu/munka/${slug}`),
  "/hu/rolam",
];
if (JSON.stringify(sitemapPaths) !== JSON.stringify(hiringSitemap)) {
  fail(`sitemap.xml order is ${sitemapPaths.join(", ")} (must be hiring-first)`);
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log(`OK: ${PAGES.length} pages checked, all invariants hold`);
