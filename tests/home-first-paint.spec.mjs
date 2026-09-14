import { expect, test } from "@playwright/test";

test("the short desktop home paints its final navigation layout before the composition controller loads", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
    window.__firstPaintShifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__firstPaintShifts.push(entry.value);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.route(/\/vendor\/(?:gsap|ScrollTrigger)\.min\.js$/, (route) => route.abort());
  let releaseComposition;
  const gate = new Promise((resolve) => { releaseComposition = resolve; });
  let requested = false;
  await page.route(/\/home-composition\.[a-f\d]+\.js$/, async (route) => {
    requested = true;
    await gate;
    await route.continue();
  });
  const rects = () => page.locator('.navbar, .navbar a[href="/works"], .navbar a[href="/about"], .navbar .footer-contact-link, .navbar button.footer-email, .home-mast-intro, .home-mast-proof-chips, #works').evaluateAll((elements) => elements.map((element) => ({
    tag: element.tagName, text: element.textContent.trim().slice(0,40), box: element.getBoundingClientRect().toJSON(),
  })));
  const paint = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  let early;
  try {
    await page.goto("/", { waitUntil: "commit" });
    await expect.poll(() => requested).toBe(true);
    // The head's font loader may register faces after an earlier fonts.ready
    // promise resolved. Sample once actual authored faces are loaded.
    await page.waitForFunction(() => document.fonts.status === "loaded" && ["Inter", "Funnel Display"].every((family) =>
      [...document.fonts].some((face) => face.family.replace(/["']/g, "") === family && face.status === "loaded")));
    await paint();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Product VP");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(".home-mast-display")).toBeInViewport();
    const intro = page.locator(".home-mast-intro");
    await expect(intro).toBeVisible();
    await expect(intro).toHaveCSS("opacity", "1");
    await expect(page.locator(".home-intro-work")).toBeInViewport();
    await expect(page.locator(".home-intro-work")).toHaveAttribute("href", "/works");
    early = await rects();
  } finally {
    releaseComposition();
  }
  await page.waitForLoadState("load");
  await expect.poll(() => page.evaluate(() => window.PortfolioHomeMorph?.progress)).toBe(1);
  await paint();
  const enhanced = await rects();
  expect(enhanced.map(({tag,text}) => ({tag,text}))).toEqual(early.map(({tag,text}) => ({tag,text})));
  for (let index = 0; index < early.length; index++) {
    for (const dimension of ["x", "y", "width", "height"]) {
      expect(Math.abs(enhanced[index].box[dimension] - early[index].box[dimension]),
        `${early[index].tag} ${early[index].text}: ${dimension} stays in its first painted position`).toBeLessThanOrEqual(.5);
    }
  }
  expect(await page.evaluate(() => window.__firstPaintShifts.reduce((total, value) => total + value, 0)),
    "all initial layout shifts count, including before the delayed controller; no reset or input exemption").toBeLessThan(.1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  const action = page.locator(".home-intro-work");
  expect(await action.evaluate((link) => {
    const box = link.getBoundingClientRect();
    return link.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  }), "the first reading action remains an exposed native link").toBe(true);
  await action.click();
  await expect(page).toHaveURL(/\/works$/);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  test("the expanded mobile navigation reserves space for the visible home title and native work links", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const nav = page.locator(".navbar");
    const mast = page.locator(".home-mast");
    const title = page.locator(".home-mast-display");
    const navBox = await nav.boundingBox();
    const mastBox = await mast.boundingBox();
    const titleBox = await title.boundingBox();
    expect(navBox.y + navBox.height, "the expanded no-JS navigation owns space before the hero").toBeLessThanOrEqual(mastBox.y + .5);
    await expect(title).toBeVisible();
    await expect(title).toHaveText("Product VP", { useInnerText: true });
    expect(titleBox.y, "the visible role starts below the navigation").toBeGreaterThanOrEqual(navBox.y + navBox.height);
    expect(titleBox.y + titleBox.height, "the role remains in the first mobile viewport").toBeLessThanOrEqual(844);
    const exposed = (locator) => locator.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    });
    expect(await exposed(title), "the painted title is not behind an opaque layer").toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

    const works = page.locator('.navbar a[href="/works"]');
    await expect(works).toBeVisible();
    expect(await exposed(works), "the expanded Works navigation is a native hit target").toBe(true);
    await works.click();
    await expect(page).toHaveURL(/\/works$/);
    await page.goBack({ waitUntil: "load" });
    const action = page.locator(".home-intro-work");
    await action.scrollIntoViewIfNeeded();
    await expect(action).toBeVisible();
    expect(await exposed(action), "the product introduction CTA remains an exposed native link").toBe(true);
    await action.click();
    await expect(page).toHaveURL(/\/works$/);
  });
});
