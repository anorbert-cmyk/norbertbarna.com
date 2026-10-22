// One source for the primary navigation and the footer link columns of every
// page (owner request, 2026-10-21): a language menu whose trigger shows the
// current language's flag, a Services group and an Articles (Tudástár) group
// whose article list the writing build keeps current. scripts/build-nav.mjs
// writes these into the static pages and scripts/build-writing.mjs into the
// generated ones, so a label or an order changes in one place.
import { SECTIONS, loadArticles, writingLanguageLinks } from "./writing-content.mjs";
import { HOME_OF } from "./writing-content.mjs";
import { LANGS, TRANSLATIONS, WORK_SLUGS, languageOf, urlOf } from "./service-pages.mjs";

export const LINKEDIN = "https://www.linkedin.com/in/barna-norbert/";

// Flags are 3:2 inline SVGs (no platform emoji, design.md link-icon rule).
// The union flag is drawn at 60x30 and stretched to the shared 3:2 frame.
const FLAGS = {
  hu: `<svg class="nav-flag" viewBox="0 0 60 40" width="21" height="14" aria-hidden="true" focusable="false"><rect width="60" height="40" fill="#fff"/><rect width="60" height="13.4" fill="#CE2939"/><rect y="26.6" width="60" height="13.4" fill="#477050"/></svg>`,
  en: `<svg class="nav-flag" viewBox="0 0 60 30" width="21" height="14" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect width="60" height="30" fill="#012169"/><path d="M0 0l60 30M60 0L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30M60 0L0 30" stroke="#C8102E" stroke-width="2"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></svg>`,
  de: `<svg class="nav-flag" viewBox="0 0 60 40" width="21" height="14" aria-hidden="true" focusable="false"><rect width="60" height="40" fill="#FFCE00"/><rect width="60" height="26.6" fill="#D00"/><rect width="60" height="13.3" fill="#000"/></svg>`,
};

const CHEVRON = `<svg class="nav-chevron" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 6l4 4 4-4"/></svg>`;
const LINKEDIN_ICON = `<svg class="footer-icon" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.6 9.1H4.1V20h2.5V9.1ZM5.35 4.2a1.55 1.55 0 1 0 0 3.1 1.55 1.55 0 0 0 0-3.1ZM19.9 13.25c0-3.18-1.7-4.66-3.98-4.66-1.84 0-2.66 1.02-3.12 1.74V9.1h-2.48c.04.72 0 10.9 0 10.9h2.48v-6.08c0-.33.02-.66.12-.9.27-.66.87-1.35 1.89-1.35 1.33 0 1.87 1.02 1.87 2.5V20h2.22v-6.75Z"/></svg>`;

export const LANGUAGES = {
  en: { code: "EN", name: "English", menu: "Language", home: "/" },
  hu: { code: "HU", name: "Magyar", menu: "Nyelv", home: "/hu" },
  de: { code: "DE", name: "Deutsch", menu: "Sprache", home: "/de" },
};

// Menu copy per language. A `group` renders as a disclosure; `items` are its
// links. Articles are filled in from content/*.md at build time.
export const MENU = {
  en: {
    works: { label: "Works", href: "/works" },
    services: { label: "Services", toggle: "Services" },
    ai: null,
    articles: { label: "Articles", href: SECTIONS.en.path, toggle: "Articles: latest", more: "All articles" },
    about: { label: "About", href: "/about" },
    contact: { label: "Contact", href: "/contact" },
    linkedin: { label: "LinkedIn", aria: "Find me on LinkedIn (opens in a new tab)" },
    footer: { work: "Work", services: "Services", articles: "Articles", allWork: "All work", allArticles: "All articles" },
    serviceLinks: [
      { label: "Web development", href: "/web-development" },
      { label: "AI integration", href: "/ai-integration" },
    ],
    navLabel: "Main navigation",
    footerLabel: "Footer",
  },
  hu: {
    works: { label: "Munkák", href: "/hu/munkak" },
    services: { label: "Szolgáltatások", toggle: "Szolgáltatások" },
    ai: null,
    articles: { label: "Tudástár", href: SECTIONS.hu.path, toggle: "Tudástár: legújabb cikkek", more: "Összes cikk" },
    about: { label: "Rólam", href: "/hu/rolam" },
    contact: { label: "Kapcsolat", href: "/hu/kapcsolat" },
    linkedin: { label: "LinkedIn", aria: "LinkedIn-profilom (új lapon nyílik meg)" },
    footer: { work: "Munkák", services: "Szolgáltatások", articles: "Tudástár", allWork: "Összes munka", allArticles: "Összes cikk" },
    serviceLinks: [
      { label: "Webfejlesztés", href: "/hu/webfejlesztes" },
      { label: "AI tanácsadás és fejlesztés", href: "/hu/ai-tanacsadas-fejlesztes" },
    ],
    navLabel: "Fő navigáció",
    footerLabel: "Lábléc",
  },
  // German (task T8, 2026-10-21): the case studies stay English, so Arbeiten
  // leads to the English works index and the footer lists the English cases.
  // The biography has a German page since 2026-10-22.
  de: {
    works: { label: "Arbeiten", href: "/works" },
    services: { label: "Leistungen", toggle: "Leistungen" },
    ai: null,
    articles: { label: "Wissen", href: SECTIONS.de.path, toggle: "Wissen: neueste Artikel", more: "Alle Artikel" },
    about: { label: "Über mich", href: "/de/ueber-mich" },
    contact: { label: "Kontakt", href: "/de/kontakt" },
    linkedin: { label: "LinkedIn", aria: "Mein LinkedIn-Profil (öffnet in neuem Tab)" },
    footer: { work: "Arbeiten", services: "Leistungen", articles: "Wissen", allWork: "Alle Arbeiten", allArticles: "Alle Artikel" },
    serviceLinks: [
      { label: "Webentwicklung", href: "/de/webentwicklung" },
      { label: "KI-Beratung und Entwicklung", href: "/de/ki-beratung-entwicklung" },
    ],
    navLabel: "Hauptnavigation",
    footerLabel: "Fußzeile",
  },
};

export const NAV_ARTICLE_LIMIT = 5;
export const FOOTER_ARTICLE_LIMIT = 3;
const WORK_FOOTER = ["raiffeisen", "instructure", "bitpanda", "kineticare"];
const WORK_NAMES = { raiffeisen: "Raiffeisen", instructure: "Instructure", bitpanda: "Bitpanda", kineticare: "Kineticare" };

const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

// ---- page inventory ---------------------------------------------------------
// Every static page, with its kind (which chrome variant it carries) and the
// menu item it is. Translations come from PAGE_GROUPS in service-pages.mjs;
// writing pages are added by the writing build from content/.
export const STATIC_PAGES = {
  "index.html": { kind: "home", current: null },
  "works.html": { kind: "work", current: "works" },
  "about.html": { kind: "about", current: "about" },
  "ai-integration.html": { kind: "ai", current: "/ai-integration" },
  "web-development.html": { kind: "ai", current: "/web-development" },
  "privacy.html": { kind: "utility", current: null },
  "contact.html": { kind: "work", current: "contact" },
  "hu/index.html": { kind: "home", current: null },
  "hu/munkak.html": { kind: "work", current: "works" },
  "hu/rolam.html": { kind: "about", current: "about" },
  "hu/ai-tanacsadas-fejlesztes.html": { kind: "ai", current: "/hu/ai-tanacsadas-fejlesztes" },
  "hu/webfejlesztes.html": { kind: "ai", current: "/hu/webfejlesztes" },
  "hu/adatvedelem.html": { kind: "utility", current: null },
  "hu/kapcsolat.html": { kind: "work", current: "contact" },
  "de/index.html": { kind: "ai", current: null },
  "de/ki-beratung-entwicklung.html": { kind: "ai", current: "/de/ki-beratung-entwicklung" },
  "de/webentwicklung.html": { kind: "ai", current: "/de/webentwicklung" },
  "de/datenschutz.html": { kind: "utility", current: null },
  "de/kontakt.html": { kind: "work", current: "contact" },
  "de/ueber-mich.html": { kind: "about", current: "about" },
  ...Object.fromEntries(WORK_SLUGS.map((slug) => [`work/${slug}.html`, { kind: "case", current: null }])),
  ...Object.fromEntries(WORK_SLUGS.map((slug) => [`hu/munka/${slug}.html`, { kind: "case", current: null }])),
};

export { languageOf };

// The destinations of a page in every other language: { hu: {file, alternate}, ... }.
// A translation is an alternate; otherwise the switch leads to that
// language's home (static pages) or list page (writing pages) without rel="alternate".
export function pairsOf(page, writingLinks = writingLanguageLinks()) {
  const lang = languageOf(page);
  const entries = LANGS.filter((other) => other !== lang).map((other) => {
    const link = writingLinks[page]?.[other]
      || (TRANSLATIONS[page]?.[other] ? { file: TRANSLATIONS[page][other], alternate: true } : null)
      || (STATIC_PAGES[page] ? { file: HOME_OF[other], alternate: false } : null);
    if (!link) throw new Error(`${page}: no language destination for ${other}`);
    return [other, { href: urlOf(link.file), alternate: link.alternate }];
  });
  return Object.fromEntries(entries);
}

// ---- rendering --------------------------------------------------------------
const linkClass = (kind) => kind === "about" ? "nav-link w-nav-link" : "nav-link white w-nav-link";

function plainLink(kind, item, current, extraClass = "") {
  const classes = [extraClass, linkClass(kind), current ? "w--current" : ""].filter(Boolean).join(" ");
  return `<a${current ? ' aria-current="page"' : ""} class="${classes}" href="${item.href}">${esc(item.label)}</a>`;
}

function group({ kind, id, label, toggleLabel, href, items, currentHref, lang }) {
  const open = items.some((item) => !item.more && item.href === currentHref);
  const list = items.map((item) => {
    const current = !item.more && item.href === currentHref;
    const more = item.more ? " nav-group-more" : "";
    return `<li><a${current ? ' aria-current="page"' : ""} class="nav-group-link${more}" href="${item.href}">${esc(item.label)}</a></li>`;
  }).join("");
  const trigger = href
    // Split control: the label is a link to the section, the chevron opens the list.
    ? `${plainLink(kind, { label, href }, href === currentHref)}<button type="button" class="nav-group-toggle" data-nav-toggle aria-expanded="false" aria-controls="${id}" aria-label="${esc(toggleLabel)}"${open ? " data-current" : ""}>${CHEVRON}</button>`
    : `<button type="button" class="${linkClass(kind)} nav-group-trigger" data-nav-toggle aria-expanded="false" aria-controls="${id}"${open ? " data-current" : ""}>${esc(label)}${CHEVRON}</button>`;
  return `<div class="nav-group" data-nav-group lang="${lang}">${trigger}<div class="nav-group-panel" id="${id}" hidden><ul class="nav-group-list">${list}</ul></div></div>`;
}

export function languageMenu({ lang, pairs }) {
  const own = LANGUAGES[lang];
  const items = Object.entries(LANGUAGES).map(([code, language]) => {
    if (code === lang) return `<li><span class="nav-lang-current" aria-current="true" lang="${code}">${FLAGS[code]}<span>${language.name}</span></span></li>`;
    const pair = pairs[code];
    if (!pair) throw new Error(`language menu: no ${code} destination`);
    return `<li><a class="nav-group-link lang-switch" href="${pair.href}" hreflang="${code}" lang="${code}"${pair.alternate ? ' rel="alternate"' : ""}>${FLAGS[code]}<span>${language.name}</span></a></li>`;
  }).join("");
  return `<div class="nav-group nav-lang" data-nav-group><button type="button" class="nav-lang-trigger" data-nav-toggle aria-expanded="false" aria-controls="nav-languages" aria-label="${esc(`${own.menu}: ${own.code}, ${own.name}`)}">${FLAGS[lang]}<span class="nav-lang-code" aria-hidden="true">${own.code}</span><span class="nav-lang-name" aria-hidden="true">${own.name}</span>${CHEVRON}</button><div class="nav-group-panel nav-lang-panel" id="nav-languages" hidden><ul class="nav-group-list">${items}</ul></div></div>`;
}

// Articles of one language for the menu: newest first, capped, then "All".
export function navArticles(lang, articles) {
  const own = articles.filter((article) => article.lang === lang).slice(0, NAV_ARTICLE_LIMIT);
  return own.map((article) => ({ label: article.title, href: `${SECTIONS[lang].path}/${article.slug}` }));
}

/**
 * The <nav id="primary-navigation"> of a page.
 * @param {object} options
 * @param {string} options.page   repository path (index.html, hu/munka/benker.html, writing/x.html)
 * @param {string} options.kind   home | work | case | about | ai | utility
 * @param {string|null} options.current  works | about | ai | contact | a current href
 * @param {object} options.pairs  { en: {href, alternate}, hu: {...} } other-language destinations
 * @param {Array}  options.articles published articles (loadArticles())
 */
export function renderPrimaryNav({ page, kind, current, pairs, articles }) {
  const lang = languageOf(page);
  const menu = MENU[lang];
  const currentHref = current && current.startsWith("/") ? current : null;
  const own = articles.filter((article) => article.lang === lang);
  const parts = [];
  parts.push(plainLink(kind, menu.works, current === "works", kind === "case" ? "case-nav-works" : ""));
  if (menu.services) {
    parts.push(group({ kind, id: "nav-services", label: menu.services.label, items: menu.serviceLinks, currentHref, lang }));
  } else if (menu.ai) {
    parts.push(plainLink(kind, menu.ai, current === "ai"));
  }
  if (own.length) {
    const items = [...navArticles(lang, articles), { label: menu.articles.more, href: menu.articles.href, more: true }];
    parts.push(group({ kind, id: "nav-articles", label: menu.articles.label, toggleLabel: menu.articles.toggle, href: menu.articles.href, items, currentHref: current === "articles" ? menu.articles.href : currentHref, lang }));
  }
  parts.push(plainLink(kind, menu.about, current === "about"));
  parts.push(plainLink(kind, menu.contact, current === "contact"));
  if (kind === "home") {
    parts.push(`<div class="nav-cta"><a class="footer-contact-link" href="${LINKEDIN}" target="_blank" rel="noopener noreferrer" aria-label="${esc(menu.linkedin.aria)}">${LINKEDIN_ICON}<span class="home-nav-label">${menu.linkedin.label}</span></a></div>`);
  } else {
    parts.push(`<a aria-label="${esc(menu.linkedin.aria)}" class="${linkClass(kind)}" href="${LINKEDIN}" target="_blank" rel="noopener noreferrer">${menu.linkedin.label}</a>`);
  }
  parts.push(languageMenu({ lang, pairs }));
  const label = menu.navLabel;
  const navClass = kind === "about" ? 'class="nav-menu w-nav-menu"' : 'class="nav-menu grey w-nav-menu" role="navigation"';
  return `<nav id="primary-navigation" ${navClass} aria-label="${label}"><div class="nav-menu-area">${parts.join("")}</div></nav>`;
}

// Footer link columns: Work (locked four cases), Services, Articles.
export function renderFooterNav({ page, articles }) {
  const lang = languageOf(page);
  const menu = MENU[lang];
  const workBase = lang === "hu" ? "/hu/munka" : "/work";
  const worksHref = lang === "de" ? "/works" : menu.works.href;
  const work = WORK_FOOTER.map((slug) => `<li><a href="${workBase}/${slug}">${WORK_NAMES[slug]}</a></li>`).join("");
  const services = menu.serviceLinks.map((item) => `<li><a href="${item.href}">${esc(item.label)}</a></li>`).join("");
  const own = articles.filter((article) => article.lang === lang).slice(0, FOOTER_ARTICLE_LIMIT);
  const articleColumn = own.length
    ? `<div class="footer-col footer-col-articles"><p class="footer-col-title">${menu.footer.articles}</p><ul class="footer-col-list">${own.map((article) => `<li><a href="${SECTIONS[lang].path}/${article.slug}">${esc(article.title)}</a></li>`).join("")}<li><a href="${menu.articles.href}">${menu.footer.allArticles}</a></li></ul></div>`
    : "";
  return `<nav class="footer-nav" aria-label="${menu.footerLabel}"><div class="footer-col"><p class="footer-col-title">${menu.footer.work}</p><ul class="footer-col-list">${work}<li><a href="${worksHref}">${menu.footer.allWork}</a></li></ul></div><div class="footer-col footer-col-services"><p class="footer-col-title">${menu.footer.services}</p><ul class="footer-col-list">${services}</ul></div>${articleColumn}</nav>`;
}

// Replace the primary navigation (and the footer columns when the page has
// them) inside a page's HTML. Returns the new HTML.
export function applyChrome(html, { page, kind, current, pairs, articles }) {
  const nav = renderPrimaryNav({ page, kind, current, pairs, articles });
  const pattern = /<nav\b[^>]*\bid="primary-navigation"[^>]*>[\s\S]*?<\/nav>/;
  if (!pattern.test(html)) throw new Error(`${page}: primary navigation not found`);
  return html.replace(pattern, () => nav).replace(/<nav class="footer-nav"[^>]*>[\s\S]*?<\/nav>/, () => renderFooterNav({ page, articles }));
}

export { loadArticles };
