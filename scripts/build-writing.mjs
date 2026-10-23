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
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  ORIGIN, ROOT, SECTIONS, WRITING_LANGS, articleFile, citations, escapeHtml, faqOf, leadParagraph, loadArticles, markdownToHtml, outlineOf, readingMinutes,
  wordCount, writingLanguageLinks,
} from "./writing-content.mjs";
import { urlOf } from "./service-pages.mjs";
import { BREADCRUMB_LABEL, applyChrome } from "./site-chrome.mjs";

const CHECK = process.argv.includes("--check");
const DEFAULT_IMAGE = {
  url: `${ORIGIN}/assets/images/og/forest-olive-folds.jpg`,
  alt: { en: "Forest-green and olive folded geometric sculpture", hu: "Erdőzöld és olívasárga hajtogatott geometriai alakzat", de: "Waldgrüne und olivfarbene gefaltete geometrische Skulptur" },
};
const LINKEDIN = "https://www.linkedin.com/in/barna-norbert/";
const COPY = {
  hu: {
    locale: "hu_HU",
    templateFile: "hu/adatvedelem.html",
    contact: "/hu/kapcsolat",
    home: { name: "Főoldal", path: "/hu" },
    author: { name: "Barna Norbert", path: "/hu/rolam" },
    breadcrumbLabel: BREADCRUMB_LABEL.hu,
    tocLabel: "Tartalom",
    updated: "Frissítve",
    minutes: (n) => `${n} perc olvasás`,
    date: (iso) => {
      const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
      const months = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
      return `${y}. ${months[m - 1]} ${d}.`;
    },
    eyebrow: "Tudástár",
    listHeading: "Írások webfejlesztésről és AI-ról",
    listLabel: "Cikkek",
    count: (n) => `${n} cikk`,
    moreHeading: "További cikkek",
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
    home: { name: "Home", path: "/" },
    author: { name: "Norbert Barna", path: "/about" },
    breadcrumbLabel: BREADCRUMB_LABEL.en,
    tocLabel: "Contents",
    updated: "Updated",
    minutes: (n) => `${n} min read`,
    date: (iso) => {
      const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return `${d} ${months[m - 1]} ${y}`;
    },
    eyebrow: "Articles",
    listHeading: "Writing on AI products and web development",
    listLabel: "Articles",
    count: (n) => `${n} article${n === 1 ? "" : "s"}`,
    moreHeading: "More articles",
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
  de: {
    locale: "de_DE",
    templateFile: "de/datenschutz.html",
    contact: "/de/kontakt",
    home: { name: "Startseite", path: "/de" },
    author: { name: "Norbert Barna", path: "/de/ueber-mich" },
    breadcrumbLabel: BREADCRUMB_LABEL.de,
    tocLabel: "Inhalt",
    updated: "Aktualisiert",
    minutes: (n) => `${n} Min. Lesezeit`,
    date: (iso) => {
      const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
      const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
      return `${d}. ${months[m - 1]} ${y}`;
    },
    eyebrow: "Wissen",
    listHeading: "Artikel zu KI im Unternehmen und Webentwicklung",
    listLabel: "Artikel",
    count: (n) => `${n} Artikel`,
    moreHeading: "Weitere Artikel",
    listTitle: "Wissen: KI im Unternehmen und Webentwicklung | Norbert Barna",
    listDescription: "Artikel von Norbert Barna zu KI-Beratung, Human in the Loop, KI-Verordnung und Webentwicklung, geschrieben aus eigenen Projekten.",
    listKeywords: ["Norbert Barna Artikel", "ki beratung", "human in the loop", "ki verordnung", "webentwicklung"],
    listIntro: "Artikel darüber, wie KI in einen echten Arbeitsablauf kommt, was die KI-Verordnung von Produktteams verlangt und wovon eine Website wirklich abhängt. Jeder Text geht von meinen eigenen Projekten und Entscheidungen aus, nicht von allgemeinen Tipps. Die Zusammenarbeit läuft auf Englisch oder Ungarisch.",
    feedTitle: "Artikel von Norbert Barna",
    feedLabel: "RSS-Feed",
    ctaHeading: "Wenn das Ihr Projekt ist",
    ctaText: (service) => service
      ? `Die Leistung hinter diesem Artikel: ${service}. Wenn Sie schon wissen, was Sie bauen möchten, schreiben Sie mir ein paar Zeilen zu Ihren Zielen. Wir arbeiten auf Englisch oder Ungarisch.`
      : "Wenn Sie ein Projekt haben, zu dem dieser Artikel passt, schreiben Sie mir ein paar Zeilen zu Ihren Zielen, und wir klären, wie man es angeht. Wir arbeiten auf Englisch oder Ungarisch.",
    ctaButton: "Sprechen wir über Ihr Projekt",
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

// The dedicated stylesheet ships as a content-hashed release copy like the
// other first-party families; the build writes the copy, --check expects it.
const WRITING_CSS_SOURCE = join(ROOT, "assets/css/writing.css");
const writingCssRelease = (() => {
  const source = readFileSync(WRITING_CSS_SOURCE, "utf8");
  const digest = createHash("sha256").update(source).digest("hex").slice(0, 12);
  return { file: `assets/css/writing.${digest}.css`, source };
})();

// ---- page parts ------------------------------------------------------------
const json = (value) => JSON.stringify(value, null, 2).replace(/</g, "\\u003c");

function head({ lang, title, description, keywords, canonical, type, image, alternates, extraMeta = [], schema, feedHref }) {
  const template = chrome(lang);
  const copy = COPY[lang];
  // alternates: { en: url, hu: url, de: url } for the languages this page exists in.
  const others = alternates ? Object.keys(alternates).filter((other) => other !== lang) : [];
  // x-default is English, or the first language (site order) the page exists in.
  const xDefault = alternates ? alternates.en || alternates[WRITING_LANGS.find((code) => alternates[code])] : null;
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
    `<meta content="${copy.locale}" property="og:locale"/>${others.map((other) => `<meta content="${COPY[other].locale}" property="og:locale:alternate"/>`).join("")}`,
    `<meta content="${canonical}" property="og:url"/>`,
    ...extraMeta,
    `<meta content="summary_large_image" name="twitter:card"/>`,
    `<meta content="${escapeHtml(title)}" name="twitter:title"/>`,
    `<meta content="${escapeHtml(description)}" name="twitter:description"/>`,
    `<meta content="${image.url}" name="twitter:image"/>`,
    `<meta content="${escapeHtml(image.alt)}" name="twitter:image:alt"/>`,
    `<meta content="width=device-width, initial-scale=1, viewport-fit=cover" name="viewport"/>`,
    `<meta content="#000000" name="theme-color"/>`,
    `<meta content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" name="robots"/>`,
    `<meta content="Norbert Barna" name="author"/>`,
    `<link rel="canonical" href="${canonical}"/>`,
    ...(alternates ? [
      ...WRITING_LANGS.filter((code) => alternates[code]).map((code) => `<link rel="alternate" hreflang="${code}" href="${alternates[code]}"/>`),
      `<link rel="alternate" hreflang="x-default" href="${xDefault}"/>`,
    ] : []),
    `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(copy.feedTitle)}" href="${feedHref}"/>`,
    template.assets,
    `<link rel="stylesheet" href="/${writingCssRelease.file}"/>`,
    `<script type="application/ld+json">\n${json(schema)}\n</script>`,
    `${template.headTail}</head>`,
  ].join("\n");
}

// Chrome from the privacy template, then the shared navigation and footer
// columns from site-chrome.mjs for this page (its language pair, the current
// item, the article lists).
const page = ({ head: headHtml, lang, file, current, link, main, bodyClass, articles }) => {
  const template = chrome(lang);
  const header = template.header.replace(/<body class="utility-page">/, `<body class="utility-page writing-page ${bodyClass}">`);
  if (header === template.header) throw new Error(`${COPY[lang].templateFile}: body class not found`);
  const html = `${headHtml}\n${header}<main id="main-content" tabindex="-1">${main}</main>\n${template.footer}`;
  const pairs = Object.fromEntries(Object.entries(link).map(([other, target]) => [other, { href: urlOf(target.file), alternate: target.alternate }]));
  return applyChrome(html, { page: file, kind: "utility", current, pairs, articles });
};

const person = {
  "@type": "Person", "@id": `${ORIGIN}/#person`, name: "Norbert Barna", alternateName: "Barna Norbert", url: `${ORIGIN}/`, jobTitle: "Product VP", knowsLanguage: ["hu", "en"], sameAs: [LINKEDIN],
};
const imageOf = (article) => article.cover
  ? { url: `${ORIGIN}${article.cover.startsWith("/") ? "" : "/"}${article.cover}`, alt: article.cover_alt }
  : { url: DEFAULT_IMAGE.url, alt: DEFAULT_IMAGE.alt[article.lang] };
// Date, reading time and, on article pages, the author and the update date
// when it differs from publication (so readers and crawlers see freshness).
const meta = (lang, article, byline = false) => {
  const copy = COPY[lang];
  const parts = [];
  if (byline) parts.push(`<a href="${copy.author.path}" rel="author">${copy.author.name}</a>`);
  parts.push(`<time datetime="${article.date.slice(0, 10)}">${copy.date(article.date)}</time>`);
  if (byline && article.updated.slice(0, 10) !== article.date.slice(0, 10)) {
    parts.push(`${copy.updated}: <time datetime="${article.updated.slice(0, 10)}">${copy.date(article.updated)}</time>`);
  }
  parts.push(copy.minutes(readingMinutes(article.markdown)));
  return `<p class="writing-meta">${parts.map((part) => `<span>${part}</span>`).join("")}</p>`;
};

// Home › Írások › article: visible and in the BreadcrumbList.
const breadcrumb = (lang, article) => {
  const copy = COPY[lang];
  const section = SECTIONS[lang];
  return `<nav class="writing-breadcrumb" aria-label="${copy.breadcrumbLabel}"><ol><li><a href="${copy.home.path}">${copy.home.name}</a></li><li><a href="${section.path}">${section.name}</a></li><li aria-current="page">${escapeHtml(article.title)}</li></ol></nav>`;
};

// H2 outline in a sticky rail, so a long article can be scanned (and its sections deep-linked).
const tableOfContents = (lang, body) => {
  const outline = outlineOf(body);
  if (outline.length < 3) return "";
  return `<nav class="writing-toc" aria-labelledby="writing-toc-label"><p class="writing-toc-label" id="writing-toc-label">${COPY[lang].tocLabel}</p><ol>${outline.map(({ id, text }) => `<li><a href="#${id}">${escapeHtml(text)}</a></li>`).join("")}</ol></nav>`;
};

const coverFigure = (article, image, { priority = true } = {}) => article.cover
  ? `<figure class="writing-cover"><img src="${escapeHtml(article.cover)}" alt="${escapeHtml(image.alt)}" width="1200" height="630" decoding="async"${priority ? ' fetchpriority="high"' : ' loading="lazy"'}/></figure>`
  : "";

// One article as a list row (list page and "more articles").
const kicker = (lang, article) => article.service_label
  ? `<p class="writing-kicker">${escapeHtml(article.service_label)}</p>`
  : `<p class="writing-kicker">${SECTIONS[lang].name}</p>`;
const thumb = (article, image, eager = false) => `<figure class="writing-row-media"><img src="${escapeHtml(image.url.slice(ORIGIN.length))}" alt="" width="1200" height="630" decoding="async"${eager ? "" : ' loading="lazy"'}/></figure>`;
function row(lang, article, index, heading = "h2") {
  const section = SECTIONS[lang];
  const image = imageOf(article);
  return `<li class="writing-row"><a class="writing-row-link" href="${section.path}/${article.slug}"><span class="writing-row-number" aria-hidden="true">${String(index).padStart(2, "0")}</span>${thumb(article, image)}<div class="writing-row-copy">${kicker(lang, article)}<${heading} id="${article.slug}">${escapeHtml(article.title)}</${heading}><p>${escapeHtml(article.description)}</p>${meta(lang, article)}</div></a></li>`;
}

const CTA_ID = { hu: "kapcsolodo-szolgaltatas", en: "related-service", de: "passende-leistung" };

// Tables scroll inside their own box on narrow screens.
const wrapTables = (html) => html.replaceAll("<table>", '<div class="writing-table"><table>').replaceAll("</table>", "</table></div>");

function renderArticle(article, articles, links) {
  const { lang } = article;
  const copy = COPY[lang];
  const section = SECTIONS[lang];
  const canonical = `${ORIGIN}${section.path}/${article.slug}`;
  const alternates = article.pairs.length
    ? { [lang]: canonical, ...Object.fromEntries(article.pairs.map((pair) => [pair.lang, `${ORIGIN}${SECTIONS[pair.lang].path}/${pair.slug}`])) }
    : null;
  const image = imageOf(article);
  const body = markdownToHtml(article.markdown, article.source);
  const faq = faqOf(body);
  const sources = citations(article.markdown);
  const words = wordCount(article.markdown);
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
        image: { "@type": "ImageObject", url: image.url, width: 1200, height: 630, caption: image.alt },
        // The opening paragraph is the direct answer; answer engines get it twice.
        abstract: leadParagraph(article.markdown),
        wordCount: words,
        timeRequired: `PT${readingMinutes(article.markdown)}M`,
        ...(article.tags.length ? { keywords: article.tags.join(", ") } : {}),
        ...(article.service_label ? { articleSection: article.service_label } : {}),
        ...(sources.length ? { citation: sources } : {}),
        isAccessibleForFree: true,
        isPartOf: { "@id": `${ORIGIN}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: copy.home.name, item: `${ORIGIN}${copy.home.path === "/" ? "/" : copy.home.path}` },
          { "@type": "ListItem", position: 2, name: section.name, item: `${ORIGIN}${section.path}` },
          { "@type": "ListItem", position: 3, name: article.title },
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
  const others = articles.filter((other) => other.lang === lang && other.slug !== article.slug).slice(0, 2);
  const main = [
    `<article class="writing-article" aria-labelledby="article-title">`,
    `<header class="writing-opening writing-opening-article"><div class="writing-frame">`,
    breadcrumb(lang, article),
    kicker(lang, article),
    `<h1 class="writing-title" id="article-title">${escapeHtml(article.title)}</h1>`,
    `<p class="writing-dek">${escapeHtml(article.description)}</p>`,
    meta(lang, article, true),
    coverFigure(article, image),
    `</div></header>`,
    `<div class="writing-body"><div class="writing-frame">`,
    `<div class="writing-rail">${tableOfContents(lang, body)}</div>`,
    `<div class="writing-prose">`,
    wrapTables(body),
    `<section class="writing-cta" aria-labelledby="${CTA_ID[lang]}">`,
    `<h2 id="${CTA_ID[lang]}">${copy.ctaHeading}</h2>`,
    `<p>${copy.ctaText(service)}</p>`,
    `<p><a class="footer-email hero-work-link" href="${copy.contact}">${copy.ctaButton}</a></p>`,
    `</section>`,
    `</div></div></div>`,
    others.length ? `<aside class="writing-related" aria-labelledby="writing-related-title"><div class="writing-frame"><h2 id="writing-related-title">${copy.moreHeading}</h2><ol class="writing-rows">${others.map((other, index) => row(lang, other, index + 1, "h3")).join("")}</ol></div></aside>` : "",
    `</article>`,
  ].join("\n");
  const extraMeta = [
    `<meta content="${article.date}" property="article:published_time"/>`,
    `<meta content="${article.updated}" property="article:modified_time"/>`,
    `<meta content="${LINKEDIN}" property="article:author"/>`,
    ...(article.service_label ? [`<meta content="${escapeHtml(article.service_label)}" property="article:section"/>`] : []),
    ...article.tags.map((tag) => `<meta content="${escapeHtml(tag)}" property="article:tag"/>`),
  ];
  const file = articleFile(article);
  return page({
    head: head({ lang, title: article.title, description: article.description, keywords: article.tags, canonical, type: "article", image, alternates, extraMeta, schema, feedHref: `${section.path}/feed.xml` }),
    lang, file, current: `${section.path}/${article.slug}`, link: links[file], main, bodyClass: "writing-article-page", articles,
  });
}

function renderList(lang, own, links, articles) {
  const copy = COPY[lang];
  const section = SECTIONS[lang];
  const canonical = `${ORIGIN}${section.path}`;
  const file = `${section.dir}/index.html`;
  const link = links[file];
  const translated = Object.entries(link).filter(([, target]) => target.alternate).map(([other]) => other);
  const alternates = translated.length
    ? { [lang]: canonical, ...Object.fromEntries(translated.map((other) => [other, `${ORIGIN}${SECTIONS[other].path}`])) }
    : null;
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
  const [latest, ...rest] = own;
  const latestImage = imageOf(latest);
  const feature = `<article class="writing-feature"><a class="writing-feature-link" href="${section.path}/${latest.slug}"><figure class="writing-feature-media"><img src="${escapeHtml(latestImage.url.slice(ORIGIN.length))}" alt="" width="1200" height="630" decoding="async" fetchpriority="high"/></figure><div class="writing-feature-copy">${kicker(lang, latest)}<h2 id="${latest.slug}">${escapeHtml(latest.title)}</h2><p>${escapeHtml(latest.description)}</p>${meta(lang, latest)}</div></a></article>`;
  const main = [
    `<section class="writing-opening" aria-labelledby="writing-title"><div class="writing-frame">`,
    `<p class="writing-eyebrow">${copy.eyebrow}</p>`,
    `<h1 class="writing-title" id="writing-title">${copy.listHeading}</h1>`,
    `<p class="writing-dek">${copy.listIntro}</p>`,
    `<p class="writing-count"><span>${copy.count(own.length)}</span><a href="${section.path}/feed.xml">${copy.feedLabel}</a></p>`,
    `</div></section>`,
    `<section class="writing-list" aria-label="${copy.listLabel}"><div class="writing-frame">`,
    feature,
    rest.length ? `<ol class="writing-rows">${rest.map((article, index) => row(lang, article, index + 2)).join("")}</ol>` : "",
    `</div></section>`,
  ].join("\n");
  return page({
    head: head({ lang, title: copy.listTitle, description: copy.listDescription, keywords: copy.listKeywords, canonical, type: "website", image: { url: DEFAULT_IMAGE.url, alt: DEFAULT_IMAGE.alt[lang] }, alternates, schema, feedHref: `${section.path}/feed.xml` }),
    lang, file, current: "articles", link, main, bodyClass: "writing-index", articles,
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
  for (const lang of WRITING_LANGS) {
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
  const names = { en: "English", hu: "Hungarian", de: "German" };
  const lines = ["## Writing", "", "Articles by Norbert Barna, written from his own project work; each opens with its direct answer and ends with a visible FAQ (FAQPage schema). English articles are listed at https://www.barnanorbert.com/writing, Hungarian articles at https://www.barnanorbert.com/hu/irasok and German articles at https://www.barnanorbert.com/de/wissen; RSS at /writing/feed.xml, /hu/irasok/feed.xml and /de/wissen/feed.xml. Work with German-speaking clients runs in English or Hungarian.", ""];
  for (const article of articles) {
    const updated = article.updated.slice(0, 10) !== article.date.slice(0, 10) ? `, updated ${article.updated.slice(0, 10)}` : "";
    lines.push(`- [${article.title}](${ORIGIN}${SECTIONS[article.lang].path}/${article.slug}) (${names[article.lang]}, ${article.date.slice(0, 10)}${updated}): ${article.description}`);
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
for (const lang of WRITING_LANGS) {
  const own = articles.filter((article) => article.lang === lang);
  if (!own.length) continue;
  const { dir } = SECTIONS[lang];
  outputs.set(`${dir}/index.html`, renderList(lang, own, links, articles));
  outputs.set(`${dir}/feed.xml`, renderFeed(lang, own));
  for (const article of own) outputs.set(articleFile(article), renderArticle(article, articles, links));
}
for (const service of articles.map((article) => article.service).filter(Boolean)) {
  const target = service.replace(/^\//, "");
  if (!existsSync(join(ROOT, `${target}.html`)) && !existsSync(join(ROOT, target, "index.html")) && !outputs.has(`${target}.html`)) {
    throw new Error(`service ${service} is not a page in this repository`);
  }
}
if (articles.length) outputs.set(writingCssRelease.file, writingCssRelease.source);
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
