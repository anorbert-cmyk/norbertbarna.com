// Keep client landing pages in every site-wide verification inventory.
// These are service pages, not portfolio Articles.
export const SERVICE_PAGES = ["ai-integration.html", "hu/ai-integracio.html"];
export const isServicePage = (page) => SERVICE_PAGES.includes(page);
export const assetPrefix = (page) =>
  page === "404.html" || isServicePage(page) ? "/" : page.startsWith("work/") ? "../" : "";
