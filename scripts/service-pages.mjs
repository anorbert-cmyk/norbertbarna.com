import { writingLanguageLinks, writingPages } from "./writing-content.mjs";

// The site's languages, in the order the language menu lists them. English
// is the x-default of every translation group.
export const LANGS = ["en", "hu", "de"];
export const languageOf = (page) => page.startsWith("hu/") ? "hu" : page.startsWith("de/") ? "de" : "en";

// Keep client landing pages in every site-wide verification inventory.
// These are service pages, not portfolio Articles.
export const SERVICE_PAGES = ["ai-integration.html", "web-development.html", "hu/ai-tanacsadas-fejlesztes.html", "hu/webfejlesztes.html",
  "de/ki-beratung-entwicklung.html", "de/webentwicklung.html"];
// Service pages built on the extended template (2026-10-21 SEO plan):
// use cases, scope, price factors and eight questions with matching FAQPage data.
export const EXTENDED_SERVICE_PAGES = SERVICE_PAGES;
export const PRIVACY_PAGES = ["privacy.html", "hu/adatvedelem.html", "de/datenschutz.html"];
// The contact form pages (owner request, 2026-10-06; German form 2026-10-21).
export const CONTACT_PAGES = ["contact.html", "hu/kapcsolat.html", "de/kontakt.html"];
// The German entry page (task T8, 2026-10-21): a short introduction with the
// two service offers, on the service-page board, paired with the two homes.
export const ENTRY_PAGES = ["de/index.html"];
export const UTILITY_PAGES = [...SERVICE_PAGES, ...PRIVACY_PAGES, ...CONTACT_PAGES, ...ENTRY_PAGES];
export const isServicePage = (page) => SERVICE_PAGES.includes(page);
export const isContactPage = (page) => CONTACT_PAGES.includes(page);
export const isEntryPage = (page) => ENTRY_PAGES.includes(page);

// Hungarian mirrors of the portfolio pages (owner request, 2026-10-06: the
// language switch changes the whole site). Each HU page keeps its English
// counterpart's structure, so page-type checks run against baseOf(page).
export const WORK_SLUGS = ["raiffeisen", "instructure", "bitpanda", "benker", "sportsgambit", "kineticare", "onrobot"];
export const HU_MIRRORS = {
  "hu/index.html": "index.html",
  "hu/munkak.html": "works.html",
  "hu/rolam.html": "about.html",
  ...Object.fromEntries(WORK_SLUGS.map((slug) => [`hu/munka/${slug}.html`, `work/${slug}.html`])),
};
export const HU_PAGES = Object.keys(HU_MIRRORS);
export const HU_WORK_PAGES = HU_PAGES.filter((page) => page.startsWith("hu/munka/"));
// German mirrors (owner request, 2026-10-22: a German page links only German
// pages): the biography, the works index and every case study.
export const DE_MIRRORS = {
  "de/arbeiten.html": "works.html",
  "de/ueber-mich.html": "about.html",
  ...Object.fromEntries(WORK_SLUGS.map((slug) => [`de/arbeit/${slug}.html`, `work/${slug}.html`])),
};
export const DE_PAGES = Object.keys(DE_MIRRORS);
export const DE_WORK_PAGES = DE_PAGES.filter((page) => page.startsWith("de/arbeit/"));
export const MIRRORS = { ...HU_MIRRORS, ...DE_MIRRORS };
export const baseOf = (page) => MIRRORS[page] || page;
export const isHungarian = (page) => page.startsWith("hu/");

// Translation groups of the static pages: every page lists its translations
// (two or three languages). A page outside a group has no translation.
export const PAGE_GROUPS = [
  ["index.html", "hu/index.html", "de/index.html"],
  ["ai-integration.html", "hu/ai-tanacsadas-fejlesztes.html", "de/ki-beratung-entwicklung.html"],
  ["web-development.html", "hu/webfejlesztes.html", "de/webentwicklung.html"],
  ["privacy.html", "hu/adatvedelem.html", "de/datenschutz.html"],
  ["contact.html", "hu/kapcsolat.html", "de/kontakt.html"],
  ["works.html", "hu/munkak.html", "de/arbeiten.html"],
  ["about.html", "hu/rolam.html", "de/ueber-mich.html"],
  ...WORK_SLUGS.map((slug) => [`work/${slug}.html`, `hu/munka/${slug}.html`, `de/arbeit/${slug}.html`]),
];
// { "hu/index.html": { en: "index.html", hu: "hu/index.html", de: "de/index.html" }, ... }
export const TRANSLATIONS = Object.fromEntries(PAGE_GROUPS.flatMap((group) =>
  group.map((page) => [page, Object.fromEntries(group.map((member) => [languageOf(member), member]))])));
// Service pages and their translations (every service page has all three).
export const SERVICE_PAIRS = Object.fromEntries(SERVICE_PAGES.map((page) => [page, TRANSLATIONS[page]]));

// URL path of a page file: index.html -> /, hu/index.html -> /hu, x.html -> /x.
export const urlOf = (page) => page === "index.html" ? "/" : `/${page.replace(/(?:\/index)?\.html$/, "")}`;
export const assetPrefix = (page) =>
  page === "404.html" || UTILITY_PAGES.includes(page) || MIRRORS[page] || WRITING_PAGES.includes(page) ? "/" : page.startsWith("work/") ? "../" : "";

// Writing (Írások, Articles, Wissen): pages generated from content/*.md by
// build-writing.mjs. List pages (<section>/index.html) are CollectionPages,
// the rest are Articles. WRITING_LANGUAGE_LINKS gives each page's language
// links: per other language a translation (alternate) or that language's
// list or home page.
export const WRITING_PAGES = writingPages();
export const WRITING_LANGUAGE_LINKS = writingLanguageLinks();
export const isWritingPage = (page) => WRITING_PAGES.includes(page);
export const isWritingList = (page) => isWritingPage(page) && page.endsWith("/index.html");

// Every indexable content page, in the order the checks and the sitemap use.
export const CONTENT_PAGES = ["index.html", "works.html", "about.html", ...UTILITY_PAGES,
  ...WORK_SLUGS.map((slug) => `work/${slug}.html`), ...HU_PAGES, ...DE_PAGES, ...WRITING_PAGES];

// Per-language site copy the checks share: contact page, privacy page,
// project action label, LinkedIn label.
export const SITE_COPY = {
  en: { home: "/", contact: "/contact", privacy: "/privacy", project: "Discuss your project", linkedin: "Find me on LinkedIn (opens in a new tab)", privacyAction: "Contact form", workRoot: "/work/" },
  hu: { home: "/hu", contact: "/hu/kapcsolat", privacy: "/hu/adatvedelem", project: "Beszéljünk a projektedről", linkedin: "LinkedIn-profilom (új lapon nyílik meg)", privacyAction: "Kapcsolatfelvételi űrlap", workRoot: "/hu/munka/" },
  de: { home: "/de", contact: "/de/kontakt", privacy: "/de/datenschutz", project: "Sprechen wir über Ihr Projekt", linkedin: "Mein LinkedIn-Profil (öffnet in neuem Tab)", privacyAction: "Kontaktformular", workRoot: "/de/arbeit/" },
};
