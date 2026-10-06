import { expect, test } from "@playwright/test";

const ROUTES = [["en", "/ai-integration"], ["hu", "/hu/ai-integracio"]];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
});

async function open(page, path) {
  const response = await page.goto(path, { waitUntil: "load" });
  expect(response.status()).toBe(200);
  await page.waitForFunction(() => !document.fonts || document.fonts.status === "loaded");
}

async function expectWorkflowInFlow(page) {
  const state = await page.locator("#workflow").evaluate((section) => {
    const box = section.getBoundingClientRect();
    const previous = section.previousElementSibling.getBoundingClientRect();
    const next = section.nextElementSibling.getBoundingClientRect();
    const unavailable = [];
    const clipped = [];
    for (const element of section.querySelectorAll("h2, h3, p")) {
      const bounds = element.getBoundingClientRect();
      for (let ancestor = element; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (style.display === "none" || style.visibility !== "visible" || Number(style.opacity) < .99 || ancestor.hidden || ancestor.inert || ancestor.getAttribute("aria-hidden") === "true") unavailable.push(element.textContent);
      }
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const range = document.createRange(); range.selectNode(walker.currentNode);
        for (const rect of range.getClientRects()) {
          if (rect.width && (rect.left < -1 || rect.right > innerWidth + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1)) clipped.push(element.textContent);
        }
      }
      if (bounds.bottom > next.top + 1) clipped.push(element.textContent);
    }
    return { position: getComputedStyle(section).position, previousBottom: previous.bottom, top: box.top, bottom: box.bottom, nextTop: next.top, unavailable, clipped, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  expect(state.position, "the extended content is never part of the pinned scene").toBe("static");
  expect(state.top).toBeGreaterThanOrEqual(state.previousBottom - 1);
  expect(state.nextTop, "expanded reading rows make space before the evidence list").toBeGreaterThanOrEqual(state.bottom - 1);
  expect(state.unavailable, "every workflow heading and paragraph remains available").toEqual([]);
  expect(state.clipped, "all text fits within the viewport and its natural-flow chapter").toEqual([]);
  expect(state.overflow).toBeLessThanOrEqual(1);
}

for (const [language, path] of ROUTES) {
  test(`${language}: expanded workflow has accessible steps and distinct case evidence`, async ({ page }) => {
    await open(page, path);
    const workflow = page.getByRole("region", { name: language === "en" ? "How a useful question becomes a working product." : "Egy jó kérdéstől a működő termékig." });
    await expect(workflow).toHaveAttribute("id", "workflow");
    await expect(workflow.locator("ol > li")).toHaveCount(5);
    await expect(workflow.getByRole("heading", { level: 3 })).toHaveCount(5);
    await expect(workflow.locator(".ai-workflow-output")).toHaveCount(5);
    await expect(page.locator("#pieces [data-ai-step]")).toHaveCount(3);
    await expect(page.locator("#pieces #workflow, #pieces a, #pieces button")).toHaveCount(0);
    // Each language links its own case and About pages (whole-site language switch, 2026-10-06).
    const caseRoot = language === "hu" ? "/hu/munka/" : "/work/";
    const about = language === "hu" ? "/hu/rolam" : "/about";
    await expect(page.locator(`#selected-work a[href="${caseRoot}sportsgambit"]`)).toHaveAccessibleName(/SportsGambit.*MVP/);
    await expect(page.locator(`#selected-work a[href="${about}#perspective"]`)).toHaveAccessibleName(/BlackRock/);
    const evidence = await page.locator("#selected-work a[href]").evaluateAll((links) => links.map((link) => ({
      href: link.getAttribute("href"), hreflang: link.getAttribute("hreflang") })));
    expect(evidence.length).toBeGreaterThanOrEqual(5);
    for (const link of evidence) {
      expect(link.href, "case evidence stays in the page language").toMatch(language === "hu" ? /^\/hu\/(munka\/|rolam)/ : /^\/(work\/|about)/);
      expect(link.hreflang, "same-language evidence carries no cross-language hreflang").toBeNull();
    }
    await expectWorkflowInFlow(page);
  });

  for (const { width, enlarged } of [{ width: 320, enlarged: false }, { width: 320, enlarged: true }, { width: 390, enlarged: true }, { width: 1440, enlarged: true }]) {
    test(`${language}: workflow reflows at ${width}px${enlarged ? " with 200% text" : ""}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, path);
      if (enlarged) {
        await page.evaluate(() => {
          const sizes = [...document.querySelectorAll("#workflow, #workflow *, .ai-related-context, .ai-related-context *")].map((element) => [element, parseFloat(getComputedStyle(element).fontSize)]);
          for (const [element, size] of sizes) element.style.setProperty("font-size", `${size * 2}px`, "important");
        });
      }
      await expectWorkflowInFlow(page);
      const overlap = await page.locator(".ai-workflow-steps > li").evaluateAll((rows) => rows.flatMap((row) => {
        const heading = row.querySelector("h3").getBoundingClientRect();
        const body = row.querySelector("p").getBoundingClientRect();
        return heading.right > body.left + 1 && heading.left < body.right - 1 && heading.bottom > body.top + 1 && heading.top < body.bottom - 1 ? [row.textContent] : [];
      }));
      expect(overlap, "headings and body copy never collide as text grows").toEqual([]);
      for (const link of await page.locator(".ai-related-context a").all()) {
        await link.focus();
        await expect(link).toBeFocused();
        expect(await link.evaluate((element) => [...element.getClientRects()].every((box) => box.left >= -1 && box.right <= innerWidth + 1)), "enlarged contextual anchors remain inside the viewport").toBe(true);
      }
    });
  }

  test(`${language}: practical workflow is complete without JavaScript`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 720 } });
    const page = await context.newPage();
    try {
      await open(page, path);
      await expect(page.locator("#workflow ol > li")).toHaveCount(5);
      await expectWorkflowInFlow(page);
    } finally { await context.close(); }
  });
}

test("contextual case and Works links form a crawlable route back to the service workflow", async ({ request, page }) => {
  const destinations = new Set();
  for (const [path, selector, expectedHref] of [
    ["/work/instructure", '.summary a[href="/ai-integration#workflow"]', "/ai-integration#workflow"],
    ["/work/sportsgambit", '.summary a[href="/ai-integration#workflow"]', "/ai-integration#workflow"],
    ["/work/kineticare", '.summary a[href="/ai-integration#workflow"]', "/ai-integration#workflow"],
    ["/works", '.project-index-intro p a[href="/ai-integration"]', "/ai-integration"],
    // The Hungarian mirror routes back to the Hungarian service page, never to the English one.
    ["/hu/munka/instructure", '.summary a[href="/hu/ai-integracio#workflow"]', "/hu/ai-integracio#workflow"],
    ["/hu/munka/sportsgambit", '.summary a[href="/hu/ai-integracio#workflow"]', "/hu/ai-integracio#workflow"],
    ["/hu/munka/kineticare", '.summary a[href="/hu/ai-integracio#workflow"]', "/hu/ai-integracio#workflow"],
    ["/hu/munkak", '.project-index-intro p a[href="/hu/ai-integracio"]', "/hu/ai-integracio"],
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const links = await page.evaluate(({ html, selector }) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return [...doc.querySelectorAll(selector)].map((link) => ({ href: link.getAttribute("href"), text: link.textContent.trim(), tag: link.tagName, context: link.parentElement.tagName }));
    }, { html: await response.text(), selector });
    expect(links, `${path} has one in-copy link, distinct from navigation`).toHaveLength(1);
    expect(links[0]).toMatchObject({ href: expectedHref, tag: "A", context: "P" });
    expect(links[0].text.length).toBeGreaterThan(8);
    expect(links[0].text).not.toMatch(/^(click here|read more|learn more)$/i);
    destinations.add(expectedHref);
  }
  destinations.add("/about#perspective");
  destinations.add("/hu/rolam#perspective");
  for (const destination of destinations) {
    const [path, fragment] = destination.split("#");
    const response = await request.get(path);
    expect(response.status(), `${path} resolves`).toBe(200);
    if (fragment) expect(await page.evaluate(({ html, fragment }) => Boolean(new DOMParser().parseFromString(html, "text/html").getElementById(fragment)), { html: await response.text(), fragment }), `${destination} resolves to an actual section`).toBe(true);
  }
});
