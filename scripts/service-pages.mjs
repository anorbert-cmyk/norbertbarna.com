// Keep client landing pages in every site-wide verification inventory.
// These are service pages, not portfolio Articles.
export const SERVICE_PAGES = ["ai-integration.html", "hu/ai-integracio.html"];
export const PRIVACY_PAGES = ["privacy.html", "hu/adatvedelem.html"];
export const UTILITY_PAGES = [...SERVICE_PAGES, ...PRIVACY_PAGES];
export const isServicePage = (page) => SERVICE_PAGES.includes(page);
export const assetPrefix = (page) =>
  page === "404.html" || UTILITY_PAGES.includes(page) ? "/" : page.startsWith("work/") ? "../" : "";
