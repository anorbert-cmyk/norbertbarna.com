import { expect, test } from "@playwright/test";

// The AI service pages are built from the owner's two approved boards. These
// specs hold the board order, the honest content contracts and the motion
// model: a pinned ribbon camera on a desktop, a flowing board everywhere else,
// and the finished board whenever motion is off.
const ROUTES = [["en", "/ai-integration"], ["hu", "/hu/ai-integracio"]];
const SECTIONS = ["#top", "#shaped", "#pieces", "#work-better", "#start"];
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
  // Poll the FontFaceSet state; retaining its promise through CDP can be garbage-collected.
  await page.waitForFunction(() => !document.fonts || document.fonts.status === "loaded");
  // Without scripts there is no frame to settle on; the static page is final as loaded.
  if (motion) {
    await expect.poll(() => page.evaluate(() => window.PortfolioAiMotion?.state)).toMatch(/active|reduced/);
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
const opacities = (page) => page.evaluate(() => [...document.querySelectorAll("[data-ai-step]")].map((step) => Number(getComputedStyle(step).opacity)));
const ribbonTransform = (page) => page.evaluate(() => getComputedStyle(document.querySelector("[data-ai-ribbon] .ai-ribbon-strip")).transform);
const ribbonIsIdentity = (page) => page.evaluate(() => { const m = new DOMMatrix(getComputedStyle(document.querySelector("[data-ai-ribbon] .ai-ribbon-strip")).transform); return Math.abs(m.a - 1) < 1e-6 && Math.abs(m.e) < 1e-6; });
const readingTransforms = (page) => page.evaluate(() =>
  [...document.querySelectorAll("main h1, main h2, main h3, main p, main li > div")].map((element) => getComputedStyle(element).transform).filter((value) => value !== "none"));
const inlineOwnerProperties = (page) => page.evaluate(() =>
  [...document.querySelectorAll("main *")].flatMap((element) => [...element.style].filter((name) => name.startsWith("--ai-"))));

for (const [language, path] of ROUTES) {
  test(`${language}: the five board sections stand in order with the content contracts intact`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, path);
    const order = await page.evaluate((ids) => ids.map((id) => document.querySelector(id)?.getBoundingClientRect().top + scrollY), SECTIONS);
    for (let index = 1; index < order.length; index += 1) expect(order[index], `${SECTIONS[index]} follows ${SECTIONS[index - 1]}`).toBeGreaterThan(order[index - 1]);
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toContainText("AI");
    for (const id of SECTIONS.slice(1)) await expect(page.locator(`${id} h2`)).toHaveCount(1);
    for (const slug of ["instructure", "raiffeisen", "kineticare"]) {
      expect(await page.locator(`main a[href="/work/${slug}"]`).count(), `${slug} is linked as evidence`).toBeGreaterThan(0);
    }
    await expect(page.locator(`main a[href="${language === "en" ? "/hu/ai-integracio" : "/ai-integration"}"]`)).toHaveCount(1);
    await expect(page.locator("main button.footer-email")).toHaveCount(1);
    // Artwork is decorative and sized; reading text is never inside a hidden node.
    const artwork = await page.locator("main img").evaluateAll((images) => images.map((image) => ({
      alt: image.alt, hidden: Boolean(image.closest('[aria-hidden="true"]')) || image.closest("a") !== null,
      sized: image.width > 0 && image.height > 0 && image.hasAttribute("width") && image.hasAttribute("height"),
    })));
    expect(artwork.every((image) => image.alt === "" && image.hidden && image.sized)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });

  test(`${language}: 1440x900 pins the ribbon stage for one scroll and the camera ends on the finished board`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, path);
    expect(await page.evaluate(() => window.PortfolioAiMotion.mode)).toBe("cinematic");
    await scrollToCamera(page, 0.05);
    const stageTop = () => page.evaluate(() => document.querySelector("[data-ai-stage]").getBoundingClientRect().top);
    expect(Math.abs(await stageTop())).toBeLessThanOrEqual(1);
    let steps = await opacities(page);
    expect(steps[2], "the last step has not arrived while the lens is on the first segment").toBeLessThan(0.05);
    await scrollToCamera(page, 0.5);
    expect(Math.abs(await stageTop()), "the stage stays pinned mid-journey").toBeLessThanOrEqual(1);
    await expect(page.locator(".ai-pieces-count span"), "the counter follows the camera").toHaveText("02");
    expect(await ribbonIsIdentity(page), "the lens is close on the ribbon").toBe(false);
    steps = await opacities(page);
    expect(steps[0]).toBeGreaterThan(0.95);
    expect(steps[2]).toBeLessThan(0.05);
    expect(await readingTransforms(page), "reading text never receives a transform").toEqual([]);
    await scrollToCamera(page, 1);
    steps = await opacities(page);
    await expect(page.locator(".ai-pieces-count span")).toHaveText("03");
    expect(steps.every((value) => value > 0.99), "the finished board shows every step").toBe(true);
    expect(await page.evaluate(() => Number(getComputedStyle(document.querySelector("[data-ai-work]")).opacity))).toBeGreaterThan(0.99);
    const scale = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector("[data-ai-ribbon] .ai-ribbon-strip")).transform).a);
    expect(Math.abs(scale - 1), "the lens has pulled out to the whole ribbon").toBeLessThan(0.01);
    // The scroll releases into the olive close.
    await page.mouse.wheel(0, 900);
    await settle(page);
    const closeTop = await page.locator("#work-better").evaluate((element) => element.getBoundingClientRect().top);
    expect(closeTop).toBeLessThan(900);
  });

  test(`${language}: 390x844 flows without pinning the stage; the ribbon holds under the bar and the camera travels as the steps arrive`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, path);
    expect(await page.evaluate(() => window.PortfolioAiMotion.mode)).toBe("flow");
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-ai-stage]")).position)).not.toBe("sticky");
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-ai-ribbon]")).position), "the ribbon is the phone's pinned camera").toBe("sticky");
    const journeyTop = () => page.evaluate(() => document.querySelector("[data-ai-journey]").getBoundingClientRect().top + scrollY);
    await page.evaluate((top) => window.scrollTo(0, top - 700), await journeyTop());
    await settle(page);
    const start = await ribbonTransform(page);
    expect(await ribbonIsIdentity(page), "the window rests on the green start before the journey").toBe(true);
    await page.evaluate(() => { const j = document.querySelector("[data-ai-journey]"); window.scrollTo(0, j.getBoundingClientRect().top + scrollY + j.offsetHeight * .45); });
    await settle(page);
    await settle(page);
    expect(await ribbonTransform(page), "the window travels along the ribbon as the steps pass").not.toBe(start);
    const stuck = await page.evaluate(() => document.querySelector("[data-ai-ribbon]").getBoundingClientRect().top);
    expect(stuck, "the ribbon holds under the compact bar").toBeLessThanOrEqual(60);
    await page.evaluate(() => { const j = document.querySelector("[data-ai-journey]"); window.scrollTo(0, j.getBoundingClientRect().top + scrollY + j.offsetHeight); });
    await settle(page);
    expect((await opacities(page)).every((value) => value > 0.99), "every step has arrived by the end of the journey").toBe(true);
    for (const y of [0, 0.3, 0.6, 1]) {
      await page.evaluate((fraction) => window.scrollTo(0, fraction * (document.documentElement.scrollHeight - innerHeight)), y);
      await settle(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `no horizontal overflow at ${y}`).toBeLessThanOrEqual(1);
    }
  });
}

// The opening's glass: hero-scene.js's second stage. A desktop holds the opening
// while the object folds; a phone turns it in its slot; without motion or a
// renderer the drawing stands, and nothing static ever precedes the glass.
const glassState = (page) => page.evaluate(() => ({
  glass: document.querySelector("main[data-ai]").dataset.aiGlass, fold: window.PortfolioAiMotion.fold,
  scene: document.querySelector("[data-ai-hero-art]").dataset.heroScene, status: window.PortfolioHeroScene?.status,
  canvas: getComputedStyle(document.querySelector(".ai-hero-canvas")), drawing: getComputedStyle(document.querySelector(".ai-hero-fallback")),
  heroTop: document.querySelector("[data-ai-hero]").getBoundingClientRect().top, bar: document.querySelector(".navbar").dataset.aiBar,
  barTop: document.querySelector(".navbar").getBoundingClientRect().top,
})).then((state) => ({ ...state, canvas: { opacity: state.canvas.opacity, visibility: state.canvas.visibility }, drawing: { opacity: state.drawing.opacity } }));
const scrollOpening = (page, fraction) => page.evaluate((f) => {
  const track = document.querySelector("[data-ai-hero-track]"), hero = document.querySelector("[data-ai-hero]");
  window.scrollTo(0, f * (track.offsetHeight - hero.offsetHeight));
}, fraction);

test("1440x900: the opening holds while the glass folds to the gate, the bar holds with it, and the drawing never shows first", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/hero-final.webp", async (route) => { await new Promise((resolve) => setTimeout(resolve, 700)); await route.continue(); });
  await page.goto("/ai-integration", { waitUntil: "domcontentloaded" });
  // Before the renderer's verdict the slot stands empty: neither drawing nor canvas.
  const early = await glassState(page);
  expect(early.status).toBe("loading");
  expect(early.drawing.opacity).toBe("0");
  expect(early.canvas.opacity).toBe("0");
  await expect.poll(() => page.evaluate(() => window.PortfolioHeroScene?.status)).toBe("ready");
  await settle(page);
  let state = await glassState(page);
  expect(state.glass).toBe("pinned");
  expect(state.canvas.opacity).toBe("1");
  expect(state.drawing.opacity).toBe("0");
  expect(state.fold).toBe(0);
  await scrollOpening(page, 0.5);
  await settle(page); await settle(page);
  state = await glassState(page);
  expect(Math.abs(state.heroTop), "the opening holds mid-fold").toBeLessThanOrEqual(1);
  expect(state.fold).toBeGreaterThan(0.3);
  expect(state.fold).toBeLessThan(1);
  expect(state.bar).toBe("held");
  expect(Math.abs(state.barTop)).toBeLessThanOrEqual(1);
  await scrollOpening(page, 1.15);
  await settle(page); await settle(page);
  state = await glassState(page);
  expect(state.fold).toBe(1);
  expect(state.bar).toBe("released");
  expect(state.heroTop, "the opening leaves once the fold is done").toBeLessThan(-1);
  expect(Math.abs(state.barTop - state.heroTop), "the bar leaves with the opening, not before it").toBeLessThanOrEqual(1);
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
  expect(state.drawing.opacity).toBe("0");
  expect(state.bar).toBeUndefined();
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

test("reduced motion and an unavailable renderer leave the single drawing", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => sessionStorage.setItem("nb-arrival-seen-v2", "1"));
  await open(page, "/ai-integration");
  let state = await glassState(page);
  expect(state.glass).toBe("off");
  expect(state.drawing.opacity).toBe("1");
  expect(state.canvas.visibility).toBe("hidden");
  expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-ai-hero]")).position)).not.toBe("sticky");
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
  expect(state.drawing.opacity).toBe("1");
  expect(state.canvas.opacity).toBe("0");
  await blind.close();
});

test("reduced motion shows the finished board and writes nothing to the artwork", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
  await open(page, "/ai-integration");
  expect(await page.evaluate(() => [window.PortfolioAiMotion.state, window.PortfolioAiMotion.mode])).toEqual(["reduced", "flow"]);
  await expect(page.locator("main[data-ai]")).toHaveAttribute("data-ai-motion", "off");
  await page.locator("#pieces").evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + scrollY + 300));
  await settle(page);
  expect((await opacities(page)).every((value) => value > 0.99)).toBe(true);
  expect(await ribbonIsIdentity(page), "the ribbon rests at the finished board").toBe(true);
  expect(await inlineOwnerProperties(page)).toEqual([]);
  await context.close();
});

test("destroy restores the stylesheet's finished board", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "/ai-integration");
  await scrollToCamera(page, 0.5);
  expect(await ribbonIsIdentity(page), "the lens is close before destroy").toBe(false);
  await expect(page.locator(".ai-pieces-count span")).toHaveText("02");
  await page.evaluate(() => window.PortfolioAiMotion.destroy());
  await settle(page);
  expect(await inlineOwnerProperties(page)).toEqual([]);
  expect(await ribbonIsIdentity(page), "the finished board returns when the owner is gone").toBe(true);
  await expect(page.locator(".ai-pieces-count span")).toHaveText("01");
  await expect(page.locator("main[data-ai]")).toHaveAttribute("data-ai-motion", "off");
  expect((await opacities(page)).every((value) => value > 0.99)).toBe(true);
  expect(await page.evaluate(() => window.PortfolioAiMotion.state)).toBe("destroyed");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the complete board reads in flow with every step and link visible", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, "/ai-integration", { motion: false });
    for (const id of SECTIONS) await expect(page.locator(id)).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-ai-stage]")).position)).not.toBe("sticky");
    expect((await opacities(page)).every((value) => value > 0.99)).toBe(true);
    await expect(page.locator("main button.footer-email")).toBeVisible();
    expect(await page.evaluate(() => [...document.querySelectorAll(".ai-start-body > *, .ai-steps-rule > li, .ai-better > *")].every((element) => Number(getComputedStyle(element).opacity) === 1)), "every row stands finished without the owner").toBe(true);
    await expect(page.locator('main a[href="/work/instructure"]').first()).toBeVisible();
    await expect(page.locator(".ai-hero-fallback")).toHaveCSS("opacity", "1");
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-ai-hero]")).position)).not.toBe("sticky");
  });
});
