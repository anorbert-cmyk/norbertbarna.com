import { expect, test } from "@playwright/test";

// The approved merge keeps one service narrative. Motion decorates the artwork;
// reading steps and case links are always available, including before the camera
// reaches them. The Passage closing is the actual footer, after the FAQ.
const ROUTES = [["en", "/ai-integration"], ["hu", "/hu/ai-integracio"]];
const SECTIONS = ["#top", "#shaped", "#pieces", "#workflow", "#selected-work", "#start", "#questions"];
let errors;
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
});
test.afterEach(() => expect(errors, "the service pages have no uncaught runtime errors").toEqual([]));

async function settle(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function open(page, path, { motion = true } = {}) {
  const response = await page.goto(path, { waitUntil: "load" });
  expect(response.status()).toBe(200);
  await page.waitForFunction(() => !document.fonts || document.fonts.status === "loaded");
  if (motion) {
    await expect.poll(() => page.evaluate(() => window.PortfolioAiMotion?.state)).toMatch(/active|reduced|static/);
    await settle(page);
  }
}
async function scrollToCamera(page, progress) {
  await page.evaluate((p) => {
    const section = document.querySelector("[data-ai-pieces]"), stage = section.querySelector("[data-ai-stage]");
    window.scrollTo(0, section.getBoundingClientRect().top + scrollY + p * (section.offsetHeight - stage.offsetHeight));
  }, progress);
  await settle(page);
  await settle(page);
}
const ribbonTransform = (page) => page.evaluate(() => getComputedStyle(document.querySelector("[data-ai-ribbon] .ai-ribbon-strip")).transform);
const ribbonIsIdentity = (page) => page.evaluate(() => {
  const m = new DOMMatrix(getComputedStyle(document.querySelector("[data-ai-ribbon] .ai-ribbon-strip")).transform);
  return Math.abs(m.a - 1) < .001 && Math.abs(m.e) < .5;
});
const readingTransforms = (page) => page.evaluate(() =>
  [...document.querySelectorAll("main h1, main h2, main h3, main p, main li > div")].map((element) => getComputedStyle(element).transform).filter((value) => value !== "none"));
const inlineOwnerProperties = (page) => page.evaluate(() =>
  [...document.querySelectorAll("main *")].flatMap((element) => [...element.style].filter((name) => name.startsWith("--ai-"))));
async function expectRibbonCoversWindow(page) {
  const bounds = await page.locator("[data-ai-ribbon]").evaluate((ribbon) => {
    const window = ribbon.getBoundingClientRect();
    const image = ribbon.querySelector("img").getBoundingClientRect();
    return { imageLeft: image.left, imageRight: image.right,
      visibleLeft: Math.max(0, window.left), visibleRight: Math.min(innerWidth, window.right) };
  });
  expect(bounds.imageLeft, "the camera never exposes the artwork's left cut edge inside its window").toBeLessThanOrEqual(bounds.visibleLeft + 1);
  expect(bounds.imageRight, "the camera never exposes the artwork's right cut edge inside its window").toBeGreaterThanOrEqual(bounds.visibleRight - 1);
}
async function expectFallbackCaptionsReadable(page) {
  const captions = await page.locator(".ai-ribbon-strip").evaluate((strip) => {
    const image = strip.querySelector("img").getBoundingClientRect();
    return [...strip.querySelectorAll(".ai-ribbon-label")].map((label) => {
      const box = label.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, imageBottom: image.bottom, viewport: innerWidth };
    });
  });
  expect(captions).toHaveLength(3);
  for (const [index, caption] of captions.entries()) {
    expect(caption.top, "the non-animated mobile captions sit below the complete artwork").toBeGreaterThanOrEqual(caption.imageBottom - 1);
    expect(caption.left, "translated fallback captions stay within the viewport").toBeGreaterThanOrEqual(-1);
    expect(caption.right, "translated fallback captions stay within the viewport").toBeLessThanOrEqual(caption.viewport + 1);
    if (index) expect(caption.left, "the three translated fallback captions do not overlap").toBeGreaterThanOrEqual(captions[index - 1].right + 2);
  }
}
async function expectReadingAvailable(page) {
  const unavailable = await page.locator("[data-ai-step], #workflow li, #selected-work a").evaluateAll((elements) => elements.flatMap((element) => {
    let opacity = 1;
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      opacity *= Number(style.opacity);
      if (style.display === "none" || style.visibility !== "visible" || node.hidden || node.inert || node.getAttribute("aria-hidden") === "true") return [element.textContent.trim()];
    }
    return opacity < .99 ? [element.textContent.trim()] : [];
  }));
  expect(unavailable, "all service steps and case links stay readable at every camera position").toEqual([]);
}
async function expectFocusedLinkPainted(page, link) {
  await expect(link).toBeFocused();
  await settle(page);
  await expectReadingAvailable(page);
  const state = await link.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const navBottom = document.querySelector(".navbar").getBoundingClientRect().bottom;
    // Inline contextual links can wrap: their union box contains unlinked gaps.
    // Hit-test each painted line instead of sampling the empty middle of that box.
    const visibleRects = [...element.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0 && rect.bottom > navBottom + 1 && rect.top < innerHeight - 1 && rect.right > 0 && rect.left < innerWidth);
    const painted = visibleRects.length > 0 && visibleRects.every((rect) => {
      const x = (Math.max(0, rect.left) + Math.min(innerWidth, rect.right)) / 2;
      const y = (Math.max(navBottom + 1, rect.top) + Math.min(innerHeight - 1, rect.bottom)) / 2;
      return element.contains(document.elementFromPoint(x, y));
    });
    return { top: box.top, bottom: box.bottom, height: innerHeight, outline: getComputedStyle(element).outlineStyle,
      painted };
  });
  expect(state.bottom, "the focused reference is in view").toBeGreaterThan(0);
  expect(state.top, "the focused reference is in view").toBeLessThan(state.height);
  expect(state.outline, "native keyboard focus stays visible").toBe("solid");
  expect(state.painted, "the case link is not hidden behind the pinned scene or navigation").toBe(true);
}

for (const [language, path] of ROUTES) {
  test(`${language}: one service narrative, one evidence list and the chosen dark footer`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, path);
    const order = await page.evaluate((ids) => ids.map((id) => document.querySelector(id)?.getBoundingClientRect().top + scrollY), [...SECTIONS, "#work-better"]);
    for (let index = 1; index < order.length; index += 1) expect(order[index], "sections follow the approved reading order").toBeGreaterThan(order[index - 1]);
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toContainText("AI");
    for (const id of SECTIONS.slice(1)) await expect(page.locator(`${id} h2`)).toHaveCount(1);
    await expect(page.locator("#pieces a, #pieces button, .ai-step-inline, .ai-start-steps, .ai-better")).toHaveCount(0);
    await expect(page.locator(".ai-shape-art img")).toHaveCount(1);
    await expect(page.locator(".ai-shape-art img")).toHaveAttribute("src", "/assets/images/ai/bars.webp");
    await expect(page.locator(".ai-shape-art .ai-bar")).toHaveCount(0);
    const ribbonImage = page.locator(".ai-ribbon-strip img");
    await expect(ribbonImage).toHaveAttribute("src", "/assets/images/ai/ribbon-studio.webp");
    await expect(ribbonImage).toHaveAttribute("width", "2172");
    await expect(ribbonImage).toHaveAttribute("height", "724");
    const ribbonRatio = await ribbonImage.evaluate((image) => { const box = image.getBoundingClientRect(); return box.width / box.height; });
    expect(ribbonRatio, "the studio source retains the approved panoramic 7.5:1 presentation").toBeCloseTo(7.5, 1);
    for (const label of await page.locator(".ai-ribbon-label").all()) {
      await expect(label).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(label).toHaveCSS("background-image", "none");
    }
    for (const slug of ["instructure", "raiffeisen", "kineticare"]) {
      await expect(page.locator(`main a[href="/work/${slug}"]`)).toHaveCount(1);
      await expect(page.locator(`#selected-work a[href="/work/${slug}"] img`)).toHaveAttribute("src", `/assets/images/geometry/${slug}.960.webp`);
    }
    await expect(page.locator(`main a[href="${language === "en" ? "/hu/ai-integracio" : "/ai-integration"}"]`)).toHaveCount(1);
    await expect(page.locator("main button.footer-email")).toHaveCount(1);
    await expect(page.locator("#top button.footer-email")).toHaveCount(1);
    const footer = page.locator("footer.ai-footer");
    await expect(footer).toHaveAttribute("id", "work-better");
    await expect(page.locator("main footer, main #work-better")).toHaveCount(0);
    await expect(footer.locator("h2")).toHaveText(/Let’s build\s*what’s next\./);
    await expect(footer).toHaveCSS("background-color", "rgb(10, 22, 40)");
    await expect(footer.locator(".ai-footer-art")).toHaveAttribute("aria-hidden", "true");
    await expect(footer.locator(".footer-brand img")).toHaveAttribute("src", /68f9e9de8ed08e31e52c4188_NB\.svg$/);
    await expect(footer.locator("button.footer-email")).toHaveAccessibleName(language === "hu" ? "Beszéljünk a projektedről" : "Discuss your project");
    await expect(footer.locator("button.footer-email")).toHaveAttribute("type", "button");
    await expect(footer.locator("a.footer-contact-link")).toHaveAttribute("href", "https://www.linkedin.com/in/barna-norbert/");
    await expect(footer.locator('.footer-privacy a[href="/privacy"], .footer-privacy a[href="/hu/adatvedelem"], [data-consent-settings]')).toHaveCount(3);
    await expect(footer.locator('.footer-col, a[href^="/work/"]')).toHaveCount(0);
    if (language === "hu") await expect(footer.locator("h2")).toHaveAttribute("lang", "en");
    const artwork = await page.locator("main img, .ai-footer-art img").evaluateAll((images) => images.map((image) => ({
      alt: image.alt, decorative: Boolean(image.closest('[aria-hidden="true"]')) || image.closest("a") !== null,
      sized: Number(image.getAttribute("width")) > 0 && Number(image.getAttribute("height")) > 0,
    })));
    expect(artwork.every((image) => image.alt === "" && image.decorative && image.sized)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });

  test(`${language}: desktop camera moves while all three service steps and references stay available`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, path);
    expect(await page.evaluate(() => window.PortfolioAiMotion.mode)).toBe("cinematic");
    const stageTop = () => page.evaluate(() => document.querySelector("[data-ai-stage]").getBoundingClientRect().top);
    for (const [progress, counter] of [[.05, "01"], [.5, "02"], [.8, "03"], [1, "03"]]) {
      await scrollToCamera(page, progress);
      expect(Math.abs(await stageTop()), "the stage stays pinned for its bounded camera run").toBeLessThanOrEqual(1);
      await expect(page.locator(".ai-pieces-count span")).toHaveText(counter);
      await expectRibbonCoversWindow(page);
      await expectReadingAvailable(page);
      expect(await readingTransforms(page), "reading text never receives a transform").toEqual([]);
      if (progress === .5) expect(await ribbonIsIdentity(page), "the camera moves along the ribbon").toBe(false);
    }
    expect(await ribbonIsIdentity(page), "the camera settles on the complete ribbon").toBe(true);
    const cases = page.locator("#selected-work");
    await cases.scrollIntoViewIfNeeded();
    await settle(page);
    expect(await cases.evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(900);
    expect(await stageTop(), "the camera releases into the references").toBeLessThan(0);
    expect(await inlineOwnerProperties(page)).toEqual([]);
  });

  test(`${language}: mobile opening keeps the contact action in view and uses a stable, theme-aware header`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, path);
    const cta = page.locator("#top button.footer-email");
    const box = await cta.boundingBox();
    expect(box.y, "contact starts below the navigation").toBeGreaterThanOrEqual(56);
    expect(box.y + box.height, "the whole primary contact action is visible before scrolling").toBeLessThanOrEqual(844);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await expect(page.locator(".navbar")).toHaveCSS("background-color", "rgb(10, 22, 40)");
    const toggle = page.locator(".menu-button");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#primary-navigation")).toBeVisible();
    await expect(page.locator("#primary-navigation")).toHaveCSS("background-color", "rgb(214, 212, 237)");
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    await page.locator("#shaped").evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + scrollY + 100));
    await settle(page);
    await expect(page.locator(".navbar")).toHaveCSS("background-color", "rgb(214, 212, 237)");
    for (const height of [720, 844]) {
      await page.setViewportSize({ width: 390, height });
      await settle(page);
      expect(Math.abs(await page.locator(".navbar").evaluate((nav) => nav.getBoundingClientRect().top))).toBeLessThanOrEqual(.5);
    }
  });

  test(`${language}: mobile ribbon pans below the stable bar without hiding reading content`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, path);
    expect(await page.evaluate(() => window.PortfolioAiMotion.mode)).toBe("flow");
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-ai-stage]")).position)).not.toBe("sticky");
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-ai-ribbon]")).position)).toBe("sticky");
    await page.locator("[data-ai-journey]").evaluate((journey) => window.scrollTo(0, journey.getBoundingClientRect().top + scrollY - 700));
    await settle(page);
    const start = await ribbonTransform(page);
    await expectReadingAvailable(page);
    await page.locator("[data-ai-journey]").evaluate((journey) => window.scrollTo(0, journey.getBoundingClientRect().top + scrollY + journey.offsetHeight * .45));
    await settle(page);
    await settle(page);
    expect(await ribbonTransform(page), "the camera travels along the ribbon").not.toBe(start);
    const stuck = await page.locator("[data-ai-ribbon]").evaluate((ribbon) => ribbon.getBoundingClientRect().top);
    expect(stuck, "the ribbon rests below the compact bar").toBeGreaterThanOrEqual(55);
    expect(stuck, "the ribbon rests below the compact bar").toBeLessThanOrEqual(57);
    await expectReadingAvailable(page);
    for (const fraction of [0, .3, .6, 1]) {
      await page.evaluate((p) => window.scrollTo(0, p * (document.documentElement.scrollHeight - innerHeight)), fraction);
      await settle(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `no horizontal overflow at ${fraction}`).toBeLessThanOrEqual(1);
    }
  });

  test(`${language}: mobile camera and counter share the same reading interval in both scroll directions`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, path);
    const previous = new Map();
    for (const [fraction, labelIndex, counter] of [[.25, 0, "01"], [.5, 1, "02"], [.8, 2, "03"], [.5, 1, "02"], [.25, 0, "01"]]) {
      await page.locator("[data-ai-journey]").evaluate((journey, q) => {
        const ribbon = journey.querySelector("[data-ai-ribbon]");
        const hold = parseFloat(getComputedStyle(ribbon).top);
        scrollTo(0, journey.getBoundingClientRect().top + scrollY - hold + q * (journey.offsetHeight - ribbon.offsetHeight));
      }, fraction);
      await settle(page);
      await settle(page);
      await expect(page.locator(".ai-pieces-count span")).toHaveText(counter);
      const state = await page.locator(".ai-ribbon-strip").evaluate((strip, index) => {
        const animation = strip.getAnimations().find((item) => item.animationName === "ai-pan");
        const box = strip.querySelectorAll(".ai-ribbon-label")[index].getBoundingClientRect();
        return { camera: window.PortfolioAiMotion.camera, progress: animation?.effect.getComputedTiming().progress,
          translation: new DOMMatrix(getComputedStyle(strip).transform).e, left: box.left, right: box.right, center: box.left + box.width / 2, viewport: innerWidth };
      }, labelIndex);
      expect(Math.abs(state.camera - fraction), "the counter follows the actual sticky run").toBeLessThan(.005);
      // effect progress includes the animation's contain range; raw
      // currentTime is the whole ViewTimeline and is not this local interval.
      expect(typeof state.progress).toBe("number");
      expect(Math.abs(state.progress - state.camera), "CSS camera and JS counter use the same interval").toBeLessThan(.01);
      expect(state.left, "the active chapter label is fully visible").toBeGreaterThanOrEqual(-1);
      expect(state.right, "the active chapter label is fully visible").toBeLessThanOrEqual(state.viewport + 1);
      expect(Math.abs(state.center - state.viewport / 2), "the camera frames the active chapter near the center").toBeLessThan(state.viewport * .2);
      await expectRibbonCoversWindow(page);
      if (previous.has(fraction)) expect(Math.abs(state.translation - previous.get(fraction)), "reverse scrolling returns to the same camera position").toBeLessThan(1);
      previous.set(fraction, state.translation);
      await expectReadingAvailable(page);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => page.evaluate(() => window.PortfolioAiMotion.state)).toBe("reduced");
    await expect(page.locator(".ai-pieces-count span")).toHaveText("03");
    expect(await page.locator(".ai-ribbon-strip").evaluate((strip) => strip.getBoundingClientRect().width)).toBeLessThanOrEqual(391);
    expect(await ribbonIsIdentity(page), "reduced motion returns the complete ribbon rather than a cropped camera window").toBe(true);
    await expectFallbackCaptionsReadable(page);
  });

  for (const width of [320, 390, 430]) {
    test(`${language}: ${width}px project rows keep geometric thumbnails beside the text without a northeast glyph`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await open(page, path);
      for (const row of await page.locator(".ai-related-list a").all()) {
        await row.scrollIntoViewIfNeeded();
        const layout = await row.evaluate((link) => {
          const image = link.querySelector("img").getBoundingClientRect();
          const copy = link.querySelector(":scope > span").getBoundingClientRect();
          const box = link.getBoundingClientRect();
          return { image: { left: image.left, right: image.right, top: image.top, bottom: image.bottom, width: image.width },
            copy: { left: copy.left, right: copy.right, top: copy.top, bottom: copy.bottom },
            row: { left: box.left, right: box.right }, after: getComputedStyle(link, "::after").content };
        });
        expect(layout.image.width, "the geometric thumbnail remains rendered").toBeGreaterThan(0);
        expect(layout.copy.left, "text is beside the image rather than below it").toBeGreaterThanOrEqual(layout.image.right + 8);
        expect(Math.min(layout.copy.bottom, layout.image.bottom) - Math.max(layout.copy.top, layout.image.top), "thumbnail and text occupy the same horizontal row").toBeGreaterThan(0);
        expect(layout.row.left).toBeGreaterThanOrEqual(0);
        expect(layout.row.right).toBeLessThanOrEqual(width);
        expect(layout.copy.right, "project text remains inside the mobile reading area").toBeLessThanOrEqual(width);
        expect(["none", "normal", '""']).toContain(layout.after);
        await row.focus();
        await expect(row).toBeFocused();
        expect(["none", "normal", '""']).toContain(await row.evaluate((link) => getComputedStyle(link, "::after").content));
      }
      await expectReadingAvailable(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    });
  }

  test(`${language}: 320px project rows wrap naturally when reading text is enlarged to 200%`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await open(page, path);
    await page.locator(".ai-related-list").evaluate((list) => {
      const sizes = [...list.querySelectorAll("a, a *")].filter((element) => element instanceof HTMLElement)
        .map((element) => ({ element, size: parseFloat(getComputedStyle(element).fontSize), original: element.style.getPropertyValue("font-size"), priority: element.style.getPropertyPriority("font-size") }));
      window.__aiRowTextRestore = sizes;
      for (const { element, size } of sizes) element.style.setProperty("font-size", `${size * 2}px`, "important");
    });
    await settle(page);
    for (const row of await page.locator(".ai-related-list a").all()) {
      await row.scrollIntoViewIfNeeded();
      const state = await row.evaluate((link) => {
        const image = link.querySelector("img").getBoundingClientRect();
        const copy = link.querySelector(":scope > span");
        const box = copy.getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(copy);
        return { imageBottom: image.bottom, copyTop: box.top, copyWidth: box.width,
          rowWidth: link.getBoundingClientRect().width,
          clipped: [...range.getClientRects()].some((rect) => rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1)) };
      });
      expect(state.copyTop, "enlarged text wraps below its thumbnail without a breakpoint-specific script").toBeGreaterThanOrEqual(state.imageBottom + 8);
      expect(state.copyWidth, "the enlarged reading column receives the full row").toBeGreaterThanOrEqual(state.rowWidth - 1);
      expect(state.clipped, "the enlarged project title and description stay readable").toBe(false);
      await row.focus();
      await expect(row).toBeFocused();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.evaluate(() => {
      for (const { element, original, priority } of window.__aiRowTextRestore) {
        if (original) element.style.setProperty("font-size", original, priority);
        else element.style.removeProperty("font-size");
      }
      delete window.__aiRowTextRestore;
    });
    await settle(page);
    expect(await page.locator(".ai-related-list a").first().evaluate((link) => link.querySelector(":scope > span").getBoundingClientRect().left - link.querySelector("img").getBoundingClientRect().right), "ordinary text restores the side-by-side composition").toBeGreaterThanOrEqual(8);
  });

  test(`${language}: tabbing from the opening reaches painted reference links, never hidden camera targets`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, path);
    await scrollToCamera(page, .05);
    await expectReadingAvailable(page);
    await page.locator(".ai-hero-explore").focus();
    for (const slug of ["instructure", "raiffeisen", "kineticare"]) {
      await page.keyboard.press("Tab");
      await expectFocusedLinkPainted(page, page.locator(`#selected-work a[href="/work/${slug}"]`));
    }
    for (const href of ["/work/sportsgambit", "/about#perspective"]) {
      await page.keyboard.press("Tab");
      await expectFocusedLinkPainted(page, page.locator(`#selected-work a[href="${href}"]`));
    }
  });

  test(`${language}: 320px layout and FAQ disclosures retain readable text and native keyboard controls`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await open(page, path);
    const details = page.locator("#questions details");
    await expect(details).toHaveCount(5);
    await expect(details.first()).toHaveAttribute("open", "");
    const second = details.nth(1);
    await expect(second).not.toHaveAttribute("open");
    await second.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(second).toHaveAttribute("open", "");
    await expect(second.locator("p")).toBeVisible();
    await expect(second.locator("summary")).toBeFocused();
    await page.keyboard.press("Space");
    await expect(second).not.toHaveAttribute("open");
    await second.locator("summary").click();
    await expect(second).toHaveAttribute("open", "");
    await page.locator("#questions details").evaluateAll((nodes) => nodes.forEach((node) => { node.open = true; }));
    for (const selector of ["#top", "#selected-work", "#start", "#questions", "footer"]) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await settle(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${selector} has no horizontal overflow`).toBeLessThanOrEqual(1);
    }
    const clipped = await page.locator("main h1, main h2, main h3, main p, footer h2, footer p, footer a, footer button").evaluateAll((elements) => elements.flatMap((element) => {
      if (!element.getClientRects().length) return [];
      const range = document.createRange(); range.selectNodeContents(element);
      return [...range.getClientRects()].some((box) => box.width > 0 && (box.left < -1 || box.right > innerWidth + 1)) ? [element.textContent.trim()] : [];
    }));
    expect(clipped, "heading, reading and footer text remain inside the 320px canvas").toEqual([]);
    await expectReadingAvailable(page);
  });
}

for (const [language, path] of ROUTES) {
  for (const [width, height] of [[844, 390], [991, 400]]) {
    test(`${language}: short landscape ${width}x${height} gives reading space back to the service content`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await open(page, path);
      await page.locator("[data-ai-journey]").evaluate((journey) => scrollTo(0, journey.getBoundingClientRect().top + scrollY + 100));
      await settle(page);
      expect(await page.evaluate(() => window.PortfolioAiMotion.mode)).toBe("flow");
      await expect(page.locator(".ai-pieces-count span")).toHaveText("03");
      await expect(page.locator("main[data-ai]")).not.toHaveAttribute("data-ai-active");
      expect(await page.locator("[data-ai-stage]").evaluate((stage) => getComputedStyle(stage).position)).not.toBe("sticky");
      expect(await page.locator("[data-ai-ribbon]").evaluate((ribbon) => getComputedStyle(ribbon).position)).not.toBe("sticky");
      expect(await ribbonIsIdentity(page)).toBe(true);
      expect(await page.locator(".ai-ribbon-strip").evaluate((strip) => strip.getBoundingClientRect().width)).toBeLessThanOrEqual(width + 1);
      await expectFallbackCaptionsReadable(page);
      const before = await page.locator("[data-ai-ribbon]").evaluate((ribbon) => ribbon.getBoundingClientRect().top);
      await page.evaluate(() => scrollBy(0, 80));
      await settle(page);
      const after = await page.locator("[data-ai-ribbon]").evaluate((ribbon) => ribbon.getBoundingClientRect().top);
      expect(before - after, "the decorative ribbon scrolls away instead of covering landscape reading space").toBeGreaterThan(75);
      await expectReadingAvailable(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    });
  }
}

// The opening's glass: hero-scene.js's second stage over the passage picture.
// A desktop holds the opening under the sticky bar while the object turns; a
// phone turns it in its slot; it never folds into the flat gate artwork and
// there is no flat drawing in reserve: without a renderer the picture stands.
const glassState = (page) => page.evaluate(() => ({
  glass: document.querySelector("main[data-ai]").dataset.aiGlass, turn: window.PortfolioAiMotion.turn,
  scene: document.querySelector("[data-ai-hero-art]").dataset.heroScene, status: window.PortfolioHeroScene?.status,
  pose: document.querySelector("[data-ai-hero-art]").dataset.heroPose,
  canvas: getComputedStyle(document.querySelector(".ai-hero-canvas")), drawings: document.querySelectorAll("[data-ai-hero-art] img").length,
  picture: getComputedStyle(document.querySelector(".ai-hero-bg img")).opacity,
  heroTop: document.querySelector("[data-ai-hero]").getBoundingClientRect().top,
  clearance: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0,
})).then((state) => ({ ...state, canvas: { opacity: state.canvas.opacity, visibility: state.canvas.visibility } }));
const scrollOpening = (page, fraction) => page.evaluate((f) => {
  const track = document.querySelector("[data-ai-hero-track]"), hero = document.querySelector("[data-ai-hero]");
  window.scrollTo(0, f * (track.offsetHeight - hero.offsetHeight));
}, fraction);

test("1440x900: the opening holds under the bar while the glass turns over the picture and never folds flat", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/hero-final.webp", async (route) => { await new Promise((resolve) => setTimeout(resolve, 700)); await route.continue(); });
  await page.goto("/ai-integration", { waitUntil: "domcontentloaded" });
  const early = await glassState(page);
  expect(early.status).toBe("loading");
  expect(early.drawings, "no flat drawing stands in the opening").toBe(0);
  expect(early.canvas.opacity).toBe("0");
  expect(early.picture, "the picture is there from the first paint").toBe("1");
  await expect.poll(() => page.evaluate(() => window.PortfolioHeroScene?.status)).toBe("ready");
  await settle(page);
  let state = await glassState(page);
  expect(state.glass).toBe("pinned");
  expect(state.canvas.opacity).toBe("1");
  expect(state.turn).toBe(0);
  const art = page.locator("[data-ai-hero-art]");
  const rest = await art.screenshot();
  await scrollOpening(page, 0.5);
  await settle(page); await settle(page);
  state = await glassState(page);
  expect(Math.abs(state.heroTop - state.clearance), "the opening holds under the bar mid-turn").toBeLessThanOrEqual(1);
  expect(state.turn).toBeGreaterThan(0.3);
  expect(state.turn).toBeLessThan(1);
  expect(state.pose, "the object stays in its glass pose, never the flat endpoint").toBe("compact");
  expect(Buffer.compare(rest, await art.screenshot()), "the scroll turns the object").not.toBe(0);
  await scrollOpening(page, 1.15);
  await settle(page); await settle(page);
  state = await glassState(page);
  expect(state.turn).toBe(1);
  expect(state.pose).toBe("compact");
  expect(state.heroTop, "the opening leaves once the turn is done").toBeLessThan(state.clearance - 1);
  expect(await readingTransforms(page)).toEqual([]);
});

test("390x844: the glass turns in its own slot without a pin", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "/hu/ai-integracio");
  await expect.poll(() => page.evaluate(() => window.PortfolioHeroScene?.status)).toBe("ready");
  await settle(page);
  const state = await glassState(page);
  expect(state.glass).toBe("slot");
  expect(state.canvas.opacity).toBe("1");
  expect(state.drawings).toBe(0);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-ai-hero]")).position)).not.toBe("sticky");
  const art = page.locator("[data-ai-hero-art]");
  const before = await art.screenshot();
  await page.evaluate(() => window.scrollTo(0, 260));
  await settle(page); await settle(page);
  expect(Buffer.compare(before, await art.screenshot()), "native scroll turns the object").not.toBe(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("reduced motion keeps the glass still over the picture; an unavailable renderer leaves the picture alone", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => sessionStorage.setItem("nb-arrival-seen-v2", "1"));
  await open(page, "/ai-integration");
  await expect.poll(() => page.evaluate(() => window.PortfolioHeroScene?.status)).toBe("ready");
  await settle(page);
  let state = await glassState(page);
  expect(state.glass, "no pin without motion, but the glass stays").toBe("slot");
  expect(state.canvas.opacity).toBe("1");
  expect(state.drawings).toBe(0);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-ai-hero]")).position)).not.toBe("sticky");
  const art = page.locator("[data-ai-hero-art]");
  const still = await art.screenshot();
  await page.evaluate(() => window.scrollTo(0, 300));
  await settle(page); await settle(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page); await settle(page);
  expect(Buffer.compare(still, await art.screenshot()), "reduced motion leaves the object still").toBe(0);
  await context.close();
  const blind = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page2 = await blind.newPage();
  await page2.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return /webgl/.test(type) ? null : getContext.call(this, type, ...args); };
  });
  await open(page2, "/ai-integration");
  await expect.poll(() => page2.evaluate(() => window.PortfolioHeroScene?.status)).toBe("fallback");
  await settle(page2);
  state = await glassState(page2);
  expect(state.glass).toBe("off");
  expect(state.drawings).toBe(0);
  expect(state.canvas.visibility).toBe("hidden");
  expect(state.picture).toBe("1");
  await blind.close();
});

test("reduced motion shows the finished board and 03 counter without writing artwork styles", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "/ai-integration");
  expect(await page.evaluate(() => [window.PortfolioAiMotion.state, window.PortfolioAiMotion.mode])).toEqual(["reduced", "flow"]);
  await expect(page.locator("main[data-ai]")).toHaveAttribute("data-ai-motion", "off");
  await expect(page.locator(".ai-pieces-count span")).toHaveText("03");
  await page.locator("#pieces").scrollIntoViewIfNeeded();
  await settle(page);
  await expectReadingAvailable(page);
  expect(await ribbonIsIdentity(page)).toBe(true);
  expect(await inlineOwnerProperties(page)).toEqual([]);
});

test("breakpoint and reduced-motion changes restore readable flow without stale camera state", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "/ai-integration");
  await scrollToCamera(page, .5);
  await expect(page.locator(".ai-pieces-count span")).toHaveText("02");
  await page.setViewportSize({ width: 991, height: 900 });
  await expect.poll(() => page.evaluate(() => window.PortfolioAiMotion.mode)).toBe("flow");
  await expectReadingAvailable(page);
  await page.setViewportSize({ width: 1440, height: 700 });
  await expect.poll(() => page.evaluate(() => window.PortfolioAiMotion.mode)).toBe("flow");
  expect(await page.locator("[data-ai-stage]").evaluate((stage) => getComputedStyle(stage).position)).not.toBe("sticky");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(() => page.evaluate(() => window.PortfolioAiMotion.mode)).toBe("cinematic");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => page.evaluate(() => window.PortfolioAiMotion.state)).toBe("reduced");
  await expect(page.locator(".ai-pieces-count span")).toHaveText("03");
  expect(await ribbonIsIdentity(page)).toBe(true);
  await expectReadingAvailable(page);
});

for (const [language, path] of ROUTES) {
  test(`${language}: desktop text at 200% releases the camera into unclipped natural reading flow`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, path);
    await scrollToCamera(page, .5);
    expect(await page.evaluate(() => window.PortfolioAiMotion.mode)).toBe("cinematic");
    // Text-only enlargement, not CSS zoom: snapshot every computed size before
    // touching ancestors, so each descendant receives exactly 200%, not 400%.
    await page.locator("[data-ai-stage]").evaluate((stage) => {
      const sizes = [stage, ...stage.querySelectorAll("*")].filter((element) => element instanceof HTMLElement)
        .map((element) => ({ element, size: parseFloat(getComputedStyle(element).fontSize), original: element.style.getPropertyValue("font-size"), priority: element.style.getPropertyPriority("font-size") }));
      window.__aiTextRestore = sizes;
      for (const { element, size } of sizes) element.style.setProperty("font-size", `${size * 2}px`, "important");
    });
    await expect.poll(() => page.evaluate(() => window.PortfolioAiMotion.mode)).toBe("flow");
    await expect(page.locator(".ai-pieces-count span")).toHaveText("03");
    expect(await page.locator("[data-ai-stage]").evaluate((stage) => getComputedStyle(stage).position)).not.toBe("sticky");
    await expectReadingAvailable(page);
    const clipped = await page.locator("[data-ai-stage] h2, [data-ai-stage] h3, [data-ai-stage] p").evaluateAll((elements) => elements.flatMap((element) => {
      const stage = element.closest("[data-ai-stage]").getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(element);
      return [...range.getClientRects()].some((box) => box.width > 0 && (box.left < -1 || box.right > innerWidth + 1 || box.top < stage.top - 1 || box.bottom > stage.bottom + 1)) ? [element.textContent.trim()] : [];
    }));
    expect(clipped, "every enlarged service paragraph fits its natural section, with no viewport-height clipping").toEqual([]);
    const finalParagraph = page.locator('[data-ai-step="3"] p');
    await finalParagraph.scrollIntoViewIfNeeded();
    expect(await finalParagraph.evaluate((p) => { const box = p.getBoundingClientRect(); return box.top < innerHeight && box.bottom > 0; })).toBe(true);
    await page.evaluate(() => {
      for (const { element, original, priority } of window.__aiTextRestore) {
        if (original) element.style.setProperty("font-size", original, priority);
        else element.style.removeProperty("font-size");
      }
      delete window.__aiTextRestore;
    });
    await expect.poll(() => page.evaluate(() => window.PortfolioAiMotion.mode)).toBe("cinematic");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

test("destroy restores the stylesheet's finished board and original 03 counter", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "/ai-integration");
  await scrollToCamera(page, .5);
  expect(await ribbonIsIdentity(page)).toBe(false);
  await expect(page.locator(".ai-pieces-count span")).toHaveText("02");
  await page.evaluate(() => window.PortfolioAiMotion.destroy());
  await settle(page);
  expect(await inlineOwnerProperties(page)).toEqual([]);
  expect(await ribbonIsIdentity(page)).toBe(true);
  await expect(page.locator(".ai-pieces-count span")).toHaveText("03");
  await expect(page.locator("main[data-ai]")).toHaveAttribute("data-ai-motion", "off");
  await expectReadingAvailable(page);
  expect(await page.evaluate(() => window.PortfolioAiMotion.state)).toBe("destroyed");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  for (const [language, path] of ROUTES) {
    test(`${language}: the complete narrative reads in flow and FAQ still opens natively`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await open(page, path, { motion: false });
      for (const id of [...SECTIONS, "#work-better"]) await expect(page.locator(id)).toBeVisible();
      expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-ai-stage]")).position)).not.toBe("sticky");
      await expectReadingAvailable(page);
      await expect(page.locator(".ai-pieces-count span")).toHaveText("03");
      expect(await page.locator(".ai-ribbon-strip").evaluate((strip) => strip.getBoundingClientRect().width)).toBeLessThanOrEqual(391);
      await expectFallbackCaptionsReadable(page);
      await expect(page.locator("main button.footer-email")).toBeVisible();
      await expect(page.locator(".ai-hero-canvas")).toHaveCSS("opacity", "0");
      await expect(page.locator(".ai-hero-bg img")).toBeVisible();
      const question = page.locator("#questions details").nth(1);
      await question.locator("summary").click();
      await expect(question.locator("p")).toBeVisible();
      const link = page.locator('#selected-work a[href="/work/instructure"]');
      await link.focus();
      await expect(link).toBeFocused();
      await link.press("Enter");
      await expect(page).toHaveURL(/\/work\/instructure$/);
    });
  }
});
