import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

let errors;
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
    window.__storyCLS = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__storyCLS += entry.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
});
test.afterEach(() => expect(errors, "About has no uncaught runtime errors").toEqual([]));

async function settle(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function openStory(page, suffix = "") {
  const response = await page.goto(`/about${suffix}`, { waitUntil: "load" });
  expect(response.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => window.PortfolioStoryMotion?.state)).toMatch(/active|paused|reduced/);
  await settle(page);
}
async function overflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}
async function alignReading(page, selector) {
  await page.locator(selector).evaluate((element) => scrollTo(0, scrollY + element.getBoundingClientRect().top - 120));
  await settle(page);
}
async function readable(locator) {
  await expect(locator).toBeVisible();
  const state = await locator.evaluate((element) => {
    let opacity = 1;
    for (let node = element; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    return { opacity, transform: getComputedStyle(element).transform, box: element.getBoundingClientRect().toJSON(),
      documentTop: element.getBoundingClientRect().top + scrollY };
  });
  expect(state.opacity).toBeGreaterThanOrEqual(.99);
  expect(state.transform, "editorial text does not become a decorative motion layer").toBe("none");
  return state;
}
async function stableNav(page) {
  const state = await page.locator(".navbar").evaluate((nav) => {
    const css = getComputedStyle(nav);
    return { top: nav.getBoundingClientRect().top, opacity: Number(css.opacity), animations: nav.getAnimations().length };
  });
  expect(Math.abs(state.top)).toBeLessThanOrEqual(.5);
  expect(state.opacity).toBe(1);
  expect(state.animations).toBe(0);
}
async function navTextContrast(link) {
  const ratio = await link.evaluate((element) => {
    const rgb = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const luminance = (color) => color.map((value) => value / 255)
      .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    let backing;
    for (let node = element; node; node = node.parentElement) {
      const color = getComputedStyle(node).backgroundColor;
      const channels = color.match(/[\d.]+/g).map(Number);
      if (channels.length === 3 || channels[3] === 1) { backing = rgb(color); break; }
    }
    if (!backing) return 0;
    const ink = luminance(rgb(getComputedStyle(element).color)), paper = luminance(backing);
    return (Math.max(ink, paper) + .05) / (Math.min(ink, paper) + .05);
  });
  expect(ratio, "menu text remains AA against its actual opaque backing").toBeGreaterThanOrEqual(4.5);
}

test("About remains an explicit story draft with canonical identity and native destinations", async ({ page }) => {
  await openStory(page);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText(/A story in\s*motion\./);
  await expect(page.locator("body")).toHaveAttribute("data-story-draft", "");
  await expect(page.locator(".story-draft-note")).toContainText("The full personal story is being written");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.barnanorbert.com/about");
  await expect(page.locator('.navbar a[aria-current="page"]')).toHaveAttribute("href", "/about");
  await expect(page.locator('.navbar a[href="/works"]')).toHaveCount(1);
  await expect(page.locator('.navbar a[href="/"]')).toHaveCount(1);
  const sections = await page.locator("[data-story-step]").evaluateAll((links) => links.map((link) => {
    const href = link.getAttribute("href");
    return { href, target: Boolean(document.querySelector(href)), label: link.getAttribute("aria-label") };
  }));
  expect(sections.map(({ href }) => href)).toEqual(["#beginnings", "#perspective", "#next"]);
  for (const section of sections) { expect(section.target).toBe(true); expect(section.label).toBeTruthy(); }
  const schema = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(schema)).toMatchObject({ "@type": "AboutPage", mainEntity: { name: "Norbert Barna", jobTitle: "Product VP" } });
  await page.locator("#next").scrollIntoViewIfNeeded();
  await readable(page.locator("#next-title"));
  await overflow(page);
});

test("desktop native scroll changes the visible camera, then releases to stable readable chapters", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStory(page);
  const stage = page.locator("[data-story-stage]");
  await expect(page.locator("main[data-story]")).toHaveAttribute("data-story-mode", "cinematic");
  const paint = async () => createHash("sha256").update(await stage.screenshot()).digest("hex");
  const before = await paint();
  await page.mouse.wheel(0, 350);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);
  await settle(page);
  expect(await paint(), "the visible scene actually responds to native scrolling").not.toBe(before);
  await stableNav(page);
  await alignReading(page, "#beginnings-title");
  const paragraph = page.locator("#beginnings .story-reading > p").nth(1);
  const first = await readable(paragraph);
  await page.mouse.wheel(0, 100);
  await settle(page);
  const second = await readable(paragraph);
  expect(Math.abs(first.documentTop - second.documentTop), "reading follows normal document flow").toBeLessThanOrEqual(1);
  expect(second.box.width).toBe(first.box.width);
  await page.locator("#perspective").scrollIntoViewIfNeeded();
  await readable(page.locator("#perspective-title"));
  await expect(page.locator('[data-story-step][aria-current="location"]')).toHaveAttribute("href", "#perspective");
  await stableNav(page);
  await overflow(page);
});

test("Pause preserves the reading action and freezes decoration while page scrolling remains native", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openStory(page);
  const toggle = page.locator("[data-story-motion-toggle]");
  await alignReading(page, "[data-story-motion-toggle]");
  expect((await toggle.boundingBox()).height, "the motion control retains the site's minimum target height").toBeGreaterThanOrEqual(44);
  await toggle.focus();
  const before = (await toggle.boundingBox()).y;
  await toggle.press("Enter");
  await expect(toggle).toHaveText("Resume motion");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggle).toBeFocused();
  expect(Math.abs((await toggle.boundingBox()).y - before)).toBeLessThanOrEqual(3);
  const art = page.locator("#between [data-story-art]");
  const transform = await art.evaluate((element) => getComputedStyle(element).transform);
  const y = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => page.evaluate((start) => scrollY - start, y)).toBeGreaterThan(100);
  await expect(art).toHaveCSS("transform", transform);
  await toggle.press("Enter");
  await expect(toggle).toHaveText("Pause motion");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await overflow(page);
});

test("device reduced motion is complete and live changes preserve focused reading position", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openStory(page);
  const root = page.locator("main[data-story]");
  await expect(root).toHaveAttribute("data-story-motion", "off");
  await expect(root).toHaveAttribute("data-story-mode", "flow");
  await expect(page.locator("[data-story-motion-toggle]")).toBeDisabled();
  for (const id of ["beginnings-title", "between-title", "perspective-title", "next-title"]) await readable(page.locator(`#${id}`));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(root).toHaveAttribute("data-story-mode", "cinematic");
  const link = page.locator('#beginnings .story-text-link');
  await alignReading(page, '#beginnings .story-text-link');
  await link.focus();
  const before = (await link.boundingBox()).y;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(root).toHaveAttribute("data-story-mode", "flow");
  await expect(link).toBeFocused();
  expect(Math.abs((await link.boundingBox()).y - before)).toBeLessThanOrEqual(3);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(root).toHaveAttribute("data-story-mode", "cinematic");
  await expect(link).toBeFocused();
  expect(Math.abs((await link.boundingBox()).y - before)).toBeLessThanOrEqual(3);
  await overflow(page);
});

test("native chapter hash, keyboard continuation and Back retain the actual reading location", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openStory(page, "#perspective");
  const title = page.locator("#perspective-title");
  const box = await title.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual((await page.locator(".navbar").boundingBox()).height);
  expect(box.y).toBeLessThan(900 * .6);
  const rail = page.locator('[data-story-step][href="#beginnings"]');
  await rail.focus();
  await rail.press("Enter");
  await expect(page).toHaveURL(/\/about#beginnings$/);
  const onward = page.locator('#beginnings .story-text-link');
  await onward.focus();
  await onward.press("Enter");
  await expect(page).toHaveURL(/\/about#perspective$/);
  const work = page.locator('#perspective a[href="/works"]');
  await work.focus();
  const previous = await page.evaluate(() => scrollY);
  await work.press("Enter");
  await expect(page).toHaveURL(/\/works$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/about#perspective$/);
  await expect.poll(() => page.evaluate((y) => Math.abs(scrollY - y), previous)).toBeLessThanOrEqual(3);
  await expect(work).toBeInViewport();
});

test.describe("compact visit", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("real touch, changing browser height, consent and the first menu tap remain usable", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("bn-analytics-consent-v1"));
    await openStory(page);
    await expect(page.locator("[data-consent-banner]")).toBeVisible();
    await expect(page.locator('.navbar a[href="/works"]')).toBeHidden();
    await stableNav(page);
    await page.evaluate(() => {
      window.__storyTouch = { scrolling: false, scrollEnds: 0, declineClicks: 0 };
      document.addEventListener("scroll", () => { window.__storyTouch.scrolling = true; }, { passive: true });
      document.addEventListener("scrollend", () => {
        window.__storyTouch.scrolling = false;
        window.__storyTouch.scrollEnds++;
      }, { passive: true });
      document.addEventListener("click", (event) => {
        if (event.isTrusted && event.target.closest('[data-consent-decision="rejected"]')) window.__storyTouch.declineClicks++;
      }, { capture: true });
    });
    const session = await page.context().newCDPSession(page);
    try {
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 180, y: 450, id: 1 }] });
      for (let step = 1; step <= 6; step++) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 180, y: 450 - step * 35, id: 1 }] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } finally { await session.detach(); }
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
    for (const height of [720, 844]) { await page.setViewportSize({ width: 390, height }); await settle(page); await stableNav(page); }
    // A fixed navbar can be stable while the native touch fling still runs.
    // Finish that gesture before asking the first tap to activate a control.
    await expect.poll(() => page.evaluate(() => ({
      ended: window.__storyTouch.scrollEnds > 0,
      scrolling: window.__storyTouch.scrolling,
    })), { message: "the native touch gesture finishes after the viewport changes", timeout: 7000 })
      .toEqual({ ended: true, scrolling: false });
    let previousGeometry;
    await expect.poll(async () => {
      const geometry = await page.locator('[data-consent-decision="rejected"]').evaluate((button) => ({
        scrolling: window.__storyTouch.scrolling,
        scrollY,
        viewportHeight: innerHeight,
        button: button.getBoundingClientRect().toJSON(),
      }));
      const serialized = JSON.stringify(geometry);
      const stable = !geometry.scrolling && serialized === previousGeometry;
      previousGeometry = serialized;
      return stable;
    }, { message: "the finished gesture leaves the first tap target and reading position stable", timeout: 7000 })
      .toBe(true);
    await page.getByRole("button", { name: "Decline analytics", exact: true }).tap();
    await expect(page.locator("[data-consent-banner]")).toBeHidden();
    expect(await page.evaluate(() => window.PortfolioConsent.getDecision())).toBe("rejected");
    expect(await page.evaluate(() => window.__storyTouch.declineClicks), "one trusted tap makes the decision").toBe(1);
    const toggle = page.locator(".menu-button");
    await toggle.tap();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const works = page.locator('.navbar a[href="/works"]');
    await expect(works).toBeVisible();
    await navTextContrast(works);
    await works.focus();
    await navTextContrast(works);
    await works.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(works).toBeHidden();
    await toggle.tap();
    const box = await works.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(await works.evaluate((link) => { const r = link.getBoundingClientRect(); return link.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
    await stableNav(page);
    for (const control of await page.locator('.story-footer-bottom a,.story-footer-bottom button').all()) {
      expect((await control.boundingBox()).height, "privacy and consent settings retain usable compact targets").toBeGreaterThanOrEqual(44);
    }
    await overflow(page);
    expect(await page.evaluate(() => window.__storyCLS), "ordinary initial layout and native reading retain the existing CLS limit").toBeLessThan(.1);
    await works.tap();
    await expect(page).toHaveURL(/\/works$/);
  });
});

test("320px enlarged text keeps every heading, paragraph and action glyph inside the page", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await openStory(page);
  await page.evaluate(() => {
    const elements = [...document.querySelectorAll('h1,h2,p,.story-text-link,.story-motion-toggle,.story-footer a,.story-footer button')];
    const sizes = elements.map((element) => parseFloat(getComputedStyle(element).fontSize));
    elements.forEach((element, i) => element.style.setProperty("font-size", `${sizes[i] * 2}px`, "important"));
  });
  await settle(page);
  const clipped = await page.locator('h1,h2,p,.story-text-link,.story-motion-toggle,.story-footer a,.story-footer button').evaluateAll((elements) => {
    const failures = [];
    for (const element of elements) {
      if (!element.getClientRects().length) continue;
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(walker.currentNode);
        for (const rect of range.getClientRects()) if (rect.left < -1 || rect.right > innerWidth + 1) failures.push({ text: walker.currentNode.textContent.trim(), left: rect.left, right: rect.right });
      }
    }
    return failures;
  });
  expect(clipped, "actual painted text ranges must reflow, not merely hide overflow").toEqual([]);
  const geometry = await page.evaluate(() => ({
    dek: document.querySelector(".story-opening-dek").getBoundingClientRect().toJSON(),
    cue: document.querySelector(".story-opening-cue").getBoundingClientRect().toJSON(),
    chapter: document.querySelector("#beginnings").getBoundingClientRect().toJSON(),
  }));
  expect(geometry.cue.top, "the enlarged opening copy leaves the native chapter action readable").toBeGreaterThanOrEqual(geometry.dek.bottom);
  expect(geometry.chapter.top, "the opening action remains above the following reading chapter").toBeGreaterThanOrEqual(geometry.cue.bottom);
  await overflow(page);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  test("the complete article and visible native navigation remain usable", async ({ page }) => {
    await page.goto("/about", { waitUntil: "load" });
    await expect(page.locator("h1")).toBeVisible();
    for (const id of ["beginnings-title", "between-title", "perspective-title", "next-title"]) await expect(page.locator(`#${id}`)).toBeVisible();
    await expect(page.locator("[data-story-motion-toggle]")).toBeHidden();
    const works = page.locator('.navbar a[href="/works"]');
    await expect(works).toBeVisible();
    await overflow(page);
    await works.click();
    await expect(page).toHaveURL(/\/works$/);
  });
});

test("a missing motion script leaves all chapters in accessible native flow", async ({ page }) => {
  await page.route("**/story-motion*.js", (route) => route.abort());
  await page.goto("/about", { waitUntil: "load" });
  await expect(page.locator("main[data-story]")).toHaveAttribute("data-story-mode", "flow");
  await expect(page.locator("[data-story-motion-toggle]")).toBeHidden();
  for (const id of ["beginnings-title", "between-title", "perspective-title", "next-title"]) await readable(page.locator(`#${id}`));
  const link = page.locator('#beginnings a[href="#perspective"]');
  await link.click();
  await expect(page).toHaveURL(/#perspective$/);
  await expect(page.locator("#perspective-title")).toBeInViewport();
  await overflow(page);
});

test("idle and suspended motion stop updating, and destroy restores readable flow without later writes", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openStory(page);
  await page.evaluate(() => {
    window.__storyWrites = 0;
    // The glass scene standing in the opening is a separate owner with its own
    // lifecycle: it keeps fitting its canvas to the viewport after story motion
    // is destroyed, which is correct. Story motion writes above that host, on
    // the opening itself, so every write of its own is still counted here.
    new MutationObserver((entries) => {
      window.__storyWrites += entries.filter((entry) => !entry.target.closest("[data-glass-scene]")).length;
    }).observe(document.querySelector("main[data-story]"), { subtree: true, attributes: true });
  });
  await page.waitForTimeout(100);
  const idle = await page.evaluate(() => window.__storyWrites);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__storyWrites)).toBe(idle);
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent("pagehide")));
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__storyWrites)).toBe(idle);
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent("pageshow")));
  await expect.poll(() => page.evaluate(() => PortfolioStoryMotion.progress)).toBeGreaterThan(0);
  await alignReading(page, "#perspective-title");
  await page.evaluate(() => PortfolioStoryMotion.destroy());
  await settle(page);
  await readable(page.locator("#perspective-title"));
  await expect(page.locator("main[data-story]")).toHaveAttribute("data-story-mode", "flow");
  const destroyed = await page.evaluate(() => window.__storyWrites);
  await page.mouse.wheel(0, 200);
  await page.setViewportSize({ width: 1100, height: 820 });
  await page.evaluate(() => { dispatchEvent(new PageTransitionEvent("pageshow")); PortfolioStoryMotion.refresh(); });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__storyWrites)).toBe(destroyed);
  await overflow(page);
});

test("the shared About entry leaves existing Home, Works and case navigation individually usable", async ({ page }) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/works", "/work/raiffeisen"]) {
      await page.goto(route, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      for (const progress of [0, .55]) {
        await page.evaluate((progress) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * progress), progress);
        await page.waitForTimeout(250);
        if (width === 390) {
          const toggle = page.locator(".menu-button");
          if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
        }
        await expect(page.locator('.navbar a[href="/about"]'), `${route}: About has a native entry`).toBeVisible();
        const controls = await page.locator(".navbar").evaluate((nav) => [...nav.querySelectorAll("a,button")].flatMap((element) => {
          const box = element.getBoundingClientRect(); let opacity = 1;
          for (let node = element; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
          if (!box.width || !box.height || opacity < .99 || getComputedStyle(element).visibility !== "visible" || getComputedStyle(element).pointerEvents === "none") return [];
          return [{ label: element.getAttribute("href") || element.getAttribute("aria-label") || element.textContent.trim(),
            box: box.toJSON(), hit: element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)) }];
        }));
        for (let i = 0; i < controls.length; i++) {
          expect(controls[i].hit, `${route} ${width}/${progress}: ${controls[i].label} is independently clickable`).toBe(true);
          for (let j = i + 1; j < controls.length; j++) {
            const a = controls[i].box, b = controls[j].box;
            const overlap = Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1 && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1;
            expect(overlap, `${route} ${width}/${progress}: ${controls[i].label} and ${controls[j].label} do not overlap`).toBe(false);
          }
        }
        if (width === 390) { await stableNav(page); await page.locator(".menu-button").press("Escape"); }
        await overflow(page);
      }
    }
  }
});
