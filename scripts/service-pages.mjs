// Keep client landing pages in every site-wide verification inventory.
// These are service pages, not portfolio Articles.
export const SERVICE_PAGES = ["ai-integration.html", "hu/ai-integracio.html"];
export const PRIVACY_PAGES = ["privacy.html", "hu/adatvedelem.html"];
// The contact form pages (owner request, 2026-10-06).
export const CONTACT_PAGES = ["contact.html", "hu/kapcsolat.html"];
export const UTILITY_PAGES = [...SERVICE_PAGES, ...PRIVACY_PAGES, ...CONTACT_PAGES];
export const isServicePage = (page) => SERVICE_PAGES.includes(page);
export const isContactPage = (page) => CONTACT_PAGES.includes(page);

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
export const baseOf = (page) => HU_MIRRORS[page] || page;
export const isHungarian = (page) => page.startsWith("hu/");
// URL path of a page file: index.html -> /, hu/index.html -> /hu, x.html -> /x.
export const urlOf = (page) => page === "index.html" ? "/" : `/${page.replace(/(?:\/index)?\.html$/, "")}`;
export const assetPrefix = (page) =>
  page === "404.html" || UTILITY_PAGES.includes(page) || HU_MIRRORS[page] ? "/" : page.startsWith("work/") ? "../" : "";
