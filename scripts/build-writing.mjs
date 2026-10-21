#!/usr/bin/env node
/**
 * Builds the Writing section from content/*.md:
 *   hu/irasok/<slug>.html, writing/<slug>.html   one page per article
 *   hu/irasok/index.html, writing/index.html     list pages
 *   hu/irasok/feed.xml, writing/feed.xml         RSS 2.0
 * and rewrites the writing entries of sitemap.xml and the Writing section of llms.txt.
 *
 * The page chrome (head assets, navigation, footer, scripts) is copied from
 * privacy.html and hu/adatvedelem.html, so a re-hashed stylesheet or a menu
 * change reaches the articles on the next build. Output depends only on the
 * repository files: no clock, no network.
 *
 *   npm run build:writing          write the files
 *   node scripts/build-writing.mjs --check   fail if any output is stale (npm test)
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  ORIGIN, ROOT, SECTIONS, articleFile, escapeHtml, faqOf, loadArticles, markdownToHtml, readingMinutes, writingLanguageLinks,
} from "./writing-content.mjs";
import { urlOf } from "./service-pages.mjs";

const CHECK = process.argv.includes("--check");
const DEFAULT_IMAGE = {
  url: `${ORIGIN}/assets/images/og/forest-olive-folds.jpg`,
  alt: { en: "Forest-green and olive folded geometric sculpture", hu: "Erdőzöld és olívasárga hajtogatott geometriai alakzat" },
};
const COPY = {
  hu: {
    locale: "hu_HU",
    templateFile: "hu/adatvedelem.html",
    contact: "/hu/kapcsolat",
    minutes: (n) => `${n} perc olvasás`,
    date: (iso) => {
      const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
      const months = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
      return `${y}. ${months[m - 1]} ${d}.`;
    },
    listTitle: "Írások webfejlesztésről és AI-ról | Barna Norbert",
    listDescription: "Barna Norbert cikkei céges weboldalakról, webfejlesztésről és AI-integrációról, saját projektek tapasztalataiból írva.",
    listKeywords: ["Barna Norbert írásai", "weboldal készítés", "webfejlesztés", "AI-integráció"],
    listIntro: "Cikkek céges weboldalakról, egyedi webfejlesztésről és arról, hogyan kerül AI egy valódi munkafolyamatba. Mindegyik a saját projektjeimből és döntéseimből indul, nem általános tippekből.",
    feedTitle: "Barna Norbert írásai",
    feedLabel: "RSS-hírcsatorna",
    ctaHeading: "Ha ez a te projekted",
    ctaText: (service) => service
      ? `Erről a munkáról bővebben itt olvashatsz: ${service}. Ha már tudod, mit szeretnél, írj pár sort a céljaidról.`
      : "Ha van egy projekted, amelyre ez a cikk illik, írj pár sort a céljaidról, és megbeszéljük, hogyan érdemes nekiállni.",
    ctaButton: "Beszéljünk a projektedről",
  },
  en: {
    locale: "en_US",
    templateFile: "privacy.html",
    contact: "/contact",
    minutes: (n) => `${n} min read`,
    date: (iso) => {
      const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return `${d} ${months[m - 1]} ${y}`;
    },
    listTitle: "Writing on AI products and web development | Norbert Barna",
    listDescription: "Articles by Norbert Barna on AI integration, human-in-the-loop product design and web development, drawn from shipped work.",
    listKeywords: ["Norbert Barna writing", "AI integration", "human in the loop AI", "web development"],
    listIntro: "Articles on AI integration, human-in-the-loop product design and web development. Each one starts from projects I worked on and the decisions behind them, not from general advice.",
    feedTitle: "Writing by Norbert Barna",
    feedLabel: "RSS feed",
    ctaHeading: "If this is your project",
    ctaText: (service) => service
      ? `The service behind this article: ${service}. If you already know what you want to build, send a few lines about your goals.`
      : "If you have a project this article fits, send a few lines about your goals and we can work out how to approach it.",
    ctaButton: "Discuss your project",
  },
};

// ---- chrome copied from the privacy pages --------------------------------
function chrome(lang) {
  const file = COPY[lang].templateFile;
  const html = readFileSync(join(ROOT, file), "utf8");
  const pick = (pattern, what) => {
    const match = html.match(pattern);
    if (!match) throw new Error(`${file}: cannot find the ${what} to copy into the writing pages`);
    return match[1];
  };
  return {
    preload: pick(/<head>\n(<meta charset="utf-8"\/>[^\n]*)\n/, "font preloads"),
    assets: pick(/\n(<link href="\/assets\/css\/norbertbarna\.webflow\.shared[^\n]*)\n/, "head stylesheets"),
    headTail: pick(/(<noscript>[\s\S]*?)<\/head>/, "head scripts"),
    header: pick(/(<body\b[^>]*>[\s\S]*?)<main\b/, "navigation"),
    footer: pick(/<\/main>\n?([\s\S]*)$/, "footer"),
  };
}

function header(template, lang, switchHref, alternate) {
  const other = lang === "hu" ? "en" : "hu";
  const label = other === "hu" ? "Magyar" : "English";
  const link = `<a class="nav-link white w-nav-link lang-switch" href="${switchHref}" hreflang="${other}" lang="${other}"${alternate ? ' rel="alternate"' : ""}>${label}</a>`;
  const replaced = template.replace(/<a class="nav-link white w-nav-link lang-switch"[^>]*>[^<]*<\/a>/, link);
  if (replaced === template) throw new Error(`${COPY[lang].templateFile}: language link not found`);
  return replaced;
}

// ---- page parts ------------------------------------------------------------
const json = (value) => JSON.stringify(value, null, 2).replace(/</g, "\\u003c");

function head({ lang, title, description, keywords, canonical, type, image, alternates, extraMeta = [], schema, feedHref }) {
  const template = chrome(lang);
  const copy = COPY[lang];
  const otherLocale = COPY[lang === "hu" ? "en" : "hu"].locale;
  return [
    "<!DOCTYPE html>",
    `<html lang="${lang}">`,
    "<head>",
    template.preload,
    `<title>${escapeHtml(title)}</title>`,
    `<meta content="${escapeHtml(description)}" name="description"/><meta content="${escapeHtml(keywords.join(", "))}" name="keywords"/>`,
    `<meta content="${escapeHtml(title)}" property="og:title"/>`,
    `<meta content="${escapeHtml(description)}" property="og:description"/>`,
    `<meta content="${image.url}" property="og:image"/>`,
    `<meta content="${escapeHtml(image.alt)}" property="og:image:alt"/>`,
    // Covers are validated as 1200x630 JPEGs, like the default preview.
    `<meta content="1200" property="og:image:width"/>`,
    `<meta content="630" property="og:image:height"/>`,
    `<meta content="image/jpeg" property="og:image:type"/>`,
    `<meta content="${type}" property="og:type"/>`,
    `<meta content="Norbert Barna" property="og:site_name"/>`,
    `<meta content="${copy.locale}" property="og:locale"/>${alternates ? `<meta content="${otherLocale}" property="og:locale:alternate"/>` : ""}`,
    `<meta content="${canonical}" property="og:url"/>`,
    ...extraMeta,
    `<meta content="summary_large_image" name="twitter:card"/>`,
    `<meta content="${escapeHtml(title)}" name="twitter:title"/>`,
    `<meta content="${escapeHtml(description)}" name="twitter:description"/>`,
    `<meta content="${image.url}" name="twitter:image"/>`,
    `<meta content="${escapeHtml(image.alt)}" name="twitter:image:alt"/>`,
    `<meta content="width=device-width, initial-scale=1, viewport-fit=cover" name="viewport"/>`,
    `<meta content="#000000" name="theme-color"/>`,
    `<meta content="index, follow, max-image-preview:large" name="robots"/>`,
    `<meta content="Norbert Barna" name="author"/>`,
    `<link rel="canonical" href="${canonical}"/>`,
    ...(alternates ? [
      `<link rel="alternate" hreflang="en" href="${alternates.en}"/>`,
      `<link rel="alternate" hreflang="hu" href="${alternates.hu}"/>`,
      `<link rel="alternate" hreflang="x-default" href="${alternates.en}"/>`,
    ] : []),
    `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(copy.feedTitle)}" href="${feedHref}"/>`,
    template.assets,
    `<script type="application/ld+json">\n${json(schema)}\n</script>`,
    `${template.headTail}</head>`,
  ].join("\n");
}

const page = ({ head: headHtml, lang, switchHref, alternate, main }) => {
  const template = chrome(lang);
  return `${headHtml}\n${header(template.header, lang, switchHref, alternate)}<main id="main-content" tabindex="-1">${main}</main>\n${template.footer}`;
};

const person = { "@type": "Person", "@id": `${ORIGIN}/#person`, name: "Norbert Barna", url: `${ORIGIN}/` };
const imageOf = (article) => article.cover
  ? { url: `${ORIGIN}${article.cover.startsWith("/") ? "" : "/"}${article.cover}`, alt: article.cover_alt }
  : { url: DEFAULT_IMAGE.url, alt: DEFAULT_IMAGE.alt[article.lang] };
// Date and reading time; on article pages the line starts with the visible
// breadcrumb back to the list (the BreadcrumbList names it).
const meta = (lang, article, crumb = false) =>
  `<p class="writing-meta">${crumb ? `<a href="${SECTIONS[lang].path}">${SECTIONS[lang].name}</a> · ` : ""}<time datetime="${article.date.slice(0, 10)}">${COPY[lang].date(article.date)}</time> · ${COPY[lang].minutes(readingMinutes(article.markdown))}</p>`;

function renderArticle(article, articles, links) {
  const { lang } = article;
  const copy = COPY[lang];
  const section = SECTIONS[lang];
  const canonical = `${ORIGIN}${section.path}/${article.slug}`;
  const pair = article.pair && articles.find((other) => other.lang !== lang && other.slug === article.pair);
  const alternates = pair && (lang === "en"
    ? { en: canonical, hu: `${ORIGIN}${SECTIONS.hu.path}/${pair.slug}` }
    : { en: `${ORIGIN}${SECTIONS.en.path}/${pair.slug}`, hu: canonical });
  const image = imageOf(article);
  const body = markdownToHtml(article.markdown, article.source);
  const faq = faqOf(body);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${canonical}#article`,
        mainEntityOfPage: canonical,
        url: canonical,
        headline: article.title,
        description: article.description,
        inLanguage: lang,
        datePublished: article.date,
        dateModified: article.updated,
        author: person,
        publisher: { "@id": `${ORIGIN}/#person` },
        image: image.url,
        ...(article.tags.length ? { keywords: article.tags.join(", ") } : {}),
        isPartOf: { "@id": `${ORIGIN}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: section.name, item: `${ORIGIN}${section.path}` },
          { "@type": "ListItem", position: 2, name: article.title },
        ],
      },
      // The visible "Gyakori kérdések / Frequently asked questions" block, word for word.
      ...(faq.length ? [{
        "@type": "FAQPage",
        "@id": `${canonical}#faq`,
        url: canonical,
        inLanguage: lang,
        mainEntity: faq.map(({ question, answer }) => ({
          "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      }] : []),
    ],
  };
  const service = article.service
    ? `<a href="${escapeHtml(article.service)}">${escapeHtml(article.service_label)}</a>`
    : "";
  const main = [
    `<article class="work-single-section" aria-labelledby="article-title"><div class="w-layout-blockcontainer container-large w-container"><div class="summary w-richtext home-banner-content-wrap">`,
    `<h1 class="home-banner-title" id="article-title">${escapeHtml(article.title)}</h1>`,
    meta(lang, article, true),
    body,
    `<h2 id="${lang === "hu" ? "kapcsolodo-szolgaltatas" : "related-service"}">${copy.ctaHeading}</h2>`,
    `<p>${copy.ctaText(service)}</p>`,
    `<p><a class="footer-email hero-work-link" href="${copy.contact}">${copy.ctaButton}</a></p>`,
    `</div></div></article>`,
  ].join("\n");
  const extraMeta = [
    `<meta content="${article.date}" property="article:published_time"/>`,
    `<meta content="${article.updated}" property="article:modified_time"/>`,
    ...article.tags.map((tag) => `<meta content="${escapeHtml(tag)}" property="article:tag"/>`),
  ];
  const link = links[articleFile(article)];
  return page({
    head: head({ lang, title: article.title, description: article.description, keywords: article.tags, canonical, type: "article", image, alternates, extraMeta, schema, feedHref: `${section.path}/feed.xml` }),
    lang, switchHref: urlOf(link.file), alternate: link.alternate, main,
  });
}

function renderList(lang, own, links) {
  const copy = COPY[lang];
  const section = SECTIONS[lang];
  const canonical = `${ORIGIN}${section.path}`;
  const link = links[`${section.dir}/index.html`];
  const alternates = link.alternate ? { en: `${ORIGIN}${SECTIONS.en.path}`, hu: `${ORIGIN}${SECTIONS.hu.path}` } : null;
  const updated = own.map((article) => article.updated).sort().at(-1);
  const page_ = {
    "@type": "CollectionPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: copy.listTitle,
    description: copy.listDescription,
    inLanguage: lang,
    dateModified: updated,
    isPartOf: { "@id": `${ORIGIN}/#website` },
    author: { "@id": `${ORIGIN}/#person` },
    // Google reads an ItemList only with two or more entries.
    ...(own.length > 1 ? { mainEntity: {
      "@type": "ItemList",
      itemListElement: own.map((article, index) => ({
        "@type": "ListItem", position: index + 1, name: article.title, url: `${canonical}/${article.slug}`,
      })),
    } } : {}),
  };
  const schema = { "@context": "https://schema.org", "@graph": [page_] };
  const items = own.map((article) => [
    `<h2 id="${article.slug}"><a href="${section.path}/${article.slug}">${escapeHtml(article.title)}</a></h2>`,
    `<p>${escapeHtml(article.description)}</p>`,
    meta(lang, article),
  ].join("\n"));
  const main = [
    `<section class="work-single-section"><div class="w-layout-blockcontainer container-large w-container"><div class="summary w-richtext home-banner-content-wrap">`,
    `<h1 class="home-banner-title">${section.name}</h1>`,
    `<p>${copy.listIntro}</p>`,
    ...items,
    `<p><a href="${section.path}/feed.xml">${copy.feedLabel}</a></p>`,
    `</div></div></section>`,
  ].join("\n");
  return page({
    head: head({ lang, title: copy.listTitle, description: copy.listDescription, keywords: copy.listKeywords, canonical, type: "website", image: { url: DEFAULT_IMAGE.url, alt: DEFAULT_IMAGE.alt[lang] }, alternates, schema, feedHref: `${section.path}/feed.xml` }),
    lang, switchHref: urlOf(link.file), alternate: link.alternate, main,
  });
}

function rfc822(iso) {
  const date = new Date(iso);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n) => String(n).padStart(2, "0");
  return `${days[date.getUTCDay()]}, ${pad(date.getUTCDate())} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} +0000`;
}

function renderFeed(lang, own) {
  const copy = COPY[lang];
  const section = SECTIONS[lang];
  const updated = own.map((article) => article.updated).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1);
  const items = own.map((article) => {
    const url = `${ORIGIN}${section.path}/${article.slug}`;
    return [
      "    <item>",
      `      <title>${escapeHtml(article.title)}</title>`,
      `      <link>${url}</link>`,
      `      <guid isPermaLink="true">${url}</guid>`,
      `      <pubDate>${rfc822(article.date)}</pubDate>`,
      `      <description>${escapeHtml(article.description)}</description>`,
      ...article.tags.map((tag) => `      <category>${escapeHtml(tag)}</category>`),
      "    </item>",
    ].join("\n");
  });
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    "  <channel>",
    `    <title>${escapeHtml(copy.feedTitle)}</title>`,
    `    <link>${ORIGIN}${section.path}</link>`,
    `    <atom:link href="${ORIGIN}${section.path}/feed.xml" rel="self" type="application/rss+xml"/>`,
    `    <description>${escapeHtml(copy.listDescription)}</description>`,
    `    <language>${lang}</language>`,
    `    <lastBuildDate>${rfc822(updated)}</lastBuildDate>`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

// ---- sitemap and llms.txt ------------------------------------------------
const isWritingLoc = (loc) => Object.values(SECTIONS).some(({ path }) => loc === `${ORIGIN}${path}` || loc.startsWith(`${ORIGIN}${path}/`));

function renderSitemap(articles) {
  const source = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
  const kept = [...source.matchAll(/  <url>\n[\s\S]*?<\/url>\n/g)].map(([entry]) => entry)
    .filter((entry) => !isWritingLoc(entry.match(/<loc>(.*?)<\/loc>/)[1]));
  const entry = (loc, lastmod, changefreq, priority) =>
    `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
  const added = [];
  for (const lang of ["en", "hu"]) {
    const own = articles.filter((article) => article.lang === lang);
    if (!own.length) continue;
    const { path } = SECTIONS[lang];
    added.push(entry(`${ORIGIN}${path}`, own.map((article) => article.updated.slice(0, 10)).sort().at(-1), "weekly", "0.6"));
    for (const article of own) added.push(entry(`${ORIGIN}${path}/${article.slug}`, article.updated.slice(0, 10), "monthly", "0.6"));
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...kept, ...added].join("")}</urlset>\n`;
}

function renderLlms(articles) {
  const source = readFileSync(join(ROOT, "llms.txt"), "utf8");
  const withoutSection = source.replace(/## Writing\n[\s\S]*?(?=\n## )\n/, "");
  if (!articles.length) return withoutSection;
  const lines = ["## Writing", "", "Articles by Norbert Barna, written from his own project work. Hungarian articles are listed at https://www.barnanorbert.com/hu/irasok and English articles at https://www.barnanorbert.com/writing.", ""];
  for (const article of articles) {
    lines.push(`- [${article.title}](${ORIGIN}${SECTIONS[article.lang].path}/${article.slug}) (${article.lang === "hu" ? "Hungarian" : "English"}, ${article.date.slice(0, 10)}): ${article.description}`);
  }
  const section = `${lines.join("\n")}\n`;
  const anchor = withoutSection.indexOf("## Services");
  if (anchor < 0) throw new Error("llms.txt: no ## Services heading to place the Writing section before");
  return `${withoutSection.slice(0, anchor)}${section}\n${withoutSection.slice(anchor)}`;
}

// ---- write or check --------------------------------------------------------
loadArticles({ includeDrafts: true }); // validates the drafts' frontmatter too
const articles = loadArticles();
const links = writingLanguageLinks(articles);
const outputs = new Map();
for (const lang of ["en", "hu"]) {
  const own = articles.filter((article) => article.lang === lang);
  if (!own.length) continue;
  const { dir } = SECTIONS[lang];
  outputs.set(`${dir}/index.html`, renderList(lang, own, links));
  outputs.set(`${dir}/feed.xml`, renderFeed(lang, own));
  for (const article of own) outputs.set(articleFile(article), renderArticle(article, articles, links));
}
for (const service of articles.map((article) => article.service).filter(Boolean)) {
  const target = service.replace(/^\//, "");
  if (!existsSync(join(ROOT, `${target}.html`)) && !existsSync(join(ROOT, target, "index.html")) && !outputs.has(`${target}.html`)) {
    throw new Error(`service ${service} is not a page in this repository`);
  }
}
outputs.set("sitemap.xml", renderSitemap(articles));
outputs.set("llms.txt", renderLlms(articles));

// Generated files that no longer have a source (a renamed or deleted article).
const stale = [];
for (const { dir } of Object.values(SECTIONS)) {
  if (!existsSync(join(ROOT, dir))) continue;
  for (const name of readdirSync(join(ROOT, dir))) {
    if (!outputs.has(`${dir}/${name}`)) stale.push(`${dir}/${name}`);
  }
}

if (CHECK) {
  const drift = [...outputs].filter(([file, content]) => !existsSync(join(ROOT, file)) || readFileSync(join(ROOT, file), "utf8") !== content).map(([file]) => file);
  if (drift.length || stale.length) {
    for (const file of drift) console.error(`FAIL: ${file} is out of date; run npm run build:writing`);
    for (const file of stale) console.error(`FAIL: ${file} has no source in content/; run npm run build:writing`);
    process.exit(1);
  }
  console.log(`OK: ${articles.length} articles; writing pages, feeds, sitemap and llms.txt match content/`);
} else {
  for (const file of stale) rmSync(join(ROOT, file));
  // Git keeps no empty directory; drop it here too, so local runs match CI.
  for (const { dir } of Object.values(SECTIONS)) {
    if (existsSync(join(ROOT, dir)) && !readdirSync(join(ROOT, dir)).length) rmSync(join(ROOT, dir), { recursive: true });
  }
  for (const [file, content] of outputs) {
    mkdirSync(dirname(join(ROOT, file)), { recursive: true });
    writeFileSync(join(ROOT, file), content);
  }
  console.log(`Built ${articles.length} articles into ${[...outputs.keys()].filter((file) => !/^(?:sitemap\.xml|llms\.txt)$/.test(file)).length} files, plus sitemap.xml and llms.txt`);
}
